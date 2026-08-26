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
  ReferenceArea,
} from "recharts";
import { TrendingUp, ShieldCheck, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/fund/reserves")({
  head: () => ({ meta: [{ title: "Operating Reserves — NMM Navigator" }] }),
  component: ReservesPage,
});

const MONTHLY_EXPENSE = 116_000; // ~$1.4M / 12
const CURRENT_RESERVE = 395_000; // ~3.4 months
const TARGET_MONTHS = 6;
const POLICY_MIN_MONTHS = 3;

const HISTORY = [
  { month: "Oct '25", reserve: 280, months: 280 / 116 },
  { month: "Nov '25", reserve: 295, months: 295 / 116 },
  { month: "Dec '25", reserve: 345, months: 345 / 116 },
  { month: "Jan '26", reserve: 360, months: 360 / 116 },
  { month: "Feb '26", reserve: 355, months: 355 / 116 },
  { month: "Mar '26", reserve: 372, months: 372 / 116 },
  { month: "Apr '26", reserve: 380, months: 380 / 116 },
  { month: "May '26", reserve: 388, months: 388 / 116 },
  { month: "Jun '26", reserve: 395, months: 395 / 116 },
  // Projection
  { month: "Jul '26", reserve: 405, months: 405 / 116, projected: true },
  { month: "Aug '26", reserve: 425, months: 425 / 116, projected: true },
  { month: "Sep '26", reserve: 450, months: 450 / 116, projected: true },
];

const months = CURRENT_RESERVE / MONTHLY_EXPENSE;
const targetReserve = TARGET_MONTHS * MONTHLY_EXPENSE;
const gap = targetReserve - CURRENT_RESERVE;
const monthlyContribution = 18_000;
const monthsToTarget = Math.ceil(gap / monthlyContribution);

