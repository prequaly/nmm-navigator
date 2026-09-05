import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PrintLayout, PrintSection, PrintKV } from "@/components/print/PrintLayout";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { fetchFundingGapData, formatMoney } from "@/lib/exports/data";

export const Route = createFileRoute("/_authenticated/report/print/funding-gap")({
  head: () => ({ meta: [{ title: "Funding Gap Report — Print" }] }),
  component: PrintFundingGap,
});

function PrintFundingGap() {
  const { orgId } = useCurrentOrg();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchFundingGapData>> | null>(null);

  useEffect(() => {
    if (!orgId) return;
    fetchFundingGapData(orgId).then(setData);
  }, [orgId]);

  if (!data) return <div className="p-10 text-center text-sm text-slate-500">Loading…</div>;
  if (!data.org) return <div className="p-10 text-center text-sm">No organization.</div>;

  const { org, asks, totalRequired, totalSecured, totalGap } = data;

  return (
    <PrintLayout title="Funding Gap Report" org={org.name} backTo="/report/exports">
      <PrintSection title="Summary">
        <dl>
          <PrintKV label="Total Required" value={formatMoney(totalRequired)} />
          <PrintKV label="Total Secured" value={formatMoney(totalSecured)} />
          <PrintKV label="Remaining Gap" value={formatMoney(totalGap)} />
          <PrintKV label="Asks Logged" value={String(asks.length)} />
        </dl>
      </PrintSection>

      <PrintSection title="Asks Detail">
        {asks.length === 0 ? (
          <p className="text-slate-400 italic">
            No asks logged yet. Visit the Asks Bank to add funding needs.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left py-2">Ask</th>
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Pillar</th>
                <th className="text-right py-2">Required</th>
                <th className="text-right py-2">Secured</th>
                <th className="text-right py-2">Gap</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {asks.map((a) => (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="py-2">{a.title}</td>
                  <td>{a.type}</td>
                  <td>{a.pillar_name || "—"}</td>
                  <td className="text-right tabular-nums">{formatMoney(a.amount)}</td>
                  <td className="text-right tabular-nums">{formatMoney(a.secured_amount)}</td>
                  <td className="text-right tabular-nums">{formatMoney(a.gap)}</td>
                  <td>{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PrintSection>
    </PrintLayout>
  );
}
