import { AlertCircle, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

/**
 * Yellow banner shown above pages that currently render illustrative
 * (mock / sample) data. Surfaces the fact that the numbers aren't the user's
 * own and points them to the right input screen.
 */
export function DemoDataBanner({
  message,
  ctaLabel,
  ctaTo,
}: {
  message: string;
  ctaLabel: string;
  ctaTo: string;
}) {
  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex items-start gap-3">
      <div className="size-8 rounded-lg bg-amber-100 text-amber-700 grid place-items-center shrink-0">
        <Sparkles className="size-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-900">
          Illustrative data — not yours yet
        </p>
        <p className="text-xs text-amber-800/80 mt-0.5">{message}</p>
      </div>
      <Link
        to={ctaTo}
        className="text-xs font-semibold text-amber-900 hover:text-amber-950 inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-white border border-amber-300 hover:bg-amber-50 transition-colors whitespace-nowrap"
      >
        {ctaLabel} <ArrowRight className="size-3" />
      </Link>
    </div>
  );
}

/**
 * Gray empty-state card for analytics screens that need real input data
 * before they can compute anything meaningful (HHI, segmentation, benchmarks).
 */
export function EmptyDataCard({
  title,
  message,
  ctaLabel,
  ctaTo,
}: {
  title: string;
  message: string;
  ctaLabel: string;
  ctaTo: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center">
      <div className="size-12 rounded-full bg-white border border-slate-200 grid place-items-center mx-auto mb-4">
        <AlertCircle className="size-5 text-slate-400" />
      </div>
      <h3 className="text-lg font-serif italic text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">{message}</p>
      <Link
        to={ctaTo}
        className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-lg bg-brand-deep text-white text-sm font-medium hover:bg-brand-deep/90 transition-colors"
      >
        {ctaLabel} <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

/**
 * Small inline badge for projections that are extrapolated from less than
 * a full year of data. Communicates to the user that the forecast is a
 * rough annualization — not an audited trend line.
 */
export function PartialDataBadge({
  monthsOfData,
  className = "",
}: {
  monthsOfData?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full ${className}`}
      title="This forecast is extrapolated from less than a full year of financial data and should be treated as an estimate."
    >
      <Sparkles className="size-3" />
      Projected from partial data
      {typeof monthsOfData === "number" ? ` · ${monthsOfData} mo` : ""}
    </span>
  );
}
