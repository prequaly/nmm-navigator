-- ============================================================================
-- SECURITY FIX: close cross-tenant membership vulnerability
-- ============================================================================
-- Problem 1 (critical): the "members_self_insert" policy allowed ANY
-- authenticated user to INSERT themselves into ANY organization — including
-- with role = 'owner' — if they knew or obtained the org's UUID (URLs,
-- exports, screenshots, shared reports all leak UUIDs). That grants full
-- read/write over the victim org's strategic plans, budgets, board data,
-- grants, and meeting minutes.
--
-- Creator-owner bootstrap is already handled server-side by the
-- SECURITY DEFINER trigger ensure_organization_creator_owner (migration
-- 20260618020904), so the client-side self-insert path is unnecessary.
--
-- Problem 2: "members_admin_update" had no WITH CHECK clause, so an admin
-- could UPDATE their own membership row to role = 'owner' (self-escalation).
--
-- Problem 3: "members_admin_delete" let an admin delete an owner's
-- membership row, locking the owner out of their own organization.
-- ============================================================================

-- 1) Remove the open self-insert policy.
DROP POLICY IF EXISTS "members_self_insert" ON public.organization_members;

-- Owners may add members with any role; admins may add non-owner members.
-- (Future invite-acceptance flows should run through a server function or a
-- dedicated invites table — not through a permissive client-side policy.)
CREATE POLICY "members_admin_insert" ON public.organization_members
FOR INSERT TO authenticated
WITH CHECK (
  public.has_org_role(organization_id, auth.uid(), 'owner')
  OR (
    public.has_org_role(organization_id, auth.uid(), 'admin')
    AND role <> 'owner'
  )
);

-- 2) Block role self-escalation: admins can manage members but can never
-- set anyone (including themselves) to 'owner'.
DROP POLICY IF EXISTS "members_admin_update" ON public.organization_members;
CREATE POLICY "members_admin_update" ON public.organization_members
FOR UPDATE TO authenticated
USING (
  public.has_org_role(organization_id, auth.uid(), 'owner')
  OR public.has_org_role(organization_id, auth.uid(), 'admin')
)
WITH CHECK (
  public.has_org_role(organization_id, auth.uid(), 'owner')
  OR (
    public.has_org_role(organization_id, auth.uid(), 'admin')
    AND role <> 'owner'
  )
);

-- 3) Admins may remove non-owner members; owners may remove anyone;
-- any member may remove themselves (leave the org).
DROP POLICY IF EXISTS "members_admin_delete" ON public.organization_members;
CREATE POLICY "members_admin_delete" ON public.organization_members
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_org_role(organization_id, auth.uid(), 'owner')
  OR (
    public.has_org_role(organization_id, auth.uid(), 'admin')
    AND role <> 'owner'
  )
);

-- ============================================================================
-- REMEDIATION AUDIT: list membership rows where the member is not the org
-- creator and was not added by an existing owner/admin flow. Run manually
-- and review — do NOT auto-delete, since legitimate teammates were also
-- added via the old policy.
--
--   SELECT m.organization_id, o.name, m.user_id, m.role, m.created_at
--   FROM public.organization_members m
--   JOIN public.organizations o ON o.id = m.organization_id
--   WHERE m.user_id <> o.created_by
--   ORDER BY m.created_at DESC;
-- ============================================================================
