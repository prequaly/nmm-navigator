// Section-specific prompt scaffolding for AI-drafted strategic plan sections.

export type SectionPromptConfig = {
  title: string;
  /** Short framing sentence telling the AI what the section is for. */
  intro: string;
  /** Specific instructions on length, tone, what to cover. */
  guidance: string;
  /** Whether to format the body with IMPACT framework sub-headings. */
  impact: boolean;
  /** Whether to also format a 4Rs (Relationships/Resources/Results/
   * Reputation) sub-heading block, in parity with IMPACT. */
  fourrs: boolean;
};

export const SECTION_PROMPTS: Record<string, SectionPromptConfig> = {
  executive_summary: {
    title: "Executive Summary",
    intro:
      "A 2–3 paragraph overview that names the organization, the plan horizon, the strategic priorities, and the framework guiding the work (CSG's IMPACT Framework: Inclusive Partnerships, Measurable Outcomes, Purpose-Driven Innovation, Adaptive Strategies, Community Empowerment, Transparency & Accountability).",
    guidance:
      "Open with the organization's positioning and inflection point. Name the 3–4 highest-priority initiatives. Reaffirm commitment to mission and the populations served. ~250–350 words.",
    impact: true,
    fourrs: true,
  },
  organizational_overview: {
    title: "Organizational Overview",
    intro:
      "A short profile section covering founding, mission, programs, populations served, geographic footprint, and core values.",
    guidance:
      "Two to three tight paragraphs. Mention current capacity (staff, volunteers, beneficiaries served, budget) and the core values that drive the work.",
    impact: true,
    fourrs: true,
  },
  current_state: {
    title: "Current State Assessment",
    intro:
      "An honest read of where the organization is today — recent milestones and achievements alongside the most significant challenges.",
    guidance:
      "First paragraph: recent wins and operational strengths (use the pillars/KPIs/roadmap data). Second paragraph: candid challenges (use SWOT/assessment data if present). Third paragraph: how this plan addresses them.",
    impact: true,
    fourrs: true,
  },
  strategic_issues: {
    title: "Strategic Issues & IMPACT Framework Approach",
    intro:
      "Name the 2–4 most important strategic challenges this plan must solve, then describe how the IMPACT Framework will guide the response.",
    guidance:
      "Lead with a numbered list of 2–4 challenges (one sentence each). Then a paragraph explaining each IMPACT lens (Inclusive Partnerships, Measurable Outcomes, Purpose-Driven Innovation, Adaptive Strategies, Community Empowerment, Transparency & Accountability) as a bullet list. Close with one sentence on how the framework strengthens the foundation.",
    impact: true,
    fourrs: true,
  },
  financial_strategy: {
    title: "Financial Strategy",
    intro:
      "The organization's plan to diversify revenue, build reserves, and ensure long-term financial sustainability.",
    guidance:
      "Reference the revenue streams, expense lines, grants, and any reserve targets. Mention specific funder strategies, fundraising milestones, and year-by-year priorities.",
    impact: true,
    fourrs: true,
  },
  program_enhancements: {
    title: "Program & Curriculum Enhancements",
    intro:
      "How programs will evolve over the plan horizon — growth, new initiatives, curriculum innovation, partnerships supporting program delivery.",
    guidance:
      "Reference roadmap items, OKRs, and pillars tied to programming. Mention specific program launches with rough timing.",
    impact: true,
    fourrs: true,
  },
  community_engagement: {
    title: "Community Engagement & Partnerships",
    intro:
      "Partnership strategy, family/community engagement, volunteer programs, and how the organization stays accountable to those it serves.",
    guidance:
      "Reference existing partners (use grant funders as a proxy), volunteer/donor engagement plans, and the cadence of community input.",
    impact: true,
    fourrs: true,
  },
  leadership_succession: {
    title: "Leadership & Succession Planning",
    intro:
      "How the organization is building leadership capacity at the board, executive, and staff levels — including succession plans for key roles.",
    guidance:
      "Reference board development, CEO/ED succession timing, professional development for staff, and any leadership development dashboard or milestones.",
    impact: true,
    fourrs: true,
  },
  measurement_evaluation: {
    title: "Measurement & Evaluation Plan",
    intro: "How progress against this plan will be measured, reported, and reviewed.",
    guidance:
      "Reference the KPI library, OKR cadence, dashboards, and any external evaluation. Name who reviews what and how often.",
    impact: true,
    fourrs: true,
  },
  risk_mitigation: {
    title: "Risk Mitigation Strategies",
    intro: "How identified risks will be monitored and mitigated over the plan horizon.",
    guidance:
      "Reference the risk register (categories, likelihood, impact, mitigations). Mention drills, scenario planning, insurance, governance review cadence, and continuity practices.",
    impact: true,
    fourrs: true,
  },
  conclusion: {
    title: "Conclusion",
    intro:
      "A short, forward-looking closing that reaffirms the mission and the organization's commitment to executing the plan.",
    guidance:
      "Two paragraphs maximum. Tie back to the populations served and the future the organization is building.",
    impact: true,
    fourrs: true,
  },
};
