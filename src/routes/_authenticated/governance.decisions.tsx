import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { Search, Plus, Trash2, X, ScrollText } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/governance/decisions")({
  head: () => ({ meta: [{ title: "Decision Log — NMM Navigator" }] }),
  component: DecisionLog,
});

type DecisionRow = {
  id: string;
  organization_id: string;
  meeting_id: string | null;
  title: string;
  rationale: string | null;
  decided_by: string | null;
  decided_at: string;
  impact: string | null;
  follow_up: string | null;
  created_at: string;
};

type Draft = Partial<DecisionRow>;

const BODY_OPTIONS = ["Board", "Executive", "Staff"] as const;
const BODY_TONE: Record<string, string> = {
  Board: "bg-brand-deep text-white",
  Executive: "bg-slate-700 text-white",
  Staff: "bg-slate-200 text-slate-700",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function DecisionLog() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const [rows, setRows] = useState<DecisionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);

  async function load() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("meeting_decisions")
      .select("*")
      .eq("organization_id", orgId)
      .order("decided_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as DecisionRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (orgId) load();
  }, [orgId]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (d) =>
          !q ||
          d.title.toLowerCase().includes(q.toLowerCase()) ||
          (d.rationale ?? "").toLowerCase().includes(q.toLowerCase()) ||
          (d.decided_by ?? "").toLowerCase().includes(q.toLowerCase()),
      ),
    [rows, q],
  );

  const stats = useMemo(() => {
    const now = new Date();
    const thisQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const ytdStart = new Date(now.getFullYear(), 0, 1);
    const ytd = rows.filter((r) => new Date(r.decided_at) >= ytdStart).length;
    const thisQuarter = rows.filter((r) => new Date(r.decided_at) >= thisQuarterStart).length;
    const byMeeting = rows.filter((r) => r.meeting_id).length;
    return { ytd, thisQuarter, byMeeting, standalone: rows.length - byMeeting };
  }, [rows]);

  async function save() {
    if (!editing || !orgId) return;
    if (!editing.title?.trim()) {
      toast.error("Title is required");
      return;
    }
    const payload = {
      organization_id: orgId,
      title: editing.title,
      rationale: editing.rationale ?? null,
      decided_by: editing.decided_by ?? null,
      decided_at: editing.decided_at || new Date().toISOString().slice(0, 10),
      impact: editing.impact ?? null,
      follow_up: editing.follow_up ?? null,
    };
    let error;
    if (editing.id) {
      ({ error } = await supabase.from("meeting_decisions").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("meeting_decisions").insert(payload));
    }
    if (error) return toast.error(error.message);
    toast.success("Decision saved");
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this decision?")) return;
    const { error } = await supabase.from("meeting_decisions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  return (
    <AppShell
      title="Decision Log"
      subtitle="A durable record of what was decided, why, and what alternatives were considered. The single most important document during a leadership transition."
      actions={
        <PrimaryButton
          onClick={() =>
            setEditing({ decided_at: new Date().toISOString().slice(0, 10), decided_by: "Board" })
          }
        >
          <Plus className="size-3.5 inline -mt-0.5 mr-1" /> Log decision
        </PrimaryButton>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Decisions YTD" value={stats.ytd} hint={`${stats.byMeeting} from meetings`} />
        <Stat label="This quarter" value={stats.thisQuarter} />
        <Stat label="Standalone" value={stats.standalone} hint="Logged outside meetings" />
        <Stat label="Total logged" value={rows.length} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex items-center gap-3">
        <Search className="size-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search decisions, rationale, or decided-by..."
          className="flex-1 text-sm outline-none placeholder:text-slate-400 bg-transparent"
        />
        <span className="text-xs text-slate-400">
          {filtered.length} of {rows.length}
        </span>
      </div>

      {orgLoading || loading ? (
        <LoadingState label="Loading decisions…" />
      ) : !orgId ? (
        <EmptyState title="No organization found" description="Set up your organization profile to begin logging decisions." />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No decisions logged yet"
          description="Capture your first board, executive, or staff decision to start building the institutional memory."
          action={
            <PrimaryButton
              onClick={() =>
                setEditing({ decided_at: new Date().toISOString().slice(0, 10), decided_by: "Board" })
              }
            >
              <Plus className="size-3.5 inline -mt-0.5 mr-1" /> Log first decision
            </PrimaryButton>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matches" description={`No decisions match “${q}”. Try a different search.`} />
      ) : (

        <div className="space-y-4">
          {filtered.map((d) => {
            const bodyTone = BODY_TONE[d.decided_by ?? ""] ?? "bg-slate-200 text-slate-700";
            return (
              <SectionCard key={d.id}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-500">{fmtDate(d.decided_at)}</span>
                      {d.decided_by && (
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${bodyTone}`}
                        >
                          {d.decided_by}
                        </span>
                      )}
                      {d.meeting_id && (
                        <span className="text-[10px] font-bold uppercase tracking-widest border border-slate-200 px-2 py-0.5 rounded text-slate-500">
                          From meeting
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setEditing(d)}
                      className="text-left text-xl font-serif italic mt-2 hover:text-brand-primary"
                    >
                      {d.title}
                    </button>
                  </div>
                  <button
                    onClick={() => remove(d.id)}
                    className="text-slate-300 hover:text-rose-500 transition-colors"
                    aria-label="Delete decision"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <Field label="Rationale" value={d.rationale} muted />
                  <Field label="Impact" value={d.impact} />
                  <Field label="Follow-up" value={d.follow_up} italic />
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}

      {editing && (
        <EditorModal
          draft={editing}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </AppShell>
  );
}

function Field({
  label,
  value,
  muted,
  italic,
}: {
  label: string;
  value: string | null;
  muted?: boolean;
  italic?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
        {label}
      </p>
      <p
        className={`${muted ? "text-slate-600" : italic ? "text-slate-500 italic" : "text-slate-700"}`}
      >
        {value || <span className="text-slate-300">—</span>}
      </p>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-3xl font-serif text-brand-deep mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function EditorModal({
  draft,
  onChange,
  onClose,
  onSave,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="font-serif text-lg">{draft.id ? "Edit decision" : "Log decision"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="size-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <Input
            label="Title"
            value={draft.title ?? ""}
            onChange={(v) => onChange({ ...draft, title: v })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Decided by</Label>
              <select
                value={draft.decided_by ?? ""}
                onChange={(e) => onChange({ ...draft, decided_by: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {BODY_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <Input
              type="date"
              label="Date"
              value={draft.decided_at ?? ""}
              onChange={(v) => onChange({ ...draft, decided_at: v })}
            />
          </div>
          <Textarea
            label="Rationale"
            value={draft.rationale ?? ""}
            onChange={(v) => onChange({ ...draft, rationale: v })}
            placeholder="Why this decision was made, options considered…"
          />
          <Textarea
            label="Impact"
            value={draft.impact ?? ""}
            onChange={(v) => onChange({ ...draft, impact: v })}
            placeholder="What this changes — programs, budget, people…"
          />
          <Textarea
            label="Follow-up"
            value={draft.follow_up ?? ""}
            onChange={(v) => onChange({ ...draft, follow_up: v })}
            placeholder="Next actions, review date, owners…"
          />
        </div>
        <div className="p-5 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={onSave}>Save decision</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">
      {children}
    </label>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label>
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
      </Label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-y"
      />
    </div>
  );
}
