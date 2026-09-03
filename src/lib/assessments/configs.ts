import { type AssessmentConfig, type AssessmentReference, makeAssessment } from "@/components/assessments/AssessmentRunner";

const q = (id: string, prompt: string, helper?: string) => ({ id, prompt, helper });
// For questions that need elapsed time/track record a brand-new org can't
// have yet — these default to "Not yet applicable" instead of "Planned" for
// new-stage orgs (see AssessmentRunner's defaultStatusFor).
const qNA = (id: string, prompt: string, helper?: string) => ({
  id,
  prompt,
  helper,
  newOrgDefault: "na" as const,
});

const HEALTH_REFS: AssessmentReference[] = [
  { title: "The Strategy That Will Fix Health Care", source: "Harvard Business Review", year: 2013, url: "https://hbr.org/2013/10/the-strategy-that-will-fix-health-care", insight: "Porter & Lee's value-agenda argument that strategy must drive measurable outcomes, not just activities — the foundation for treating a strategic plan as a live operating contract." },
  { title: "Nonprofit Strategic Planning", source: "BoardSource", url: "https://boardsource.org/resources/strategic-planning/", insight: "Practical board-level guidance on cadence, accountability, and tying programs to strategic priorities every quarter." },
  { title: "The Nonprofit Strategy Revolution", source: "La Piana Consulting / Fieldstone Alliance", year: 2008, url: "https://lapiana.org/insights-for-the-sector/insights/strategy/the-nonprofit-strategy-revolution/", insight: "Real-time strategic planning model: continuous reforecasting beats the dusty 5-year binder." },
];

const CAPACITY_REFS: AssessmentReference[] = [
  { title: "Building Nonprofit Capacity", source: "Bridgespan Group", url: "https://www.bridgespan.org/insights/organizational-effectiveness/building-nonprofit-organizational-capacity", insight: "Seven elements of organizational capacity — leadership, staffing, systems, infrastructure — and how to invest in them sequentially." },
  { title: "Pay What It Takes Philanthropy", source: "Stanford Social Innovation Review", year: 2016, url: "https://ssir.org/articles/entry/pay_what_it_takes_philanthropy", insight: "Why under-investment in indirect costs and staff development erodes capacity over time; benchmark indirect spending against true cost." },
  { title: "Daring to Lead", source: "CompassPoint & Meyer Foundation", year: 2011, url: "https://www.compasspoint.org/sites/default/files/documents/daring-to-lead-2011-main-report-online.pdf", insight: "Succession planning evidence: most EDs leave without a documented successor; the cost shows up 18 months later." },
];

const FINANCIAL_REFS: AssessmentReference[] = [
  { title: "The Nonprofit Starvation Cycle", source: "Stanford Social Innovation Review", year: 2009, url: "https://ssir.org/articles/entry/the_nonprofit_starvation_cycle", insight: "Goggins Gregory & Howard's classic on under-funded overhead, weak controls, and chronic cash strain — the cycle reserves break." },
  { title: "How Much Cash Is Enough?", source: "Nonprofit Finance Fund", url: "https://nff.org/learn/article/how-much-cash-enough-fund-balance-sufficiency", insight: "Benchmarks for operating reserves and months-of-cash; 90+ days is a floor, not a ceiling." },
  { title: "Audit Guide for Small Nonprofits", source: "National Council of Nonprofits", url: "https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/nonprofit-audit-guide", insight: "When to audit vs. review, separation-of-duties expectations, and what the finance committee should actually review." },
];

const FUNDRAISING_REFS: AssessmentReference[] = [
  { title: "Asking Styles", source: "Andrea Kihlstedt / AFP", url: "https://afpglobal.org/AskingStyles", insight: "Why segmented donor language outperforms generic asks — and how to build major-donor moves management around it." },
  { title: "Fundraising Effectiveness Project Report", source: "AFP & Urban Institute", url: "https://afpglobal.org/FEP", insight: "Annual donor retention and lapsed-recovery benchmarks; the data behind 'retention is cheaper than acquisition.'" },
  { title: "The Case for Support", source: "Tom Ahern", url: "https://www.aherncomm.com/", insight: "Donor-centric case-for-support construction: lead with the donor's role, not the org chart." },
];

