CREATE OR REPLACE FUNCTION public.ensure_organization_creator_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'owner')
    ON CONFLICT (organization_id, user_id) DO UPDATE
      SET role = CASE
        WHEN public.organization_members.role = 'owner' THEN public.organization_members.role
        ELSE EXCLUDED.role
      END;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_organization_creator_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_organization_creator_owner() TO service_role;

DROP TRIGGER IF EXISTS organizations_creator_owner ON public.organizations;
CREATE TRIGGER organizations_creator_owner
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.ensure_organization_creator_owner();

INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT o.id, o.created_by, 'owner'
FROM public.organizations o
WHERE o.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = o.id
      AND m.user_id = o.created_by
  )
ON CONFLICT (organization_id, user_id) DO NOTHING;