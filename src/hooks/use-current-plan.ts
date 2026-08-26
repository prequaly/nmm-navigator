import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves (or bootstraps) the organization's default strategic plan.
 *
 * Changes from the previous version:
 * - Uses TanStack Query keyed by orgId, so the plan lookup is cached and
 *   shared across routes instead of re-running on every mount.
 * - The create path no longer silently ignores errors; failures surface
 *   through the query's error state.
 * - Handles the concurrent-bootstrap race: if the insert fails because
 *   another tab/mount created the default plan first, we re-check before
 *   surfacing an error.
 */

async function findPlanId(orgId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("strategic_plans")
    .select("id")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function fetchOrCreatePlanId(orgId: string): Promise<string | null> {
  const existing = await findPlanId(orgId);
  if (existing) return existing;

  const { data: u } = await supabase.auth.getUser();
  const { data: created, error: createErr } = await supabase
    .from("strategic_plans")
    .insert({
      organization_id: orgId,
      name: "Default Strategic Plan",
      created_by: u.user?.id ?? null,
    })
    .select("id")
    .single();

  if (createErr || !created) {
    const retry = await findPlanId(orgId);
    if (retry) return retry;
    throw createErr ?? new Error("Failed to create strategic plan");
  }

  return created.id;
}

export function useCurrentPlan(orgId: string | null) {
  const query = useQuery({
    queryKey: ["current-plan", orgId],
    queryFn: () => fetchOrCreatePlanId(orgId as string),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    planId: query.data ?? null,
    loading: !!orgId && query.isPending,
    error: query.error ?? null,
  };
}