const PROGRAM_IMPACT_REFS: AssessmentReference[] = [
  { title: "Logic Model Development Guide", source: "W.K. Kellogg Foundation", year: 2004, url: "https://wkkf.issuelab.org/resource/logic-model-development-guide.html", insight: "The canonical logic-model and theory-of-change reference; every program should have one before measuring outcomes." },
  { title: "Outcome-Based Measurement", source: "Urban Institute", url: "https://www.urban.org/research/publication/outcome-indicators-project-frameworks", insight: "Common outcome indicator frameworks across program areas — the basis for cross-program evaluation." },
  { title: "Learning to Exit", source: "Stanford Social Innovation Review", year: 2017, url: "https://ssir.org/articles/entry/learning_to_exit", insight: "Sunsetting programs based on data is a sign of organizational maturity, not failure." },
];

const GOVERNANCE_REFS: AssessmentReference[] = [
  { title: "Leading with Intent: BoardSource Index of Nonprofit Board Practices", source: "BoardSource", url: "https://leadingwithintent.org/", insight: "Benchmarks on board composition, committee engagement, give/get expectations, and self-assessment cadence." },
  { title: "The Source: Twelve Principles of Governance That Power Exceptional Boards", source: "BoardSource", url: "https://boardsource.org/product/source-twelve-principles-governance-power-exceptional-boards/", insight: "Reference standard for board roles, term limits, ED evaluation, and constructive partnership." },
  { title: "Race to Lead: Confronting the Nonprofit Racial Leadership Gap", source: "Building Movement Project", year: 2017, url: "https://buildingmovement.org/our-work/movement-building/race-to-lead/", insight: "Board composition that reflects community is correlated with strategic agility and donor trust." },
];

const COMMUNITY_REFS: AssessmentReference[] = [
  { title: "Community-Centric Fundraising Principles", source: "CCF Global", url: "https://communitycentricfundraising.org/ccf-principles/", insight: "Ten principles for shifting from donor-centric to community-centric practice — including paying community advisors." },
  { title: "Putting Community in Charge", source: "Stanford Social Innovation Review", year: 2020, url: "https://ssir.org/articles/entry/putting_community_in_charge", insight: "Participatory program design produces better outcomes and reduces program churn." },
  { title: "Trust-Based Philanthropy", source: "Trust-Based Philanthropy Project", url: "https://www.trustbasedphilanthropy.org/", insight: "The infrastructure case for written feedback loops and acting on community feedback within a defined window." },
];

const DIGITAL_REFS: AssessmentReference[] = [
  { title: "M+R Benchmarks", source: "M+R Strategic Services", url: "https://mrbenchmarks.com/", insight: "Annual nonprofit digital benchmarks: email list growth, online giving conversion, mobile donate-page performance." },
  { title: "Web Vitals", source: "Google / web.dev", url: "https://web.dev/vitals/", insight: "Page-load and Core Web Vitals thresholds that determine mobile usability and search ranking." },
  { title: "Nonprofit Digital Investments Project", source: "NTEN", url: "https://www.nten.org/research/", insight: "How peer organizations allocate budget across web, email, social, and analytics — and the ROI gap when they don't." },
];

const IMPACT_REFS: AssessmentReference[] = [
  { title: "Collective Impact", source: "Stanford Social Innovation Review", year: 2011, url: "https://ssir.org/articles/entry/collective_impact", insight: "Kania & Kramer's framework for shared measurement, mutually reinforcing activities, and backbone support — the IMPACT framework's intellectual root." },
  { title: "Failing Forward: Embracing Failure to Build Stronger Nonprofits", source: "GrantCraft / Candid", url: "https://learningforfunders.candid.org/content/case-studies/failing-forward/", insight: "Why publicly reporting what didn't work strengthens innovation budgets and partner trust." },
  { title: "Adaptive Leadership", source: "Harvard Business Review", year: 2009, url: "https://hbr.org/2009/07/leadership-in-a-permanent-crisis", insight: "Heifetz, Grashow, Linsky on building adaptive capacity — the muscle behind 'we can pivot quickly.'" },
];

