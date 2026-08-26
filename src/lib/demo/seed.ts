// Client-side seeder that populates the user's current org with realistic
// "Riverside Youth Arts Collective" demo data. RLS applies — the caller
// must be an editor/owner of the org.
import { supabase } from "@/integrations/supabase/client";

const MONTHS = 12;
const monthly = (annual: number) =>
  Array.from({ length: MONTHS }, () => Math.round((annual / MONTHS) * 100) / 100);

// Slight seasonality so charts look real.
const seasonal = (annual: number, weights: number[]) => {
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Math.round((annual * (w / sum)) * 100) / 100);
};

const ORG = {
  name: "Riverside Youth Arts Collective (Demo)",
  mission:
    "To provide structured mentorship and creative space for marginalized youth to shape community development through muralism, music, and storytelling.",
  vision:
    "A region where every young person has the agency, skills, and platform to author the story of their neighborhood.",
  values: "Youth voice first • Radical hospitality • Artistic excellence • Equity in every decision",
  annual_budget: 478000,
  staff_count: 6,
  volunteer_count: 42,
  geographic_area: "Riverside & San Bernardino Counties, CA",
  beneficiaries: "Youth ages 12–24, predominantly Latinx and Black, from Title I districts",
  long_term_goals:
    "Reach 1,200 youth annually by 2027 • Build a permanent creative campus in the Eastside • Achieve a 0.25 HHI revenue diversification score",
};

/** Returns true if the org already has substantive data — used to warn. */
export async function orgHasData(orgId: string): Promise<boolean> {
  const checks = await Promise.all([
    supabase.from("strategic_pillars").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("grants").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("revenue_streams").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("kpis").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
  ]);
  return checks.some((c) => (c.count ?? 0) > 0);
}

export async function clearSampleData(orgId: string) {
  // Order matters: children before parents (action_items reference pillars/okrs/roadmap).
  const tables = [
    "action_items",
    "okrs",
    "roadmap_items",
    "kpis",
    "risks",
    "theory_of_change",
    "strategic_pillars",
    "revenue_streams",
    "expense_lines",
    "grants",
    "assessment_responses",
    "strategic_plans",
  ] as const;
  for (const t of tables) {
    await supabase.from(t).delete().eq("organization_id", orgId);
  }
}

