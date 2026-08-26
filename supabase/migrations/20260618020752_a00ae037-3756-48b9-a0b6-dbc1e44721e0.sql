REVOKE EXECUTE ON FUNCTION public.is_org_editor(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_editor(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_editor(uuid, uuid) TO service_role;