-- ============================================================================
-- STEP 5: persist the AI-drafted assessment reflection
-- ============================================================================
-- AssessmentRunner.tsx's "Leadership reflection" (AI-drafted) was held only
-- in component state — it vanished on refresh, unlike every other
-- AI-drafted piece of content in the app (plan narrative, meeting
-- summaries), which are saved to a real column with an explicit Save
-- action. Adding the column that was missing rather than leaving this one
-- surface silently ephemeral.
-- ============================================================================

ALTER TABLE public.assessment_responses
  ADD COLUMN reflection text;
