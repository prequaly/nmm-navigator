-- ============================================================================
-- STEP 2 (batch 1): persistence for SWOT, Programs, Compliance, Touchpoints
-- ============================================================================
-- These four screens previously rendered from src/lib/mock/riverside.ts with
-- no database backing at all — edits vanished on refresh. This migration adds
-- real tables following the exact RLS pattern established in the foundation
-- migrations (is_org_member for read, is_org_plan_contributor/is_org_editor
-- for write depending on domain).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- theory_of_change: the table already existed but was never wired to a UI.
-- The UI (plan.theory-of-change.tsx) renders "impact" and "assumptions" as
-- lists and needs an "external factors" list the original table didn't have —
-- widen those columns now, before any row exists, rather than after.
-- ----------------------------------------------------------------------------
ALTER TABLE public.theory_of_change
  ALTER COLUMN impact TYPE jsonb USING (
    CASE WHEN impact IS NULL THEN '[]'::jsonb ELSE to_jsonb(ARRAY[impact]) END
  ),
  ALTER COLUMN impact SET DEFAULT '[]'::jsonb,
  ALTER COLUMN impact SET NOT NULL,
  ALTER COLUMN assumptions TYPE jsonb USING (
    CASE WHEN assumptions IS NULL THEN '[]'::jsonb ELSE to_jsonb(ARRAY[assumptions]) END
  ),
  ALTER COLUMN assumptions SET DEFAULT '[]'::jsonb,
  ALTER COLUMN assumptions SET NOT NULL,
  ADD COLUMN external_factors jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ----------------------------------------------------------------------------
-- SWOT items — plan content, so consultants can contribute (is_org_plan_contributor)
-- ----------------------------------------------------------------------------
CREATE TABLE public.swot_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.strategic_plans(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  quadrant text NOT NULL CHECK (quadrant IN ('strengths','weaknesses','opportunities','threats')),
  text text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swot_items TO authenticated;
GRANT ALL ON public.swot_items TO service_role;
ALTER TABLE public.swot_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY swot_member_select ON public.swot_items FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY swot_editor_insert ON public.swot_items FOR INSERT TO authenticated
  WITH CHECK (is_org_plan_contributor(organization_id, auth.uid()));
CREATE POLICY swot_editor_update ON public.swot_items FOR UPDATE TO authenticated
  USING (is_org_plan_contributor(organization_id, auth.uid()))
  WITH CHECK (is_org_plan_contributor(organization_id, auth.uid()));
CREATE POLICY swot_editor_delete ON public.swot_items FOR DELETE TO authenticated
  USING (is_org_plan_contributor(organization_id, auth.uid()));
CREATE INDEX idx_swot_plan ON public.swot_items(plan_id);

-- ----------------------------------------------------------------------------
-- Programs — execution/operations data, general editor access (is_org_editor)
-- ----------------------------------------------------------------------------
CREATE TABLE public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pillar_id uuid REFERENCES public.strategic_pillars(id) ON DELETE SET NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'Program',
  participants int,
  budget numeric,
  status text NOT NULL DEFAULT 'planning',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programs TO authenticated;
GRANT ALL ON public.programs TO service_role;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY programs_member_select ON public.programs FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY programs_editor_insert ON public.programs FOR INSERT TO authenticated
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY programs_editor_update ON public.programs FOR UPDATE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()))
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY programs_editor_delete ON public.programs FOR DELETE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()));
CREATE INDEX idx_programs_org ON public.programs(organization_id);

-- ----------------------------------------------------------------------------
-- Compliance items — execution/operations data
-- ----------------------------------------------------------------------------
CREATE TABLE public.compliance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('Tax','State Registration','Insurance','Audit','Policy','Employment')),
  due_date date,
  cadence text NOT NULL DEFAULT 'Annual',
  owner text,
  status text NOT NULL DEFAULT 'in-progress' CHECK (status IN ('complete','in-progress','due-soon','overdue')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_items TO authenticated;
GRANT ALL ON public.compliance_items TO service_role;
ALTER TABLE public.compliance_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY compliance_member_select ON public.compliance_items FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY compliance_editor_insert ON public.compliance_items FOR INSERT TO authenticated
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY compliance_editor_update ON public.compliance_items FOR UPDATE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()))
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY compliance_editor_delete ON public.compliance_items FOR DELETE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()));
CREATE INDEX idx_compliance_org ON public.compliance_items(organization_id);

-- ----------------------------------------------------------------------------
-- Touchpoints — donor/volunteer cultivation cadence, execution/operations data
-- ----------------------------------------------------------------------------
CREATE TABLE public.touchpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('donor','volunteer','both')),
  channel text NOT NULL CHECK (channel IN ('email','call','in_person','gift','event','recognition')),
  segment text,
  owner text,
  scheduled_date date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.touchpoints TO authenticated;
GRANT ALL ON public.touchpoints TO service_role;
ALTER TABLE public.touchpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY touchpoints_member_select ON public.touchpoints FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY touchpoints_editor_insert ON public.touchpoints FOR INSERT TO authenticated
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY touchpoints_editor_update ON public.touchpoints FOR UPDATE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()))
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY touchpoints_editor_delete ON public.touchpoints FOR DELETE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()));
CREATE INDEX idx_touchpoints_org ON public.touchpoints(organization_id);
CREATE TRIGGER trg_touchpoints_updated BEFORE UPDATE ON public.touchpoints
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_compliance_updated BEFORE UPDATE ON public.compliance_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_programs_updated BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_swot_updated BEFORE UPDATE ON public.swot_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
