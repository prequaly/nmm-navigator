import { createFileRoute } from "@tanstack/react-router";
import { AppShell, SectionCard, GhostButton, PrimaryButton } from "@/components/app-shell/AppShell";
import { CALENDAR_EVENTS } from "@/lib/mock/riverside";

const TYPE_COLOR: Record<string, string> = {
  program: "bg-brand-primary/15 text-brand-primary border-brand-primary/30",
  fundraiser: "bg-brand-accent/15 text-brand-accent border-brand-accent/30",
  board: "bg-amber-100 text-amber-700 border-amber-200",
  milestone: "bg-rose-100 text-rose-700 border-rose-200",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const Route = createFileRoute("/_authenticated/execute/calendar")({
  head: () => ({ meta: [{ title: "Strategic Calendar — NMM Navigator" }] }),
  component: () => {
    // Render October 2026 grid (starts on Thursday for Oct 1)
    const monthStart = 4; // Oct 1, 2026 = Thursday
    const daysInMonth = 31;
    const cells: (number | null)[] = [
      ...Array(monthStart).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <AppShell
        title="Strategic Calendar"
        subtitle="October 2026 — programs, fundraisers, board, and milestones, color-coded."
        actions={
          <>
            <GhostButton>Month</GhostButton>
            <GhostButton>Quarter</GhostButton>
            <PrimaryButton>+ Event</PrimaryButton>
          </>
        }
      >
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4 text-xs">
          {(["program", "fundraiser", "board", "milestone"] as const).map((t) => (
            <span key={t} className={`px-2 py-1 rounded-full border capitalize ${TYPE_COLOR[t]}`}>
              {t}
            </span>
          ))}
        </div>

        <SectionCard padding="p-0">
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAYS.map((d) => (
              <div key={d} className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
                      {(CALENDAR_EVENTS[day] ?? []).map((ev, ii) => (
                        <div
                          key={ii}
                          className={`text-[10px] font-medium px-2 py-1 rounded border truncate ${TYPE_COLOR[ev.type]}`}
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
      </AppShell>
    );
  },
});
