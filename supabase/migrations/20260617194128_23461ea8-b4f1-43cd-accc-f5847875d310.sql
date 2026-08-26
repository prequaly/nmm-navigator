CREATE TABLE public.policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'governance',
  status TEXT NOT NULL DEFAULT 'draft',
  summary TEXT,
  content TEXT,
  owner TEXT,
  approved_by TEXT,
  approved_at DATE,
  next_review_date DATE,
  version TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.policies TO authenticated;
GRANT ALL ON public.policies TO service_role;

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view policies"
  ON public.policies FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org editors can insert policies"
  ON public.policies FOR INSERT TO authenticated
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));

CREATE POLICY "Org editors can update policies"
  ON public.policies FOR UPDATE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()))
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));

CREATE POLICY "Org editors can delete policies"
  ON public.policies FOR DELETE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()));

CREATE TRIGGER policies_set_updated_at
  BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_policies_org ON public.policies(organization_id);