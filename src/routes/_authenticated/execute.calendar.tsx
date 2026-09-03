import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell, SectionCard, GhostButton } from "@/components/app-shell/AppShell";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/execute/calendar")({
  head: () => ({ meta: [{ title: "Strategic Calendar — NMM Navigator" }] }),
  component: StrategicCalendar,
});

type EventType = "board" | "fundraiser" | "milestone" | "grant";
type CalEvent = { day: number; title: string; type: EventType };

const TYPE_COLOR: Record<EventType, string> = {
  board: "bg-amber-100 text-amber-700 border-amber-200",
  fundraiser: "bg-brand-accent/15 text-brand-accent border-brand-accent/30",
  milestone: "bg-rose-100 text-rose-700 border-rose-200",
  grant: "bg-brand-primary/15 text-brand-primary border-brand-primary/30",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function StrategicCalendar() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      setLoading(true);
      const start = new Date(cursor.year, cursor.month, 1).toISOString();
      const end = new Date(cursor.year, cursor.month + 1, 1).toISOString();
      const startDate = start.slice(0, 10);
      const endDate = end.slice(0, 10);

      const [meetings, grants, actions, compliance, touchpoints] = await Promise.all([
        supabase
          .from("meetings")
          .select("title,scheduled_at")
          .eq("organization_id", orgId)
          .gte("scheduled_at", start)
          .lt("scheduled_at", end),
        supabase
          .from("grants")
          .select("funder_name,grant_name,application_deadline")
          .eq("organization_id", orgId)
          .not("application_deadline", "is", null)
          .gte("application_deadline", startDate)
          .lt("application_deadline", endDate),
        supabase
          .from("action_items")
          .select("title,due_date")
          .eq("organization_id", orgId)
          .not("due_date", "is", null)
          .gte("due_date", startDate)
          .lt("due_date", endDate),
        supabase
          .from("compliance_items")
          .select("title,due_date")
          .eq("organization_id", orgId)
          .not("due_date", "is", null)
          .gte("due_date", startDate)
          .lt("due_date", endDate),
        supabase
          .from("touchpoints")
          .select("title,scheduled_date")
          .eq("organization_id", orgId)
          .gte("scheduled_date", startDate)
          .lt("scheduled_date", endDate),
      ]);
      for (const r of [meetings, grants, actions, compliance, touchpoints]) {
        if (r.error) toast.error(r.error.message);
      }

      const all: CalEvent[] = [
        ...(meetings.data ?? []).map((m) => ({
          day: new Date(m.scheduled_at).getDate(),
          title: m.title,
          type: "board" as const,
        })),
        ...(grants.data ?? []).map((g) => ({
          day: new Date(g.application_deadline + "T00:00:00").getDate(),
          title: `${g.funder_name} — ${g.grant_name} due`,
          type: "grant" as const,
        })),
        ...(actions.data ?? []).map((a) => ({
          day: new Date(a.due_date + "T00:00:00").getDate(),
          title: a.title,
          type: "milestone" as const,
        })),
        ...(compliance.data ?? []).map((c) => ({
          day: new Date(c.due_date + "T00:00:00").getDate(),
          title: c.title,
          type: "milestone" as const,
        })),
        ...(touchpoints.data ?? []).map((t) => ({
          day: new Date(t.scheduled_date + "T00:00:00").getDate(),
          title: t.title,
          type: "fundraiser" as const,
        })),
      ];
      setEvents(all);
      setLoading(false);
    })();
  }, [orgId, cursor]);

  const byDay = useMemo(() => {
    const m: Record<number, CalEvent[]> = {};
    for (const e of events) (m[e.day] ||= []).push(e);
    return m;
  }, [events]);

  const monthStart = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(monthStart).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const ready = !orgLoading && !loading;

  return (
    <AppShell
      title="Strategic Calendar"
      subtitle="Board meetings, grant deadlines, milestones, and donor touchpoints — pulled from what's already tracked elsewhere in Navigator."
      actions={
        <>
          <GhostButton
            onClick={() =>
              setCursor((c) =>
                c.month === 0
                  ? { year: c.year - 1, month: 11 }
                  : { year: c.year, month: c.month - 1 },
              )
            }
          >
            <ChevronLeft className="size-3.5 inline -mt-0.5" /> Prev
          </GhostButton>
          <span className="text-sm font-medium text-slate-700 self-center px-2">
            {MONTH_NAMES[cursor.month]} {cursor.year}
          </span>
          <GhostButton
            onClick={() =>
              setCursor((c) =>
                c.month === 11
                  ? { year: c.year + 1, month: 0 }
                  : { year: c.year, month: c.month + 1 },
              )
            }
          >
            Next <ChevronRight className="size-3.5 inline -mt-0.5" />
          </GhostButton>
        </>
      }
    >
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {(["board", "grant", "milestone", "fundraiser"] as EventType[]).map((t) => (
          <span key={t} className={`px-2 py-1 rounded-full border capitalize ${TYPE_COLOR[t]}`}>
            {t}
          </span>
        ))}
      </div>

      {!ready && <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>}

      {ready && (
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
                      {(byDay[day] ?? []).map((ev, ii) => (
                        <div
                          key={ii}
                          className={`text-[10px] font-medium px-2 py-1 rounded border truncate ${TYPE_COLOR[ev.type]}`}
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {ready && events.length === 0 && (
        <p className="text-sm text-slate-400 text-center mt-4">
          Nothing scheduled this month — meetings, grant deadlines, task due dates, compliance
          deadlines, and touchpoints will show up here automatically once they're added elsewhere in
          Navigator.
        </p>
      )}
    </AppShell>
  );
}
