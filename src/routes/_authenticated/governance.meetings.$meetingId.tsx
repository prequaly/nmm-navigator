import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
} from "@/components/app-shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Check, Clock, Users, Gavel, FileText, ListChecks } from "lucide-react";
import { AiDraftButton } from "@/components/ai/AiDraftButton";
import { draftNarrative } from "@/lib/ai/draft.functions";
import { useServerFn } from "@tanstack/react-start";

type MeetingStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

type Meeting = {
  id: string;
  organization_id: string;
  title: string;
  cadence: string;
  status: MeetingStatus;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  summary: string | null;
};

type Agenda = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  sort_order: number;
};

type Minute = {
  id: string;
  agenda_item_id: string | null;
  body: string;
  sort_order: number;
};

type Decision = {
  id: string;
  title: string;
  rationale: string | null;
  decided_by: string | null;
  decided_at: string;
  follow_up: string | null;
};

type Attendee = {
  id: string;
  display_name: string | null;
  role: string | null;
  status: "invited" | "attended" | "absent" | "excused";
};

type ActionLink = {
  id: string;
  context: string | null;
  commitment_due_date: string | null;
  action_item_id: string;
  title: string;
  status: string;
  owner_label: string | null;
};

export const Route = createFileRoute("/_authenticated/governance/meetings/$meetingId")({
  head: () => ({ meta: [{ title: "Meeting — NMM Navigator" }] }),
  component: MeetingDetailPage,
});

