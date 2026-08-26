import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AppShell,
  SectionCard,
  GhostButton,
  PrimaryButton,
  EmptyState,
} from "@/components/app-shell/AppShell";
import {
  Heart,
  HandHeart,
  Mail,
  Phone,
  Gift,
  Coffee,
  Users,
  Award,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/execute/touchpoints")({
  head: () => ({
    meta: [{ title: "Donor & Volunteer Touchpoints — NMM Navigator" }],
  }),
  component: TouchpointsCalendar,
});

// --- Touchpoint model -------------------------------------------------------

type Audience = "donor" | "volunteer" | "both";
type Channel =
  | "email"
  | "call"
  | "in_person"
  | "gift"
  | "event"
  | "recognition";

type Touchpoint = {
  day: number;
  title: string;
  audience: Audience;
  channel: Channel;
  segment: string; // e.g. "Major donors", "New volunteers"
  owner: string;
  note?: string;
};

const AUDIENCE_STYLE: Record<Audience, { label: string; chip: string; dot: string }> = {
  donor: {
    label: "Donor",
    chip: "bg-brand-accent/15 text-brand-accent border-brand-accent/30",
    dot: "bg-brand-accent",
  },
  volunteer: {
    label: "Volunteer",
    chip: "bg-brand-primary/15 text-brand-primary border-brand-primary/30",
    dot: "bg-brand-primary",
  },
  both: {
    label: "Both",
    chip: "bg-violet-100 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
  },
};

const CHANNEL_ICON: Record<Channel, { icon: any; label: string }> = {
  email: { icon: Mail, label: "Email" },
  call: { icon: Phone, label: "Call" },
  in_person: { icon: Coffee, label: "In person" },
  gift: { icon: Gift, label: "Gift / handwritten" },
  event: { icon: Users, label: "Event" },
  recognition: { icon: Award, label: "Recognition" },
};