const FOURRS_REFS: AssessmentReference[] = [
  { title: "Nonprofit Sustainability: Making Strategic Decisions for Financial Viability", source: "Bell, Masaoka & Zimmerman", year: 2010, url: "https://www.compasspoint.org/matrix-map", insight: "The Matrix Map: a strategic framework for evaluating programs along impact and profitability — the discipline behind diversified revenue and reputation." },
  { title: "Brand IDEA: Brand Strategy for Nonprofits", source: "Stanford Social Innovation Review", year: 2012, url: "https://ssir.org/articles/entry/the_brand_idea", insight: "Why a written brand and messaging guide drives reputation, partnerships, and revenue together." },
  { title: "The State of Nonprofits", source: "Independent Sector", url: "https://independentsector.org/resource/health-of-the-nonprofit-sector/", insight: "Sector-wide data on relationships, resources, results, and reputation — the macro backdrop for the 4Rs." },
];

const REVENUE_HHI_REFS: AssessmentReference[] = [
  { title: "Herfindahl–Hirschman Index Explained", source: "U.S. Department of Justice", url: "https://www.justice.gov/atr/herfindahl-hirschman-index", insight: "The original HHI methodology — adapted for nonprofits to quantify funder concentration risk on a 0–10,000 scale." },
  { title: "Revenue Diversification and Nonprofit Financial Health", source: "Nonprofit and Voluntary Sector Quarterly", year: 2013, url: "https://journals.sagepub.com/doi/10.1177/0899764012438688", insight: "Empirical evidence that diversified revenue correlates with lower volatility and longer survival — with caveats on diversification cost." },
  { title: "Revenue Reliance & Resilience", source: "Nonprofit Finance Fund", url: "https://nff.org/sites/default/files/paragraphs/file/download/StateoftheNonprofitSector.pdf", insight: "Sector survey data on multi-year commitments, scenario modeling, and the 12-month-loss survival test." },
];

const DEI_REFS: AssessmentReference[] = [
  { title: "Awake to Woke to Work: Building a Race Equity Culture", source: "Equity in the Center / ProInspire", year: 2018, url: "https://www.equityinthecenter.org/aww/", insight: "The Race Equity Cycle — from performative to embedded — and the structural changes (pay equity, decision power, disaggregated data) that move organizations along it." },
  { title: "Diversity, Equity, and Inclusion: Key Findings from the Nonprofit Workforce Survey", source: "BoardSource", url: "https://leadingwithintent.org/", insight: "Benchmarks on board and staff demographics, equity policies, and pay-equity practice." },
  { title: "Nonprofit Executive Compensation and Equity", source: "GuideStar / Candid", url: "https://www.candid.org/research-and-verify-nonprofits/nonprofit-compensation-report", insight: "Compensation data used in pay-equity reviews and tying executive comp to equity outcomes." },
];

export const HEALTH: AssessmentConfig = makeAssessment({
  title: "Strategic Planning Health",
  subtitle: "How alive is your current strategic plan — is it driving weekly decisions or sitting on a shelf?",
  framework: "Planning Health",
  questions: [
    q("h1", "Our strategic plan is referenced in monthly leadership meetings."),
    q("h2", "Every program ties back to a named strategic priority."),
    q("h3", "We track progress against measurable objectives, not just activities."),
    q("h4", "Our board reviews strategic plan progress quarterly."),
    qNA("h5", "We've reforecast the plan within the last 12 months."),
    q("h6", "Staff at all levels can name our top 3 priorities."),
    q("h7", "We have an annual operating plan derived from the strategic plan."),
  ],
  references: HEALTH_REFS,
});

export const CAPACITY: AssessmentConfig = makeAssessment({
  title: "Organizational Capacity",
  subtitle: "Do you have the people, systems, and infrastructure to execute on your ambition?",
  framework: "Capacity",
  questions: [
    q("c1", "We have documented role descriptions for every staff position."),
    q("c2", "Each critical function has a designated backup."),
    q("c3", "Our tech stack is integrated, not fragmented."),
    q("c4", "We have a written staff onboarding process."),
    q("c5", "We have a documented succession plan for the Executive Director."),
    qNA("c6", "Operational policies are reviewed annually."),
    q("c7", "We invest at least 3% of our budget in staff development."),
  ],
  references: CAPACITY_REFS,
});

export const FINANCIAL: AssessmentConfig = makeAssessment({
  title: "Financial Health",
  subtitle: "Cash, controls, and runway — the fundamentals of organizational resilience.",
  framework: "Financial",
  questions: [
    qNA("f1", "We have 90+ days of cash on hand."),
    q("f2", "Monthly financial statements are produced within 15 days of close."),
    q("f3", "The board finance committee meets at least quarterly."),
    q("f4", "We have a documented gift acceptance and reserves policy."),
    qNA("f5", "We undergo an annual independent audit or review."),
    q("f6", "We track program vs. management vs. fundraising expense ratios."),
    q("f7", "We have separation of duties in financial controls."),
  ],
  references: FINANCIAL_REFS,
});

