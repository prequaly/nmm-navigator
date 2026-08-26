// Realistic mock data for the demo organization "Riverside Youth Arts Collective".
// Used across module screens until persistence ships.

export const ORG = {
  name: "Riverside Youth Arts Collective",
  shortName: "Riverside Youth Arts",
  mission:
    "To provide structured mentorship and creative space for marginalized youth to shape community development through muralism, music, and storytelling.",
  vision:
    "A region where every young person has the agency, skills, and platform to author the story of their neighborhood.",
  values: ["Youth voice first", "Radical hospitality", "Artistic excellence", "Equity in every decision"],
  annualBudget: 478_000,
  staff: 6,
  volunteers: 42,
  geo: "Riverside & San Bernardino Counties, CA",
  beneficiaries: "Youth ages 12–24, predominantly Latinx and Black, from Title I districts",
  longTermGoals: [
    "Reach 1,200 youth annually by 2027",
    "Build a permanent creative campus in the Eastside",
    "Achieve a 0.25 HHI revenue diversification score",
  ],
};

export const KPIS = {
  healthScore: 84,
  fundingGap: 124_000,
  hhi: 0.42,
  hhiLabel: "Moderate",
  primarySources: 3,
  milestones: 12,
  milestonesDueThisWeek: 3,
};

export const IMPACT_DATA = [
  { axis: "Inclusive", current: 78, target: 90 },
  { axis: "Measurable", current: 62, target: 85 },
  { axis: "Purpose", current: 88, target: 90 },
  { axis: "Adaptive", current: 71, target: 80 },
  { axis: "Community", current: 84, target: 90 },
  { axis: "Transparent", current: 80, target: 90 },
];

export const FOURRS_DATA = [
  { name: "Relationships", current: 82, target: 90 },
  { name: "Resources", current: 64, target: 80 },
  { name: "Results", current: 78, target: 85 },
  { name: "Reputation", current: 88, target: 90 },
];

export const REVENUE_MIX = [
  { source: "Foundation Grants", amount: 215_000, color: "#2563eb" },
  { source: "Individual Donors", amount: 118_000, color: "#10b981" },
  { source: "Earned (Workshops)", amount: 78_000, color: "#0f172a" },
  { source: "Government", amount: 42_000, color: "#94a3b8" },
  { source: "Corporate", amount: 25_000, color: "#cbd5e1" },
];

export const MILESTONES = [
  { date: "OCT 14", title: "Board Retreat: Phase 2", sub: "Finalize 3-year logic model", priority: "high" as const },
  { date: "OCT 22", title: "Grant Window: NEA Challenge America", sub: "Submit program evaluation deck", priority: "high" as const },
  { date: "NOV 05", title: "Annual Gala", sub: "The Meridian Hotel Ballroom", priority: "medium" as const },
  { date: "NOV 18", title: "Q4 Program Review", sub: "Mural cohort outcomes presentation", priority: "medium" as const },
  { date: "DEC 03", title: "Year-End Appeal Launch", sub: "Email + direct mail series", priority: "high" as const },
];

export const SWOT = {
  strengths: ["High recurring donor rate (38%)", "Strong local partnerships (7 schools)", "Award-winning teaching artists"],
  weaknesses: ["Limited operational staff (1.0 FTE admin)", "Tech stack fragmentation", "No formal evaluation framework"],
  opportunities: ["New federal youth-arts grants", "Corporate ESG match programs", "City cultural district designation"],
  threats: ["Inflationary venue costs", "Board turnover risk", "Concentration in foundation funding"],
};

export const STRATEGIC_PRIORITIES = [
  { id: "p1", title: "Diversify revenue to 5+ meaningful sources", owner: "Director of Development", quarter: "Q1–Q4 2025" },
  { id: "p2", title: "Launch permanent Eastside studio space", owner: "Executive Director", quarter: "Q2 2025" },
  { id: "p3", title: "Implement common evaluation framework", owner: "Program Director", quarter: "Q1–Q2 2025" },
  { id: "p4", title: "Recruit 3 new board members with finance & legal expertise", owner: "Board Chair", quarter: "Q2 2025" },
];

