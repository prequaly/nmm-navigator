-- Platform-level role enum
CREATE TYPE public.platform_role AS ENUM ('super_admin');

-- Platform user roles table (separate from per-org roles)
CREATE TABLE public.platform_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.platform_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.platform_user_roles TO authenticated;
GRANT ALL ON public.platform_user_roles TO service_role;

ALTER TABLE public.platform_user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer to avoid recursion
CREATE OR REPLACE FUNCTION public.has_platform_role(_user_id uuid, _role public.platform_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_platform_role(auth.uid(), 'super_admin')
$$;

-- Policies on platform_user_roles: only super_admins manage; users can see their own row
CREATE POLICY "Users can view own platform role"
  ON public.platform_user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY "Super admins manage platform roles"
  ON public.platform_user_roles FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Extend visibility for platform admins on key tables (additive policies)
CREATE POLICY "Platform admins read all organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins read all org members"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins read all strategic plans"
  ON public.strategic_plans FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins read all grants"
  ON public.grants FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins read all kpis"
  ON public.kpis FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins read all plan narratives"
  ON public.plan_narratives FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());