
CREATE TABLE public.coffee_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_name text NOT NULL,
  contact_type text NOT NULL DEFAULT 'other',
  contact_org text,
  chat_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  next_step text,
  follow_up_date date,
  outcome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coffee_chats TO authenticated;
GRANT ALL ON public.coffee_chats TO service_role;

ALTER TABLE public.coffee_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view coffee chats" ON public.coffee_chats
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Editors insert coffee chats" ON public.coffee_chats
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));

CREATE POLICY "Editors update coffee chats" ON public.coffee_chats
  FOR UPDATE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()))
  WITH CHECK (public.is_org_editor(organization_id, auth.uid()));

CREATE POLICY "Editors delete coffee chats" ON public.coffee_chats
  FOR DELETE TO authenticated
  USING (public.is_org_editor(organization_id, auth.uid()));

CREATE TRIGGER coffee_chats_set_updated_at
  BEFORE UPDATE ON public.coffee_chats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX coffee_chats_org_date_idx ON public.coffee_chats (organization_id, chat_date DESC);
