import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
  EmptyState,
} from "@/components/app-shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { toast } from "sonner";
import { Trash2, Plus, CheckSquare } from "lucide-react";

type Status =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "at_risk"
  | "done"
  | "cancelled";
type Priority = "low" | "medium" | "high" | "critical";

type Task = {
  id: string;
  title: string;
  owner_label: string | null;
  status: Status;
  priority: Priority;
  due_date: string | null;
  percent_complete: number;
};

const STATUS_LABEL: Record<Status, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  blocked: "Blocked",
  at_risk: "At risk",
  done: "Done",
  cancelled: "Cancelled",
};
const STATUS_TONE: Record<Status, string> = {
  not_started: "bg-slate-100 text-slate-600 border-slate-200",
  in_progress: "bg-brand-primary/10 text-brand-primary border-brand-primary/30",
  blocked: "bg-rose-50 text-rose-700 border-rose-200",
  at_risk: "bg-amber-50 text-amber-700 border-amber-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-50 text-slate-400 border-slate-200 line-through",
};
const PRIORITY_TONE: Record<Priority, string> = {
  low: "text-slate-500",
  medium: "text-slate-700",
  high: "text-amber-600",
  critical: "text-rose-600 font-semibold",
};

const STATUS_COLUMNS: Status[] = ["not_started", "in_progress", "at_risk", "blocked", "done"];

export const Route = createFileRoute("/_authenticated/execute/tasks")({
  head: () => ({ meta: [{ title: "Tasks — NMM Navigator" }] }),
  component: TasksPage,
});

function TasksPage() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("action_items")
      .select("id,title,owner_label,status,priority,due_date,percent_complete")
      .eq("organization_id", orgId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setTasks((data as Task[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const byStatus = useMemo(() => {
    const map: Record<Status, Task[]> = {
      not_started: [], in_progress: [], blocked: [], at_risk: [], done: [], cancelled: [],
    };
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, [tasks]);

  async function updateStatus(id: string, status: Status) {
    const { error } = await supabase
      .from("action_items")
      .update({
        status,
        percent_complete: status === "done" ? 100 : undefined,
        completed_at: status === "done" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("action_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <AppShell
      title="Tasks"
      subtitle="The translation layer between the annual plan and the weekly stand-up."
      actions={
        <PrimaryButton onClick={() => setShowForm((s) => !s)}>
          <Plus className="size-3.5 inline-block -mt-0.5 mr-1" />
          {showForm ? "Close" : "Task"}
        </PrimaryButton>
      }
    >
      {showForm && orgId && (
        <NewTaskForm
          orgId={orgId}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {(orgLoading || loading) && (
        <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>
      )}

      {!loading && tasks.length === 0 && !showForm && (
        <EmptyState
          icon={CheckSquare}
          title="No tasks yet"
          description="Break your strategic priorities into bite-sized work. Assign owners, set priorities, and watch them flow across the board from Not started to Done."
          action={
            <PrimaryButton onClick={() => setShowForm(true)}>
              <Plus className="size-3.5 inline -mt-0.5 mr-1" /> Add first task
            </PrimaryButton>
          }
        />
      )}

      {!loading && tasks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {STATUS_COLUMNS.map((s) => (
            <SectionCard key={s} title={`${STATUS_LABEL[s]} · ${byStatus[s].length}`}>
              <ul className="space-y-3">
                {byStatus[s].length === 0 && (
                  <li className="text-xs text-slate-400 italic">—</li>
                )}
                {byStatus[s].map((t) => (
                  <li key={t.id} className="border border-slate-100 rounded-lg p-3 group">
                    <p className="text-sm font-medium text-slate-800">{t.title}</p>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="text-slate-500">
                        {t.owner_label || "Unassigned"}
                      </span>
                      <span className={PRIORITY_TONE[t.priority]}>
                        {t.priority}
                      </span>
                    </div>
                    {t.due_date && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        Due {new Date(t.due_date).toLocaleDateString()}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <select
                        value={t.status}
                        onChange={(e) => updateStatus(t.id, e.target.value as Status)}
                        className={`flex-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full border ${STATUS_TONE[t.status]}`}
                      >
                        {(Object.keys(STATUS_LABEL) as Status[]).map((k) => (
                          <option key={k} value={k}>{STATUS_LABEL[k]}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => remove(t.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition"
                        aria-label="Delete task"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function NewTaskForm({
  orgId,
  onCreated,
  onCancel,
}: {
  orgId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<Status>("not_started");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("action_items").insert({
      organization_id: orgId,
      title: title.trim(),
      owner_label: owner.trim() || null,
      priority,
      status,
      due_date: dueDate || null,
      created_by: u.user?.id ?? null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Task added");
    onCreated();
  }

  return (
    <SectionCard title="New task">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <label className="md:col-span-2 text-xs">
          <span className="block text-slate-500 mb-1">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
            placeholder="What needs doing?"
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
          <span className="block text-slate-500 mb-1">Priority</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          >
            {(Object.keys(STATUS_LABEL) as Status[]).map((k) => (
              <option key={k} value={k}>{STATUS_LABEL[k]}</option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Due date</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <div className="md:col-span-6 flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onCancel}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save task"}
          </PrimaryButton>
        </div>
      </form>
    </SectionCard>
  );
}
