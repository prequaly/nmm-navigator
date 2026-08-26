// Pure utilities to derive monthly budget projections from grant data.

export type GrantRow = {
  id: string;
  funder_name: string;
  grant_name: string;
  grant_type: string;
  status: string;
  restriction: string;
  amount_requested: number | null;
  amount_awarded: number | null;
  probability: number;
  start_date: string | null;
  end_date: string | null;
  program_area: string | null;
  application_deadline?: string | null;
  decision_date?: string | null;
};

export type MonthBucket = {
  key: string; // YYYY-MM
  label: string; // "Jan '26"
  date: Date;
};

export function buildMonthRange(start: Date, months: number): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    buckets.push({ key, label, date: d });
  }
  return buckets;
}

/**
 * Distribute a grant's value evenly across months between start_date and end_date.
 * - Awarded/Active grants use amount_awarded at 100%.
 * - Prospect/Applied/Pending grants use amount_requested * (probability/100).
 * - Declined grants contribute $0.
 */
export function grantMonthlyAmount(g: GrantRow): { perMonth: number; months: { key: string; amount: number }[] } {
  if (!g.start_date || !g.end_date) return { perMonth: 0, months: [] };
  const start = new Date(g.start_date);
  const end = new Date(g.end_date);
  if (end < start) return { perMonth: 0, months: [] };

  const isCommitted = ["awarded", "active", "closed"].includes(g.status);
  const isDead = g.status === "declined";
  if (isDead) return { perMonth: 0, months: [] };

  const baseAmount = isCommitted
    ? Number(g.amount_awarded ?? g.amount_requested ?? 0)
    : Number(g.amount_requested ?? 0) * (g.probability / 100);

  // count months inclusive
  const monthCount =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  const perMonth = monthCount > 0 ? baseAmount / monthCount : 0;

  const months: { key: string; amount: number }[] = [];
  for (let i = 0; i < monthCount; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, amount: perMonth });
  }
  return { perMonth, months };
}

export function aggregateGrantsByMonth(
  grants: GrantRow[],
  buckets: MonthBucket[],
): { committed: number[]; weighted: number[]; total: number[] } {
  const committed = new Array(buckets.length).fill(0);
  const weighted = new Array(buckets.length).fill(0);
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const g of grants) {
    const isCommitted = ["awarded", "active", "closed"].includes(g.status);
    const { months } = grantMonthlyAmount(g);
    for (const m of months) {
      const i = idx.get(m.key);
      if (i === undefined) continue;
      if (isCommitted) committed[i] += m.amount;
      else weighted[i] += m.amount;
    }
  }
  const total = committed.map((c, i) => c + weighted[i]);
  return { committed, weighted, total };
}

export type YearlyAmounts = Partial<Record<"y1" | "y2" | "y3" | "y4" | "y5", number>>;

export type BudgetLine = {
  id: string;
  name: string;
  category: string | null;
  yearly_amounts: YearlyAmounts | null;
};

/**
 * Spread annual budget lines (Y1..Y5 anchored to baseYear) evenly across months
 * within each year, then sum into the supplied monthly buckets.
 */
export function aggregateBudgetByMonth(
  lines: BudgetLine[],
  buckets: MonthBucket[],
  baseYear: number,
): number[] {
  const out = new Array(buckets.length).fill(0);
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  const years: ("y1" | "y2" | "y3" | "y4" | "y5")[] = ["y1", "y2", "y3", "y4", "y5"];
  for (const line of lines) {
    years.forEach((y, yi) => {
      const annual = Number(line.yearly_amounts?.[y] ?? 0);
      if (!annual) return;
      const perMonth = annual / 12;
      const year = baseYear + yi;
      for (let m = 0; m < 12; m++) {
        const key = `${year}-${String(m + 1).padStart(2, "0")}`;
        const i = idx.get(key);
        if (i !== undefined) out[i] += perMonth;
      }
    });
  }
  return out;
}

export const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

