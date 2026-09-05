import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, SectionCard, PrimaryButton, GhostButton } from "@/components/app-shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useCurrentPlan } from "@/hooks/use-current-plan";
import { toast } from "sonner";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Heart,
  Grid3x3,
  Workflow,
  Target,
  TrendingUp,
  ShieldAlert,
  FileText,
  Plus,
} from "lucide-react";
import {
  loadRecommendations,
  addAsPriority,
  addAsRisk,
  addAsKpi,
  type Recommendation,
} from "@/lib/plan/recommendations";
import {
  detectImpactCoverage,
  detectFourRsCoverage,
  IMPACT_LENSES,
  FOURRS_LENSES,
  PLAN_SECTIONS,
} from "@/lib/plan/sections";
import { AiStrategicAnalysis } from "@/components/plan/AiStrategicAnalysis";

export const Route = createFileRoute("/_authenticated/plan/builder")({
  head: () => ({ meta: [{ title: "Strategic Planning Builder — NMM Navigator" }] }),
  component: BuilderPage,
});

type StepId = "mission" | "swot" | "toc" | "priorities" | "kpis" | "risks" | "narrative";

const STEPS: { id: StepId; label: string; icon: typeof Heart; to: string }[] = [
  { id: "mission", label: "Mission & Values", icon: Heart, to: "/values" },
  { id: "swot", label: "SWOT", icon: Grid3x3, to: "/plan/swot" },
  { id: "toc", label: "Theory of Change", icon: Workflow, to: "/plan/theory-of-change" },
  { id: "priorities", label: "Priorities", icon: Target, to: "/plan/priorities" },
  { id: "kpis", label: "KPIs", icon: TrendingUp, to: "/plan/kpis" },
  { id: "risks", label: "Risks", icon: ShieldAlert, to: "/plan/risks" },
  { id: "narrative", label: "Narrative", icon: FileText, to: "/plan/narrative" },
];

