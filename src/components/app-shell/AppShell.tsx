import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Menu,
  X as CloseIcon,
  Inbox,
  Loader2,
  AlertTriangle,
  Search,
  Bell,
  Gift,
  ChevronDown,
  MessageSquare,
  BookMarked,
  FileText,
  HelpCircle,
  LogOut,
  ShieldCheck,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ORG } from "@/lib/mock/riverside";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsPlatformAdmin } from "@/hooks/use-is-platform-admin";

/* ---------- 8-step Journey (primary nav) ---------- */

type SubItem = { to: string; label: string };
type JourneyStep = {
  n: number;
  key: string;
  label: string;
  to: string;
  sub: SubItem[];
};

const JOURNEY: JourneyStep[] = [
  {
    n: 1,
    key: "build",
    label: "Build My Organization",
    to: "/profile",
    sub: [
      { to: "/profile", label: "Org Profile" },
      { to: "/values", label: "Mission, Vision & Values" },
      { to: "/team", label: "Team & Invites" },
    ],
  },
  {
    n: 2,
    key: "assess",
    label: "Assess My Organization",
    to: "/assess/health",
    sub: [
      { to: "/assess/health", label: "Planning Health" },
      { to: "/assess/capacity", label: "Org Capacity" },
      { to: "/assess/financial", label: "Financial Health" },
      { to: "/assess/revenue-hhi", label: "Revenue Diversity" },
      { to: "/assess/fundraising", label: "Fundraising Readiness" },
      { to: "/assess/program-impact", label: "Program Impact" },
      { to: "/assess/governance", label: "Board Governance" },
      { to: "/assess/community", label: "Community Engagement" },
      { to: "/assess/digital", label: "Digital Presence" },
      { to: "/assess/dei", label: "DEI / Equity" },
      { to: "/assess/impact", label: "IMPACT Framework" },
      { to: "/assess/4rs", label: "4Rs Framework" },
    ],
  },
  {
    n: 3,
    key: "design",
    label: "Design My Strategy",
    to: "/plan/builder",
    sub: [
      { to: "/plan/builder", label: "Strategic Plan Builder" },
      { to: "/plan/narrative", label: "Plan Narrative" },
      { to: "/plan/swot", label: "SWOT Matrix" },
      { to: "/plan/stakeholders", label: "Stakeholder Map" },
      { to: "/plan/theory-of-change", label: "Theory of Change" },
      { to: "/plan/priorities", label: "Strategic Priorities" },
      { to: "/plan/kpis", label: "KPI Library" },
      { to: "/plan/risks", label: "Risk Register" },
    ],
  },
  {
    n: 4,
    key: "roadmap",
    label: "Build My Roadmap",
    to: "/execute/gantt",
    sub: [
      { to: "/execute/gantt", label: "Gantt Chart" },
      { to: "/execute/calendar", label: "Strategic Calendar" },
      { to: "/execute/okrs", label: "Quarterly OKRs" },
      { to: "/execute/programs", label: "Programs & Events" },
    ],
  },
  {
    n: 5,
    key: "fund",
    label: "Fund My Strategy",
    to: "/fund/reserves",
    // Budget Planner and Cash Flow Forecast sit last on purpose: the modules
    // above them are prefilled from the org's filed tax figures, so the user
    // reviews what's already known before building forward-looking plans.
    sub: [
      { to: "/fund/reserves", label: "Operating Reserves" },
      { to: "/fund/gap", label: "Funding Gap" },
      { to: "/fund/scenarios", label: "Scenario Modeling" },
      { to: "/fund/program-costs", label: "Program Cost Allocation" },
      { to: "/fund/grants", label: "Grants Register" },
      { to: "/fund/pipeline", label: "Grant Pipeline" },
      { to: "/fund/donor-segments", label: "Donor Segments" },
      { to: "/fund/asks-bank", label: "Asks Bank" },
      { to: "/fund/grant-bank", label: "Grant Response Bank" },
      { to: "/fund/budget", label: "Budget Planner" },
      { to: "/fund/proforma", label: "Cash Flow Forecast" },
    ],
  },
  {
    n: 6,
    key: "execute",
    label: "Execute My Plan",
    to: "/execute/tasks",
    sub: [
      { to: "/execute/tasks", label: "Task Manager" },
      { to: "/execute/coffee-chats", label: "Coffee Chat Tracker" },
      { to: "/execute/touchpoints", label: "Donor & Volunteer Touchpoints" },
      { to: "/execute/compliance", label: "Compliance Calendar" },
      { to: "/governance/meetings", label: "Meetings" },
      { to: "/governance/decisions", label: "Decision Log" },
      { to: "/governance/policies", label: "Policies" },
      { to: "/governance/board-matrix", label: "Board Matrix" },
      { to: "/governance/staff-succession", label: "Staff & Succession" },
    ],
  },
  {
    n: 7,
    key: "measure",
    label: "Measure My Impact",
    to: "/report/insights",
    sub: [
      { to: "/report/insights", label: "Reports & AI Insights" },
      { to: "/report/stories", label: "Beneficiary Stories" },
      { to: "/report/benchmarks", label: "Outcomes vs. Benchmarks" },
    ],
  },
  {
    n: 8,
    key: "review",
    label: "Annual Review",
    to: "/report/monthly-review",
    sub: [
      { to: "/report/monthly-review", label: "Monthly Strategic Review" },
      { to: "/report/exports", label: "Exports (PDF / DOCX / XLSX)" },
    ],
  },
];

