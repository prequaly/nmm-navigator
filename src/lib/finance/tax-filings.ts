import { supabase } from "@/integrations/supabase/client";
import type { Extracted990, TaxFormType } from "./extract-990.functions";

/**
 * Tax filings are the financial spine of "Fund My Strategy": an organization
 * brings prior-year numbers in once (uploaded form or typed by hand) and every
 * downstream module reads them from here instead of asking again.
 */

export type RevenueLines = {
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

export type TaxFiling = {
  id: string;
  organization_id: string;
  form_type: TaxFormType;
  tax_year: number;
  fiscal_year_end: string | null;
  source: "upload" | "manual";
  source_filename: string | null;
  filed_organization_name: string | null;
  filed_ein: string | null;
  total_revenue: number;
  revenue_lines: RevenueLines;
  top_contributors: { name: string; amount: number }[];
  notes: string | null;
  updated_at: string;
};

export const REVENUE_LINE_FIELDS: { key: keyof RevenueLines; label: string; helper?: string }[] = [
  {
    key: "contributions_gifts_grants",
    label: "Contributions, gifts & grants (total)",
    helper: "Form 990 Part VIII line 1h — includes government grants",
  },
  {
    key: "government_grants",
    label: "…of which government grants",
    helper: "Line 1e — reported separately, already inside the total above",
  },
  { key: "program_service_revenue", label: "Program service revenue", helper: "Line 2g" },
  { key: "investment_income", label: "Investment income", helper: "Line 3" },
  { key: "royalties", label: "Royalties", helper: "Line 5" },
  { key: "rental_income_net", label: "Rental income (net)", helper: "Line 6d" },
  { key: "net_fundraising", label: "Special events (net)", helper: "Line 8c" },
  { key: "net_gaming", label: "Gaming (net)", helper: "Line 9c" },
  { key: "net_sales_inventory", label: "Sales of inventory (net)", helper: "Line 10c" },
  { key: "other_revenue", label: "Other revenue", helper: "Line 11e" },
];

export function blankRevenueLines(): RevenueLines {
  return {
    contributions_gifts_grants: 0,
    government_grants: 0,
    program_service_revenue: 0,
    investment_income: 0,
    royalties: 0,
    rental_income_net: 0,
    net_fundraising: 0,
    net_gaming: 0,
    net_sales_inventory: 0,
    other_revenue: 0,
  };
}

/** Sum of every line, treating government grants as a subset of contributions. */
export function sumRevenueLines(r: RevenueLines): number {
  return (
    r.contributions_gifts_grants +
    r.program_service_revenue +
    r.investment_income +
    r.royalties +
    r.rental_income_net +
    r.net_fundraising +
    r.net_gaming +
    r.net_sales_inventory +
    r.other_revenue
  );
}

function coerceLines(raw: unknown): RevenueLines {
  const base = blankRevenueLines();
  if (!raw || typeof raw !== "object") return base;
  const src = raw as Record<string, unknown>;
  for (const key of Object.keys(base) as (keyof RevenueLines)[]) {
    const n = Number(src[key]);
    if (Number.isFinite(n)) base[key] = n;
  }
  return base;
}

function rowToFiling(row: Record<string, unknown>): TaxFiling {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    form_type: row.form_type as TaxFormType,
    tax_year: Number(row.tax_year),
    fiscal_year_end: (row.fiscal_year_end as string | null) ?? null,
    source: (row.source as "upload" | "manual") ?? "upload",
    source_filename: (row.source_filename as string | null) ?? null,
    filed_organization_name: (row.filed_organization_name as string | null) ?? null,
    filed_ein: (row.filed_ein as string | null) ?? null,
    total_revenue: Number(row.total_revenue ?? 0),
    revenue_lines: coerceLines(row.revenue_lines),
    top_contributors: Array.isArray(row.top_contributors)
      ? (row.top_contributors as { name: string; amount: number }[])
      : [],
    notes: (row.notes as string | null) ?? null,
    updated_at: String(row.updated_at),
  };
}

export async function loadTaxFilings(orgId: string): Promise<TaxFiling[]> {
  const { data, error } = await supabase
    .from("tax_filings")
    .select("*")
    .eq("organization_id", orgId)
    .order("tax_year", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToFiling(r as Record<string, unknown>));
}

export async function loadLatestTaxFiling(orgId: string): Promise<TaxFiling | null> {
  const filings = await loadTaxFilings(orgId);
  return filings[0] ?? null;
}

export type SaveTaxFilingInput = {
  form_type: TaxFormType;
  tax_year: number;
  fiscal_year_end?: string | null;
  source: "upload" | "manual";
  source_filename?: string | null;
  filed_organization_name?: string | null;
  filed_ein?: string | null;
  revenue_lines: RevenueLines;
  top_contributors?: { name: string; amount: number }[];
  notes?: string | null;
};

