import { createFileRoute } from "@tanstack/react-router";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
} from "@/components/app-shell/AppShell";
import { DemoDataBanner } from "@/components/app-shell/DataState";
import { ResponsiveContainer, PieChart as RPieChart, Pie, Cell } from "recharts";
import { AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/fund/donor-segments")({
  head: () => ({ meta: [{ title: "Donor Segments — NMM Navigator" }] }),
  component: DonorSegments,
});

type Segment = {
  key: string;
  label: string;
  count: number;
  total: number;
  avg: number;
  retention: number; // 0-1
  yoyChange: number; // percentage points
  color: string;
};

const SEGMENTS: Segment[] = [
  { key: "major", label: "Major ($10k+)", count: 14, total: 480_000, avg: 34_286, retention: 0.92, yoyChange: 0.04, color: "#0f172a" },
  { key: "mid", label: "Mid-level ($1k–$10k)", count: 78, total: 215_000, avg: 2_756, retention: 0.78, yoyChange: -0.05, color: "#2563eb" },
  { key: "grassroots", label: "Grassroots (<$1k)", count: 612, total: 142_000, avg: 232, retention: 0.62, yoyChange: 0.08, color: "#10b981" },
  { key: "sustainer", label: "Monthly sustainers", count: 96, total: 86_000, avg: 896, retention: 0.94, yoyChange: 0.18, color: "#f59e0b" },
  { key: "corporate", label: "Corporate", count: 9, total: 95_000, avg: 10_556, retention: 0.67, yoyChange: -0.11, color: "#8b5cf6" },
  { key: "events", label: "Event-only", count: 184, total: 68_000, avg: 370, retention: 0.41, yoyChange: 0.02, color: "#ec4899" },
];

const LYBUNT_SYBUNT = [
  { type: "LYBUNT", count: 142, total: 78_000, note: "Gave last year, not yet this year — call them in October" },
  { type: "SYBUNT", count: 89, total: 41_000, note: "Gave some prior year, not last year — appeal touch in November" },
  { type: "At-risk monthly", count: 6, total: 5_400, note: "Failed last payment — Stripe retry + personal call" },
];

function DonorSegments() {
  const totalDonors = SEGMENTS.reduce((a, b) => a + b.count, 0);
  const totalRevenue = SEGMENTS.reduce((a, b) => a + b.total, 0);

  return (
    <AppShell
      title="Donor Segmentation"
      subtitle="Who gives, how much, how loyal, and which segments power the touchpoint cadence."
      actions={
        <>
          <GhostButton>Sync from CRM</GhostButton>
          <PrimaryButton>Export to touchpoints</PrimaryButton>
        </>
      }
    >
      <DemoDataBanner
        message="These segments are illustrative. Sync your CRM or upload a donor list to see your real giving patterns."
        ctaLabel="Connect CRM"
        ctaTo="/profile"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Active donors" value={totalDonors.toLocaleString()} hint="Gave in last 13 months" />
        <Stat label="Donor revenue YTD" value={`$${(totalRevenue / 1000).toFixed(0)}k`} hint="Individual + corporate" />
        <Stat label="Avg retention" value={`${Math.round((SEGMENTS.reduce((a, b) => a + b.retention * b.count, 0) / totalDonors) * 100)}%`} hint="Weighted by donor count" />
        <Stat label="At-risk donors" value={LYBUNT_SYBUNT.reduce((a, b) => a + b.count, 0).toString()} tone="warn" hint="LYBUNT + SYBUNT" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Revenue by segment" className="lg:col-span-2" padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="text-left p-3">Segment</th>
                  <th className="text-right p-3">Donors</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-right p-3">Avg gift</th>
                  <th className="text-right p-3">Retention</th>
                  <th className="text-right p-3">YoY</th>
                </tr>
              </thead>
              <tbody>
                {SEGMENTS.map((s) => (
                  <tr key={s.key} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: s.color }} />
                        <span className="font-medium text-slate-800">{s.label}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right text-slate-600 tabular-nums">{s.count}</td>
                    <td className="p-3 text-right font-medium text-brand-deep tabular-nums">${(s.total / 1000).toFixed(0)}k</td>
                    <td className="p-3 text-right text-slate-500 tabular-nums">${s.avg.toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <span className={`tabular-nums ${s.retention >= 0.8 ? "text-emerald-600" : s.retention >= 0.6 ? "text-amber-600" : "text-rose-600"}`}>
                        {Math.round(s.retention * 100)}%
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`inline-flex items-center gap-0.5 tabular-nums text-xs ${s.yoyChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {s.yoyChange >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                        {Math.abs(Math.round(s.yoyChange * 100))}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Revenue mix">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <RPieChart>
                <Pie data={SEGMENTS} dataKey="total" innerRadius={42} outerRadius={70} paddingAngle={2}>
                  {SEGMENTS.map((s) => (
                    <Cell key={s.key} fill={s.color} />
                  ))}
                </Pie>
              </RPieChart>
            </ResponsiveContainer>
          </div>
          <ul className="text-xs space-y-1.5 mt-3">
            {SEGMENTS.slice()
              .sort((a, b) => b.total - a.total)
              .slice(0, 4)
              .map((s) => (
                <li key={s.key} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600 truncate">
                    <span className="size-2 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="tabular-nums text-slate-500">{Math.round((s.total / totalRevenue) * 100)}%</span>
                </li>
              ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="At-risk lists" subtitle="Surface these for the next touchpoint cycle" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {LYBUNT_SYBUNT.map((l) => (
            <div key={l.type} className="border border-amber-200 bg-amber-50/40 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="size-4 text-amber-600" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800">{l.type}</p>
              </div>
              <p className="text-3xl font-serif text-amber-900 tabular-nums">{l.count}</p>
              <p className="text-xs text-amber-800 tabular-nums">${(l.total / 1000).toFixed(0)}k at stake</p>
              <p className="text-xs text-slate-600 italic mt-2">{l.note}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Touchpoint priority queue" subtitle="What this segmentation tells the Touchpoint Calendar to do next" className="mt-6">
        <ul className="space-y-3 text-sm text-slate-700">
          <li className="flex gap-2">
            <span className="text-brand-primary font-bold">→</span>
            <span><strong>Monthly sustainers (96, $86k):</strong> 94% retention but YoY +18%. Easiest growth lever — push acquisition campaign in November.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-brand-primary font-bold">→</span>
            <span><strong>Mid-level slipping (-5%):</strong> Retention drop. Personal calls from board chair to top 25 mid-level donors before year-end.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-brand-primary font-bold">→</span>
            <span><strong>Corporate (-11%):</strong> Two sponsors didn't renew. Need ED meetings with all 9 corporate funders in Q1.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-brand-primary font-bold">→</span>
            <span><strong>Event-only (41% retention):</strong> Lowest loyalty. Test a "graduate to monthly" appeal in showcase follow-up.</span>
          </li>
        </ul>
      </SectionCard>
    </AppShell>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "warn" }) {
  const color = tone === "warn" ? "text-amber-700" : "text-brand-deep";
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`text-3xl font-serif mt-1 tabular-nums ${color}`}>{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
