import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
} from "@/components/app-shell/AppShell";
import { CheckCircle2, AlertCircle, MinusCircle, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useCurrentPlan } from "@/hooks/use-current-plan";
import { toast } from "sonner";

type Status = "on_track" | "at_risk" | "off_track";

type KR = {
  kr: string;
  metric: string;
  target: number;
  actual: number;
  status: Status;
};

type Okr = {
  id: string;
  objective: string;
  owner: string | null;
  quarter: string | null;
  status: string;
  progress: number;
  key_results: KR[] | null;
};

const STATUS_TONE: Record<Status, { tone: string; icon: any; label: string }> = {
  on_track: { tone: "text-emerald-600", icon: CheckCircle2, label: "On track" },
  at_risk: { tone: "text-amber-600", icon: AlertCircle, label: "At risk" },
  off_track: { tone: "text-rose-600", icon: MinusCircle, label: "Off track" },
};

function krStatus(actual: number, target: number): Status {
  if (target === 0) return "at_risk";
  const p = actual / target;
  if (p >= 0.9) return "on_track";
  if (p >= 0.6) return "at_risk";
  return "off_track";
}
function pct(actual: number, target: number) {
  if (!target) return 0;
  return Math.min(100, Math.round((actual / target) * 100));
}

export const Route = createFileRoute("/_authenticated/execute/okrs")({
  head: () => ({ meta: [{ title: "OKRs — NMM Navigator" }] }),
  component: OkrsPage,
});

