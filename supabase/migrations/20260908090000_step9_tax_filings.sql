-- ============================================================================
-- STEP 9: Tax filings — the financial spine for "Fund My Strategy"
-- ============================================================================
-- Organizations bring their prior-year numbers in one of two ways: upload a
-- tax form (990 / 990-EZ / 1099) and let AI read the revenue lines, or type
-- the categories in by hand. Either way the result lands here, in one row per
-- filing year, so every downstream module (Revenue Diversity / HHI, Scenario
-- Modeling, Program Cost Allocation, Budget Planner) reads the same numbers
-- instead of asking for them again.
--
-- Deliberately NOT storing the uploaded PDF. Tax filings are sensitive and the
-- only thing the product needs is the extracted figures, so the file is parsed
-- in-memory and discarded — no storage bucket, no retention question. We keep
-- the original filename purely so the user can see what a row came from.
-- ============================================================================

CREATE TABLE public.tax_filings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Which document these numbers came from, and for which year.
  form_type text NOT NULL DEFAULT '990'
    CHECK (form_type IN ('990','990-EZ','990-N','1099','other')),
  tax_year int NOT NULL,
  fiscal_year_end date,

  -- 'upload' = AI-extracted from a PDF, 'manual' = typed in by the user.
  source text NOT NULL DEFAULT 'upload' CHECK (source IN ('upload','manual')),
  source_filename text,

  -- Header fields as they appear on the form (may differ from the org profile,
  -- so we keep them rather than silently overwriting the profile).
  filed_organization_name text,
  filed_ein text,

  total_revenue numeric NOT NULL DEFAULT 0,
  -- Normalized Part VIII revenue lines. Same shape as Extracted990's
  -- revenue_lines so the extractor output round-trips without a mapping layer.
  revenue_lines jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Schedule B contributors when the form exposes them.
  top_contributors jsonb NOT NULL DEFAULT '[]'::jsonb,

  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- One filing per form type per year keeps re-uploads idempotent.
  UNIQUE (organization_id, form_type, tax_year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_filings TO authenticated;
GRANT ALL ON public.tax_filings TO service_role;
ALTER TABLE public.tax_filings ENABLE ROW LEVEL SECURITY;

-- Financial data: any member can read, but only owner/admin/staff can write
-- (is_org_editor) — consistent with revenue_streams / expense_lines.
CREATE POLICY tax_filings_member_select ON public.tax_filings FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY tax_filings_editor_insert ON public.tax_filings FOR INSERT TO authenticated
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY tax_filings_editor_update ON public.tax_filings FOR UPDATE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()))
  WITH CHECK (is_org_editor(organization_id, auth.uid()));
CREATE POLICY tax_filings_editor_delete ON public.tax_filings FOR DELETE TO authenticated
  USING (is_org_editor(organization_id, auth.uid()));

CREATE INDEX idx_tax_filings_org_year ON public.tax_filings(organization_id, tax_year DESC);

CREATE TRIGGER trg_tax_filings_updated BEFORE UPDATE ON public.tax_filings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
