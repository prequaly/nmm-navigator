import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PrintLayout, PrintSection, PrintKV } from "@/components/print/PrintLayout";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { fetchRevenueDiversificationData, formatMoney, formatDate } from "@/lib/exports/data";
import { hhiBand } from "@/lib/exports/revenue-diversification";

export const Route = createFileRoute("/_authenticated/report/print/revenue-diversification")({
  head: () => ({ meta: [{ title: "Revenue Diversification Report — Print" }] }),
  component: PrintRevenueDiversification,
});

function PrintRevenueDiversification() {
  const { orgId } = useCurrentOrg();
  const [data, setData] = useState<Awaited<
    ReturnType<typeof fetchRevenueDiversificationData>
  > | null>(null);

  useEffect(() => {
    if (!orgId) return;
    fetchRevenueDiversificationData(orgId).then(setData);
  }, [orgId]);

  if (!data) return <div className="p-10 text-center text-sm text-slate-500">Loading…</div>;
  if (!data.org) return <div className="p-10 text-center text-sm">No organization.</div>;

  const { org, categories, total, hhi, assessment } = data;

  return (
    <PrintLayout
      title="Revenue Diversification Report"
      org={org.name}
      subtitle="Herfindahl-Hirschman Index (HHI) — lower is better"
      backTo="/report/exports"
    >
      <PrintSection title="Concentration Summary">
        <dl>
          <PrintKV label="Total Revenue" value={formatMoney(total)} />
          <PrintKV label="HHI Score" value={hhi.toFixed(3)} />
          <PrintKV label="Risk Band" value={hhiBand(hhi)} />
          <PrintKV label="Categories Tracked" value={String(categories.length)} />
        </dl>
      </PrintSection>

      <PrintSection title="Revenue by Category">
        {categories.length === 0 ? (
          <p className="text-slate-400 italic">No revenue streams logged yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left py-2">Category</th>
                <th className="text-right py-2">Amount</th>
                <th className="text-right py-2">Share</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.category} className="border-b border-slate-100">
                  <td className="py-2">{c.category}</td>
                  <td className="text-right tabular-nums">{formatMoney(c.amount)}</td>
                  <td className="text-right tabular-nums">{Math.round(c.share * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PrintSection>

      {assessment && (
        <PrintSection title="Fundraising Readiness Assessment">
          <dl>
            <PrintKV label="Score" value={String(assessment.score ?? "—")} />
            <PrintKV label="Maturity Level" value={assessment.maturity_level} />
            <PrintKV label="Completed" value={formatDate(assessment.completed_at)} />
          </dl>
        </PrintSection>
      )}
    </PrintLayout>
  );
}
