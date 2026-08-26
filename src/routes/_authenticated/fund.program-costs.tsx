import { createFileRoute } from "@tanstack/react-router";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
} from "@/components/app-shell/AppShell";

export const Route = createFileRoute("/_authenticated/fund/program-costs")({
  head: () => ({ meta: [{ title: "Program Cost Allocation — NMM Navigator" }] }),
  component: ProgramCosts,
});

type Program = {
  name: string;
  direct: number;
  sharedAllocationPct: number; // % of shared/overhead allocated
  youthServed: number;
  programHours: number;
};

const SHARED_OVERHEAD = 380_000; // total overhead pool
const TOTAL_BUDGET = 1_400_000;

const PROGRAMS: Program[] = [
  { name: "After-school Studio (3 sites)", direct: 525_000, sharedAllocationPct: 0.42, youthServed: 260, programHours: 8_400 },
  { name: "Summer Intensive", direct: 168_000, sharedAllocationPct: 0.14, youthServed: 95, programHours: 2_280 },
  { name: "Teaching Artist Residencies", direct: 142_000, sharedAllocationPct: 0.12, youthServed: 0, programHours: 960 },
  { name: "Family Engagement Series", direct: 38_000, sharedAllocationPct: 0.06, youthServed: 0, programHours: 220 },
  { name: "Public Showcases (4/yr)", direct: 65_000, sharedAllocationPct: 0.10, youthServed: 0, programHours: 320 },
  { name: "Bridges Mentorship (pilot, sunsetting)", direct: 82_000, sharedAllocationPct: 0.08, youthServed: 65, programHours: 420 },
];

function ProgramCosts() {
  const rows = PROGRAMS.map((p) => {
    const allocated = SHARED_OVERHEAD * p.sharedAllocationPct;
    const trueCost = p.direct + allocated;
    const costPerYouth = p.youthServed > 0 ? trueCost / p.youthServed : null;
    const costPerHour = p.programHours > 0 ? trueCost / p.programHours : null;
    return { ...p, allocated, trueCost, costPerYouth, costPerHour };
  });

  const totalDirect = rows.reduce((a, b) => a + b.direct, 0);
  const totalAllocated = rows.reduce((a, b) => a + b.allocated, 0);
  const totalTrueCost = rows.reduce((a, b) => a + b.trueCost, 0);

  return (
    <AppShell
      title="Program Cost Allocation"
      subtitle="What each program actually costs once shared overhead is loaded in. Use for grant pricing, sunset decisions, and impact-per-dollar comparisons."
      actions={
        <>
          <GhostButton>Allocation methodology</GhostButton>
          <PrimaryButton>Recalculate</PrimaryButton>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Total budget" value={`$${(TOTAL_BUDGET / 1000).toFixed(0)}k`} />
        <Stat label="Direct program costs" value={`$${(totalDirect / 1000).toFixed(0)}k`} hint={`${Math.round((totalDirect / TOTAL_BUDGET) * 100)}% of budget`} />
        <Stat label="Shared overhead pool" value={`$${(SHARED_OVERHEAD / 1000).toFixed(0)}k`} hint="Admin, finance, dev, facilities" />
        <Stat label="True program cost" value={`$${(totalTrueCost / 1000).toFixed(0)}k`} hint="Direct + allocated share" />
      </div>

      <SectionCard title="True cost by program" subtitle="Direct + fair share of overhead" padding="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left p-3">Program</th>
                <th className="text-right p-3">Direct</th>
                <th className="text-right p-3">+ Overhead alloc.</th>
                <th className="text-right p-3">True cost</th>
                <th className="text-right p-3">% of budget</th>
                <th className="text-right p-3">$ / youth</th>
                <th className="text-right p-3">$ / program-hr</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pctOfBudget = (r.trueCost / TOTAL_BUDGET) * 100;
                return (
                  <tr key={r.name} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="p-3 font-medium text-slate-800">{r.name}</td>
                    <td className="p-3 text-right text-slate-600 tabular-nums">${(r.direct / 1000).toFixed(0)}k</td>
                    <td className="p-3 text-right text-slate-500 tabular-nums">+ ${(r.allocated / 1000).toFixed(0)}k</td>
                    <td className="p-3 text-right font-medium text-brand-deep tabular-nums">${(r.trueCost / 1000).toFixed(0)}k</td>
                    <td className="p-3 text-right text-slate-500 tabular-nums">{pctOfBudget.toFixed(0)}%</td>
                    <td className="p-3 text-right text-brand-primary tabular-nums">
                      {r.costPerYouth ? `$${r.costPerYouth.toFixed(0)}` : "—"}
                    </td>
                    <td className="p-3 text-right text-slate-600 tabular-nums">
                      {r.costPerHour ? `$${r.costPerHour.toFixed(0)}` : "—"}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-slate-200 bg-slate-50/50">
                <td className="p-3 font-bold text-slate-800">Total</td>
                <td className="p-3 text-right font-medium text-slate-700 tabular-nums">${(totalDirect / 1000).toFixed(0)}k</td>
                <td className="p-3 text-right font-medium text-slate-700 tabular-nums">${(totalAllocated / 1000).toFixed(0)}k</td>
                <td className="p-3 text-right font-bold text-brand-deep tabular-nums">${(totalTrueCost / 1000).toFixed(0)}k</td>
                <td colSpan={3} />
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <SectionCard title="Cost-per-youth comparison" subtitle="Bigger ≠ better — depends on outcomes intensity">
          <ul className="space-y-3">
            {rows
              .filter((r) => r.costPerYouth)
              .sort((a, b) => (b.costPerYouth || 0) - (a.costPerYouth || 0))
              .map((r) => {
                const max = Math.max(...rows.map((x) => x.costPerYouth || 0));
                const pct = ((r.costPerYouth || 0) / max) * 100;
                return (
                  <li key={r.name}>
                    <div className="flex items-baseline justify-between text-sm mb-1">
                      <span className="text-slate-700">{r.name}</span>
                      <span className="text-slate-500 tabular-nums">${r.costPerYouth?.toFixed(0)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
          </ul>
        </SectionCard>

        <SectionCard title="What this enables">
          <ul className="space-y-3 text-sm text-slate-700">
            <li className="flex gap-2">
              <span className="text-brand-primary font-bold">→</span>
              <span><strong>Grant pricing:</strong> Know the true cost before you propose a $50k grant — never accept restricted funding below true cost without an explicit subsidy decision.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-primary font-bold">→</span>
              <span><strong>Sunset decisions:</strong> Bridges Mentorship costs $1,634/youth — 2.4× the Studio program. Use cost+outcomes together when deciding what to scale or sunset.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-primary font-bold">→</span>
              <span><strong>Funder honesty:</strong> "Our true overhead ratio is 27%, not 11%." High-trust funders respect that more than the fiction.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-primary font-bold">→</span>
              <span><strong>Pricing earned revenue:</strong> Tuition and contracts should cover at least direct + allocation, not just direct.</span>
            </li>
          </ul>
        </SectionCard>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-3xl font-serif text-brand-deep mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
