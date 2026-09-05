import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PrintLayout, PrintSection, PrintKV } from "@/components/print/PrintLayout";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { fetchAnnualOperatingPlanData, formatMoney, formatDate } from "@/lib/exports/data";

export const Route = createFileRoute("/_authenticated/report/print/annual-operating-plan")({
  head: () => ({ meta: [{ title: "Annual Operating Plan — Print" }] }),
  component: PrintAnnualOperatingPlan,
});

function PrintAnnualOperatingPlan() {
  const { orgId } = useCurrentOrg();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAnnualOperatingPlanData>> | null>(
    null,
  );

  useEffect(() => {
    if (!orgId) return;
    fetchAnnualOperatingPlanData(orgId).then(setData);
  }, [orgId]);

  if (!data) return <div className="p-10 text-center text-sm text-slate-500">Loading…</div>;
  if (!data.org) return <div className="p-10 text-center text-sm">No organization.</div>;

  const { org, pillars, kpis, roadmap, programs, totalRevenue, totalExpenses } = data;
  const year = new Date().getFullYear();

  return (
    <PrintLayout title={`Annual Operating Plan — ${year}`} org={org.name} backTo="/report/exports">
      <PrintSection title="Budget Summary">
        <dl>
          <PrintKV label="Projected Revenue" value={formatMoney(totalRevenue)} />
          <PrintKV label="Projected Expenses" value={formatMoney(totalExpenses)} />
          <PrintKV label="Net" value={formatMoney(totalRevenue - totalExpenses)} />
        </dl>
      </PrintSection>

      <PrintSection title="Strategic Pillars">
        {pillars.length === 0 ? (
          <p className="text-slate-400 italic">No strategic pillars defined yet.</p>
        ) : (
          <div className="space-y-3">
            {pillars.map((pl) => (
              <div key={pl.id}>
                <p className="font-semibold text-brand-deep">{pl.name}</p>
                {pl.description && <p className="text-sm text-slate-700">{pl.description}</p>}
                <p className="text-xs text-slate-500">
                  Priority: {pl.priority_level || "—"} · Timeline: {formatDate(pl.timeline_start)} –{" "}
                  {formatDate(pl.timeline_end)}
                </p>
              </div>
            ))}
          </div>
        )}
      </PrintSection>

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
              </tr>
            </thead>
            <tbody>
              {programs.map((pr) => (
                <tr key={pr.id} className="border-b border-slate-100">
                  <td className="py-2">{pr.name}</td>
                  <td>{pr.type}</td>
                  <td>{pr.status}</td>
                  <td className="text-right tabular-nums">{formatMoney(pr.budget)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PrintSection>

      <PrintSection title="Quarterly Work Plan">
        {roadmap.length === 0 ? (
          <p className="text-slate-400 italic">No roadmap items logged yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left py-2">Item</th>
                <th className="text-left py-2">Owner</th>
                <th className="text-left py-2">Start</th>
                <th className="text-left py-2">End</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {roadmap.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2">{r.title}</td>
                  <td>{r.owner || "—"}</td>
                  <td>{formatDate(r.start_date)}</td>
                  <td>{formatDate(r.end_date)}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PrintSection>

      <PrintSection title="Key Performance Indicators">
        {kpis.length === 0 ? (
          <p className="text-slate-400 italic">No KPIs defined yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left py-2">KPI</th>
                <th className="text-right py-2">Baseline</th>
                <th className="text-right py-2">Current</th>
                <th className="text-right py-2">Target</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((k) => (
                <tr key={k.id} className="border-b border-slate-100">
                  <td className="py-2">{k.name}</td>
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
