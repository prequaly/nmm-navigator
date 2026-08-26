-- Polymorphic comments table for pillars, KPIs, and risks (extensible to more entities)
CREATE TYPE public.comment_entity_type AS ENUM ('pillar', 'kpi', 'risk');

CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type public.comment_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX comments_entity_idx ON public.comments (organization_id, entity_type, entity_id, created_at DESC);
CREATE INDEX comments_author_idx ON public.comments (author_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Any org member can read comments scoped to their org
CREATE POLICY "Org members can read comments"
  ON public.comments FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));

-- Any org member can post a comment as themselves
CREATE POLICY "Org members can post comments"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id, auth.uid())
    AND author_id = auth.uid()
  );

-- Authors can edit their own comments
CREATE POLICY "Authors can update own comments"
  ON public.comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Authors can delete own comments; editors/admins/owners can delete any
CREATE POLICY "Author or org editor can delete comments"
  ON public.comments FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR public.is_org_editor(organization_id, auth.uid())
  );

CREATE TRIGGER comments_set_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();