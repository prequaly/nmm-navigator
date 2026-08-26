export type GrantVariant = {
  id: string;
  label: string;
  /** Soft target used to instruct the model and to render a counter. */
  target: { type: "chars" | "words"; value: number };
};

export type GrantQuestion = {
  id: string;
  number: number | null; // null for bonus
  question: string;
  purpose: string;
  include?: string[];
  variants: GrantVariant[];
  category: "core" | "bonus";
};

const CHAR_VARIANTS: GrantVariant[] = [
  { id: "150_chars", label: "150 characters", target: { type: "chars", value: 150 } },
  { id: "500_chars", label: "500 characters", target: { type: "chars", value: 500 } },
  { id: "250_words", label: "250 words", target: { type: "words", value: 250 } },
  { id: "500_words", label: "500 words", target: { type: "words", value: 500 } },
  { id: "1000_words", label: "1000 words", target: { type: "words", value: 1000 } },
];

const NARRATIVE_VARIANTS: GrantVariant[] = [
  { id: "short", label: "Short version", target: { type: "words", value: 150 } },
  { id: "standard", label: "Standard version", target: { type: "words", value: 400 } },
  { id: "expanded", label: "Expanded version", target: { type: "words", value: 800 } },
];

const STANDARD_VARIANTS: GrantVariant[] = [
  { id: "short", label: "Short", target: { type: "words", value: 150 } },
  { id: "standard", label: "Standard", target: { type: "words", value: 400 } },
  { id: "expanded", label: "Expanded", target: { type: "words", value: 800 } },
];

