import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, SectionCard, KpiTile, GhostButton } from "@/components/app-shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useIsPlatformAdmin } from "@/hooks/use-is-platform-admin";
import { ArrowLeft, Download, ShieldAlert, Users, Target, HandCoins, ListChecks, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/orgs/$orgId")({
  head: () => ({ meta: [{ title: "Org Review — Platform Admin" }] }),
  component: OrgReview,
});

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function OrgReview() {
  const { orgId } = Route.useParams();
  const { isAdmin, loading: roleLoading } = useIsPlatformAdmin();
  const [org, setOrg] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [grants, setGrants] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [narratives, setNarratives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin || !orgId) return;
    (async () => {
      setLoading(true);
      const [o, mRes, pRes, gRes, kRes, nRes] = await Promise.all([
        supabase.from("organizations").select("*").eq("id", orgId).single(),
        supabase.from("organization_members").select("user_id,role,created_at").eq("organization_id", orgId),
        supabase.from("strategic_plans").select("*").eq("organization_id", orgId),
        supabase.from("grants").select("id,name,funder,amount,status,deadline").eq("organization_id", orgId),
        supabase.from("kpis").select("id,name,category,target,current_value").eq("organization_id", orgId),
        supabase.from("plan_narratives").select("id,section_key,updated_at").eq("organization_id", orgId),
      ]);
      setOrg(o.data);
      const memberRows = (mRes.data ?? []) as any[];
      const userIds = memberRows.map((m) => m.user_id);
      let profileMap = new Map<string, any>();
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", userIds);
        profileMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      }
      setMembers(memberRows.map((m) => ({ ...m, full_name: profileMap.get(m.user_id)?.full_name ?? "—" })));
      setPlans(pRes.data ?? []);
      setGrants(gRes.data ?? []);
      setKpis(kRes.data ?? []);
      setNarratives(nRes.data ?? []);
      setLoading(false);
    })();
  }, [isAdmin, orgId]);

  if (roleLoading) {
    return <AppShell title="Org Review"><p className="text-sm text-slate-500">Checking access…</p></AppShell>;
  }
  if (!isAdmin) {
    return (
      <AppShell title="Org Review">
        <SectionCard title="Access denied">
          <div className="flex items-start gap-3 text-sm text-slate-600">
            <ShieldAlert className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <p>You need the <strong>super_admin</strong> role.</p>
          </div>
        </SectionCard>
      </AppShell>
    );
  }

  const exportAll = () => {
    downloadCsv(`${org?.name ?? "org"}-members.csv`, members);
    downloadCsv(`${org?.name ?? "org"}-grants.csv`, grants);
    downloadCsv(`${org?.name ?? "org"}-kpis.csv`, kpis);
    downloadCsv(`${org?.name ?? "org"}-plans.csv`, plans);
  };

  return (
    <AppShell
      title={org?.name ?? "Org Review"}
      subtitle={loading ? "Loading…" : org?.mission ?? undefined}
      actions={
        <div className="flex gap-2">
          <Link to="/admin" className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
            <ArrowLeft className="size-3.5" /> All orgs
          </Link>
          <GhostButton onClick={exportAll}>
            <Download className="size-3.5 mr-1.5 inline" /> Export CSVs
          </GhostButton>
        </div>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KpiTile label="Members" value={members.length} />
        <KpiTile label="Plans" value={plans.length} />
        <KpiTile label="Grants" value={grants.length} />
        <KpiTile label="KPIs" value={kpis.length} />
        <KpiTile label="Narratives" value={narratives.length} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Members">
          <Table rows={members} cols={[["full_name", "Name"], ["role", "Role"], ["created_at", "Joined"]]} dateCols={["created_at"]} />
        </SectionCard>
        <SectionCard title="Strategic Plans">
          <Table rows={plans} cols={[["name", "Name"], ["status", "Status"], ["created_at", "Created"]]} dateCols={["created_at"]} />
        </SectionCard>
        <SectionCard title="Grants">
          <Table rows={grants} cols={[["name", "Name"], ["funder", "Funder"], ["amount", "Amount"], ["status", "Status"], ["deadline", "Deadline"]]} dateCols={["deadline"]} />
        </SectionCard>
        <SectionCard title="KPIs">
          <Table rows={kpis} cols={[["name", "Name"], ["category", "Category"], ["target", "Target"], ["current_value", "Current"]]} />
        </SectionCard>
        <SectionCard title="Plan Narratives" className="lg:col-span-2">
          <Table rows={narratives} cols={[["section_key", "Section"], ["updated_at", "Updated"]]} dateCols={["updated_at"]} />
        </SectionCard>
      </div>
    </AppShell>
  );
}

function Table({
  rows,
  cols,
  dateCols = [],
}: {
  rows: any[];
  cols: [string, string][];
  dateCols?: string[];
}) {
  if (!rows.length) return <p className="text-sm text-slate-500">None.</p>;
  return (
    <div className="overflow-x-auto -mx-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
            {cols.map(([k, label]) => (
              <th key={k} className="px-6 py-2 font-medium first:pl-6 [&:not(:first-child)]:px-3">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i} className="border-b border-slate-100">
              {cols.map(([k]) => {
                const v = r[k];
                const display = v == null ? "—" : dateCols.includes(k) ? new Date(v).toLocaleDateString() : String(v);
                return <td key={k} className="px-6 py-2 first:pl-6 [&:not(:first-child)]:px-3">{display}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
