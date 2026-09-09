import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  filename: z.string().min(1),
  // Raw base64 (no data: prefix). Capped at ~12MB encoded.
  fileDataBase64: z.string().min(100).max(16_000_000),
});

export type TaxFormType = "990" | "990-EZ" | "990-N" | "1099" | "other";

export type Extracted990 = {
  organization_name: string | null;
  ein: string | null;
  fiscal_year_end: string | null;
  /** Which form the model believes it read. */
  detected_form_type: TaxFormType;
  /** Tax year the form covers, when legible. */
  tax_year: number | null;
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
      "You extract financial data from US nonprofit tax documents (IRS Form 990, 990-EZ, " +
      "990-N, and Form 1099 series). " +
      "You return STRICT JSON only. Use 0 when a line is blank or not visible. " +
      "All dollar amounts are whole-number USD (no commas, no $).";

    const userText = `Identify which tax form is attached, then extract its revenue figures.

Form-specific guidance:
- Form 990: read Part VIII (Statement of Revenue) into the matching lines below.
- Form 990-EZ: read Part I lines 1-8; map line 1 to contributions_gifts_grants,
  line 2 to program_service_revenue, line 4 to investment_income,
  line 6c to net_fundraising, line 7c to net_sales_inventory, line 8 to other_revenue.
- Form 990-N (e-Postcard): it carries no dollar figures. Return zeros and set
  detected_form_type to "990-N".
- Form 1099 (NEC / MISC / K): this reports a single payer's payments, not a full
  year of organizational revenue. Put the reported amount in the line that best
  fits the payment (program_service_revenue for services performed,
  other_revenue when unclear), set total_revenue to that same amount, and list
  the payer under top_contributors.

Return a JSON object with EXACTLY this shape:
{
  "organization_name": string | null,
  "ein": string | null,
  "fiscal_year_end": "YYYY-MM-DD" | null,
  "detected_form_type": "990" | "990-EZ" | "990-N" | "1099" | "other",
  "tax_year": number | null,
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

    const FORM_TYPES: TaxFormType[] = ["990", "990-EZ", "990-N", "1099", "other"];
    const detected: TaxFormType = FORM_TYPES.includes(parsed.detected_form_type)
      ? parsed.detected_form_type
      : "other";
    const year = Number(parsed.tax_year);

    return {
      organization_name: parsed.organization_name ?? null,
      ein: parsed.ein ?? null,
      fiscal_year_end: parsed.fiscal_year_end ?? null,
      detected_form_type: detected,
      tax_year: Number.isFinite(year) && year > 1900 && year < 2200 ? Math.round(year) : null,
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