export const GRANT_QUESTIONS: GrantQuestion[] = [
  {
    id: "mission",
    number: 1,
    question: "What is your organization's mission?",
    purpose: "Provides a concise overview of your organization's purpose and reason for existence.",
    variants: CHAR_VARIANTS,
    category: "core",
  },
  {
    id: "org_history",
    number: 2,
    question: "Describe your organization and its history.",
    purpose: "Provides organizational background, founding story, milestones, and evolution.",
    variants: NARRATIVE_VARIANTS,
    category: "core",
  },
  {
    id: "community_need",
    number: 3,
    question: "What community need or problem does your organization address?",
    purpose: "Demonstrates the urgency and significance of the issue being addressed.",
    include: ["Statistics", "Community data", "Root causes", "Impact of inaction"],
    variants: STANDARD_VARIANTS,
    category: "core",
  },
  {
    id: "program_description",
    number: 4,
    question: "Describe the program, project, or initiative for which funding is requested.",
    purpose: "Explains what will be funded and how it works.",
    include: ["Activities", "Services", "Timeline", "Participants"],
    variants: STANDARD_VARIANTS,
    category: "core",
  },
  {
    id: "beneficiaries",
    number: 5,
    question: "Who will benefit from this project?",
    purpose: "Identifies the target population.",
    include: ["Demographics", "Geography", "Number served", "Eligibility"],
    variants: STANDARD_VARIANTS,
    category: "core",
  },
  {
    id: "expected_outcomes",
    number: 6,
    question: "What outcomes do you expect to achieve?",
    purpose: "Describes measurable results.",
    include: ["Short-term outcomes", "Long-term outcomes", "Community impact"],
    variants: STANDARD_VARIANTS,
    category: "core",
  },
  {
    id: "measuring_success",
    number: 7,
    question: "How will you measure success?",
    purpose: "Explains evaluation methods.",
    include: ["KPIs", "Data collection", "Reporting methods", "Evaluation tools"],
    variants: STANDARD_VARIANTS,
    category: "core",
  },
  {
    id: "uniquely_positioned",
    number: 8,
    question: "Why is your organization uniquely positioned to address this issue?",
    purpose: "Demonstrates credibility and expertise.",
    include: ["Experience", "Partnerships", "Staff expertise", "Track record"],
    variants: STANDARD_VARIANTS,
    category: "core",
  },
  {
    id: "innovation",
    number: 9,
    question: "What makes this project innovative?",
    purpose: "Highlights creativity, innovation, or unique approaches.",
    include: ["New solutions", "Technology", "Collaboration", "Differentiators"],
    variants: STANDARD_VARIANTS,
    category: "core",
  },
  {
    id: "mission_alignment",
    number: 10,
    question: "How does this project align with your mission and strategic goals?",
    purpose: "Connects project activities to broader organizational priorities.",
    include: ["Strategic priorities", "Mission alignment", "Long-term vision"],
    variants: STANDARD_VARIANTS,
    category: "core",
  },
  {
    id: "partnerships",
    number: 11,
    question: "What partnerships support this work?",
    purpose: "Demonstrates collaboration and community engagement.",
    include: ["Strategic partners", "Community organizations", "Government partners", "Schools", "Businesses"],
    variants: STANDARD_VARIANTS,
    category: "core",
  },
  {
    id: "annual_budget",
    number: 12,
    question: "What is your organization's annual budget?",
    purpose: "Provides organizational scale and capacity information.",
    include: ["Annual operating budget", "Program budget", "Revenue mix"],
    variants: STANDARD_VARIANTS,
    category: "core",
  },
  {
    id: "other_funding",
    number: 13,
    question: "What other funding sources support this work?",
    purpose: "Shows financial sustainability and shared investment.",
    include: ["Grants", "Donations", "Sponsorships", "Earned income"],
    variants: STANDARD_VARIANTS,
    category: "core",
  },
  {
    id: "sustainability",
    number: 14,
    question: "What is your sustainability plan?",
    purpose: "Explains how work will continue after grant funding ends.",
    include: ["Revenue diversification", "Future funding", "Capacity building", "Partnerships"],
    variants: STANDARD_VARIANTS,
    category: "core",
  },
  {
    id: "leadership_capacity",
    number: 15,
    question: "Describe your leadership and organizational capacity.",
    purpose: "Demonstrates ability to manage funds and implement programs.",
    include: ["Leadership team", "Board", "Staff", "Volunteers"],
    variants: STANDARD_VARIANTS,
    category: "core",
  },
  {
    id: "dei",
    number: 16,
    question: "How does your organization promote diversity, equity, inclusion, and accessibility?",
    purpose: "Addresses DEI priorities.",
    include: ["Policies", "Practices", "Representation", "Community engagement"],
    variants: STANDARD_VARIANTS,
    category: "core",
  },
  {
    id: "impact_to_date",
    number: 17,
    question: "Describe your organization's impact to date.",
    purpose: "Demonstrates past success.",
    include: ["Outcomes", "Success stories", "Data", "Community impact"],
    variants: STANDARD_VARIANTS,
    category: "core",
  },
  {
    id: "challenges",
    number: 18,
    question: "What challenges or barriers does your organization face?",
    purpose: "Provides context for funding needs.",
    include: ["Capacity challenges", "Funding gaps", "Community barriers", "Growth constraints"],
    variants: STANDARD_VARIANTS,
    category: "core",
  },
  {
    id: "funding_request",
    number: 19,
    question: "What specific funding amount are you requesting and how will it be used?",
    purpose: "Explains the request and budget allocation.",
    include: ["Budget breakdown", "Use of funds", "Expected outcomes"],
    variants: STANDARD_VARIANTS,
    category: "core",
  },
  {
    id: "change_if_funded",
    number: 20,
    question: "If fully funded, what change will this investment create?",
    purpose: "Helps funders visualize return on investment.",
    include: ["Immediate outcomes", "Long-term impact", "Community transformation", "Sustainability benefits"],
    variants: STANDARD_VARIANTS,
    category: "core",
  },

  // ----- Bonus -----
  { id: "theory_of_change", number: null, question: "Theory of Change", purpose: "Articulate the causal pathway between activities and impact.", variants: STANDARD_VARIANTS, category: "bonus" },
  { id: "logic_model", number: null, question: "Logic Model", purpose: "Map inputs → activities → outputs → outcomes → impact.", variants: STANDARD_VARIANTS, category: "bonus" },
  { id: "advocacy_policy", number: null, question: "Advocacy / Public Policy Impact", purpose: "Describe systems-change and policy work.", variants: STANDARD_VARIANTS, category: "bonus" },
  { id: "community_engagement", number: null, question: "Community Engagement Strategy", purpose: "How community voice shapes design and delivery.", variants: STANDARD_VARIANTS, category: "bonus" },
  { id: "board_governance", number: null, question: "Board Governance", purpose: "Board composition, oversight, and engagement.", variants: STANDARD_VARIANTS, category: "bonus" },
  { id: "risk_management", number: null, question: "Risk Management", purpose: "How key risks are identified, mitigated, and monitored.", variants: STANDARD_VARIANTS, category: "bonus" },
  { id: "technology_infrastructure", number: null, question: "Technology Infrastructure", purpose: "Systems supporting program delivery and operations.", variants: STANDARD_VARIANTS, category: "bonus" },
  { id: "data_privacy", number: null, question: "Data Privacy & Security", purpose: "How participant and donor data is protected.", variants: STANDARD_VARIANTS, category: "bonus" },
  { id: "environmental_sustainability", number: null, question: "Environmental Sustainability", purpose: "Environmental considerations and practices.", variants: STANDARD_VARIANTS, category: "bonus" },
  { id: "scaling_replication", number: null, question: "Scaling & Replication Potential", purpose: "How the model can grow or be replicated elsewhere.", variants: STANDARD_VARIANTS, category: "bonus" },
];

export function getQuestion(id: string): GrantQuestion | undefined {
  return GRANT_QUESTIONS.find((q) => q.id === id);
}
