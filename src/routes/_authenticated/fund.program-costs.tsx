import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, SectionCard, EmptyState } from "@/components/app-shell/AppShell";
import { Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useCurrentPlan } from "@/hooks/use-current-plan";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fund/program-costs")({
  head: () => ({ meta: [{ title: "Program Cost Allocation — NMM Navigator" }] }),
  component: ProgramCosts,
});

type Program = { id: string; name: string; budget: number | null; participants: number | null };

function ProgramCosts() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const { planId, loading: planLoading } = useCurrentPlan(orgId);
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [overhead, setOverhead] = useState(0);
  const [totalBudget, setTotalBudget] = useState(0);

  useEffect(() => {
    if (!orgId || !planId) return;
    (async () => {
      setLoading(true);
      const [{ data: progs, error: progErr }, { data: lines, error: lineErr }] = await Promise.all([
        supabase
          .from("programs")
          .select("id,name,budget,participants")
          .eq("organization_id", orgId),
        supabase.from("expense_lines").select("category,yearly_amounts").eq("plan_id", planId),
      ]);
      if (progErr) toast.error(progErr.message);
      if (lineErr) toast.error(lineErr.message);

      setPrograms((progs as Program[]) ?? []);
      const y1 = (l: { yearly_amounts: unknown }) =>
        Number((l.yearly_amounts as Record<string, number> | null)?.y1 ?? 0);
      const overheadPool = (lines ?? [])
        .filter((l) => l.category !== "program")
        .reduce((s, l) => s + y1(l), 0);
      const total = (lines ?? []).reduce((s, l) => s + y1(l), 0);
      setOverhead(overheadPool);
      setTotalBudget(total);
      setLoading(false);
    })();
  }, [orgId, planId]);

  const ready = !orgLoading && !planLoading && !loading;
  const totalDirect = programs.reduce((s, p) => s + (p.budget ?? 0), 0);
  const rows = programs.map((p) => {
    const share = totalDirect > 0 ? (p.budget ?? 0) / totalDirect : 0;
    const allocated = overhead * share;
    const direct = p.budget ?? 0;
    const trueCost = direct + allocated;
    const costPerYouth = p.participants ? trueCost / p.participants : null;
    return { ...p, direct, allocated, trueCost, costPerYouth };
  });
  const totalAllocated = rows.reduce((s, r) => s + r.allocated, 0);
  const totalTrueCost = rows.reduce((s, r) => s + r.trueCost, 0);

  return (
    <AppShell
      title="Program Cost Allocation"
      subtitle="What each program actually costs once shared overhead is loaded in — computed from your real budget's admin/fundraising expense lines, split proportionally by each program's direct budget."
    >
      {!ready && <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>}

      {ready && programs.length === 0 && (
        <EmptyState
          icon={Calculator}
          title="No programs with budgets yet"
          description="Add programs (with a budget) in Programs & Events, and admin/fundraising expense lines in your budget — this page will compute true program cost automatically."
        />
      )}

      {ready && programs.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Stat label="Total Year 1 budget" value={`$${(totalBudget / 1000).toFixed(0)}k`} />
            <Stat
              label="Direct program costs"
              value={`$${(totalDirect / 1000).toFixed(0)}k`}
              hint={
                totalBudget > 0
                  ? `${Math.round((totalDirect / totalBudget) * 100)}% of budget`
                  : undefined
              }
            />
            <Stat
              label="Shared overhead pool"
              value={`$${(overhead / 1000).toFixed(0)}k`}
              hint="Non-program expense lines"
            />
            <Stat
              label="True program cost"
              value={`$${(totalTrueCost / 1000).toFixed(0)}k`}
              hint="Direct + allocated share"
            />
          </div>

          <SectionCard
            title="True cost by program"
            subtitle="Direct + fair share of overhead, allocated by each program's share of total direct spend"
            padding="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="text-left p-3">Program</th>
                    <th className="text-right p-3">Direct</th>
                    <th className="text-right p-3">+ Overhead alloc.</th>
                    <th className="text-right p-3">True cost</th>
                    <th className="text-right p-3">$ / participant</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="p-3 font-medium text-slate-800">{r.name}</td>
                      <td className="p-3 text-right text-slate-600 tabular-nums">
                        ${(r.direct / 1000).toFixed(0)}k
                      </td>
                      <td className="p-3 text-right text-slate-500 tabular-nums">
                        + ${(r.allocated / 1000).toFixed(0)}k
                      </td>
                      <td className="p-3 text-right font-medium text-brand-deep tabular-nums">
                        ${(r.trueCost / 1000).toFixed(0)}k
                      </td>
                      <td className="p-3 text-right text-brand-primary tabular-nums">
                        {r.costPerYouth ? `$${r.costPerYouth.toFixed(0)}` : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200 bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-800">Total</td>
                    <td className="p-3 text-right font-medium text-slate-700 tabular-nums">
                      ${(totalDirect / 1000).toFixed(0)}k
                    </td>
                    <td className="p-3 text-right font-medium text-slate-700 tabular-nums">
                      ${(totalAllocated / 1000).toFixed(0)}k
                    </td>
                    <td className="p-3 text-right font-bold text-brand-deep tabular-nums">
                      ${(totalTrueCost / 1000).toFixed(0)}k
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}
    </AppShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-3xl font-serif text-brand-deep mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
