import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell, SectionCard, KpiTile, PrimaryButton, GhostButton } from "@/components/app-shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useCurrentPlan } from "@/hooks/use-current-plan";
import { TaxPrefillBanner } from "@/components/finance/TaxPrefillBanner";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fund/budget")({
  head: () => ({ meta: [{ title: "Budget Planner — NMM Navigator" }] }),
  component: BudgetPage,
});

const ALL_YEARS = ["y1", "y2", "y3", "y4", "y5"] as const;
type YearKey = (typeof ALL_YEARS)[number];
type Horizon = 1 | 3 | 5;
type YearlyAmounts = Partial<Record<YearKey, number>>;

type RevenueRow = {
  id: string;
  organization_id: string;
  name: string;
  category: string | null;
  confidence: string | null;
  yearly_amounts: YearlyAmounts | null;
  sort_order: number | null;
};

type ExpenseRow = {
  id: string;
  organization_id: string;
  name: string;
  category: string | null;
  program_name: string | null;
  yearly_amounts: YearlyAmounts | null;
  sort_order: number | null;
};

const fmt = (n: number) =>
  n === 0
    ? "—"
    : Math.abs(n) >= 1000
      ? `$${(n / 1000).toFixed(0)}k`
      : `$${n.toFixed(0)}`;

const sumYears = (y: YearlyAmounts | null | undefined, years: readonly YearKey[]) =>
  years.reduce((acc, k) => acc + Number(y?.[k] ?? 0), 0);

const yearTotal = (rows: { yearly_amounts: YearlyAmounts | null }[], year: YearKey) =>
  rows.reduce((acc, r) => acc + Number(r.yearly_amounts?.[year] ?? 0), 0);