export const FUNDRAISING: AssessmentConfig = makeAssessment({
  title: "Fundraising Readiness",
  subtitle: "Are you positioned to make confident, specific asks at every level?",
  framework: "Development",
  questions: [
    q("fr1", "We have a current case for support."),
    q("fr2", "Every program has a clear funding need articulated."),
    q("fr3", "We have segmented donor language ready: individual, foundation, corporate."),
    q("fr4", "Our board members each have an annual giving commitment."),
    qNA("fr5", "We track donor retention and lapsed-donor recovery rates."),
    q("fr6", "We have a moves-management process for major donors."),
    q("fr7", "Our website has a clear, modern donate page."),
  ],
  references: FUNDRAISING_REFS,
});

export const PROGRAM_IMPACT: AssessmentConfig = makeAssessment({
  title: "Program Impact",
  subtitle: "Do your programs demonstrably produce the outcomes your mission promises?",
  framework: "Impact",
  questions: [
    q("pi1", "Every program has a written logic model or theory of change."),
    q("pi2", "We collect outcome data, not just output counts."),
    q("pi3", "We share impact data with participants and partners."),
    q("pi4", "We use a common evaluation framework across programs."),
    qNA("pi5", "We publish an annual impact report."),
    qNA("pi6", "We've sunsetted at least one program in the last 3 years based on data."),
    q("pi7", "Our outcomes are externally benchmarked when possible."),
  ],
  references: PROGRAM_IMPACT_REFS,
});

export const GOVERNANCE: AssessmentConfig = makeAssessment({
  title: "Board Governance",
  subtitle: "Engaged, diverse, and clear on its role — or in name only?",
  framework: "Governance",
  questions: [
    q("g1", "Board members serve on at least one active committee."),
    q("g2", "We have term limits and rotate the chair."),
    q("g3", "Board composition reflects the community we serve."),
    q("g4", "Each board member has an annual personal giving expectation."),
    qNA("g5", "We conduct an annual ED performance review."),
    qNA("g6", "We conduct a board self-assessment annually."),
    q("g7", "Onboarding for new members takes less than 60 days."),
  ],
  references: GOVERNANCE_REFS,
});

export const COMMUNITY: AssessmentConfig = makeAssessment({
  title: "Community Engagement",
  subtitle: "Are the people you serve shaping the work — not just receiving it?",
  framework: "Community",
  questions: [
    q("ce1", "Program participants have formal input on program design."),
    q("ce2", "We have community members on our board."),
    q("ce3", "We compensate community advisors for their time."),
    q("ce4", "We co-host events with partner organizations."),
    q("ce5", "We have written feedback loops with our community."),
    q("ce6", "We act on community feedback within 90 days."),
    q("ce7", "Our communications include voices of the community we serve."),
  ],
  references: COMMUNITY_REFS,
});

export const DIGITAL: AssessmentConfig = makeAssessment({
  title: "Digital Presence",
  subtitle: "Does your digital storefront match the quality of your work?",
  framework: "Digital",
  questions: [
    q("d1", "Our website loads in under 3 seconds on mobile."),
    q("d2", "We post on social media at least weekly."),
    q("d3", "We have an active email list with regular communication."),
    q("d4", "Our donate page works seamlessly on mobile."),
    q("d5", "We track website analytics and act on them."),
    q("d6", "We have an SEO strategy."),
    q("d7", "Our brand visuals are consistent across channels."),
  ],
  references: DIGITAL_REFS,
});

export const IMPACT: AssessmentConfig = makeAssessment({
  title: "IMPACT Framework Audit",
  subtitle: "Inclusive Partnerships · Measurable Outcomes · Purpose-Driven Innovation · Adaptive Strategies · Community Empowerment · Transparency.",
  framework: "IMPACT",
  questions: [
    q("i1", "We co-design programs with at least one external partner."),
    q("i2", "Every program has a measurable outcome target."),
    q("i3", "We dedicate budget to innovation each year."),
    q("i4", "We can pivot quickly when conditions change."),
    q("i5", "Community members have decision-making power on programs."),
    qNA("i6", "We publish financials and outcomes annually."),
    q("i7", "Partnerships include shared evaluation."),
    q("i8", "We publicly report on what didn't work, not only what did."),
  ],
  references: IMPACT_REFS,
});