function OkrsPage() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const { planId, loading: planLoading } = useCurrentPlan(orgId);
  const [okrs, setOkrs] = useState<Okr[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("okrs")
      .select("id,objective,owner,quarter,status,progress,key_results")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setOkrs((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const allKrs = useMemo(
    () => okrs.flatMap((o) => (o.key_results ?? []).map((k) => ({ ...k, status: krStatus(k.actual, k.target) }))),
    [okrs]
  );
  const counts = {
    on_track: allKrs.filter((k) => k.status === "on_track").length,
    at_risk: allKrs.filter((k) => k.status === "at_risk").length,
    off_track: allKrs.filter((k) => k.status === "off_track").length,
  };

  async function remove(id: string) {
    const { error } = await supabase.from("okrs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setOkrs((prev) => prev.filter((o) => o.id !== id));
  }

  const ready = !orgLoading && !planLoading && orgId && planId;

  return (
    <AppShell
      title="OKRs"
      subtitle="Translate the strategic plan into a 90-day rhythm with clear accountability."
      actions={
        <PrimaryButton onClick={() => setShowForm((s) => !s)} disabled={!ready}>
          <Plus className="size-3.5 inline-block -mt-0.5 mr-1" />
          {showForm ? "Close" : "Objective"}
        </PrimaryButton>
      }
    >
      {(orgLoading || planLoading || loading) && (
        <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>
      )}

      {ready && showForm && (
        <NewOkrForm
          orgId={orgId!}
          planId={planId!}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {ready && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-brand-deep text-white rounded-2xl p-5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">
              Active
            </span>
            <p className="text-4xl font-serif mt-2">
              {okrs.length}{" "}
              <span className="text-lg text-slate-400">objectives</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">{allKrs.length} Key Results tracked</p>
          </div>
          <Stat label="On track" value={counts.on_track} tone="emerald" />
          <Stat label="At risk" value={counts.at_risk} tone="amber" />
          <Stat label="Off track" value={counts.off_track} tone="rose" />
        </div>
      )}

      {ready && !loading && okrs.length === 0 && !showForm && (
        <SectionCard>
          <p className="text-sm text-slate-500 text-center py-8">
            No objectives yet. Click <b>+ Objective</b> to set your first OKR.
          </p>
        </SectionCard>
      )}

      <div className="space-y-6">
        {okrs.map((o) => {
          const krs = (o.key_results ?? []).map((k) => ({ ...k, status: krStatus(k.actual, k.target) }));
          const onTrack = krs.filter((k) => k.status === "on_track").length;
          const overall: Status = krs.some((k) => k.status === "off_track")
            ? "off_track"
            : krs.some((k) => k.status === "at_risk")
            ? "at_risk"
            : "on_track";
          const t = STATUS_TONE[overall];
          const Icon = t.icon;
          return (
            <SectionCard key={o.id}>
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {o.quarter && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded">
                        {o.quarter}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-serif italic mt-2">{o.objective}</h3>
                  {o.owner && (
                    <p className="text-xs text-slate-500 mt-1">Owner: {o.owner}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {krs.length > 0 && (
                    <div className={`flex items-center gap-1.5 text-sm font-medium ${t.tone}`}>
                      <Icon className="size-4" />
                      {t.label} · {onTrack}/{krs.length} KRs healthy
                    </div>
                  )}
                  <button
                    onClick={() => remove(o.id)}
                    className="text-slate-400 hover:text-rose-600"
                    aria-label="Delete objective"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              {krs.length > 0 && (
                <ul className="space-y-3 border-t border-slate-100 pt-4">
                  {krs.map((k, i) => {
                    const p = pct(k.actual, k.target);
                    const st = STATUS_TONE[k.status];
                    const StIcon = st.icon;
                    return (
                      <li key={i}>
                        <div className="flex items-baseline justify-between gap-4 mb-1.5">
                          <span className="text-sm text-slate-700 flex-1 min-w-0">{k.kr}</span>
                          <span className="text-xs text-slate-500 tabular-nums shrink-0">
                            {k.actual} / {k.target} {k.metric}
                          </span>
                          <span className={`text-xs flex items-center gap-1 shrink-0 w-24 justify-end ${st.tone}`}>
                            <StIcon className="size-3" /> {p}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              width: `${p}%`,
                              background:
                                k.status === "on_track"
                                  ? "#10b981"
                                  : k.status === "at_risk"
                                  ? "#f59e0b"
                                  : "#f43f5e",
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          );
        })}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "rose" }) {
  const color = { emerald: "text-emerald-600", amber: "text-amber-600", rose: "text-rose-600" }[tone];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`text-4xl font-serif mt-1 tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

type KRDraft = { kr: string; metric: string; target: string; actual: string };

function NewOkrForm({
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
  const [objective, setObjective] = useState("");
  const [owner, setOwner] = useState("");
  const [quarter, setQuarter] = useState(() => {
    const d = new Date();
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `Q${q} FY${d.getFullYear()}`;
  });
  const [krs, setKrs] = useState<KRDraft[]>([
    { kr: "", metric: "", target: "", actual: "0" },
  ]);
  const [saving, setSaving] = useState(false);

  function updateKr(i: number, patch: Partial<KRDraft>) {
    setKrs((prev) => prev.map((k, idx) => (idx === i ? { ...k, ...patch } : k)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!objective.trim()) return;
    const cleanKrs: KR[] = krs
      .filter((k) => k.kr.trim())
      .map((k) => ({
        kr: k.kr.trim(),
        metric: k.metric.trim() || "units",
        target: Number(k.target) || 0,
        actual: Number(k.actual) || 0,
        status: krStatus(Number(k.actual) || 0, Number(k.target) || 0),
      }));

    setSaving(true);
    const { error } = await supabase.from("okrs").insert({
      organization_id: orgId,
      plan_id: planId,
      objective: objective.trim(),
      owner: owner.trim() || null,
      quarter: quarter.trim() || null,
      key_results: cleanKrs as any,
      status: "active",
      progress: 0,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Objective added");
    onCreated();
  }

  return (
    <SectionCard title="New objective">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="md:col-span-3 text-xs">
            <span className="block text-slate-500 mb-1">Objective</span>
            <input
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              required
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
              placeholder="What ambitious outcome are you aiming for this quarter?"
            />
          </label>
          <label className="text-xs">
            <span className="block text-slate-500 mb-1">Owner</span>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
              placeholder="Name or role"
            />
          </label>
          <label className="text-xs">
            <span className="block text-slate-500 mb-1">Quarter</span>
            <input
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
              placeholder="Q4 FY2026"
            />
          </label>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2">Key Results</p>
          <div className="space-y-2">
            {krs.map((k, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input
                  value={k.kr}
                  onChange={(e) => updateKr(i, { kr: e.target.value })}
                  placeholder="Measurable result"
                  className="col-span-5 text-sm border border-slate-200 rounded-md px-3 py-2"
                />
                <input
                  value={k.metric}
                  onChange={(e) => updateKr(i, { metric: e.target.value })}
                  placeholder="metric (e.g. %, $, count)"
                  className="col-span-3 text-sm border border-slate-200 rounded-md px-3 py-2"
                />
                <input
                  value={k.actual}
                  onChange={(e) => updateKr(i, { actual: e.target.value })}
                  type="number"
                  step="any"
                  placeholder="actual"
                  className="col-span-2 text-sm border border-slate-200 rounded-md px-3 py-2"
                />
                <input
                  value={k.target}
                  onChange={(e) => updateKr(i, { target: e.target.value })}
                  type="number"
                  step="any"
                  placeholder="target"
                  className="col-span-2 text-sm border border-slate-200 rounded-md px-3 py-2"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setKrs((p) => [...p, { kr: "", metric: "", target: "", actual: "0" }])}
            className="mt-2 text-xs text-brand-primary hover:underline"
          >
            + Add another key result
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onCancel}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save objective"}
          </PrimaryButton>
        </div>
      </form>
    </SectionCard>
  );
}