const UTILITY: SubItem[] = [
  // Reserved for future modules; wired to nearest live route today
  { to: "/report/insights", label: "Reports" },
];

/* ---------- Shell ---------- */

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const { isAdmin: isPlatformAdmin } = useIsPlatformAdmin();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = (data.user?.user_metadata ?? {}) as { full_name?: string; name?: string };
      setUserName(meta.full_name ?? meta.name ?? data.user?.email?.split("@")[0] ?? "");
      setUserEmail(data.user?.email ?? "");
    });
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const activeStep = useMemo(() => {
    // Highlight the journey step whose primary route or any sub route matches.
    for (const step of JOURNEY) {
      if (pathname === step.to) return step.key;
      if (step.sub.some((s) => pathname === s.to || pathname.startsWith(s.to + "/")))
        return step.key;
    }
    return "";
  }, [pathname]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    window.location.href = "/auth";
  };

  const initials =
    (userName || userEmail || "?")
      .split(/[.\s@]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "U";

  const sidebarContent = (
    <>
      {/* Brand block */}
      <Link to="/dashboard" className="block px-6 pt-6 pb-5 border-b border-sidebar-border">
        <div className="flex items-start gap-3">
          <CompassMark className="size-9 shrink-0" />
          <div className="min-w-0">
            <div className="font-serif text-[1.35rem] leading-none tracking-wide text-cream">
              NMM
            </div>
            <div className="font-serif text-[1.35rem] leading-none tracking-wide text-teal-soft mt-0.5">
              NAVIGATOR
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2 text-[10px] uppercase tracking-[0.18em] text-teal-soft/80">
          <span>Powered by</span>
          <span className="font-serif-italic text-sm normal-case tracking-normal text-coral">
            Crescendo
          </span>
        </div>
        <div className="text-[9px] tracking-[0.22em] text-teal-soft/60 ml-14 -mt-0.5">
          STRATEGIES GROUP
        </div>
      </Link>

      <nav
        aria-label="Primary app navigation"
        data-sidebar="app"
        className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
      >
        {/* Home */}
        <JourneyRow
          active={pathname === "/dashboard" || pathname === "/"}
          to="/dashboard"
          label="Home"
          icon={<HomeGlyph />}
        />

        {/* Section header */}
        <div className="pt-4 pb-1 px-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-soft/60">
            My Journey
          </p>
        </div>

        {JOURNEY.map((step) => {
          const isActive = activeStep === step.key;
          return (
            <div key={step.key}>
              <JourneyRow
                active={isActive}
                to={step.to}
                label={step.label}
                icon={<StepNumber n={step.n} active={isActive} />}
              />
              {/* Progressive disclosure — sub-items only for the active step */}
              {isActive && step.sub.length > 0 && (
                <ul className="mt-1 mb-2 ml-[2.35rem] pl-3 border-l border-sidebar-border/60 space-y-0.5">
                  {step.sub.map((s) => {
                    const on = pathname === s.to;
                    return (
                      <li key={s.to}>
                        <Link
                          to={s.to}
                          className={`block px-2 py-1 text-[12.5px] rounded-md transition-colors ${
                            on
                              ? "text-cream bg-sidebar-accent/60 font-medium"
                              : "text-teal-soft/80 hover:text-cream hover:bg-sidebar-accent/40"
                          }`}
                        >
                          {s.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}

        {/* Utility group */}
        <div className="pt-6 pb-1 px-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-soft/60">
            Workspace
          </p>
        </div>
        <UtilityRow icon={MessageSquare} label="Comments" to="/dashboard" active={false} />

        {UTILITY.map((u) => (
          <UtilityRow
            key={u.to}
            icon={FileText}
            label={u.label}
            to={u.to}
            active={pathname === u.to}
          />
        ))}
        <UtilityRow icon={HelpCircle} label="Help & Support" disabled />
        {isPlatformAdmin && (
          <UtilityRow
            icon={ShieldCheck}
            label="Platform Admin"
            to="/admin"
            active={pathname.startsWith("/admin")}
          />
        )}
      </nav>

      {/* User strip */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent/40 transition-colors">
          <div className="size-9 rounded-full bg-teal-primary text-white grid place-items-center text-sm font-medium shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-cream truncate">{userName || "You"}</p>
            <p className="text-[11px] text-teal-soft/70 truncate">{ORG.shortName}</p>
          </div>
          <button
            onClick={signOut}
            aria-label="Sign out"
            className="p-1.5 rounded-md text-teal-soft/70 hover:text-cream hover:bg-sidebar-accent"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen cream-canvas text-foreground">
      {/* Desktop sidebar — deep teal */}
      <aside className="hidden md:flex w-72 bg-sidebar text-sidebar-foreground flex-col shrink-0 sticky top-0 h-screen shadow-[8px_0_32px_-16px_rgba(0,0,0,0.15)]">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-teal-deep/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 h-full w-80 max-w-[88vw] bg-sidebar text-sidebar-foreground flex flex-col shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-4 p-2 rounded-md text-cream hover:bg-sidebar-accent z-10"
            >
              <CloseIcon className="size-4" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="h-20 border-b border-border/60 bg-cream/70 backdrop-blur-md sticky top-0 z-10 px-4 sm:px-6 md:px-8 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="md:hidden p-2 -ml-2 rounded-md hover:bg-accent"
          >
            <Menu className="size-5" />
          </button>

          {/* Center — page title (mockup style). Explicit column placement from
              md: up, since the hamburger button (column 1) becomes display:none
              there — without it, grid auto-placement shifts this into column 1
              and the actions cluster into column 2, letting long subtitles and
              multi-button action rows overlap each other. */}
          <div className="min-w-0 text-center md:text-center md:col-start-2">
            <h1 className="font-serif text-[1.7rem] md:text-[2rem] leading-none tracking-wide text-teal-deep uppercase truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1.5 truncate">{subtitle}</p>
            )}
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 justify-end md:col-start-3">
            {actions}
            <div className="hidden lg:flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-white border border-border text-xs text-muted-foreground w-56">
              <Search className="size-3.5" />
              <span>Search Navigator…</span>
            </div>
            <IconChip>
              <Bell className="size-4" />
            </IconChip>
            <IconChip highlight>
              <Gift className="size-4" />
            </IconChip>
          </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1500px] mx-auto">{children}</div>

        {/* Values footer band */}
        <ValuesFooter />
      </main>
    </div>
  );
}

/* ---------- Sidebar bits ---------- */

function JourneyRow({
  active,
  to,
  label,
  icon,
}: {
  active: boolean;
  to: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        active
          ? "bg-teal-primary/95 text-white font-medium"
          : "text-teal-soft hover:text-cream hover:bg-sidebar-accent/70"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="text-[13.5px] truncate">{label}</span>
    </Link>
  );
}

function StepNumber({ n, active }: { n: number; active: boolean }) {
  return (
    <span
      className={`inline-grid place-items-center size-6 rounded-full text-[11px] font-semibold ${
        active ? "bg-white text-teal-primary" : "bg-sidebar-accent text-teal-soft"
      }`}
    >
      {n}
    </span>
  );
}

function HomeGlyph() {
  return (
    <span className="inline-grid place-items-center size-6 rounded-md bg-sidebar-accent">
      <svg
        viewBox="0 0 24 24"
        className="size-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2z" />
      </svg>
    </span>
  );
}

function UtilityRow({
  icon: Icon,
  label,
  to,
  active,
  badge,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  to?: string;
  active?: boolean;
  badge?: number;
  disabled?: boolean;
}) {
  const cls = `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors ${
    active
      ? "bg-teal-primary/90 text-white"
      : disabled
        ? "text-teal-soft/40 cursor-default"
        : "text-teal-soft hover:text-cream hover:bg-sidebar-accent/60"
  }`;
  const body = (
    <>
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge ? (
        <span className="inline-grid place-items-center size-5 rounded-full bg-coral text-white text-[10px] font-semibold">
          {badge}
        </span>
      ) : null}
    </>
  );
  if (disabled || !to) {
    return (
      <div className={cls} aria-disabled={disabled}>
        {body}
      </div>
    );
  }
  return (
    <Link to={to} className={cls}>
      {body}
    </Link>
  );
}

function IconChip({ children, highlight }: { children: ReactNode; highlight?: boolean }) {
  return (
    <button
      className={`grid place-items-center size-10 rounded-full border transition-colors ${
        highlight
          ? "border-coral text-coral bg-white hover:bg-coral hover:text-white"
          : "border-border text-muted-foreground bg-white hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

function CompassMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle
        cx="24"
        cy="24"
        r="21"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.6"
        strokeWidth="1.5"
        className="text-teal-soft"
      />
      <circle
        cx="24"
        cy="24"
        r="15"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="1"
        className="text-teal-soft"
      />
      <path d="M24 5 L28 24 L24 43 L20 24 Z" fill="currentColor" className="text-coral" />
      <path
        d="M5 24 L24 20 L43 24 L24 28 Z"
        fill="currentColor"
        className="text-gold"
        fillOpacity="0.85"
      />
      <circle cx="24" cy="24" r="2" fill="currentColor" className="text-cream" />
    </svg>
  );
}

function ValuesFooter() {
  const values = [
    { label: "Clarity", desc: "Simplify complexity." },
    { label: "Strategy", desc: "Plan with purpose." },
    { label: "Execution", desc: "Take action with confidence." },
    { label: "Impact", desc: "Create lasting change." },
  ];
  return (
    <footer className="mt-12 border-t border-border/60 bg-cream-warm/60">
      <div className="max-w-[1500px] mx-auto px-6 lg:px-10 py-6 grid grid-cols-2 md:grid-cols-5 gap-6 items-center">
        {values.map((v) => (
          <div key={v.label} className="flex flex-col">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-primary">
              {v.label}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{v.desc}</p>
          </div>
        ))}
        <p className="font-serif-italic text-lg text-teal-deep col-span-2 md:col-span-1 text-right">
          Guided. Strategic. Impactful.
        </p>
      </div>
    </footer>
  );
}

/* ---------- Shared building blocks ---------- */

export function SectionCard({
  title,
  subtitle,
  right,
  children,
  className = "",
  padding = "p-6",
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <section
      className={`bg-card rounded-2xl border border-border/70 shadow-[0_1px_2px_rgba(15,42,54,0.04),0_8px_24px_-16px_rgba(15,42,54,0.08)] ${padding} ${className}`}
    >
      {(title || right) && (
        <div className="flex items-start justify-between mb-5 gap-4">
          <div>
            {title && <h3 className="text-[15px] font-semibold text-teal-deep">{title}</h3>}
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function KpiTile({
  label,
  value,
  unit,
  hint,
  hintTone = "neutral",
  accent,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  hintTone?: "neutral" | "good" | "bad" | "warn";
  accent?: ReactNode;
}) {
  const toneClass = {
    neutral: "text-muted-foreground",
    good: "text-emerald-600",
    bad: "text-rose-500",
    warn: "text-amber-600",
  }[hintTone];
  return (
    <div className="bg-card p-6 rounded-2xl border border-border/70 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1">
        {label}
      </p>
      <div className="flex items-end gap-2">
        <p className="text-4xl font-serif text-teal-deep leading-none">{value}</p>
        {unit && <span className="text-lg text-muted-foreground font-sans mb-0.5">{unit}</span>}
        {accent}
      </div>
      {hint && <p className={`text-xs font-medium mt-3 ${toneClass}`}>{hint}</p>}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-teal-primary text-white rounded-full hover:bg-teal-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border bg-white rounded-full hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 ${className}`}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = "",
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-12 rounded-2xl border border-dashed border-border bg-cream-warm/50 ${className}`}
    >
      <div className="size-12 rounded-full bg-teal-soft/40 flex items-center justify-center mb-4">
        <Icon className="size-5 text-teal-primary" />
      </div>
      <h4 className="text-base font-medium text-teal-deep">{title}</h4>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({
  label = "Loading…",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground ${className}`}
    >
      <Loader2 className="size-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function RouteError({ error, reset }: { error: Error; reset?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16 rounded-2xl border border-rose-200 bg-rose-50/60">
      <div className="size-12 rounded-full bg-rose-100 flex items-center justify-center mb-4">
        <AlertTriangle className="size-5 text-rose-600" />
      </div>
      <h4 className="text-base font-medium text-teal-deep">Something went wrong</h4>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-md">
        {error?.message || "An unexpected error occurred while loading this view."}
      </p>
      {reset && (
        <button
          onClick={reset}
          className="mt-5 px-4 py-2 text-sm font-medium bg-teal-primary text-white rounded-full hover:bg-teal-deep transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/* Reserved for future usage — silence unused imports */
void ChevronDown;
void Check;