function BuilderPage() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const { planId, loading: planLoading } = useCurrentPlan(orgId);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<StepId>("mission");

  const [org, setOrg] = useState<{
    mission: string | null;
    vision: string | null;
    values: string | null;
  } | null>(null);
  const [swotCount, setSwotCount] = useState(0);
  const [tocFilled, setTocFilled] = useState(false);
  const [pillars, setPillars] = useState<{ id: string; name: string }[]>([]);
  const [kpiCount, setKpiCount] = useState(0);
  const [riskCount, setRiskCount] = useState(0);
  const [narrativeBodies, setNarrativeBodies] = useState<Record<string, string>>({});
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());

  async function refresh() {
    if (!orgId || !planId) return;
    setLoading(true);
    const [o, s, t, p, k, r, n, rec] = await Promise.all([
      supabase.from("organizations").select("mission,vision,values").eq("id", orgId).maybeSingle(),
      supabase
        .from("swot_items")
        .select("id", { count: "exact", head: true })
        .eq("plan_id", planId),
      supabase
        .from("theory_of_change")
        .select("inputs,activities,outputs,outcomes,impact")
        .eq("plan_id", planId)
        .maybeSingle(),
      supabase
        .from("strategic_pillars")
        .select("id,name")
        .eq("organization_id", orgId)
        .order("sort_order"),
      supabase
        .from("kpis")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId),
      supabase
        .from("risks")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId),
      supabase.from("plan_narratives").select("section_key,body").eq("organization_id", orgId),
      loadRecommendations(orgId).catch(() => [] as Recommendation[]),
    ]);
    setOrg(o.data ?? null);
    setSwotCount(s.count ?? 0);
    const tocRow = t.data as {
      inputs: unknown[];
      activities: unknown[];
      outputs: unknown[];
      outcomes: unknown[];
      impact: unknown[];
    } | null;
    setTocFilled(
      !!tocRow &&
        [tocRow.inputs, tocRow.activities, tocRow.outputs, tocRow.outcomes, tocRow.impact].some(
          (arr) => Array.isArray(arr) && arr.length > 0,
        ),
    );
    setPillars((p.data as { id: string; name: string }[]) ?? []);
    setKpiCount(k.count ?? 0);
    setRiskCount(r.count ?? 0);
    const nMap: Record<string, string> = {};
    for (const row of (n.data as { section_key: string; body: string }[]) ?? [])
      nMap[row.section_key] = row.body;
    setNarrativeBodies(nMap);
    setRecs(rec);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId || !planId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, planId]);

  const completion = useMemo(() => {
    const missionDone = !!(org?.mission && org?.vision);
    const swotDone = swotCount > 0;
    const tocDone = tocFilled;
    const prioritiesDone = pillars.length >= 1;
    const kpisDone = kpiCount >= 1;
    const risksDone = riskCount >= 1;
    const narrativeDone = Object.values(narrativeBodies).some((b) => b?.trim());
    return {
      mission: missionDone,
      swot: swotDone,
      toc: tocDone,
      priorities: prioritiesDone,
      kpis: kpisDone,
      risks: risksDone,
      narrative: narrativeDone,
    };
  }, [org, swotCount, tocFilled, pillars, kpiCount, riskCount, narrativeBodies]);

  const doneCount = Object.values(completion).filter(Boolean).length;
  const pct = Math.round((doneCount / STEPS.length) * 100);

  useEffect(() => {
    if (loading) return;
    const firstIncomplete = STEPS.find((s) => !completion[s.id]);
    if (firstIncomplete) setStep(firstIncomplete.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  async function addRec(kind: "priority" | "risk" | "kpi", rec: Recommendation, advice: string) {
    if (!orgId || !planId) return;
    const key = `${kind}:${rec.assessmentKey}:${advice}`;
    try {
      if (kind === "priority") await addAsPriority(orgId, planId, rec, advice);
      else if (kind === "risk") await addAsRisk(orgId, planId, rec, advice);
      else await addAsKpi(orgId, planId, rec, advice);
      setAddedKeys((s) => new Set(s).add(key));
      toast.success("Added — refresh this step to see it reflected");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add");
    }
  }

  const ready = !orgLoading && !planLoading && !loading;

  return (
    <AppShell
      title="Strategic Planning Builder"
      subtitle="Build your plan step by step. Nothing here is a blank page — each step shows exactly where you stand and what's suggested next."
    >
      {!ready && <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>}

      {ready && (
        <>
          <SectionCard padding="p-5" className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-600">Plan completion</span>
              <span className="text-xs font-medium text-slate-700">
                {doneCount}/{STEPS.length} steps · {pct}%
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-brand-deep transition-all" style={{ width: `${pct}%` }} />
            </div>
            <ol className="flex flex-wrap gap-2">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const done = completion[s.id];
                const active = s.id === step;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setStep(s.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        active
                          ? "bg-brand-deep text-white border-brand-deep"
                          : done
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                      {i + 1}. {s.label}
                    </button>
                  </li>
                );
              })}
            </ol>
          </SectionCard>

          <AiStrategicAnalysis orgId={orgId!} planId={planId!} onChanged={refresh} />

          {step === "mission" && (
            <StepBody
              title="Mission, Vision & Values"
              done={completion.mission}
              to="/values"
              cta="Edit in Core Values / Org Profile"
            >
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Mission
                  </dt>
                  <dd className="text-slate-700 mt-0.5">{org?.mission || "Not set yet."}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Vision
                  </dt>
                  <dd className="text-slate-700 mt-0.5">{org?.vision || "Not set yet."}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Values
                  </dt>
                  <dd className="text-slate-700 mt-0.5">{org?.values || "Not set yet."}</dd>
                </div>
              </dl>
            </StepBody>
          )}

          {step === "swot" && (
            <StepBody
              title="SWOT Analysis"
              done={completion.swot}
              to="/plan/swot"
              cta="Open full SWOT Matrix"
            >
              <p className="text-sm text-slate-600">
                {swotCount > 0
                  ? `${swotCount} item${swotCount === 1 ? "" : "s"} logged across your strengths, weaknesses, opportunities, and threats.`
                  : "Nothing logged yet — open the full SWOT Matrix to start capturing strengths, weaknesses, opportunities, and threats."}
              </p>
            </StepBody>
          )}

          {step === "toc" && (
            <StepBody
              title="Theory of Change"
              done={completion.toc}
              to="/plan/theory-of-change"
              cta="Open full Theory of Change"
            >
              <p className="text-sm text-slate-600">
                {tocFilled
                  ? "Your logic chain (inputs through impact) has content."
                  : "Not started — the logic chain from what you invest to the change you create."}
              </p>
            </StepBody>
          )}

          {step === "priorities" && (
            <StepBody
              title="Strategic Priorities"
              done={completion.priorities}
              to="/plan/priorities"
              cta="Manage priorities"
            >
              {pillars.length > 0 ? (
                <ul className="text-sm text-slate-700 space-y-1 mb-4">
                  {pillars.map((p) => (
                    <li key={p.id}>• {p.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-600 mb-4">
                  No priorities yet — aim for 3–5 bold commitments.
                </p>
              )}
              <SuggestedFor kind="priority" recs={recs} addedKeys={addedKeys} onAdd={addRec} />
            </StepBody>
          )}

          {step === "kpis" && (
            <StepBody title="KPIs" done={completion.kpis} to="/plan/kpis" cta="Manage KPI library">
              <p className="text-sm text-slate-600 mb-4">
                {kpiCount > 0
                  ? `${kpiCount} KPI${kpiCount === 1 ? "" : "s"} tracked.`
                  : "No KPIs yet — every priority should have at least one number attached to it."}
              </p>
              <SuggestedFor kind="kpi" recs={recs} addedKeys={addedKeys} onAdd={addRec} />
            </StepBody>
          )}

          {step === "risks" && (
            <StepBody
              title="Risk Register"
              done={completion.risks}
              to="/plan/risks"
              cta="Open risk register"
            >
              <p className="text-sm text-slate-600 mb-4">
                {riskCount > 0
                  ? `${riskCount} risk${riskCount === 1 ? "" : "s"} tracked.`
                  : "No risks logged yet."}
              </p>
              <SuggestedFor kind="risk" recs={recs} addedKeys={addedKeys} onAdd={addRec} />
            </StepBody>
          )}

          {step === "narrative" && (
            <StepBody
              title="Plan Narrative"
              done={completion.narrative}
              to="/plan/narrative"
              cta="Open Plan Narrative editor"
            >
              <NarrativeSummary bodies={narrativeBodies} />
            </StepBody>
          )}

          <div className="flex items-center justify-between mt-6">
            <GhostButton
              onClick={() => stepIndex > 0 && setStep(STEPS[stepIndex - 1].id)}
              disabled={stepIndex === 0}
            >
              <ArrowLeft className="size-3.5 inline -mt-0.5 mr-1" /> Previous
            </GhostButton>
            {stepIndex < STEPS.length - 1 ? (
              <PrimaryButton onClick={() => setStep(STEPS[stepIndex + 1].id)}>
                Next <ArrowRight className="size-3.5 inline -mt-0.5 ml-1" />
              </PrimaryButton>
            ) : (
              <Link to="/plan/narrative">
                <PrimaryButton>
                  Go to Narrative <ArrowRight className="size-3.5 inline -mt-0.5 ml-1" />
                </PrimaryButton>
              </Link>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}

function StepBody({
  title,
  done,
  to,
  cta,
  children,
}: {
  title: string;
  done: boolean;
  to: string;
  cta: string;
  children: React.ReactNode;
}) {
  return (
    <SectionCard
      title={title}
      right={
        <span
          className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
        >
          {done ? "Complete" : "Not yet"}
        </span>
      }
    >
      {children}
      <Link
        to={to}
        className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline mt-4"
      >
        {cta} <ArrowRight className="size-3" />
      </Link>
    </SectionCard>
  );
}

function SuggestedFor({
  kind,
  recs,
  addedKeys,
  onAdd,
}: {
  kind: "priority" | "risk" | "kpi";
  recs: Recommendation[];
  addedKeys: Set<string>;
  onAdd: (kind: "priority" | "risk" | "kpi", rec: Recommendation, advice: string) => void;
}) {
  const items = recs.flatMap((rec) => rec.advice.map((advice) => ({ rec, advice })));
  if (items.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic border-t border-slate-100 pt-3">
        Complete an assessment to unlock suggestions here.
      </p>
    );
  }
  return (
    <div className="border-t border-slate-100 pt-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
        Suggested for you
      </p>
      <ul className="space-y-1.5">
        {items.slice(0, 5).map(({ rec, advice }) => {
          const key = `${kind}:${rec.assessmentKey}:${advice}`;
          const done = addedKeys.has(key);
          return (
            <li key={key} className="flex items-center gap-2 text-sm">
              <button
                onClick={() => !done && onAdd(kind, rec, advice)}
                disabled={done}
                className={`shrink-0 size-5 rounded-full border flex items-center justify-center ${
                  done
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-slate-300 hover:border-brand-primary text-slate-400 hover:text-brand-primary"
                }`}
              >
                {done ? <Check className="size-3" /> : <Plus className="size-3" />}
              </button>
              <span className={done ? "text-slate-400 line-through" : "text-slate-700"}>
                {advice}
              </span>
              <span className="text-[10px] text-slate-400 ml-auto shrink-0">
                from {rec.assessmentTitle}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NarrativeSummary({ bodies }: { bodies: Record<string, string> }) {
  const withContent = PLAN_SECTIONS.filter((s) => bodies[s.key]?.trim());
  if (withContent.length === 0) {
    return <p className="text-sm text-slate-600">No sections drafted yet.</p>;
  }
  return (
    <ul className="text-sm text-slate-700 space-y-2">
      {withContent.map((s) => {
        const body = bodies[s.key] ?? "";
        const impactCov = detectImpactCoverage(body);
        const fourRsCov = detectFourRsCoverage(body);
        const impactN = IMPACT_LENSES.filter((l) => impactCov[l.key]).length;
        const fourRsN = FOURRS_LENSES.filter((l) => fourRsCov[l.key]).length;
        return (
          <li key={s.key} className="flex items-center justify-between">
            <span>
              {s.numeral}. {s.title}
            </span>
            <span className="text-xs text-slate-400 tabular-nums">
              IMPACT {impactN}/{IMPACT_LENSES.length} · 4Rs {fourRsN}/{FOURRS_LENSES.length}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
