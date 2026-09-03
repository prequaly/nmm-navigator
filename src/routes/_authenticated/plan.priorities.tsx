import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, SectionCard, PrimaryButton, GhostButton } from "@/components/app-shell/AppShell";
import { GripVertical, Trash2, Plus, Route as RouteIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useCurrentPlan } from "@/hooks/use-current-plan";
import { toast } from "sonner";
import { IMPACT_LENSES, FOURRS_LENSES } from "@/lib/plan/sections";
import { generateRoadmapForPillar } from "@/lib/plan/roadmap-gen";

type Pillar = {
  id: string;
  name: string;
  description: string | null;
  owner: string | null;
  color: string | null;
  sort_order: number;
  impact_lenses: string[];
  fourrs_dimensions: string[];
  priority_level: string | null;
  timeline_start: string | null;
  timeline_end: string | null;
};

const PALETTE = ["#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#0F172A"];

export const Route = createFileRoute("/_authenticated/plan/priorities")({
  head: () => ({ meta: [{ title: "Strategic Priorities — NMM Navigator" }] }),
  component: PrioritiesPage,
});

function PrioritiesPage() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const { planId, loading: planLoading } = useCurrentPlan(orgId);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("strategic_pillars")
      .select(
        "id,name,description,owner,color,sort_order,impact_lenses,fourrs_dimensions,priority_level,timeline_start,timeline_end",
      )
      .eq("organization_id", orgId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setPillars((data as Pillar[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function remove(id: string) {
    const { error } = await supabase.from("strategic_pillars").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setPillars((prev) => prev.filter((p) => p.id !== id));
  }

  const [generatingId, setGeneratingId] = useState<string | null>(null);
  async function generateRoadmap(pillar: Pillar) {
    if (!orgId || !planId) return;
    setGeneratingId(pillar.id);
    try {
      const { taskCount } = await generateRoadmapForPillar(orgId, planId, pillar);
      toast.success(`Roadmap item + ${taskCount} starter tasks added — see Execute → Gantt / Tasks`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate roadmap");
    } finally {
      setGeneratingId(null);
    }
  }

  const ready = !orgLoading && !planLoading && orgId && planId;

  return (
    <AppShell
      title="Strategic Priorities"
      subtitle="3–5 bold commitments that earn the right to be on every quarterly review."
      actions={
        <PrimaryButton onClick={() => setShowForm((s) => !s)} disabled={!ready}>
          <Plus className="size-3.5 inline-block -mt-0.5 mr-1" />
          {showForm ? "Close" : "Priority"}
        </PrimaryButton>
      }
    >
      {(orgLoading || planLoading || loading) && (
        <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>
      )}

      {ready && showForm && (
        <NewPillarForm
          orgId={orgId!}
          planId={planId!}
          nextSort={pillars.length}
          defaultColor={PALETTE[pillars.length % PALETTE.length]}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {ready && !loading && pillars.length === 0 && !showForm && (
        <SectionCard>
          <p className="text-sm text-slate-500 text-center py-8">
            No priorities yet. Click <b>+ Priority</b> to add your first one.
          </p>
        </SectionCard>
      )}

      {ready && !loading && pillars.length > 0 && (
        <SectionCard padding="p-2">
          <ul className="divide-y divide-slate-100">
            {pillars.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center gap-4 p-4 hover:bg-slate-50/60 rounded-lg group"
              >
                <GripVertical className="size-4 text-slate-300" />
                <div
                  className="size-10 rounded-full text-white flex items-center justify-center font-serif text-lg shrink-0"
                  style={{ background: p.color || "#0f172a" }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-900">{p.name}</p>
                    {p.priority_level && (
                      <span
                        className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                          p.priority_level === "high"
                            ? "bg-rose-100 text-rose-700"
                            : p.priority_level === "medium"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {p.priority_level}
                      </span>
                    )}
                    {(p.timeline_start || p.timeline_end) && (
                      <span className="text-[10px] text-slate-400">
                        {p.timeline_start ?? "?"} → {p.timeline_end ?? "?"}
                      </span>
                    )}
                  </div>
                  {(p.owner || p.description) && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {p.owner ? `${p.owner}` : ""}
                      {p.owner && p.description ? " · " : ""}
                      {p.description ?? ""}
                    </p>
                  )}
                  {(p.impact_lenses.length > 0 || p.fourrs_dimensions.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {p.impact_lenses.map((k) => (
                        <span
                          key={k}
                          className="text-[9px] font-medium bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded"
                        >
                          {IMPACT_LENSES.find((l) => l.key === k)?.label ?? k}
                        </span>
                      ))}
                      {p.fourrs_dimensions.map((k) => (
                        <span
                          key={k}
                          className="text-[9px] font-medium bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded"
                        >
                          {FOURRS_LENSES.find((l) => l.key === k)?.label ?? k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => generateRoadmap(p)}
                  disabled={generatingId === p.id}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-brand-primary disabled:opacity-50"
                  aria-label="Generate roadmap for this priority"
                  title="Generate a 90-day roadmap item + starter tasks"
                >
                  <RouteIcon className="size-4" />
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600"
                  aria-label="Delete priority"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </AppShell>
  );
}

function NewPillarForm({
  orgId,
  planId,
  nextSort,
  defaultColor,
  onCreated,
  onCancel,
}: {
  orgId: string;
  planId: string;
  nextSort: number;
  defaultColor: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [priorityLevel, setPriorityLevel] = useState("medium");
  const [timelineStart, setTimelineStart] = useState("");
  const [timelineEnd, setTimelineEnd] = useState("");
  const [impactLenses, setImpactLenses] = useState<string[]>([]);
  const [fourRsDims, setFourRsDims] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggle(list: string[], setList: (v: string[]) => void, key: string) {
    setList(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("strategic_pillars").insert({
      organization_id: orgId,
      plan_id: planId,
      name: name.trim(),
      description: description.trim() || null,
      owner: owner.trim() || null,
      color,
      sort_order: nextSort,
      priority_level: priorityLevel,
      timeline_start: timelineStart || null,
      timeline_end: timelineEnd || null,
      impact_lenses: impactLenses,
      fourrs_dimensions: fourRsDims,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Priority added");
    onCreated();
  }

  return (
    <SectionCard title="New priority">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <label className="md:col-span-2 text-xs">
          <span className="block text-slate-500 mb-1">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
            placeholder="e.g. Programmatic Excellence"
          />
        </label>
        <label className="md:col-span-2 text-xs">
          <span className="block text-slate-500 mb-1">Short description</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
            placeholder="One line of context"
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
          <span className="block text-slate-500 mb-1">Color</span>
          <div className="flex items-center gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`size-6 rounded-full border-2 ${color === c ? "border-slate-900" : "border-transparent"}`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Priority level</span>
          <select
            value={priorityLevel}
            onChange={(e) => setPriorityLevel(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Timeline start</span>
          <input
            type="date"
            value={timelineStart}
            onChange={(e) => setTimelineStart(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Timeline end</span>
          <input
            type="date"
            value={timelineEnd}
            onChange={(e) => setTimelineEnd(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <div className="md:col-span-3 text-xs">
          <span className="block text-slate-500 mb-1">IMPACT alignment</span>
          <div className="flex flex-wrap gap-1.5">
            {IMPACT_LENSES.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => toggle(impactLenses, setImpactLenses, l.key)}
                className={`px-2 py-1 rounded-full text-[11px] border transition-colors ${
                  impactLenses.includes(l.key)
                    ? "bg-brand-primary text-white border-brand-primary"
                    : "bg-white text-slate-600 border-slate-200 hover:border-brand-primary/40"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div className="md:col-span-3 text-xs">
          <span className="block text-slate-500 mb-1">4Rs alignment</span>
          <div className="flex flex-wrap gap-1.5">
            {FOURRS_LENSES.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => toggle(fourRsDims, setFourRsDims, l.key)}
                className={`px-2 py-1 rounded-full text-[11px] border transition-colors ${
                  fourRsDims.includes(l.key)
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-violet-400"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div className="md:col-span-6 flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onCancel}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save priority"}
          </PrimaryButton>
        </div>
      </form>
    </SectionCard>
  );
}
