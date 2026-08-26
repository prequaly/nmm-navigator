import { createFileRoute } from "@tanstack/react-router";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
} from "@/components/app-shell/AppShell";

export const Route = createFileRoute("/_authenticated/plan/stakeholders")({
  head: () => ({ meta: [{ title: "Stakeholder Map — NMM Navigator" }] }),
  component: StakeholderMap,
});

type Stakeholder = {
  name: string;
  type: "Funder" | "Partner" | "Beneficiary" | "Regulator" | "Peer" | "Influencer";
  interest: 1 | 2 | 3 | 4 | 5; // how much they care
  influence: 1 | 2 | 3 | 4 | 5; // how much power they have
  relationship: "strong" | "neutral" | "at-risk" | "none";
  owner: string;
};

const STAKEHOLDERS: Stakeholder[] = [
  { name: "Hartwell Family Foundation", type: "Funder", interest: 5, influence: 5, relationship: "strong", owner: "ED" },
  { name: "City Arts Commission", type: "Funder", interest: 4, influence: 4, relationship: "neutral", owner: "ED" },
  { name: "Riverside Unified School District", type: "Partner", interest: 5, influence: 5, relationship: "at-risk", owner: "Program Dir" },
  { name: "NEA (federal)", type: "Funder", interest: 3, influence: 4, relationship: "neutral", owner: "Dev Dir" },
  { name: "Youth & families (program participants)", type: "Beneficiary", interest: 5, influence: 3, relationship: "strong", owner: "Program Dir" },
  { name: "State Dept of Education", type: "Regulator", interest: 2, influence: 5, relationship: "neutral", owner: "ED" },
  { name: "IRS / State AG", type: "Regulator", interest: 1, influence: 5, relationship: "neutral", owner: "Treasurer" },
  { name: "Peer arts orgs (coalition)", type: "Peer", interest: 4, influence: 2, relationship: "strong", owner: "ED" },
  { name: "Riverside Press (local media)", type: "Influencer", interest: 3, influence: 3, relationship: "strong", owner: "Comms" },
  { name: "Corporate sponsors (5)", type: "Funder", interest: 3, influence: 3, relationship: "neutral", owner: "Dev Dir" },
  { name: "Teaching artists (contractor pool)", type: "Partner", interest: 5, influence: 2, relationship: "strong", owner: "Program Dir" },
  { name: "Parent Advisory Council", type: "Beneficiary", interest: 5, influence: 2, relationship: "strong", owner: "Program Dir" },
];

const TYPE_COLOR: Record<Stakeholder["type"], string> = {
  Funder: "#2563eb",
  Partner: "#10b981",
  Beneficiary: "#f59e0b",
  Regulator: "#dc2626",
  Peer: "#8b5cf6",
  Influencer: "#ec4899",
};

const REL_TONE = {
  strong: "bg-emerald-100 text-emerald-700 border-emerald-200",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  "at-risk": "bg-amber-100 text-amber-700 border-amber-200",
  none: "bg-rose-100 text-rose-700 border-rose-200",
};

function StakeholderMap() {
  // 5x5 grid: x=interest, y=influence
  const cellKey = (interest: number, influence: number) => `${interest}-${influence}`;
  const groups: Record<string, Stakeholder[]> = {};
  for (const s of STAKEHOLDERS) {
    const k = cellKey(s.interest, s.influence);
    (groups[k] ||= []).push(s);
  }

  return (
    <AppShell
      title="Stakeholder Map"
      subtitle="Who cares vs. who can move things. Manage closely, keep satisfied, keep informed, or monitor."
      actions={
        <>
          <GhostButton>Filter by type</GhostButton>
          <PrimaryButton>+ Stakeholder</PrimaryButton>
        </>
      }
    >
      {/* Type legend */}
      <div className="flex flex-wrap gap-3 mb-6 text-xs">
        {Object.entries(TYPE_COLOR).map(([t, c]) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: c }} />
            <span className="text-slate-600">{t}</span>
          </span>
        ))}
      </div>

      <SectionCard
        title="Interest × Influence grid"
        subtitle="Top-right = manage closely. Top-left = keep satisfied. Bottom-right = keep informed. Bottom-left = monitor."
      >
        <div className="relative">
          {/* Y axis label */}
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Influence →
          </div>

          <div className="ml-8">
            {/* Quadrant labels */}
            <div className="grid grid-cols-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>Keep satisfied</span>
              <span className="text-right">Manage closely</span>
            </div>

            {/* Grid - influence rows top to bottom (5..1), interest cols left to right (1..5) */}
            <div className="grid grid-cols-5 gap-1.5 border border-slate-200 rounded-lg p-1.5 bg-slate-50/50">
              {[5, 4, 3, 2, 1].flatMap((influence) =>
                [1, 2, 3, 4, 5].map((interest) => {
                  const cell = groups[cellKey(interest, influence)] ?? [];
                  const isManageClosely = interest >= 4 && influence >= 4;
                  const isKeepSatisfied = interest <= 2 && influence >= 4;
                  const isKeepInformed = interest >= 4 && influence <= 2;
                  const isMonitor = interest <= 2 && influence <= 2;
                  const tint =
                    isManageClosely
                      ? "bg-brand-accent/5"
                      : isKeepSatisfied
                      ? "bg-amber-50"
                      : isKeepInformed
                      ? "bg-brand-primary/5"
                      : isMonitor
                      ? "bg-slate-100/60"
                      : "bg-white";
                  return (
                    <div
                      key={`${influence}-${interest}`}
                      className={`min-h-[110px] rounded-md border border-slate-100 p-1.5 ${tint}`}
                    >
                      <div className="space-y-1">
                        {cell.map((s) => (
                          <div
                            key={s.name}
                            title={`${s.name} · ${s.type} · ${s.relationship} · ${s.owner}`}
                            className="text-[10px] font-medium px-1.5 py-1 rounded leading-tight text-white truncate"
                            style={{ background: TYPE_COLOR[s.type] }}
                          >
                            {s.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }),
              )}
            </div>

            <div className="grid grid-cols-2 mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>Monitor</span>
              <span className="text-right">Keep informed</span>
            </div>

            <div className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">
              Interest →
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Stakeholders" subtitle="Full register · sortable by owner / type / relationship" padding="p-0" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left p-3">Stakeholder</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Interest</th>
                <th className="text-left p-3">Influence</th>
                <th className="text-left p-3">Relationship</th>
                <th className="text-left p-3">Owner</th>
              </tr>
            </thead>
            <tbody>
              {STAKEHOLDERS.map((s) => (
                <tr key={s.name} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="p-3 font-medium text-slate-800">{s.name}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="size-2 rounded-full" style={{ background: TYPE_COLOR[s.type] }} />
                      {s.type}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500 tabular-nums">{s.interest}/5</td>
                  <td className="p-3 text-slate-500 tabular-nums">{s.influence}/5</td>
                  <td className="p-3">
                    <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full ${REL_TONE[s.relationship]}`}>
                      {s.relationship}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">{s.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </AppShell>
  );
}
