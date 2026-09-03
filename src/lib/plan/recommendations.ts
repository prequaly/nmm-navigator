// Rule-based "suggested for you" engine: reads completed assessment scores
// and turns each assessment's own canned advice (already written per
// maturity band in src/lib/assessments/configs.ts) into concrete,
// one-click-addable strategic priorities, risks, and KPIs. No AI call —
// this is deterministic and free, and is what the dashboard's
// AssessmentRecommendations panel and the Guided Plan Builder both read
// from so a suggestion looks the same wherever it appears.

import { supabase } from "@/integrations/supabase/client";
import { ALL } from "@/lib/assessments/configs";

export type Recommendation = {
  assessmentKey: string;
  assessmentTitle: string;
  score: number;
  maturity: string;
  advice: string[];
};

export async function loadRecommendations(orgId: string): Promise<Recommendation[]> {
  const { data, error } = await supabase
    .from("assessment_responses")
    .select("assessment_type,score,maturity_level,completed_at")
    .eq("organization_id", orgId)
    .not("completed_at", "is", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const seen = new Set<string>();
  const recs: Recommendation[] = [];
  for (const r of data ?? []) {
    if (seen.has(r.assessment_type)) continue; // keep only the most recent per type
    seen.add(r.assessment_type);
    const cfg = ALL[r.assessment_type as keyof typeof ALL];
    if (!cfg) continue;
    const score = r.score ?? 0;
    const band = cfg.recommendations.find((b) => score >= b.score[0] && score <= b.score[1]);
    if (!band) continue;
    recs.push({
      assessmentKey: r.assessment_type,
      assessmentTitle: cfg.title,
      score,
      maturity: r.maturity_level ?? band.maturity,
      advice: band.advice,
    });
  }
  // Lowest score (biggest opportunity) first.
  return recs.sort((a, b) => a.score - b.score);
}

async function nextPillarSort(orgId: string): Promise<number> {
  const { count } = await supabase
    .from("strategic_pillars")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);
  return count ?? 0;
}

export async function addAsPriority(
  orgId: string,
  planId: string,
  rec: Recommendation,
  adviceText: string,
) {
  const sort_order = await nextPillarSort(orgId);
  const { error } = await supabase.from("strategic_pillars").insert({
    organization_id: orgId,
    plan_id: planId,
    name: adviceText,
    description: `Suggested from your ${rec.assessmentTitle} assessment (${rec.score}/100).`,
    sort_order,
    priority_level: rec.score < 40 ? "high" : rec.score < 70 ? "medium" : "low",
  });
  if (error) throw error;
}

export async function addAsRisk(
  orgId: string,
  planId: string,
  rec: Recommendation,
  adviceText: string,
) {
  const { error } = await supabase.from("risks").insert({
    organization_id: orgId,
    plan_id: planId,
    title: adviceText,
    category: "Operational",
    likelihood: rec.score < 40 ? 4 : 3,
    impact: rec.score < 40 ? 4 : 3,
    mitigation: `Flagged from your ${rec.assessmentTitle} assessment (${rec.score}/100).`,
    status: "open",
  });
  if (error) throw error;
}

export async function addAsKpi(
  orgId: string,
  planId: string,
  rec: Recommendation,
  adviceText: string,
) {
  const { error } = await supabase.from("kpis").insert({
    organization_id: orgId,
    plan_id: planId,
    name: adviceText,
    category: rec.assessmentTitle,
  });
  if (error) throw error;
}