export async function seedSampleData(orgId: string) {
  // 1. Update org profile
  await supabase.from("organizations").update({
    mission: ORG.mission,
    vision: ORG.vision,
    values: ORG.values,
    annual_budget: ORG.annual_budget,
    staff_count: ORG.staff_count,
    volunteer_count: ORG.volunteer_count,
    geographic_area: ORG.geographic_area,
    beneficiaries: ORG.beneficiaries,
    long_term_goals: ORG.long_term_goals,
    onboarded_at: new Date().toISOString(),
  }).eq("id", orgId);

  // 2. Strategic plan
  const { data: plan, error: planErr } = await supabase
    .from("strategic_plans")
    .insert({
      organization_id: orgId,
      name: "2025–2027 Strategic Plan",
      fiscal_year_start: new Date().getFullYear(),
      planning_horizon_years: 3,
      status: "active",
      executive_summary:
        "Three-year plan focused on revenue diversification, opening the Eastside studio, building an org-wide evaluation framework, and strengthening the board.",
    })
    .select("id")
    .single();
  if (planErr || !plan) throw planErr ?? new Error("Failed to create plan");
  const planId = plan.id;

  // 3. Pillars
  const pillars = [
    { name: "Revenue Diversification", description: "Reduce concentration risk and grow earned + individual revenue.", color: "#2563eb", sort_order: 1 },
    { name: "Eastside Studio", description: "Open a permanent creative campus serving 400+ youth annually.", color: "#10b981", sort_order: 2 },
    { name: "Evaluation Framework", description: "Adopt a shared outcomes framework across all programs.", color: "#f59e0b", sort_order: 3 },
    { name: "Board & Governance", description: "Recruit, onboard, and engage a high-performing board.", color: "#8b5cf6", sort_order: 4 },
  ];
  const { data: insertedPillars } = await supabase
    .from("strategic_pillars")
    .insert(pillars.map((p) => ({ ...p, plan_id: planId, organization_id: orgId })))
    .select("id,name");
  const pid = (n: string) => insertedPillars?.find((p) => p.name === n)?.id;

  // 4. KPIs
  await supabase.from("kpis").insert([
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Revenue Diversification"), name: "Individual Revenue", category: "Financial", unit: "USD", baseline: 118000, current_value: 124000, target: 165000, target_year: new Date().getFullYear() + 1 },
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Revenue Diversification"), name: "Revenue HHI", category: "Financial", unit: "index", baseline: 0.42, current_value: 0.42, target: 0.30, target_year: new Date().getFullYear() + 1 },
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Eastside Studio"), name: "Youth Served Annually", category: "Impact", unit: "youth", baseline: 768, current_value: 812, target: 1200, target_year: new Date().getFullYear() + 2 },
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Evaluation Framework"), name: "Programs Using Framework", category: "Operations", unit: "programs", baseline: 0, current_value: 1, target: 4, target_year: new Date().getFullYear() + 1 },
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Board & Governance"), name: "Board Engagement", category: "Governance", unit: "avg meetings", baseline: 4.2, current_value: 4.5, target: 5.0, target_year: new Date().getFullYear() + 1 },
    { plan_id: planId, organization_id: orgId, name: "Days Cash on Hand", category: "Financial", unit: "days", baseline: 62, current_value: 71, target: 90, target_year: new Date().getFullYear() + 1 },
  ]);

  // 5. OKRs
  await supabase.from("okrs").insert([
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Revenue Diversification"), objective: "Grow individual giving to $165k", owner: "Dev Director", quarter: "Q4", status: "on_track", progress: 0.55, key_results: ["Year-end appeal launched by Dec 3", "Monthly giving program: 80 donors", "Major donor pipeline: 15 prospects"] },
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Eastside Studio"), objective: "Sign Eastside studio lease", owner: "Executive Director", quarter: "Q2", status: "at_risk", progress: 0.40, key_results: ["3 site visits complete", "Lead gift secured", "Build-out plan approved"] },
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Evaluation Framework"), objective: "Deploy evaluation framework across 4 programs", owner: "Program Director", quarter: "Q2", status: "on_track", progress: 0.25, key_results: ["Framework design complete", "Pilot launched Feb 15", "Staff trained"] },
  ]);

  // 6. Roadmap items
  const today = new Date();
  const addMonths = (m: number) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + m);
    return d.toISOString().slice(0, 10);
  };
  await supabase.from("roadmap_items").insert([
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Revenue Diversification"), title: "Diversification audit", owner: "Dev Director", start_date: addMonths(0), end_date: addMonths(2), status: "in_progress", progress: 0.6 },
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Revenue Diversification"), title: "Year-end appeal campaign", owner: "Dev Director", start_date: addMonths(2), end_date: addMonths(4), status: "not_started", progress: 0 },
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Eastside Studio"), title: "Site selection", owner: "Executive Director", start_date: addMonths(0), end_date: addMonths(2), status: "in_progress", progress: 0.7 },
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Eastside Studio"), title: "Lease negotiation", owner: "Executive Director", start_date: addMonths(2), end_date: addMonths(4), status: "not_started", progress: 0 },
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Evaluation Framework"), title: "Framework design", owner: "Program Director", start_date: addMonths(0), end_date: addMonths(1), status: "in_progress", progress: 0.8 },
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Evaluation Framework"), title: "Pilot deployment", owner: "Program Director", start_date: addMonths(1), end_date: addMonths(3), status: "not_started", progress: 0 },
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Board & Governance"), title: "Recruit 3 new board members", owner: "Board Chair", start_date: addMonths(1), end_date: addMonths(5), status: "in_progress", progress: 0.3 },
  ]);

  // 7. Risks
  await supabase.from("risks").insert([
    { plan_id: planId, organization_id: orgId, title: "Foundation funding concentration", description: "45% of revenue from 3 foundations.", category: "Financial", likelihood: 4, impact: 5, mitigation: "Diversification campaign; grow individual giving 40%.", owner: "Dev Director", status: "open" },
    { plan_id: planId, organization_id: orgId, title: "Board turnover", description: "3 members term-limited in 2025.", category: "Governance", likelihood: 5, impact: 3, mitigation: "Active prospecting; nominating committee revival.", owner: "Board Chair", status: "open" },
    { plan_id: planId, organization_id: orgId, title: "Inflationary venue costs", description: "Studio rents up 18% YoY.", category: "Operational", likelihood: 4, impact: 4, mitigation: "Long-term lease in Eastside; landlord partnership.", owner: "Executive Director", status: "open" },
    { plan_id: planId, organization_id: orgId, title: "Tech stack fragmentation", description: "CRM, accounting, program data live in 5 tools.", category: "Operational", likelihood: 3, impact: 3, mitigation: "Tech audit Q2; consolidation plan Q3.", owner: "Operations Lead", status: "open" },
    { plan_id: planId, organization_id: orgId, title: "Key person dependency", description: "ED holds most funder relationships.", category: "Strategic", likelihood: 3, impact: 5, mitigation: "Cross-train Dev Director; share top-25 funder accounts.", owner: "Executive Director", status: "monitoring" },
  ]);

  // 8. Theory of Change
  await supabase.from("theory_of_change").insert({
    plan_id: planId,
    organization_id: orgId,
    problem_statement: "Marginalized youth in Riverside lack creative outlets, mentorship, and platforms to influence their neighborhoods.",
    inputs: ["Teaching artists", "Foundation funding", "School partnerships", "Studio space"],
    activities: ["After-school mural cohorts", "Summer songwriters lab", "First Friday open studio", "Teaching-artist mentorship"],
    outputs: ["1,200 youth served annually", "120 finished public artworks", "40 teaching-artist hours/week"],
    outcomes: ["Increased youth agency", "Improved school engagement", "Stronger community cultural identity"],
    impact: "A region where every young person has the agency to shape their neighborhood's story.",
    assumptions: "Schools remain open to outside arts partners; foundation funding for youth arts holds steady.",
  });

  // 9. Revenue streams (yearly amounts, monthly array)
  await supabase.from("revenue_streams").insert([
    { plan_id: planId, organization_id: orgId, name: "Foundation Grants", category: "Grants", yearly_amounts: seasonal(215000, [10, 9, 9, 8, 8, 8, 8, 8, 8, 8, 8, 8]), confidence: "high", sort_order: 1 },
    { plan_id: planId, organization_id: orgId, name: "Individual Donors", category: "Contributions", yearly_amounts: seasonal(118000, [6, 6, 7, 7, 7, 7, 7, 8, 8, 10, 13, 14]), confidence: "medium", sort_order: 2 },
    { plan_id: planId, organization_id: orgId, name: "Earned (Workshops)", category: "Earned", yearly_amounts: seasonal(78000, [6, 6, 8, 9, 10, 10, 12, 12, 10, 7, 5, 5]), confidence: "high", sort_order: 3 },
    { plan_id: planId, organization_id: orgId, name: "Government", category: "Government", yearly_amounts: monthly(42000), confidence: "medium", sort_order: 4 },
    { plan_id: planId, organization_id: orgId, name: "Corporate", category: "Corporate", yearly_amounts: seasonal(25000, [5, 6, 7, 8, 9, 9, 9, 9, 9, 10, 10, 9]), confidence: "low", sort_order: 5 },
  ]);

  // 10. Expense lines
  await supabase.from("expense_lines").insert([
    { plan_id: planId, organization_id: orgId, name: "Program Salaries", category: "Personnel", yearly_amounts: monthly(296000), sort_order: 1 },
    { plan_id: planId, organization_id: orgId, name: "Admin & Operations", category: "Operations", yearly_amounts: monthly(98000), sort_order: 2 },
    { plan_id: planId, organization_id: orgId, name: "Fundraising", category: "Fundraising", yearly_amounts: seasonal(52000, [6, 6, 7, 7, 8, 8, 8, 9, 9, 11, 12, 9]), sort_order: 3 },
    { plan_id: planId, organization_id: orgId, name: "Facilities", category: "Operations", yearly_amounts: monthly(58000), sort_order: 4 },
  ]);

  // 11. Grants
  const inMonths = (m: number) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + m);
    return d.toISOString().slice(0, 10);
  };
  await supabase.from("grants").insert([
    { organization_id: orgId, plan_id: planId, funder_name: "Irvine Foundation", grant_name: "Youth Arts General Operating", grant_type: "general_operating", status: "awarded", restriction: "unrestricted", amount_requested: 75000, amount_awarded: 75000, probability: 100, start_date: inMonths(-2), end_date: inMonths(10), program_area: "Operating" },
    { organization_id: orgId, plan_id: planId, funder_name: "California Arts Council", grant_name: "Creative Youth Development", grant_type: "program", status: "awarded", restriction: "temporarily_restricted", amount_requested: 60000, amount_awarded: 60000, probability: 100, start_date: inMonths(-1), end_date: inMonths(11), program_area: "After-School Murals" },
    { organization_id: orgId, plan_id: planId, funder_name: "NEA", grant_name: "Challenge America", grant_type: "program", status: "pending", restriction: "temporarily_restricted", amount_requested: 50000, probability: 60, application_deadline: inMonths(1), program_area: "Summer Songwriters Lab" },
    { organization_id: orgId, plan_id: planId, funder_name: "Weingart Foundation", grant_name: "Capacity Building Initiative", grant_type: "capacity_building", status: "applied", restriction: "temporarily_restricted", amount_requested: 40000, probability: 45, application_deadline: inMonths(2), program_area: "Evaluation Framework" },
    { organization_id: orgId, plan_id: planId, funder_name: "Bank of America", grant_name: "Neighborhood Builders", grant_type: "general_operating", status: "prospect", restriction: "unrestricted", amount_requested: 200000, probability: 20, application_deadline: inMonths(4), program_area: "Eastside Studio" },
    { organization_id: orgId, plan_id: planId, funder_name: "Local Family Foundation", grant_name: "Multi-year Operating", grant_type: "multi_year", status: "active", restriction: "unrestricted", amount_requested: 90000, amount_awarded: 90000, probability: 100, start_date: inMonths(-6), end_date: inMonths(6), program_area: "Operating" },
  ]);

  // 12. Action items
  await supabase.from("action_items").insert([
    { organization_id: orgId, plan_id: planId, pillar_id: pid("Revenue Diversification"), title: "Draft year-end appeal copy", owner_label: "Dev Director", status: "in_progress", priority: "high", percent_complete: 40, due_date: inMonths(1) },
    { organization_id: orgId, plan_id: planId, pillar_id: pid("Revenue Diversification"), title: "Launch monthly giving program", owner_label: "Dev Director", status: "not_started", priority: "high", due_date: inMonths(2) },
    { organization_id: orgId, plan_id: planId, pillar_id: pid("Eastside Studio"), title: "Tour 3 candidate spaces", owner_label: "Executive Director", status: "in_progress", priority: "critical", percent_complete: 66, due_date: inMonths(0) },
    { organization_id: orgId, plan_id: planId, pillar_id: pid("Eastside Studio"), title: "Lead gift cultivation meeting", owner_label: "Board Chair", status: "not_started", priority: "high", due_date: inMonths(1) },
    { organization_id: orgId, plan_id: planId, pillar_id: pid("Evaluation Framework"), title: "Finalize logic model with team", owner_label: "Program Director", status: "in_progress", priority: "medium", percent_complete: 75, due_date: inMonths(0) },
    { organization_id: orgId, plan_id: planId, pillar_id: pid("Board & Governance"), title: "Send prospect outreach emails (8)", owner_label: "Board Chair", status: "not_started", priority: "medium", due_date: inMonths(1) },
    { organization_id: orgId, plan_id: planId, title: "Submit NEA Challenge America application", owner_label: "Dev Director", status: "in_progress", priority: "critical", percent_complete: 50, due_date: inMonths(1) },
    { organization_id: orgId, plan_id: planId, title: "Q1 financial review with treasurer", owner_label: "Executive Director", status: "not_started", priority: "medium", due_date: inMonths(2) },
  ]);

  // 13. A completed Health Check assessment so recommendations populate
  await supabase.from("assessment_responses").insert({
    plan_id: planId,
    organization_id: orgId,
    assessment_type: "health",
    score: 84,
    maturity_level: "Maturing",
    responses: { summary: "Sample completed assessment from demo data." },
    completed_at: new Date().toISOString(),
  });
}
