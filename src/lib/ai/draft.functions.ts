import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { createGeminiProvider } from "@/lib/ai-gateway.server";
import { z } from "zod";

const Input = z.object({
  kind: z.enum(["meeting_summary", "assessment_reflection", "plan_narrative", "plan_section"]),
  organizationId: z.string().uuid(),
  // Per-kind payload (kept loose; validated in handler)
  meetingId: z.string().uuid().optional(),
  assessment: z
    .object({
      title: z.string(),
      framework: z.string(),
      score: z.number(),
      maturity: z.string(),
      answers: z.array(z.object({ prompt: z.string(), value: z.number() })),
    })
    .optional(),
  plan: z
    .object({
      topic: z.string(),
      bullets: z.array(z.string()).max(40),
    })
    .optional(),
  sectionKey: z.string().optional(),
  additionalContext: z.string().max(2000).optional(),
});

function callGateway(system: string, prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  const gateway = createGeminiProvider(key);
  return generateText({
    model: gateway("gemini-flash-latest"),
    system,
    prompt,
  });
}

export const draftNarrative = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify org membership
    const { data: member } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", data.organizationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) throw new Error("Not a member of this organization");

    const { data: org } = await supabase
      .from("organizations")
      .select("name,mission")
      .eq("id", data.organizationId)
      .maybeSingle();
    const orgLine = [
      org?.name ? `Organization: ${org.name}` : null,
      org?.mission ? `Mission: ${org.mission}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    let system = "";
    let prompt = "";

    if (data.kind === "meeting_summary") {
      if (!data.meetingId) throw new Error("meetingId required");
      const [{ data: meeting }, { data: agenda }, { data: decisions }, { data: actions }] =
        await Promise.all([
          supabase
            .from("meetings")
            .select("title,scheduled_at,cadence,status")
            .eq("id", data.meetingId)
            .eq("organization_id", data.organizationId)
            .maybeSingle(),
          supabase
            .from("meeting_agenda_items")
            .select("title,description,sort_order")
            .eq("meeting_id", data.meetingId)
            .order("sort_order"),
          supabase
            .from("meeting_decisions")
            .select("title,rationale,impact,follow_up")
            .eq("meeting_id", data.meetingId),
          supabase
            .from("meeting_action_items")
            .select("context,commitment_due_date")
            .eq("meeting_id", data.meetingId),
        ]);
      if (!meeting) throw new Error("Meeting not found");

      const lines: string[] = [];
      lines.push(`Meeting: ${meeting.title} (${meeting.cadence ?? "ad-hoc"})`);
      if (agenda?.length) {
        lines.push(
          `Agenda:\n${agenda
            .map((a, i) => `${i + 1}. ${a.title}${a.description ? " — " + a.description : ""}`)
            .join("\n")}`,
        );
      }
      if (decisions?.length) {
        lines.push(
          `Decisions:\n${decisions
            .map(
              (d) =>
                `- ${d.title}${d.rationale ? " (rationale: " + d.rationale + ")" : ""}${d.impact ? " [impact: " + d.impact + "]" : ""}`,
            )
            .join("\n")}`,
        );
      }
      if (actions?.length) {
        lines.push(
          `Action items:\n${actions
            .map(
              (a) =>
                `- ${a.context ?? "(no description)"}${a.commitment_due_date ? " due " + a.commitment_due_date : ""}`,
            )
            .join("\n")}`,
        );
      }

      system =
        "You are an executive board secretary. Write polished, concise meeting summaries a board chair could read in 30 seconds. Plain prose, no headings, no bullet lists, no preamble.";
      prompt = `Write a single-paragraph executive summary (4–6 sentences) of this meeting.

${orgLine}

${lines.join("\n\n")}

Return ONLY the summary paragraph.`;
    } else if (data.kind === "assessment_reflection") {
      if (!data.assessment) throw new Error("assessment payload required");
      const a = data.assessment;
      const top = a.answers
        .slice()
        .sort((x, y) => y.value - x.value)
        .slice(0, 3);
      const bottom = a.answers
        .slice()
        .sort((x, y) => x.value - y.value)
        .slice(0, 3);

      system =
        "You are a strategic advisor for nonprofits. Write a candid, specific reflection in the organization's voice. Plain prose, no bullet points, no headings, no preamble.";
      prompt = `Write a 2-paragraph leadership reflection on this self-assessment result.

${orgLine}

Assessment: ${a.title} (${a.framework})
Score: ${a.score}/100 — Maturity: ${a.maturity}

Strongest dimensions:
${top.map((t) => `- ${t.prompt} (${t.value}/5)`).join("\n")}

Weakest dimensions:
${bottom.map((t) => `- ${t.prompt} (${t.value}/5)`).join("\n")}

The first paragraph should name what's working and why it matters. The second should name the most important gap and one concrete 90-day move. Return ONLY the two paragraphs.`;
    } else if (data.kind === "plan_narrative") {
      if (!data.plan) throw new Error("plan payload required");
      system =
        "You are a strategy consultant. Turn raw planning notes into a polished narrative paragraph in the organization's voice. Plain prose, no bullets, no preamble.";
      prompt = `Write a narrative paragraph (3–5 sentences) on the topic below for the strategic plan.

${orgLine}

Topic: ${data.plan.topic}
Notes:
${data.plan.bullets.map((b) => `- ${b}`).join("\n")}

Return ONLY the paragraph.`;
    } else {
      // plan_section: draft a full strategic-plan section from org data
      if (!data.sectionKey) throw new Error("sectionKey required");
      const { SECTION_PROMPTS } = await import("./section-prompts");
      const cfg = SECTION_PROMPTS[data.sectionKey];
      if (!cfg) throw new Error(`Unknown section: ${data.sectionKey}`);

      // Pull the data the section needs
      const [
        { data: fullOrg },
        { data: pillars },
        { data: kpis },
        { data: risks },
        { data: okrs },
        { data: roadmap },
        { data: revenue },
        { data: expenses },
        { data: grants },
        { data: swot },
        { data: assessments },
      ] = await Promise.all([
        supabase
          .from("organizations")
          .select(
            "name,mission,vision,values,annual_budget,staff_count,volunteer_count,geographic_area,beneficiaries",
          )
          .eq("id", data.organizationId)
          .maybeSingle(),
        supabase
          .from("strategic_pillars")
          .select("name,description,sort_order,impact_lenses,fourrs_dimensions,priority_level")
          .eq("organization_id", data.organizationId)
          .order("sort_order"),
        supabase
          .from("kpis")
          .select("name,baseline,current_value,target,target_year,unit,category")
          .eq("organization_id", data.organizationId),
        supabase
          .from("risks")
          .select("title,category,likelihood,impact,mitigation")
          .eq("organization_id", data.organizationId),
        supabase
          .from("okrs")
          .select("objective,quarter,status,owner")
          .eq("organization_id", data.organizationId),
        supabase
          .from("roadmap_items")
          .select("title,description,owner,start_date,end_date,status")
          .eq("organization_id", data.organizationId)
          .order("start_date"),
        supabase
          .from("revenue_streams")
          .select("name,category,yearly_amounts,confidence")
          .eq("organization_id", data.organizationId),
        supabase
          .from("expense_lines")
          .select("name,category,program_name,yearly_amounts")
          .eq("organization_id", data.organizationId),
        supabase
          .from("grants")
          .select(
            "funder_name,grant_name,status,amount_requested,amount_awarded,probability,program_area,start_date,end_date",
          )
          .eq("organization_id", data.organizationId),
        supabase
          .from("swot_items")
          .select("quadrant,text")
          .eq("organization_id", data.organizationId),
        supabase
          .from("assessment_responses")
          .select("assessment_type,score,maturity_level")
          .eq("organization_id", data.organizationId)
          .not("completed_at", "is", null)
          .order("updated_at", { ascending: false })
          .limit(20),
      ]);

      const ctx = {
        org: fullOrg,
        pillars: pillars ?? [],
        kpis: kpis ?? [],
        risks: risks ?? [],
        okrs: okrs ?? [],
        roadmap: roadmap ?? [],
        revenue: revenue ?? [],
        expenses: expenses ?? [],
        grants: grants ?? [],
        swot: swot ?? [],
        assessmentScores: assessments ?? [],
      };

      const IMPACT_INSTRUCTION = `Format the section with these six bold sub-headings, each on its own line followed by 1–3 sentences:
**Inclusive Partnerships:**
**Measurable Outcomes:**
**Purpose-Driven Innovation:**
**Adaptive Strategies:**
**Community Empowerment:**
**Transparency & Accountability:**`;

      const FOURRS_INSTRUCTION = `Also format a second block with these four bold sub-headings, each on its own line followed by 1–3 sentences:
**Relationships:**
**Resources:**
**Results:**
**Reputation:**`;

      system =
        "You are a senior nonprofit strategy consultant writing in the organization's voice for an external Strategic Plan document. Professional, confident, specific. No preamble. No meta commentary. Plain prose unless the user requests structure.";
      prompt = `Draft the **${cfg.title}** section of a Strategic Plan.

${orgLine}

${cfg.intro}

${cfg.impact ? IMPACT_INSTRUCTION + "\n" : ""}
${cfg.fourrs ? FOURRS_INSTRUCTION + "\n" : ""}
Reference data (use what is relevant, ignore what isn't):
${JSON.stringify(ctx, null, 2).slice(0, 8000)}

${cfg.guidance}

Return ONLY the section body — no title, no heading, no horizontal rules.`;
    }

    if (data.additionalContext?.trim()) {
      prompt += `\n\nAdditional context from the user:\n${data.additionalContext.trim()}`;
    }

    try {
      const { text } = await callGateway(system, prompt);
      return { text: text.trim() };
    } catch (err: unknown) {
      const e = err as { statusCode?: number; status?: number; message?: string };
      const status = e.statusCode ?? e.status;
      if (status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
      if (status === 402)
        throw new Error(
          "AI credits exhausted for this workspace. Add credits in Settings → Plans & credits.",
        );
      throw new Error(e.message ?? "AI request failed");
    }
  });
