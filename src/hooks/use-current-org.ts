import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export type OrgMembership = {
  organizationId: string;
  organizationName: string;
  role: AppRole;
};

type CurrentOrgState = {
  orgId: string | null;
  role: AppRole | null;
  orgs: OrgMembership[];
};

/**
 * Resolves (or bootstraps) the user's current organization.
 *
 * - Cached via TanStack Query so the lookup runs once across all routes.
 * - Membership creation happens server-side (SECURITY DEFINER trigger on
 *   organizations insert) — never from the client. The permissive
 *   self-insert RLS policy was removed as a security fix (migration
 *   20260706120000).
 * - Multi-org aware: users can belong to several organizations (e.g. after
 *   accepting a team invite). A localStorage preference decides which org
 *   is active; switchOrg() updates it and refreshes all org-scoped data.
 * - Race-guarded bootstrap: if a concurrent tab created the first org, we
 *   re-check membership instead of failing or duplicating.
 */

const PREF_KEY = "nmm.current_org_id";

function readPreferredOrgId(): string | null {
  try {
    return typeof window !== "undefined" ? localStorage.getItem(PREF_KEY) : null;
  } catch {
    return null;
  }
}

export function setPreferredOrgId(orgId: string) {
  try {
    localStorage.setItem(PREF_KEY, orgId);
  } catch {
    // localStorage unavailable (private mode etc.) — preference just won't persist
  }
}

async function listMemberships(userId: string): Promise<OrgMembership[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, role, created_at, organizations(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((m) => ({
    organizationId: m.organization_id,
    organizationName: m.organizations?.name ?? "Organization",
    role: m.role,
  }));
}

async function fetchCurrentOrgState(): Promise<CurrentOrgState> {
  const { data: u, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!u.user) return { orgId: null, role: null, orgs: [] };

  let orgs = await listMemberships(u.user.id);

  if (orgs.length === 0) {
    // Bootstrap a first organization so the user can explore features.
    const displayName =
      u.user.user_metadata?.full_name ||
      u.user.user_metadata?.name ||
      u.user.email?.split("@")[0] ||
      "My";

    const { error: createErr } = await supabase
      .from("organizations")
      .insert({ name: `${displayName}'s Organization`, created_by: u.user.id })
      .select("id")
      .single();

    // Membership (role: owner) is created by the server-side trigger.
    // On failure, a concurrent tab may have bootstrapped first — re-check
    // before treating it as a real error.
    orgs = await listMemberships(u.user.id);
    if (orgs.length === 0) {
      throw createErr ?? new Error("Failed to create organization");
    }
  }

  const preferred = readPreferredOrgId();
  const active = orgs.find((o) => o.organizationId === preferred) ?? orgs[0];
  return { orgId: active.organizationId, role: active.role, orgs };
}

export function useCurrentOrg() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["current-org"],
    queryFn: fetchCurrentOrgState,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const switchOrg = (orgId: string) => {
    setPreferredOrgId(orgId);
    // Every module is org-scoped, so refresh everything.
    queryClient.invalidateQueries();
  };

  return {
    orgId: query.data?.orgId ?? null,
    role: query.data?.role ?? null,
    orgs: query.data?.orgs ?? [],
    loading: query.isPending,
    error: query.error ?? null,
    switchOrg,
  };
}
