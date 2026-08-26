import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell, SectionCard, KpiTile, GhostButton } from "@/components/app-shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useIsPlatformAdmin } from "@/hooks/use-is-platform-admin";
import { ShieldAlert, Download, ArrowRight, Building2, Users, Target, HandCoins } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Platform Admin — Organizations" }] }),
  component: AdminHome,
});

type OrgRow = {
  id: string;
  name: string;
  created_at: string;
  onboarded_at: string | null;
  member_count: number;
  plan_count: number;
  grant_count: number;
  kpi_count: number;
};

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

function AdminHome() {
  const { isAdmin, loading: roleLoading } = useIsPlatformAdmin();
  const [rows, setRows] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoading(true);
      const [orgsRes, membersRes, plansRes, grantsRes, kpisRes, profilesRes] = await Promise.all([
        supabase.from("organizations").select("id,name,created_at,onboarded_at").order("created_at", { ascending: false }),
        supabase.from("organization_members").select("organization_id,user_id"),
        supabase.from("strategic_plans").select("id,organization_id"),
        supabase.from("grants").select("id,organization_id"),
        supabase.from("kpis").select("id,organization_id"),
        supabase.from("profiles").select("id"),
      ]);

      const tally = (arr: { organization_id: string }[] | null) => {
        const m = new Map<string, number>();
        (arr ?? []).forEach((r) => m.set(r.organization_id, (m.get(r.organization_id) ?? 0) + 1));
        return m;
      };
      const mc = tally(membersRes.data as any);
      const pc = tally(plansRes.data as any);
      const gc = tally(grantsRes.data as any);
      const kc = tally(kpisRes.data as any);

      const data: OrgRow[] = ((orgsRes.data ?? []) as any[]).map((o) => ({
        id: o.id,
        name: o.name,
        created_at: o.created_at,
        onboarded_at: o.onboarded_at,
        member_count: mc.get(o.id) ?? 0,
        plan_count: pc.get(o.id) ?? 0,
        grant_count: gc.get(o.id) ?? 0,
        kpi_count: kc.get(o.id) ?? 0,
      }));
      setRows(data);
      setTotalUsers((profilesRes.data ?? []).length);
      setLoading(false);
    })();
  }, [isAdmin]);

  const totals = useMemo(() => ({
    orgs: rows.length,
    plans: rows.reduce((s, r) => s + r.plan_count, 0),
    grants: rows.reduce((s, r) => s + r.grant_count, 0),
    kpis: rows.reduce((s, r) => s + r.kpi_count, 0),
  }), [rows]);

  if (roleLoading) {
    return <AppShell title="Platform Admin"><p className="text-sm text-slate-500">Checking access…</p></AppShell>;
  }

  if (!isAdmin) {
    return (
      <AppShell title="Platform Admin">
        <SectionCard title="Access denied">
          <div className="flex items-start gap-3 text-sm text-slate-600">
            <ShieldAlert className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <p>You need the <strong>super_admin</strong> platform role to view this page.</p>
          </div>
        </SectionCard>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Platform Admin"
      subtitle="Review data across every organization on the platform."
      actions={
        <GhostButton onClick={() => downloadCsv("organizations.csv", rows as any)}>
          <Download className="size-3.5 mr-1.5 inline" /> Export CSV
        </GhostButton>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KpiTile label="Organizations" value={totals.orgs} />
        <KpiTile label="Total Users" value={totalUsers} />
        <KpiTile label="Strategic Plans" value={totals.plans} />
        <KpiTile label="Grants Tracked" value={totals.grants} />
        <KpiTile label="KPIs Tracked" value={totals.kpis} />
      </div>

      <SectionCard title="Organizations" subtitle={loading ? "Loading…" : `${rows.length} total`}>
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                <th className="px-6 py-2 font-medium">Organization</th>
                <th className="px-3 py-2 font-medium">Members</th>
                <th className="px-3 py-2 font-medium">Plans</th>
                <th className="px-3 py-2 font-medium">Grants</th>
                <th className="px-3 py-2 font-medium">KPIs</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Onboarded</th>
                <th className="px-6 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-2.5 font-medium text-slate-800">{r.name}</td>
                  <td className="px-3 py-2.5">{r.member_count}</td>
                  <td className="px-3 py-2.5">{r.plan_count}</td>
                  <td className="px-3 py-2.5">{r.grant_count}</td>
                  <td className="px-3 py-2.5">{r.kpi_count}</td>
                  <td className="px-3 py-2.5 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2.5 text-slate-500">{r.onboarded_at ? "Yes" : "—"}</td>
                  <td className="px-6 py-2.5 text-right">
                    <Link
                      to="/admin/orgs/$orgId"
                      params={{ orgId: r.id }}
                      className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline"
                    >
                      Review <ArrowRight className="size-3" />
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && !rows.length && (
                <tr><td colSpan={8} className="px-6 py-6 text-center text-sm text-slate-500">No organizations yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </AppShell>
  );
}
