import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { createGeminiProvider, withModelFallback } from "@/lib/ai-gateway.server";
import { z } from "zod";
import { getQuestion } from "./questions";

const Input = z.object({
  questionId: z.string().min(1),
  variantId: z.string().min(1),
  organizationId: z.string().uuid(),
  additionalContext: z.string().max(2000).optional(),
});

export const draftGrantResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const q = getQuestion(data.questionId);
    if (!q) throw new Error("Unknown question");
    const variant = q.variants.find((v) => v.id === data.variantId);
    if (!variant) throw new Error("Unknown variant");

    const { supabase, userId } = context;

    // Verify membership
    const { data: member } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", data.organizationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) throw new Error("Not a member of this organization");

    // Pull org + existing response context.
    const [{ data: org }, { data: existing }, { data: pillars }] = await Promise.all([
      supabase
        .from("organizations")
        .select("name,mission")
        .eq("id", data.organizationId)
        .maybeSingle(),
      supabase
        .from("grant_responses")
        .select("question_id,variant,content")
        .eq("organization_id", data.organizationId)
        .neq("content", ""),
      supabase
        .from("strategic_pillars")
        .select("name,description")
        .eq("organization_id", data.organizationId)
        .limit(8),
    ]);

    const contextLines: string[] = [];
    if (org?.name) contextLines.push(`Organization: ${org.name}`);
    if (org?.mission) contextLines.push(`Mission: ${org.mission}`);
    if (pillars && pillars.length) {
      contextLines.push(
        `Strategic priorities:\n${pillars.map((p) => `- ${p.name}${p.description ? ": " + p.description : ""}`).join("\n")}`,
      );
    }
    if (existing && existing.length) {
      const map = new Map<string, string>();
      for (const r of existing) {
        const qq = getQuestion(r.question_id);
        if (!qq) continue;
        // Keep the longest variant we have per question for richer context.
        const cur = map.get(qq.id);
        if (!cur || (r.content?.length ?? 0) > cur.length) map.set(qq.id, r.content ?? "");
      }
      const lines = Array.from(map.entries())
        .filter(([id]) => id !== data.questionId)
        .slice(0, 8)
        .map(([id, content]) => {
          const qq = getQuestion(id)!;
          return `Q: ${qq.question}\nA: ${content.slice(0, 800)}`;
        });
      if (lines.length) contextLines.push(`Previously written answers:\n${lines.join("\n\n")}`);
    }

    const limitLine =
      variant.target.type === "chars"
        ? `Keep the response under ${variant.target.value} characters (hard limit).`
        : `Aim for approximately ${variant.target.value} words.`;

    const includeLine = q.include?.length ? `Be sure to address: ${q.include.join(", ")}.` : "";
    const userExtra = data.additionalContext?.trim()
      ? `\nAdditional context from the user:\n${data.additionalContext.trim()}`
      : "";

    const system = `You are an expert grant writer for nonprofit organizations. Produce a polished, specific, donor-facing narrative in the organization's voice. Avoid clichés and filler. Use plain prose — no bullet points or headings unless the prompt requires them. Do not invent statistics; if data is missing, write in qualitative terms.`;

    const prompt = `Write a grant application response.

Question: ${q.question}
Purpose: ${q.purpose}
${includeLine}
${limitLine}

Organization context:
${contextLines.join("\n\n") || "(No saved org context yet — write a general but compelling response.)"}
${userExtra}

Return ONLY the response text — no preamble, no closing remarks.`;

    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");

    const gateway = createGeminiProvider(key);
    try {
      const { text } = await withModelFallback((modelId) =>
        generateText({ model: gateway(modelId), system, prompt }),
      );
      return { text: text.trim() };
    } catch (err: unknown) {
      const e = err as { statusCode?: number; status?: number; message?: string };
      const status = e.statusCode ?? e.status;
      if (status === 429)
        throw new Error("Gemini API rate limit reached — wait a minute and try again.");
      if (status === 403) {
        throw new Error(
          "Gemini API key was rejected or is out of quota — check the key in Google AI Studio.",
        );
      }
      throw new Error(e.message ?? "AI request failed");
    }
  });
