import { createFileRoute } from "@tanstack/react-router";
import { AppShell, SectionCard, PrimaryButton } from "@/components/app-shell/AppShell";
import { DemoDataBanner } from "@/components/app-shell/DataState";
import { FUNDING_GAPS } from "@/lib/mock/riverside";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/fund/gap")({
  head: () => ({ meta: [{ title: "Funding Gap Analysis — NMM Navigator" }] }),
  component: () => {
    const totalNeed = FUNDING_GAPS.reduce((a, b) => a + b.need, 0);
    const totalSecured = FUNDING_GAPS.reduce((a, b) => a + b.secured, 0);
    const gap = totalNeed - totalSecured;
    return (
      <AppShell
        title="Funding Gap Analysis"
        subtitle="Unfunded initiatives, with the language ready for an ask or a grant."
        actions={<PrimaryButton>Convert to Asks</PrimaryButton>}
      >
        <DemoDataBanner
          message="These initiatives are sample figures. Add your own grants and budget lines to compute a real funding gap."
          ctaLabel="Add grants"
          ctaTo="/fund/grants"
        />
        <div className="bg-brand-deep text-white rounded-2xl p-8 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-rose-500/30 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-6">
            <div className="size-14 rounded-full bg-rose-500/20 grid place-items-center">
              <AlertTriangle className="size-7 text-rose-300" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-300">Total Funding Gap</p>
              <p className="text-5xl font-serif italic mt-1">${(gap / 1000).toFixed(0)}k</p>
              <p className="text-slate-400 text-sm mt-2">
                {((totalSecured / totalNeed) * 100).toFixed(0)}% secured across {FUNDING_GAPS.length} initiatives.
              </p>
            </div>
          </div>
        </div>

        <SectionCard padding="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="text-left p-5 font-semibold">Initiative</th>
                <th className="text-right p-5 font-semibold">Need</th>
                <th className="text-right p-5 font-semibold">Secured</th>
                <th className="text-right p-5 font-semibold">Gap</th>
                <th className="p-5 font-semibold w-1/4">Funded %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {FUNDING_GAPS.map((f) => {
                const pct = Math.round((f.secured / f.need) * 100);
                return (
                  <tr key={f.initiative} className="hover:bg-slate-50/60">
                    <td className="p-5 font-medium">{f.initiative}</td>
                    <td className="p-5 text-right tabular-nums">${f.need.toLocaleString()}</td>
                    <td className="p-5 text-right tabular-nums text-emerald-600">${f.secured.toLocaleString()}</td>
                    <td className="p-5 text-right tabular-nums text-rose-500">${(f.need - f.secured).toLocaleString()}</td>
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-accent" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 tabular-nums w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </SectionCard>
      </AppShell>
    );
  },
});
