import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell, SectionCard, PrimaryButton, GhostButton } from "@/components/app-shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { UserPlus, Link2, Trash2, ShieldCheck, Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [{ title: "Team & Invites — NMM Navigator" }] }),
  component: TeamPage,
});

type AppRole = Database["public"]["Enums"]["app_role"];
const ASSIGNABLE_ROLES: AppRole[] = ["admin", "staff", "board_member", "consultant", "viewer"];

const ROLE_HELP: Record<AppRole, string> = {
  owner: "Full control, including billing and ownership",
  admin: "Manage team, plans, and all modules",
  staff: "Edit plans, budgets, execution, and assessments",
  board_member: "Read access to the plan, KPIs, reports, and board materials",
  consultant: "Can build and edit plan content (priorities, KPIs, risks, assessments) for this organization, without access to its budget or execution data",
  viewer: "Read-only access to all modules",
};

function TeamPage() {
  const { orgId, role: myRole, orgs, loading: orgLoading, switchOrg } = useCurrentOrg();
  const queryClient = useQueryClient();
  const canManage = myRole === "owner" || myRole === "admin";

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("viewer");

  const membersQuery = useQuery({
    queryKey: ["team-members", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from("organization_members")
        .select("id, user_id, role, created_at")
        .eq("organization_id", orgId as string)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const ids = (members ?? []).map((m) => m.user_id);
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids)
        : { data: [] };
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (members ?? []).map((m) => ({
        ...m,
        full_name: byId.get(m.user_id)?.full_name ?? "Member",
      }));
    },
  });

  const invitesQuery = useQuery({
    queryKey: ["team-invites", orgId],
    enabled: !!orgId && canManage,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_invites")
        .select("id, email, role, status, token, expires_at, created_at")
        .eq("organization_id", orgId as string)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createInvite = useMutation({
    mutationFn: async () => {
      const email = inviteEmail.trim().toLowerCase();
      if (!email || !email.includes("@")) throw new Error("Enter a valid email address");
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("organization_invites")
        .insert({
          organization_id: orgId as string,
          email,
          role: inviteRole,
          invited_by: u.user?.id,
        })
        .select("token")
        .single();
      if (error) {
        if (error.code === "23505") {
          throw new Error("A pending invite for this email already exists");
        }
        throw error;
      }
      return data;
    },
    onSuccess: async (data) => {
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["team-invites", orgId] });
      const copied = await copyInviteLink(data.token);
      toast.success(
        copied
          ? "Invite created — link copied to clipboard"
          : "Invite created — use Copy link to share it",
      );
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create invite"),
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("organization_invites")
        .update({ status: "revoked" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-invites", orgId] });
      toast.success("Invite revoked");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to revoke invite"),
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AppRole }) => {
      const { error } = await supabase.from("organization_members").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", orgId] });
      toast.success("Role updated");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update role"),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("organization_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", orgId] });
      toast.success("Member removed");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to remove member"),
  });

  async function copyInviteLink(token: string): Promise<boolean> {
    const url = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      window.prompt("Copy this invite link:", url);
      return false;
    }
  }

  return (
    <AppShell
      title="Team & Invites"
      subtitle="Bring your board, staff, and volunteers into one shared plan"
    >
      {orgs.length > 1 && (
        <SectionCard
          title="Active organization"
          subtitle="You belong to more than one organization — choose which one you're working in"
          className="mb-6"
        >
          <div className="flex flex-wrap gap-2">
            {orgs.map((o) => (
              <button
                key={o.organizationId}
                type="button"
                onClick={() => switchOrg(o.organizationId)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
                  o.organizationId === orgId
                    ? "bg-teal-primary text-white border-teal-primary"
                    : "bg-white border-border hover:bg-accent"
                }`}
              >
                <Building2 className="size-4" />
                {o.organizationName}
                <span className="text-xs opacity-70 capitalize">({o.role})</span>
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="Members"
          subtitle="Everyone with access to this organization"
          className="lg:col-span-2"
        >
          {orgLoading || membersQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Loading members…</p>
          ) : membersQuery.isError ? (
            <p className="text-sm text-rose-600">Couldn't load members. Please try again.</p>
          ) : (
            <ul className="divide-y divide-border/70">
              {(membersQuery.data ?? []).map((m) => (
                <li key={m.id} className="py-3 flex items-center gap-3">
                  <div className="size-9 rounded-full bg-teal-primary/10 text-teal-deep grid place-items-center text-sm font-semibold shrink-0">
                    {(m.full_name ?? "M").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.full_name}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_HELP[m.role]}</p>
                  </div>
                  {m.role === "owner" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-deep bg-teal-primary/10 px-3 py-1.5 rounded-full">
                      <ShieldCheck className="size-3.5" /> Owner
                    </span>
                  ) : canManage ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={m.role}
                        onChange={(e) =>
                          updateRole.mutate({ id: m.id, role: e.target.value as AppRole })
                        }
                        className="text-xs border border-border rounded-md px-2 py-1.5 bg-white capitalize"
                      >
                        {ASSIGNABLE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Remove ${m.full_name} from this organization?`)) {
                            removeMember.mutate(m.id);
                          }
                        }}
                        className="p-1.5 text-muted-foreground hover:text-rose-600 transition-colors"
                        aria-label={`Remove ${m.full_name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground capitalize px-3 py-1.5">
                      {m.role}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <div className="space-y-6">
          {canManage ? (
            <SectionCard
              title="Invite a teammate"
              subtitle="They'll get a link to join this organization"
            >
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="name@organization.org"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-white"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as AppRole)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-white capitalize"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r} — {ROLE_HELP[r]}
                    </option>
                  ))}
                </select>
                <PrimaryButton
                  onClick={() => createInvite.mutate()}
                  disabled={createInvite.isPending || !orgId}
                  className="w-full justify-center"
                >
                  <UserPlus className="size-4" />
                  {createInvite.isPending ? "Creating…" : "Create invite link"}
                </PrimaryButton>
                <p className="text-[11px] text-muted-foreground">
                  Invites expire after 14 days and can only be accepted by the email they were
                  issued to. Ownership can't be granted by invite.
                </p>
              </div>
            </SectionCard>
          ) : (
            <SectionCard title="Invites">
              <p className="text-sm text-muted-foreground">
                Only owners and admins can invite new members. Ask your organization's admin if
                someone needs access.
              </p>
            </SectionCard>
          )}

          {canManage && (
            <SectionCard title="Pending invites">
              {invitesQuery.isPending ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (invitesQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending invites.</p>
              ) : (
                <ul className="space-y-3">
                  {(invitesQuery.data ?? []).map((inv) => (
                    <li key={inv.id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{inv.email}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <GhostButton
                        onClick={() => {
                          void copyInviteLink(inv.token).then(
                            (ok) => ok && toast.success("Invite link copied"),
                          );
                        }}
                        className="!px-3 !py-1.5 text-xs"
                      >
                        <Link2 className="size-3.5" /> Copy link
                      </GhostButton>
                      <button
                        type="button"
                        onClick={() => revokeInvite.mutate(inv.id)}
                        className="p-1.5 text-muted-foreground hover:text-rose-600 transition-colors"
                        aria-label={`Revoke invite for ${inv.email}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          )}
        </div>
      </div>
    </AppShell>
  );
}
