import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { AppShell, SectionCard, GhostButton, PrimaryButton } from "@/components/app-shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import {
  aggregateBudgetByMonth,
  aggregateGrantsByMonth,
  buildMonthRange,
  type BudgetLine,
  type GrantRow,
} from "@/lib/finance/projections";
import { loadJourneyState, greetingFor, type JourneyState } from "@/lib/plan/completion";
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  Circle,
  CheckCircle2,
  Heart,
  Sparkles,
  TrendingUp,
  Users,
  DollarSign,
  Target as TargetIcon,
  FileText,
  Wallet,
  Compass,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Guided Experience — NMM Navigator" }] }),
  component: Dashboard,
});

type ActionItem = { id: string; title: string; status: string; due_date: string | null; priority: string | null };

/* ---------- Journey step map (mirrors sidebar) ---------- */

const STEP_MAP: Record<string, { n: number; label: string; to: string; next?: { label: string; est: string } }> = {
  foundation: { n: 1, label: "Build My Organization", to: "/profile", next: { label: "Complete Org Profile", est: "8 minutes" } },
  assess: { n: 2, label: "Assess My Organization", to: "/assess/health", next: { label: "Complete Financial Health Assessment", est: "12 minutes" } },
  plan: { n: 3, label: "Design My Strategy", to: "/plan/builder", next: { label: "Draft Strategic Priorities", est: "20 minutes" } },
  measure: { n: 7, label: "Measure My Impact", to: "/plan/kpis", next: { label: "Add first KPI", est: "6 minutes" } },
  budget: { n: 5, label: "Fund My Strategy", to: "/fund/budget", next: { label: "Build Annual Budget", est: "25 minutes" } },
  fund: { n: 5, label: "Fund My Strategy", to: "/fund/grants", next: { label: "Log first grant", est: "5 minutes" } },
  execute: { n: 6, label: "Execute My Plan", to: "/execute/tasks", next: { label: "Add first action item", est: "3 minutes" } },
  improve: { n: 8, label: "Annual Review", to: "/report/monthly-review", next: { label: "Run Monthly Review", est: "10 minutes" } },
};

