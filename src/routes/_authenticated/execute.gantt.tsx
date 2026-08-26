import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
} from "@/components/app-shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useCurrentPlan } from "@/hooks/use-current-plan";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

type RoadmapItem = {
  id: string;
  title: string;
  owner: string | null;
  start_date: string;
  end_date: string;
  status: string;
  progress: number;
  pillar_id: string | null;
};

const COLORS = ["#2563eb", "#10b981", "#0f172a", "#f59e0b", "#8b5cf6", "#ec4899"];

export const Route = createFileRoute("/_authenticated/execute/gantt")({
  head: () => ({ meta: [{ title: "Gantt — NMM Navigator" }] }),
  component: GanttPage,
});

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // make Monday start
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function diffWeeks(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

function GanttPage() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const { planId, loading: planLoading } = useCurrentPlan(orgId);
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [weeks, setWeeks] = useState(13);

  async function refresh() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("roadmap_items")
      .select("id,title,owner,start_date,end_date,status,progress,pillar_id")
      .eq("organization_id", orgId)
      .order("start_date", { ascending: true });
    if (error) toast.error(error.message);
    setItems((data as RoadmapItem[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const today = useMemo(() => startOfWeek(new Date()), []);
  const weekHeaders = useMemo(
    () => Array.from({ length: weeks }, (_, i) => addDays(today, i * 7)),
    [today, weeks]
  );

  async function remove(id: string) {
    const { error } = await supabase.from("roadmap_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.filter((t) => t.id !== id));
  }

  const ready = !orgLoading && !planLoading && orgId && planId;

  return (
    <AppShell
      title="Gantt"
      subtitle="Roadmap items across your strategic plan, plotted on a rolling week-by-week timeline."
      actions={
        <>
          <GhostButton onClick={() => setWeeks((w) => Math.max(4, w - 4))}>−4w</GhostButton>
          <GhostButton onClick={() => setWeeks((w) => Math.min(52, w + 4))}>+4w</GhostButton>
          <PrimaryButton onClick={() => setShowForm((s) => !s)} disabled={!ready}>
            <Plus className="size-3.5 inline-block -mt-0.5 mr-1" />
            {showForm ? "Close" : "Item"}
          </PrimaryButton>
        </>
      }
    >
      {(orgLoading || planLoading || loading) && (
        <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>
      )}

      {ready && showForm && (
        <NewRoadmapForm
          orgId={orgId!}
          planId={planId!}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {ready && !loading && items.length === 0 && !showForm && (
        <SectionCard>
          <p className="text-sm text-slate-500 text-center py-8">
            No roadmap items yet. Click <b>+ Item</b> to plot your first one.
          </p>
        </SectionCard>
      )}

      {ready && !loading && items.length > 0 && (
        <SectionCard padding="p-6">
          <div className="overflow-x-auto">
            <div style={{ minWidth: 200 + weeks * 40 }}>
              {/* Header */}
              <div
                className="grid items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3"
                style={{ gridTemplateColumns: `200px repeat(${weeks}, minmax(0, 1fr))` }}
              >
                <div>Item</div>
                {weekHeaders.map((d, i) => (
                  <div key={i} className="text-center">
                    {d.getMonth() + 1}/{d.getDate()}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {items.map((t, idx) => {
                  const s = new Date(t.start_date);
                  const e = new Date(t.end_date);
                  const sWeek = diffWeeks(today, startOfWeek(s));
                  const eWeek = diffWeeks(today, startOfWeek(e));
                  const startCol = Math.max(0, sWeek);
                  const endCol = Math.min(weeks - 1, eWeek);
                  const visible = endCol >= 0 && startCol <= weeks - 1;
                  const color = COLORS[idx % COLORS.length];
                  return (
                    <div
                      key={t.id}
                      className="grid items-center text-xs group"
                      style={{ gridTemplateColumns: `200px repeat(${weeks}, minmax(0, 1fr))` }}
                    >
                      <div className="pr-3 flex items-center gap-2 min-w-0">
                        <span className="size-2 rounded-full shrink-0" style={{ background: color }} />
                        <span className="text-slate-700 truncate flex-1">{t.title}</span>
                        <button
                          onClick={() => remove(t.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600"
                          aria-label="Delete"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                      {Array.from({ length: weeks }, (_, w) => {
                        const inRange = visible && w >= startCol && w <= endCol;
                        const isStart = w === startCol;
                        const isEnd = w === endCol;
                        return (
                          <div key={w} className="h-6 px-0.5">
                            {inRange && (
                              <div
                                className="h-full relative"
                                style={{
                                  background: color,
                                  opacity: 0.85,
                                  borderTopLeftRadius: isStart ? 4 : 0,
                                  borderBottomLeftRadius: isStart ? 4 : 0,
                                  borderTopRightRadius: isEnd ? 4 : 0,
                                  borderBottomRightRadius: isEnd ? 4 : 0,
                                }}
                                title={`${t.title} · ${t.progress}%`}
                              >
                                <div
                                  className="absolute inset-y-0 left-0 bg-black/20"
                                  style={{ width: `${t.progress}%` }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </SectionCard>
      )}
    </AppShell>
  );
}

function NewRoadmapForm({
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
  const today = new Date().toISOString().slice(0, 10);
  const inAMonth = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(inAMonth);
  const [progress, setProgress] = useState("0");
  const [status, setStatus] = useState("planned");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("roadmap_items").insert({
      organization_id: orgId,
      plan_id: planId,
      title: title.trim(),
      owner: owner.trim() || null,
      start_date: startDate,
      end_date: endDate,
      progress: Number(progress) || 0,
      status,
      dependencies: [],
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Roadmap item added");
    onCreated();
  }

  return (
    <SectionCard title="New roadmap item">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <label className="md:col-span-2 text-xs">
          <span className="block text-slate-500 mb-1">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
            placeholder="Milestone or workstream"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Owner</span>
          <input
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
            placeholder="Name"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Start</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">End</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Progress %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs md:col-span-2">
          <span className="block text-slate-500 mb-1">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          >
            <option value="planned">Planned</option>
            <option value="in_progress">In progress</option>
            <option value="at_risk">At risk</option>
            <option value="done">Done</option>
          </select>
        </label>
        <div className="md:col-span-6 flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onCancel}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save item"}
          </PrimaryButton>
        </div>
      </form>
    </SectionCard>
  );
}
