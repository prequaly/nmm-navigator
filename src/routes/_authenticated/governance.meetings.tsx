import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
  EmptyState,
  LoadingState,
} from "@/components/app-shell/AppShell";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { toast } from "sonner";
import { Calendar, ArrowRight, Plus, Trash2 } from "lucide-react";

type Cadence = "quarterly" | "monthly" | "weekly" | "adhoc";
type Status = "scheduled" | "in_progress" | "completed" | "cancelled";

type Meeting = {
  id: string;
  title: string;
  cadence: Cadence;
  status: Status;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
};

const CADENCE_TONE: Record<Cadence, string> = {
  quarterly: "bg-violet-100 text-violet-700",
  monthly: "bg-emerald-100 text-emerald-700",
  weekly: "bg-brand-primary/10 text-brand-primary",
  adhoc: "bg-amber-100 text-amber-700",
};
const STATUS_TONE: Record<Status, string> = {
  scheduled: "bg-slate-100 text-slate-700",
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700",
};

export const Route = createFileRoute("/_authenticated/governance/meetings")({
  head: () => ({ meta: [{ title: "Meetings — NMM Navigator" }] }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("meetings")
      .select("id,title,cadence,status,scheduled_at,duration_minutes,location")
      .eq("organization_id", orgId)
      .order("scheduled_at", { ascending: false });
    if (error) toast.error(error.message);
    setMeetings((data as Meeting[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function remove(id: string) {
    if (!confirm("Delete this meeting and all its agenda, minutes, decisions?")) return;
    const { error } = await supabase.from("meetings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setMeetings((prev) => prev.filter((m) => m.id !== id));
  }

  const now = Date.now();
  const upcoming = meetings.filter((m) => new Date(m.scheduled_at).getTime() >= now);
  const past = meetings.filter((m) => new Date(m.scheduled_at).getTime() < now);

  return (
    <AppShell
      title="Meetings"
      subtitle="Cadence rooms for the work — agenda, minutes, decisions, and action items in one place."
      actions={
        <PrimaryButton onClick={() => setShowForm((s) => !s)} disabled={!orgId}>
          <Plus className="size-3.5 inline-block -mt-0.5 mr-1" />
          {showForm ? "Close" : "Meeting"}
        </PrimaryButton>
      }
    >
      {(orgLoading || loading) && <LoadingState label="Loading meetings…" />}

      {orgId && showForm && (
        <NewMeetingForm
          orgId={orgId}
          onCreated={() => { setShowForm(false); refresh(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {!loading && meetings.length === 0 && !showForm && (
        <EmptyState
          icon={Calendar}
          title="No meetings yet"
          description="Schedule your first board, executive, or staff meeting to start tracking agendas, decisions, and follow-ups."
          action={
            <PrimaryButton onClick={() => setShowForm(true)}>
              <Plus className="size-3.5 inline -mt-0.5 mr-1" /> Schedule meeting
            </PrimaryButton>
          }
        />
      )}


      {!loading && upcoming.length > 0 && (
        <SectionCard title="Upcoming" padding="p-0" className="mb-6">
          <MeetingList items={upcoming} onDelete={remove} />
        </SectionCard>
      )}

      {!loading && past.length > 0 && (
        <SectionCard title="Past" padding="p-0">
          <MeetingList items={past} onDelete={remove} />
        </SectionCard>
      )}
    </AppShell>
  );
}

function MeetingList({ items, onDelete }: { items: Meeting[]; onDelete: (id: string) => void }) {
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((m) => {
        const d = new Date(m.scheduled_at);
        return (
          <li key={m.id} className="flex items-center gap-4 p-4 hover:bg-slate-50/60 group">
            <div className="size-10 rounded-lg bg-slate-100 text-slate-700 flex flex-col items-center justify-center shrink-0 leading-none">
              <span className="text-[9px] uppercase font-bold text-slate-500">
                {d.toLocaleString(undefined, { month: "short" })}
              </span>
              <span className="text-base font-serif">{d.getDate()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-slate-900 truncate">{m.title}</p>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${CADENCE_TONE[m.cadence]}`}>
                  {m.cadence}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${STATUS_TONE[m.status]}`}>
                  {m.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {d.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}
                {" · "}{m.duration_minutes} min
                {m.location ? ` · ${m.location}` : ""}
              </p>
            </div>
            <button
              onClick={() => onDelete(m.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600"
              aria-label="Delete meeting"
            >
              <Trash2 className="size-4" />
            </button>
            <Link
              to="/governance/meetings/$meetingId"
              params={{ meetingId: m.id }}
              className="text-xs text-brand-primary hover:underline flex items-center gap-0.5 ml-2"
            >
              Open <ArrowRight className="size-3" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function NewMeetingForm({
  orgId,
  onCreated,
  onCancel,
}: {
  orgId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const tomorrow = new Date(Date.now() + 86400_000);
  tomorrow.setMinutes(0, 0, 0);
  const defaultDate = tomorrow.toISOString().slice(0, 16);

  const [title, setTitle] = useState("");
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [when, setWhen] = useState(defaultDate);
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("meetings").insert({
      organization_id: orgId,
      title: title.trim(),
      cadence,
      scheduled_at: new Date(when).toISOString(),
      duration_minutes: duration,
      location: location.trim() || null,
      status: "scheduled",
      created_by: u.user?.id ?? null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Meeting scheduled");
    onCreated();
  }

  return (
    <SectionCard title="New meeting">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <label className="md:col-span-3 text-xs">
          <span className="block text-slate-500 mb-1">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
            placeholder="e.g. Q4 Board Meeting"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Cadence</span>
          <select
            value={cadence}
            onChange={(e) => setCadence(e.target.value as Cadence)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          >
            <option value="quarterly">Quarterly</option>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="adhoc">Ad-hoc</option>
          </select>
        </label>
        <label className="md:col-span-2 text-xs">
          <span className="block text-slate-500 mb-1">When</span>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            required
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Duration (min)</span>
          <input
            type="number"
            min={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 60)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="md:col-span-5 text-xs">
          <span className="block text-slate-500 mb-1">Location / link</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
            placeholder="Room, Zoom URL, etc."
          />
        </label>
        <div className="md:col-span-6 flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onCancel}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save meeting"}
          </PrimaryButton>
        </div>
      </form>
    </SectionCard>
  );
}
