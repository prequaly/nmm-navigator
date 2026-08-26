import { createFileRoute } from "@tanstack/react-router";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
} from "@/components/app-shell/AppShell";
import { DemoDataBanner } from "@/components/app-shell/DataState";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

export const Route = createFileRoute("/_authenticated/fund/scenarios")({
  head: () => ({ meta: [{ title: "Scenario Modeling — NMM Navigator" }] }),
  component: ScenariosPage,
});

const YEARS = ["FY26", "FY27", "FY28", "FY29", "FY30"];

const DATA = YEARS.map((yr, i) => {
  const base = 1400 + i * 80;
  const best = 1400 + i * 140;
  const worst = 1400 - i * 30;
  return {
    year: yr,
    Best: best,
    Base: base,
    Worst: worst,
    BestExpense: 1380 + i * 110,
    BaseExpense: 1380 + i * 70,
    WorstExpense: 1380 + i * 50,
  };
});

const SCENARIOS = [
  {
    key: "Best",
    color: "#10b981",
    label: "Best case",
    headline: "+10% rev / yr",
    description: "Hartwell renews 5-year; corporate sponsorship doubles; earned revenue scales with site expansion.",
    fyEndReserves: 8.4,
    netChange: 280,
  },
  {
    key: "Base",
    color: "#0f172a",
    label: "Base case",
    headline: "+6% rev / yr",
    description: "Hartwell renews 3-year; modest growth in individual giving; sustain current 3 anchor sites.",
    fyEndReserves: 5.6,
    netChange: 60,
  },
  {
    key: "Worst",
    color: "#dc2626",
    label: "Worst case",
    headline: "−2% rev / yr",
    description: "Hartwell exits at end of FY26; one corp sponsor lost; state arts funding cut 30%.",
    fyEndReserves: 1.2,
    netChange: -340,
  },
];

const LEVERS = [
  { lever: "Hartwell renewal", best: "5yr @ $300k", base: "3yr @ $250k", worst: "Exit FY26" },
  { lever: "Individual giving", best: "+25% / yr", base: "+8% / yr", worst: "Flat" },
  { lever: "Govt contracts", best: "+2 contracts", base: "Renew", worst: "Lose 1" },
  { lever: "Earned revenue", best: "+40% (site 4)", base: "+10%", worst: "Flat" },
  { lever: "Staff comp", best: "+5% / yr", base: "+3.5% / yr", worst: "Freeze" },
  { lever: "New site investment", best: "Open FY28", base: "Plan only", worst: "Defer" },
];

function ScenariosPage() {
  return (
    <AppShell
      title="Multi-Year Scenario Modeling"
      subtitle="Best · Base · Worst — across 5 years. Stress-test the strategic plan against the futures you can imagine."
      actions={
        <>
          <GhostButton>Edit assumptions</GhostButton>
          <PrimaryButton>Save scenario</PrimaryButton>
        </>
      }
    >
      <DemoDataBanner
        message="Scenarios shown use sample assumptions. Edit the driver assumptions below and add your actual budget to generate scenarios for your organization."
        ctaLabel="Edit budget"
        ctaTo="/fund/budget"
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

        {SCENARIOS.map((s) => (
          <div
            key={s.key}
            className="rounded-2xl p-6 border-2"
            style={{ borderColor: s.color, background: `${s.color}06` }}
          >
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: s.color }}>
                {s.label}
              </span>
              <span className="text-xs font-medium text-slate-500">{s.headline}</span>
            </div>
            <p className="text-sm text-slate-700 mb-4">{s.description}</p>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/60">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">FY30 reserves</p>
                <p className="text-2xl font-serif tabular-nums" style={{ color: s.color }}>{s.fyEndReserves.toFixed(1)} mo</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">5-yr net</p>
                <p className={`text-2xl font-serif tabular-nums ${s.netChange < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {s.netChange > 0 ? "+" : ""}${s.netChange}k
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <SectionCard title="Revenue projection" subtitle="$ in thousands">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={DATA} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}k`}
              />
              <Tooltip
                formatter={(v: any, n: string) => [`$${v}k`, n]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <ReferenceLine y={1400} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: "FY26 baseline", position: "right", fontSize: 10, fill: "#94a3b8" }} />
              <Line type="monotone" dataKey="Best" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Base" stroke="#0f172a" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Worst" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3 }} strokeDasharray="6 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="Driver assumptions" subtitle="Adjust to rebuild the curves" padding="p-0" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left p-3">Driver</th>
                <th className="text-left p-3 text-emerald-700">Best</th>
                <th className="text-left p-3 text-slate-700">Base</th>
                <th className="text-left p-3 text-rose-700">Worst</th>
              </tr>
            </thead>
            <tbody>
              {LEVERS.map((l) => (
                <tr key={l.lever} className="border-t border-slate-100">
                  <td className="p-3 font-medium text-slate-800">{l.lever}</td>
                  <td className="p-3 text-emerald-700">{l.best}</td>
                  <td className="p-3 text-slate-700">{l.base}</td>
                  <td className="p-3 text-rose-700">{l.worst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Strategic implications" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="border border-emerald-200 bg-emerald-50/40 rounded-lg p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-2">If best case</p>
            <p className="text-slate-700">Open Site 4 in FY28. Build endowment quietly. Hire DevOps for CRM.</p>
          </div>
          <div className="border border-slate-200 bg-slate-50/40 rounded-lg p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-2">If base case</p>
            <p className="text-slate-700">Sustain 3 sites; deepen, don't widen. Hit reserve target by FY28.</p>
          </div>
          <div className="border border-rose-200 bg-rose-50/40 rounded-lg p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700 mb-2">If worst case</p>
            <p className="text-slate-700">Activate continuity plan: consolidate to 2 sites, reduce comp growth, draw down reserves to floor.</p>
          </div>
        </div>
      </SectionCard>
    </AppShell>
  );
}
