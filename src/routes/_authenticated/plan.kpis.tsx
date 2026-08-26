import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
  EmptyState,
} from "@/components/app-shell/AppShell";
import { TrendingUp, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useCurrentPlan } from "@/hooks/use-current-plan";
import { toast } from "sonner";
import { Comments } from "@/components/comments/Comments";

type Kpi = {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  baseline: number | null;
  current_value: number | null;
  target: number | null;
  target_year: number | null;
  notes: string | null;
  pillar_id: string | null;
};

type Pillar = { id: string; name: string; color: string | null };

export const Route = createFileRoute("/_authenticated/plan/kpis")({
  head: () => ({ meta: [{ title: "KPI Library — NMM Navigator" }] }),
  component: KpisPage,
});

function KpisPage() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const { planId, loading: planLoading } = useCurrentPlan(orgId);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    if (!orgId) return;
    setLoading(true);
    const [kRes, pRes] = await Promise.all([
      supabase
        .from("kpis")
        .select("id,name,category,unit,baseline,current_value,target,target_year,notes,pillar_id")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false }),
      supabase
        .from("strategic_pillars")
        .select("id,name,color")
        .eq("organization_id", orgId)
        .order("sort_order", { ascending: true }),
    ]);
    if (kRes.error) toast.error(kRes.error.message);
    setKpis((kRes.data as Kpi[]) ?? []);
    setPillars((pRes.data as Pillar[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function remove(id: string) {
    const { error } = await supabase.from("kpis").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setKpis((prev) => prev.filter((k) => k.id !== id));
  }

  const ready = !orgLoading && !planLoading && orgId && planId;

  function pct(k: Kpi) {
    if (k.target == null || k.target === 0 || k.current_value == null) return null;
    return Math.min(100, Math.round((Number(k.current_value) / Number(k.target)) * 100));
  }

  return (
    <AppShell
      title="KPI Library"
      subtitle="A small set of measures every committee can name from memory."
      actions={
        <PrimaryButton onClick={() => setShowForm((s) => !s)} disabled={!ready}>
          <Plus className="size-3.5 inline-block -mt-0.5 mr-1" />
          {showForm ? "Close" : "KPI"}
        </PrimaryButton>
      }
    >
      {(orgLoading || planLoading || loading) && (
        <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>
      )}

      {ready && showForm && (
        <NewKpiForm
          orgId={orgId!}
          planId={planId!}
          pillars={pillars}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {ready && !loading && kpis.length === 0 && !showForm && (
        <EmptyState
          icon={TrendingUp}
          title="No KPIs yet"
          description="KPIs turn your strategic pillars into measurable progress. Add a target, a baseline, and update it quarterly to see momentum on the dashboard."
          action={
            <PrimaryButton onClick={() => setShowForm(true)}>
              <Plus className="size-3.5 inline -mt-0.5 mr-1" /> Add your first KPI
            </PrimaryButton>
          }
        />
      )}

      {ready && !loading && kpis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((k) => {
            const pillar = pillars.find((p) => p.id === k.pillar_id);
            const p = pct(k);
            return (
              <SectionCard key={k.id} padding="p-6">
                <div className="flex items-center justify-between mb-3 group">
                  <TrendingUp className="size-4 text-brand-primary" />
                  <div className="flex items-center gap-2">
                    {pillar && (
                      <span
                        className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded text-white"
                        style={{ background: pillar.color || "#0f172a" }}
                      >
                        {pillar.name}
                      </span>
                    )}
                    {k.category && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {k.category}
                      </span>
                    )}
                    <button
                      onClick={() => remove(k.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600"
                      aria-label="Delete KPI"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-serif italic">{k.name}</h3>
                {k.notes && <p className="text-sm text-slate-500 mt-2">{k.notes}</p>}
                <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-100">
                  <Cell label="Baseline" value={k.baseline} unit={k.unit} />
                  <Cell label="Current" value={k.current_value} unit={k.unit} highlight />
                  <Cell label="Target" value={k.target} unit={k.unit} accent />
                </div>
                {p != null && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-primary" style={{ width: `${p}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 tabular-nums">
                      {p}% of target{k.target_year ? ` · by ${k.target_year}` : ""}
                    </p>
                  </div>
                )}
                <Comments entityType="kpi" entityId={k.id} />
              </SectionCard>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function Cell({
  label,
  value,
  unit,
  highlight,
  accent,
}: {
  label: string;
  value: number | null;
  unit: string | null;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">{label}</p>
      <p
        className={`text-lg font-serif mt-1 tabular-nums ${
          accent ? "text-brand-primary" : highlight ? "text-slate-900" : "text-slate-600"
        }`}
      >
        {value == null ? "—" : Number(value).toLocaleString()}
        {value != null && unit ? <span className="text-xs text-slate-400 ml-1">{unit}</span> : null}
      </p>
    </div>
  );
}

function NewKpiForm({
  orgId,
  planId,
  pillars,
  onCreated,
  onCancel,
}: {
  orgId: string;
  planId: string;
  pillars: Pillar[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [baseline, setBaseline] = useState("");
  const [current, setCurrent] = useState("");
  const [target, setTarget] = useState("");
  const [targetYear, setTargetYear] = useState(String(new Date().getFullYear() + 1));
  const [notes, setNotes] = useState("");
  const [pillarId, setPillarId] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("kpis").insert({
      organization_id: orgId,
      plan_id: planId,
      pillar_id: pillarId || null,
      name: name.trim(),
      category: category.trim() || null,
      unit: unit.trim() || null,
      baseline: baseline === "" ? null : Number(baseline),
      current_value: current === "" ? null : Number(current),
      target: target === "" ? null : Number(target),
      target_year: targetYear === "" ? null : Number(targetYear),
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("KPI added");
    onCreated();
  }

  return (
    <SectionCard title="New KPI">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <label className="md:col-span-3 text-xs">
          <span className="block text-slate-500 mb-1">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
            placeholder="e.g. Youth advance-to-next-level rate"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Category</span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
            placeholder="Impact / Finance / People"
          />
        </label>
        <label className="text-xs md:col-span-2">
          <span className="block text-slate-500 mb-1">Priority pillar</span>
          <select
            value={pillarId}
            onChange={(e) => setPillarId(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          >
            <option value="">— None —</option>
            {pillars.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Unit</span>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
            placeholder="%, $, count"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Baseline</span>
          <input
            type="number"
            step="any"
            value={baseline}
            onChange={(e) => setBaseline(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Current</span>
          <input
            type="number"
            step="any"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Target</span>
          <input
            type="number"
            step="any"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Target year</span>
          <input
            type="number"
            value={targetYear}
            onChange={(e) => setTargetYear(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="md:col-span-6 text-xs">
          <span className="block text-slate-500 mb-1">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
            placeholder="Definition, data source, calculation"
          />
        </label>
        <div className="md:col-span-6 flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onCancel}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save KPI"}
          </PrimaryButton>
        </div>
      </form>
    </SectionCard>
  );
}
