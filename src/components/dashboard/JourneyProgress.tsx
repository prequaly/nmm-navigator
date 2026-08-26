import { Link } from "@tanstack/react-router";
import { Check, ArrowRight } from "lucide-react";
import type { JourneyState } from "@/lib/plan/completion";

export function JourneyProgress({ state }: { state: JourneyState }) {
  const { stages, completionPct, nextStage } = state;

  return (
    <div className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">
            Your strategic planning flywheel
          </p>
          <h2 className="text-xl font-serif italic text-slate-900 mt-1">
            {completionPct === 100
              ? "You've completed a full loop — time to review and refine."
              : nextStage
                ? `Next up: ${nextStage.label} — ${nextStage.description.toLowerCase()}.`
                : "Keep going."}
          </h2>
        </div>
        <div className="text-right">
          <p className="text-3xl font-serif tabular-nums text-slate-900">{completionPct}%</p>
          <p className="text-xs text-slate-500 uppercase tracking-widest">Journey complete</p>
        </div>
      </div>

      <div className="px-6 pt-5">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-primary to-brand-deep transition-all duration-700"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      <ol className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 p-4">
        {stages.map((s, i) => {
          const isNext = nextStage?.id === s.id;
          return (
            <li key={s.id}>
              <Link
                to={s.to}
                className={`group h-full flex flex-col gap-2 p-3 rounded-lg border transition-all ${
                  s.done
                    ? "border-emerald-100 bg-emerald-50/50"
                    : isNext
                      ? "border-brand-primary/40 bg-brand-primary/5 ring-2 ring-brand-primary/20"
                      : "border-slate-100 bg-white hover:border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`size-6 rounded-full flex items-center justify-center text-[11px] font-medium ${
                      s.done
                        ? "bg-emerald-500 text-white"
                        : isNext
                          ? "bg-brand-primary text-white"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {s.done ? <Check className="size-3.5" /> : i + 1}
                  </div>
                  {isNext && <span className="text-[9px] font-bold uppercase tracking-widest text-brand-primary">Now</span>}
                </div>
                <div>
                  <p className={`text-xs font-semibold ${s.done ? "text-slate-500" : "text-slate-900"}`}>
                    {s.label}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{s.description}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      {nextStage && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-800">Continue where you left off.</span>{" "}
            One next step keeps momentum going.
          </p>
          <Link
            to={nextStage.to}
            className="inline-flex items-center gap-1.5 text-sm font-medium bg-brand-deep text-white px-4 py-2 rounded-lg hover:bg-brand-deep/90"
          >
            {nextStage.cta}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
