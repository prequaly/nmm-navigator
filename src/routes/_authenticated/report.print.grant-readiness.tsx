import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PrintLayout, PrintSection, PrintKV } from "@/components/print/PrintLayout";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { fetchGrantReadinessData, formatMoney } from "@/lib/exports/data";
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/report/print/grant-readiness")({
  head: () => ({ meta: [{ title: "Grant Readiness Report — Print" }] }),
  component: PrintGrantReadiness,
});

function PrintGrantReadiness() {
  const { orgId } = useCurrentOrg();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchGrantReadinessData>> | null>(
    null,
  );

  useEffect(() => {
    if (!orgId) return;
    fetchGrantReadinessData(orgId).then(setData);
  }, [orgId]);

  if (!data) return <div className="p-10 text-center text-sm text-slate-500">Loading…</div>;
  if (!data.org) return <div className="p-10 text-center text-sm">No organization.</div>;

  const { org, checklist, readyCount, grants, assessment } = data;

  return (
    <PrintLayout
      title="Grant Readiness Report"
      org={org.name}
      subtitle={`${readyCount} of ${checklist.length} readiness criteria met`}
      backTo="/report/exports"
    >
      <PrintSection title="Readiness Checklist">
        <ul className="space-y-2 text-sm">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              {item.done ? (
                <Check className="size-4 text-emerald-600" />
              ) : (
                <X className="size-4 text-rose-500" />
              )}
              {item.label}
            </li>
          ))}
        </ul>
      </PrintSection>

      {assessment && (
        <PrintSection title="Fundraising Readiness Assessment">
          <dl>
            <PrintKV label="Score" value={String(assessment.score ?? "—")} />
            <PrintKV label="Maturity Level" value={assessment.maturity_level} />
          </dl>
        </PrintSection>
      )}

      <PrintSection title="Grant Pipeline">
        {grants.length === 0 ? (
          <p className="text-slate-400 italic">No grants logged yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left py-2">Funder</th>
                <th className="text-left py-2">Grant</th>
                <th className="text-left py-2">Status</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {grants.map((g) => (
                <tr key={g.id} className="border-b border-slate-100">
                  <td className="py-2">{g.funder_name}</td>
                  <td>{g.grant_name}</td>
                  <td>{g.status}</td>
                  <td className="text-right tabular-nums">
                    {formatMoney(g.amount_awarded ?? g.amount_requested)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PrintSection>
    </PrintLayout>
  );
}
