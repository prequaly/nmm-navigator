DROP POLICY IF EXISTS orgs_member_select ON public.organizations;

CREATE POLICY orgs_member_select
ON public.organizations
FOR SELECT
TO authenticated
USING (
  public.is_org_member(id, auth.uid())
  OR created_by = auth.uid()
);