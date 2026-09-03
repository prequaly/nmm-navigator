import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  filename: z.string().min(1),
  // Raw base64 (no data: prefix). Capped at ~12MB encoded.
  fileDataBase64: z.string().min(100).max(16_000_000),
});

export type Extracted990 = {
  organization_name: string | null;
  ein: string | null;
  fiscal_year_end: string | null;
  total_revenue: number;
  revenue_lines: {
    contributions_gifts_grants: number;
    government_grants: number;
    program_service_revenue: number;
    investment_income: number;
    royalties: number;
    rental_income_net: number;
    net_fundraising: number;
    net_gaming: number;
    net_sales_inventory: number;
    other_revenue: number;
  };
  top_contributors: { name: string; amount: number }[];
};

export const extract990 = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<Extracted990> => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");

    const system =
      "You extract financial data from IRS Form 990 PDFs for nonprofit organizations. " +
      "You return STRICT JSON only. Use 0 when a line is blank or not visible. " +
      "All dollar amounts are whole-number USD (no commas, no $).";

    const userText = `From the attached Form 990, extract Part VIII (Statement of Revenue) and basic header info.

Return a JSON object with EXACTLY this shape:
{
  "organization_name": string | null,
  "ein": string | null,
  "fiscal_year_end": "YYYY-MM-DD" | null,
  "total_revenue": number,
  "revenue_lines": {
    "contributions_gifts_grants": number,    // Part VIII line 1h (total)
    "government_grants": number,             // Part VIII line 1e (subset of 1h, reported separately)
    "program_service_revenue": number,       // Part VIII line 2g
    "investment_income": number,             // Part VIII line 3
    "royalties": number,                     // Part VIII line 5
    "rental_income_net": number,             // Part VIII line 6d
    "net_fundraising": number,               // Part VIII line 8c
    "net_gaming": number,                    // Part VIII line 9c
    "net_sales_inventory": number,           // Part VIII line 10c
    "other_revenue": number                  // Part VIII line 11e
  },
  "top_contributors": [{"name": string, "amount": number}]  // From Schedule B if visible, else []
}

Return ONLY the JSON object. No prose, no markdown fences.`;

    // Gemini's native generateContent endpoint (not the OpenAI-compatible
    // shim) for reliable inline PDF attachment support.
    const body = {
      system_instruction: { parts: [{ text: system }] },
      contents: [
        {
          role: "user",
          parts: [
            { text: userText },
            {
              inline_data: {
                mime_type: "application/pdf",
                data: data.fileDataBase64,
              },
            },
          ],
        },
      ],
      generationConfig: { response_mime_type: "application/json" },
    };

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
      },
    );

    if (res.status === 429) throw new Error("Gemini API rate limit reached — wait a minute and try again.");
    if (res.status === 403) {
      throw new Error(
        "Gemini API key was rejected or is out of quota — check the key in Google AI Studio.",
      );
    }
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`AI extraction failed (${res.status}): ${txt.slice(0, 200)}`);
    }

    const payload = await res.json();
    const content: string = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Some models wrap in ```json fences despite instructions.
      const cleaned = content.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    // Coerce + defaults
    const lines = parsed.revenue_lines ?? {};
    const num = (v: unknown) => {
      const n = typeof v === "string" ? Number(v.replace(/[$,\s]/g, "")) : Number(v);
      return Number.isFinite(n) ? Math.round(n) : 0;
    };

    return {
      organization_name: parsed.organization_name ?? null,
      ein: parsed.ein ?? null,
      fiscal_year_end: parsed.fiscal_year_end ?? null,
      total_revenue: num(parsed.total_revenue),
      revenue_lines: {
        contributions_gifts_grants: num(lines.contributions_gifts_grants),
        government_grants: num(lines.government_grants),
        program_service_revenue: num(lines.program_service_revenue),
        investment_income: num(lines.investment_income),
        royalties: num(lines.royalties),
        rental_income_net: num(lines.rental_income_net),
        net_fundraising: num(lines.net_fundraising),
        net_gaming: num(lines.net_gaming),
        net_sales_inventory: num(lines.net_sales_inventory),
        other_revenue: num(lines.other_revenue),
      },
      top_contributors: Array.isArray(parsed.top_contributors)
        ? parsed.top_contributors
            .filter((c: any) => c && c.name)
            .map((c: any) => ({ name: String(c.name), amount: num(c.amount) }))
            .slice(0, 10)
        : [],
    };
  });
