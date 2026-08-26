
CREATE TABLE public.grant_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  variant TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, question_id, variant)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grant_responses TO authenticated;
GRANT ALL ON public.grant_responses TO service_role;

ALTER TABLE public.grant_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view grant responses"
  ON public.grant_responses FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org editors can insert grant responses"
  ON public.grant_responses FOR INSERT TO authenticated
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));

CREATE POLICY "Org editors can update grant responses"
  ON public.grant_responses FOR UPDATE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()))
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));

CREATE POLICY "Org editors can delete grant responses"
  ON public.grant_responses FOR DELETE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()));

CREATE TRIGGER grant_responses_set_updated_at
  BEFORE UPDATE ON public.grant_responses
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX grant_responses_org_idx ON public.grant_responses(organization_id);
