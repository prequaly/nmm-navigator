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
    .select(
      "id,title,scheduled_at,duration_minutes,location,status,summary,cadence",
    )
    .eq("organization_id", orgId);
  if (meetingId) mtgQ = mtgQ.eq("id", meetingId);
  else mtgQ = mtgQ.order("scheduled_at", { ascending: false }).limit(1);

  const { data: meetingRows } = await mtgQ;
  const meeting = meetingRows?.[0];
  if (!meeting) return { org, meeting: null, agenda: [], attendees: [], decisions: [], actionItems: [] };

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
      .select(
        "id,context,commitment_due_date,action_item_id,action_items(title,status,priority)",
      )
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

export function sumYearly(rows: Array<{ yearly_amounts: any }>) {
  let total = 0;
  for (const r of rows) {
    const ya = r.yearly_amounts;
    if (!ya) continue;
    if (Array.isArray(ya)) total += ya.reduce((a: number, b: any) => a + Number(b ?? 0), 0);
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