export const SMART_OBJECTIVES = [
  {
    priority: "p1",
    objective: "Grow individual giving from $118k to $165k",
    kpi: "Individual revenue ($)",
    target: "$165,000",
    milestone: "Year-end appeal launch Dec 3",
    owner: "Dev Director",
  },
  {
    priority: "p2",
    objective: "Sign lease on Eastside campus by Q2",
    kpi: "Lease executed",
    target: "Yes",
    milestone: "Site visits complete Mar 30",
    owner: "Executive Director",
  },
  {
    priority: "p3",
    objective: "Deploy evaluation framework across 4 programs",
    kpi: "Programs using framework",
    target: "4",
    milestone: "Pilot launches Feb 15",
    owner: "Program Director",
  },
];

export const PROGRAMS = [
  { name: "After-School Mural Program", type: "Program", participants: 84, budget: 142_000, status: "Active" },
  { name: "Summer Songwriters Lab", type: "Program", participants: 32, budget: 38_000, status: "Active" },
  { name: "Annual Gala", type: "Event", participants: 220, budget: 28_000, status: "Planning" },
  { name: "First Friday Open Studio", type: "Event", participants: 60, budget: 4_500, status: "Recurring" },
  { name: "Teaching Artist Cohort", type: "Program", participants: 12, budget: 48_000, status: "Active" },
];

export const BUDGET_ROWS = [
  { line: "Foundation Grants", q1: 60000, q2: 55000, q3: 50000, q4: 50000 },
  { line: "Individual Donors", q1: 22000, q2: 26000, q3: 28000, q4: 42000 },
  { line: "Earned Revenue", q1: 18000, q2: 22000, q3: 20000, q4: 18000 },
  { line: "Government", q1: 10000, q2: 12000, q3: 10000, q4: 10000 },
  { line: "Corporate", q1: 5000, q2: 8000, q3: 6000, q4: 6000 },
];

export const EXPENSE_ROWS = [
  { line: "Program Salaries", q1: 72000, q2: 74000, q3: 74000, q4: 76000 },
  { line: "Admin & Operations", q1: 24000, q2: 24000, q3: 24000, q4: 26000 },
  { line: "Fundraising", q1: 8000, q2: 10000, q3: 12000, q4: 22000 },
  { line: "Facilities", q1: 14000, q2: 14000, q3: 14000, q4: 16000 },
];

export const FUNDING_GAPS = [
  { initiative: "Eastside Studio buildout", need: 85_000, secured: 35_000 },
  { initiative: "Evaluation framework consultant", need: 18_000, secured: 4_000 },
  { initiative: "After-School Mural — Spring '25", need: 56_000, secured: 23_600 },
  { initiative: "Board recruitment campaign", need: 12_000, secured: 0 },
];

export const ASKS = [
  { type: "Program", title: "Sponsor a Spring Mural Cohort", amount: 25_000, audience: "Foundation / Corporate", status: "Donor-ready" },
  { type: "Capital", title: "Eastside Studio Lead Gift", amount: 100_000, audience: "Major Donor", status: "Board-ready" },
  { type: "Capacity", title: "Evaluation Framework Build", amount: 18_000, audience: "Capacity Funder", status: "Grant-ready" },
  { type: "Operating", title: "General Operating Support", amount: 40_000, audience: "Foundation", status: "Donor-ready" },
];

