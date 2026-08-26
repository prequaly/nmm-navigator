
# NMM Navigator — Living Strategic Plan reorientation

Goal: every tool feels like part of one strategic-planning system whose center is the Strategic Plan Dashboard. Six top-level sections, assessment results feed the plan, and Form 990 uploads pre-populate data.

## 1. Navigation IA — collapse to 6 sections

Rewrite `src/components/app-shell/AppShell.tsx` NAV groups to:

- **Strategic Plan** — Dashboard, Strategic Plan Builder (`/plan/builder`), Plan Narrative
- **Assess** — Org Profile, Mission/Vision/Values, Planning Health, Capacity, Financial, Revenue Diversity, Fundraising, Program Impact, Community, Digital, DEI, Governance, IMPACT, 4Rs (Org Profile + Values move in from "Foundation")
- **Plan** — SWOT, Stakeholders, Theory of Change, Risks, Strategic Priorities, KPIs
- **Execute** — Programs, Calendar, Gantt, Tasks, OKRs, Touchpoints, Compliance
- **Fund** — (existing fund.* routes, unchanged grouping)
- **Report** — Reports & AI Insights, Stories, Benchmarks, Exports + Governance sub-group (Board Matrix, Staff/Succession, Meetings, Decisions, Policies) folded under Report → "Board & Governance"

No route files are deleted or renamed (preserves URLs and route tree). Only sidebar grouping/labels change.

## 2. Strategic Plan Dashboard (`/dashboard`)

Replace dashboard sections with a "Strategic Plan HQ" layout:

1. **Plan completion meter** — % computed from filled artifacts: mission/vision/values, SWOT, ToC, ≥3 priorities, ≥3 KPIs, ≥1 budget year, ≥1 risk. New helper `src/lib/plan/completion.ts`.
2. **Framework scores row** — IMPACT score, 4Rs score, Funding Health (from existing assessment_responses + financial signals). Each links to its assessment.
3. **Top priorities** — pulls from `strategic_pillars` / `plan_priorities` table already used by `/plan/priorities`.
4. **Progress on goals** — KPIs with current vs target (existing `kpis` table).
5. **Upcoming milestones** — merge action_items (due ≤30d) + meetings (next 30d). Already partially in dashboard.
6. **Recommended next steps** — driven by `AssessmentRecommendations` component plus completion gaps ("Add a Theory of Change", "Enter Q1 budget", etc.).

New components in `src/components/dashboard/`: `PlanCompletionCard.tsx`, `FrameworkScoresRow.tsx`, `TopPrioritiesCard.tsx`, `NextStepsCard.tsx`. Reuse existing `GettingStarted` only for brand-new orgs.

## 3. Assessment → Plan wiring

Add `src/lib/plan/recommendations.ts` that reads assessment_responses + framework scores and returns recommended priorities/risks/KPIs. Surface this in:
- Dashboard "Recommended next steps"
- `/plan/builder` as a new "Suggested from assessments" panel with one-click "Add to plan" → inserts into `strategic_pillars`, `risks`, or `kpis`.

No schema changes required; uses existing tables.

## 4. Tier policy — IMPACT & 4Rs always included

Update tier gating (wherever `subscription_tier` checks live for these two assessments) to allow all tiers. Search for gates referencing `impact` / `4rs` and remove restrictions.

## 5. Form 990 upload (new feature)

New route `/assess/form-990` and a card on Org Profile + Dashboard:
- Upload PDF → store in new Supabase storage bucket `form-990` (private, RLS by org).
- Server function `parseForm990` (`src/lib/form990/parse.functions.ts`) using Lovable AI Gateway (Gemini multimodal w/ PDF) to extract: EIN, fiscal year, total revenue/expenses/assets, # board members, top funders, program expense ratio, fundraising expense, exec comp.
- Map extracted fields → pre-fill `organizations`, `financial_assumptions`, `revenue_streams` (top sources), `assessment_responses` (governance Qs about board size, conflict policy, etc.). User reviews diff before applying.
- New table `form_990_uploads` (id, org_id, file_path, fiscal_year, extracted_json, applied_at, created_at) with GRANTs + RLS by org membership.

## 6. Out of scope (call out)

- No backend renames or route deletions.
- Marketing/pricing pages, billing, multi-user invites — separate tracks.
- Mobile polish stays as-is.

## Technical notes

- Sidebar reordering is pure frontend (`AppShell.tsx`).
- Dashboard refactor: new components + completion helper; existing data queries reused.
- 990 parsing uses `google/gemini-2.5-flash` via the AI Gateway with a `{type:"file"}` PDF block; result is JSON-validated with Zod before applying.
- Storage bucket created via `supabase--storage_create_bucket` (private); RLS on `storage.objects` scoped to org members.

## Build order

1. Sidebar IA collapse (small, safe).
2. Dashboard "Strategic Plan HQ" components + completion logic.
3. Recommendations engine + Plan Builder integration.
4. Tier policy update for IMPACT/4Rs.
5. Form 990 upload (bucket + table + parse fn + UI).

I'll ship step 1 immediately on approval, then proceed through 2–5 in subsequent turns so you can review each.