// Mock cadence for October 2026 (Riverside Youth Arts demo)
const TOUCHPOINTS: Touchpoint[] = [
  { day: 1, title: "October impact email", audience: "both", channel: "email", segment: "All supporters", owner: "Lena (Dev)", note: "Q3 outcomes + Fall Showcase save-the-date" },
  { day: 2, title: "Welcome call — new volunteers", audience: "volunteer", channel: "call", segment: "New cohort (Sept)", owner: "Maya (Vol Coord)" },
  { day: 5, title: "Major donor coffee — A. Rivera", audience: "donor", channel: "in_person", segment: "Major ($10k+)", owner: "ED" },
  { day: 6, title: "Lapsed donor reactivation", audience: "donor", channel: "email", segment: "Lapsed 13–24 mo", owner: "Lena (Dev)" },
  { day: 8, title: "Volunteer birthday cards", audience: "volunteer", channel: "gift", segment: "Active volunteers", owner: "Maya" },
  { day: 9, title: "Sustainer thank-you call series", audience: "donor", channel: "call", segment: "Monthly sustainers", owner: "Board chair" },
  { day: 12, title: "Volunteer training: trauma-informed practice", audience: "volunteer", channel: "event", segment: "All volunteers", owner: "Program Dir" },
  { day: 14, title: "Mid-level donor handwritten notes", audience: "donor", channel: "gift", segment: "$1k–$10k", owner: "ED + Board" },
  { day: 15, title: "Q3 impact report send", audience: "both", channel: "email", segment: "All supporters", owner: "Comms" },
  { day: 17, title: "Donor + volunteer mixer", audience: "both", channel: "event", segment: "Engaged supporters", owner: "Dev + Vol Coord" },
  { day: 19, title: "Volunteer-of-the-month spotlight", audience: "volunteer", channel: "recognition", segment: "Public", owner: "Comms" },
  { day: 21, title: "Foundation officer check-in", audience: "donor", channel: "call", segment: "Institutional", owner: "ED" },
  { day: 22, title: "Volunteer milestone gifts (1yr, 3yr, 5yr)", audience: "volunteer", channel: "gift", segment: "Tenured", owner: "Maya" },
  { day: 24, title: "Fall Showcase performance", audience: "both", channel: "event", segment: "All supporters", owner: "Whole team" },
  { day: 26, title: "Post-event thank-you calls (top 20)", audience: "donor", channel: "call", segment: "Showcase attendees", owner: "Board + ED" },
  { day: 27, title: "Volunteer debrief + appreciation", audience: "volunteer", channel: "event", segment: "Showcase crew", owner: "Maya" },
  { day: 29, title: "Year-end appeal preview to majors", audience: "donor", channel: "email", segment: "Major ($10k+)", owner: "Lena" },
  { day: 30, title: "Lead-volunteer 1:1s", audience: "volunteer", channel: "in_person", segment: "Team leads", owner: "Program Dir" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function TouchpointsCalendar() {
  const [filter, setFilter] = useState<"all" | Audience>("all");
  const [showExamples, setShowExamples] = useState(false);

  const source = showExamples ? TOUCHPOINTS : [];
  const filtered = useMemo(
    () => (filter === "all" ? source : source.filter((t) => t.audience === filter || t.audience === "both")),
    [filter, source],
  );

  const byDay = useMemo(() => {
    const m: Record<number, Touchpoint[]> = {};
    for (const t of filtered) (m[t.day] ||= []).push(t);
    return m;
  }, [filtered]);

  // October 2026 starts on Thursday (index 4)
  const monthStart = 4;
  const daysInMonth = 31;
  const cells: (number | null)[] = [
    ...Array(monthStart).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Counts for header strip
  const counts = useMemo(() => {
    const c = { donor: 0, volunteer: 0, both: 0 };
    for (const t of source) c[t.audience]++;
    return c;
  }, [source]);

  const upcoming = filtered.slice().sort((a, b) => a.day - b.day).slice(0, 6);

  return (
    <AppShell
      title="Donor & Volunteer Touchpoints"
      subtitle="A deliberate cadence of cultivation, stewardship, and appreciation."
      actions={
        <>
          <GhostButton onClick={() => setShowExamples((v) => !v)}>
            {showExamples ? "Hide example data" : "Show example data"}
          </GhostButton>
          <GhostButton>
            <ChevronLeft className="size-3.5 inline -mt-0.5" /> Prev
          </GhostButton>
          <GhostButton>
            Next <ChevronRight className="size-3.5 inline -mt-0.5" />
          </GhostButton>
          <PrimaryButton>+ Touchpoint</PrimaryButton>
        </>
      }
    >
      {!showExamples ? (
        <EmptyState
          icon={Heart}
          title="No touchpoints planned yet"
          description="Design your monthly cadence of donor and volunteer moments — calls, notes, gifts, events, and recognition."
          action={
            <div className="flex items-center gap-2">
              <PrimaryButton>+ Add touchpoint</PrimaryButton>
              <GhostButton onClick={() => setShowExamples(true)}>See example cadence</GhostButton>
            </div>
          }
        />
      ) : (
      <>

      {/* Summary strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-brand-deep text-white rounded-2xl p-5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">This month</span>
          <p className="text-4xl font-serif mt-2">{TOUCHPOINTS.length}</p>
          <p className="text-xs text-slate-400 mt-1">Planned touchpoints</p>
        </div>
        <StatCard label="Donor touches" value={counts.donor} tone="accent" icon={Heart} />
        <StatCard label="Volunteer touches" value={counts.volunteer} tone="primary" icon={HandHeart} />
        <StatCard label="Joint moments" value={counts.both} tone="violet" icon={Users} />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        {(["all", "donor", "volunteer", "both"] as const).map((k) => {
          const active = filter === k;
          const label = k === "all" ? "All audiences" : AUDIENCE_STYLE[k].label;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-full border font-medium transition-all ${
                active
                  ? "bg-brand-deep text-white border-brand-deep"
                  : "bg-white text-slate-600 border-slate-200 hover:border-brand-primary/40"
              }`}
            >
              {label}
              {k !== "all" && (
                <span className={`ml-2 inline-block size-1.5 rounded-full align-middle ${AUDIENCE_STYLE[k].dot}`} />
              )}
            </button>
          );
        })}
        <span className="ml-auto text-slate-400 italic self-center">
          {filtered.length} showing
        </span>
      </div>

      {/* Calendar grid */}
      <SectionCard padding="p-0">
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DAYS.map((d) => (
            <div
              key={d}
              className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => (
            <div
              key={i}
              className="min-h-[120px] border-r border-b border-slate-100 p-2 last:border-r-0"
            >
              {day && (
                <>
                  <div className="text-xs font-medium text-slate-500 mb-1">{day}</div>
                  <div className="space-y-1">
                    {(byDay[day] ?? []).map((t, ii) => {
                      const Icon = CHANNEL_ICON[t.channel].icon;
                      const style = AUDIENCE_STYLE[t.audience];
                      return (
                        <div
                          key={ii}
                          className={`text-[10px] font-medium px-2 py-1 rounded border flex items-center gap-1 ${style.chip}`}
                          title={`${t.title} — ${CHANNEL_ICON[t.channel].label} · ${t.segment} · ${t.owner}`}
                        >
                          <Icon className="size-3 shrink-0" />
                          <span className="truncate">{t.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Upcoming list + cadence guidance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <SectionCard title="Next up" subtitle="Top of the queue by date" className="lg:col-span-2">
          <ul className="divide-y divide-slate-100">
            {upcoming.map((t, i) => {
              const Icon = CHANNEL_ICON[t.channel].icon;
              const style = AUDIENCE_STYLE[t.audience];
              return (
                <li key={i} className="py-3 flex items-start gap-4">
                  <div className="text-center w-12 shrink-0">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Oct</div>
                    <div className="text-2xl font-serif text-brand-deep tabular-nums">{t.day}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{t.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t.segment} · Owner: {t.owner}
                    </p>
                    {t.note && <p className="text-xs text-slate-400 italic mt-1">{t.note}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full ${style.chip}`}>
                      {style.label}
                    </span>
                    <span className="text-[10px] text-slate-400 inline-flex items-center gap-1">
                      <Icon className="size-3" /> {CHANNEL_ICON[t.channel].label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        <SectionCard title="Cadence guidance" subtitle="Per supporter, per year">
          <ul className="space-y-3 text-sm">
            <CadenceRow audience="donor" label="Major donors ($10k+)" target="12–18 touches/yr" detail="At least 2 in-person, 4 calls, 6 personal notes" />
            <CadenceRow audience="donor" label="Mid-level ($1k–$10k)" target="8–10 touches/yr" detail="Quarterly call or note + 2 events" />
            <CadenceRow audience="donor" label="Sustainers / monthly" target="6 touches/yr" detail="Anniversary, impact moments, year-end" />
            <CadenceRow audience="volunteer" label="Active volunteers" target="Monthly" detail="Schedule, recognition, training, debrief" />
            <CadenceRow audience="volunteer" label="Team leads" target="2x / month" detail="1:1 + group; visible appreciation quarterly" />
            <CadenceRow audience="both" label="Crossover supporters" target="Track in both lanes" detail="Volunteers who give convert at 3x — steward intentionally" />
          </ul>
        </SectionCard>
      </div>
      </>
      )}
    </AppShell>

  );
}

function StatCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "accent" | "primary" | "violet";
  icon: any;
}) {
  const ring = {
    accent: "bg-brand-accent/10 text-brand-accent",
    primary: "bg-brand-primary/10 text-brand-primary",
    violet: "bg-violet-100 text-violet-600",
  }[tone];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={`size-11 rounded-xl flex items-center justify-center ${ring}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-3xl font-serif text-brand-deep tabular-nums">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function CadenceRow({
  audience,
  label,
  target,
  detail,
}: {
  audience: Audience;
  label: string;
  target: string;
  detail: string;
}) {
  const style = AUDIENCE_STYLE[audience];
  return (
    <li className="flex items-start gap-3">
      <span className={`size-2 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium text-slate-700">{label}</span>
          <span className="text-xs font-medium text-brand-primary tabular-nums shrink-0">{target}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{detail}</p>
      </div>
    </li>
  );
}
