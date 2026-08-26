import { createFileRoute } from "@tanstack/react-router";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
} from "@/components/app-shell/AppShell";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/report/benchmarks")({
  head: () => ({ meta: [{ title: "Outcomes vs. Benchmarks — NMM Navigator" }] }),
  component: BenchmarksPage,
});

type Metric = {
  metric: string;
  category: "Financial" | "People" | "Programs" | "Fundraising" | "Governance";
  you: number;
  median: number;
  topQuartile: number;
  unit: string;
  higherIsBetter: boolean;
  source: string;
};

const METRICS: Metric[] = [
  { metric: "Operating reserves (months)", category: "Financial", you: 3.4, median: 4.2, topQuartile: 8.5, unit: "mo", higherIsBetter: true, source: "Candid · arts sector" },
  { metric: "Revenue concentration (HHI)", category: "Financial", you: 0.38, median: 0.34, topQuartile: 0.22, unit: "HHI", higherIsBetter: false, source: "Lovable peer set" },
  { metric: "Program ratio", category: "Financial", you: 0.78, median: 0.75, topQuartile: 0.82, unit: "%", higherIsBetter: true, source: "NCCS · arts orgs" },
  { metric: "Fundraising cost ratio", category: "Fundraising", you: 0.12, median: 0.15, topQuartile: 0.09, unit: "$ raised per $", higherIsBetter: false, source: "Charity Navigator" },
  { metric: "Donor retention (overall)", category: "Fundraising", you: 0.68, median: 0.45, topQuartile: 0.65, unit: "%", higherIsBetter: true, source: "Fundraising Effectiveness Project" },
  { metric: "Cost per youth served", category: "Programs", you: 1_092, median: 1_400, topQuartile: 900, unit: "$", higherIsBetter: false, source: "Wallace Foundation · OST" },
  { metric: "Program-hours per youth", category: "Programs", you: 30, median: 22, topQuartile: 45, unit: "hrs/yr", higherIsBetter: true, source: "Wallace Foundation · OST" },
  { metric: "Staff turnover", category: "People", you: 0.18, median: 0.27, topQuartile: 0.12, unit: "%", higherIsBetter: false, source: "Nonprofit HR" },
  { metric: "Board diversity (% BIPOC)", category: "Governance", you: 0.43, median: 0.32, topQuartile: 0.55, unit: "%", higherIsBetter: true, source: "BoardSource Index" },
  { metric: "Board giving participation", category: "Governance", you: 1.0, median: 0.87, topQuartile: 1.0, unit: "%", higherIsBetter: true, source: "BoardSource Index" },
];

const CATEGORY_TONE: Record<Metric["category"], string> = {
  Financial: "bg-emerald-100 text-emerald-700",
  People: "bg-amber-100 text-amber-700",
  Programs: "bg-violet-100 text-violet-700",
  Fundraising: "bg-brand-primary/15 text-brand-primary",
  Governance: "bg-slate-100 text-slate-700",
};

function position(m: Metric) {
  // 0..1: where you are between worst (median*0.5) and topQuartile
  if (m.higherIsBetter) {
    if (m.you >= m.topQuartile) return "top";
    if (m.you >= m.median) return "above-median";
    return "below-median";
  } else {
    if (m.you <= m.topQuartile) return "top";
    if (m.you <= m.median) return "above-median";
    return "below-median";
  }
}

function format(v: number, unit: string) {
  if (unit === "%") return `${Math.round(v * 100)}%`;
  if (unit === "$") return `$${v.toLocaleString()}`;
  if (unit === "$ raised per $") return `$${v.toFixed(2)}`;
  return `${v}${unit ? " " + unit : ""}`;
}

