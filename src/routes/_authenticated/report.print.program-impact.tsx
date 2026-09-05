import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PrintLayout, PrintSection, PrintKV } from "@/components/print/PrintLayout";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { fetchProgramImpactData, formatMoney } from "@/lib/exports/data";

export const Route = createFileRoute("/_authenticated/report/print/program-impact")({
  head: () => ({ meta: [{ title: "Program Impact Report — Print" }] }),
  component: PrintProgramImpact,
});

function PrintProgramImpact() {
  const { orgId } = useCurrentOrg();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchProgramImpactData>> | null>(null);

  useEffect(() => {
    if (!orgId) return;
    fetchProgramImpactData(orgId).then(setData);
  }, [orgId]);

  if (!data) return <div className="p-10 text-center text-sm text-slate-500">Loading…</div>;
  if (!data.org) return <div className="p-10 text-center text-sm">No organization.</div>;

  const { org, programs, kpis, assessment } = data;

  return (
    <PrintLayout title="Program Impact Report" org={org.name} backTo="/report/exports">
      {assessment && (
        <PrintSection title="Program Impact Assessment">
          <dl>
            <PrintKV label="Score" value={String(assessment.score ?? "—")} />
            <PrintKV label="Maturity Level" value={assessment.maturity_level} />
          </dl>
        </PrintSection>
      )}

      <PrintSection title="Programs">
        {programs.length === 0 ? (
          <p className="text-slate-400 italic">No programs logged yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left py-2">Program</th>
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Status</th>
                <th className="text-right py-2">Budget</th>
                <th className="text-right py-2">Participants</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((pr) => (
                <tr key={pr.id} className="border-b border-slate-100">
                  <td className="py-2">{pr.name}</td>
                  <td>{pr.type}</td>
                  <td>{pr.status}</td>
                  <td className="text-right tabular-nums">{formatMoney(pr.budget)}</td>
                  <td className="text-right tabular-nums">{pr.participants ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PrintSection>

      <PrintSection title="Outcome Metrics (KPIs)">
        {kpis.length === 0 ? (
          <p className="text-slate-400 italic">No KPIs defined yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left py-2">Metric</th>
                <th className="text-right py-2">Baseline</th>
                <th className="text-right py-2">Current</th>
                <th className="text-right py-2">Target</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((k) => (
                <tr key={k.id} className="border-b border-slate-100">
                  <td className="py-2">
                    {k.name}
                    {k.unit ? <span className="text-slate-500"> ({k.unit})</span> : null}
                  </td>
                  <td className="text-right tabular-nums">{k.baseline ?? "—"}</td>
                  <td className="text-right tabular-nums">{k.current_value ?? "—"}</td>
                  <td className="text-right tabular-nums">{k.target ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PrintSection>
    </PrintLayout>
  );
}
