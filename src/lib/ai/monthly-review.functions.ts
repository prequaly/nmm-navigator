import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { createGeminiProvider } from "@/lib/ai-gateway.server";
import { z } from "zod";

const Input = z.object({
  organizationId: z.string().uuid(),
  monthISO: z.string().optional(), // YYYY-MM (default = current month)
});

type YearlyAmounts = Record<string, number[]> | number[] | null;

function monthAmount(y: YearlyAmounts, year: number, monthIdx: number): number {
  if (!y) return 0;
  if (Array.isArray(y)) return Number(y[monthIdx] ?? 0);
  const arr = y[String(year)] ?? [];
  return Number(arr[monthIdx] ?? 0);
}

export const generateMonthlyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: member } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", data.organizationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) throw new Error("Not a member of this organization");

    const target = data.monthISO ? new Date(`${data.monthISO}-01T00:00:00Z`) : new Date();
    const year = target.getUTCFullYear();
    const monthIdx = target.getUTCMonth();
    const monthStart = new Date(Date.UTC(year, monthIdx, 1));
    const monthEnd = new Date(Date.UTC(year, monthIdx + 1, 1));
    const next30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const monthLabel = target.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

    const [
      { data: org },
      { data: pillars },
      { data: kpis },
      { data: risks },
      { data: revenue },
      { data: expenses },
      { data: grants },
      { data: actionsDone },
      { data: actionsOpen },
      { data: upcomingDeadlines },
    ] = await Promise.all([
      supabase.from("organizations").select("name,mission").eq("id", data.organizationId).maybeSingle(),
      supabase.from("strategic_pillars").select("name,description").eq("organization_id", data.organizationId).order("sort_order"),
      supabase.from("kpis").select("name,baseline,current_value,target,unit,category").eq("organization_id", data.organizationId),
      supabase.from("risks").select("title,likelihood,impact,mitigation").eq("organization_id", data.organizationId).order("impact", { ascending: false }).limit(5),
      supabase.from("revenue_streams").select("name,category,yearly_amounts").eq("organization_id", data.organizationId),
      supabase.from("expense_lines").select("name,category,yearly_amounts").eq("organization_id", data.organizationId),
      supabase.from("grants").select("funder_name,grant_name,status,amount_requested,amount_awarded,probability,application_deadline,end_date").eq("organization_id", data.organizationId),
      supabase.from("action_items").select("title,updated_at").eq("organization_id", data.organizationId).eq("status", "done").gte("updated_at", monthStart.toISOString()).lt("updated_at", monthEnd.toISOString()),
      supabase.from("action_items").select("title,due_date,priority,status").eq("organization_id", data.organizationId).neq("status", "done").order("due_date", { ascending: true, nullsFirst: false }).limit(15),
      supabase.from("grants").select("funder_name,grant_name,application_deadline").eq("organization_id", data.organizationId).not("application_deadline", "is", null).gte("application_deadline", new Date().toISOString().slice(0, 10)).lte("application_deadline", next30.toISOString().slice(0, 10)).order("application_deadline"),
    ]);

    // Monthly financial snapshot
    const monthRevenue = (revenue ?? []).reduce((sum, r) => sum + monthAmount(r.yearly_amounts as YearlyAmounts, year, monthIdx), 0);
    const monthExpense = (expenses ?? []).reduce((sum, e) => sum + monthAmount(e.yearly_amounts as YearlyAmounts, year, monthIdx), 0);

    // YTD
    let ytdRev = 0, ytdExp = 0;
    for (let m = 0; m <= monthIdx; m++) {
      ytdRev += (revenue ?? []).reduce((s, r) => s + monthAmount(r.yearly_amounts as YearlyAmounts, year, m), 0);
      ytdExp += (expenses ?? []).reduce((s, e) => s + monthAmount(e.yearly_amounts as YearlyAmounts, year, m), 0);
    }

    // Grant snapshot
    const activeGrants = (grants ?? []).filter((g) => ["awarded", "active"].includes(g.status));
    const pipelineGrants = (grants ?? []).filter((g) => !["awarded", "active", "declined", "closed"].includes(g.status));
    const pipelineWeighted = pipelineGrants.reduce((s, g) => s + Number(g.amount_requested ?? 0) * (Number(g.probability ?? 0) / 100), 0);
    const committedAwarded = activeGrants.reduce((s, g) => s + Number(g.amount_awarded ?? g.amount_requested ?? 0), 0);

    // KPI movement
    const kpiStatus = (kpis ?? []).map((k) => {
      const cur = Number(k.current_value ?? 0);
      const tgt = Number(k.target ?? 0);
      const pct = tgt ? Math.round((cur / tgt) * 100) : null;
      return { name: k.name, current: cur, target: tgt, unit: k.unit, pct };
    });

    const ctx = {
      month: monthLabel,
      org: org?.name,
      mission: org?.mission,
      pillars: (pillars ?? []).map((p) => p.name),
      finance: {
        monthRevenue: Math.round(monthRevenue),
        monthExpense: Math.round(monthExpense),
        monthNet: Math.round(monthRevenue - monthExpense),
        ytdRevenue: Math.round(ytdRev),
        ytdExpense: Math.round(ytdExp),
        ytdNet: Math.round(ytdRev - ytdExp),
      },
      grants: {
        active: activeGrants.length,
        pipeline: pipelineGrants.length,
        committedAwarded: Math.round(committedAwarded),
        pipelineWeighted: Math.round(pipelineWeighted),
        deadlinesNext30: (upcomingDeadlines ?? []).map((g) => `${g.funder_name} — ${g.grant_name} (due ${g.application_deadline})`),
      },
      kpis: kpiStatus,
      risks: (risks ?? []).slice(0, 5),
      wins: (actionsDone ?? []).map((a) => a.title).slice(0, 10),
      openActionsCount: actionsOpen?.length ?? 0,
      overdueActions: (actionsOpen ?? []).filter((a) => a.due_date && new Date(a.due_date) < new Date()).map((a) => a.title).slice(0, 10),
    };

    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");
    const gateway = createGeminiProvider(key);

    const system = `You are an experienced nonprofit strategy consultant writing the monthly strategic review for an Executive Director. Voice: encouraging, knowledgeable, calm, action-oriented. Celebrate progress, name what's slipping, and always end each section with a clear "so what." Plain prose, no preamble, no meta commentary.`;

    const prompt = `Write the ${monthLabel} Monthly Strategic Review for ${ctx.org ?? "the organization"}.

Use these exact markdown headings (## level), in this order:

## How this month went
## Financial pulse
## KPI progress
## Fundraising & grants
## Risks & watch-outs
## Recommended next 30 days

For each section: 2–4 sentences of narrative that references specific numbers/items from the data. End the final section with a bulleted list of 3–5 concrete recommendations phrased as verbs the ED can act on ("Schedule…", "Draft…", "Review…"). Do not invent data — if a section has no data, say what to do to fix that.

Reference data:
${JSON.stringify(ctx, null, 2).slice(0, 8000)}

Return ONLY the markdown, starting with the first heading.`;

    try {
      const { text } = await generateText({
        model: gateway("gemini-flash-latest"),
        system,
        prompt,
      });
      return { text: text.trim(), context: ctx, monthLabel };
    } catch (err: unknown) {
      const e = err as { statusCode?: number; status?: number; message?: string };
      const status = e.statusCode ?? e.status;
      if (status === 429) throw new Error("Gemini API rate limit reached — wait a minute and try again.");
      if (status === 403) {
        throw new Error(
          "Gemini API key was rejected or is out of quota — check the key in Google AI Studio.",
        );
      }
      throw new Error(e.message ?? "AI request failed");
    }
  });
