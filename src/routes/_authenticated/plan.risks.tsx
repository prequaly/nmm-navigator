import { useEffect, useMemo, useState, Fragment } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
  EmptyState,
} from "@/components/app-shell/AppShell";
import { AlertTriangle, ShieldAlert, Trash2, Plus, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useCurrentPlan } from "@/hooks/use-current-plan";
import { toast } from "sonner";
import { Comments } from "@/components/comments/Comments";

type Risk = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  likelihood: number;
  impact: number;
  mitigation: string | null;
  owner: string | null;
  status: string;
};

const CATEGORIES = ["Financial", "Programmatic", "Reputational", "Operational", "Legal", "Strategic"] as const;

const CATEGORY_TONE: Record<string, string> = {
  Financial: "bg-emerald-100 text-emerald-700",
  Programmatic: "bg-violet-100 text-violet-700",
  Reputational: "bg-rose-100 text-rose-700",
  Operational: "bg-amber-100 text-amber-700",
  Legal: "bg-slate-100 text-slate-700",
  Strategic: "bg-brand-primary/15 text-brand-primary",
};

function severity(r: Risk) { return r.likelihood * r.impact; }
function sevColor(s: number) {
  if (s >= 16) return "#dc2626";
  if (s >= 10) return "#f97316";
  if (s >= 5) return "#f59e0b";
  return "#10b981";
}
function sevLabel(s: number) {
  if (s >= 16) return "Critical";
  if (s >= 10) return "High";
  if (s >= 5) return "Medium";
  return "Low";
}

export const Route = createFileRoute("/_authenticated/plan/risks")({
  head: () => ({ meta: [{ title: "Risk Register — NMM Navigator" }] }),
  component: RiskRegister,
});

