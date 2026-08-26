import { supabase } from "@/integrations/supabase/client";

export type JourneyStageId =
  | "foundation"
  | "assess"
  | "plan"
  | "roadmap"
  | "budget"
  | "funding"
  | "execute"
  | "measure";

export type JourneyStage = {
  id: JourneyStageId;
  label: string;
  description: string;
  to: string;
  done: boolean;
  cta: string;
};

export type JourneyState = {
  stages: JourneyStage[];
  currentIndex: number;
  completionPct: number;
  nextStage: JourneyStage | null;
};

export async function loadJourneyState(orgId: string): Promise<JourneyState> {
  const [org, assessments, pillars, kpis, revenue, expenses, grants, actionsDone, kpisMeasured] =
    await Promise.all([
      supabase.from("organizations").select("mission,vision,values").eq("id", orgId).maybeSingle(),
      supabase.from("assessment_responses").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("strategic_pillars").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("kpis").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("revenue_streams").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("expense_lines").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("grants").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("action_items").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "done"),
      supabase.from("kpis").select("id", { count: "exact", head: true }).eq("organization_id", orgId).not("current_value", "is", null),
    ]);

  const missionOk = !!(org.data?.mission && org.data?.vision);
  const stages: JourneyStage[] = [
    {
      id: "foundation",
      label: "Foundation",
      description: "Mission, vision, and values",
      to: "/values",
      cta: "Anchor your identity",
      done: missionOk,
    },
    {
      id: "assess",
      label: "Assess",
      description: "Understand where you stand today",
      to: "/assess/health",
      cta: "Take a health check",
      done: (assessments.count ?? 0) > 0,
    },
    {
      id: "plan",
      label: "Plan",
      description: "Define strategic pillars",
      to: "/plan/builder",
      cta: "Draft your pillars",
      done: (pillars.count ?? 0) >= 3,
    },
    {
      id: "roadmap",
      label: "Measure",
      description: "Set 3+ KPIs to track",
      to: "/plan/kpis",
      cta: "Add KPIs",
      done: (kpis.count ?? 0) >= 3,
    },
    {
      id: "budget",
      label: "Budget",
      description: "Model revenue and expenses",
      to: "/fund/budget",
      cta: "Build your budget",
      done: ((revenue.count ?? 0) + (expenses.count ?? 0)) > 0,
    },
    {
      id: "funding",
      label: "Fund",
      description: "Track grants and pipeline",
      to: "/fund/grants",
      cta: "Log a grant",
      done: (grants.count ?? 0) > 0,
    },
    {
      id: "execute",
      label: "Execute",
      description: "Complete your first action",
      to: "/execute/tasks",
      cta: "Close a task",
      done: (actionsDone.count ?? 0) > 0,
    },
    {
      id: "measure",
      label: "Improve",
      description: "Log KPI values and review",
      to: "/plan/kpis",
      cta: "Log a KPI value",
      done: (kpisMeasured.count ?? 0) > 0,
    },
  ];

  const doneCount = stages.filter((s) => s.done).length;
  const nextStage = stages.find((s) => !s.done) ?? null;
  const currentIndex = nextStage ? stages.indexOf(nextStage) : stages.length - 1;

  return {
    stages,
    currentIndex,
    completionPct: Math.round((doneCount / stages.length) * 100),
    nextStage,
  };
}

export function greetingFor(name: string | null | undefined): string {
  const hour = new Date().getHours();
  const prefix = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const first = (name ?? "").split(" ")[0];
  return first ? `${prefix}, ${first}` : prefix;
}
