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
import { Plus, Trash2, X, Search, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/governance/policies")({
  head: () => ({ meta: [{ title: "Policies — NMM Navigator" }] }),
  component: PoliciesPage,
});

type PolicyRow = {
  id: string;
  organization_id: string;
  title: string;
  category: string;
  status: string;
  summary: string | null;
  content: string | null;
  owner: string | null;
  approved_by: string | null;
  approved_at: string | null;
  next_review_date: string | null;
  version: string | null;
};

type Draft = Partial<PolicyRow>;

const CATEGORIES = [
  "governance",
  "finance",
  "hr",
  "program",
  "fundraising",
  "technology",
  "safeguarding",
  "compliance",
] as const;

const STATUSES = ["draft", "in_review", "approved", "expired"] as const;

const CATEGORY_TONE: Record<string, string> = {
  governance: "bg-brand-deep/10 text-brand-deep border-brand-deep/20",
  finance: "bg-emerald-50 text-emerald-700 border-emerald-200",
  hr: "bg-violet-50 text-violet-700 border-violet-200",
  program: "bg-amber-50 text-amber-700 border-amber-200",
  fundraising: "bg-blue-50 text-blue-700 border-blue-200",
  technology: "bg-slate-100 text-slate-700 border-slate-200",
  safeguarding: "bg-rose-50 text-rose-700 border-rose-200",
  compliance: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

const STATUS_TONE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  in_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  expired: "bg-rose-100 text-rose-700",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function PoliciesPage() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const [rows, setRows] = useState<PolicyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);

  async function load() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("policies")
      .select("*")
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as PolicyRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (orgId) load();
  }, [orgId]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (p) =>
          !q ||
          p.title.toLowerCase().includes(q.toLowerCase()) ||
          p.category.toLowerCase().includes(q.toLowerCase()) ||
          (p.summary ?? "").toLowerCase().includes(q.toLowerCase()),
      ),
    [rows, q],
  );

  const stats = useMemo(() => {
    const now = Date.now();
    const sixtyDays = now + 60 * 24 * 60 * 60 * 1000;
    const dueSoon = rows.filter(
      (p) => p.next_review_date && new Date(p.next_review_date).getTime() <= sixtyDays,
    ).length;
    return {
      total: rows.length,
      approved: rows.filter((p) => p.status === "approved").length,
      draft: rows.filter((p) => p.status === "draft" || p.status === "in_review").length,
      dueSoon,
    };
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
      category: editing.category ?? "governance",
      status: editing.status ?? "draft",
      summary: editing.summary ?? null,
      content: editing.content ?? null,
      owner: editing.owner ?? null,
      approved_by: editing.approved_by ?? null,
      approved_at: editing.approved_at || null,
      next_review_date: editing.next_review_date || null,
      version: editing.version ?? null,
    };
    let error;
    if (editing.id) {
      ({ error } = await supabase.from("policies").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("policies").insert(payload));
    }
    if (error) return toast.error(error.message);
    toast.success("Policy saved");
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this policy?")) return;
    const { error } = await supabase.from("policies").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  return (
    <AppShell
      title="Policies"
      subtitle="Board-approved policies that govern how the organization operates — finance, HR, safeguarding, technology, and more."
      actions={
        <PrimaryButton onClick={() => setEditing({ category: "governance", status: "draft" })}>
          <Plus className="size-3.5 inline -mt-0.5 mr-1" /> New policy
        </PrimaryButton>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Total policies" value={stats.total} />
        <Stat label="Approved" value={stats.approved} hint="Currently in force" />
        <Stat label="Draft / in review" value={stats.draft} hint="Pending approval" />
        <Stat label="Review due (60d)" value={stats.dueSoon} hint="Action needed" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex items-center gap-3">
        <Search className="size-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search policies…"
          className="flex-1 text-sm outline-none placeholder:text-slate-400 bg-transparent"
        />
        <span className="text-xs text-slate-400">
          {filtered.length} of {rows.length}
        </span>
      </div>

      {orgLoading || loading ? (
        <LoadingState label="Loading policies…" />
      ) : !orgId ? (
        <EmptyState title="No organization found" description="Set up your organization profile to manage policies." />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No policies yet"
          description="Start with the essentials: financial controls, conflict of interest, whistleblower, and document retention."
          action={
            <PrimaryButton onClick={() => setEditing({ category: "governance", status: "draft" })}>
              <Plus className="size-3.5 inline -mt-0.5 mr-1" /> Add first policy
            </PrimaryButton>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matches" description="No policies match your search. Try a different term." />
      ) : (

        <div className="space-y-3">
          {filtered.map((p) => (
            <SectionCard key={p.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded ${CATEGORY_TONE[p.category] ?? "border-slate-200 text-slate-600"}`}
                    >
                      {p.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${STATUS_TONE[p.status] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {p.status.replace("_", " ")}
                    </span>
                    {p.version && (
                      <span className="text-[10px] text-slate-400 tabular-nums">
                        v{p.version}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setEditing(p)}
                    className="text-left text-lg font-serif italic hover:text-brand-primary"
                  >
                    {p.title}
                  </button>
                  {p.summary && (
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">{p.summary}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
                    {p.owner && <span>Owner: <span className="text-slate-700">{p.owner}</span></span>}
                    {p.approved_at && <span>Approved {fmtDate(p.approved_at)}</span>}
                    {p.next_review_date && (
                      <span
                        className={
                          new Date(p.next_review_date).getTime() < Date.now() + 60 * 86400000
                            ? "text-amber-600"
                            : ""
                        }
                      >
                        Review {fmtDate(p.next_review_date)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => remove(p.id)}
                  className="text-slate-300 hover:text-rose-500 transition-colors shrink-0"
                  aria-label="Delete policy"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </SectionCard>
          ))}
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
          <h3 className="font-serif text-lg">{draft.id ? "Edit policy" : "New policy"}</h3>
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
              <Label>Category</Label>
              <select
                value={draft.category ?? "governance"}
                onChange={(e) => onChange({ ...draft, category: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm capitalize"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select
                value={draft.status ?? "draft"}
                onChange={(e) => onChange({ ...draft, status: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Textarea
            label="Summary"
            value={draft.summary ?? ""}
            onChange={(v) => onChange({ ...draft, summary: v })}
            placeholder="One paragraph: scope, who it applies to, and why."
            rows={3}
          />
          <Textarea
            label="Full policy text"
            value={draft.content ?? ""}
            onChange={(v) => onChange({ ...draft, content: v })}
            placeholder="The complete policy language…"
            rows={8}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Owner"
              value={draft.owner ?? ""}
              onChange={(v) => onChange({ ...draft, owner: v })}
              placeholder="e.g. Board Chair"
            />
            <Input
              label="Version"
              value={draft.version ?? ""}
              onChange={(v) => onChange({ ...draft, version: v })}
              placeholder="e.g. 1.0"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Approved by"
              value={draft.approved_by ?? ""}
              onChange={(v) => onChange({ ...draft, approved_by: v })}
              placeholder="e.g. Board, May 2026"
            />
            <Input
              type="date"
              label="Approved on"
              value={draft.approved_at ?? ""}
              onChange={(v) => onChange({ ...draft, approved_at: v })}
            />
          </div>
          <Input
            type="date"
            label="Next review date"
            value={draft.next_review_date ?? ""}
            onChange={(v) => onChange({ ...draft, next_review_date: v })}
          />
        </div>
        <div className="p-5 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={onSave}>Save policy</PrimaryButton>
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
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
        placeholder={placeholder}
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
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-y"
      />
    </div>
  );
}
