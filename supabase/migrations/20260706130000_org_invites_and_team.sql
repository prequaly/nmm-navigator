-- ============================================================================
-- TEAM INVITES: secure multi-user membership for organizations
-- ============================================================================
-- Adds a link-based invite flow. Owners/admins create an invite (email +
-- role); the invitee signs in and accepts via a SECURITY DEFINER RPC that
-- validates the token, expiry, and email match before inserting the
-- membership row server-side. Invites can never grant the 'owner' role.
--
-- Also adds co-member profile visibility so the Team page can show
-- teammates' names (profiles previously had self-select only).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Invite status enum + table
-- ---------------------------------------------------------------------------
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');

CREATE TABLE public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'viewer',
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status public.invite_status NOT NULL DEFAULT 'pending',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Ownership is never grantable by invite; it belongs to the org creator
  -- (see ensure_organization_creator_owner) or explicit owner action.
  CONSTRAINT invites_role_not_owner CHECK (role <> 'owner'),
  CONSTRAINT invites_email_lowercase CHECK (email = lower(email))
);

CREATE INDEX idx_org_invites_org ON public.organization_invites(organization_id);
-- One live invite per email per org.
CREATE UNIQUE INDEX idx_org_invites_unique_pending
  ON public.organization_invites(organization_id, email)
  WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invites TO authenticated;
GRANT ALL ON public.organization_invites TO service_role;

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Only owners/admins of the org can see or manage its invites. Invitees
-- never read this table directly — they go through accept_org_invite().
CREATE POLICY "invites_admin_select" ON public.organization_invites
FOR SELECT TO authenticated
USING (
  public.has_org_role(organization_id, auth.uid(), 'owner')
  OR public.has_org_role(organization_id, auth.uid(), 'admin')
);

CREATE POLICY "invites_admin_insert" ON public.organization_invites
FOR INSERT TO authenticated
WITH CHECK (
  (
    public.has_org_role(organization_id, auth.uid(), 'owner')
    OR public.has_org_role(organization_id, auth.uid(), 'admin')
  )
  AND invited_by = auth.uid()
  AND status = 'pending'
);

CREATE POLICY "invites_admin_update" ON public.organization_invites
FOR UPDATE TO authenticated
USING (
  public.has_org_role(organization_id, auth.uid(), 'owner')
  OR public.has_org_role(organization_id, auth.uid(), 'admin')
)
WITH CHECK (
  public.has_org_role(organization_id, auth.uid(), 'owner')
  OR public.has_org_role(organization_id, auth.uid(), 'admin')
);

CREATE POLICY "invites_admin_delete" ON public.organization_invites
FOR DELETE TO authenticated
USING (
  public.has_org_role(organization_id, auth.uid(), 'owner')
  OR public.has_org_role(organization_id, auth.uid(), 'admin')
);

-- ---------------------------------------------------------------------------
-- 2) Acceptance RPC — the ONLY path that turns an invite into a membership.
--    SECURITY DEFINER so it can validate against auth.users and insert the
--    membership row despite the (intentionally) locked-down RLS on
--    organization_members.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_org_invite(_token uuid)
RETURNS TABLE (org_id uuid, org_name text, member_role public.app_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.organization_invites%ROWTYPE;
  v_email text;
  v_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to accept an invite';
  END IF;

  SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = auth.uid();

  SELECT * INTO v_invite
  FROM public.organization_invites i
  WHERE i.token = _token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This invite link is not valid';
  END IF;
  IF v_invite.status = 'revoked' THEN
    RAISE EXCEPTION 'This invite has been revoked';
  END IF;
  IF v_invite.status = 'accepted' THEN
    RAISE EXCEPTION 'This invite has already been used';
  END IF;
  IF v_invite.status = 'expired' OR v_invite.expires_at < now() THEN
    UPDATE public.organization_invites
    SET status = 'expired'
    WHERE id = v_invite.id AND status = 'pending';
    RAISE EXCEPTION 'This invite has expired — ask your administrator for a new one';
  END IF;
  IF v_email IS DISTINCT FROM v_invite.email THEN
    RAISE EXCEPTION 'This invite was issued to a different email address (%). You are signed in as %.',
      v_invite.email, v_email;
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_invite.organization_id, auth.uid(), v_invite.role)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  UPDATE public.organization_invites
  SET status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  WHERE id = v_invite.id;

  SELECT o.name INTO v_name FROM public.organizations o WHERE o.id = v_invite.organization_id;

  RETURN QUERY SELECT v_invite.organization_id, v_name, v_invite.role;
END
$$;

REVOKE EXECUTE ON FUNCTION public.accept_org_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_org_invite(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Co-member profile visibility: members of the same organization can see
--    each other's profile (name/avatar) so the Team page is human-readable.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.shares_org_with(_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members a
    JOIN public.organization_members b ON a.organization_id = b.organization_id
    WHERE a.user_id = auth.uid() AND b.user_id = _user
  );
$$;

REVOKE EXECUTE ON FUNCTION public.shares_org_with(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shares_org_with(uuid) TO authenticated, service_role;

CREATE POLICY "profiles_co_member_select" ON public.profiles
FOR SELECT TO authenticated
USING (public.shares_org_with(id));
