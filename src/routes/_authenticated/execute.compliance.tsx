import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
  EmptyState,
} from "@/components/app-shell/AppShell";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CalendarClock,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/execute/compliance")({
  head: () => ({ meta: [{ title: "Compliance Calendar — NMM Navigator" }] }),
  component: CompliancePage,
});

type Category = "Tax" | "State Registration" | "Insurance" | "Audit" | "Policy" | "Employment";
type Status = "complete" | "in-progress" | "due-soon" | "overdue";
type Item = {
  id: string;
  title: string;
  category: Category;
  due_date: string | null;
  cadence: string;
  owner: string | null;
  status: Status;
  notes: string | null;
};

const CATEGORIES: Category[] = [
  "Tax",
  "State Registration",
  "Insurance",
  "Audit",
  "Policy",
  "Employment",
];
const CADENCES = ["Annual", "Biennial", "Quarterly", "Monthly", "Triennial"];

// Illustrative only — shown when there's no real data yet, never persisted.
const EXAMPLES: Item[] = [
  {
    id: "ex-1",
    title: "Form 990 filing",
    category: "Tax",
    due_date: "2026-05-15",
    cadence: "Annual",
    owner: "Treasurer + CPA",
    status: "complete",
    notes: null,
  },
  {
    id: "ex-2",
    title: "State Charitable Registration renewal",
    category: "State Registration",
    due_date: "2026-08-31",
    cadence: "Annual",
    owner: "Ops",
    status: "in-progress",
    notes: null,
  },
  {
    id: "ex-3",
    title: "D&O insurance renewal",
    category: "Insurance",
    due_date: "2026-10-12",
    cadence: "Annual",
    owner: "Treasurer",
    status: "due-soon",
    notes: null,
  },
  {
    id: "ex-4",
    title: "Conflict of interest disclosures",
    category: "Policy",
    due_date: "2026-09-30",
    cadence: "Annual",
    owner: "Governance Cmte",
    status: "overdue",
    notes: null,
  },
];

const STATUS_TONE: Record<Status, { tone: string; icon: typeof CheckCircle2; label: string }> = {
  complete: {
    tone: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
    label: "Complete",
  },
  "in-progress": {
    tone: "bg-brand-primary/10 text-brand-primary border-brand-primary/20",
    icon: Clock,
    label: "In progress",
  },
  "due-soon": {
    tone: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Clock,
    label: "Due soon",
  },
  overdue: {
    tone: "bg-rose-100 text-rose-700 border-rose-200",
    icon: AlertTriangle,
    label: "Overdue",
  },
};

const CATEGORY_DOT: Record<Category, string> = {
  Tax: "bg-emerald-500",
  "State Registration": "bg-brand-primary",
  Insurance: "bg-amber-500",
  Audit: "bg-violet-500",
  Policy: "bg-slate-500",
  Employment: "bg-rose-500",
};

