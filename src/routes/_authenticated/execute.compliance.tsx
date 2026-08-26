import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
  EmptyState,
} from "@/components/app-shell/AppShell";
import { CheckCircle2, AlertTriangle, Clock, ShieldCheck, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/execute/compliance")({
  head: () => ({ meta: [{ title: "Compliance Calendar — NMM Navigator" }] }),
  component: CompliancePage,
});

type Item = {
  id: string;
  title: string;
  category: "Tax" | "State Registration" | "Insurance" | "Audit" | "Policy" | "Employment";
  due: string;
  cadence: "Annual" | "Biennial" | "Quarterly" | "Monthly" | "Triennial";
  owner: string;
  status: "complete" | "in-progress" | "due-soon" | "overdue";
  notes?: string;
};

const ITEMS: Item[] = [
  { id: "C-01", title: "Form 990 filing", category: "Tax", due: "May 15, 2026", cadence: "Annual", owner: "Treasurer + CPA", status: "complete" },
  { id: "C-02", title: "State Charitable Registration renewal", category: "State Registration", due: "Aug 31, 2026", cadence: "Annual", owner: "Ops", status: "in-progress" },
  { id: "C-03", title: "D&O insurance renewal", category: "Insurance", due: "Oct 12, 2026", cadence: "Annual", owner: "Treasurer", status: "due-soon" },
  { id: "C-04", title: "General liability + abuse/molestation coverage", category: "Insurance", due: "Oct 12, 2026", cadence: "Annual", owner: "Treasurer", status: "due-soon" },
  { id: "C-05", title: "Workers comp filing", category: "Insurance", due: "Jan 31, 2027", cadence: "Annual", owner: "Ops", status: "in-progress" },
  { id: "C-06", title: "Independent audit (FY26)", category: "Audit", due: "Nov 30, 2026", cadence: "Annual", owner: "Treasurer + Audit Cmte", status: "in-progress" },
  { id: "C-07", title: "Conflict of interest disclosures (board + staff)", category: "Policy", due: "Sep 30, 2026", cadence: "Annual", owner: "Governance Cmte", status: "overdue" },
  { id: "C-08", title: "Whistleblower policy review", category: "Policy", due: "Dec 31, 2026", cadence: "Triennial", owner: "Governance Cmte", status: "in-progress" },
  { id: "C-09", title: "Document retention policy review", category: "Policy", due: "Dec 31, 2026", cadence: "Triennial", owner: "Ops", status: "in-progress" },
  { id: "C-10", title: "Background checks for all youth-facing staff", category: "Employment", due: "Quarterly", cadence: "Quarterly", owner: "Program Dir", status: "complete" },
  { id: "C-11", title: "Payroll tax filings (941)", category: "Tax", due: "Quarterly", cadence: "Quarterly", owner: "Bookkeeper", status: "complete" },
  { id: "C-12", title: "State unemployment filings", category: "Tax", due: "Quarterly", cadence: "Quarterly", owner: "Bookkeeper", status: "complete" },
  { id: "C-13", title: "Bylaws review", category: "Policy", due: "Jun 30, 2027", cadence: "Triennial", owner: "Governance Cmte", status: "in-progress" },
  { id: "C-14", title: "Sales tax exemption renewal", category: "State Registration", due: "Mar 31, 2027", cadence: "Annual", owner: "Treasurer", status: "in-progress" },
];

const STATUS_TONE = {
  complete: { tone: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, label: "Complete" },
  "in-progress": { tone: "bg-brand-primary/10 text-brand-primary border-brand-primary/20", icon: Clock, label: "In progress" },
  "due-soon": { tone: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock, label: "Due soon" },
  overdue: { tone: "bg-rose-100 text-rose-700 border-rose-200", icon: AlertTriangle, label: "Overdue" },
};

const CATEGORY_DOT: Record<Item["category"], string> = {
  Tax: "bg-emerald-500",
  "State Registration": "bg-brand-primary",
  Insurance: "bg-amber-500",
  Audit: "bg-violet-500",
  Policy: "bg-slate-500",
  Employment: "bg-rose-500",
};

function CompliancePage() {
  const [showExamples, setShowExamples] = useState(false);
  const items = showExamples ? ITEMS : [];
  const overdue = items.filter((i) => i.status === "overdue");
  const dueSoon = items.filter((i) => i.status === "due-soon");
  const inProg = items.filter((i) => i.status === "in-progress");
  const complete = items.filter((i) => i.status === "complete");

  return (
    <AppShell
      title="Compliance Calendar"
      subtitle="Filings, registrations, insurance, audits, and policies — with owners and due dates. The boring stuff that keeps your 501(c)(3) status."
      actions={
        <>
          <GhostButton onClick={() => setShowExamples((v) => !v)}>
            {showExamples ? "Hide example data" : "Show example data"}
          </GhostButton>
          <GhostButton>Sync to calendar</GhostButton>
          <PrimaryButton>+ Requirement</PrimaryButton>
        </>
      }
    >
      {!showExamples ? (
        <EmptyState
          icon={CalendarClock}
          title="No compliance requirements yet"
          description="Add your first filing, registration, insurance renewal, audit, or policy review. We'll track owners, cadence, and due dates so nothing slips."
          action={
            <div className="flex items-center gap-2">
              <PrimaryButton>+ Add requirement</PrimaryButton>
              <GhostButton onClick={() => setShowExamples(true)}>See example calendar</GhostButton>
            </div>
          }
        />
      ) : (
      <>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-rose-600 text-white rounded-2xl p-5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-rose-100">Overdue</span>
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
                <li key={o.id}>· {o.title} — owner: {o.owner}</li>
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
              </tr>
            </thead>
            <tbody>
              {ITEMS.slice()
                .sort((a, b) => {
                  const order = { overdue: 0, "due-soon": 1, "in-progress": 2, complete: 3 };
                  return order[a.status] - order[b.status];
                })
                .map((it) => {
                  const s = STATUS_TONE[it.status];
                  const Icon = s.icon;
                  return (
                    <tr key={it.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest border px-2 py-1 rounded-full ${s.tone}`}>
                          <Icon className="size-3" /> {s.label}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-800">{it.title}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                          <span className={`size-2 rounded-full ${CATEGORY_DOT[it.category]}`} />
                          {it.category}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-500">{it.cadence}</td>
                      <td className="p-3 text-sm text-slate-700 tabular-nums">{it.due}</td>
                      <td className="p-3 text-xs text-slate-600">{it.owner}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Coverage health" subtitle="Are we keeping pace?" className="mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["Tax", "Insurance", "Audit", "Policy"] as Item["category"][]).map((c) => {
            const items = ITEMS.filter((i) => i.category === c);
            const healthy = items.filter((i) => i.status !== "overdue").length;
            const pct = items.length > 0 ? Math.round((healthy / items.length) * 100) : 100;
            return (
              <div key={c} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="size-4 text-brand-primary" />
                  <p className="text-sm font-medium text-slate-700">{c}</p>
                </div>
                <p className="text-2xl font-serif text-brand-deep tabular-nums">{pct}%</p>
                <p className="text-xs text-slate-500">{healthy} / {items.length} healthy</p>
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

function Stat({ label, value, tone }: { label: string; value: number; tone: "amber" | "blue" | "emerald" }) {
  const color = { amber: "text-amber-700", blue: "text-brand-primary", emerald: "text-emerald-600" }[tone];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`text-4xl font-serif mt-1 ${color}`}>{value}</p>
    </div>
  );
}