function RiskRegister() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const { planId, loading: planLoading } = useCurrentPlan(orgId);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function refresh() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("risks")
      .select("id,title,description,category,likelihood,impact,mitigation,owner,status")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRisks((data as Risk[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function remove(id: string) {
    const { error } = await supabase.from("risks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRisks((prev) => prev.filter((r) => r.id !== id));
  }

  const ready = !orgLoading && !planLoading && orgId && planId;

  const { critical, high, openCount, cellMap } = useMemo(() => {
    const cell: Record<string, Risk[]> = {};
    let crit = 0, hi = 0, open = 0;
    for (const r of risks) {
      const s = severity(r);
      if (s >= 16) crit++;
      else if (s >= 10) hi++;
      if (r.status === "open") open++;
      (cell[`${r.likelihood}-${r.impact}`] ||= []).push(r);
    }
    return { critical: crit, high: hi, openCount: open, cellMap: cell };
  }, [risks]);

  return (
    <AppShell
      title="Risk Register"
      subtitle="Likelihood × impact with named owners and mitigations. Review at every board meeting."
      actions={
        <PrimaryButton onClick={() => setShowForm((s) => !s)} disabled={!ready}>
          <Plus className="size-3.5 inline-block -mt-0.5 mr-1" />
          {showForm ? "Close" : "Risk"}
        </PrimaryButton>
      }
    >
      {(orgLoading || planLoading || loading) && (
        <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>
      )}

      {ready && showForm && (
        <NewRiskForm
          orgId={orgId!}
          planId={planId!}
          onCreated={() => { setShowForm(false); refresh(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {ready && !loading && risks.length === 0 && !showForm && (
        <EmptyState
          icon={ShieldAlert}
          title="No risks tracked yet"
          description="Identifying risks early — funding, leadership, compliance, program — lets your board act before they become crises. Start with the three keeping you up at night."
          action={
            <PrimaryButton onClick={() => setShowForm(true)}>
              <Plus className="size-3.5 inline -mt-0.5 mr-1" /> Log first risk
            </PrimaryButton>
          }
        />
      )}

      {ready && !loading && risks.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-rose-600 text-white rounded-2xl p-5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-rose-100">Critical</span>
              <p className="text-4xl font-serif mt-2">{critical}</p>
              <p className="text-xs text-rose-100 mt-1">Score ≥ 16</p>
            </div>
            <Stat label="High" value={high} tone="orange" />
            <Stat label="Open risks" value={openCount} tone="amber" />
            <Stat label="Total tracked" value={risks.length} />
          </div>

          {critical > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 mb-6 flex items-start gap-3">
              <ShieldAlert className="size-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-rose-900">Critical risks require board-level mitigation review</p>
                <p className="text-rose-800 mt-1 text-xs">
                  {risks.filter((r) => severity(r) >= 16).map((r) => r.title).join(" · ")}
                </p>
              </div>
            </div>
          )}

          <SectionCard title="Likelihood × Impact matrix" subtitle="Bubble size = number of risks in that cell">
            <div className="ml-8 relative">
              <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Likelihood →
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[5, 4, 3, 2, 1].flatMap((likelihood) =>
                  [1, 2, 3, 4, 5].map((impact) => {
                    const list = cellMap[`${likelihood}-${impact}`] ?? [];
                    const sev = likelihood * impact;
                    return (
                      <div
                        key={`${likelihood}-${impact}`}
                        className="min-h-[80px] rounded-md border border-slate-200 p-2 flex flex-col items-center justify-center"
                        style={{ background: `${sevColor(sev)}15` }}
                      >
                        {list.length > 0 && (
                          <span
                            className="rounded-full text-white text-xs font-bold flex items-center justify-center tabular-nums"
                            style={{
                              background: sevColor(sev),
                              width: `${20 + list.length * 8}px`,
                              height: `${20 + list.length * 8}px`,
                            }}
                          >
                            {list.length}
                          </span>
                        )}
                      </div>
                    );
                  }),
                )}
              </div>
              <div className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">
                Impact →
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Register" padding="p-0" className="mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="text-left p-3">Category</th>
                    <th className="text-left p-3">Risk</th>
                    <th className="text-center p-3">L</th>
                    <th className="text-center p-3">I</th>
                    <th className="text-left p-3">Severity</th>
                    <th className="text-left p-3">Mitigation</th>
                    <th className="text-left p-3">Owner</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {risks
                    .slice()
                    .sort((a, b) => severity(b) - severity(a))
                    .map((r) => {
                      const sev = severity(r);
                      return (
                        <Fragment key={r.id}>
                        <tr className="border-t border-slate-100 hover:bg-slate-50/60 align-top group">
                          <td className="p-3">
                            {r.category && (
                              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${CATEGORY_TONE[r.category] ?? "bg-slate-100 text-slate-700"}`}>
                                {r.category}
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-medium text-slate-800 max-w-md">{r.title}</td>
                          <td className="p-3 text-center text-slate-500 tabular-nums">{r.likelihood}</td>
                          <td className="p-3 text-center text-slate-500 tabular-nums">{r.impact}</td>
                          <td className="p-3">
                            <span
                              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full text-white"
                              style={{ background: sevColor(sev) }}
                            >
                              {sevLabel(sev)} ({sev})
                            </span>
                          </td>
                          <td className="p-3 text-xs text-slate-600 max-w-xs">
                            {r.mitigation && (
                              <>
                                <AlertTriangle className="size-3 inline -mt-0.5 mr-1 text-slate-400" />
                                {r.mitigation}
                              </>
                            )}
                          </td>
                          <td className="p-3 text-xs text-slate-600 whitespace-nowrap">{r.owner ?? "—"}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => setExpandedId((id) => (id === r.id ? null : r.id))}
                                className={`p-1 rounded hover:bg-slate-100 ${expandedId === r.id ? "text-brand-deep" : "text-slate-400 hover:text-slate-700"}`}
                                aria-label="Toggle discussion"
                              >
                                <MessageCircle className="size-3.5" />
                              </button>
                              <button
                                onClick={() => remove(r.id)}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1"
                                aria-label="Delete risk"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedId === r.id && (
                          <tr className="bg-slate-50/40 border-t border-slate-100">
                            <td colSpan={8} className="px-6 pb-4 pt-1">
                              <Comments entityType="risk" entityId={r.id} defaultOpen />
                            </td>
                          </tr>
                        )}
                        </Fragment>
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

function Stat({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "amber" | "orange" }) {
  const color = tone === "amber" ? "text-amber-700" : tone === "orange" ? "text-orange-600" : "text-brand-deep";
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`text-4xl font-serif mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function NewRiskForm({
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
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("Financial");
  const [likelihood, setLikelihood] = useState(3);
  const [impact, setImpact] = useState(3);
  const [mitigation, setMitigation] = useState("");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState("open");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("risks").insert({
      organization_id: orgId,
      plan_id: planId,
      title: title.trim(),
      category,
      likelihood,
      impact,
      mitigation: mitigation.trim() || null,
      owner: owner.trim() || null,
      status,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Risk added");
    onCreated();
  }

  return (
    <SectionCard title="New risk">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <label className="md:col-span-3 text-xs">
          <span className="block text-slate-500 mb-1">Risk</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
            placeholder="What could go wrong?"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Likelihood (1–5)</span>
          <input
            type="number" min={1} max={5}
            value={likelihood}
            onChange={(e) => setLikelihood(Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Impact (1–5)</span>
          <input
            type="number" min={1} max={5}
            value={impact}
            onChange={(e) => setImpact(Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="md:col-span-4 text-xs">
          <span className="block text-slate-500 mb-1">Mitigation</span>
          <input
            value={mitigation}
            onChange={(e) => setMitigation(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
            placeholder="What is being done about it?"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Owner</span>
          <input
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          >
            <option value="open">Open</option>
            <option value="monitoring">Monitoring</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <div className="md:col-span-6 flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onCancel}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save risk"}
          </PrimaryButton>
        </div>
      </form>
    </SectionCard>
  );
}
