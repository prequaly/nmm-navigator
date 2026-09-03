-- =====================================================================
-- STRATEGIC PLAN FOUNDATION
-- =====================================================================

-- Helper: org editor (owner / admin / staff) — the general operational-write
-- check used by most tables (finance, execution, exports). Board Member and
-- Consultant are deliberately excluded here per the FR's "limited access" /
-- "explicitly authorized, scoped access" descriptions (Section 4) — Consultant
-- gets broader write access specifically on plan-content tables instead, via
-- is_org_plan_contributor() below.
CREATE OR REPLACE FUNCTION public.is_org_editor(_org uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org
      AND user_id = _user
      AND role IN ('owner','admin','staff')
  );
$$;

-- Helper: org plan contributor (owner / admin / staff / consultant) — consultants
-- supporting a nonprofit client (FR Section 3, and the CSG Done-With-You/
-- Done-For-You integration in Section 38) need write access to strategic plan
-- content specifically, without being handed general org-editor rights over
-- finance or execution data. Used by strategic_plans, assessment_responses,
-- theory_of_change, strategic_pillars, okrs, roadmap_items, risks, and kpis.
CREATE OR REPLACE FUNCTION public.is_org_plan_contributor(_org uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org
      AND user_id = _user
      AND role IN ('owner','admin','staff','consultant')
  );
$$;

-- =====================================================================
-- 1. STRATEGIC PLANS (root entity)
-- =====================================================================
CREATE TABLE public.strategic_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  fiscal_year_start int NOT NULL DEFAULT EXTRACT(YEAR FROM now())::int,
  planning_horizon_years int NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  executive_summary text,
  mission_alignment text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategic_plans TO authenticated;
GRANT ALL ON public.strategic_plans TO service_role;
ALTER TABLE public.strategic_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY plans_member_select ON public.strategic_plans FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY plans_editor_insert ON public.strategic_plans FOR INSERT TO authenticated
  WITH CHECK (is_org_plan_contributor(organization_id, auth.uid()));
CREATE POLICY plans_editor_update ON public.strategic_plans FOR UPDATE TO authenticated
  USING (is_org_plan_contributor(organization_id, auth.uid()))
  WITH CHECK (is_org_plan_contributor(organization_id, auth.uid()));
CREATE POLICY plans_editor_delete ON public.strategic_plans FOR DELETE TO authenticated
  USING (is_org_plan_contributor(organization_id, auth.uid()));
CREATE TRIGGER trg_strategic_plans_updated BEFORE UPDATE ON public.strategic_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_strategic_plans_org ON public.strategic_plans(organization_id);

