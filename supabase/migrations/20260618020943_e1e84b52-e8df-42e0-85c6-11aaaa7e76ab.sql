REVOKE EXECUTE ON FUNCTION public.ensure_organization_creator_owner() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_organization_creator_owner() FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_organization_creator_owner() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_organization_creator_owner() TO service_role;