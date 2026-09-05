import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, SectionCard, EmptyState } from "@/components/app-shell/AppShell";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { fetchBenchmarkTrendData } from "@/lib/exports/data";
import { ArrowUp, ArrowDown, Minus, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/report/benchmarks")({
  head: () => ({ meta: [{ title: "Outcomes Over Time — NMM Navigator" }] }),
  component: BenchmarksPage,
});

const TITLES: Record<string, string> = {
  health: "Strategic Planning Health",
  capacity: "Organizational Capacity",
  financial: "Financial Health",
  fundraising: "Fundraising Readiness",
  "program-impact": "Program Impact",
  governance: "Board Governance",
  community: "Community Engagement",
  digital: "Digital Presence",
  dei: "DEI / Equity Audit",
  impact: "IMPACT Framework",
  "4rs": "4Rs Framework",
};

type Row = {
  assessment_type: string;
  score: number | null;
  maturity_level: string | null;
  completed_at: string | null;
};
type Series = { type: string; label: string; points: Array<{ score: number; date: string }> };

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) {
    return <div className="text-[10px] text-slate-400 italic">Retake to chart a trend</div>;
  }
  const w = 120;
  const h = 32;
  const min = Math.min(...points, 0);
  const max = Math.max(...points, 100);
  const range = max - min || 1;
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="text-brand-primary"
      />
      {coords.map((c, i) => {
        const [x, y] = c.split(",").map(Number);
        return <circle key={i} cx={x} cy={y} r={2.5} className="fill-brand-primary" />;
      })}
    </svg>
  );
}

function BenchmarksPage() {
  const { orgId, loading } = useCurrentOrg();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!orgId) return;
    fetchBenchmarkTrendData(orgId).then(setRows);
  }, [orgId]);

  if (loading || rows === null) {
    return (
      <AppShell title="Outcomes Over Time" subtitle="Loading your assessment history…">
        <SectionCard padding="p-10">
          <div className="text-center text-sm text-slate-500">Loading…</div>
        </SectionCard>
      </AppShell>
    );
  }

  const byType = new Map<string, Row[]>();
  for (const r of rows) {
    if (r.score == null || !r.completed_at) continue;
    if (!byType.has(r.assessment_type)) byType.set(r.assessment_type, []);
    byType.get(r.assessment_type)!.push(r);
  }

  const series: Series[] = Array.from(byType.entries()).map(([type, entries]) => ({
    type,
    label: TITLES[type] ?? type,
    points: entries.map((e) => ({ score: e.score!, date: e.completed_at! })),
  }));
  series.sort((a, b) => a.label.localeCompare(b.label));

  const withTrend = series.filter((s) => s.points.length >= 2);
  const improving = withTrend.filter((s) => s.points.at(-1)!.score > s.points.at(-2)!.score).length;
  const declining = withTrend.filter((s) => s.points.at(-1)!.score < s.points.at(-2)!.score).length;
  const flat = withTrend.length - improving - declining;
  const latestScores = series.map((s) => s.points.at(-1)!.score);
  const avgScore = latestScores.length
    ? Math.round(latestScores.reduce((a, b) => a + b, 0) / latestScores.length)
    : null;

  if (series.length === 0) {
    return (
      <AppShell
        title="Outcomes Over Time"
        subtitle="Track your own progress across every assessment you complete."
      >
        <EmptyState
          title="No completed assessments yet"
          description="Complete an assessment to set your first baseline. Retake it next quarter and this page will start charting your trend."
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Outcomes Over Time"
      subtitle="Your own scores, tracked assessment-by-assessment over time — no external peer set, just your organization's real trajectory."
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-brand-deep text-white rounded-2xl p-5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">
            Average Score
          </span>
          <p className="text-4xl font-serif mt-2 tabular-nums">{avgScore ?? "—"}</p>
          <p className="text-xs text-slate-400 mt-2">
            Across {series.length} assessment{series.length === 1 ? "" : "s"} completed
          </p>
        </div>
        <Stat label="Improving" value={improving} tone="emerald" hint="Since previous completion" />
        <Stat label="Declining" value={declining} tone="rose" />
        <Stat label="Unchanged" value={flat} tone="neutral" />
      </div>

      <SectionCard title="Your Progress by Assessment" padding="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left p-3">Assessment</th>
                <th className="text-left p-3">Trend</th>
                <th className="text-right p-3">Latest Score</th>
                <th className="text-right p-3">Change</th>
                <th className="text-left p-3">Completions</th>
                <th className="text-left p-3">Last Completed</th>
              </tr>
            </thead>
            <tbody>
              {series.map((s) => {
                const latest = s.points.at(-1)!;
                const prev = s.points.length >= 2 ? s.points.at(-2)! : null;
                const delta = prev ? latest.score - prev.score : null;
                const Icon =
                  delta == null ? Minus : delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
                const color =
                  delta == null
                    ? "text-slate-400"
                    : delta > 0
                      ? "text-emerald-600"
                      : delta < 0
                        ? "text-rose-600"
                        : "text-slate-500";
                return (
                  <tr key={s.type} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="p-3 font-medium text-slate-800">{s.label}</td>
                    <td className="p-3">
                      <Sparkline points={s.points.map((p) => p.score)} />
                    </td>
                    <td className="p-3 text-right font-medium tabular-nums text-slate-800">
                      {latest.score}
                    </td>
                    <td className={`p-3 text-right tabular-nums ${color}`}>
                      <span className="inline-flex items-center gap-1 justify-end">
                        <Icon className="size-3" />{" "}
                        {delta == null ? "Baseline" : `${delta > 0 ? "+" : ""}${delta}`}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">{s.points.length}</td>
                    <td className="p-3 text-slate-500">{formatDate(latest.date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="mt-6 flex items-start gap-2 text-xs text-slate-500">
        <TrendingUp className="size-3.5 shrink-0 mt-0.5" />
        Retake any assessment periodically (quarterly is typical) to build a real trend line here —
        a single completion sets your baseline but can't yet show direction.
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "neutral" | "emerald" | "rose";
}) {
  const color = { neutral: "text-brand-deep", emerald: "text-emerald-600", rose: "text-rose-600" }[
    tone
  ];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`text-4xl font-serif mt-1 tabular-nums ${color}`}>{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