-- =====================================================================
-- 2. ASSESSMENT RESPONSES
-- =====================================================================
CREATE TABLE public.assessment_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.strategic_plans(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assessment_type text NOT NULL,
  -- Tri-state answer shape (FR Sections 9, 12): each key is a question id, each
  -- value is { status: 'historical' | 'projected' | 'na', value: number | null }.
  -- Not enforced by a DB constraint (kept flexible at the jsonb/application
  -- layer, matching how every other assessment field works) — see
  -- src/lib/assessments/scoring.ts for the reader that excludes 'na' answers
  -- from scoring so "Not Yet Applicable" never counts as a zero.
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  score numeric,
  maturity_level text,
  notes text,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, assessment_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_responses TO authenticated;
GRANT ALL ON public.assessment_responses TO service_role;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY assess_member_select ON public.assessment_responses FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY assess_editor_insert ON public.assessment_responses FOR INSERT TO authenticated
  WITH CHECK (is_org_plan_contributor(organization_id, auth.uid()));
CREATE POLICY assess_editor_update ON public.assessment_responses FOR UPDATE TO authenticated
  USING (is_org_plan_contributor(organization_id, auth.uid()))
  WITH CHECK (is_org_plan_contributor(organization_id, auth.uid()));
CREATE POLICY assess_editor_delete ON public.assessment_responses FOR DELETE TO authenticated
  USING (is_org_plan_contributor(organization_id, auth.uid()));
CREATE TRIGGER trg_assessment_responses_updated BEFORE UPDATE ON public.assessment_responses
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_assess_plan ON public.assessment_responses(plan_id);

-- =====================================================================
-- 3. THEORY OF CHANGE
-- =====================================================================
CREATE TABLE public.theory_of_change (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.strategic_plans(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  problem_statement text,
  inputs jsonb NOT NULL DEFAULT '[]'::jsonb,
  activities jsonb NOT NULL DEFAULT '[]'::jsonb,
  outputs jsonb NOT NULL DEFAULT '[]'::jsonb,
  outcomes jsonb NOT NULL DEFAULT '[]'::jsonb,
  impact text,
  assumptions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.theory_of_change TO authenticated;
GRANT ALL ON public.theory_of_change TO service_role;
ALTER TABLE public.theory_of_change ENABLE ROW LEVEL SECURITY;
CREATE POLICY toc_member_select ON public.theory_of_change FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY toc_editor_insert ON public.theory_of_change FOR INSERT TO authenticated
  WITH CHECK (is_org_plan_contributor(organization_id, auth.uid()));
CREATE POLICY toc_editor_update ON public.theory_of_change FOR UPDATE TO authenticated
  USING (is_org_plan_contributor(organization_id, auth.uid()))
  WITH CHECK (is_org_plan_contributor(organization_id, auth.uid()));
CREATE POLICY toc_editor_delete ON public.theory_of_change FOR DELETE TO authenticated
  USING (is_org_plan_contributor(organization_id, auth.uid()));
CREATE TRIGGER trg_toc_updated BEFORE UPDATE ON public.theory_of_change
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================================
-- 4. STRATEGIC PILLARS
-- =====================================================================
CREATE TABLE public.strategic_pillars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.strategic_plans(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  owner text,
  color text DEFAULT '#3B82F6',
  sort_order int NOT NULL DEFAULT 0,
  -- IMPACT/4Rs framework alignment + prioritization fields (FR Section 14) —
  -- lets a priority declare which IMPACT lenses / 4Rs dimensions it advances,
  -- so both frameworks stay woven through planning rather than living only in
  -- their standalone assessments.
  impact_lenses text[] NOT NULL DEFAULT '{}',
  fourrs_dimensions text[] NOT NULL DEFAULT '{}',
  priority_level text CHECK (priority_level IN ('high','medium','low')),
  timeline_start date,
  timeline_end date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategic_pillars TO authenticated;
GRANT ALL ON public.strategic_pillars TO service_role;
ALTER TABLE public.strategic_pillars ENABLE ROW LEVEL SECURITY;
CREATE POLICY pillars_member_select ON public.strategic_pillars FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY pillars_editor_insert ON public.strategic_pillars FOR INSERT TO authenticated
  WITH CHECK (is_org_plan_contributor(organization_id, auth.uid()));
CREATE POLICY pillars_editor_update ON public.strategic_pillars FOR UPDATE TO authenticated
  USING (is_org_plan_contributor(organization_id, auth.uid()))
  WITH CHECK (is_org_plan_contributor(organization_id, auth.uid()));
CREATE POLICY pillars_editor_delete ON public.strategic_pillars FOR DELETE TO authenticated
  USING (is_org_plan_contributor(organization_id, auth.uid()));
CREATE TRIGGER trg_pillars_updated BEFORE UPDATE ON public.strategic_pillars
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_pillars_plan ON public.strategic_pillars(plan_id);

-- =====================================================================
-- 5. OKRs
-- =====================================================================
CREATE TABLE public.okrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.strategic_plans(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pillar_id uuid REFERENCES public.strategic_pillars(id) ON DELETE SET NULL,
  objective text NOT NULL,
  key_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  owner text,
  quarter text,
  status text NOT NULL DEFAULT 'on_track' CHECK (status IN ('on_track','at_risk','off_track','complete')),
  progress numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.okrs TO authenticated;
GRANT ALL ON public.okrs TO service_role;
ALTER TABLE public.okrs ENABLE ROW LEVEL SECURITY;
CREATE POLICY okrs_member_select ON public.okrs FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY okrs_editor_insert ON public.okrs FOR INSERT TO authenticated
  WITH CHECK (is_org_plan_contributor(organization_id, auth.uid()));
CREATE POLICY okrs_editor_update ON public.okrs FOR UPDATE TO authenticated
  USING (is_org_plan_contributor(organization_id, auth.uid()))
  WITH CHECK (is_org_plan_contributor(organization_id, auth.uid()));
CREATE POLICY okrs_editor_delete ON public.okrs FOR DELETE TO authenticated
  USING (is_org_plan_contributor(organization_id, auth.uid()));
CREATE TRIGGER trg_okrs_updated BEFORE UPDATE ON public.okrs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_okrs_plan ON public.okrs(plan_id);

-- =====================================================================
-- 6. ROADMAP ITEMS (Gantt)
-- =====================================================================
CREATE TABLE public.roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.strategic_plans(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pillar_id uuid REFERENCES public.strategic_pillars(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  owner text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','blocked','done')),
  progress numeric NOT NULL DEFAULT 0,
  dependencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmap_items TO authenticated;
GRANT ALL ON public.roadmap_items TO service_role;
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY roadmap_member_select ON public.roadmap_items FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY roadmap_editor_insert ON public.roadmap_items FOR INSERT TO authenticated
  WITH CHECK (is_org_plan_contributor(organization_id, auth.uid()));
CREATE POLICY roadmap_editor_update ON public.roadmap_items FOR UPDATE TO authenticated
  USING (is_org_plan_contributor(organization_id, auth.uid()))
  WITH CHECK (is_org_plan_contributor(organization_id, auth.uid()));
CREATE POLICY roadmap_editor_delete ON public.roadmap_items FOR DELETE TO authenticated
  USING (is_org_plan_contributor(organization_id, auth.uid()));
CREATE TRIGGER trg_roadmap_updated BEFORE UPDATE ON public.roadmap_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_roadmap_plan ON public.roadmap_items(plan_id);

-- =====================================================================
-- 7. FINANCIAL ASSUMPTIONS
-- =====================================================================
CREATE TABLE public.financial_assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.strategic_plans(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  base_year int NOT NULL,
  inflation_rate numeric NOT NULL DEFAULT 0.03,
  revenue_growth_rate numeric NOT NULL DEFAULT 0.05,
  fte_loaded_cost numeric NOT NULL DEFAULT 75000,
  reserve_target_months numeric NOT NULL DEFAULT 6,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_assumptions TO authenticated;
GRANT ALL ON public.financial_assumptions TO service_role;
ALTER TABLE public.financial_assumptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_assump_member_select ON public.financial_assumptions FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY fin_assump_editor_insert ON public.financial_assumptions FOR INSERT TO authenticated
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY fin_assump_editor_update ON public.financial_assumptions FOR UPDATE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()))
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY fin_assump_editor_delete ON public.financial_assumptions FOR DELETE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()));
CREATE TRIGGER trg_fin_assump_updated BEFORE UPDATE ON public.financial_assumptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================================
-- 8. REVENUE STREAMS
-- =====================================================================
CREATE TABLE public.revenue_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.strategic_plans(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  yearly_amounts jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence text DEFAULT 'medium' CHECK (confidence IN ('low','medium','high','committed')),
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenue_streams TO authenticated;
GRANT ALL ON public.revenue_streams TO service_role;
ALTER TABLE public.revenue_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY rev_member_select ON public.revenue_streams FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY rev_editor_insert ON public.revenue_streams FOR INSERT TO authenticated
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY rev_editor_update ON public.revenue_streams FOR UPDATE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()))
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY rev_editor_delete ON public.revenue_streams FOR DELETE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()));
CREATE TRIGGER trg_revenue_updated BEFORE UPDATE ON public.revenue_streams
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_revenue_plan ON public.revenue_streams(plan_id);

-- =====================================================================
-- 9. EXPENSE LINES
-- =====================================================================
CREATE TABLE public.expense_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.strategic_plans(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('program','admin','fundraising')),
  program_name text,
  yearly_amounts jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_lines TO authenticated;
GRANT ALL ON public.expense_lines TO service_role;
ALTER TABLE public.expense_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY exp_member_select ON public.expense_lines FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY exp_editor_insert ON public.expense_lines FOR INSERT TO authenticated
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY exp_editor_update ON public.expense_lines FOR UPDATE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()))
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY exp_editor_delete ON public.expense_lines FOR DELETE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()));
CREATE TRIGGER trg_expense_updated BEFORE UPDATE ON public.expense_lines
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_expense_plan ON public.expense_lines(plan_id);

