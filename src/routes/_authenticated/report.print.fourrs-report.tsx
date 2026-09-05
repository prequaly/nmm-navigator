import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PrintLayout, PrintSection, PrintKV } from "@/components/print/PrintLayout";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { fetch4RsReportData, formatDate } from "@/lib/exports/data";
import { FOURRS_LENSES } from "@/lib/plan/sections";

export const Route = createFileRoute("/_authenticated/report/print/fourrs-report")({
  head: () => ({ meta: [{ title: "4Rs Report — Print" }] }),
  component: PrintFourRsReport,
});

function PrintFourRsReport() {
  const { orgId } = useCurrentOrg();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetch4RsReportData>> | null>(null);

  useEffect(() => {
    if (!orgId) return;
    fetch4RsReportData(orgId).then(setData);
  }, [orgId]);

  if (!data) return <div className="p-10 text-center text-sm text-slate-500">Loading…</div>;
  if (!data.org) return <div className="p-10 text-center text-sm">No organization.</div>;

  const { org, assessment, pillars, narrativeBody } = data;

  return (
    <PrintLayout
      title="4Rs Framework Report"
      org={org.name}
      subtitle="Relationships · Resources · Results · Reputation"
      backTo="/report/exports"
    >
      <PrintSection title="Assessment Snapshot">
        {assessment ? (
          <dl>
            <PrintKV label="Score" value={String(assessment.score ?? "—")} />
            <PrintKV label="Maturity Level" value={assessment.maturity_level} />
            <PrintKV label="Completed" value={formatDate(assessment.completed_at)} />
          </dl>
        ) : (
          <p className="text-slate-400 italic">
            The 4Rs Framework Audit has not been completed yet.
          </p>
        )}
        {assessment?.reflection && (
          <p className="text-sm text-slate-800 leading-relaxed mt-3">{assessment.reflection}</p>
        )}
      </PrintSection>

      <PrintSection title="How Strategic Pillars Map to the 4Rs">
        {pillars.length === 0 ? (
          <p className="text-slate-400 italic">No strategic pillars defined yet.</p>
        ) : (
          <div className="space-y-4">
            {FOURRS_LENSES.map((lens) => {
              const matches = pillars.filter((pl) =>
                (pl.fourrs_dimensions ?? []).includes(lens.key),
              );
              return (
                <div key={lens.key}>
                  <p className="font-semibold text-brand-deep">{lens.label}</p>
                  {matches.length === 0 ? (
                    <p className="text-slate-400 italic text-sm">
                      No pillar currently tagged to this dimension.
                    </p>
                  ) : (
                    <ul className="list-disc pl-5 text-sm">
                      {matches.map((m) => (
                        <li key={m.id}>{m.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PrintSection>

      <PrintSection title="Financial Strategy Narrative">
        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
          {narrativeBody || "Not yet drafted. Visit Plan Narrative to draft this section."}
        </p>
      </PrintSection>
    </PrintLayout>
  );
}
