CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.plan_narratives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  ai_drafted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, section_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_narratives TO authenticated;
GRANT ALL ON public.plan_narratives TO service_role;

ALTER TABLE public.plan_narratives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view plan narratives"
  ON public.plan_narratives FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = plan_narratives.organization_id AND m.user_id = auth.uid()));

CREATE POLICY "Members can insert plan narratives"
  ON public.plan_narratives FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = plan_narratives.organization_id AND m.user_id = auth.uid()));

CREATE POLICY "Members can update plan narratives"
  ON public.plan_narratives FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = plan_narratives.organization_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = plan_narratives.organization_id AND m.user_id = auth.uid()));

CREATE POLICY "Members can delete plan narratives"
  ON public.plan_narratives FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = plan_narratives.organization_id AND m.user_id = auth.uid()));

CREATE TRIGGER plan_narratives_set_updated_at
  BEFORE UPDATE ON public.plan_narratives
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();