-- =====================================================================
-- 10. RISKS
-- =====================================================================
CREATE TABLE public.risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.strategic_plans(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  likelihood int NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
  impact int NOT NULL CHECK (impact BETWEEN 1 AND 5),
  mitigation text,
  owner text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','monitoring','mitigated','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risks TO authenticated;
GRANT ALL ON public.risks TO service_role;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY risks_member_select ON public.risks FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY risks_editor_insert ON public.risks FOR INSERT TO authenticated
  WITH CHECK (is_org_plan_contributor(organization_id, auth.uid()));
CREATE POLICY risks_editor_update ON public.risks FOR UPDATE TO authenticated
  USING (is_org_plan_contributor(organization_id, auth.uid()))
  WITH CHECK (is_org_plan_contributor(organization_id, auth.uid()));
CREATE POLICY risks_editor_delete ON public.risks FOR DELETE TO authenticated
  USING (is_org_plan_contributor(organization_id, auth.uid()));
CREATE TRIGGER trg_risks_updated BEFORE UPDATE ON public.risks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_risks_plan ON public.risks(plan_id);

-- =====================================================================
-- 11. KPIs
-- =====================================================================
CREATE TABLE public.kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.strategic_plans(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pillar_id uuid REFERENCES public.strategic_pillars(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text,
  unit text,
  baseline numeric,
  target numeric,
  current_value numeric,
  target_year int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpis TO authenticated;
GRANT ALL ON public.kpis TO service_role;
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY kpis_member_select ON public.kpis FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY kpis_editor_insert ON public.kpis FOR INSERT TO authenticated
  WITH CHECK (is_org_plan_contributor(organization_id, auth.uid()));
CREATE POLICY kpis_editor_update ON public.kpis FOR UPDATE TO authenticated
  USING (is_org_plan_contributor(organization_id, auth.uid()))
  WITH CHECK (is_org_plan_contributor(organization_id, auth.uid()));
CREATE POLICY kpis_editor_delete ON public.kpis FOR DELETE TO authenticated
  USING (is_org_plan_contributor(organization_id, auth.uid()));
CREATE TRIGGER trg_kpis_updated BEFORE UPDATE ON public.kpis
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_kpis_plan ON public.kpis(plan_id);

-- =====================================================================
-- 12. PLAN EXPORTS (history of generated docs)
-- =====================================================================
CREATE TABLE public.plan_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.strategic_plans(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  format text NOT NULL CHECK (format IN ('pdf','docx','xlsx_proforma','xlsx_gantt','share_link')),
  file_url text,
  share_token text UNIQUE,
  generated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_exports TO authenticated;
GRANT ALL ON public.plan_exports TO service_role;
ALTER TABLE public.plan_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY exports_member_select ON public.plan_exports FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY exports_editor_insert ON public.plan_exports FOR INSERT TO authenticated
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY exports_editor_delete ON public.plan_exports FOR DELETE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()));
CREATE INDEX idx_exports_plan ON public.plan_exports(plan_id);