function BudgetPage() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const { planId } = useCurrentPlan(orgId);
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [baseYear, setBaseYear] = useState(new Date().getFullYear());
  const [horizon, setHorizon] = useState<Horizon>(5);
  const YEARS = useMemo(() => ALL_YEARS.slice(0, horizon) as readonly YearKey[], [horizon]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!orgId) return;
    setLoading(true);
    const [{ data: rev }, { data: exp }] = await Promise.all([
      supabase.from("revenue_streams").select("*").eq("organization_id", orgId).order("sort_order"),
      supabase.from("expense_lines").select("*").eq("organization_id", orgId).order("sort_order"),
    ]);
    setRevenue((rev as RevenueRow[]) ?? []);
    setExpenses((exp as ExpenseRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (orgId) load();
  }, [orgId]);

  const totals = useMemo(() => {
    const revByYear = YEARS.map((y) => yearTotal(revenue, y));
    const expByYear = YEARS.map((y) => yearTotal(expenses, y));
    const netByYear = revByYear.map((r, i) => r - expByYear[i]);
    return {
      revByYear,
      expByYear,
      netByYear,
      totalRev: revByYear.reduce((a, b) => a + b, 0),
      totalExp: expByYear.reduce((a, b) => a + b, 0),
    };
  }, [revenue, expenses]);

  function markDirty(id: string) {
    setDirty((d) => new Set(d).add(id));
  }

  function updateRevenue(id: string, patch: Partial<RevenueRow>) {
    setRevenue((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    markDirty(id);
  }
  function updateExpense(id: string, patch: Partial<ExpenseRow>) {
    setExpenses((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    markDirty(id);
  }
  function updateYearAmount(
    kind: "revenue" | "expense",
    id: string,
    year: YearKey,
    value: number,
  ) {
    if (kind === "revenue") {
      const row = revenue.find((r) => r.id === id);
      if (!row) return;
      updateRevenue(id, { yearly_amounts: { ...(row.yearly_amounts ?? {}), [year]: value } });
    } else {
      const row = expenses.find((r) => r.id === id);
      if (!row) return;
      updateExpense(id, { yearly_amounts: { ...(row.yearly_amounts ?? {}), [year]: value } });
    }
  }

  async function addRevenue() {
    if (!orgId) return;
    const { data, error } = await supabase
      .from("revenue_streams")
      .insert({
        organization_id: orgId,
        name: "New revenue line",
        category: "earned",
        yearly_amounts: {},
        sort_order: revenue.length,
      })
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    setRevenue((r) => [...r, data as RevenueRow]);
  }

  async function addExpense() {
    if (!orgId) return;
    const { data, error } = await supabase
      .from("expense_lines")
      .insert({
        organization_id: orgId,
        name: "New expense line",
        category: "program",
        yearly_amounts: {},
        sort_order: expenses.length,
      })
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    setExpenses((r) => [...r, data as ExpenseRow]);
  }

  async function removeRow(kind: "revenue" | "expense", id: string) {
    if (!confirm("Delete this line?")) return;
    const table = kind === "revenue" ? "revenue_streams" : "expense_lines";
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (kind === "revenue") setRevenue((r) => r.filter((x) => x.id !== id));
    else setExpenses((r) => r.filter((x) => x.id !== id));
    setDirty((d) => {
      const n = new Set(d);
      n.delete(id);
      return n;
    });
  }

  async function saveAll() {
    if (dirty.size === 0) return;
    setSaving(true);
    const revToSave = revenue.filter((r) => dirty.has(r.id));
    const expToSave = expenses.filter((r) => dirty.has(r.id));
    const ops: Promise<{ error: any }>[] = [];
    for (const r of revToSave) {
      ops.push(
        Promise.resolve(
          supabase
            .from("revenue_streams")
            .update({
              name: r.name,
              category: r.category ?? undefined,
              confidence: r.confidence ?? undefined,
              yearly_amounts: r.yearly_amounts ?? {},
            })
            .eq("id", r.id),
        ) as Promise<{ error: any }>,
      );
    }
    for (const e of expToSave) {
      ops.push(
        Promise.resolve(
          supabase
            .from("expense_lines")
            .update({
              name: e.name,
              category: e.category ?? undefined,
              program_name: e.program_name ?? undefined,
              yearly_amounts: e.yearly_amounts ?? {},
            })
            .eq("id", e.id),
        ) as Promise<{ error: any }>,
      );
    }
    const results = await Promise.all(ops);
    const firstError = results.find((r) => r.error);
    setSaving(false);
    if (firstError?.error) return toast.error(firstError.error.message);
    setDirty(new Set());
    toast.success(`Saved ${results.length} line${results.length === 1 ? "" : "s"}`);
  }

  return (
    <AppShell
      title="Budget Planner"
      subtitle="Plan revenue and expenses across multiple years. These numbers flow into your monthly cash flow forecast alongside grants."
      actions={
        <>
          <GhostButton onClick={() => window.location.assign("/fund/proforma")}>View cash flow forecast →</GhostButton>
          <PrimaryButton onClick={saveAll}>
            <Save className="size-3.5 inline -mt-0.5 mr-1" />
            {saving ? "Saving…" : dirty.size > 0 ? `Save (${dirty.size})` : "Save"}
          </PrimaryButton>
        </>
      }
    >
      <TaxPrefillBanner orgId={orgId} planId={planId} onApplied={load} />

      <div className="flex flex-wrap items-center gap-6 mb-4 text-sm">
        <div className="flex items-center gap-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Base year</label>
          <input
            type="number"
            value={baseYear}
            onChange={(e) => setBaseYear(Number(e.target.value))}
            className="w-24 border border-slate-200 rounded-md px-2 py-1 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Horizon</label>
          <div className="inline-flex rounded-md border border-slate-200 overflow-hidden">
            {([1, 3, 5] as Horizon[]).map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  horizon === h
                    ? "bg-brand-deep text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {h} yr
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <KpiTile label={`${horizon}-yr Revenue`} value={fmt(totals.totalRev)} hint={`Y1 ${fmt(totals.revByYear[0])}`} hintTone="neutral" />
        <KpiTile label={`${horizon}-yr Expenses`} value={fmt(totals.totalExp)} hint={`Y1 ${fmt(totals.expByYear[0])}`} hintTone="neutral" />
        <KpiTile
          label={`${horizon}-yr Net`}
          value={fmt(totals.totalRev - totals.totalExp)}
          hint={totals.totalRev - totals.totalExp >= 0 ? "Surplus" : "Deficit"}
          hintTone={totals.totalRev - totals.totalExp >= 0 ? "good" : "bad"}
        />

      </div>

      {orgLoading || loading ? (
        <SectionCard padding="p-10">
          <div className="text-center text-sm text-slate-500">Loading…</div>
        </SectionCard>
      ) : !orgId ? (
        <SectionCard padding="p-10">
          <div className="text-center text-sm text-slate-500">
            No organization found. <a href="/profile" className="text-brand-primary underline">Set up your organization →</a>
          </div>
        </SectionCard>
      ) : (
        <div className="space-y-6">
          <BudgetTable
            title="Revenue"
            kind="revenue"
            rows={revenue}
            baseYear={baseYear}
            years={YEARS}
            totals={totals.revByYear}
            onAdd={addRevenue}
            onRemove={(id) => removeRow("revenue", id)}
            onNameChange={(id, v) => updateRevenue(id, { name: v })}
            onCategoryChange={(id, v) => updateRevenue(id, { category: v })}
            onYearChange={(id, y, v) => updateYearAmount("revenue", id, y, v)}
          />
          <BudgetTable
            title="Expenses"
            kind="expense"
            rows={expenses}
            baseYear={baseYear}
            years={YEARS}
            totals={totals.expByYear}
            onAdd={addExpense}
            onRemove={(id) => removeRow("expense", id)}
            onNameChange={(id, v) => updateExpense(id, { name: v })}
            onCategoryChange={(id, v) => updateExpense(id, { category: v })}
            onYearChange={(id, y, v) => updateYearAmount("expense", id, y, v)}
          />
          <SectionCard title="Net by year" padding="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="text-left p-3">Year</th>
                  {YEARS.map((_, i) => (
                    <th key={i} className="text-right p-3">{baseYear + i}</th>
                  ))}
                  <th className="text-right p-3">{horizon}-yr</th>
                </tr>
              </thead>
              <tbody>
                <Row label="Revenue" values={totals.revByYear} tone="text-emerald-700" />
                <Row label="Expenses" values={totals.expByYear} tone="text-rose-700" />
                <Row
                  label="Net"
                  values={totals.netByYear}
                  tone="font-semibold text-slate-900"
                  total={totals.totalRev - totals.totalExp}
                />
              </tbody>
            </table>
          </SectionCard>
        </div>
      )}
    </AppShell>
  );
}

function Row({ label, values, tone, total }: { label: string; values: number[]; tone: string; total?: number }) {
  const sum = total ?? values.reduce((a, b) => a + b, 0);
  return (
    <tr className="border-t border-slate-100">
      <td className="p-3 text-slate-700">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`p-3 text-right tabular-nums ${tone}`}>{fmt(v)}</td>
      ))}
      <td className={`p-3 text-right tabular-nums ${tone}`}>{fmt(sum)}</td>
    </tr>
  );
}

