import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  ExternalLink,
  Sparkles,
  Target,
  ShieldAlert,
  TrendingUp,
  Check,
} from "lucide-react";
import { SectionCard } from "@/components/app-shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { ALL } from "@/lib/assessments/configs";
import { useCurrentPlan } from "@/hooks/use-current-plan";
import {
  loadRecommendations,
  addAsPriority,
  addAsRisk,
  addAsKpi,
  type Recommendation,
} from "@/lib/plan/recommendations";
import { toast } from "sonner";

const ROUTE: Record<string, string> = {
  health: "/assess/health",
  capacity: "/assess/capacity",
  financial: "/assess/financial",
  fundraising: "/assess/fundraising",
  "program-impact": "/assess/program-impact",
  governance: "/assess/governance",
  community: "/assess/community",
  digital: "/assess/digital",
  impact: "/assess/impact",
  "4rs": "/assess/4rs",
  "revenue-hhi": "/assess/revenue-hhi",
  dei: "/assess/dei",
};

export function AssessmentRecommendations({ orgId }: { orgId: string }) {
  const { planId } = useCurrentPlan(orgId);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState<Set<string>>(new Set());

  async function refresh() {
    if (!orgId) return;
    try {
      setRecs(await loadRecommendations(orgId));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function add(kind: "priority" | "risk" | "kpi", rec: Recommendation, advice: string) {
    if (!orgId || !planId) return;
    const key = `${kind}:${rec.assessmentKey}:${advice}`;
    try {
      if (kind === "priority") await addAsPriority(orgId, planId, rec, advice);
      else if (kind === "risk") await addAsRisk(orgId, planId, rec, advice);
      else await addAsKpi(orgId, planId, rec, advice);
      setAdded((s) => new Set(s).add(key));
      toast.success(
        kind === "priority"
          ? "Added as a strategic priority"
          : kind === "risk"
            ? "Added to risk register"
            : "Added to KPI library",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add");
    }
  }

  if (loading) return null;

  if (recs.length === 0) {
    return (
      <SectionCard
        title="Recommendations & evidence base"
        subtitle="Complete an assessment to unlock tailored next steps backed by citable research."
        className="mb-8"
      >
        <div className="text-sm text-slate-500 italic">
          No completed assessments yet.{" "}
          <Link to="/assess/health" className="text-brand-primary underline not-italic">
            Start with the Strategic Planning Health check →
          </Link>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Recommendations & evidence base"
      subtitle="Tailored next steps from each completed assessment — lowest score first. Add any of them straight to your plan."
      className="mb-8"
      padding="p-0"
    >
      <ul className="divide-y divide-slate-100">
        {recs.map((rec) => {
          const cfg = ALL[rec.assessmentKey as keyof typeof ALL];
          if (!cfg) return null;
          const route = ROUTE[rec.assessmentKey] ?? "/dashboard";
          return (
            <li key={rec.assessmentKey} className="p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">
                    {cfg.framework}
                  </span>
                  <h3 className="text-lg font-serif italic mt-1">{cfg.title}</h3>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-serif tabular-nums text-brand-deep">
                    {rec.score}
                    <span className="text-sm text-slate-400">/100</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">
                    {rec.maturity}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                    <Sparkles className="size-3 text-brand-accent" /> Recommended next steps
                  </div>
                  <ul className="space-y-2">
                    {rec.advice.map((a) => (
                      <li key={a} className="text-sm text-slate-700 leading-snug">
                        <p>• {a}</p>
                        <div className="flex gap-3 mt-1 ml-3">
                          <AddButton
                            icon={Target}
                            label="Priority"
                            done={added.has(`priority:${rec.assessmentKey}:${a}`)}
                            onClick={() => add("priority", rec, a)}
                          />
                          <AddButton
                            icon={ShieldAlert}
                            label="Risk"
                            done={added.has(`risk:${rec.assessmentKey}:${a}`)}
                            onClick={() => add("risk", rec, a)}
                          />
                          <AddButton
                            icon={TrendingUp}
                            label="KPI"
                            done={added.has(`kpi:${rec.assessmentKey}:${a}`)}
                            onClick={() => add("kpi", rec, a)}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                    <BookOpen className="size-3 text-brand-primary" /> Cite this work
                  </div>
                  <ul className="space-y-2">
                    {cfg.references.slice(0, 3).map((ref) => (
                      <li key={ref.url} className="text-sm">
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-brand-deep hover:text-brand-primary inline-flex items-start gap-1 leading-snug"
                        >
                          {ref.title}
                          <ExternalLink className="size-3 shrink-0 mt-0.5 opacity-60" />
                        </a>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {ref.source}
                          {ref.year ? ` · ${ref.year}` : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Link
                to={route}
                className="mt-4 inline-block text-xs text-brand-primary hover:underline"
              >
                View full assessment →
              </Link>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function AddButton({
  icon: Icon,
  label,
  done,
  onClick,
}: {
  icon: typeof Target;
  label: string;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={done}
      className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors ${
        done
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 text-slate-500 hover:border-brand-primary/40 hover:text-brand-primary"
      }`}
    >
      {done ? <Check className="size-2.5" /> : <Icon className="size-2.5" />}
      {done ? "Added" : label}
    </button>
  );
}
