import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2 } from "lucide-react";
import { SectionCard } from "@/components/app-shell/AppShell";
import { AiSuggestionCard } from "@/components/ai/AiSuggestionCard";
import { supabase } from "@/integrations/supabase/client";
import {
  generateStrategicRecommendations,
  type StrategicRecommendations,
} from "@/lib/ai/recommend.functions";
import { toast } from "sonner";

export function AiStrategicAnalysis({
  orgId,
  planId,
  onChanged,
}: {
  orgId: string;
  planId: string;
  onChanged?: () => void;
}) {
  const analyze = useServerFn(generateStrategicRecommendations);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StrategicRecommendations | null>(null);
  const [pillarSort, setPillarSort] = useState(0);

  async function run() {
    setLoading(true);
    try {
      const r = await analyze({ data: { organizationId: orgId } });
      setResult(r as StrategicRecommendations);
      const { count } = await supabase
        .from("strategic_pillars")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId);
      setPillarSort(count ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function acceptPriority(values: Record<string, string>, sortOrder: number) {
    const { error } = await supabase.from("strategic_pillars").insert({
      organization_id: orgId,
      plan_id: planId,
      name: values.name,
      description: values.description,
      priority_level: values.priorityLevel,
      sort_order: sortOrder,
    });
    if (error) throw error;
    toast.success("Priority added");
    onChanged?.();
  }

  async function acceptObjective(values: Record<string, string>) {
    const { error } = await supabase.from("kpis").insert({
      organization_id: orgId,
      plan_id: planId,
      name: values.kpiName,
      unit: values.kpiUnit || null,
      target: values.suggestedTarget ? Number(values.suggestedTarget) : null,
      category: "AI Suggested",
      notes: values.objective,
    });
    if (error) throw error;
    toast.success("Objective + KPI added");
    onChanged?.();
  }

  async function acceptRisk(values: Record<string, string>) {
    const { error } = await supabase.from("risks").insert({
      organization_id: orgId,
      plan_id: planId,
      title: values.title,
      category: values.category,
      likelihood: Number(values.likelihood) || 3,
      impact: Number(values.impact) || 3,
      mitigation: values.mitigation,
      status: "open",
    });
    if (error) throw error;
    toast.success("Risk added");
    onChanged?.();
  }

  return (
    <SectionCard
      title="AI Strategic Analysis"
      subtitle="Analyzes your real assessment scores and org data to suggest priorities, SMART objectives, and risks — nothing is added until you accept it."
      right={
        <button
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-medium bg-brand-deep text-white px-3 py-1.5 rounded-md hover:bg-brand-deep/90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {loading ? "Analyzing…" : result ? "Re-analyze" : "Analyze my organization"}
        </button>
      }
      className="mb-6"
    >
      {!result && !loading && (
        <p className="text-sm text-slate-500 italic">
          Complete at least one assessment, then click "Analyze my organization" for a structured
          recommendation set.
        </p>
      )}

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Suggested Priorities
            </p>
            <div className="space-y-3">
              {result.priorities.length === 0 && (
                <p className="text-xs text-slate-400 italic">None suggested.</p>
              )}
              {result.priorities.map((p, i) => (
                <AiSuggestionCard
                  key={i}
                  badge={p.priorityLevel}
                  meta={undefined}
                  fields={[
                    { key: "name", label: "Name", value: p.name },
                    {
                      key: "description",
                      label: "Description",
                      value: p.description,
                      multiline: true,
                    },
                    { key: "rationale", label: "Rationale", value: p.rationale, multiline: true },
                    { key: "priorityLevel", label: "Priority level", value: p.priorityLevel },
                  ]}
                  onAccept={(v) => acceptPriority(v, pillarSort + i)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Suggested Objectives + KPIs
            </p>
            <div className="space-y-3">
              {result.objectives.length === 0 && (
                <p className="text-xs text-slate-400 italic">None suggested.</p>
              )}
              {result.objectives.map((o, i) => (
                <AiSuggestionCard
                  key={i}
                  badge="SMART Objective"
                  meta={`Target: ${o.suggestedTarget}${o.kpiUnit}`}
                  fields={[
                    { key: "objective", label: "Objective", value: o.objective, multiline: true },
                    { key: "kpiName", label: "KPI name", value: o.kpiName },
                    { key: "kpiUnit", label: "Unit", value: o.kpiUnit },
                    { key: "suggestedTarget", label: "Target", value: String(o.suggestedTarget) },
                  ]}
                  onAccept={acceptObjective}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Suggested Risks
            </p>
            <div className="space-y-3">
              {result.risks.length === 0 && (
                <p className="text-xs text-slate-400 italic">None suggested.</p>
              )}
              {result.risks.map((r, i) => (
                <AiSuggestionCard
                  key={i}
                  badge={r.category}
                  meta={`L${r.likelihood} × I${r.impact} = ${r.likelihood * r.impact}`}
                  fields={[
                    { key: "title", label: "Title", value: r.title },
                    { key: "category", label: "Category", value: r.category },
                    { key: "likelihood", label: "Likelihood", value: String(r.likelihood) },
                    { key: "impact", label: "Impact", value: String(r.impact) },
                    {
                      key: "mitigation",
                      label: "Mitigation",
                      value: r.mitigation,
                      multiline: true,
                    },
                  ]}
                  onAccept={acceptRisk}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