function MeetingDetailPage() {
  const { meetingId } = Route.useParams();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [agenda, setAgenda] = useState<Agenda[]>([]);
  const [minutes, setMinutes] = useState<Minute[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [actions, setActions] = useState<ActionLink[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const m = await supabase
      .from("meetings")
      .select("id,organization_id,title,cadence,status,scheduled_at,duration_minutes,location,summary")
      .eq("id", meetingId)
      .maybeSingle();
    if (m.error) toast.error(m.error.message);
    setMeeting((m.data as Meeting) ?? null);

    const [a, mi, d, at, ai] = await Promise.all([
      supabase.from("meeting_agenda_items")
        .select("id,title,description,duration_minutes,sort_order")
        .eq("meeting_id", meetingId)
        .order("sort_order", { ascending: true }),
      supabase.from("meeting_minutes")
        .select("id,agenda_item_id,body,sort_order")
        .eq("meeting_id", meetingId)
        .order("sort_order", { ascending: true }),
      supabase.from("meeting_decisions")
        .select("id,title,rationale,decided_by,decided_at,follow_up")
        .eq("meeting_id", meetingId)
        .order("decided_at", { ascending: true }),
      supabase.from("meeting_attendees")
        .select("id,display_name,role,status")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: true }),
      supabase.from("meeting_action_items")
        .select("id,context,commitment_due_date,action_item_id,action_items(title,status,owner_label)")
        .eq("meeting_id", meetingId),
    ]);
    setAgenda((a.data as Agenda[]) ?? []);
    setMinutes((mi.data as Minute[]) ?? []);
    setDecisions((d.data as Decision[]) ?? []);
    setAttendees((at.data as Attendee[]) ?? []);
    setActions(
      ((ai.data as any[]) ?? []).map((row) => ({
        id: row.id,
        context: row.context,
        commitment_due_date: row.commitment_due_date,
        action_item_id: row.action_item_id,
        title: row.action_items?.title ?? "(deleted)",
        status: row.action_items?.status ?? "—",
        owner_label: row.action_items?.owner_label ?? null,
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  async function updateStatus(status: Meeting["status"]) {
    if (!meeting) return;
    const { error } = await supabase.from("meetings").update({ status }).eq("id", meeting.id);
    if (error) return toast.error(error.message);
    setMeeting({ ...meeting, status });
  }

  const orgId = meeting?.organization_id ?? null;

  return (
    <AppShell
      title={meeting?.title ?? "Meeting"}
      subtitle={
        meeting
          ? `${new Date(meeting.scheduled_at).toLocaleString()} · ${meeting.duration_minutes} min${meeting.location ? ` · ${meeting.location}` : ""}`
          : "Loading…"
      }
      actions={
        <>
          <Link to="/governance/meetings">
            <GhostButton><ArrowLeft className="size-3.5 inline -mt-0.5 mr-1" />All meetings</GhostButton>
          </Link>
          {meeting && meeting.status === "scheduled" && (
            <PrimaryButton onClick={() => updateStatus("in_progress")}>Start meeting</PrimaryButton>
          )}
          {meeting && meeting.status === "in_progress" && (
            <PrimaryButton onClick={() => updateStatus("completed")}>Mark complete</PrimaryButton>
          )}
        </>
      }
    >
      {loading && <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>}

      {meeting && orgId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <AgendaCard
              orgId={orgId}
              meetingId={meeting.id}
              items={agenda}
              minutes={minutes}
              onChange={refresh}
            />
            <DecisionsCard
              orgId={orgId}
              meetingId={meeting.id}
              items={decisions}
              onChange={refresh}
            />
            <ActionsCard
              orgId={orgId}
              meetingId={meeting.id}
              items={actions}
              onChange={refresh}
            />
          </div>

          <div className="space-y-6">
            <AttendeesCard
              orgId={orgId}
              meetingId={meeting.id}
              items={attendees}
              onChange={refresh}
            />
            <SummaryCard meeting={meeting} onSaved={refresh} />
          </div>
        </div>
      )}
    </AppShell>
  );
}

/* ------------------------------- Agenda ------------------------------- */

function AgendaCard({
  orgId,
  meetingId,
  items,
  minutes,
  onChange,
}: {
  orgId: string;
  meetingId: string;
  items: Agenda[];
  minutes: Minute[];
  onChange: () => void;
}) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("10");

  async function add() {
    if (!title.trim()) return;
    const { error } = await supabase.from("meeting_agenda_items").insert({
      organization_id: orgId,
      meeting_id: meetingId,
      title: title.trim(),
      duration_minutes: Number(duration) || null,
      sort_order: items.length,
    });
    if (error) return toast.error(error.message);
    setTitle("");
    onChange();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("meeting_agenda_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChange();
  }

  return (
    <SectionCard
      title={<span className="flex items-center gap-2"><FileText className="size-4 text-brand-primary" />Agenda</span> as any}
      subtitle="Topics to cover, with notes captured as the meeting runs."
    >
      <div className="flex gap-2 mb-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Add an agenda item…"
          className="flex-1 text-sm border border-slate-200 rounded-md px-3 py-2"
        />
        <input
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          type="number"
          min={1}
          className="w-20 text-sm border border-slate-200 rounded-md px-3 py-2"
          placeholder="min"
        />
        <PrimaryButton onClick={add}><Plus className="size-3.5" /></PrimaryButton>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-slate-400 italic">No agenda items yet.</p>
      )}

      <ol className="space-y-4">
        {items.map((it, i) => (
          <li key={it.id} className="border border-slate-100 rounded-lg p-4 group">
            <div className="flex items-start gap-3">
              <span className="size-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-semibold shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{it.title}</p>
                {it.duration_minutes != null && (
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock className="size-3" /> {it.duration_minutes} min
                  </p>
                )}
              </div>
              <button
                onClick={() => remove(it.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600"
                aria-label="Delete agenda item"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <MinutesList
              orgId={orgId}
              meetingId={meetingId}
              agendaItemId={it.id}
              minutes={minutes.filter((m) => m.agenda_item_id === it.id)}
              onChange={onChange}
            />
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

function MinutesList({
  orgId,
  meetingId,
  agendaItemId,
  minutes,
  onChange,
}: {
  orgId: string;
  meetingId: string;
  agendaItemId: string;
  minutes: Minute[];
  onChange: () => void;
}) {
  const [body, setBody] = useState("");

  async function add() {
    if (!body.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("meeting_minutes").insert({
      organization_id: orgId,
      meeting_id: meetingId,
      agenda_item_id: agendaItemId,
      body: body.trim(),
      sort_order: minutes.length,
      author_user_id: u.user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    setBody("");
    onChange();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("meeting_minutes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChange();
  }

  return (
    <div className="mt-3 ml-9 space-y-2">
      {minutes.map((m) => (
        <div key={m.id} className="text-xs text-slate-600 flex items-start gap-2 group">
          <span className="text-slate-300 mt-1">•</span>
          <p className="flex-1 whitespace-pre-wrap">{m.body}</p>
          <button
            onClick={() => remove(m.id)}
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 mt-0.5"
            aria-label="Delete note"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Add a note…"
          className="flex-1 text-xs border border-slate-200 rounded px-2 py-1"
        />
        <button onClick={add} className="text-xs text-brand-primary hover:underline">
          Add
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ Decisions ----------------------------- */

function DecisionsCard({
  orgId,
  meetingId,
  items,
  onChange,
}: {
  orgId: string;
  meetingId: string;
  items: Decision[];
  onChange: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [rationale, setRationale] = useState("");
  const [decidedBy, setDecidedBy] = useState("");
  const [followUp, setFollowUp] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("meeting_decisions").insert({
      organization_id: orgId,
      meeting_id: meetingId,
      title: title.trim(),
      rationale: rationale.trim() || null,
      decided_by: decidedBy.trim() || null,
      follow_up: followUp.trim() || null,
      created_by: u.user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    setTitle(""); setRationale(""); setDecidedBy(""); setFollowUp(""); setShowForm(false);
    onChange();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("meeting_decisions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChange();
  }

  return (
    <SectionCard
      title={<span className="flex items-center gap-2"><Gavel className="size-4 text-brand-primary" />Decisions</span> as any}
    >
      {items.length === 0 && !showForm && (
        <p className="text-xs text-slate-400 italic mb-3">No decisions logged yet.</p>
      )}
      <ul className="space-y-3 mb-4">
        {items.map((d) => (
          <li key={d.id} className="border border-slate-100 rounded-lg p-3 group">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-slate-900 flex-1">{d.title}</p>
              <button
                onClick={() => remove(d.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600"
                aria-label="Delete decision"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            {d.rationale && <p className="text-xs text-slate-600 mt-1">{d.rationale}</p>}
            <p className="text-[11px] text-slate-400 mt-1.5">
              {d.decided_by ? `${d.decided_by} · ` : ""}
              {new Date(d.decided_at).toLocaleDateString()}
              {d.follow_up ? ` · follow-up: ${d.follow_up}` : ""}
            </p>
          </li>
        ))}
      </ul>

      {showForm ? (
        <form onSubmit={add} className="space-y-2 border-t border-slate-100 pt-4">
          <input
            value={title} onChange={(e) => setTitle(e.target.value)} required
            placeholder="Decision (one sentence)"
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
          <textarea
            value={rationale} onChange={(e) => setRationale(e.target.value)} rows={2}
            placeholder="Rationale / context"
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={decidedBy} onChange={(e) => setDecidedBy(e.target.value)}
              placeholder="Decided by"
              className="text-sm border border-slate-200 rounded-md px-3 py-2"
            />
            <input
              value={followUp} onChange={(e) => setFollowUp(e.target.value)}
              placeholder="Follow-up"
              className="text-sm border border-slate-200 rounded-md px-3 py-2"
            />
          </div>
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setShowForm(false)}>Cancel</GhostButton>
            <PrimaryButton type="submit">Log decision</PrimaryButton>
          </div>
        </form>
      ) : (
        <GhostButton onClick={() => setShowForm(true)}>
          <Plus className="size-3.5 inline -mt-0.5 mr-1" /> Decision
        </GhostButton>
      )}
    </SectionCard>
  );
}

/* ---------------------------- Action Items ---------------------------- */

function ActionsCard({
  orgId,
  meetingId,
  items,
  onChange,
}: {
  orgId: string;
  meetingId: string;
  items: ActionLink[];
  onChange: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [due, setDue] = useState("");
  const [context, setContext] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { data: created, error: insErr } = await supabase
      .from("action_items")
      .insert({
        organization_id: orgId,
        title: title.trim(),
        owner_label: owner.trim() || null,
        due_date: due || null,
        priority: "medium",
        status: "not_started",
        created_by: u.user?.id ?? null,
      })
      .select("id")
      .single();
    if (insErr || !created) return toast.error(insErr?.message || "Failed to create action");

    const { error: linkErr } = await supabase.from("meeting_action_items").insert({
      organization_id: orgId,
      meeting_id: meetingId,
      action_item_id: created.id,
      context: context.trim() || null,
      commitment_due_date: due || null,
    });
    if (linkErr) return toast.error(linkErr.message);

    setTitle(""); setOwner(""); setDue(""); setContext(""); setShowForm(false);
    onChange();
  }

  async function unlink(linkId: string, actionId: string) {
    // Remove the link and the underlying action together.
    await supabase.from("meeting_action_items").delete().eq("id", linkId);
    await supabase.from("action_items").delete().eq("id", actionId);
    onChange();
  }

  return (
    <SectionCard
      title={<span className="flex items-center gap-2"><ListChecks className="size-4 text-brand-primary" />Action items</span> as any}
      subtitle="Commitments made in this meeting — flow into the Tasks board."
    >
      {items.length === 0 && !showForm && (
        <p className="text-xs text-slate-400 italic mb-3">No action items captured yet.</p>
      )}
      <ul className="space-y-2 mb-4">
        {items.map((a) => (
          <li key={a.id} className="border border-slate-100 rounded-lg p-3 group flex items-start gap-3">
            <Check className="size-3.5 text-slate-300 mt-1 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{a.title}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {a.owner_label ? `${a.owner_label} · ` : ""}
                {a.commitment_due_date ? `due ${new Date(a.commitment_due_date).toLocaleDateString()} · ` : ""}
                status: {a.status}
              </p>
              {a.context && <p className="text-xs text-slate-500 mt-1">{a.context}</p>}
            </div>
            <button
              onClick={() => unlink(a.id, a.action_item_id)}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600"
              aria-label="Remove action"
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>

      {showForm ? (
        <form onSubmit={add} className="space-y-2 border-t border-slate-100 pt-4">
          <input
            value={title} onChange={(e) => setTitle(e.target.value)} required
            placeholder="What needs doing?"
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={owner} onChange={(e) => setOwner(e.target.value)}
              placeholder="Owner"
              className="text-sm border border-slate-200 rounded-md px-3 py-2"
            />
            <input
              type="date" value={due} onChange={(e) => setDue(e.target.value)}
              className="text-sm border border-slate-200 rounded-md px-3 py-2"
            />
          </div>
          <input
            value={context} onChange={(e) => setContext(e.target.value)}
            placeholder="Context (optional)"
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setShowForm(false)}>Cancel</GhostButton>
            <PrimaryButton type="submit">Capture</PrimaryButton>
          </div>
        </form>
      ) : (
        <GhostButton onClick={() => setShowForm(true)}>
          <Plus className="size-3.5 inline -mt-0.5 mr-1" /> Action item
        </GhostButton>
      )}
    </SectionCard>
  );
}

/* ------------------------------ Attendees ----------------------------- */

const ATTEND_TONE: Record<Attendee["status"], string> = {
  invited: "bg-slate-100 text-slate-600",
  attended: "bg-emerald-100 text-emerald-700",
  absent: "bg-rose-100 text-rose-700",
  excused: "bg-amber-100 text-amber-700",
};

function AttendeesCard({
  orgId,
  meetingId,
  items,
  onChange,
}: {
  orgId: string;
  meetingId: string;
  items: Attendee[];
  onChange: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  async function add() {
    if (!name.trim()) return;
    const { error } = await supabase.from("meeting_attendees").insert({
      organization_id: orgId,
      meeting_id: meetingId,
      display_name: name.trim(),
      role: role.trim() || null,
    });
    if (error) return toast.error(error.message);
    setName(""); setRole("");
    onChange();
  }

  async function cycle(a: Attendee) {
    const order: Attendee["status"][] = ["invited", "attended", "excused", "absent"];
    const next = order[(order.indexOf(a.status) + 1) % order.length];
    const { error } = await supabase
      .from("meeting_attendees")
      .update({ status: next })
      .eq("id", a.id);
    if (error) return toast.error(error.message);
    onChange();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("meeting_attendees").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChange();
  }

  return (
    <SectionCard
      title={<span className="flex items-center gap-2"><Users className="size-4 text-brand-primary" />Attendees</span> as any}
    >
      <ul className="space-y-2 mb-4">
        {items.length === 0 && <p className="text-xs text-slate-400 italic">No attendees yet.</p>}
        {items.map((a) => (
          <li key={a.id} className="flex items-center gap-2 text-sm group">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 truncate">{a.display_name ?? "—"}</p>
              {a.role && <p className="text-[11px] text-slate-400">{a.role}</p>}
            </div>
            <button
              onClick={() => cycle(a)}
              className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${ATTEND_TONE[a.status]}`}
              title="Click to change status"
            >
              {a.status}
            </button>
            <button
              onClick={() => remove(a.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600"
              aria-label="Remove attendee"
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-3 gap-2">
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="col-span-2 text-sm border border-slate-200 rounded-md px-3 py-2"
        />
        <input
          value={role} onChange={(e) => setRole(e.target.value)}
          placeholder="Role"
          className="text-sm border border-slate-200 rounded-md px-3 py-2"
        />
      </div>
      <div className="flex justify-end mt-2">
        <PrimaryButton onClick={add}><Plus className="size-3.5" /></PrimaryButton>
      </div>
    </SectionCard>
  );
}

/* ------------------------------- Summary ------------------------------ */

function SummaryCard({ meeting, onSaved }: { meeting: Meeting; onSaved: () => void }) {
  const [summary, setSummary] = useState(meeting.summary ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setSummary(meeting.summary ?? ""); }, [meeting.summary]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("meetings")
      .update({ summary: summary.trim() || null })
      .eq("id", meeting.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Summary saved");
    onSaved();
  }

  const draft = useServerFn(draftNarrative);
  const isDirty = summary !== (meeting.summary ?? "");
  return (
    <SectionCard
      title="Summary"
      right={
        <AiDraftButton
          onDraft={async () => {
            const res = await draft({
              data: {
                kind: "meeting_summary",
                organizationId: meeting.organization_id,
                meetingId: meeting.id,
              },
            });
            setSummary(res.text);
            toast.success("Draft inserted — review and save");
            return res;
          }}
        />
      }
    >
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={6}
        className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
        placeholder="One paragraph the board chair could read in 30 seconds."
      />
      <div className="flex justify-end gap-2 mt-2">
        {isDirty && (
          <GhostButton onClick={() => setSummary(meeting.summary ?? "")}>Discard</GhostButton>
        )}
        <PrimaryButton onClick={save} disabled={saving || !isDirty}>
          {saving ? "Saving…" : "Save summary"}
        </PrimaryButton>
      </div>
    </SectionCard>
  );
}
