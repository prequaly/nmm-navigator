import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
  EmptyState,
} from "@/components/app-shell/AppShell";
import { LineChart as LineChartIcon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useCurrentPlan } from "@/hooks/use-current-plan";
import { TaxPrefillBanner } from "@/components/finance/TaxPrefillBanner";
import { toast } from "sonner";
import { AiPressureTest } from "@/components/plan/AiPressureTest";

export const Route = createFileRoute("/_authenticated/fund/scenarios")({
  head: () => ({ meta: [{ title: "Scenario Modeling — NMM Navigator" }] }),
  component: ScenariosPage,
});

type ShockType =
  | "lose_largest_grant"
  | "revenue_decline_pct"
  | "revenue_growth_pct"
  | "expense_increase_pct";
type Scenario = {
  id: string;
  name: string;
  shock_type: ShockType;
  shock_value: number;
  notes: string | null;
};

const SHOCK_LABEL: Record<ShockType, string> = {
  lose_largest_grant: "Lose the largest grant",
  revenue_decline_pct: "Revenue declines by %",
  revenue_growth_pct: "Earned revenue grows by %",
  expense_increase_pct: "Expenses increase by %",
};

function ScenariosPage() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const { planId, loading: planLoading } = useCurrentPlan(orgId);
  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [baseRevenue, setBaseRevenue] = useState(0);
  const [baseExpense, setBaseExpense] = useState(0);
  const [largestGrant, setLargestGrant] = useState(0);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    if (!orgId || !planId) return;
    setLoading(true);
    const [
      { data: sc, error: scErr },
      { data: rev, error: revErr },
      { data: exp, error: expErr },
      { data: grants, error: grantErr },
    ] = await Promise.all([
      supabase
        .from("budget_scenarios")
        .select("id,name,shock_type,shock_value,notes")
        .eq("plan_id", planId)
        .order("created_at", { ascending: false }),
      supabase.from("revenue_streams").select("yearly_amounts").eq("plan_id", planId),
      supabase.from("expense_lines").select("yearly_amounts").eq("plan_id", planId),
      supabase
        .from("grants")
        .select("amount_awarded,amount_requested,status")
        .eq("organization_id", orgId)
        .in("status", ["awarded", "active"]),
    ]);
    for (const r of [scErr, revErr, expErr, grantErr]) if (r) toast.error(r.message);

    setScenarios((sc as Scenario[]) ?? []);
    setBaseRevenue(
      (rev ?? []).reduce(
        (s, r) => s + Number((r.yearly_amounts as Record<string, number> | null)?.y1 ?? 0),
        0,
      ),
    );
    setBaseExpense(
      (exp ?? []).reduce(
        (s, e) => s + Number((e.yearly_amounts as Record<string, number> | null)?.y1 ?? 0),
        0,
      ),
    );
    setLargestGrant(
      (grants ?? []).reduce(
        (max, g) => Math.max(max, Number(g.amount_awarded ?? g.amount_requested ?? 0)),
        0,
      ),
    );
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId || !planId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, planId]);

  async function remove(id: string) {
    const { error } = await supabase.from("budget_scenarios").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }

  function applyShock(s: Scenario) {
    let revenue = baseRevenue;
    let expense = baseExpense;
    switch (s.shock_type) {
      case "lose_largest_grant":
        revenue -= largestGrant;
        break;
      case "revenue_decline_pct":
        revenue *= 1 - s.shock_value / 100;
        break;
      case "revenue_growth_pct":
        revenue *= 1 + s.shock_value / 100;
        break;
      case "expense_increase_pct":
        expense *= 1 + s.shock_value / 100;
        break;
    }
    return { revenue, expense, net: revenue - expense };
  }

  const ready = !orgLoading && !planLoading && !loading;
  const baseNet = baseRevenue - baseExpense;

  return (
    <AppShell
      title="Scenario Modeling"
      subtitle="Stress-test your real budget against the futures you can imagine — loss of a major grant, a donation decline, an earned-revenue increase."
      actions={
        <PrimaryButton onClick={() => setShowForm((s) => !s)} disabled={!ready}>
          {showForm ? "Close" : "+ Scenario"}
        </PrimaryButton>
      }
    >
      {!ready && <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>}

      {ready && <TaxPrefillBanner orgId={orgId} planId={planId} onApplied={refresh} />}

      {ready && baseRevenue === 0 && baseExpense === 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          Your Year 1 budget has no revenue or expense lines yet — add some in Budget & Pro Forma
          first, then scenarios here will compute against real numbers.
        </p>
      )}

      {ready && showForm && (
        <NewScenarioForm
          orgId={orgId!}
          planId={planId!}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {ready && !showForm && (
        <SectionCard title="Year 1 baseline" className="mb-6">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Revenue
              </p>
              <p className="text-3xl font-serif text-brand-deep tabular-nums">
                ${(baseRevenue / 1000).toFixed(0)}k
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Expenses
              </p>
              <p className="text-3xl font-serif text-brand-deep tabular-nums">
                ${(baseExpense / 1000).toFixed(0)}k
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Net</p>
              <p
                className={`text-3xl font-serif tabular-nums ${baseNet < 0 ? "text-rose-600" : "text-emerald-600"}`}
              >
                {baseNet >= 0 ? "+" : ""}${(baseNet / 1000).toFixed(0)}k
              </p>
            </div>
          </div>
        </SectionCard>
      )}

      {ready && !showForm && <AiPressureTest orgId={orgId!} planId={planId!} />}

      {ready && !showForm && scenarios.length === 0 && (
        <EmptyState
          icon={LineChartIcon}
          title="No scenarios modeled yet"
          description="Add a scenario — losing your largest grant, a donation decline, an earned-revenue increase — and see the real effect on your actual budget."
          action={<PrimaryButton onClick={() => setShowForm(true)}>+ Scenario</PrimaryButton>}
        />
      )}

      {ready && !showForm && scenarios.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarios.map((s) => {
            const result = applyShock(s);
            const netDelta = result.net - baseNet;
            return (
              <SectionCard key={s.id} padding="p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-medium text-slate-800">{s.name}</h3>
                    <p className="text-xs text-slate-500">
                      {SHOCK_LABEL[s.shock_type]}
                      {s.shock_type !== "lose_largest_grant" ? ` (${s.shock_value}%)` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(s.id)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 mt-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Revenue
                    </p>
                    <p className="text-lg font-serif text-brand-deep tabular-nums">
                      ${(result.revenue / 1000).toFixed(0)}k
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Expenses
                    </p>
                    <p className="text-lg font-serif text-brand-deep tabular-nums">
                      ${(result.expense / 1000).toFixed(0)}k
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Net vs. baseline
                    </p>
                    <p
                      className={`text-lg font-serif tabular-nums ${netDelta < 0 ? "text-rose-600" : "text-emerald-600"}`}
                    >
                      {netDelta >= 0 ? "+" : ""}${(netDelta / 1000).toFixed(0)}k
                    </p>
                  </div>
                </div>
                {s.notes && <p className="text-xs text-slate-500 italic mt-3">{s.notes}</p>}
              </SectionCard>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function NewScenarioForm({
  orgId,
  planId,
  onCreated,
  onCancel,
}: {
  orgId: string;
  planId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [shockType, setShockType] = useState<ShockType>("revenue_decline_pct");
  const [shockValue, setShockValue] = useState("20");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("budget_scenarios").insert({
      organization_id: orgId,
      plan_id: planId,
      name: name.trim(),
      shock_type: shockType,
      shock_value: shockType === "lose_largest_grant" ? 0 : Number(shockValue) || 0,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Scenario added");
    onCreated();
  }

  return (
    <SectionCard title="New scenario" className="mb-6">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <label className="md:col-span-2 text-xs">
          <span className="block text-slate-500 mb-1">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Lose Hartwell grant"
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Shock type</span>
          <select
            value={shockType}
            onChange={(e) => setShockType(e.target.value as ShockType)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          >
            {Object.entries(SHOCK_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        {shockType !== "lose_largest_grant" && (
          <label className="text-xs">
            <span className="block text-slate-500 mb-1">Percent</span>
            <input
              type="number"
              min={0}
              max={200}
              value={shockValue}
              onChange={(e) => setShockValue(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
            />
          </label>
        )}
        <label className="md:col-span-2 text-xs">
          <span className="block text-slate-500 mb-1">Notes</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <div className="md:col-span-5 flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onCancel}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save scenario"}
          </PrimaryButton>
        </div>
      </form>
    </SectionCard>
  );
}
