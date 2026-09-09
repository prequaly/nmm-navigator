// Client-side seeder that populates the user's current org with realistic
// "Riverside Youth Arts Collective" demo data. RLS applies — the caller
// must be an editor/owner of the org.
import { supabase } from "@/integrations/supabase/client";
import type { AssessmentConfig } from "@/components/assessments/AssessmentRunner";
import {
  HEALTH,
  CAPACITY,
  FINANCIAL,
  FUNDRAISING,
  PROGRAM_IMPACT,
  GOVERNANCE,
  COMMUNITY,
  DIGITAL,
  DEI,
  IMPACT,
  FOURRS,
} from "@/lib/assessments/configs";
import { computeScore, normalizeAnswers } from "@/lib/assessments/scoring";

// revenue_streams/expense_lines.yearly_amounts is a {y1..y5} object (see
// fund.budget.tsx's YearlyAmounts type) — a 5-year budget horizon, not a
// 12-month breakdown. year1 is the baseline; growth compounds each year.
const years5 = (year1: number, growth = 0.04) => {
  const out: Record<string, number> = {};
  let amount = year1;
  for (let i = 1; i <= 5; i++) {
    out[`y${i}`] = Math.round(amount);
    amount *= 1 + growth;
  }
  return out;
};

/**
 * Answers every question in an assessment by cycling a 1-5 pattern, so the
 * stored responses, the computed score, and the maturity band all derive from
 * the same source instead of being three hand-written numbers that drift.
 */
function answersFor(config: AssessmentConfig, pattern: number[]) {
  const responses: Record<string, { status: "historical"; value: number }> = {};
  config.questions.forEach((q, i) => {
    responses[q.id] = { status: "historical", value: pattern[i % pattern.length] };
  });
  return responses;
}

// Patterns are chosen to land each assessment in a plausible band for an org
// at this stage: strong on program and community, weak on finance and data.
const ASSESSMENT_SPECS: { type: string; config: AssessmentConfig; pattern: number[] }[] = [
  { type: "health", config: HEALTH, pattern: [4, 5, 4, 4, 3, 4, 5] },
  { type: "capacity", config: CAPACITY, pattern: [3, 3, 2, 4, 2, 3, 3] },
  { type: "financial", config: FINANCIAL, pattern: [2, 4, 4, 3, 2, 3, 4] },
  { type: "fundraising", config: FUNDRAISING, pattern: [4, 3, 3, 4, 2, 3, 4] },
  { type: "program-impact", config: PROGRAM_IMPACT, pattern: [4, 3, 4, 2, 3, 2, 3] },
  { type: "governance", config: GOVERNANCE, pattern: [4, 3, 5, 4, 3, 2, 3] },
  { type: "community", config: COMMUNITY, pattern: [5, 4, 4, 5, 3, 4, 5] },
  { type: "digital", config: DIGITAL, pattern: [3, 4, 3, 3, 2, 2, 4] },
  { type: "dei", config: DEI, pattern: [4, 4, 5, 3, 4, 3, 4] },
  { type: "impact", config: IMPACT, pattern: [5, 3, 3, 4, 5, 3, 4, 2] },
  { type: "4rs", config: FOURRS, pattern: [4, 2, 3, 3, 4, 3, 4, 2] },
];

/**
 * Narrative sections, keyed to PLAN_SECTIONS. Written with the IMPACT and 4Rs
 * sub-headings where they genuinely fit rather than in every section — the
 * coverage meters are more useful to look at when they aren't all pinned at
 * 100%.
 */