/** Upsert on (organization, form type, year) so re-uploading a year replaces it. */
export async function saveTaxFiling(orgId: string, input: SaveTaxFilingInput): Promise<TaxFiling> {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("tax_filings")
    .upsert(
      {
        organization_id: orgId,
        form_type: input.form_type,
        tax_year: input.tax_year,
        fiscal_year_end: input.fiscal_year_end ?? null,
        source: input.source,
        source_filename: input.source_filename ?? null,
        filed_organization_name: input.filed_organization_name ?? null,
        filed_ein: input.filed_ein ?? null,
        total_revenue: sumRevenueLines(input.revenue_lines),
        revenue_lines: input.revenue_lines,
        top_contributors: input.top_contributors ?? [],
        notes: input.notes ?? null,
        created_by: u.user?.id ?? null,
      },
      { onConflict: "organization_id,form_type,tax_year" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return rowToFiling(data as Record<string, unknown>);
}

export async function deleteTaxFiling(id: string): Promise<void> {
  const { error } = await supabase.from("tax_filings").delete().eq("id", id);
  if (error) throw error;
}

export function extractedToRevenueLines(x: Extracted990): RevenueLines {
  return { ...x.revenue_lines };
}

/**
 * The 2-year rule: an organization founded two or more years before the
 * current year has filed at least one return, so we ask for it outright.
 * Anything newer gets the choice of uploading or entering numbers by hand.
 */
export type TaxIntakeRequirement = "required" | "optional" | "unknown";

export function taxIntakeRequirement(
  yearFounded: number | null | undefined,
  now = new Date(),
): TaxIntakeRequirement {
  if (!yearFounded || !Number.isFinite(yearFounded)) return "unknown";
  return now.getFullYear() - yearFounded >= 2 ? "required" : "optional";
}

// ---------------------------------------------------------------------------
// Applying a filing to the budget
// ---------------------------------------------------------------------------

/**
 * How each 990 revenue line becomes a budget revenue stream. Government
 * grants are pulled out of the contributions total so the two don't
 * double-count.
 */
const STREAM_MAP: { key: keyof RevenueLines; name: string; category: string }[] = [
  {
    key: "contributions_gifts_grants",
    name: "Contributions, Gifts & Grants",
    category: "Contributions",
  },
  { key: "government_grants", name: "Government Grants & Contracts", category: "Government" },
  { key: "program_service_revenue", name: "Program Service Revenue", category: "Earned" },
  { key: "investment_income", name: "Investment Income", category: "Investment" },
  { key: "royalties", name: "Royalties", category: "Investment" },
  { key: "rental_income_net", name: "Rental Income (net)", category: "Rental" },
  { key: "net_fundraising", name: "Special Events (net)", category: "Fundraising" },
  { key: "net_gaming", name: "Gaming (net)", category: "Fundraising" },
  { key: "net_sales_inventory", name: "Sales of Inventory (net)", category: "Earned" },
  { key: "other_revenue", name: "Other Revenue", category: "Other" },
];

export type PlannedStream = {
  name: string;
  category: string;
  amount: number;
};

/**
 * Prior-year actuals, split into the streams a budget is built from. Only
 * non-zero lines make the cut — a budget full of $0 rows helps nobody.
 */
export function taxFilingToStreams(filing: TaxFiling): PlannedStream[] {
  const lines = filing.revenue_lines;
  const nonGovContributions = Math.max(
    0,
    lines.contributions_gifts_grants - lines.government_grants,
  );
  return STREAM_MAP.map(({ key, name, category }) => ({
    name,
    category,
    amount: key === "contributions_gifts_grants" ? nonGovContributions : lines[key],
  })).filter((s) => s.amount > 0);
}

/**
 * Writes the filing's streams into the budget as Year 1, held flat across the
 * 5-year horizon. Flat is the honest default: last year's actuals are a fact,
 * next year's growth is a decision the user should make themselves on the
 * Budget Planner.
 */
export async function applyTaxFilingToBudget(
  orgId: string,
  planId: string,
  filing: TaxFiling,
  opts: { replaceExisting?: boolean } = {},
): Promise<number> {
  const streams = taxFilingToStreams(filing);
  if (streams.length === 0) return 0;

  if (opts.replaceExisting) {
    const { error: delErr } = await supabase
      .from("revenue_streams")
      .delete()
      .eq("organization_id", orgId)
      .eq("plan_id", planId);
    if (delErr) throw delErr;
  }

  const rows = streams.map((s, i) => ({
    organization_id: orgId,
    plan_id: planId,
    name: s.name,
    category: s.category,
    confidence: "medium",
    sort_order: i + 1,
    yearly_amounts: { y1: s.amount, y2: s.amount, y3: s.amount, y4: s.amount, y5: s.amount },
    notes: `From ${filing.form_type} filing for ${filing.tax_year}`,
  }));

  const { error } = await supabase.from("revenue_streams").insert(rows);
  if (error) throw error;
  return rows.length;
}