function ReservesPage() {
  const tone =
    months >= TARGET_MONTHS
      ? { color: "#10b981", label: "Healthy", note: "You're at or above policy target." }
      : months >= POLICY_MIN_MONTHS
      ? { color: "#f59e0b", label: "Building", note: "Above policy minimum, building toward target." }
      : { color: "#dc2626", label: "Below policy minimum", note: "Below the board-approved floor. Treat as urgent." };

  return (
    <AppShell
      title="Operating Reserves"
      subtitle="How many months could you operate if revenue stopped tomorrow? Sector standard for arts orgs is 6 months."
      actions={
        <>
          <GhostButton>Reserves policy</GhostButton>
          <PrimaryButton>Update balance</PrimaryButton>
        </>
      }
    >
      <DemoDataBanner
        message="Reserve balance and history shown here are illustrative. Enter your current cash reserve and monthly expenses to see real runway."
        ctaLabel="Update balance"
        ctaTo="/fund/budget"
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        <div className="bg-brand-deep text-white rounded-2xl p-8 lg:col-span-2 relative overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">Months of runway</span>
          <div className="grid grid-cols-3 gap-6 mt-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current</p>
              <p className="text-6xl font-serif mt-1" style={{ color: tone.color }}>{months.toFixed(1)}</p>
              <p className="text-xs text-slate-400 mt-1">${(CURRENT_RESERVE / 1000).toFixed(0)}k</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Policy min</p>
              <p className="text-6xl font-serif mt-1 text-slate-300">{POLICY_MIN_MONTHS}.0</p>
              <p className="text-xs text-slate-400 mt-1">${(POLICY_MIN_MONTHS * MONTHLY_EXPENSE / 1000).toFixed(0)}k</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Target</p>
              <p className="text-6xl font-serif mt-1 text-brand-accent">{TARGET_MONTHS}.0</p>
              <p className="text-xs text-slate-400 mt-1">${(targetReserve / 1000).toFixed(0)}k</p>
            </div>
          </div>
          <p className="text-sm font-serif italic mt-6" style={{ color: tone.color }}>{tone.label}</p>
          <p className="text-slate-400 text-sm mt-1">{tone.note}</p>
        </div>

        <SectionCard title="Path to target">
          <ul className="space-y-3 text-sm">
            <Row icon={TrendingUp} label="Gap to target" value={`$${(gap / 1000).toFixed(0)}k`} />
            <Row icon={ShieldCheck} label="Monthly contribution plan" value={`$${(monthlyContribution / 1000).toFixed(0)}k`} />
            <Row icon={AlertTriangle} label="Months to reach target" value={`${monthsToTarget} mo`} tone="warn" />
          </ul>
          <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500 italic">
            Reserves are funded from board-designated unrestricted surplus and a 3% allocation off every unrestricted grant.
          </div>
        </SectionCard>
      </div>

      <SectionCard title="12-month trajectory" subtitle="Solid line = actual · dashed = projected">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={HISTORY} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <defs />
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v.toFixed(1)}mo`}
                domain={[0, 8]}
              />
              <Tooltip
                formatter={(v: any) => [`${v.toFixed(1)} months`, "Runway"]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <ReferenceArea y1={0} y2={POLICY_MIN_MONTHS} fill="#fee2e2" fillOpacity={0.4} />
              <ReferenceArea y1={POLICY_MIN_MONTHS} y2={TARGET_MONTHS} fill="#fef3c7" fillOpacity={0.4} />
              <ReferenceArea y1={TARGET_MONTHS} y2={8} fill="#d1fae5" fillOpacity={0.4} />
              <ReferenceLine y={POLICY_MIN_MONTHS} stroke="#dc2626" strokeDasharray="3 3" label={{ value: "Policy min", position: "right", fontSize: 10, fill: "#dc2626" }} />
              <ReferenceLine y={TARGET_MONTHS} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Target", position: "right", fontSize: 10, fill: "#10b981" }} />
              <Line type="monotone" dataKey="months" stroke="#0f172a" strokeWidth={2.5} dot={{ r: 3, fill: "#0f172a" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <SectionCard title="Stress test scenarios" subtitle="What if a top funder churned tomorrow?">
          <ul className="space-y-3 text-sm">
            <Scenario label="Lose largest funder (Hartwell, $250k)" before={months} after={(CURRENT_RESERVE - 0) / (MONTHLY_EXPENSE + 0)} note="Runway unchanged short-term; rebuilding takes 18+ mo" />
            <Scenario label="Lose top 2 funders" before={months} after={months * 0.6} note="Critical — would breach policy minimum within 2 months" />
            <Scenario label="Summer cash dip (Jun–Aug)" before={months} after={months - 0.8} note="Manageable with current trajectory + line of credit" />
          </ul>
        </SectionCard>

        <SectionCard title="Industry benchmarks" subtitle="Where peer arts nonprofits sit">
          <ul className="space-y-3 text-sm">
            <Bench label="National sector median (all NPOs)" value="3.0 months" />
            <Bench label="Arts & culture sector median" value="4.2 months" />
            <Bench label="High-performing arts orgs (top quartile)" value="8.5 months" />
            <Bench label="GuideStar/Candid recommendation" value="6+ months" highlight />
          </ul>
        </SectionCard>
      </div>
    </AppShell>
  );
}

function Row({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone?: "warn" }) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-700">
        <Icon className="size-4 text-slate-400" /> {label}
      </span>
      <span className={`tabular-nums font-medium ${tone === "warn" ? "text-amber-700" : "text-brand-deep"}`}>{value}</span>
    </li>
  );
}

function Scenario({ label, before, after, note }: { label: string; before: number; after: number; note: string }) {
  return (
    <li>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-slate-700">{label}</span>
        <span className="text-xs text-slate-500 tabular-nums">{before.toFixed(1)} → <span className={after < POLICY_MIN_MONTHS ? "text-rose-600 font-medium" : "text-amber-600"}>{after.toFixed(1)} mo</span></span>
      </div>
      <p className="text-xs text-slate-500 italic">{note}</p>
    </li>
  );
}

function Bench({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <li className={`flex items-center justify-between p-2 rounded-md ${highlight ? "bg-brand-primary/5" : ""}`}>
      <span className="text-slate-700">{label}</span>
      <span className={`tabular-nums font-medium ${highlight ? "text-brand-primary" : "text-slate-600"}`}>{value}</span>
    </li>
  );
}
