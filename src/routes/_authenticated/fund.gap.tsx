import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, SectionCard, PrimaryButton } from "@/components/app-shell/AppShell";
import { EmptyState } from "@/components/app-shell/AppShell";
import { AlertTriangle, HandCoins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fund/gap")({
  head: () => ({ meta: [{ title: "Funding Gap Analysis — NMM Navigator" }] }),
  component: FundingGapPage,
});

type Ask = { id: string; title: string; amount: number; secured_amount: number };

function FundingGapPage() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const [asks, setAsks] = useState<Ask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("asks")
        .select("id,title,amount,secured_amount")
        .eq("organization_id", orgId)
        .order("amount", { ascending: false });
      if (error) toast.error(error.message);
      setAsks((data as Ask[]) ?? []);
      setLoading(false);
    })();
  }, [orgId]);

  const ready = !orgLoading && !loading;
  const totalNeed = asks.reduce((a, b) => a + b.amount, 0);
  const totalSecured = asks.reduce((a, b) => a + Math.min(b.secured_amount, b.amount), 0);
  const gap = totalNeed - totalSecured;

  return (
    <AppShell
      title="Funding Gap Analysis"
      subtitle="What's unfunded across every ask on the books."
    >
      {!ready && <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>}

      {ready && asks.length === 0 && (
        <EmptyState
          icon={HandCoins}
          title="No funding gap to show yet"
          description="This page totals up every ask in the Asks Bank. Add your funding needs there first — this page will compute the gap automatically."
          action={
            <Link to="/fund/asks-bank">
              <PrimaryButton>Go to Asks Bank</PrimaryButton>
            </Link>
          }
        />
      )}

      {ready && asks.length > 0 && (
        <>
          <div className="bg-brand-deep text-white rounded-2xl p-8 mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-rose-500/30 to-transparent pointer-events-none" />
            <div className="relative flex items-center gap-6">
              <div className="size-14 rounded-full bg-rose-500/20 grid place-items-center">
                <AlertTriangle className="size-7 text-rose-300" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-300">
                  Total Funding Gap
                </p>
                <p className="text-5xl font-serif italic mt-1">${(gap / 1000).toFixed(0)}k</p>
                <p className="text-slate-400 text-sm mt-2">
                  {totalNeed > 0 ? Math.round((totalSecured / totalNeed) * 100) : 0}% secured across{" "}
                  {asks.length} ask{asks.length === 1 ? "" : "s"}.
                </p>
              </div>
            </div>
          </div>

          <SectionCard padding="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="text-left p-5 font-semibold">Ask</th>
                  <th className="text-right p-5 font-semibold">Need</th>
                  <th className="text-right p-5 font-semibold">Secured</th>
                  <th className="text-right p-5 font-semibold">Gap</th>
                  <th className="p-5 font-semibold w-1/4">Funded %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {asks.map((a) => {
                  const secured = Math.min(a.secured_amount, a.amount);
                  const pct = a.amount > 0 ? Math.round((secured / a.amount) * 100) : 0;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/60">
                      <td className="p-5 font-medium">{a.title}</td>
                      <td className="p-5 text-right tabular-nums">${a.amount.toLocaleString()}</td>
                      <td className="p-5 text-right tabular-nums text-emerald-600">
                        ${secured.toLocaleString()}
                      </td>
                      <td className="p-5 text-right tabular-nums text-rose-500">
                        ${(a.amount - secured).toLocaleString()}
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-accent" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 tabular-nums w-8 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </SectionCard>
        </>
      )}
    </AppShell>
  );
}
