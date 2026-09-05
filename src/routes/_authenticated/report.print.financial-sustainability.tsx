import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PrintLayout, PrintSection, PrintKV } from "@/components/print/PrintLayout";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { fetchFinancialSustainabilityData, formatMoney } from "@/lib/exports/data";

export const Route = createFileRoute("/_authenticated/report/print/financial-sustainability")({
  head: () => ({ meta: [{ title: "Financial Sustainability Report — Print" }] }),
  component: PrintFinancialSustainability,
});

function PrintFinancialSustainability() {
  const { orgId } = useCurrentOrg();
  const [data, setData] = useState<Awaited<
    ReturnType<typeof fetchFinancialSustainabilityData>
  > | null>(null);

  useEffect(() => {
    if (!orgId) return;
    fetchFinancialSustainabilityData(orgId).then(setData);
  }, [orgId]);

  if (!data) return <div className="p-10 text-center text-sm text-slate-500">Loading…</div>;
  if (!data.org) return <div className="p-10 text-center text-sm">No organization.</div>;

  const { org, assumption, totalRevenue, totalExpenses, net, reserveMonths } = data;

  return (
    <PrintLayout title="Financial Sustainability Report" org={org.name} backTo="/report/exports">
      <PrintSection title="Financial Snapshot">
        <dl>
          <PrintKV label="Total Revenue" value={formatMoney(totalRevenue)} />
          <PrintKV label="Total Expenses" value={formatMoney(totalExpenses)} />
          <PrintKV label="Net" value={formatMoney(net)} />
          <PrintKV
            label="Current Reserve Balance"
            value={assumption ? formatMoney(assumption.current_reserve_balance) : "—"}
          />
          <PrintKV
            label="Reserve Target (months)"
            value={assumption ? String(assumption.reserve_target_months) : "—"}
          />
          <PrintKV
            label="Reserve Runway (months)"
            value={reserveMonths != null ? reserveMonths.toFixed(1) : "—"}
          />
          <PrintKV
            label="Revenue Growth Rate"
            value={assumption ? `${(assumption.revenue_growth_rate * 100).toFixed(1)}%` : "—"}
          />
          <PrintKV
            label="Inflation Rate"
            value={assumption ? `${(assumption.inflation_rate * 100).toFixed(1)}%` : "—"}
          />
        </dl>
      </PrintSection>

      {assumption?.notes ? (
        <PrintSection title="Notes">
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
            {assumption.notes}
          </p>
        </PrintSection>
      ) : !assumption ? (
        <PrintSection title="Notes">
          <p className="text-slate-400 italic">
            No financial assumptions logged yet. Visit Budget & Pro Forma to set them.
          </p>
        </PrintSection>
      ) : null}
    </PrintLayout>
  );
}