function CompliancePage() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExamples, setShowExamples] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("compliance_items")
      .select("id,title,category,due_date,cadence,owner,status,notes")
      .eq("organization_id", orgId)
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) toast.error(error.message);
    setItems((data as Item[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function remove(id: string) {
    const { error } = await supabase.from("compliance_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const ready = !orgLoading && !loading;
  const hasReal = items.length > 0;
  const display = hasReal ? items : showExamples ? EXAMPLES : [];
  const isExampleView = !hasReal && showExamples;

  const overdue = display.filter((i) => i.status === "overdue");
  const dueSoon = display.filter((i) => i.status === "due-soon");
  const inProg = display.filter((i) => i.status === "in-progress");
  const complete = display.filter((i) => i.status === "complete");

  return (
    <AppShell
      title="Compliance Calendar"
      subtitle="Filings, registrations, insurance, audits, and policies — with owners and due dates. The boring stuff that keeps your 501(c)(3) status."
      actions={
        <>
          {!hasReal && (
            <GhostButton onClick={() => setShowExamples((v) => !v)}>
              {showExamples ? "Hide example data" : "Show example data"}
            </GhostButton>
          )}
          <PrimaryButton onClick={() => setShowForm((s) => !s)} disabled={!ready}>
            {showForm ? "Close" : "+ Requirement"}
          </PrimaryButton>
        </>
      }
    >
      {!ready && <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>}

      {ready && showForm && (
        <NewComplianceForm
          orgId={orgId!}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {ready && !showForm && !hasReal && !showExamples && (
        <EmptyState
          icon={CalendarClock}
          title="No compliance requirements yet"
          description="Add your first filing, registration, insurance renewal, audit, or policy review. We'll track owners, cadence, and due dates so nothing slips."
          action={
            <div className="flex items-center gap-2">
              <PrimaryButton onClick={() => setShowForm(true)}>+ Add requirement</PrimaryButton>
              <GhostButton onClick={() => setShowExamples(true)}>See example calendar</GhostButton>
            </div>
          }
        />
      )}

      {ready && !showForm && display.length > 0 && (
        <>
          {isExampleView && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              This is example data to show what a filled-out calendar looks like — nothing here is
              saved. Use "+ Requirement" to add your own.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-rose-600 text-white rounded-2xl p-5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-rose-100">
                Overdue
              </span>
              <p className="text-4xl font-serif mt-2">{overdue.length}</p>
              <p className="text-xs text-rose-100 mt-1">Action needed now</p>
            </div>
            <Stat label="Due in 30 days" value={dueSoon.length} tone="amber" />
            <Stat label="In progress" value={inProg.length} tone="blue" />
            <Stat label="Complete YTD" value={complete.length} tone="emerald" />
          </div>

          {overdue.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 mb-6 flex items-start gap-3">
              <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-rose-900">{overdue.length} item(s) overdue</p>
                <ul className="text-rose-800 text-xs mt-1 space-y-0.5">
                  {overdue.map((o) => (
                    <li key={o.id}>
                      · {o.title} — owner: {o.owner ?? "unassigned"}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <SectionCard title="All requirements" padding="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Requirement</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-left p-3">Cadence</th>
                    <th className="text-left p-3">Due</th>
                    <th className="text-left p-3">Owner</th>
                    {hasReal && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {display
                    .slice()
                    .sort((a, b) => {
                      const order = { overdue: 0, "due-soon": 1, "in-progress": 2, complete: 3 };
                      return order[a.status] - order[b.status];
                    })
                    .map((it) => {
                      const s = STATUS_TONE[it.status];
                      const Icon = s.icon;
                      return (
                        <tr
                          key={it.id}
                          className="border-t border-slate-100 hover:bg-slate-50/60 group"
                        >
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest border px-2 py-1 rounded-full ${s.tone}`}
                            >
                              <Icon className="size-3" /> {s.label}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-800">{it.title}</td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                              <span
                                className={`size-2 rounded-full ${CATEGORY_DOT[it.category]}`}
                              />
                              {it.category}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-slate-500">{it.cadence}</td>
                          <td className="p-3 text-sm text-slate-700 tabular-nums">
                            {it.due_date ?? "—"}
                          </td>
                          <td className="p-3 text-xs text-slate-600">{it.owner ?? "—"}</td>
                          {hasReal && (
                            <td className="p-3">
                              <button
                                onClick={() => remove(it.id)}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Coverage health" subtitle="Are we keeping pace?" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(["Tax", "Insurance", "Audit", "Policy"] as Category[]).map((c) => {
                const catItems = display.filter((i) => i.category === c);
                const healthy = catItems.filter((i) => i.status !== "overdue").length;
                const pct =
                  catItems.length > 0 ? Math.round((healthy / catItems.length) * 100) : 100;
                return (
                  <div key={c} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck className="size-4 text-brand-primary" />
                      <p className="text-sm font-medium text-slate-700">{c}</p>
                    </div>
                    <p className="text-2xl font-serif text-brand-deep tabular-nums">{pct}%</p>
                    <p className="text-xs text-slate-500">
                      {healthy} / {catItems.length} healthy
                    </p>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </>
      )}
    </AppShell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "blue" | "emerald";
}) {
  const color = {
    amber: "text-amber-700",
    blue: "text-brand-primary",
    emerald: "text-emerald-600",
  }[tone];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`text-4xl font-serif mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function NewComplianceForm({
  orgId,
  onCreated,
  onCancel,
}: {
  orgId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("Tax");
  const [dueDate, setDueDate] = useState("");
  const [cadence, setCadence] = useState("Annual");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState<Status>("in-progress");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("compliance_items").insert({
      organization_id: orgId,
      title: title.trim(),
      category,
      due_date: dueDate || null,
      cadence,
      owner: owner.trim() || null,
      status,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Requirement added");
    onCreated();
  }

  return (
    <SectionCard title="New requirement" className="mb-6">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <label className="md:col-span-2 text-xs">
          <span className="block text-slate-500 mb-1">Requirement</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Cadence</span>
          <select
            value={cadence}
            onChange={(e) => setCadence(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          >
            {CADENCES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
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
            onChange={(e) => setStatus(e.target.value as Status)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          >
            <option value="in-progress">In progress</option>
            <option value="due-soon">Due soon</option>
            <option value="overdue">Overdue</option>
            <option value="complete">Complete</option>
          </select>
        </label>
        <div className="md:col-span-6 flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onCancel}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save requirement"}
          </PrimaryButton>
        </div>
      </form>
    </SectionCard>
  );
}
