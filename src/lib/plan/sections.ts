// Strategic plan section catalog. Used by the narrative editor, AI drafter,
// and the export/print views so all stay in sync.

export type PlanSection = {
  key: string;
  title: string;
  /** Section is structured around the IMPACT framework lenses. */
  impact: boolean;
  /** Section is structured around the 4Rs framework (Relationships,
   * Resources, Results, Reputation). */
  fourrs: boolean;
  /** Roman numeral label used in headings. */
  numeral: string;
  /** Short helper text shown in the editor. */
  helper: string;
};

export const IMPACT_LENSES: {
  label: string;
  key: string;
  /** Patterns that indicate the lens is being addressed. Case-insensitive. */
  patterns: RegExp[];
}[] = [
  {
    key: "inclusive_partnerships",
    label: "Inclusive Partnerships",
    patterns: [
      /inclusive\s+partnership/i,
      /inclusiv\w*\s+(collaborat|alliance|coalition)/i,
      /equitable\s+partnership/i,
    ],
  },
  {
    key: "measurable_outcomes",
    label: "Measurable Outcomes",
    patterns: [
      /measurable\s+(outcome|result|impact)/i,
      /\bkpis?\b/i,
      /track(ing|ed)?\s+progress/i,
      /quantif(y|iable|ied)\s+(result|outcome|impact)/i,
    ],
  },
  {
    key: "purpose_driven_innovation",
    label: "Purpose-Driven Innovation",
    patterns: [
      /purpose[-\s]driven\s+innovat/i,
      /mission[-\s]driven\s+innovat/i,
      /innovat\w*\s+(rooted|aligned|grounded)\s+in\s+(our\s+)?(purpose|mission)/i,
    ],
  },
  {
    key: "adaptive_strategies",
    label: "Adaptive Strategies",
    patterns: [
      /adaptive\s+strateg/i,
      /adaptive\s+(approach|capacity|management|planning)/i,
      /agile\s+(strateg|response)/i,
    ],
  },
  {
    key: "community_empowerment",
    label: "Community Empowerment",
    patterns: [
      /community\s+empower/i,
      /empower\w*\s+(communit|families|youth|residents|stakeholders)/i,
      /community[-\s]led/i,
    ],
  },
  {
    key: "transparency_accountability",
    label: "Transparency & Accountability",
    patterns: [
      /transparency\s+(and|&)\s+accountability/i,
      /accountab\w+\s+(and|&)\s+transparen/i,
      /open(ness)?\s+(and|&)\s+accountab/i,
    ],
  },
];

export const FOURRS_LENSES: {
  label: string;
  key: string;
  /** Patterns that indicate the lens is being addressed. Case-insensitive. */
  patterns: RegExp[];
}[] = [
  {
    key: "relationships",
    label: "Relationships",
    patterns: [
      /relationship\s+(plan|strategy|management)/i,
      /donor\s+(relationship|stewardship|cultivation)/i,
      /partner(ship)?\s+relationship/i,
    ],
  },
  {
    key: "resources",
    label: "Resources",
    patterns: [
      /revenue\s+(mix|diversif)/i,
      /\bresources?\b.*\b(diversif|allocat|invest)/i,
      /funding\s+(sources?|streams?|base)/i,
    ],
  },
  {
    key: "results",
    label: "Results",
    patterns: [
      /measurable\s+results?/i,
      /\bresults?\b.*\b(report|track|measur)/i,
      /outcomes?\s+(data|reporting)/i,
    ],
  },
  {
    key: "reputation",
    label: "Reputation",
    patterns: [
      /reputation/i,
      /brand(ing)?\s+(and|&)\s+messag/i,
      /earned\s+media/i,
      /public\s+(perception|trust)/i,
    ],
  },
];

