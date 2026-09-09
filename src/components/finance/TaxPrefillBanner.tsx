import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Sparkles, FileText, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  applyTaxFilingToBudget,
  loadLatestTaxFiling,
  taxFilingToStreams,
  type TaxFiling,
} from "@/lib/finance/tax-filings";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

/**
 * Every "Fund My Strategy" module computes off revenue_streams. When the org
 * has filed figures but an empty budget, this offers to carry the prior year
 * across as the Year 1 baseline — the "pull last year's numbers, then adjust"
 * path — rather than making them retype what the tax form already says.
 */
export function TaxPrefillBanner({
  orgId,
  planId,
  onApplied,
}: {
  orgId: string | null;
  planId: string | null;
  onApplied?: () => void;
}) {
  const [filing, setFiling] = useState<TaxFiling | null>(null);
  const [streamCount, setStreamCount] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!orgId || !planId) return;
    let cancelled = false;
    (async () => {
      try {
        const [latest, streams] = await Promise.all([
          loadLatestTaxFiling(orgId),
          supabase
            .from("revenue_streams")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", orgId)
            .eq("plan_id", planId),
        ]);
        if (cancelled) return;
        setFiling(latest);
        setStreamCount(streams.count ?? 0);
      } catch {
        // A banner is not worth surfacing an error for.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, planId]);

  const apply = async () => {
    if (!orgId || !planId || !filing) return;
    setApplying(true);
    try {
      const n = await applyTaxFilingToBudget(orgId, planId, filing);
      toast.success(
        `Added ${n} revenue ${n === 1 ? "line" : "lines"} from your ${filing.tax_year} ${filing.form_type}.`,
      );
      setStreamCount(n);
      onApplied?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not prefill from that filing.");
    } finally {
      setApplying(false);
    }
  };

  if (dismissed || streamCount === null) return null;

  // Budget already has lines — nothing to offer.
  if (streamCount > 0) return null;

  // No filed figures yet: point at where they're entered rather than dead-end.
  if (!filing) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 mb-6">
        <FileText className="size-4 text-slate-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-700">
            This module works from your real revenue history. Add your Form 990 or last year's
            figures once and every funding module fills itself in.
          </p>
          <Link
            to="/profile"
            className="text-sm font-medium text-brand-primary hover:underline inline-flex items-center gap-1 mt-1"
          >
            Add tax filings in Legal &amp; Registration <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const streams = taxFilingToStreams(filing);
  if (streams.length === 0) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-4 mb-6">
      <Sparkles className="size-4 text-brand-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800">
          You filed a <span className="font-medium">{filing.form_type}</span> for{" "}
          <span className="font-medium">{filing.tax_year}</span> showing{" "}
          <span className="font-medium tabular-nums">{money(filing.total_revenue)}</span> in revenue
          across {streams.length} {streams.length === 1 ? "line" : "lines"}. Carry it over as your
          Year 1 baseline, then adjust anything that won't repeat.
        </p>
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={apply}
            disabled={applying}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-deep text-white rounded-lg text-sm font-medium hover:bg-brand-deep/90 disabled:opacity-50"
          >
            {applying ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Prefill from {filing.tax_year} figures
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
