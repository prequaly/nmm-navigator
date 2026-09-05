# NMM Navigator

NMM Navigator is a guided strategic planning, execution, funding, and
sustainability platform for nonprofits — meant to function like a digital
strategic planning consultant. It walks an organization through one
continuous loop: **Build → Assess → Plan → Fund → Execute → Measure →
Improve** (or, for a brand-new organization, **Imagine → Build → Plan → Fund
→ Launch → Measure → Improve**), all feeding the same underlying data so a
strategic plan never turns into a PDF that sits on a shelf.

This build targets full functional parity with the internal *NMM Navigator
Functional Requirements* document (45 sections), running entirely on
free-tier infrastructure — a free Supabase project and Google's free-tier
Gemini API — with two deliberate exclusions (see below). Everything else in
the requirements doc is implemented, not stubbed.

Built on TanStack Start + React 19 + Tailwind/shadcn, with Supabase
(Postgres + Row Level Security) for data and Google Gemini (via the Vercel
AI SDK) for AI drafting and structured recommendations.

## Current State

Every screen in the product is wired to real, persisted data — there are no
remaining mock-data stubs. At a high level:

- **6-role permission model** (`owner`, `admin`, `staff`, `board_member`,
  `consultant`, `viewer`) enforced via Postgres RLS helper functions, not
  just UI checks. See [Architecture](#architecture) below for the
  permission matrix.
- **Organizational stage & New Organization Mode** — onboarding asks an
  org's stage up front; brand-new organizations get "Not Yet Applicable —
  We Are a New Organization" as a first-class, non-penalizing answer on
  every question where elapsed history would otherwise be required.
- **Tri-state assessment data model** (Historical Actual / Projected-Planned
  / Not Yet Applicable) across all 12 assessments, scored by a single
  shared `src/lib/assessments/scoring.ts` that excludes N/A answers from
  both the numerator and denominator — N/A never lowers a score.
- **A guided, incremental Plan Builder** (`plan.builder.tsx`) — a stepper
  through Mission → SWOT → Theory of Change → Priorities → KPIs → Risks →
  Narrative, with assessment-driven "suggested for you" recommendations at
  each step and one-click accept.
- **IMPACT and 4Rs frameworks** woven through planning, narrative drafting,
  and reporting (not siloed as standalone quizzes) — both frameworks share
  the same lens-detection and coverage-scoring machinery.
- **A structured AI Strategist**, not just a narrative drafter: it
  generates typed priorities/objectives/KPIs/risks and pressure-tests
  budget assumptions via `generateObject` + Zod schemas, always through an
  Accept / Edit / Reject card — AI never silently overwrites approved
  content.
- **All 14 report types** from the requirements doc, each exportable as a
  print-ready PDF, an editable DOCX, and a data-heavy XLSX, generated
  entirely client-side from live data.
- **Real financial and funding logic**: budget/pro forma, operating
  reserves, scenario/shock modeling against actual revenue and expenses,
  funding-gap analysis rolled up from the Asks Bank, and a reusable Grant
  Response Bank.
- **Full governance module**: board matrix, meetings with agendas/decisions
  /action items, policies, staff succession.

No automated test suite exists yet (see [Open Decisions](#open-decisions)).

## Explicitly Out of Scope in This Build

Two things are intentionally not built, and neither represents an
unfinished requirement:

- **Real payment/billing collection.** The requirements doc describes a
  subscription-tier *philosophy* (every tier gets the complete core
  journey; tiers should only differ in scale), not a checkout flow. There
  is no paying customer to bill yet, so no tier data model, gating logic,
  or Stripe integration exists — every organization simply gets the full
  product today. Build this when there's a real reason to differentiate
  paying tiers.
- **Form 990 upload.** This was never in the requirements document — it
  was a bonus feature an earlier internal planning note (`.lovable/plan.md`)
  proposed on its own initiative. The AI extraction logic already exists
  (`src/lib/finance/extract-990.functions.ts`), but there is no storage
  bucket, upload table, or UI wired to it. A nice differentiator to add
  later, not a gap in what was asked for.

## Free-Tier Ceilings to Watch

This runs entirely on free infrastructure. That's fine for one
organization's real usage indefinitely, but has real ceilings worth
knowing about before assuming this scales as-is:

- **Supabase free tier**: 500MB database, 50k monthly active users, and the
  project pauses after a week of total inactivity (a quick dashboard visit
  resumes it). Revisit once there are multiple real paying nonprofit
  customers, not just one org's data.
- **Google Gemini free tier**: the practical limit is requests-per-minute
  (roughly 10–15/min for Flash-tier models), not daily volume — a full
  end-to-end walkthrough of the product costs well under 100,000 tokens.
  This becomes a real constraint the moment multiple organizations use the
  AI Strategist concurrently in the same window, not before.
- **No CDN / edge caching strategy** has been considered — irrelevant at
  one org's traffic, worth a look before wider rollout.

## UI Backlog

Deliberately deferred to keep this build focused on data correctness and
functional completeness rather than a UI overhaul:

- **Universal Accept/Edit/Reject for AI** — built for the newer AI
  Strategist surfaces (recommendations, pressure-testing) and retrofitted
  onto the three original single-button AI sites (plan narrative, meeting
  summaries, assessment reflections) with an explicit Discard action. A
  fully consistent design system across every AI touchpoint is still a
  worthwhile follow-on pass.
- **Role-aware UI hiding** — today only `team.tsx` conditionally renders by
  role; everywhere else RLS blocks unauthorized writes silently, with no
  UI feedback (a `viewer` can open a form and have their submit fail).
  Graying out or hiding controls per the permission matrix is a broad,
  cross-cutting pass.
- **A persistent, dismissible alerts system** beyond the dashboard's
  current alerts card — a proper cross-page notification treatment.
- **Progressive unlock UI for subscription tiers** — moot until Phase 7
  (tiers) is actually built, but worth designing alongside it rather than
  after.
- **A systematic anti-pattern audit** against the requirements doc's own
  list (no unexplained scores, no dead-end pages, no overcrowded
  dashboards) now that every screen has real data flowing through it.
- **A purpose-built visual design for the Plan Builder wizard** — it
  currently reuses the onboarding stepper's visual pattern functionally; a
  more considered look for it specifically is a design investment, not a
  data fix.

## Architecture

### The data spine

Every module writes into one connected chain rather than disconnected
silos, per the requirements doc's Section 41:

```
Organization → Mission/Vision/Programs/Financials → Assessments →
Strategic Priorities → Objectives → KPIs → Milestones →
Tasks/Programs/Events → Budget Requirements → Funding Gaps → Asks →
Grant Content → Execution Data → Reviews → Impact/Annual Review
```

### Module map

The in-app navigation (`src/components/app-shell/AppShell.tsx`) mirrors the
product's own core loop, unlocking progressively as an org completes each
stage:

| Nav group | Covers |
|---|---|
| **Build My Organization** | Org profile, mission/vision/values, team & invites |
| **Assess My Organization** | 12 assessments (Planning Health, Capacity, Financial Health, Revenue Diversity/HHI, Fundraising Readiness, Program Impact, Board Governance, Community Engagement, Digital Presence, DEI, IMPACT, 4Rs) |
| **Design My Strategy** | Plan Builder, Narrative, SWOT, Stakeholder Map, Theory of Change, Priorities, KPIs, Risk Register |
| **Build My Roadmap** | Gantt, Strategic Calendar, Quarterly OKRs, Programs & Events |
| **Fund My Strategy** | Budget, Cash Flow, Reserves, Funding Gap, Scenario Modeling, Program Cost Allocation, Grants Register & Pipeline, Donor Segments, Asks Bank, Grant Response Bank |
| **Execute My Plan** | Task Manager, Coffee Chats, Donor/Volunteer Touchpoints, Compliance Calendar, Meetings, Decision Log, Policies, Board Matrix, Staff & Succession |
| **Measure My Impact** | Reports & AI Insights, Beneficiary Stories, Outcomes Over Time, Monthly Strategic Review, Exports |

### Permissions

6 roles enforced in Postgres via `SECURITY DEFINER` RLS helper functions
(`is_org_member`, `is_org_editor`, `is_org_admin`, `is_org_plan_contributor`,
`has_org_role`, `is_platform_admin`) rather than ad hoc per-table checks —
RLS is the actual enforcement layer, the UI is not the only gate.

| Role | Org settings / team | Plan content | Finance | Read access |
|---|---|---|---|---|
| Owner | Full (only role that can delete the org) | Full | Full | Everything |
| Admin | Manage team/invites | Full | Full | Everything |
| Staff | None | Full | Full | Everything |
| Consultant | None | Full | None | Everything |
| Board Member | None | None | None | Everything |
| Viewer | None | None | None | Everything |

Two judgment calls were made here without explicit sign-off, since the
requirements doc doesn't specify this level of detail — both are one-line
changes (swap which helper a policy calls) if that's wrong:

- **Consultants get plan-content write access but not finance write
  access**, on the theory that a consultant supporting a client org (and
  the CSG Done-With-You/Done-For-You integration) builds plan content, not
  the org's actual budget.
- **Board Members are read-only by default.** The requirements doc's
  "assigned activities" carve-out (e.g., a board member updating their own
  meeting RSVP) isn't built — it needs per-activity assignment, not a
  blanket role check.

### AI

`src/lib/ai-gateway.server.ts` wraps Google's Gemini OpenAI-compatible
endpoint via `@ai-sdk/openai-compatible`. Two distinct call shapes:

- **Narrative drafting** (`generateText`, `gemini-flash-latest`) — plan
  narrative sections, meeting summaries, assessment reflections, monthly
  reviews. Always lands in an editable field with an explicit Save/Discard,
  never auto-committed.
- **Structured output** (`generateObject` + Zod, `gemini-flash-lite-latest`)
  — strategic recommendations, SMART objectives/KPIs, risk generation,
  budget pressure-testing. Requires `supportsStructuredOutputs: true` in
  the provider config — without it, Gemini's endpoint silently fails Zod
  validation on some models. Always surfaces through an Accept/Edit/Reject
  card (`src/components/ai/AiSuggestionCard.tsx`).

Some deterministic, free features are intentionally rule-based rather than
AI-driven (`src/lib/plan/recommendations.ts`, `src/lib/plan/roadmap-gen.ts`)
— assessment-score-to-recommendation mapping and pillar-to-roadmap
generation don't need an LLM call to be correct, and skipping one keeps
free-tier AI usage headroom for the calls that actually need it.

### Reports & exports

All 14 report types follow one pattern: a data fetcher in
`src/lib/exports/data.ts` → a `src/lib/exports/{report}.ts` with
`download{Report}Docx`/`download{Report}Xlsx` functions (via `docx` and
`exceljs`) → a `report.print.{report}.tsx` route using the shared
`PrintLayout`/`PrintSection`/`PrintKV` components for a browser-printable
PDF. Every export runs client-side — no data leaves the browser to generate
a document. Report catalogs live in `report.exports.tsx` (the full list)
and `report.insights.tsx` (a curated gallery of the most-used ones).

## Setup

### Prerequisites

- Node.js and npm
- A [Supabase](https://supabase.com) project (free tier is sufficient)
- A [Google AI Studio](https://aistudio.google.com) API key (free tier)

### Environment variables

Copy `.env.example` to `.env` and fill in your own project's values:

```
VITE_SUPABASE_URL=              # Supabase project URL (client-safe)
VITE_SUPABASE_PUBLISHABLE_KEY=  # Supabase anon/publishable key (client-safe)
VITE_SUPABASE_PROJECT_ID=       # Supabase project ref
SUPABASE_URL=                   # same URL, read server-side
SUPABASE_PUBLISHABLE_KEY=       # same anon key, read server-side
SUPABASE_PROJECT_ID=            # same project ref, read server-side
SUPABASE_SERVICE_ROLE_KEY=      # Supabase service-role key — SERVER-ONLY, never VITE_-prefixed
GEMINI_API_KEY=                 # Google AI Studio Gemini API key — server-only
```

The service-role key and Gemini key must never be exposed to the client —
only the `VITE_`-prefixed variables are safe to ship to the browser.

### Database

Apply every file in `supabase/migrations/` **in filename order** to a fresh
Supabase project. If the Supabase CLI is linked to the right account,
`supabase db push` does this in one step; otherwise paste each migration's
contents into the Supabase Dashboard's SQL Editor and run them in order —
this repo has been developed against a project where CLI linking wasn't
available, so every migration here has been hand-verified to apply cleanly
via the SQL Editor as well.

After migrations are applied, regenerate `src/integrations/supabase/types.ts`
against the live schema (via `supabase gen types typescript`, or by hand —
see the note in [Open Decisions](#open-decisions) about why this file needs
active attention).

### Run it

```
npm install
npm run dev       # dev server
npm run build     # production build
npm run lint       # eslint
```

### Bring-up checkpoint

Sign up a test user, confirm a new organization row gets created (this
happens via a `SECURITY DEFINER` trigger on organization insert — not a
client-side insert), and confirm at least one AI call
(`plan.narrative.tsx`'s AI draft button is the fastest check) returns a
real completion through the Gemini gateway.

## Open Decisions

- **No automated test suite exists.** Given how much correctness depends
  on a few narrow, easy-to-get-wrong pieces of logic — the tri-state
  scoring math in `src/lib/assessments/scoring.ts`, RLS policy behavior
  per role, and the HHI/scenario financial math — these are the highest-
  value places to introduce test coverage first, rather than aiming for
  broad coverage immediately.
- **`src/integrations/supabase/types.ts` is hand-maintained**, not
  regenerated automatically as part of any build step. It has drifted from
  the live schema more than once during this build (missing columns on
  `organizations`, `strategic_pillars`, and `assessment_responses` after
  migrations added them) — each time only surfacing when new code tried to
  read the missing field. Wiring `supabase gen types` into a script (or CI)
  would remove this whole class of bug.
- **Lovable-specific tooling remains** (`.lovable/` config,
  `@lovable.dev/vite-tanstack-config`, `@lovable.dev/cloud-auth-js` in
  `package.json`) from this project's original scaffolding. Nothing in
  this build depends on Lovable's managed services anymore — AI calls go
  directly to Google's Gemini API and the database is a self-owned
  Supabase project — but the packages and config files haven't been
  removed. Worth a deliberate decision (keep developing inside Lovable's
  tooling vs. fully detach) rather than leaving it as unexamined residue.
  `package.json`'s `name` field (`tanstack_start_ts`) is a related leftover
  from the same scaffold.
- **`fund.donor-segments.tsx` is deliberately simplified**: it tracks
  manually-entered aggregate rollups per giving segment (donor count,
  total, retention, YoY change), not an individual-donor/CRM data model.
  The requirements doc doesn't specify a donor-level data model, so this
  was a judgment call to get the page off static mock data without
  inventing product scope that wasn't asked for. Revisit if real
  donor-level tracking turns out to be wanted.
- **Sector-benchmark data source.** `report.benchmarks.tsx` now trends the
  organization's own historical assessment scores (real data, no
  dependency), which is a deliberate improvement over the external
  peer-comparison table it started as — but it means there's currently no
  way to compare against other organizations' numbers at all. If external
  benchmarking is wanted later, it needs a real, licensed data source
  (Candid, GuideStar/Candid, sector-specific surveys) rather than the
  placeholder figures the original static table used.