export const FOURRS: AssessmentConfig = makeAssessment({
  title: "4Rs Framework Audit",
  subtitle: "Relationships · Resources · Results · Reputation — the four arenas of long-term sustainability.",
  framework: "4Rs",
  questions: [
    q("r1", "We have intentional relationship plans for top donors and partners."),
    q("r2", "Our revenue mix is diversified across at least 4 sources."),
    q("r3", "We can articulate measurable results, not only activities."),
    q("r4", "Our reputation is monitored — earned media, reviews, peer awareness."),
    q("r5", "Board members open doors to new relationships annually."),
    q("r6", "We invest in technology that compounds productivity."),
    q("r7", "Results are reported to the community quarterly."),
    q("r8", "We have a written brand and messaging guide."),
  ],
  references: FOURRS_REFS,
});

export const REVENUE_HHI: AssessmentConfig = makeAssessment({
  title: "Revenue Diversity",
  subtitle: "Score your concentration risk using the Herfindahl-Hirschman Index. Lower is better.",
  framework: "HHI",
  durationMin: 12,
  scaleLabel: ["Very dependent", "Fully diversified"],
  questions: [
    q("hh1", "Our largest funder represents less than 25% of revenue."),
    q("hh2", "We have 5+ meaningful revenue sources."),
    qNA("hh3", "We have grown earned revenue year over year."),
    qNA("hh4", "Individual giving grew faster than expense growth."),
    q("hh5", "We have multi-year commitments from at least 3 funders."),
    q("hh6", "We have a written diversification plan with targets."),
    q("hh7", "We model revenue scenarios annually."),
    qNA("hh8", "We could weather the loss of our largest funder for 12 months."),
  ],
  references: REVENUE_HHI_REFS,
});

export const DEI: AssessmentConfig = makeAssessment({
  title: "DEI / Equity Audit",
  subtitle: "Where does your organization actually live on diversity, equity, inclusion, and belonging — beyond the statement on the website?",
  framework: "DEI / Equity",
  scaleLabel: ["Not yet", "Embedded"],
  questions: [
    q("d1", "Our board reflects the demographics of the community we serve."),
    q("d2", "Our staff reflects the demographics of the community we serve."),
    qNA("d3", "We collect and review pay-equity data at least annually."),
    q("d4", "We have a written equity statement that is referenced in decisions, not just on the website."),
    q("d5", "People closest to the problem we're solving have decision-making power, not just an advisory role."),
    q("d6", "We measure programmatic outcomes disaggregated by race, gender, and income."),
    q("d7", "Our vendor and contractor spend prioritizes BIPOC- and women-owned businesses."),
    q("d8", "Staff at every level can raise equity concerns without career risk."),
    q("d9", "We have a documented anti-harassment and grievance process that staff trust."),
    q("d10", "We invest budget — not just words — in equity work (training, audits, compensation)."),
  ],
  recommendations: [
    { score: [0, 40], maturity: "Performative", tone: "The statements exist; the practices don't yet. Time to move from posture to practice.", advice: ["Commission an external pay-equity study", "Set 18-month board and staff demographic targets", "Add disaggregated outcome data to your dashboard"] },
    { score: [41, 70], maturity: "Practicing", tone: "Real work is underway. The gap now is depth and accountability.", advice: ["Move community members from advisory to decision-making roles", "Tie executive comp partially to equity metrics", "Publish your demographics annually"] },
    { score: [71, 100], maturity: "Embedded", tone: "Equity is structural, not seasonal. Keep the receipts visible.", advice: ["Mentor peer organizations", "Open-source your equity playbook", "Stretch into supply-chain and grantmaking equity"] },
  ],
  references: DEI_REFS,
});

export const ALL = {
  health: HEALTH,
  capacity: CAPACITY,
  financial: FINANCIAL,
  fundraising: FUNDRAISING,
  "program-impact": PROGRAM_IMPACT,
  governance: GOVERNANCE,
  community: COMMUNITY,
  digital: DIGITAL,
  impact: IMPACT,
  "4rs": FOURRS,
  "revenue-hhi": REVENUE_HHI,
  dei: DEI,
};
