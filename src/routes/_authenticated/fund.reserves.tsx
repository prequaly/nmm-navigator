import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, SectionCard, PrimaryButton, GhostButton } from "@/components/app-shell/AppShell";
import { TrendingUp, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useCurrentPlan } from "@/hooks/use-current-plan";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fund/reserves")({
  head: () => ({ meta: [{ title: "Operating Reserves — NMM Navigator" }] }),
  component: ReservesPage,
});

function ReservesPage() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const { planId, loading: planLoading } = useCurrentPlan(orgId);
  const [loading, setLoading] = useState(true);
  const [assumptionsId, setAssumptionsId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [targetMonths, setTargetMonths] = useState(6);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [editingBalance, setEditingBalance] = useState("");
  const [editingTarget, setEditingTarget] = useState("");

  useEffect(() => {
    if (!orgId || !planId) return;
    (async () => {
      setLoading(true);
      const [{ data: fa, error: faErr }, { data: lines, error: lineErr }] = await Promise.all([
        supabase
          .from("financial_assumptions")
          .select("id,current_reserve_balance,reserve_target_months")
          .eq("plan_id", planId)
          .maybeSingle(),
        supabase.from("expense_lines").select("yearly_amounts").eq("plan_id", planId),
      ]);
      if (faErr) toast.error(faErr.message);
      if (lineErr) toast.error(lineErr.message);

      const annualExpense = (lines ?? []).reduce(
        (sum, l) => sum + Number((l.yearly_amounts as Record<string, number> | null)?.y1 ?? 0),
        0,
      );
      setMonthlyExpense(annualExpense / 12);

      if (fa) {
        setAssumptionsId(fa.id);
        setBalance(Number(fa.current_reserve_balance ?? 0));
        setTargetMonths(Number(fa.reserve_target_months ?? 6));
      } else {
        const { data: created, error: createErr } = await supabase
          .from("financial_assumptions")
          .insert({ plan_id: planId, organization_id: orgId, base_year: new Date().getFullYear() })
          .select("id,current_reserve_balance,reserve_target_months")
          .single();
        if (createErr) toast.error(createErr.message);
        if (created) {
          setAssumptionsId(created.id);
          setBalance(Number(created.current_reserve_balance ?? 0));
          setTargetMonths(Number(created.reserve_target_months ?? 6));
        }
      }
      setLoading(false);
    })();
  }, [orgId, planId]);

  async function saveBalance() {
    const value = Number(editingBalance);
    if (!assumptionsId || Number.isNaN(value)) return;
    setBalance(value);
    setEditingBalance("");
    const { error } = await supabase
      .from("financial_assumptions")
      .update({ current_reserve_balance: value })
      .eq("id", assumptionsId);
    if (error) toast.error(error.message);
  }

  async function saveTarget() {
    const value = Number(editingTarget);
    if (!assumptionsId || Number.isNaN(value) || value <= 0) return;
    setTargetMonths(value);
    setEditingTarget("");
    const { error } = await supabase
      .from("financial_assumptions")
      .update({ reserve_target_months: value })
      .eq("id", assumptionsId);
    if (error) toast.error(error.message);
  }

  const ready = !orgLoading && !planLoading && !loading;
  const months = monthlyExpense > 0 ? balance / monthlyExpense : 0;
  const policyMinMonths = targetMonths / 2;
  const targetReserve = targetMonths * monthlyExpense;
  const gap = Math.max(0, targetReserve - balance);

  const tone =
    monthlyExpense === 0
      ? {
          color: "#94a3b8",
          label: "No expense data yet",
          note: "Add expense lines in the budget to compute real runway.",
        }
      : months >= targetMonths
        ? { color: "#10b981", label: "Healthy", note: "You're at or above policy target." }
        : months >= policyMinMonths
          ? {
              color: "#f59e0b",
              label: "Building",
              note: "Above half of target, building toward it.",
            }
          : { color: "#dc2626", label: "Below half of target", note: "Treat as urgent." };

  return (
    <AppShell
      title="Operating Reserves"
      subtitle="How many months could you operate if revenue stopped tomorrow? Sector standard for most nonprofits is 3–6 months."
    >
      {!ready && <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>}

      {ready && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-brand-deep text-white rounded-2xl p-8 lg:col-span-2 relative overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">
                Months of runway
              </span>
              <div className="grid grid-cols-3 gap-6 mt-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Current
                  </p>
                  <p className="text-6xl font-serif mt-1" style={{ color: tone.color }}>
                    {months.toFixed(1)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">${(balance / 1000).toFixed(0)}k</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Half of target
                  </p>
                  <p className="text-6xl font-serif mt-1 text-slate-300">
                    {policyMinMonths.toFixed(1)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    ${((policyMinMonths * monthlyExpense) / 1000).toFixed(0)}k
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Target
                  </p>
                  <p className="text-6xl font-serif mt-1 text-brand-accent">
                    {targetMonths.toFixed(1)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    ${(targetReserve / 1000).toFixed(0)}k
                  </p>
                </div>
              </div>
              <p className="text-sm font-serif italic mt-6" style={{ color: tone.color }}>
                {tone.label}
              </p>
              <p className="text-slate-400 text-sm mt-1">{tone.note}</p>
            </div>

            <SectionCard title="Update your numbers">
              <div className="space-y-4">
                <label className="block text-xs">
                  <span className="block text-slate-500 mb-1">Current reserve balance ($)</span>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder={balance.toString()}
                      value={editingBalance}
                      onChange={(e) => setEditingBalance(e.target.value)}
                      className="flex-1 text-sm border border-slate-200 rounded-md px-3 py-2"
                    />
                    <PrimaryButton onClick={saveBalance} disabled={!editingBalance}>
                      Save
                    </PrimaryButton>
                  </div>
                </label>
                <label className="block text-xs">
                  <span className="block text-slate-500 mb-1">Target months of reserve</span>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder={targetMonths.toString()}
                      value={editingTarget}
                      onChange={(e) => setEditingTarget(e.target.value)}
                      className="flex-1 text-sm border border-slate-200 rounded-md px-3 py-2"
                    />
                    <GhostButton onClick={saveTarget} disabled={!editingTarget}>
                      Save
                    </GhostButton>
                  </div>
                </label>
                <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                  Monthly expense used above: $
                  {monthlyExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}, computed
                  from your Year 1 budget lines.
                </p>
              </div>
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Path to target">
              <ul className="space-y-3 text-sm">
                <Row
                  icon={TrendingUp}
                  label="Gap to target"
                  value={`$${(gap / 1000).toFixed(0)}k`}
                />
                <Row
                  icon={ShieldCheck}
                  label="Current balance"
                  value={`$${(balance / 1000).toFixed(0)}k`}
                />
                <Row
                  icon={AlertTriangle}
                  label="Monthly expense"
                  value={`$${(monthlyExpense / 1000).toFixed(1)}k`}
                  tone={months < policyMinMonths ? "warn" : undefined}
                />
              </ul>
            </SectionCard>

            <SectionCard
              title="Quick stress test"
              subtitle="If revenue dropped, how long would reserves plus remaining cash flow last?"
            >
              <ul className="space-y-3 text-sm">
                {[10, 20, 30].map((pct) => {
                  const reducedExpenseCoverage =
                    monthlyExpense > 0 ? balance / (monthlyExpense * (1 + pct / 100)) : 0;
                  return (
                    <li key={pct} className="flex items-baseline justify-between">
                      <span className="text-slate-700">{pct}% revenue decline</span>
                      <span className="text-xs text-slate-500 tabular-nums">
                        {months.toFixed(1)} →{" "}
                        <span
                          className={
                            reducedExpenseCoverage < policyMinMonths
                              ? "text-rose-600 font-medium"
                              : "text-amber-600"
                          }
                        >
                          {reducedExpenseCoverage.toFixed(1)} mo
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-slate-400 italic mt-3">
                Simplified estimate: assumes expenses stay flat and the reserve balance must absorb
                the full revenue shortfall.
              </p>
            </SectionCard>
          </div>

          <SectionCard
            title="Industry benchmarks"
            subtitle="Where peer nonprofits sit (sector-wide reference, not org-specific)"
            className="mt-6"
          >
            <ul className="space-y-3 text-sm">
              <Bench label="National sector median (all nonprofits)" value="3.0 months" />
              <Bench label="High-performing orgs (top quartile)" value="8.5 months" />
              <Bench label="GuideStar/Candid recommendation" value="3–6+ months" highlight />
            </ul>
          </SectionCard>
        </>
      )}
    </AppShell>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-700">
        <Icon className="size-4 text-slate-400" /> {label}
      </span>
      <span
        className={`tabular-nums font-medium ${tone === "warn" ? "text-amber-700" : "text-brand-deep"}`}
      >
        {value}
      </span>
    </li>
  );
}

function Bench({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <li
      className={`flex items-center justify-between p-2 rounded-md ${highlight ? "bg-brand-primary/5" : ""}`}
    >
      <span className="text-slate-700">{label}</span>
      <span
        className={`tabular-nums font-medium ${highlight ? "text-brand-primary" : "text-slate-600"}`}
      >
        {value}
      </span>
    </li>
  );
}