export const GRANT_BLOCKS = [
  { title: "Mission Statement", short: 1, lengths: ["50w", "150w", "300w"] },
  { title: "Need Statement", short: 1, lengths: ["150w", "300w", "500w"] },
  { title: "Program Description: After-School Mural", short: 1, lengths: ["150w", "500w", "1000w"] },
  { title: "Outcomes & Evaluation Plan", short: 1, lengths: ["150w", "500w"] },
  { title: "Sustainability Narrative", short: 1, lengths: ["150w", "300w"] },
  { title: "Partnerships", short: 1, lengths: ["150w", "300w"] },
  { title: "DEI Statement", short: 1, lengths: ["150w", "300w"] },
  { title: "Organizational History", short: 1, lengths: ["150w", "300w"] },
];

export const CALENDAR_EVENTS: Record<number, { title: string; type: "program" | "fundraiser" | "board" | "milestone" }[]> = {
  3: [{ title: "Board Meeting", type: "board" }],
  7: [{ title: "Mural Cohort Kickoff", type: "program" }],
  12: [{ title: "Donor Cultivation Dinner", type: "fundraiser" }],
  14: [{ title: "Board Retreat: Phase 2", type: "board" }],
  18: [{ title: "Songwriters Lab — Wk 2", type: "program" }],
  22: [{ title: "NEA Grant Submission", type: "milestone" }],
  25: [{ title: "First Friday Open Studio", type: "program" }],
  28: [{ title: "Q3 Program Review", type: "milestone" }],
};

export const GANTT_TASKS = [
  { priority: "p1", task: "Diversification audit", startWeek: 1, endWeek: 6 },
  { priority: "p1", task: "Year-end appeal", startWeek: 10, endWeek: 13 },
  { priority: "p1", task: "Corporate match program", startWeek: 5, endWeek: 12 },
  { priority: "p2", task: "Site selection", startWeek: 1, endWeek: 5 },
  { priority: "p2", task: "Lease negotiation", startWeek: 5, endWeek: 9 },
  { priority: "p2", task: "Buildout & launch", startWeek: 9, endWeek: 13 },
  { priority: "p3", task: "Framework design", startWeek: 1, endWeek: 4 },
  { priority: "p3", task: "Pilot deployment", startWeek: 4, endWeek: 8 },
  { priority: "p3", task: "Rollout to all programs", startWeek: 8, endWeek: 13 },
  { priority: "p4", task: "Board prospecting", startWeek: 2, endWeek: 8 },
  { priority: "p4", task: "Onboarding cohort", startWeek: 9, endWeek: 13 },
];

export const KPI_LIBRARY = [
  { name: "Individual Revenue", definition: "Total dollars raised from individuals", target: "$165k", current: "$118k" },
  { name: "Foundation Revenue", definition: "Total dollars from foundation grants", target: "$215k", current: "$215k" },
  { name: "Revenue HHI", definition: "Herfindahl-Hirschman Index on revenue mix", target: "≤ 0.30", current: "0.42" },
  { name: "Youth Served", definition: "Unduplicated youth completing a program", target: "1,000", current: "768" },
  { name: "Board Engagement", definition: "Avg meetings attended / member", target: "≥ 5/6", current: "4.2/6" },
  { name: "Days Cash on Hand", definition: "Operating cash / daily expense rate", target: "≥ 90", current: "62" },
];

export const TASKS_QUARTERLY = [
  { quarter: "Q1", task: "Complete diversification audit", owner: "Dev Director", status: "In progress" },
  { quarter: "Q1", task: "Site visit shortlist", owner: "Executive Director", status: "Done" },
  { quarter: "Q1", task: "Framework design workshop", owner: "Program Director", status: "Done" },
  { quarter: "Q2", task: "Sign Eastside lease", owner: "Executive Director", status: "Planned" },
  { quarter: "Q2", task: "Recruit 3 board members", owner: "Board Chair", status: "Planned" },
  { quarter: "Q3", task: "Launch evaluation framework org-wide", owner: "Program Director", status: "Planned" },
  { quarter: "Q4", task: "Year-end appeal execution", owner: "Dev Director", status: "Planned" },
];
