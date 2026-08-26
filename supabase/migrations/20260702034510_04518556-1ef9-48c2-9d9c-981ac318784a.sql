
CREATE TABLE public.board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'Member',
  term_start int,
  term_end int,
  committees text[] NOT NULL DEFAULT '{}',
  skills text[] NOT NULL DEFAULT '{}',
  race text,
  gender text,
  age_range text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_members TO authenticated;
GRANT ALL ON public.board_members TO service_role;
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view board members" ON public.board_members FOR SELECT TO authenticated USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "Editors can insert board members" ON public.board_members FOR INSERT TO authenticated WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "Editors can update board members" ON public.board_members FOR UPDATE TO authenticated USING (public.is_org_editor(organization_id, auth.uid())) WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "Editors can delete board members" ON public.board_members FOR DELETE TO authenticated USING (public.is_org_editor(organization_id, auth.uid()));
CREATE TRIGGER trg_board_members_updated_at BEFORE UPDATE ON public.board_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  holder text,
  tenure text,
  key_person_risk text NOT NULL DEFAULT 'medium' CHECK (key_person_risk IN ('high','medium','low')),
  backup text,
  documented boolean NOT NULL DEFAULT false,
  emergency_successor text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_roles TO authenticated;
GRANT ALL ON public.staff_roles TO service_role;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view staff roles" ON public.staff_roles FOR SELECT TO authenticated USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "Editors can insert staff roles" ON public.staff_roles FOR INSERT TO authenticated WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "Editors can update staff roles" ON public.staff_roles FOR UPDATE TO authenticated USING (public.is_org_editor(organization_id, auth.uid())) WITH CHECK (public.is_org_editor(organization_id, auth.uid()));
CREATE POLICY "Editors can delete staff roles" ON public.staff_roles FOR DELETE TO authenticated USING (public.is_org_editor(organization_id, auth.uid()));
CREATE TRIGGER trg_staff_roles_updated_at BEFORE UPDATE ON public.staff_roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
