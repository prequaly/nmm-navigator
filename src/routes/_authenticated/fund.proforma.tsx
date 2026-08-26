import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell, SectionCard, PrimaryButton, GhostButton } from "@/components/app-shell/AppShell";
import { EmptyDataCard, PartialDataBadge } from "@/components/app-shell/DataState";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import {
  aggregateBudgetByMonth,
  aggregateGrantsByMonth,
  buildMonthRange,
  currency,
  type BudgetLine,
  type GrantRow,
} from "@/lib/finance/projections";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fund/proforma")({
  head: () => ({ meta: [{ title: "Cash Flow Forecast — NMM Navigator" }] }),
  component: ProformaPage,
});

function ProformaPage() {
  const { orgId } = useCurrentOrg();
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [revenueLines, setRevenueLines] = useState<BudgetLine[]>([]);
  const [expenseLines, setExpenseLines] = useState<BudgetLine[]>([]);
  const [months, setMonths] = useState(18);
  const [baseYear, setBaseYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const [g, r, e] = await Promise.all([
        supabase.from("grants").select("*").eq("organization_id", orgId),
        supabase.from("revenue_streams").select("id,name,category,yearly_amounts").eq("organization_id", orgId),
        supabase.from("expense_lines").select("id,name,category,yearly_amounts").eq("organization_id", orgId),
      ]);
      if (g.error) toast.error(g.error.message);
      setGrants((g.data as GrantRow[]) ?? []);
      setRevenueLines((r.data as BudgetLine[]) ?? []);
      setExpenseLines((e.data as BudgetLine[]) ?? []);
    })();
  }, [orgId]);

  const buckets = useMemo(() => buildMonthRange(new Date(startDate), months), [startDate, months]);
  const { committed, weighted } = useMemo(() => aggregateGrantsByMonth(grants, buckets), [grants, buckets]);
  const otherRevenue = useMemo(
    () => aggregateBudgetByMonth(revenueLines, buckets, baseYear),
    [revenueLines, buckets, baseYear],
  );
  const expenses = useMemo(
    () => aggregateBudgetByMonth(expenseLines, buckets, baseYear),
    [expenseLines, buckets, baseYear],
  );

  const chartData = buckets.map((b, i) => {
    const totalRev = committed[i] + weighted[i] + otherRevenue[i];
    return {
      month: b.label,
      Committed: Math.round(committed[i]),
      Pipeline: Math.round(weighted[i]),
      "Other Revenue": Math.round(otherRevenue[i]),
      Expenses: -Math.round(expenses[i]),
      Net: Math.round(totalRev - expenses[i]),
    };
  });

  const totals = {
    committed: committed.reduce((a, b) => a + b, 0),
    weighted: weighted.reduce((a, b) => a + b, 0),
    other: otherRevenue.reduce((a, b) => a + b, 0),
    expenses: expenses.reduce((a, b) => a + b, 0),
  };
  totals.committed;
  const totalRevenue = totals.committed + totals.weighted + totals.other;
  const net = totalRevenue - totals.expenses;

  const hasGrants = grants.length > 0;
  const hasBudget = revenueLines.length > 0 || expenseLines.length > 0;
  const noData = !hasGrants && !hasBudget;
  // Count Y1 entries with a value — proxy for "months of real data"
  const filledYears = (lines: BudgetLine[]) =>
    ["y1", "y2", "y3", "y4", "y5"].filter((y) =>
      lines.some((l) => Number((l.yearly_amounts as Record<string, number> | null)?.[y] ?? 0) > 0),
    ).length;
  const yearsOfBudget = Math.max(
    filledYears(revenueLines),
    filledYears(expenseLines),
  );
  const isPartial = hasBudget && yearsOfBudget < 2;


  function exportCSV() {
    const header = [
      "Month",
      "Committed grants",
      "Weighted pipeline",
      "Other revenue",
      "Total revenue",
      "Expenses",
      "Net",
    ];
    const rows = buckets.map((b, i) => {
      const totalRev = committed[i] + weighted[i] + otherRevenue[i];
      return [
        b.label,
        committed[i].toFixed(2),
        weighted[i].toFixed(2),
        otherRevenue[i].toFixed(2),
        totalRev.toFixed(2),
        expenses[i].toFixed(2),
        (totalRev - expenses[i]).toFixed(2),
      ];
    });
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "proforma.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell
      title="Cash Flow Forecast"
      subtitle="Month-by-month view of money in and money out — grants plus budgeted revenue, less expenses. Committed grants count at 100%; pipeline is weighted by likelihood; budget totals spread evenly."
      actions={
        <>
          <GhostButton onClick={() => window.location.assign("/fund/budget")}>Edit budget →</GhostButton>
          <GhostButton onClick={() => window.location.assign("/fund/grants")}>Edit grants →</GhostButton>
          <PrimaryButton onClick={exportCSV}>
            <Download className="size-3.5 inline -mt-0.5 mr-1" />
            Export CSV
          </PrimaryButton>
        </>
      }
    >
      {noData ? (
        <EmptyDataCard
          title="No financial data yet"
          message="Your cash flow forecast comes from two places: your grant pipeline and your multi-year budget. Add either to begin — you'll see committed grants and budgeted revenue stack here month by month."
          ctaLabel="Start with your budget"
          ctaTo="/fund/budget"
        />
      ) : (
        <>
          {isPartial && (
            <div className="mb-4 flex justify-end">
              <PartialDataBadge />
            </div>
          )}
          <SectionCard padding="p-6" className="mb-6">

        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Start month</span>
            <input
              type="month"
              value={startDate.slice(0, 7)}
              onChange={(e) => setStartDate(`${e.target.value}-01`)}
              className="border border-slate-200 rounded-md px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Horizon</span>
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="border border-slate-200 rounded-md px-3 py-2 text-sm"
            >
              <option value={12}>12 months</option>
              <option value={18}>18 months</option>
              <option value={24}>24 months</option>
              <option value={36}>36 months</option>
              <option value={60}>60 months</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Budget Y1 = </span>
            <input
              type="number"
              value={baseYear}
              onChange={(e) => setBaseYear(Number(e.target.value))}
              className="w-24 border border-slate-200 rounded-md px-3 py-2 text-sm"
            />
          </label>
          <div className="ml-auto grid grid-cols-4 gap-6 text-right">
            <Stat label="Committed" value={totals.committed} tone="emerald" />
            <Stat label="Pipeline + Other" value={totals.weighted + totals.other} tone="blue" />
            <Stat label="Expenses" value={totals.expenses} tone="rose" />
            <Stat label="Net" value={net} bold tone={net >= 0 ? "emerald" : "rose"} />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Monthly cashflow"
        subtitle="Revenue stacks above the axis (grants + budget); expenses drop below; the line shows net."
        padding="p-6"
      >
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} stackOffset="sign">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip formatter={(v: number) => currency(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Committed" stackId="cash" fill="#10b981" />
              <Bar dataKey="Pipeline" stackId="cash" fill="#93c5fd" />
              <Bar dataKey="Other Revenue" stackId="cash" fill="#a78bfa" />
              <Bar dataKey="Expenses" stackId="cash" fill="#fca5a5" />
              <Line type="monotone" dataKey="Net" stroke="#0f172a" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="Per-month breakdown" padding="p-0" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left p-3">Month</th>
                <th className="text-right p-3">Committed</th>
                <th className="text-right p-3">Pipeline</th>
                <th className="text-right p-3">Other rev.</th>
                <th className="text-right p-3">Expenses</th>
                <th className="text-right p-3">Net</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b, i) => {
                const totalRev = committed[i] + weighted[i] + otherRevenue[i];
                const monthNet = totalRev - expenses[i];
                return (
                  <tr key={b.key} className="border-t border-slate-100">
                    <td className="p-3 text-slate-700">{b.label}</td>
                    <td className="p-3 text-right tabular-nums text-emerald-700">{currency(committed[i])}</td>
                    <td className="p-3 text-right tabular-nums text-blue-700">{currency(weighted[i])}</td>
                    <td className="p-3 text-right tabular-nums text-violet-700">{currency(otherRevenue[i])}</td>
                    <td className="p-3 text-right tabular-nums text-rose-700">{currency(expenses[i])}</td>
                    <td
                      className={`p-3 text-right tabular-nums font-semibold ${
                        monthNet >= 0 ? "text-slate-900" : "text-rose-700"
                      }`}
                    >
                      {currency(monthNet)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
        </>
      )}
    </AppShell>
  );
}

function Stat({
  label,
  value,
  bold,
  tone = "slate",
}: {
  label: string;
  value: number;
  bold?: boolean;
  tone?: "slate" | "emerald" | "blue" | "rose";
}) {
  const toneClass = {
    slate: "text-slate-700",
    emerald: "text-emerald-700",
    blue: "text-blue-700",
    rose: "text-rose-700",
  }[tone];
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`tabular-nums mt-1 ${bold ? "text-xl font-semibold" : "text-sm"} ${toneClass}`}>
        {currency(value)}
      </p>
    </div>
  );
}
