
-- Enums
DO $$ BEGIN
  CREATE TYPE public.grant_status AS ENUM ('prospect','applied','pending','awarded','declined','active','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.grant_type AS ENUM ('general_operating','program','capital','capacity_building','multi_year','in_kind','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.grant_restriction AS ENUM ('unrestricted','temporarily_restricted','permanently_restricted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('scheduled','invoiced','received','late','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.projection_period AS ENUM ('monthly','quarterly','annual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.projection_source AS ENUM ('grant','revenue_stream','expense_line','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- GRANTS
CREATE TABLE public.grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.strategic_plans(id) ON DELETE SET NULL,
  funder_name TEXT NOT NULL,
  grant_name TEXT NOT NULL,
  grant_type public.grant_type NOT NULL DEFAULT 'program',
  status public.grant_status NOT NULL DEFAULT 'prospect',
  restriction public.grant_restriction NOT NULL DEFAULT 'temporarily_restricted',
  program_area TEXT,
  amount_requested NUMERIC(14,2),
  amount_awarded NUMERIC(14,2),
  probability INTEGER NOT NULL DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  start_date DATE,
  end_date DATE,
  fiscal_year_start DATE,
  application_deadline DATE,
  decision_date DATE,
  contact_name TEXT,
  contact_email TEXT,
  reporting_requirements TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grants TO authenticated;
GRANT ALL ON public.grants TO service_role;
ALTER TABLE public.grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view grants" ON public.grants FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "Editors insert grants" ON public.grants FOR INSERT TO authenticated
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "Editors update grants" ON public.grants FOR UPDATE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()))
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "Editors delete grants" ON public.grants FOR DELETE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()));

CREATE TRIGGER trg_grants_updated BEFORE UPDATE ON public.grants
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_grants_org ON public.grants(organization_id);
CREATE INDEX idx_grants_plan ON public.grants(plan_id);
CREATE INDEX idx_grants_dates ON public.grants(start_date, end_date);

-- GRANT PAYMENTS
CREATE TABLE public.grant_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  grant_id UUID NOT NULL REFERENCES public.grants(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'scheduled',
  received_date DATE,
  received_amount NUMERIC(14,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grant_payments TO authenticated;
GRANT ALL ON public.grant_payments TO service_role;
ALTER TABLE public.grant_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view grant payments" ON public.grant_payments FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "Editors insert grant payments" ON public.grant_payments FOR INSERT TO authenticated
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "Editors update grant payments" ON public.grant_payments FOR UPDATE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()))
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "Editors delete grant payments" ON public.grant_payments FOR DELETE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()));

CREATE TRIGGER trg_grant_payments_updated BEFORE UPDATE ON public.grant_payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_grant_payments_grant ON public.grant_payments(grant_id);
CREATE INDEX idx_grant_payments_org ON public.grant_payments(organization_id);

-- BUDGET PROJECTIONS (derived per-period rows for pro-forma)
CREATE TABLE public.budget_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.strategic_plans(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type public.projection_period NOT NULL DEFAULT 'monthly',
  category TEXT NOT NULL,
  projected_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  source public.projection_source NOT NULL DEFAULT 'manual',
  source_id UUID,
  probability_weighted BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_projections TO authenticated;
GRANT ALL ON public.budget_projections TO service_role;
ALTER TABLE public.budget_projections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view projections" ON public.budget_projections FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "Editors insert projections" ON public.budget_projections FOR INSERT TO authenticated
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "Editors update projections" ON public.budget_projections FOR UPDATE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()))
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "Editors delete projections" ON public.budget_projections FOR DELETE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()));

CREATE TRIGGER trg_budget_projections_updated BEFORE UPDATE ON public.budget_projections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_projections_plan_period ON public.budget_projections(plan_id, period_start);
CREATE INDEX idx_projections_org ON public.budget_projections(organization_id);
