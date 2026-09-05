import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PrintLayout, PrintSection } from "@/components/print/PrintLayout";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { fetchLogicModelData } from "@/lib/exports/data";

export const Route = createFileRoute("/_authenticated/report/print/logic-model")({
  head: () => ({ meta: [{ title: "Logic Model & Theory of Change — Print" }] }),
  component: PrintLogicModel,
});

const CHAIN: Array<{
  key: "inputs" | "activities" | "outputs" | "outcomes" | "impact";
  label: string;
}> = [
  { key: "inputs", label: "Inputs" },
  { key: "activities", label: "Activities" },
  { key: "outputs", label: "Outputs" },
  { key: "outcomes", label: "Outcomes" },
  { key: "impact", label: "Impact" },
];

function PrintLogicModel() {
  const { orgId } = useCurrentOrg();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchLogicModelData>> | null>(null);

  useEffect(() => {
    if (!orgId) return;
    fetchLogicModelData(orgId).then(setData);
  }, [orgId]);

  if (!data) return <div className="p-10 text-center text-sm text-slate-500">Loading…</div>;
  if (!data.org) return <div className="p-10 text-center text-sm">No organization.</div>;

  const { org, toc } = data;

  return (
    <PrintLayout title="Logic Model & Theory of Change" org={org.name} backTo="/report/exports">
      {!toc ? (
        <PrintSection title="Theory of Change">
          <p className="text-slate-400 italic">
            No theory of change defined yet. Visit Theory of Change to build it.
          </p>
        </PrintSection>
      ) : (
        <>
          <PrintSection title="Problem Statement">
            <p className="text-sm text-slate-800 leading-relaxed">
              {toc.problemStatement || "Not yet defined."}
            </p>
          </PrintSection>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            {CHAIN.map((step) => (
              <div key={step.key} className="border border-slate-200 rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-deep mb-2">
                  {step.label}
                </p>
                {toc[step.key].length === 0 ? (
                  <p className="text-slate-300 italic text-xs">Not yet defined.</p>
                ) : (
                  <ul className="list-disc pl-4 text-xs space-y-1">
                    {toc[step.key].map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <PrintSection title="Assumptions">
            {toc.assumptions.length === 0 ? (
              <p className="text-slate-400 italic">Not yet defined.</p>
            ) : (
              <ul className="list-disc pl-5 text-sm">
                {toc.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
          </PrintSection>

          <PrintSection title="External Factors">
            {toc.externalFactors.length === 0 ? (
              <p className="text-slate-400 italic">Not yet defined.</p>
            ) : (
              <ul className="list-disc pl-5 text-sm">
                {toc.externalFactors.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            )}
          </PrintSection>
        </>
      )}
    </PrintLayout>
  );
}
