-- ============================================================================
-- STEP 2 (batch 2): Stakeholders, Reserves, Scenarios, Asks Bank, Stories,
-- Donor Segments (simplified)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Stakeholders — plan content (is_org_plan_contributor)
-- ----------------------------------------------------------------------------
CREATE TABLE public.stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('Funder','Partner','Beneficiary','Regulator','Peer','Influencer')),
  interest int NOT NULL CHECK (interest BETWEEN 1 AND 5),
  influence int NOT NULL CHECK (influence BETWEEN 1 AND 5),
  relationship text NOT NULL DEFAULT 'neutral' CHECK (relationship IN ('strong','neutral','at-risk','none')),
  owner text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stakeholders TO authenticated;
GRANT ALL ON public.stakeholders TO service_role;
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;
CREATE POLICY stakeholders_member_select ON public.stakeholders FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY stakeholders_editor_insert ON public.stakeholders FOR INSERT TO authenticated
  WITH CHECK (is_org_plan_contributor(organization_id, auth.uid()));
CREATE POLICY stakeholders_editor_update ON public.stakeholders FOR UPDATE TO authenticated
  USING (is_org_plan_contributor(organization_id, auth.uid()))
  WITH CHECK (is_org_plan_contributor(organization_id, auth.uid()));
CREATE POLICY stakeholders_editor_delete ON public.stakeholders FOR DELETE TO authenticated
  USING (is_org_plan_contributor(organization_id, auth.uid()));
CREATE INDEX idx_stakeholders_org ON public.stakeholders(organization_id);
CREATE TRIGGER trg_stakeholders_updated BEFORE UPDATE ON public.stakeholders
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ----------------------------------------------------------------------------
-- Reserves: current cash-on-hand isn't tracked anywhere in the existing
-- financial model (revenue_streams/expense_lines are budget planning, not a
-- balance). Add one field to the existing per-plan financial_assumptions
-- singleton rather than a whole new table — reserve_target_months already
-- lives there.
-- ----------------------------------------------------------------------------
ALTER TABLE public.financial_assumptions
  ADD COLUMN current_reserve_balance numeric NOT NULL DEFAULT 0;

-- ----------------------------------------------------------------------------
-- Budget scenarios — named "what if" shocks against the real budget.
-- Finance data, general editor access (is_org_editor).
-- ----------------------------------------------------------------------------
CREATE TABLE public.budget_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.strategic_plans(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  shock_type text NOT NULL CHECK (shock_type IN ('lose_largest_grant','revenue_decline_pct','revenue_growth_pct','expense_increase_pct')),
  shock_value numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_scenarios TO authenticated;
GRANT ALL ON public.budget_scenarios TO service_role;
ALTER TABLE public.budget_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY scenarios_member_select ON public.budget_scenarios FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY scenarios_editor_insert ON public.budget_scenarios FOR INSERT TO authenticated
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY scenarios_editor_update ON public.budget_scenarios FOR UPDATE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()))
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY scenarios_editor_delete ON public.budget_scenarios FOR DELETE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()));
CREATE INDEX idx_scenarios_plan ON public.budget_scenarios(plan_id);
CREATE TRIGGER trg_scenarios_updated BEFORE UPDATE ON public.budget_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ----------------------------------------------------------------------------
-- Asks Bank — funding requests, general editor access (is_org_editor)
-- ----------------------------------------------------------------------------
CREATE TABLE public.asks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pillar_id uuid REFERENCES public.strategic_pillars(id) ON DELETE SET NULL,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'Program' CHECK (type IN ('Program','Capital','Capacity','Operating')),
  amount numeric NOT NULL DEFAULT 0,
  secured_amount numeric NOT NULL DEFAULT 0,
  audience text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in-discussion','committed','declined')),
  donor_language text,
  grant_language text,
  board_language text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asks TO authenticated;
GRANT ALL ON public.asks TO service_role;
ALTER TABLE public.asks ENABLE ROW LEVEL SECURITY;
CREATE POLICY asks_member_select ON public.asks FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY asks_editor_insert ON public.asks FOR INSERT TO authenticated
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY asks_editor_update ON public.asks FOR UPDATE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()))
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY asks_editor_delete ON public.asks FOR DELETE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()));
CREATE INDEX idx_asks_org ON public.asks(organization_id);
CREATE TRIGGER trg_asks_updated BEFORE UPDATE ON public.asks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ----------------------------------------------------------------------------
-- Impact stories — beneficiary stories library, general editor access
-- ----------------------------------------------------------------------------
CREATE TABLE public.impact_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  age text,
  program text,
  quote text,
  outcome text,
  consent text NOT NULL DEFAULT 'anonymous' CHECK (consent IN ('full','first-name-only','anonymous')),
  captured_on date,
  tags text[] NOT NULL DEFAULT '{}',
  uses text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.impact_stories TO authenticated;
GRANT ALL ON public.impact_stories TO service_role;
ALTER TABLE public.impact_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY stories_member_select ON public.impact_stories FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY stories_editor_insert ON public.impact_stories FOR INSERT TO authenticated
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY stories_editor_update ON public.impact_stories FOR UPDATE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()))
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY stories_editor_delete ON public.impact_stories FOR DELETE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()));
CREATE INDEX idx_stories_org ON public.impact_stories(organization_id);
CREATE TRIGGER trg_stories_updated BEFORE UPDATE ON public.impact_stories
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ----------------------------------------------------------------------------
-- Donor segments — SIMPLIFIED as manually-entered aggregate rollups per
-- segment (count/total/avg/retention), NOT an individual-donor CRM. A real
-- donor/donation data model (individual gift records, PII, CRM sync) is a
-- bigger product decision the FR doc doesn't specify — flagged for your
-- boss rather than guessed at. This gets the page off static mock data
-- without prejudging that decision.
-- ----------------------------------------------------------------------------
CREATE TABLE public.donor_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label text NOT NULL,
  donor_count int NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  retention_pct numeric CHECK (retention_pct IS NULL OR (retention_pct BETWEEN 0 AND 1)),
  yoy_change_pct numeric,
  color text DEFAULT '#0f172a',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donor_segments TO authenticated;
GRANT ALL ON public.donor_segments TO service_role;
ALTER TABLE public.donor_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY donor_segments_member_select ON public.donor_segments FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY donor_segments_editor_insert ON public.donor_segments FOR INSERT TO authenticated
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY donor_segments_editor_update ON public.donor_segments FOR UPDATE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()))
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY donor_segments_editor_delete ON public.donor_segments FOR DELETE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()));
CREATE INDEX idx_donor_segments_org ON public.donor_segments(organization_id);
CREATE TRIGGER trg_donor_segments_updated BEFORE UPDATE ON public.donor_segments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