export const PLAN_SECTIONS: PlanSection[] = [
  {
    key: "executive_summary",
    title: "Executive Summary",
    numeral: "I",
    impact: true,
    fourrs: true,
    helper:
      "A one-page overview framed through the IMPACT framework: who you are, what you're committing to, and how each IMPACT lens shapes the plan.",
  },
  {
    key: "organizational_overview",
    title: "Organizational Overview",
    numeral: "II",
    impact: true,
    fourrs: true,
    helper:
      "Founding, mission, programs, populations served, and core values — framed through IMPACT lenses.",
  },
  {
    key: "current_state",
    title: "Current State Assessment",
    numeral: "III",
    impact: true,
    fourrs: true,
    helper:
      "Strengths, milestones, and challenges from SWOT and assessment scores — framed through IMPACT lenses.",
  },
  {
    key: "strategic_issues",
    title: "Strategic Issues & IMPACT Framework Approach",
    numeral: "IV",
    impact: true,
    fourrs: true,
    helper:
      "Name the 2–4 challenges this plan must solve and explain how each IMPACT lens guides the response.",
  },
  {
    key: "financial_strategy",
    title: "Financial Strategy",
    numeral: "VI",
    impact: true,
    fourrs: true,
    helper: "Revenue diversification, reserves, fundraising plan — framed through IMPACT lenses.",
  },
  {
    key: "program_enhancements",
    title: "Program & Curriculum Enhancements",
    numeral: "VII",
    impact: true,
    fourrs: true,
    helper: "Program growth, new initiatives, curriculum updates — framed through IMPACT lenses.",
  },
  {
    key: "community_engagement",
    title: "Community Engagement & Partnerships",
    numeral: "VIII",
    impact: true,
    fourrs: true,
    helper:
      "Partnership strategy, family engagement, volunteer programs — framed through IMPACT lenses.",
  },
  {
    key: "leadership_succession",
    title: "Leadership & Succession Planning",
    numeral: "IX",
    impact: true,
    fourrs: true,
    helper:
      "Board development, CEO/staff succession, leadership pipeline — framed through IMPACT lenses.",
  },
  {
    key: "measurement_evaluation",
    title: "Measurement & Evaluation Plan",
    numeral: "X",
    impact: true,
    fourrs: true,
    helper: "How progress will be measured, reported, and reviewed — framed through IMPACT lenses.",
  },
  {
    key: "risk_mitigation",
    title: "Risk Mitigation Strategies",
    numeral: "XI",
    impact: true,
    fourrs: true,
    helper: "How identified risks will be monitored and mitigated — framed through IMPACT lenses.",
  },
  {
    key: "conclusion",
    title: "Conclusion",
    numeral: "XII",
    impact: true,
    fourrs: true,
    helper: "Closing call to action — reaffirm the mission and the commitment to each IMPACT lens.",
  },
];

export function findSection(key: string) {
  return PLAN_SECTIONS.find((s) => s.key === key);
}

/**
 * Detect which IMPACT lenses are present in a narrative body. Matches the
 * lens label as a sub-heading OR any of the lens's keyword patterns, so
 * paraphrased prose still counts.
 */
export function detectImpactCoverage(text: string): Record<string, boolean> {
  const body = text ?? "";
  const coverage: Record<string, boolean> = {};
  for (const lens of IMPACT_LENSES) {
    const labelHit = body.toLowerCase().includes(lens.label.toLowerCase());
    const patternHit = lens.patterns.some((re) => re.test(body));
    coverage[lens.key] = labelHit || patternHit;
  }
  return coverage;
}

/**
 * Detect which 4Rs lenses (Relationships, Resources, Results, Reputation)
 * are present in a narrative body — same matching approach as
 * detectImpactCoverage, so the two frameworks stay in parity.
 */
export function detectFourRsCoverage(text: string): Record<string, boolean> {
  const body = text ?? "";
  const coverage: Record<string, boolean> = {};
  for (const lens of FOURRS_LENSES) {
    const labelHit = body.toLowerCase().includes(lens.label.toLowerCase());
    const patternHit = lens.patterns.some((re) => re.test(body));
    coverage[lens.key] = labelHit || patternHit;
  }
  return coverage;
}