function BenchmarksPage() {
  const top = METRICS.filter((m) => position(m) === "top").length;
  const above = METRICS.filter((m) => position(m) === "above-median").length;
  const below = METRICS.filter((m) => position(m) === "below-median").length;

  return (
    <AppShell
      title="Outcomes vs. Benchmarks"
      subtitle="Your numbers against sector medians and top-quartile performers. Where do you punch above your weight — and where do you have homework?"
      actions={
        <>
          <GhostButton>Change peer set</GhostButton>
          <PrimaryButton>Export for board</PrimaryButton>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-brand-deep text-white rounded-2xl p-5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">Peer set</span>
          <p className="text-lg font-serif italic mt-2 leading-tight">Arts orgs · $1–3M · OST youth programs</p>
          <p className="text-xs text-slate-400 mt-2">n = 142 organizations · Candid + Wallace + NCCS</p>
        </div>
        <Stat label="Top quartile" value={top} tone="emerald" hint="Better than 75% of peers" />
        <Stat label="Above median" value={above} tone="amber" />
        <Stat label="Below median" value={below} tone="rose" hint="Priority for next plan cycle" />
      </div>

      <SectionCard title="Performance against peers" padding="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left p-3">Metric</th>
                <th className="text-left p-3">Category</th>
                <th className="text-right p-3">You</th>
                <th className="text-right p-3">Sector median</th>
                <th className="text-right p-3">Top quartile</th>
                <th className="text-left p-3">Position</th>
              </tr>
            </thead>
            <tbody>
              {METRICS.map((m) => {
                const p = position(m);
                const Icon = p === "top" ? ArrowUp : p === "below-median" ? ArrowDown : Minus;
                const color = p === "top" ? "text-emerald-600" : p === "below-median" ? "text-rose-600" : "text-amber-600";
                const label = p === "top" ? "Top quartile" : p === "above-median" ? "Above median" : "Below median";

                // Range bar: place "you" along worst→top scale
                let yPos: number;
                if (m.higherIsBetter) {
                  const min = Math.min(m.median * 0.5, m.you * 0.9);
                  const max = Math.max(m.topQuartile * 1.05, m.you * 1.05);
                  yPos = ((m.you - min) / (max - min)) * 100;
                } else {
                  const min = Math.min(m.topQuartile * 0.7, m.you * 0.9);
                  const max = Math.max(m.median * 1.4, m.you * 1.1);
                  yPos = 100 - ((m.you - min) / (max - min)) * 100;
                }
                yPos = Math.max(2, Math.min(98, yPos));

                return (
                  <tr key={m.metric} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="p-3">
                      <p className="font-medium text-slate-800">{m.metric}</p>
                      <p className="text-[10px] text-slate-400 italic">{m.source}</p>
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${CATEGORY_TONE[m.category]}`}>
                        {m.category}
                      </span>
                    </td>
                    <td className={`p-3 text-right font-medium tabular-nums ${color}`}>{format(m.you, m.unit)}</td>
                    <td className="p-3 text-right text-slate-500 tabular-nums">{format(m.median, m.unit)}</td>
                    <td className="p-3 text-right text-slate-500 tabular-nums">{format(m.topQuartile, m.unit)}</td>
                    <td className="p-3 w-48">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1 h-2 bg-slate-100 rounded-full">
                          <div className="absolute inset-y-0 bg-amber-200 rounded-full" style={{ left: "33%", right: "33%" }} />
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 size-3 rounded-full border-2 border-white shadow ${
                              p === "top" ? "bg-emerald-500" : p === "below-median" ? "bg-rose-500" : "bg-amber-500"
                            }`}
                            style={{ left: `${yPos}%`, transform: "translate(-50%, -50%)" }}
                          />
                        </div>
                        <span className={`text-xs flex items-center gap-1 ${color} shrink-0 w-28`}>
                          <Icon className="size-3" /> {label}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <SectionCard title="Strengths to lead with">
          <ul className="space-y-3 text-sm">
            {METRICS.filter((m) => position(m) === "top").map((m) => (
              <li key={m.metric} className="flex items-start gap-2">
                <ArrowUp className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-800">{m.metric}</p>
                  <p className="text-xs text-slate-500">Use in funder narratives + board materials.</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Gaps to close">
          <ul className="space-y-3 text-sm">
            {METRICS.filter((m) => position(m) === "below-median").map((m) => (
              <li key={m.metric} className="flex items-start gap-2">
                <ArrowDown className="size-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-800">{m.metric}</p>
                  <p className="text-xs text-slate-500">Set 18-month improvement target with a named owner.</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, hint, tone = "neutral" }: { label: string; value: number; hint?: string; tone?: "neutral" | "emerald" | "amber" | "rose" }) {
  const color = { neutral: "text-brand-deep", emerald: "text-emerald-600", amber: "text-amber-600", rose: "text-rose-600" }[tone];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`text-4xl font-serif mt-1 tabular-nums ${color}`}>{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
