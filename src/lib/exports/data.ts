import { supabase } from "@/integrations/supabase/client";

export type OrgRow = {
  id: string;
  name: string;
  mission: string | null;
  vision: string | null;
  values: string | null;
  annual_budget: number | null;
  staff_count: number | null;
  volunteer_count: number | null;
  geographic_area: string | null;
  beneficiaries: string | null;
};

export async function fetchOrg(orgId: string): Promise<OrgRow | null> {
  const { data } = await supabase
    .from("organizations")
    .select(
      "id,name,mission,vision,values,annual_budget,staff_count,volunteer_count,geographic_area,beneficiaries",
    )
    .eq("id", orgId)
    .maybeSingle();
  return (data as OrgRow) ?? null;
}

export async function fetchStrategicPlanData(orgId: string) {
  const [org, pillars, kpis, risks, okrs, roadmap, revenue, expenses, grants, narratives] =
    await Promise.all([
      fetchOrg(orgId),
      supabase
        .from("strategic_pillars")
        .select("id,name,description,sort_order")
        .eq("organization_id", orgId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("kpis")
        .select("id,name,category,unit,baseline,target,current_value,target_year,pillar_id")
        .eq("organization_id", orgId),
      supabase
        .from("risks")
        .select("id,title,category,likelihood,impact,mitigation")
        .eq("organization_id", orgId),
      supabase
        .from("okrs")
        .select("id,objective,quarter,status,owner,progress,pillar_id")
        .eq("organization_id", orgId),
      supabase
        .from("roadmap_items")
        .select("id,title,description,owner,start_date,end_date,status,pillar_id,sort_order")
        .eq("organization_id", orgId)
        .order("start_date", { ascending: true }),
      supabase
        .from("revenue_streams")
        .select("id,name,category,yearly_amounts,confidence,notes")
        .eq("organization_id", orgId),
      supabase
        .from("expense_lines")
        .select("id,name,category,program_name,yearly_amounts,notes")
        .eq("organization_id", orgId),
      supabase
        .from("grants")
        .select(
          "id,funder_name,grant_name,status,amount_requested,amount_awarded,probability,program_area,start_date,end_date",
        )
        .eq("organization_id", orgId),
      supabase
        .from("plan_narratives")
        .select("section_key,body,updated_at,ai_drafted_at")
        .eq("organization_id", orgId),
    ]);
  const narrativeMap: Record<
    string,
    { body: string; updated_at: string | null; ai_drafted_at: string | null }
  > = {};
  for (const n of (narratives.data ?? []) as Array<{
    section_key: string;
    body: string;
    updated_at: string | null;
    ai_drafted_at: string | null;
  }>) {
    narrativeMap[n.section_key] = {
      body: n.body,
      updated_at: n.updated_at,
      ai_drafted_at: n.ai_drafted_at,
    };
  }
  return {
    org,
    pillars: pillars.data ?? [],
    kpis: kpis.data ?? [],
    risks: risks.data ?? [],
    okrs: okrs.data ?? [],
    roadmap: roadmap.data ?? [],
    revenue: revenue.data ?? [],
    expenses: expenses.data ?? [],
    grants: grants.data ?? [],
    narratives: narrativeMap,
  };
}

export async function fetchBoardPacketData(orgId: string, meetingId?: string) {
  const org = await fetchOrg(orgId);

  let mtgQ = supabase
    .from("meetings")
    .select("id,title,scheduled_at,duration_minutes,location,status,summary,cadence")
    .eq("organization_id", orgId);
  if (meetingId) mtgQ = mtgQ.eq("id", meetingId);
  else mtgQ = mtgQ.order("scheduled_at", { ascending: false }).limit(1);

  const { data: meetingRows } = await mtgQ;
  const meeting = meetingRows?.[0];
  if (!meeting)
    return { org, meeting: null, agenda: [], attendees: [], decisions: [], actionItems: [] };

  const [agenda, attendees, decisions, actionItems] = await Promise.all([
    supabase
      .from("meeting_agenda_items")
      .select("id,title,description,duration_minutes,sort_order")
      .eq("meeting_id", meeting.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("meeting_attendees")
      .select("id,display_name,role,status")
      .eq("meeting_id", meeting.id),
    supabase
      .from("meeting_decisions")
      .select("id,title,rationale,decided_by,decided_at,impact,follow_up")
      .eq("meeting_id", meeting.id)
      .order("decided_at", { ascending: true }),
    supabase
      .from("meeting_action_items")
      .select("id,context,commitment_due_date,action_item_id,action_items(title,status,priority)")
      .eq("meeting_id", meeting.id),
  ]);
  return {
    org,
    meeting,
    agenda: agenda.data ?? [],
    attendees: attendees.data ?? [],
    decisions: decisions.data ?? [],
    actionItems: actionItems.data ?? [],
  };
}

export async function fetchFunderReportData(orgId: string) {
  const [org, grants, kpis, revenue, expenses] = await Promise.all([
    fetchOrg(orgId),
    supabase
      .from("grants")
      .select(
        "id,funder_name,grant_name,status,amount_requested,amount_awarded,probability,program_area,start_date,end_date",
      )
      .eq("organization_id", orgId),
    supabase
      .from("kpis")
      .select("id,name,category,unit,current_value,target")
      .eq("organization_id", orgId),
    supabase
      .from("revenue_streams")
      .select("id,name,category,yearly_amounts")
      .eq("organization_id", orgId),
    supabase
      .from("expense_lines")
      .select("id,name,category,yearly_amounts")
      .eq("organization_id", orgId),
  ]);
  return {
    org,
    grants: grants.data ?? [],
    kpis: kpis.data ?? [],
    revenue: revenue.data ?? [],
    expenses: expenses.data ?? [],
  };
}

export type FullOrgRow = OrgRow & {
  ein: string | null;
  tax_status: string | null;
  fiscal_sponsor_name: string | null;
  stage: string | null;
  year_founded: number | null;
};

async function fetchFullOrg(orgId: string): Promise<FullOrgRow | null> {
  const { data } = await supabase
    .from("organizations")
    .select(
      "id,name,mission,vision,values,annual_budget,staff_count,volunteer_count,geographic_area,beneficiaries,ein,tax_status,fiscal_sponsor_name,stage,year_founded",
    )
    .eq("id", orgId)
    .maybeSingle();
  return (data as FullOrgRow) ?? null;
}

export async function fetch306090Data(orgId: string) {
  const [org, actionItems, pillars] = await Promise.all([
    fetchOrg(orgId),
    supabase
      .from("action_items")
      .select("id,title,description,due_date,status,priority,owner_label,pillar_id")
      .eq("organization_id", orgId)
      .not("status", "in", "(done,cancelled)")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("strategic_pillars").select("id,name").eq("organization_id", orgId),
  ]);
  const pillarMap = new Map((pillars.data ?? []).map((p) => [p.id, p.name]));
  const items = (actionItems.data ?? []).map((a) => ({
    ...a,
    pillar_name: a.pillar_id ? (pillarMap.get(a.pillar_id) ?? null) : null,
  }));
  return { org, items };
}

export async function fetchImpactReportData(orgId: string) {
  const [org, assessments, pillars, narratives] = await Promise.all([
    fetchOrg(orgId),
    supabase
      .from("assessment_responses")
      .select("score,maturity_level,completed_at,reflection,notes")
      .eq("organization_id", orgId)
      .eq("assessment_type", "impact")
      .order("completed_at", { ascending: false })
      .limit(1),
    supabase
      .from("strategic_pillars")
      .select("id,name,description,impact_lenses,priority_level,timeline_start,timeline_end")
      .eq("organization_id", orgId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("plan_narratives")
      .select("section_key,body")
      .eq("organization_id", orgId)
      .eq("section_key", "strategic_issues")
      .maybeSingle(),
  ]);
  return {
    org,
    assessment: assessments.data?.[0] ?? null,
    pillars: pillars.data ?? [],
    narrativeBody: narratives.data?.body ?? "",
  };
}

export async function fetch4RsReportData(orgId: string) {
  const [org, assessments, pillars, narratives] = await Promise.all([
    fetchOrg(orgId),
    supabase
      .from("assessment_responses")
      .select("score,maturity_level,completed_at,reflection,notes")
      .eq("organization_id", orgId)
      .eq("assessment_type", "4rs")
      .order("completed_at", { ascending: false })
      .limit(1),
    supabase
      .from("strategic_pillars")
      .select("id,name,description,fourrs_dimensions,priority_level,timeline_start,timeline_end")
      .eq("organization_id", orgId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("plan_narratives")
      .select("section_key,body")
      .eq("organization_id", orgId)
      .eq("section_key", "financial_strategy")
      .maybeSingle(),
  ]);
  return {
    org,
    assessment: assessments.data?.[0] ?? null,
    pillars: pillars.data ?? [],
    narrativeBody: narratives.data?.body ?? "",
  };
}

export async function fetchRevenueDiversificationData(orgId: string) {
  const [org, revenue, assessment] = await Promise.all([
    fetchOrg(orgId),
    supabase
      .from("revenue_streams")
      .select("id,name,category,yearly_amounts,confidence")
      .eq("organization_id", orgId),
    supabase
      .from("assessment_responses")
      .select("score,maturity_level,completed_at")
      .eq("organization_id", orgId)
      .eq("assessment_type", "fundraising")
      .order("completed_at", { ascending: false })
      .limit(1),
  ]);
  const rows = revenue.data ?? [];
  const byCategory = new Map<string, number>();
  for (const r of rows) {
    const total = sumYearly([r]);
    byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + total);
  }
  const total = Array.from(byCategory.values()).reduce((a, b) => a + b, 0);
  const categories = Array.from(byCategory.entries())
    .map(([category, amount]) => ({ category, amount, share: total > 0 ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
  const hhi = categories.reduce((sum, c) => sum + c.share * c.share, 0);
  return { org, streams: rows, categories, total, hhi, assessment: assessment.data?.[0] ?? null };
}

export async function fetchFundingGapData(orgId: string) {
  const [org, asks, pillars] = await Promise.all([
    fetchOrg(orgId),
    supabase
      .from("asks")
      .select("id,title,type,status,amount,secured_amount,audience,pillar_id")
      .eq("organization_id", orgId),
    supabase.from("strategic_pillars").select("id,name").eq("organization_id", orgId),
  ]);
  const pillarMap = new Map((pillars.data ?? []).map((p) => [p.id, p.name]));
  const rows = (asks.data ?? []).map((a) => ({
    ...a,
    pillar_name: a.pillar_id ? (pillarMap.get(a.pillar_id) ?? null) : null,
    gap: Number(a.amount ?? 0) - Number(a.secured_amount ?? 0),
  }));
  const totalRequired = rows.reduce((s, a) => s + Number(a.amount ?? 0), 0);
  const totalSecured = rows.reduce((s, a) => s + Number(a.secured_amount ?? 0), 0);
  return { org, asks: rows, totalRequired, totalSecured, totalGap: totalRequired - totalSecured };
}

export async function fetchFinancialSustainabilityData(orgId: string) {
  const [org, assumptions, revenue, expenses] = await Promise.all([
    fetchOrg(orgId),
    supabase
      .from("financial_assumptions")
      .select(
        "current_reserve_balance,reserve_target_months,revenue_growth_rate,inflation_rate,fte_loaded_cost,base_year,notes",
      )
      .eq("organization_id", orgId)
      .maybeSingle(),
    supabase.from("revenue_streams").select("yearly_amounts").eq("organization_id", orgId),
    supabase.from("expense_lines").select("yearly_amounts").eq("organization_id", orgId),
  ]);
  const totalRevenue = sumYearly(revenue.data ?? []);
  const totalExpenses = sumYearly(expenses.data ?? []);
  const assumption = assumptions.data ?? null;
  const monthlyExpense = totalExpenses > 0 ? totalExpenses / 12 : 0;
  const reserveMonths =
    assumption && monthlyExpense > 0 ? assumption.current_reserve_balance / monthlyExpense : null;
  return {
    org,
    assumption,
    totalRevenue,
    totalExpenses,
    net: totalRevenue - totalExpenses,
    reserveMonths,
  };
}

export async function fetchProgramImpactData(orgId: string) {
  const [org, programs, kpis, assessment] = await Promise.all([
    fetchOrg(orgId),
    supabase
      .from("programs")
      .select("id,name,type,status,budget,participants,pillar_id")
      .eq("organization_id", orgId),
    supabase
      .from("kpis")
      .select("id,name,category,unit,baseline,current_value,target,target_year")
      .eq("organization_id", orgId),
    supabase
      .from("assessment_responses")
      .select("score,maturity_level,completed_at")
      .eq("organization_id", orgId)
      .eq("assessment_type", "program-impact")
      .order("completed_at", { ascending: false })
      .limit(1),
  ]);
  return {
    org,
    programs: programs.data ?? [],
    kpis: kpis.data ?? [],
    assessment: assessment.data?.[0] ?? null,
  };
}

export async function fetchGrantReadinessData(orgId: string) {
  const [org, boardMembers, policies, grantResponses, grants, assumptions, assessment] =
    await Promise.all([
      fetchFullOrg(orgId),
      supabase
        .from("board_members")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId),
      supabase
        .from("policies")
        .select("id,title,status", { count: "exact" })
        .eq("organization_id", orgId),
      supabase
        .from("grant_responses")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId),
      supabase
        .from("grants")
        .select("id,funder_name,grant_name,status,amount_requested,amount_awarded")
        .eq("organization_id", orgId),
      supabase
        .from("financial_assumptions")
        .select("id")
        .eq("organization_id", orgId)
        .maybeSingle(),
      supabase
        .from("assessment_responses")
        .select("score,maturity_level,completed_at")
        .eq("organization_id", orgId)
        .eq("assessment_type", "fundraising")
        .order("completed_at", { ascending: false })
        .limit(1),
    ]);
  const checklist = [
    { label: "EIN on file", done: !!org?.ein },
    { label: "Tax status recorded", done: !!org?.tax_status },
    { label: "Mission statement written", done: !!org?.mission },
    { label: "Vision statement written", done: !!org?.vision },
    { label: "At least 3 board members recorded", done: (boardMembers.count ?? 0) >= 3 },
    { label: "At least one governance policy on file", done: (policies.count ?? 0) > 0 },
    { label: "Financial assumptions / budget model built", done: !!assumptions.data },
    { label: "Grant Response Bank has reusable content", done: (grantResponses.count ?? 0) > 0 },
  ];
  return {
    org,
    checklist,
    readyCount: checklist.filter((c) => c.done).length,
    boardCount: boardMembers.count ?? 0,
    policyCount: policies.count ?? 0,
    grantResponseCount: grantResponses.count ?? 0,
    grants: grants.data ?? [],
    assessment: assessment.data?.[0] ?? null,
  };
}

export async function fetchAnnualOperatingPlanData(orgId: string) {
  const [org, pillars, kpis, roadmap, programs, revenue, expenses] = await Promise.all([
    fetchOrg(orgId),
    supabase
      .from("strategic_pillars")
      .select("id,name,description,priority_level,timeline_start,timeline_end")
      .eq("organization_id", orgId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("kpis")
      .select("id,name,category,unit,baseline,current_value,target,target_year,pillar_id")
      .eq("organization_id", orgId),
    supabase
      .from("roadmap_items")
      .select("id,title,owner,start_date,end_date,status,pillar_id")
      .eq("organization_id", orgId)
      .order("start_date", { ascending: true }),
    supabase
      .from("programs")
      .select("id,name,type,status,budget,participants,pillar_id")
      .eq("organization_id", orgId),
    supabase.from("revenue_streams").select("yearly_amounts").eq("organization_id", orgId),
    supabase.from("expense_lines").select("yearly_amounts").eq("organization_id", orgId),
  ]);
  return {
    org,
    pillars: pillars.data ?? [],
    kpis: kpis.data ?? [],
    roadmap: roadmap.data ?? [],
    programs: programs.data ?? [],
    totalRevenue: sumYearly(revenue.data ?? []),
    totalExpenses: sumYearly(expenses.data ?? []),
  };
}

export async function fetchLogicModelData(orgId: string) {
  const [org, toc] = await Promise.all([
    fetchOrg(orgId),
    supabase
      .from("theory_of_change")
      .select(
        "problem_statement,inputs,activities,outputs,outcomes,impact,assumptions,external_factors",
      )
      .eq("organization_id", orgId)
      .maybeSingle(),
  ]);
  const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
  return {
    org,
    toc: toc.data
      ? {
          problemStatement: toc.data.problem_statement,
          inputs: list(toc.data.inputs),
          activities: list(toc.data.activities),
          outputs: list(toc.data.outputs),
          outcomes: list(toc.data.outcomes),
          impact: list(toc.data.impact),
          assumptions: list(toc.data.assumptions),
          externalFactors: list(toc.data.external_factors),
        }
      : null,
  };
}

export async function fetchBenchmarkTrendData(orgId: string) {
  const { data } = await supabase
    .from("assessment_responses")
    .select("assessment_type,score,maturity_level,completed_at")
    .eq("organization_id", orgId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: true });
  return data ?? [];
}

export function formatMoney(n: number | null | undefined) {
  if (n == null || isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(n));
}

export function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function sumYearly(rows: Array<{ yearly_amounts: unknown }>) {
  let total = 0;
  for (const r of rows) {
    const ya = r.yearly_amounts;
    if (!ya) continue;
    if (Array.isArray(ya)) total += ya.reduce((a: number, b: unknown) => a + Number(b ?? 0), 0);
    else if (typeof ya === "object") {
      for (const v of Object.values(ya)) total += Number(v ?? 0);
    }
  }
  return total;
}

export function parseValues(values: string | null): string[] {
  if (!values) return [];
  try {
    const parsed = JSON.parse(values);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // fallback: split lines/commas
  }
  return values
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
}