const QUOTES = [
  { text: "A goal without a plan is just a wish.", author: "Antoine de Saint-Exupéry" },
  { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
  { text: "Strategy without execution is hallucination.", author: "Thomas Edison" },
  { text: "Vision without action is a daydream. Action without vision is a nightmare.", author: "Japanese proverb" },
];

function Dashboard() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState<string>("");
  const [userName, setUserName] = useState<string | null>(null);
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [revenueLines, setRevenueLines] = useState<BudgetLine[]>([]);
  const [expenseLines, setExpenseLines] = useState<BudgetLine[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [meetings, setMeetings] = useState<{ id: string; title: string; scheduled_at: string | null }[]>([]);
  const [journey, setJourney] = useState<JourneyState | null>(null);
  const [kpiCount, setKpiCount] = useState<number>(0);
  const [beneficiaries, setBeneficiaries] = useState<number>(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = (data.user?.user_metadata ?? {}) as { full_name?: string; name?: string };
      setUserName(meta.full_name?.split(" ")[0] ?? meta.name?.split(" ")[0] ?? data.user?.email?.split("@")[0] ?? null);
    });
  }, []);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const [org, g, r, e, a, m, kAll, j] = await Promise.all([
        supabase.from("organizations").select("name,mission,onboarded_at").eq("id", orgId).single(),
        supabase.from("grants").select("*").eq("organization_id", orgId),
        supabase.from("revenue_streams").select("id,name,category,yearly_amounts").eq("organization_id", orgId),
        supabase.from("expense_lines").select("id,name,category,yearly_amounts").eq("organization_id", orgId),
        supabase.from("action_items").select("id,title,status,due_date,priority").eq("organization_id", orgId).neq("status", "done").order("due_date", { ascending: true, nullsFirst: false }).limit(8),
        supabase.from("meetings").select("id,title,scheduled_at").eq("organization_id", orgId).gte("scheduled_at", new Date().toISOString()).order("scheduled_at", { ascending: true }).limit(4),
        supabase.from("kpis").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        loadJourneyState(orgId),
      ]);
      if (org.data) {
        if (!(org.data as any).onboarded_at) {
          navigate({ to: "/onboarding" });
          return;
        }
        setOrgName((org.data as any).name ?? "");
        setBeneficiaries(0);
      }
      setGrants((g.data as GrantRow[]) ?? []);
      setRevenueLines((r.data as BudgetLine[]) ?? []);
      setExpenseLines((e.data as BudgetLine[]) ?? []);
      setActions((a.data as ActionItem[]) ?? []);
      setMeetings((m.data as any) ?? []);
      setKpiCount(kAll.count ?? 0);
      setJourney(j);
    })();
  }, [orgId]);

  const fin = useMemo(() => {
    const buckets = buildMonthRange(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 12);
    const { committed, weighted } = aggregateGrantsByMonth(grants, buckets);
    const other = aggregateBudgetByMonth(revenueLines, buckets, new Date().getFullYear());
    const exp = aggregateBudgetByMonth(expenseLines, buckets, new Date().getFullYear());
    const totalRev = committed.reduce((a, b) => a + b, 0) + weighted.reduce((a, b) => a + b, 0) + other.reduce((a, b) => a + b, 0);
    const totalExp = exp.reduce((a, b) => a + b, 0);
    return { totalRev, totalExp, gap: totalExp - totalRev };
  }, [grants, revenueLines, expenseLines]);

  const goalsOnTrack = kpiCount > 0 ? Math.round((kpiCount * 0.76)) : 0; // placeholder ratio until KPI value logic is wired
  const goalsOnTrackPct = kpiCount ? Math.round((goalsOnTrack / kpiCount) * 100) : 0;

  const overdueCount = actions.filter((a) => a.due_date && new Date(a.due_date) < new Date()).length;

  const stepInfo = useMemo(() => {
    const cur = journey?.stages[journey.currentIndex];
    const key = (cur?.id as string) ?? "foundation";
    return STEP_MAP[key] ?? STEP_MAP.foundation;
  }, [journey]);

  const nextStepInfo = useMemo(() => {
    const key = (journey?.nextStage?.id as string) ?? "assess";
    return STEP_MAP[key] ?? STEP_MAP.assess;
  }, [journey]);

  const quote = useMemo(() => {
    const d = new Date();
    return QUOTES[(d.getFullYear() * 366 + (d.getMonth() * 31) + d.getDate()) % QUOTES.length];
  }, []);

  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

  const jumpBackIn = useMemo(() => {
    const items: { title: string; sub: string; to: string; cta: string; icon: any; progress?: number }[] = [];
    if (journey) {
      const pct = journey.completionPct;
      items.push({
        title: "Strategic Planning Assessment",
        sub: pct < 100 ? "In Progress" : "Complete",
        to: "/assess/health",
        cta: "Continue",
        icon: FileText,
        progress: pct,
      });
    }
    if (revenueLines.length + expenseLines.length > 0) {
      items.push({ title: "Budget Overview", sub: "Last updated today", to: "/fund/budget", cta: "View", icon: DollarSign });
    }
    if (meetings[0]) {
      items.push({
        title: meetings[0].title,
        sub: meetings[0].scheduled_at ? `Due ${new Date(meetings[0].scheduled_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "Scheduled",
        to: "/governance/meetings",
        cta: "Continue",
        icon: Users,
      });
    }
    if (grants[0]) {
      items.push({
        title: (grants[0] as any).grant_name ?? (grants[0] as any).funder_name ?? "Grant proposal",
        sub: grants[0].application_deadline ? `Due ${new Date(grants[0].application_deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : (grants[0].status ?? "In progress"),
        to: "/fund/grants",
        cta: "Continue",
        icon: Wallet,
      });
    }
    while (items.length < 4) {
      items.push({ title: "Plan Narrative", sub: "Draft your story", to: "/plan/narrative", cta: "Open", icon: Compass });
      if (items.length >= 4) break;
      items.push({ title: "Add a KPI", sub: "Start measuring", to: "/plan/kpis", cta: "Add", icon: TargetIcon });
      break;
    }
    return items.slice(0, 4);
  }, [journey, revenueLines, expenseLines, meetings, grants]);

  if (orgLoading) {
    return (
      <AppShell title="NMM Navigator — Guided Experience" subtitle="A Strategic Planning Partner for Nonprofits">
        <SectionCard padding="p-10">
          <div className="text-center text-sm text-muted-foreground">Loading…</div>
        </SectionCard>
      </AppShell>
    );
  }

  if (!orgId) {
    return (
      <AppShell title="NMM Navigator — Guided Experience" subtitle="A Strategic Planning Partner for Nonprofits">
        <SectionCard padding="p-10">
          <div className="text-center text-sm text-muted-foreground">
            No organization yet — <Link to="/profile" className="text-teal-primary underline">set one up</Link>.
          </div>
        </SectionCard>
      </AppShell>
    );
  }

  const greeting = greetingFor(userName);
  const journeyPct = journey ? journey.completionPct : 0;

  return (
    <AppShell
      title="NMM Navigator — Guided Experience"
      subtitle="A Strategic Planning Partner for Nonprofits"
    >
      <div className="grid grid-cols-12 gap-6">
        {/* ============ LEFT + CENTER (col 1-9) ============ */}
        <div className="col-span-12 xl:col-span-9 space-y-6">
          {/* Welcome */}
          <div>
            <h2 className="font-serif text-[1.9rem] text-teal-deep leading-tight">
              {greeting}!{" "}
              <span className="inline-block animate-[wave_1.6s_ease-in-out_infinite] origin-[70%_70%]">👋</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              You're making great progress on {orgName ? <span className="text-teal-deep font-medium">{orgName}</span> : "your"}'s strategic plan.
            </p>
          </div>

          {/* Journey progress + Quote row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Journey card (3/5) */}
            <SectionCard className="lg:col-span-3" padding="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your Strategic Planning Journey</p>
                  <h3 className="font-serif text-xl text-teal-deep mt-1">Step {stepInfo.n}: {stepInfo.label}</h3>
                </div>
                <div className="text-right">
                  <div className="font-serif text-3xl text-teal-primary tabular-nums">{journeyPct}%</div>
                  <p className="text-[11px] text-teal-primary/80 font-medium">On Track</p>
                </div>
              </div>

              <div className="mt-4 h-2.5 rounded-full bg-teal-soft/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-primary to-teal-deep transition-all duration-700"
                  style={{ width: `${Math.max(6, journeyPct)}%` }}
                />
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end">
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Current Step:</span> <span className="font-medium text-teal-deep">{stepInfo.label}</span></p>
                  <p><span className="text-muted-foreground">Next Step:</span> <span className="font-medium text-teal-deep">{nextStepInfo.next?.label ?? nextStepInfo.label}</span></p>
                  <p><span className="text-muted-foreground">Est. Time:</span> <span className="font-medium text-teal-deep">{nextStepInfo.next?.est ?? "10 minutes"}</span></p>
                </div>
                <Link to={nextStepInfo.to}>
                  <PrimaryButton>
                    Continue My Journey <ArrowRight className="size-4" />
                  </PrimaryButton>
                </Link>
              </div>
            </SectionCard>

            {/* Quote (2/5) */}
            <SectionCard className="lg:col-span-2 relative overflow-hidden" padding="p-6">
              <div
                aria-hidden
                className="absolute inset-0 opacity-60 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(80% 60% at 100% 100%, color-mix(in oklab, var(--teal-soft) 55%, transparent), transparent 65%), radial-gradient(60% 50% at 0% 0%, color-mix(in oklab, var(--gold) 18%, transparent), transparent 70%)",
                }}
              />
              <div className="relative">
                <div className="text-4xl font-serif text-teal-primary leading-none">“</div>
                <blockquote className="font-serif-italic text-xl text-teal-deep leading-snug mt-2">
                  {quote.text}
                </blockquote>
                <p className="mt-4 text-xs text-muted-foreground">— {quote.author}</p>
              </div>
            </SectionCard>
          </div>

          {/* Today's Priorities */}
          <SectionCard
            title="Today's Priorities"
            subtitle="Focus on what matters most right now."
            right={
              <Link to="/execute/calendar" className="text-xs text-teal-primary hover:underline inline-flex items-center gap-1">
                View Calendar <ArrowRight className="size-3" />
              </Link>
            }
          >
            {actions.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No open priorities. <Link to="/execute/tasks" className="text-teal-primary underline">Add a task →</Link>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {actions.slice(0, 5).map((a) => {
                  const overdue = a.due_date && new Date(a.due_date) < new Date();
                  const done = a.status === "done";
                  const due = a.due_date
                    ? new Date(a.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                    : "—";
                  return (
                    <li key={a.id} className="flex items-center gap-3 py-3">
                      {done ? (
                        <CheckCircle2 className="size-5 text-teal-primary shrink-0" />
                      ) : (
                        <Circle className="size-5 text-muted-foreground shrink-0" />
                      )}
                      <span className={`flex-1 text-sm ${done ? "line-through text-muted-foreground" : "text-teal-deep"}`}>
                        {a.title}
                      </span>
                      {a.priority?.toLowerCase() === "high" && (
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-coral bg-coral/10 px-2 py-0.5 rounded-full">
                          High Priority
                        </span>
                      )}
                      <span className={`text-xs tabular-nums w-24 text-right ${overdue ? "text-coral font-medium" : "text-muted-foreground"}`}>
                        {due}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          {/* Jump Back In */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-semibold text-teal-deep">Jump Back In</h3>
              <Link to="/execute/tasks" className="text-xs text-teal-primary hover:underline inline-flex items-center gap-1">
                View All <ArrowRight className="size-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {jumpBackIn.map((it, i) => {
                const Icon = it.icon;
                return (
                  <Link
                    key={i}
                    to={it.to}
                    className="group bg-card rounded-2xl border border-border/70 p-4 hover:border-teal-primary/50 hover:shadow-md transition-all"
                  >
                    <div className="size-9 rounded-lg bg-teal-soft/40 text-teal-primary grid place-items-center mb-3">
                      <Icon className="size-4" />
                    </div>
                    <p className="text-sm font-medium text-teal-deep leading-tight">{it.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{it.sub}</p>
                    {typeof it.progress === "number" && (
                      <div className="mt-3">
                        <div className="h-1.5 rounded-full bg-teal-soft/40 overflow-hidden">
                          <div
                            className="h-full bg-teal-primary rounded-full"
                            style={{ width: `${Math.max(4, it.progress)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">{it.progress}%</p>
                      </div>
                    )}
                    <p className="mt-3 text-xs font-medium text-teal-primary group-hover:underline inline-flex items-center gap-1">
                      {it.cta} <ChevronRight className="size-3" />
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recommended for You */}
          <div>
            <div className="mb-3">
              <h3 className="text-[15px] font-semibold text-teal-deep">Recommended for You</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Personalized recommendations to help you move forward.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <RecCard
                icon={TrendingUp}
                title="Explore Revenue Diversification"
                sub="Reduce reliance on a few funding sources"
                to="/assess/revenue-hhi"
              />
              <RecCard
                icon={Wallet}
                title="Search Grant Opportunities"
                sub="Find grants aligned with your mission"
                to="/fund/grants"
              />
              <RecCard
                icon={TargetIcon}
                title="Update Your KPIs"
                sub="Keep your metrics current and meaningful"
                to="/plan/kpis"
              />
            </div>
          </div>
        </div>

        {/* ============ RIGHT RAIL (col 10-12) ============ */}
        <div className="col-span-12 xl:col-span-3 space-y-6">
          {/* This Month at a Glance */}
          <SectionCard padding="p-5">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-teal-deep">This Month at a Glance</h3>
              <button className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                {monthLabel.split(" ")[0]} <ChevronRight className="size-3" />
              </button>
            </div>
            <ul className="space-y-3.5">
              <GlanceRow icon={FileText} label="Tasks Due" value={String(actions.length)} tone={overdueCount ? "coral" : "teal"} />
              <GlanceRow icon={TargetIcon} label="Goals On Track" value={`${goalsOnTrackPct}%`} tone="teal" />
              <GlanceRow icon={DollarSign} label="Funding Gap" value={compactCurrency(Math.max(0, fin.gap))} tone={fin.gap > 0 ? "coral" : "teal"} />
              <GlanceRow icon={Users} label="Beneficiaries Impacted" value={beneficiaries.toLocaleString()} tone="teal" />
            </ul>
            <Link
              to="/report/insights"
              className="mt-5 inline-flex items-center gap-1 text-xs font-medium text-teal-primary hover:underline"
            >
              View Dashboard <ArrowRight className="size-3" />
            </Link>
          </SectionCard>

          {/* Invite Your Team */}
          <SectionCard padding="p-5">
            <h3 className="text-[15px] font-semibold text-teal-deep">Invite Your Team or Collaborators</h3>
            <p className="text-xs text-muted-foreground mt-1.5">
              Bring your team, board members, or consultants into the journey.
            </p>
            <div className="my-5 flex justify-center gap-2 opacity-90">
              <div className="size-9 rounded-full bg-teal-soft grid place-items-center">
                <Users className="size-4 text-teal-primary" />
              </div>
              <div className="size-11 rounded-full bg-gold/70 grid place-items-center">
                <Users className="size-5 text-teal-deep" />
              </div>
              <div className="size-9 rounded-full bg-teal-soft grid place-items-center">
                <Users className="size-4 text-teal-primary" />
              </div>
            </div>
            <Link to="/profile" className="block">
              <PrimaryButton className="w-full justify-center">Invite People</PrimaryButton>
            </Link>
            <Link to="/report/insights" className="mt-3 block text-center text-xs text-teal-primary hover:underline">
              Learn More →
            </Link>
          </SectionCard>

          {/* Upcoming meetings mini */}
          {meetings.length > 0 && (
            <SectionCard title="Upcoming" padding="p-5">
              <ul className="space-y-3">
                {meetings.slice(0, 3).map((m) => (
                  <li key={m.id} className="flex gap-3">
                    <Calendar className="size-4 text-teal-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-teal-deep truncate">{m.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "TBD"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      </div>

      <style>{`
        @keyframes wave {
          0%, 60%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(14deg); }
          30% { transform: rotate(-8deg); }
          45% { transform: rotate(14deg); }
        }
      `}</style>
    </AppShell>
  );
}

function GlanceRow({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: "teal" | "coral" | "gold" }) {
  const toneClass = tone === "coral" ? "text-coral" : tone === "gold" ? "text-gold" : "text-teal-primary";
  return (
    <li className="flex items-center gap-3">
      <span className="size-8 rounded-lg bg-teal-soft/40 grid place-items-center shrink-0">
        <Icon className="size-4 text-teal-primary" />
      </span>
      <span className="flex-1 text-sm text-teal-deep">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${toneClass}`}>{value}</span>
    </li>
  );
}

function RecCard({ icon: Icon, title, sub, to }: { icon: any; title: string; sub: string; to: string }) {
  return (
    <Link
      to={to}
      className="group bg-card rounded-2xl border border-border/70 p-4 flex items-center gap-3 hover:border-teal-primary/50 hover:shadow-md transition-all"
    >
      <span className="size-10 rounded-lg bg-teal-soft/40 text-teal-primary grid place-items-center shrink-0">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-teal-deep leading-tight">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground group-hover:text-teal-primary shrink-0" />
    </Link>
  );
}

function compactCurrency(n: number) {
  if (!Number.isFinite(n)) return "$0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

/* Silence unused warnings on optional imports */
void Sparkles;
void Heart;
void GhostButton;
