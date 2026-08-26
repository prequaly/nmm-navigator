import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PrintLayout, PrintSection, PrintKV } from "@/components/print/PrintLayout";
import { useCurrentOrg } from "@/hooks/use-current-org";
import {
  fetchFunderReportData,
  formatMoney,
  formatDate,
  sumYearly,
} from "@/lib/exports/data";

export const Route = createFileRoute("/_authenticated/report/print/funder-report")({
  head: () => ({ meta: [{ title: "Funder Report — Print" }] }),
  component: PrintFunderReport,
});

function PrintFunderReport() {
  const { orgId } = useCurrentOrg();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!orgId) return;
    fetchFunderReportData(orgId).then(setData);
  }, [orgId]);

  if (!data) return <div className="p-10 text-center text-sm text-slate-500">Loading…</div>;
  if (!data.org) return <div className="p-10 text-center text-sm">No organization.</div>;

  const { org, grants, kpis, revenue, expenses } = data;
  const revTotal = sumYearly(revenue);
  const expTotal = sumYearly(expenses);
  const active = grants.filter((g: any) => ["awarded", "active"].includes(g.status));
  const pipeline = grants.filter(
    (g: any) => !["awarded", "active", "declined", "closed"].includes(g.status),
  );
  const awardedTotal = active.reduce(
    (a: number, g: any) => a + Number(g.amount_awarded ?? g.amount_requested ?? 0),
    0,
  );
  const pipelineWeighted = pipeline.reduce(
    (a: number, g: any) =>
      a + (Number(g.amount_requested ?? 0) * Number(g.probability ?? 0)) / 100,
    0,
  );

  return (
    <PrintLayout
      title="Funder Report"
      org={org.name}
      subtitle={new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
    >
      <PrintSection title="About">
        <p className="text-base text-slate-800 leading-relaxed">
          {org.mission || <span className="text-slate-400 italic">Mission not defined.</span>}
        </p>
      </PrintSection>

      <PrintSection title="Organization Profile">
        <dl>
          <PrintKV label="Annual Budget" value={formatMoney(org.annual_budget)} />
          <PrintKV label="Staff" value={String(org.staff_count ?? "—")} />
          <PrintKV label="Volunteers" value={String(org.volunteer_count ?? "—")} />
          <PrintKV label="Geographic Area" value={org.geographic_area} />
          <PrintKV label="Beneficiaries Served" value={org.beneficiaries} />
        </dl>
      </PrintSection>

      <PrintSection title="Financial Summary">
        <dl>
          <PrintKV label="Projected Revenue" value={formatMoney(revTotal)} />
          <PrintKV label="Projected Expenses" value={formatMoney(expTotal)} />
          <PrintKV label="Net" value={formatMoney(revTotal - expTotal)} />
          <PrintKV label="Grants Awarded / Active" value={formatMoney(awardedTotal)} />
          <PrintKV label="Pipeline (weighted)" value={formatMoney(pipelineWeighted)} />
        </dl>
      </PrintSection>

      <PrintSection title="Active & Awarded Grants">
        {active.length === 0 ? (
          <p className="text-slate-400 italic">No active or awarded grants.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left py-2">Funder</th>
                <th className="text-left py-2">Grant</th>
                <th className="text-right py-2">Amount</th>
                <th className="text-left py-2">Start</th>
                <th className="text-left py-2">End</th>
              </tr>
            </thead>
            <tbody>
              {active.map((g: any) => (
                <tr key={g.id} className="border-b border-slate-100">
                  <td className="py-2">{g.funder_name}</td>
                  <td>{g.grant_name}</td>
                  <td className="text-right tabular-nums">
                    {formatMoney(g.amount_awarded ?? g.amount_requested)}
                  </td>
                  <td>{formatDate(g.start_date)}</td>
                  <td>{formatDate(g.end_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PrintSection>

      <PrintSection title="Grant Pipeline">
        {pipeline.length === 0 ? (
          <p className="text-slate-400 italic">No prospects in pipeline.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left py-2">Funder</th>
                <th className="text-left py-2">Grant</th>
                <th className="text-right py-2">Requested</th>
                <th className="text-right py-2">Prob.</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.map((g: any) => (
                <tr key={g.id} className="border-b border-slate-100">
                  <td className="py-2">{g.funder_name}</td>
                  <td>{g.grant_name}</td>
                  <td className="text-right tabular-nums">{formatMoney(g.amount_requested)}</td>
                  <td className="text-right">{g.probability ?? 0}%</td>
                  <td>{g.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PrintSection>

      <PrintSection title="Program Outcomes (KPIs)">
        {kpis.length === 0 ? (
          <p className="text-slate-400 italic">No outcome metrics defined yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left py-2">Metric</th>
                <th className="text-right py-2">Current</th>
                <th className="text-right py-2">Target</th>
                <th className="text-right py-2">% to Goal</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((k: any) => {
                const cur = Number(k.current_value ?? 0);
                const tgt = Number(k.target ?? 0);
                const pct = tgt ? `${Math.round((cur / tgt) * 100)}%` : "—";
                return (
                  <tr key={k.id} className="border-b border-slate-100">
                    <td className="py-2">
                      {k.name}
                      {k.unit ? <span className="text-slate-500"> ({k.unit})</span> : null}
                    </td>
                    <td className="text-right tabular-nums">{k.current_value ?? "—"}</td>
                    <td className="text-right tabular-nums">{k.target ?? "—"}</td>
                    <td className="text-right tabular-nums">{pct}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </PrintSection>
    </PrintLayout>
  );
}
