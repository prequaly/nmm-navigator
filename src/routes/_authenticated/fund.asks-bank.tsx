import { createFileRoute } from "@tanstack/react-router";
import { AppShell, SectionCard, PrimaryButton } from "@/components/app-shell/AppShell";
import { ASKS } from "@/lib/mock/riverside";

const TYPE_TONE: Record<string, string> = {
  Program: "bg-brand-primary/10 text-brand-primary",
  Capital: "bg-brand-accent/10 text-brand-accent",
  Capacity: "bg-amber-50 text-amber-700",
  Operating: "bg-slate-100 text-slate-700",
};

export const Route = createFileRoute("/_authenticated/fund/asks-bank")({
  head: () => ({ meta: [{ title: "Asks Bank — NMM Navigator" }] }),
  component: () => (
    <AppShell
      title="Asks Bank"
      subtitle="Every ask, with the right language for donors, sponsors, grants, and board members."
      actions={<PrimaryButton>+ New ask</PrimaryButton>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ASKS.map((a) => (
          <SectionCard key={a.title} padding="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${TYPE_TONE[a.type]}`}>
                {a.type}
              </span>
              <span className="text-[10px] text-slate-400 italic">{a.status}</span>
            </div>
            <h3 className="text-2xl font-serif italic">{a.title}</h3>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-4xl font-serif text-brand-deep">${(a.amount / 1000).toFixed(0)}k</span>
              <span className="text-xs text-slate-500">target</span>
            </div>
            <p className="text-sm text-slate-500 mt-3">Audience: {a.audience}</p>
            <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
              <button className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-50">
                Donor version
              </button>
              <button className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-50">
                Grant version
              </button>
              <button className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-50">
                Board version
              </button>
            </div>
          </SectionCard>
        ))}
      </div>
    </AppShell>
  ),
});
