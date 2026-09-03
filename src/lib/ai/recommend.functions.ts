import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateObject } from "ai";
import { createGeminiProvider } from "@/lib/ai-gateway.server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// The AI Strategist as a structured advisor (FR Section 29): analyzes real
// org data + assessment scores and returns typed, individually
// accept/edit/reject-able suggestions — never prose the UI has to parse.

function gateway() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  return createGeminiProvider(key);
}

async function loadOrgContext(supabase: SupabaseClient<Database>, organizationId: string) {
  const [{ data: org }, { data: assessments }, { data: pillars }, { data: risks }, { data: kpis }] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("name,mission,vision,stage,annual_budget,staff_count,geographic_area")
        .eq("id", organizationId)
        .maybeSingle(),
      supabase
        .from("assessment_responses")
        .select("assessment_type,score,maturity_level")
        .eq("organization_id", organizationId)
        .not("completed_at", "is", null)
        .order("score", { ascending: true }),
      supabase
        .from("strategic_pillars")
        .select("name,description")
        .eq("organization_id", organizationId),
      supabase.from("risks").select("title,category").eq("organization_id", organizationId),
      supabase.from("kpis").select("name,category").eq("organization_id", organizationId),
    ]);
  return {
    org,
    assessments: assessments ?? [],
    existingPillars: (pillars ?? []).map((p: { name: string }) => p.name),
    existingRisks: (risks ?? []).map((r: { title: string }) => r.title),
    existingKpis: (kpis ?? []).map((k: { name: string }) => k.name),
  };
}

const RecommendationSchema = z.object({
  priorities: z
    .array(
      z.object({
        name: z
          .string()
          .describe("A short, board-ready strategic priority name, not a full sentence"),
        description: z.string().describe("1-2 sentences on what this priority means in practice"),
        rationale: z
          .string()
          .describe("Why this matters now, tied to a specific assessment finding"),
        priorityLevel: z.enum(["high", "medium", "low"]),
      }),
    )
    .max(4),
  objectives: z
    .array(
      z.object({
        objective: z
          .string()
          .describe(
            "A SMART-formatted objective sentence (Specific, Measurable, Achievable, Relevant, Time-bound)",
          ),
        kpiName: z.string().describe("A short KPI name to track this objective"),
        kpiUnit: z.string().describe("Unit for the KPI, e.g. '%', '$', 'count'"),
        suggestedTarget: z.number().describe("A plausible numeric target for the KPI"),
      }),
    )
    .max(4),
  risks: z
    .array(
      z.object({
        title: z.string().describe("A concise risk statement"),
        category: z.enum([
          "Financial",
          "Programmatic",
          "Reputational",
          "Operational",
          "Legal",
          "Strategic",
        ]),
        likelihood: z.number().int().min(1).max(5),
        impact: z.number().int().min(1).max(5),
        mitigation: z.string().describe("A concrete first mitigation step"),
      }),
    )
    .max(4),
});

export type StrategicRecommendations = z.infer<typeof RecommendationSchema>;

export const generateStrategicRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ organizationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: member } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", data.organizationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) throw new Error("Not a member of this organization");

    const ctx = await loadOrgContext(supabase, data.organizationId);
    if (ctx.assessments.length === 0) {
      throw new Error(
        "Complete at least one assessment first so recommendations can be grounded in real data.",
      );
    }

    const system =
      "You are a senior nonprofit strategy consultant acting as an AI Strategist inside a planning tool. You analyze real assessment scores and organizational data to recommend strategic priorities, SMART objectives with KPIs, and risks. Be specific and concrete — reference the actual weak assessment areas by name. Never suggest something that duplicates an already-existing priority, risk, or KPI listed below. Ground every suggestion in the data provided; do not invent facts about the organization.";

    const prompt = `Organization context:
${JSON.stringify(ctx.org, null, 2)}

Assessment scores (lowest first — these are the biggest opportunities):
${JSON.stringify(ctx.assessments, null, 2)}

Already-existing strategic priorities (do NOT duplicate these): ${ctx.existingPillars.join(", ") || "none yet"}
Already-existing risks (do NOT duplicate these): ${ctx.existingRisks.join(", ") || "none yet"}
Already-existing KPIs (do NOT duplicate these): ${ctx.existingKpis.join(", ") || "none yet"}

Recommend up to 4 new strategic priorities, up to 4 new SMART objectives (each with a KPI), and up to 4 new risks — each grounded in a specific assessment finding above. If there aren't 4 good ideas, return fewer rather than padding.`;

    try {
      const { object } = await generateObject({
        model: gateway()("gemini-flash-lite-latest"),
        schema: RecommendationSchema,
        system,
        prompt,
      });
      return object;
    } catch (err: unknown) {
      const e = err as { statusCode?: number; status?: number; message?: string };
      const status = e.statusCode ?? e.status;
      if (status === 429)
        throw new Error("Gemini API rate limit reached — wait a minute and try again.");
      throw new Error(e.message ?? "AI recommendation request failed");
    }
  });

const PressureTestSchema = z.object({
  findings: z
    .array(
      z.object({
        title: z
          .string()
          .describe("A short, specific finding, e.g. 'Grant concentration exceeds safe threshold'"),
        severity: z.enum(["low", "medium", "high"]),
        explanation: z
          .string()
          .describe(
            "1-2 sentences explaining the assumption or concentration being flagged, citing actual numbers",
          ),
        suggestedMitigation: z.string(),
      }),
    )
    .max(5),
});

export type PressureTestResult = z.infer<typeof PressureTestSchema>;

export const pressureTestAssumptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ organizationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: member } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", data.organizationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) throw new Error("Not a member of this organization");

    const [{ data: revenue }, { data: expenses }, { data: grants }, { data: org }] =
      await Promise.all([
        supabase
          .from("revenue_streams")
          .select("name,category,yearly_amounts,confidence")
          .eq("organization_id", data.organizationId),
        supabase
          .from("expense_lines")
          .select("name,category,yearly_amounts")
          .eq("organization_id", data.organizationId),
        supabase
          .from("grants")
          .select("funder_name,amount_requested,amount_awarded,status,probability")
          .eq("organization_id", data.organizationId),
        supabase
          .from("organizations")
          .select("staff_count,annual_budget")
          .eq("id", data.organizationId)
          .maybeSingle(),
      ]);

    if (!revenue?.length && !expenses?.length && !grants?.length) {
      throw new Error(
        "Add some budget lines or grants first — there's nothing to pressure-test yet.",
      );
    }

    const system =
      "You are a nonprofit financial analyst pressure-testing a budget for unrealistic or risky assumptions — revenue concentration, unfunded growth, overly optimistic projections relative to staff capacity. Be specific and cite the actual numbers given. Do not invent data. If the budget looks genuinely sound, return fewer findings rather than manufacturing concerns.";

    const prompt = `Organization: ${JSON.stringify(org)}

Revenue streams: ${JSON.stringify(revenue ?? [])}
Expense lines: ${JSON.stringify(expenses ?? [])}
Grants pipeline: ${JSON.stringify(grants ?? [])}

Identify up to 5 findings a board treasurer should see before approving this budget.`;

    try {
      const { object } = await generateObject({
        model: gateway()("gemini-flash-lite-latest"),
        schema: PressureTestSchema,
        system,
        prompt,
      });
      return object;
    } catch (err: unknown) {
      const e = err as { statusCode?: number; status?: number; message?: string };
      const status = e.statusCode ?? e.status;
      if (status === 429)
        throw new Error("Gemini API rate limit reached — wait a minute and try again.");
      throw new Error(e.message ?? "AI pressure-test request failed");
    }
  });
