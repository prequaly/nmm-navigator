import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PrintLayout, PrintSection, PrintKV } from "@/components/print/PrintLayout";
import { useCurrentOrg } from "@/hooks/use-current-org";
import {
  fetchStrategicPlanData,
  formatMoney,
  formatDate,
  parseValues,
  sumYearly,
} from "@/lib/exports/data";
import { PLAN_SECTIONS, IMPACT_LENSES, FOURRS_LENSES } from "@/lib/plan/sections";

export const Route = createFileRoute("/_authenticated/report/print/strategic-plan")({
  head: () => ({ meta: [{ title: "Strategic Plan — Print" }] }),
  component: PrintStrategicPlan,
});

// Render an editable narrative body (may have **Bold:** sub-heads) as HTML paragraphs.
function Narrative({ body }: { body: string }) {
  if (!body?.trim()) {
    return (
      <p className="text-slate-400 italic text-sm">
        Not yet drafted — visit Plan Narrative to draft this section.
      </p>
    );
  }
  const blocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        const m = trimmed.match(/^\*\*(.+?)\*\*\s*(:?)\s*([\s\S]*)$/);
        if (m) {
          return (
            <p key={i} className="text-sm text-slate-800 leading-relaxed">
              <span className="font-semibold text-brand-deep">
                {m[1]}
                {m[2]}{" "}
              </span>
              {m[3]}
            </p>
          );
        }
        return (
          <p key={i} className="text-sm text-slate-800 leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

type Data = Awaited<ReturnType<typeof fetchStrategicPlanData>>;

function PrintStrategicPlan() {
  const { orgId } = useCurrentOrg();
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    if (!orgId) return;
    fetchStrategicPlanData(orgId).then(setData);
  }, [orgId]);

  if (!data || !data.org) {
    return <div className="p-10 text-center text-sm text-slate-500">Loading…</div>;
  }
  const { org, pillars, kpis, risks, okrs, roadmap, revenue, expenses, grants, narratives } = data;
  const values = parseValues(org.values);
  const get = (key: string) => narratives[key]?.body ?? "";

  return (
    <PrintLayout title="Strategic Plan" org={org.name}>
      <PrintSection title="Table of Contents">
        <ol className="text-sm text-slate-700 list-decimal pl-5 space-y-0.5">
          {PLAN_SECTIONS.map((s) => (
            <li key={s.key}>{s.title}</li>
          ))}
          <li>Strategic Goals &amp; Objectives</li>
          <li>Appendix: Task Chart</li>
        </ol>
      </PrintSection>

      <PrintSection title="I. Executive Summary">
        <Narrative body={get("executive_summary")} />
      </PrintSection>

      <PrintSection title="II. Organizational Overview">
        <Narrative body={get("organizational_overview")} />
        <div className="mt-4 space-y-3">
          <div>
            <h4 className="font-semibold text-slate-900 text-sm">Mission</h4>
            <p className="text-sm text-slate-700">{org.mission || "—"}</p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm">Vision</h4>
            <p className="text-sm text-slate-700">{org.vision || "—"}</p>
          </div>
          {values.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">Core Values</h4>
              <ul className="grid grid-cols-2 gap-1 mt-1">
                {values.map((v) => (
                  <li key={v} className="text-sm text-slate-700 flex items-baseline gap-2">
                    <span className="size-1.5 bg-brand-deep rounded-full inline-block" />
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <dl className="mt-3">
            <PrintKV label="Annual Budget" value={formatMoney(org.annual_budget)} />
            <PrintKV label="Staff" value={String(org.staff_count ?? "—")} />
            <PrintKV label="Volunteers" value={String(org.volunteer_count ?? "—")} />
            <PrintKV label="Geographic Area" value={org.geographic_area} />
            <PrintKV label="Beneficiaries" value={org.beneficiaries} />
          </dl>
        </div>
      </PrintSection>

      <PrintSection title="III. Current State Assessment">
        <Narrative body={get("current_state")} />
      </PrintSection>

      <PrintSection title="IV. Strategic Issues & Framework Approach">
        <Narrative body={get("strategic_issues")} />
        <div className="mt-4 grid grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-slate-900 text-sm mb-1">The IMPACT Framework</h4>
            <ul className="text-sm text-slate-700 space-y-0.5">
              {IMPACT_LENSES.map((l) => (
                <li key={l.key} className="flex items-baseline gap-2">
                  <span className="size-1.5 bg-brand-deep rounded-full inline-block" />
                  {l.label}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm mb-1">The 4Rs Framework</h4>
            <ul className="text-sm text-slate-700 space-y-0.5">
              {FOURRS_LENSES.map((l) => (
                <li key={l.key} className="flex items-baseline gap-2">
                  <span className="size-1.5 bg-violet-600 rounded-full inline-block" />
                  {l.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PrintSection>

      <PrintSection title="V. Strategic Goals & Objectives">
        {pillars.length === 0 ? (
          <p className="text-slate-400 italic text-sm">No strategic pillars defined yet.</p>
        ) : (
          <div className="space-y-3">
            {(pillars as Array<{ id: string; name: string; description: string | null }>).map(
              (p) => (
                <div key={p.id} className="avoid-break">
                  <h4 className="font-semibold text-slate-900 text-sm">{p.name}</h4>
                  {p.description && (
                    <p className="text-sm text-slate-700 mt-0.5">{p.description}</p>
                  )}
                </div>
              ),
            )}
          </div>
        )}
        {okrs.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-slate-900 text-sm mb-2">OKRs</h4>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="text-left py-2 font-semibold">Objective</th>
                  <th className="text-left py-2 font-semibold">Quarter</th>
                  <th className="text-left py-2 font-semibold">Owner</th>
                  <th className="text-left py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {(
                  okrs as Array<{
                    id: string;
                    objective: string;
                    quarter: string | null;
                    owner: string | null;
                    status: string;
                  }>
                ).map((o) => (
                  <tr key={o.id} className="border-b border-slate-100">
                    <td className="py-1.5">{o.objective}</td>
                    <td>{o.quarter || "—"}</td>
                    <td>{o.owner || "—"}</td>
                    <td>{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PrintSection>

      <PrintSection title="VI. Financial Strategy">
        <Narrative body={get("financial_strategy")} />
        <dl className="mt-4">
          <PrintKV label="Annual Budget" value={formatMoney(org.annual_budget)} />
          <PrintKV
            label="Projected Revenue (horizon)"
            value={formatMoney(sumYearly(revenue as Array<{ yearly_amounts: unknown }>))}
          />
          <PrintKV
            label="Projected Expenses (horizon)"
            value={formatMoney(sumYearly(expenses as Array<{ yearly_amounts: unknown }>))}
          />
          <PrintKV label="Grants Logged" value={String(grants.length)} />
        </dl>
      </PrintSection>

      <PrintSection title="VII. Program & Curriculum Enhancements">
        <Narrative body={get("program_enhancements")} />
      </PrintSection>

      <PrintSection title="VIII. Community Engagement & Partnerships">
        <Narrative body={get("community_engagement")} />
      </PrintSection>

      <PrintSection title="IX. Leadership & Succession Planning">
        <Narrative body={get("leadership_succession")} />
      </PrintSection>

      <PrintSection title="X. Measurement & Evaluation Plan">
        <Narrative body={get("measurement_evaluation")} />
        {kpis.length > 0 && (
          <table className="w-full text-sm border-collapse mt-4">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left py-2 font-semibold">KPI</th>
                <th className="text-right py-2 font-semibold">Baseline</th>
                <th className="text-right py-2 font-semibold">Current</th>
                <th className="text-right py-2 font-semibold">Target</th>
              </tr>
            </thead>
            <tbody>
              {(
                kpis as Array<{
                  id: string;
                  name: string;
                  unit: string | null;
                  baseline: number | null;
                  current_value: number | null;
                  target: number | null;
                }>
              ).map((k) => (
                <tr key={k.id} className="border-b border-slate-100">
                  <td className="py-1.5">
                    {k.name}
                    {k.unit && <span className="text-slate-500"> ({k.unit})</span>}
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

      <PrintSection title="XI. Risk Mitigation Strategies">
        <Narrative body={get("risk_mitigation")} />
        {risks.length > 0 && (
          <table className="w-full text-sm border-collapse mt-4">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left py-2 font-semibold">Risk</th>
                <th className="text-left py-2 font-semibold">Category</th>
                <th className="text-right py-2 font-semibold">L</th>
                <th className="text-right py-2 font-semibold">I</th>
                <th className="text-left py-2 font-semibold">Mitigation</th>
              </tr>
            </thead>
            <tbody>
              {(
                risks as Array<{
                  id: string;
                  title: string;
                  category: string | null;
                  likelihood: number | null;
                  impact: number | null;
                  mitigation: string | null;
                }>
              ).map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-1.5">{r.title}</td>
                  <td>{r.category || "—"}</td>
                  <td className="text-right tabular-nums">{r.likelihood ?? "—"}</td>
                  <td className="text-right tabular-nums">{r.impact ?? "—"}</td>
                  <td className="text-slate-700">{r.mitigation || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PrintSection>

      <PrintSection title="XII. Conclusion">
        <Narrative body={get("conclusion")} />
      </PrintSection>

      <PrintSection title="Appendix: Task Chart">
        {roadmap.length === 0 ? (
          <p className="text-slate-400 italic text-sm">No roadmap items logged yet.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left py-2 font-semibold">Task</th>
                <th className="text-left py-2 font-semibold">Start</th>
                <th className="text-left py-2 font-semibold">End</th>
                <th className="text-left py-2 font-semibold">Owner</th>
                <th className="text-left py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {(
                roadmap as Array<{
                  id: string;
                  title: string;
                  start_date: string | null;
                  end_date: string | null;
                  owner: string | null;
                  status: string;
                }>
              ).map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-1.5">{r.title}</td>
                  <td>{formatDate(r.start_date)}</td>
                  <td>{formatDate(r.end_date)}</td>
                  <td>{r.owner || "—"}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PrintSection>
    </PrintLayout>
  );
}
