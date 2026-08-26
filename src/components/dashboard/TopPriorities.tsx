import { Link } from "@tanstack/react-router";
import { Flag, ArrowRight } from "lucide-react";
import type { JourneyStage } from "@/lib/plan/completion";

export type Priority = {
  id: string;
  label: string;
  reason: string;
  to: string;
  cta: string;
  tone: "urgent" | "next" | "growth";
};

/**
 * Answers the North Star question:
 * "What are the 3 most important things I should accomplish this month?"
 *
 * Ranking (in order):
 *   1) Overdue action items (urgent)
 *   2) Next stage in the strategic flywheel (next)
 *   3) Growth nudges — e.g., set a KPI value, run a review
 */
export function buildPriorities(input: {
  overdueCount: number;
  openActionsCount: number;
  nextStage: JourneyStage | null;
  hasKpis: boolean;
  hasKpiValues: boolean;
  hasUpcomingReview: boolean;
}): Priority[] {
  const out: Priority[] = [];

  if (input.overdueCount > 0) {
    out.push({
      id: "overdue",
      label: `Clear ${input.overdueCount} overdue action${input.overdueCount > 1 ? "s" : ""}`,
      reason: "Overdue items compound. Close them or reschedule to reset momentum.",
      to: "/execute/tasks",
      cta: "Review tasks",
      tone: "urgent",
    });
  }

  if (input.nextStage) {
    out.push({
      id: "stage",
      label: input.nextStage.cta,
      reason: `${input.nextStage.label}: ${input.nextStage.description.toLowerCase()}`,
      to: input.nextStage.to,
      cta: "Start now",
      tone: "next",
    });
  }

  if (input.hasKpis && !input.hasKpiValues) {
    out.push({
      id: "kpi-values",
      label: "Log this month's KPI values",
      reason: "A KPI without a value is a hope. Enter one number to make it real.",
      to: "/plan/kpis",
      cta: "Log values",
      tone: "growth",
    });
  }

  if (!input.hasUpcomingReview) {
    out.push({
      id: "monthly-review",
      label: "Schedule a monthly strategy review",
      reason: "30 minutes on the last Friday keeps your plan alive, not shelved.",
      to: "/execute/calendar",
      cta: "Schedule review",
      tone: "growth",
    });
  }

  // Fill with generic momentum nudges if fewer than 3
  if (out.length < 3 && input.openActionsCount > 0) {
    out.push({
      id: "advance",
      label: "Advance one open action today",
      reason: "Small forward motion beats a perfect plan.",
      to: "/execute/tasks",
      cta: "Open tasks",
      tone: "growth",
    });
  }

  return out.slice(0, 3);
}

export function TopPriorities({ priorities }: { priorities: Priority[] }) {
  if (priorities.length === 0) return null;

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <Flag className="size-4 text-brand-primary" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">
          The 3 things that matter most this month
        </p>
      </div>
      <h3 className="text-lg font-serif italic text-slate-900 mb-5">
        Focus here — everything else can wait.
      </h3>

      <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {priorities.map((p, i) => (
          <li
            key={p.id}
            className={`relative rounded-xl border p-5 flex flex-col ${
              p.tone === "urgent"
                ? "border-rose-200 bg-rose-50/40"
                : p.tone === "next"
                  ? "border-brand-primary/30 bg-brand-primary/5"
                  : "border-slate-200 bg-slate-50/40"
            }`}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className={`size-7 rounded-full text-xs font-semibold flex items-center justify-center shrink-0 ${
                  p.tone === "urgent"
                    ? "bg-rose-500 text-white"
                    : p.tone === "next"
                      ? "bg-brand-deep text-white"
                      : "bg-white border border-slate-200 text-slate-700"
                }`}
              >
                {i + 1}
              </div>
              <p className="text-sm font-semibold text-slate-900 leading-snug">{p.label}</p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4 flex-1">{p.reason}</p>
            <Link
              to={p.to}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline mt-auto"
            >
              {p.cta} <ArrowRight className="size-3" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