function BudgetTable({
  title,
  kind,
  rows,
  baseYear,
  years,
  totals,
  onAdd,
  onRemove,
  onNameChange,
  onCategoryChange,
  onYearChange,
}: {
  title: string;
  kind: "revenue" | "expense";
  rows: (RevenueRow | ExpenseRow)[];
  baseYear: number;
  years: readonly YearKey[];
  totals: number[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onNameChange: (id: string, value: string) => void;
  onCategoryChange: (id: string, value: string) => void;
  onYearChange: (id: string, year: YearKey, value: number) => void;
}) {
  const YEARS = years;
  return (
    <SectionCard
      title={title}
      padding="p-0"
      right={
        <button onClick={onAdd} className="text-xs text-brand-primary hover:underline inline-flex items-center gap-1">
          <Plus className="size-3" /> Add line
        </button>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <tr>
              <th className="text-left p-3 w-1/3">Line</th>
              <th className="text-left p-3">Category</th>
              {YEARS.map((_, i) => (
                <th key={i} className="text-right p-3">{baseYear + i}</th>
              ))}
              <th className="text-right p-3">Total</th>
              <th className="p-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={YEARS.length + 4} className="p-8 text-center text-sm text-slate-400">
                  No {kind} lines yet — click "Add line" to begin.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="p-2">
                    <input
                      className="w-full bg-transparent border-0 px-1 py-1 text-slate-800 focus:bg-white focus:ring-1 focus:ring-brand-primary/30 rounded"
                      value={r.name}
                      onChange={(e) => onNameChange(r.id, e.target.value)}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className="w-full bg-transparent border-0 px-1 py-1 text-slate-600 text-xs focus:bg-white focus:ring-1 focus:ring-brand-primary/30 rounded"
                      value={r.category ?? ""}
                      onChange={(e) => onCategoryChange(r.id, e.target.value)}
                    />
                  </td>
                  {YEARS.map((y) => (
                    <td key={y} className="p-2">
                      <input
                        type="number"
                        className="w-full text-right bg-transparent border-0 px-1 py-1 tabular-nums focus:bg-white focus:ring-1 focus:ring-brand-primary/30 rounded"
                        value={Number(r.yearly_amounts?.[y] ?? 0) || ""}
                        placeholder="0"
                        onChange={(e) => onYearChange(r.id, y, Number(e.target.value) || 0)}
                      />
                    </td>
                  ))}
                  <td className="p-3 text-right tabular-nums font-medium text-slate-800">
                    {fmt(sumYears(r.yearly_amounts, YEARS))}
                  </td>
                  <td className="p-2 text-right">
                    <button
                      onClick={() => onRemove(r.id)}
                      className="text-slate-300 hover:text-rose-600"
                      title="Delete line"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-slate-50 border-t border-slate-200">
            <tr>
              <td colSpan={2} className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Total</td>
              {totals.map((t, i) => (
                <td key={i} className="p-3 text-right tabular-nums font-semibold text-slate-900">{fmt(t)}</td>
              ))}
              <td className="p-3 text-right tabular-nums font-semibold text-slate-900">
                {fmt(totals.reduce((a, b) => a + b, 0))}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </SectionCard>
  );
}