const PLAN_NARRATIVES: [string, string][] = [
  [
    "executive_summary",
    `Riverside Youth Arts Collective turns creative practice into civic agency for young people in Riverside and San Bernardino Counties. Over the next three years we will serve 1,200 youth annually, open a permanent creative campus in the Eastside, and cut our revenue concentration nearly in half.

**Inclusive Partnerships:** Every program is co-designed with at least one school or neighborhood partner, and this plan formalizes those relationships into written agreements rather than handshakes.

**Measurable Outcomes:** All four programs move onto a shared outcomes framework this year, so results are comparable across programs instead of anecdotal within them.

**Community Empowerment:** Youth and family voice moves from advisory to decision-making, including seats on the program design committee and paid roles for alumni.

The plan rests on three commitments the board has already funded: diversify revenue, secure permanent space, and measure what we claim.`,
  ],
  [
    "organizational_overview",
    `Founded in 2015, Riverside Youth Arts Collective provides structured mentorship and creative space for marginalized youth to shape community development through muralism, music, and storytelling. We serve youth ages 12–24, predominantly Latinx and Black, from Title I districts.

We run four programs: After-School Mural Cohorts, the Summer Songwriters Lab, Teaching-Artist Mentorship, and First Friday Open Studio. Last year they reached 812 young people and produced 41 public artworks.

Six staff and 42 active volunteers deliver the work on a $478,000 budget. Our teaching artists are working practitioners rather than visiting instructors, which is the single thing participants cite most in exit surveys.

Our values — youth voice first, radical hospitality, artistic excellence, and equity in every decision — are not wall decoration. Each one has a corresponding practice in this plan, and where a value and a budget line disagree, the plan says which wins.`,
  ],
  [
    "current_state",
    `We enter this plan strong on program and weak on infrastructure.

**Strengths:** completion rates near 88%, two multi-year funders who renewed unprompted, and an alumni pipeline that now supplies paid teaching assistants. Community engagement scored highest of our eleven assessments.

**Weaknesses:** 45% of revenue sits with three foundations. We have no permanent space, so every cohort depends on borrowed rooms. Outcome data is collected per-program in incompatible formats. And the Executive Director personally holds nearly every funder relationship.

**Results:** where we do measure, the numbers hold up — the last mural cohort raised participants' school attendance from 61% to 89%. The problem is not performance, it is that we cannot yet prove performance consistently across programs. That gap is what the evaluation framework in this plan exists to close.`,
  ],
  [
    "strategic_issues",
    `Four issues will decide the next three years.

**Adaptive Strategies:** Revenue concentration is the existential one. Losing any of our three largest foundations would cut roughly a fifth of the budget mid-year, and our reserve currently covers under two months. We are treating diversification as a capacity project with targets, not an aspiration.

**Purpose-Driven Innovation:** Borrowed space caps what we can offer. A permanent Eastside studio lets us run recording and late-hours programming that borrowed rooms structurally cannot support.

**Measurable Outcomes:** Without a shared framework, we cannot tell which program produces which result, so we cannot allocate honestly between them.

**Transparency & Accountability:** Board turnover of three members next year is a governance risk we would rather name now and recruit against than absorb quietly later.`,
  ],
  [
    "financial_strategy",
    `The financial strategy has one organizing goal: make no single funder capable of breaking us.

**Resources:** We will grow individual giving from $118,000 to $165,000, launch a monthly sustainer program targeting 80 donors, and hold foundation revenue flat in dollar terms so its share falls as the rest grows. Target HHI moves from 0.42 to below 0.30.

**Relationships:** Funder relationships move off one desk. The Development Director takes named ownership of the top 25 accounts alongside the Executive Director, so a departure is a disruption rather than a cliff.

Operating reserves are the other half. We hold roughly two months against a six-month policy target. The board reaffirmed the six-month target rather than lowering it, and the treasurer is modeling a path there that does not come out of program budgets.`,
  ],
  [
    "program_enhancements",
    `Programs grow along one axis: depth before breadth.

The Eastside studio makes recording, late-hours access, and year-round cohorts possible for the first time. Rather than adding a fifth program, we are deepening the four we run — longer cohorts, more contact hours per participant, and a paid alumni track that turns graduates into teaching assistants.

**Purpose-Driven Innovation:** The Songwriters Lab moves from a summer intensive to a year-round cycle once the studio opens, which the current borrowed-room model cannot support.

Curriculum work this year focuses on making the mural and songwriting cohorts share a common arc — orientation, skill-building, public work, reflection — so that a young person moving between them is not starting over, and so evaluation can compare like with like.`,
  ],
  [
    "community_engagement",
    `**Inclusive Partnerships:** Riverside Unified School District, the Eastside Neighborhood Council, and two community arts organizations are our standing partners. This plan converts each from an informal relationship into a written agreement with shared evaluation, because partnerships that are never written down tend to disappear when the person who made them leaves.

**Community Empowerment:** Participants and families already advise on program design. Over this plan they gain decision rights: two youth seats on the program committee, and compensation for community advisors, which we currently ask for free.

First Friday Open Studio remains our front door to the neighborhood — the one evening a month where the work is public, the building is open, and families who have never enrolled anyone can see what the program actually is.`,
  ],
  [
    "leadership_succession",
    `Our sharpest internal risk is concentration of relationships and knowledge in two roles.

The Executive Director holds most funder relationships and much of the institutional memory; the Development Director position has no identified backup at all. Neither role has a documented handover.

Over this plan: every critical role gets a written role description, a named backup, and a documented handover; the top 25 funder accounts are shared between at least two people; and the board's governance committee maintains a standing emergency succession plan reviewed annually rather than assembled in a crisis.

Board succession runs in parallel. Three members term out next year, and the recruitment slate targets the two skill gaps our board matrix shows: finance and real estate.`,
  ],
  [
    "measurement_evaluation",
    `**Measurable Outcomes:** All four programs adopt one shared outcomes framework this year — the same instrument, the same cadence — so results are comparable across programs rather than trapped inside them.

We track youth served, program completion, school engagement where districts share it, and artistic output. Each strategic priority carries KPIs with baselines and targets, reviewed monthly by staff and quarterly by the board.

**Results:** Reporting is not only upward. Outcomes go to the community quarterly, in plain language, through Open Studio and our newsletter. We also intend to report what did not work: the innovation budget is only defensible if failures are visible alongside successes.

The evaluation framework itself is grant-funded and already committed, so this is a scheduled build rather than a hope.`,
  ],
  [
    "risk_mitigation",
    `Five risks are on the register with named owners and review at every board meeting.

Foundation concentration (likelihood 4, impact 5) is mitigated by the diversification campaign and the 40% individual-giving growth target. Inflationary venue costs (4, 4) are mitigated by pursuing a long-term Eastside lease rather than rolling short ones. Board turnover (5, 3) is mitigated by active prospecting and a revived nominating committee. Key-person dependency (3, 5) is mitigated by cross-training and shared funder accounts. Tech fragmentation (3, 3) gets an audit this year and a consolidation plan next.

**Transparency & Accountability:** The register is reviewed in the open at board meetings, and any risk scoring 16 or above triggers a board-level mitigation discussion rather than a staff-level note.`,
  ],
  [
    "conclusion",
    `This plan is deliberately narrow. Four priorities, not twelve. Depth in four programs rather than a fifth. One measurement framework rather than four incompatible ones.

**Reputation:** What we are protecting is the thing participants say most often — that this is a place where they are treated as artists with something to say, not as a population to be served. Every commitment here is downstream of that.

Three years out, success looks concrete: 1,200 young people a year, a permanent Eastside home, revenue no single funder can break, and outcomes we can prove rather than assert.

The board has funded the first year of this plan. The rest is execution, reviewed quarterly, adjusted honestly, and reported to the community that this work belongs to.`,
  ],
];

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
  // Order matters: children before parents (action_items reference pillars/okrs/roadmap,
  // meeting_* reference meetings, programs/asks reference pillars).
  const tables = [
    "meeting_decisions",
    "meeting_attendees",
    "meeting_agenda_items",
    "meetings",
    "action_items",
    "okrs",
    "roadmap_items",
    "kpis",
    "risks",
    "theory_of_change",
    "swot_items",
    "stakeholders",
    "programs",
    "plan_narratives",
    "board_members",
    "staff_roles",
    "policies",
    "asks",
    "impact_stories",
    "compliance_items",
    "touchpoints",
    "donor_segments",
    "coffee_chats",
    "grant_responses",
    "tax_filings",
    "budget_scenarios",
    "financial_assumptions",
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
    {
      plan_id: planId,
      organization_id: orgId,
      pillar_id: pid("Revenue Diversification"),
      objective: "Grow individual giving to $165k",
      owner: "Dev Director",
      quarter: "Q4",
      status: "on_track",
      progress: 0.55,
      key_results: [
        { kr: "Year-end appeal launched by Dec 3", metric: "launched", actual: 1, target: 1 },
        { kr: "Monthly giving program: 80 donors", metric: "donors", actual: 44, target: 80 },
        { kr: "Major donor pipeline: 15 prospects", metric: "prospects", actual: 9, target: 15 },
      ],
    },
    {
      plan_id: planId,
      organization_id: orgId,
      pillar_id: pid("Eastside Studio"),
      objective: "Sign Eastside studio lease",
      owner: "Executive Director",
      quarter: "Q2",
      status: "at_risk",
      progress: 0.4,
      key_results: [
        { kr: "3 site visits complete", metric: "visits", actual: 3, target: 3 },
        { kr: "Lead gift secured", metric: "gift", actual: 0, target: 1 },
        { kr: "Build-out plan approved", metric: "plan", actual: 0, target: 1 },
      ],
    },
    {
      plan_id: planId,
      organization_id: orgId,
      pillar_id: pid("Evaluation Framework"),
      objective: "Deploy evaluation framework across 4 programs",
      owner: "Program Director",
      quarter: "Q2",
      status: "on_track",
      progress: 0.25,
      key_results: [
        { kr: "Framework design complete", metric: "design", actual: 1, target: 1 },
        { kr: "Pilot launched Feb 15", metric: "pilot", actual: 0, target: 1 },
        { kr: "Staff trained", metric: "staff", actual: 1, target: 4 },
      ],
    },
  ]);

  // 6. Roadmap items
  const today = new Date();
  const thisYear = today.getFullYear();
  const addMonths = (m: number) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + m);
    return d.toISOString().slice(0, 10);
  };
  await supabase.from("roadmap_items").insert([
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Revenue Diversification"), title: "Diversification audit", owner: "Dev Director", start_date: addMonths(0), end_date: addMonths(2), status: "in_progress", progress: 0.6 },
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Revenue Diversification"), title: "Year-end appeal campaign", owner: "Dev Director", start_date: addMonths(2), end_date: addMonths(4), status: "planned", progress: 0 },
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Eastside Studio"), title: "Site selection", owner: "Executive Director", start_date: addMonths(0), end_date: addMonths(2), status: "in_progress", progress: 0.7 },
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Eastside Studio"), title: "Lease negotiation", owner: "Executive Director", start_date: addMonths(2), end_date: addMonths(4), status: "planned", progress: 0 },
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Evaluation Framework"), title: "Framework design", owner: "Program Director", start_date: addMonths(0), end_date: addMonths(1), status: "in_progress", progress: 0.8 },
    { plan_id: planId, organization_id: orgId, pillar_id: pid("Evaluation Framework"), title: "Pilot deployment", owner: "Program Director", start_date: addMonths(1), end_date: addMonths(3), status: "planned", progress: 0 },
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
    impact: ["A region where every young person has the agency to shape their neighborhood's story."],
    assumptions: [
      "Schools remain open to outside arts partners.",
      "Foundation funding for youth arts holds steady.",
    ],
  });

  // 9. Revenue streams — yearly_amounts is a {y1..y5} 5-year budget horizon.
  await supabase.from("revenue_streams").insert([
    { plan_id: planId, organization_id: orgId, name: "Foundation Grants", category: "Grants", yearly_amounts: years5(215000, 0.02), confidence: "high", sort_order: 1 },
    { plan_id: planId, organization_id: orgId, name: "Individual Donors", category: "Contributions", yearly_amounts: years5(118000, 0.12), confidence: "medium", sort_order: 2 },
    { plan_id: planId, organization_id: orgId, name: "Earned (Workshops)", category: "Earned", yearly_amounts: years5(78000, 0.06), confidence: "high", sort_order: 3 },
    { plan_id: planId, organization_id: orgId, name: "Government", category: "Government", yearly_amounts: years5(42000, 0.02), confidence: "medium", sort_order: 4 },
    { plan_id: planId, organization_id: orgId, name: "Corporate", category: "Corporate", yearly_amounts: years5(25000, 0.05), confidence: "low", sort_order: 5 },
  ]);

  // 10. Expense lines — same {y1..y5} shape as revenue. category is
  // constrained by a DB CHECK to exactly 'program' | 'admin' | 'fundraising'
  // (lowercase) — anything else fails the whole multi-row insert atomically.
  await supabase.from("expense_lines").insert([
    { plan_id: planId, organization_id: orgId, name: "Program Salaries", category: "program", yearly_amounts: years5(296000, 0.03), sort_order: 1 },
    { plan_id: planId, organization_id: orgId, name: "Admin & Operations", category: "admin", yearly_amounts: years5(98000, 0.03), sort_order: 2 },
    { plan_id: planId, organization_id: orgId, name: "Fundraising", category: "fundraising", yearly_amounts: years5(52000, 0.05), sort_order: 3 },
    { plan_id: planId, organization_id: orgId, name: "Facilities", category: "admin", yearly_amounts: years5(58000, 0.03), sort_order: 4 },
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
    { organization_id: orgId, plan_id: planId, pillar_id: pid("Revenue Diversification"), title: "Launch monthly giving program", owner_label: "Dev Director", status: "not_started", priority: "high", percent_complete: 0, due_date: inMonths(2) },
    { organization_id: orgId, plan_id: planId, pillar_id: pid("Eastside Studio"), title: "Tour 3 candidate spaces", owner_label: "Executive Director", status: "in_progress", priority: "critical", percent_complete: 66, due_date: inMonths(0) },
    { organization_id: orgId, plan_id: planId, pillar_id: pid("Eastside Studio"), title: "Lead gift cultivation meeting", owner_label: "Board Chair", status: "not_started", priority: "high", percent_complete: 0, due_date: inMonths(1) },
    { organization_id: orgId, plan_id: planId, pillar_id: pid("Evaluation Framework"), title: "Finalize logic model with team", owner_label: "Program Director", status: "in_progress", priority: "medium", percent_complete: 75, due_date: inMonths(0) },
    { organization_id: orgId, plan_id: planId, pillar_id: pid("Board & Governance"), title: "Send prospect outreach emails (8)", owner_label: "Board Chair", status: "not_started", priority: "medium", percent_complete: 0, due_date: inMonths(1) },
    { organization_id: orgId, plan_id: planId, title: "Submit NEA Challenge America application", owner_label: "Dev Director", status: "in_progress", priority: "critical", percent_complete: 50, due_date: inMonths(1) },
    { organization_id: orgId, plan_id: planId, title: "Q1 financial review with treasurer", owner_label: "Executive Director", status: "not_started", priority: "medium", percent_complete: 0, due_date: inMonths(2) },
  ]);

  // 13. Completed assessments — real per-question answers so the score,
  // maturity band, dashboard framework cards, and recommendations all agree
  // with each other instead of being three unrelated numbers.
  await supabase.from("assessment_responses").insert(
    ASSESSMENT_SPECS.map(({ type, config, pattern }) => {
      const responses = answersFor(config, pattern);
      const score = computeScore(normalizeAnswers(responses));
      const band = config.recommendations.find((r) => score >= r.score[0] && score <= r.score[1]);
      return {
        plan_id: planId,
        organization_id: orgId,
        assessment_type: type,
        score,
        maturity_level: band?.maturity ?? null,
        responses,
        completed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(),
      };
    }),
  );

  // 14. SWOT
  await supabase.from("swot_items").insert(
    (
      [
        ["strengths", "Teaching artists are working practitioners the youth already admire"],
        ["strengths", "88% program completion rate, well above the regional average"],
        ["strengths", "Two multi-year funders renewed without being asked"],
        ["strengths", "Alumni return as paid teaching assistants"],
        ["weaknesses", "45% of revenue sits with three foundations"],
        ["weaknesses", "No permanent space — every cohort depends on borrowed rooms"],
        ["weaknesses", "Outcome data is collected per-program, not comparably"],
        ["weaknesses", "The ED holds nearly every funder relationship personally"],
        ["opportunities", "Districts are seeking arts partners to meet new state arts funding"],
        ["opportunities", "Eastside redevelopment has vacant ground-floor space at below-market rent"],
        ["opportunities", "Corporate giving in the region has grown three years running"],
        ["threats", "Studio rents up 18% year over year"],
        ["threats", "Three board members term out next year"],
        ["threats", "A competing arts nonprofit opened a youth track in the same district"],
      ] as const
    ).map(([quadrant, text], i) => ({
      plan_id: planId,
      organization_id: orgId,
      quadrant,
      text,
      sort_order: i + 1,
    })),
  );

  // 15. Stakeholders
  await supabase.from("stakeholders").insert([
    { organization_id: orgId, name: "Irvine Foundation", type: "Funder", interest: 5, influence: 5, relationship: "strong", owner: "Executive Director" },
    { organization_id: orgId, name: "California Arts Council", type: "Funder", interest: 4, influence: 5, relationship: "strong", owner: "Dev Director" },
    { organization_id: orgId, name: "Riverside Unified School District", type: "Partner", interest: 5, influence: 4, relationship: "neutral", owner: "Program Director" },
    { organization_id: orgId, name: "Youth participants & families", type: "Beneficiary", interest: 5, influence: 3, relationship: "strong", owner: "Program Director" },
    { organization_id: orgId, name: "CA Registry of Charitable Trusts", type: "Regulator", interest: 2, influence: 4, relationship: "neutral", owner: "Executive Director" },
    { organization_id: orgId, name: "Eastside Neighborhood Council", type: "Influencer", interest: 4, influence: 3, relationship: "at-risk", owner: "Board Chair" },
  ]);

  // 16. Programs — Program Cost Allocation and the Program Impact report both
  // need programs that carry a budget, not just a name.
  await supabase.from("programs").insert([
    { organization_id: orgId, pillar_id: pid("Eastside Studio"), name: "After-School Mural Cohorts", type: "Program", participants: 340, budget: 148000, status: "active" },
    { organization_id: orgId, pillar_id: pid("Eastside Studio"), name: "Summer Songwriters Lab", type: "Program", participants: 96, budget: 82000, status: "active" },
    { organization_id: orgId, pillar_id: pid("Evaluation Framework"), name: "Teaching-Artist Mentorship", type: "Program", participants: 24, budget: 46000, status: "active" },
    { organization_id: orgId, pillar_id: pid("Revenue Diversification"), name: "First Friday Open Studio", type: "Event", participants: 352, budget: 20000, status: "active" },
  ]);

  // 17. Plan narrative — written through the IMPACT and 4Rs lenses so the
  // coverage meters on the narrative editor read as genuinely covered.
  await supabase.from("plan_narratives").insert(
    PLAN_NARRATIVES.map(([section_key, body]) => ({
      organization_id: orgId,
      section_key,
      body,
      ai_drafted_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    })),
  );

  // 18. Board
  await supabase.from("board_members").insert([
    { organization_id: orgId, name: "Marisol Reyes", role: "Chair", term_start: thisYear - 3, term_end: thisYear + 1, committees: ["Executive", "Governance"], skills: ["Fundraising", "Community organizing"], race: "Latina", gender: "Female", age_range: "45-54" },
    { organization_id: orgId, name: "Darnell Whitfield", role: "Treasurer", term_start: thisYear - 2, term_end: thisYear + 2, committees: ["Finance", "Executive"], skills: ["Accounting", "Audit"], race: "Black", gender: "Male", age_range: "35-44" },
    { organization_id: orgId, name: "Anh Trinh", role: "Secretary", term_start: thisYear - 4, term_end: thisYear, committees: ["Governance"], skills: ["Legal", "Policy"], race: "Asian", gender: "Female", age_range: "35-44" },
    { organization_id: orgId, name: "Grace Okoro", role: "Member", term_start: thisYear - 1, term_end: thisYear + 3, committees: ["Program"], skills: ["Evaluation", "Education"], race: "Black", gender: "Female", age_range: "25-34" },
    { organization_id: orgId, name: "Tom Barrantes", role: "Member", term_start: thisYear - 4, term_end: thisYear, committees: ["Finance"], skills: ["Real estate", "Facilities"], race: "Latino", gender: "Male", age_range: "55-64" },
    { organization_id: orgId, name: "Priya Raman", role: "Member", term_start: thisYear - 2, term_end: thisYear + 2, committees: ["Program", "Governance"], skills: ["Marketing", "Digital"], race: "Asian", gender: "Female", age_range: "25-34" },
    { organization_id: orgId, name: "Wes Coleman", role: "Member", term_start: thisYear - 4, term_end: thisYear, committees: ["Executive"], skills: ["Corporate partnerships"], race: "White", gender: "Male", age_range: "45-54" },
  ]);

  // 19. Staff & succession
  await supabase.from("staff_roles").insert([
    { organization_id: orgId, title: "Executive Director", holder: "Camille Osei", tenure: "6 years", key_person_risk: "high", backup: "Program Director (partial)", documented: false, emergency_successor: "Board Chair, interim", notes: "Holds most funder relationships — cross-training is a live risk item." },
    { organization_id: orgId, title: "Program Director", holder: "Luis Ferrer", tenure: "4 years", key_person_risk: "medium", backup: "Lead Teaching Artist", documented: true, emergency_successor: "Lead Teaching Artist" },
    { organization_id: orgId, title: "Development Director", holder: "Nia Chambers", tenure: "2 years", key_person_risk: "high", backup: "None identified", documented: false, emergency_successor: "Executive Director" },
    { organization_id: orgId, title: "Operations Lead", holder: "Sam Whitaker", tenure: "3 years", key_person_risk: "low", backup: "Bookkeeper (contract)", documented: true, emergency_successor: "Executive Director" },
    { organization_id: orgId, title: "Lead Teaching Artist", holder: "Rosa Delgado", tenure: "5 years", key_person_risk: "medium", backup: "Teaching artist pool", documented: true, emergency_successor: "Program Director" },
    { organization_id: orgId, title: "Bookkeeper (contract)", holder: "Ledgerline LLC", tenure: "3 years", key_person_risk: "low", backup: "Treasurer", documented: true, emergency_successor: "Treasurer" },
  ]);

  // 20. Policies
  await supabase.from("policies").insert([
    { organization_id: orgId, title: "Conflict of Interest Policy", category: "governance", status: "approved", summary: "Annual disclosure and recusal process for board and staff.", owner: "Secretary", approved_by: "Board", approved_at: inMonths(-8), next_review_date: inMonths(4), version: "2.1" },
    { organization_id: orgId, title: "Whistleblower Policy", category: "governance", status: "approved", summary: "Anonymous reporting channel and non-retaliation commitment.", owner: "Secretary", approved_by: "Board", approved_at: inMonths(-8), next_review_date: inMonths(4), version: "1.3" },
    { organization_id: orgId, title: "Document Retention & Destruction", category: "governance", status: "approved", summary: "Retention schedule by record type.", owner: "Operations Lead", approved_by: "Board", approved_at: inMonths(-14), next_review_date: inMonths(-2), version: "1.0" },
    { organization_id: orgId, title: "Gift Acceptance & Reserves Policy", category: "finance", status: "approved", summary: "What the org will and won't accept, and the reserve floor.", owner: "Treasurer", approved_by: "Board", approved_at: inMonths(-5), next_review_date: inMonths(7), version: "2.0" },
    { organization_id: orgId, title: "Youth Safeguarding & Background Checks", category: "program", status: "draft", summary: "Screening, two-adult rule, and incident reporting for youth programs.", owner: "Program Director", next_review_date: inMonths(2), version: "0.4" },
  ]);

  // 21. Meetings — one held (with decisions), one on the calendar. The Board
  // Packet export reads from the most recent meeting.
  const { data: meetings } = await supabase
    .from("meetings")
    .insert([
      { organization_id: orgId, plan_id: planId, cadence: "quarterly", title: "Q3 Board Meeting", scheduled_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 24).toISOString(), duration_minutes: 90, location: "Community Room B", status: "completed", summary: "Board approved the Eastside lease negotiation window and asked for a diversification plan with concrete targets before Q4. Reserve policy reaffirmed at six months." },
      { organization_id: orgId, plan_id: planId, cadence: "quarterly", title: "Q4 Board Meeting", scheduled_at: inMonths(2) + "T17:30:00.000Z", duration_minutes: 90, location: "Community Room B", status: "scheduled" },
    ])
    .select("id,title");
  const pastMeeting = meetings?.find((m) => m.title === "Q3 Board Meeting")?.id;

  if (pastMeeting) {
    await supabase.from("meeting_agenda_items").insert([
      { organization_id: orgId, meeting_id: pastMeeting, title: "Consent agenda & minutes", duration_minutes: 5, sort_order: 1 },
      { organization_id: orgId, meeting_id: pastMeeting, title: "Financial report — Q3 actuals vs budget", duration_minutes: 20, sort_order: 2 },
      { organization_id: orgId, meeting_id: pastMeeting, title: "Eastside studio: site shortlist & lease terms", duration_minutes: 30, sort_order: 3 },
      { organization_id: orgId, meeting_id: pastMeeting, title: "Revenue concentration — diversification plan", duration_minutes: 25, sort_order: 4 },
      { organization_id: orgId, meeting_id: pastMeeting, title: "Board recruitment slate", duration_minutes: 10, sort_order: 5 },
    ]);
    await supabase.from("meeting_attendees").insert([
      { organization_id: orgId, meeting_id: pastMeeting, display_name: "Marisol Reyes", role: "Chair", status: "attended" },
      { organization_id: orgId, meeting_id: pastMeeting, display_name: "Darnell Whitfield", role: "Treasurer", status: "attended" },
      { organization_id: orgId, meeting_id: pastMeeting, display_name: "Anh Trinh", role: "Secretary", status: "attended" },
      { organization_id: orgId, meeting_id: pastMeeting, display_name: "Grace Okoro", role: "Member", status: "attended" },
      { organization_id: orgId, meeting_id: pastMeeting, display_name: "Tom Barrantes", role: "Member", status: "excused" },
      { organization_id: orgId, meeting_id: pastMeeting, display_name: "Camille Osei", role: "Executive Director", status: "attended" },
    ]);
    await supabase.from("meeting_decisions").insert([
      { organization_id: orgId, meeting_id: pastMeeting, title: "Authorize lease negotiation up to $4,200/mo", rationale: "Two of three shortlisted sites fall under this ceiling; waiting another quarter risks losing both.", decided_by: "Board vote, 5-0", decided_at: inMonths(-1), impact: "Unblocks the Eastside Studio pillar", follow_up: "ED to report terms at Q4 meeting" },
      { organization_id: orgId, meeting_id: pastMeeting, title: "Require a written diversification plan by Q4", rationale: "45% of revenue sits with three foundations; the board wants targets, not intentions.", decided_by: "Board consensus", decided_at: inMonths(-1), impact: "Feeds the Revenue Diversification pillar", follow_up: "Dev Director to draft with concrete 24-month targets" },
      { organization_id: orgId, meeting_id: pastMeeting, title: "Reaffirm six-month operating reserve target", rationale: "Current runway is under half the target; policy stands rather than lowering the bar.", decided_by: "Board vote, 5-0", decided_at: inMonths(-1), impact: "Reserve policy unchanged", follow_up: "Treasurer to model a path to target" },
    ]);
  }

  // 22. Asks Bank — Funding Gap is a live rollup of these.
  await supabase.from("asks").insert([
    { organization_id: orgId, pillar_id: pid("Eastside Studio"), title: "Eastside studio build-out", type: "Capital", amount: 250000, secured_amount: 90000, audience: "Major donors & corporate", status: "in-discussion" },
    { organization_id: orgId, pillar_id: pid("Eastside Studio"), title: "First-year studio operating costs", type: "Operating", amount: 120000, secured_amount: 40000, audience: "Foundations", status: "open" },
    { organization_id: orgId, pillar_id: pid("Evaluation Framework"), title: "Evaluation framework & data system", type: "Capacity", amount: 60000, secured_amount: 60000, audience: "Capacity-building funders", status: "committed" },
    { organization_id: orgId, pillar_id: pid("Revenue Diversification"), title: "Monthly giving program launch", type: "Program", amount: 35000, secured_amount: 5000, audience: "Individual donors", status: "open" },
    { organization_id: orgId, pillar_id: pid("Board & Governance"), title: "Board development & training", type: "Capacity", amount: 18000, secured_amount: 0, audience: "Local family foundations", status: "open" },
  ]);

  // 23. Financial assumptions — Operating Reserves reads the balance here.
  await supabase.from("financial_assumptions").insert({
    organization_id: orgId,
    plan_id: planId,
    base_year: thisYear,
    inflation_rate: 0.03,
    revenue_growth_rate: 0.06,
    fte_loaded_cost: 78000,
    reserve_target_months: 6,
    current_reserve_balance: 96000,
    notes: "Reserve sits near two months against a six-month target — the board reaffirmed the target rather than lowering it.",
  });

  // 24. Budget scenarios
  await supabase.from("budget_scenarios").insert([
    { organization_id: orgId, plan_id: planId, name: "Lose the Irvine renewal", shock_type: "lose_largest_grant", shock_value: 0, notes: "Largest single funder does not renew." },
    { organization_id: orgId, plan_id: planId, name: "Individual giving falls 15%", shock_type: "revenue_decline_pct", shock_value: 15, notes: "Recession-style pullback in small-dollar giving." },
    { organization_id: orgId, plan_id: planId, name: "Studio rent pushes costs up 12%", shock_type: "expense_increase_pct", shock_value: 12, notes: "Eastside lease lands at the top of the authorized range." },
  ]);

  // 25. Donor segments
  await supabase.from("donor_segments").insert([
    { organization_id: orgId, label: "Major donors ($1k+)", donor_count: 34, total_amount: 61000, retention_pct: 0.82, yoy_change_pct: 0.11, color: "#0f172a", sort_order: 1 },
    { organization_id: orgId, label: "Mid-level ($250–$999)", donor_count: 96, total_amount: 34000, retention_pct: 0.64, yoy_change_pct: 0.05, color: "#2563eb", sort_order: 2 },
    { organization_id: orgId, label: "Monthly sustainers", donor_count: 44, total_amount: 15000, retention_pct: 0.91, yoy_change_pct: 0.38, color: "#10b981", sort_order: 3 },
    { organization_id: orgId, label: "Grassroots (<$250)", donor_count: 412, total_amount: 21000, retention_pct: 0.38, yoy_change_pct: -0.04, color: "#f59e0b", sort_order: 4 },
    { organization_id: orgId, label: "Corporate & sponsorships", donor_count: 11, total_amount: 25000, retention_pct: 0.72, yoy_change_pct: 0.18, color: "#8b5cf6", sort_order: 5 },
  ]);

  // 26. Impact stories
  await supabase.from("impact_stories").insert([
    { organization_id: orgId, subject_name: "Jasmine R.", age: "17", program: "After-School Mural Cohorts", quote: "I used to walk past that wall every day. Now I walk past something I made.", outcome: "Accepted to art school with a portfolio built in the program.", consent: "first-name-only", captured_on: inMonths(-2), tags: ["murals", "college"], uses: ["grant applications", "annual report"] },
    { organization_id: orgId, subject_name: "Andre T.", age: "15", program: "Summer Songwriters Lab", quote: "First time anyone asked what I had to say and then helped me say it louder.", outcome: "Returned as a paid teaching assistant the following summer.", consent: "first-name-only", captured_on: inMonths(-4), tags: ["music", "alumni"], uses: ["appeals"] },
    { organization_id: orgId, subject_name: "Anonymous participant", age: "16", program: "After-School Mural Cohorts", quote: "School felt like somewhere I was failing. This felt like somewhere I was good.", outcome: "Attendance at school rose from 61% to 89% over the cohort.", consent: "anonymous", captured_on: inMonths(-6), tags: ["school engagement"], uses: ["grant applications"] },
    { organization_id: orgId, subject_name: "Maria Delgado", age: "Parent", program: "First Friday Open Studio", quote: "I come to see her work, and I stay because the neighborhood shows up too.", outcome: "Family became monthly sustainers after their first Open Studio.", consent: "full", captured_on: inMonths(-1), tags: ["family", "community"], uses: ["annual report", "appeals"] },
  ]);

  // 27. Compliance calendar
  await supabase.from("compliance_items").insert([
    { organization_id: orgId, title: "IRS Form 990 filing", category: "Tax", due_date: inMonths(3), cadence: "Annual", owner: "Treasurer", status: "in-progress", notes: "Bookkeeper preparing; board review before filing." },
    { organization_id: orgId, title: "CA Form RRF-1 (Registry renewal)", category: "State Registration", due_date: inMonths(3), cadence: "Annual", owner: "Operations Lead", status: "in-progress" },
    { organization_id: orgId, title: "General liability insurance renewal", category: "Insurance", due_date: inMonths(1), cadence: "Annual", owner: "Operations Lead", status: "due-soon" },
    { organization_id: orgId, title: "Workers' comp policy renewal", category: "Insurance", due_date: inMonths(5), cadence: "Annual", owner: "Operations Lead", status: "in-progress" },
    { organization_id: orgId, title: "Document retention policy review", category: "Policy", due_date: inMonths(-2), cadence: "Biennial", owner: "Secretary", status: "overdue", notes: "Last reviewed two years ago — flagged at the Q3 board meeting." },
    { organization_id: orgId, title: "Independent financial review", category: "Audit", due_date: inMonths(6), cadence: "Annual", owner: "Treasurer", status: "in-progress" },
  ]);

  // 28. Donor & volunteer touchpoints
  await supabase.from("touchpoints").insert([
    { organization_id: orgId, title: "Year-end appeal letter", audience: "donor", channel: "email", segment: "All donors", owner: "Dev Director", scheduled_date: inMonths(2), note: "Lead with Jasmine's story." },
    { organization_id: orgId, title: "Major donor studio walkthrough", audience: "donor", channel: "in_person", segment: "Major donors", owner: "Executive Director", scheduled_date: inMonths(1) },
    { organization_id: orgId, title: "Sustainer thank-you calls", audience: "donor", channel: "call", segment: "Monthly sustainers", owner: "Dev Director", scheduled_date: inMonths(0) },
    { organization_id: orgId, title: "Volunteer appreciation night", audience: "volunteer", channel: "event", segment: "Active volunteers", owner: "Program Director", scheduled_date: inMonths(3) },
    { organization_id: orgId, title: "Teaching-artist recognition post", audience: "both", channel: "recognition", segment: "Teaching artists", owner: "Operations Lead", scheduled_date: inMonths(1) },
    { organization_id: orgId, title: "Open Studio invitation", audience: "both", channel: "email", segment: "Full list", owner: "Operations Lead", scheduled_date: inMonths(0) },
  ]);

  // 29. Coffee chats
  await supabase.from("coffee_chats").insert([
    { organization_id: orgId, contact_name: "Dana Whitmore", contact_type: "funder", contact_org: "Weingart Foundation", chat_date: inMonths(-1), notes: "Program officer suggested applying to the capacity-building cycle.", next_step: "Send evaluation framework one-pager", follow_up_date: inMonths(0), outcome: "positive" },
    { organization_id: orgId, contact_name: "Ray Ibarra", contact_type: "partner", contact_org: "Riverside Unified SD", chat_date: inMonths(-1), notes: "District has new state arts money and wants an outside partner.", next_step: "Draft a two-site pilot scope", follow_up_date: inMonths(1) },
    { organization_id: orgId, contact_name: "Kelsey Nam", contact_type: "donor", contact_org: "Individual", chat_date: inMonths(0), notes: "Interested in naming the Eastside studio's recording booth.", next_step: "Prepare a $25k capital ask", follow_up_date: inMonths(1) },
    { organization_id: orgId, contact_name: "Marcus Bell", contact_type: "board_prospect", contact_org: "Bell & Associates", chat_date: inMonths(0), notes: "Real estate background — useful for the lease and beyond.", next_step: "Invite to observe Q4 board meeting", follow_up_date: inMonths(2) },
    { organization_id: orgId, contact_name: "Ellen Vasquez", contact_type: "volunteer", contact_org: "Community", chat_date: inMonths(-2), notes: "Retired arts teacher, wants a weekly commitment.", next_step: "Match to mural cohort", follow_up_date: inMonths(-1), outcome: "converted" },
  ]);

  // 30. Grant Response Bank — a few core answers at multiple lengths.
  await supabase.from("grant_responses").insert([
    { organization_id: orgId, question_id: "mission", variant: "150_chars", content: "We give Riverside youth the mentorship, space, and platform to shape their neighborhoods through muralism, music, and storytelling." },
    { organization_id: orgId, question_id: "mission", variant: "500_chars", content: "Riverside Youth Arts Collective provides structured mentorship and creative space for marginalized youth to shape community development through muralism, music, and storytelling. We serve youth ages 12–24, predominantly Latinx and Black, from Title I districts across Riverside and San Bernardino Counties. Our teaching artists are working practitioners, and our alumni return as paid teaching assistants." },
    { organization_id: orgId, question_id: "community_need", variant: "standard", content: "Riverside's Title I districts have lost arts instruction to a decade of budget triage. The gap is not interest — it is access. Young people in our service area report wanting creative outlets at nearly twice the rate they can name one available to them. Meanwhile the neighborhoods themselves are being redeveloped without the input of the people who grew up in them. We work at that intersection: youth who need a creative practice, and blocks that need their own residents authoring what goes up on the walls." },
    { organization_id: orgId, question_id: "expected_outcomes", variant: "standard", content: "Over the next three years we expect to serve 1,200 youth annually (from 812 today), complete 120 public artworks, and hold program completion above 85%. We measure school engagement alongside artistic output because the two move together in our data: participants in the last mural cohort raised school attendance from 61% to 89% over the program period." },
    { organization_id: orgId, question_id: "measuring_success", variant: "standard", content: "Every program is being moved onto a shared outcomes framework this year — the same instrument, the same cadence, across all four programs — so that results are comparable rather than anecdotal. We collect pre/post participant surveys, attendance and completion data, and school engagement indicators where districts share them. Outcomes are reported to the community quarterly, not only to funders." },
  ]);

  // 31. A filed Form 990 — the intake in Legal & Registration, and everything
  // downstream in Fund My Strategy, reads from this.
  await supabase.from("tax_filings").insert({
    organization_id: orgId,
    form_type: "990",
    tax_year: thisYear - 1,
    fiscal_year_end: `${thisYear - 1}-12-31`,
    source: "upload",
    source_filename: `riverside-youth-arts-990-${thisYear - 1}.pdf`,
    filed_organization_name: "Riverside Youth Arts Collective",
    filed_ein: "88-1234567",
    total_revenue: 478000,
    revenue_lines: {
      contributions_gifts_grants: 333000,
      government_grants: 42000,
      program_service_revenue: 78000,
      investment_income: 1200,
      royalties: 0,
      rental_income_net: 0,
      net_fundraising: 40000,
      net_gaming: 0,
      net_sales_inventory: 5800,
      other_revenue: 20000,
    },
    top_contributors: [
      { name: "Irvine Foundation", amount: 75000 },
      { name: "Local Family Foundation", amount: 90000 },
      { name: "California Arts Council", amount: 60000 },
    ],
  });
}
