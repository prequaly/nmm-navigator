import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
  EmptyState,
} from "@/components/app-shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useCurrentPlan } from "@/hooks/use-current-plan";
import { toast } from "sonner";
import { ArrowRight, Target, TrendingUp, ListChecks } from "lucide-react";
import { Comments } from "@/components/comments/Comments";

type Pillar = { id: string; name: string; description: string | null; owner: string | null; color: string | null };
type Kpi = { id: string; name: string; pillar_id: string | null; current_value: number | null; target: number | null; unit: string | null };
type Okr = { id: string; objective: string; pillar_id: string | null; quarter: string | null; status: string };
type Action = { id: string; title: string; pillar_id: string | null; status: string; owner_label: string | null };

export const Route = createFileRoute("/_authenticated/plan/builder")({
  head: () => ({ meta: [{ title: "Strategic Planning Builder — NMM Navigator" }] }),
  component: BuilderPage,
});

function BuilderPage() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const { planId, loading: planLoading } = useCurrentPlan(orgId);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [okrs, setOkrs] = useState<Okr[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!orgId) return;
    setLoading(true);
    const [p, k, o, a] = await Promise.all([
      supabase.from("strategic_pillars").select("id,name,description,owner,color").eq("organization_id", orgId).order("sort_order"),
      supabase.from("kpis").select("id,name,pillar_id,current_value,target,unit").eq("organization_id", orgId),
      supabase.from("okrs").select("id,objective,pillar_id,quarter,status").eq("organization_id", orgId),
      supabase.from("action_items").select("id,title,pillar_id,status,owner_label").eq("organization_id", orgId),
    ]);
    if (p.error || k.error || o.error || a.error) {
      toast.error((p.error || k.error || o.error || a.error)!.message);
    }
    setPillars((p.data as Pillar[]) ?? []);
    setKpis((k.data as Kpi[]) ?? []);
    setOkrs((o.data as Okr[]) ?? []);
    setActions((a.data as Action[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const ready = !orgLoading && !planLoading && orgId && planId;

  const grouped = useMemo(() => {
    return pillars.map((p) => ({
      pillar: p,
      kpis: kpis.filter((k) => k.pillar_id === p.id),
      okrs: okrs.filter((o) => o.pillar_id === p.id),
      actions: actions.filter((a) => a.pillar_id === p.id),
    }));
  }, [pillars, kpis, okrs, actions]);

  return (
    <AppShell
      title="Strategic Planning Builder"
      subtitle="One place to see how priorities, KPIs, OKRs, and action items line up."
      actions={
        <Link to="/plan/priorities">
          <PrimaryButton>Manage priorities</PrimaryButton>
        </Link>
      }
    >
      {(orgLoading || planLoading || loading) && (
        <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>
      )}

      {ready && !loading && pillars.length === 0 && (
        <EmptyState
          icon={Target}
          title="Your plan starts here"
          description="Strategic Priorities (pillars) are the 3–5 big bets driving the next planning horizon. Everything else — KPIs, OKRs, action items, budgets — hangs off them."
          action={
            <Link to="/plan/priorities">
              <PrimaryButton>
                Define first priority <ArrowRight className="size-3.5 inline -mt-0.5 ml-1" />
              </PrimaryButton>
            </Link>
          }
        />
      )}

      {ready && !loading && pillars.length > 0 && (
        <div className="space-y-6">
          {grouped.map(({ pillar, kpis, okrs, actions }, i) => (
            <SectionCard key={pillar.id}>
              <div className="flex items-start gap-4 mb-5">
                <div
                  className="size-10 rounded-full text-white flex items-center justify-center font-serif text-lg shrink-0"
                  style={{ background: pillar.color || "#0f172a" }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-serif italic">{pillar.name}</h3>
                  {(pillar.owner || pillar.description) && (
                    <p className="text-xs text-slate-500 mt-1">
                      {pillar.owner ?? ""}
                      {pillar.owner && pillar.description ? " · " : ""}
                      {pillar.description ?? ""}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SubBlock
                  icon={<TrendingUp className="size-3.5" />}
                  title="KPIs"
                  count={kpis.length}
                  href="/plan/kpis"
                  rows={kpis.map((k) => ({
                    primary: k.name,
                    secondary:
                      k.current_value != null && k.target != null
                        ? `${k.current_value} / ${k.target}${k.unit ? ` ${k.unit}` : ""}`
                        : "—",
                  }))}
                />
                <SubBlock
                  icon={<Target className="size-3.5" />}
                  title="OKRs"
                  count={okrs.length}
                  href="/execute/okrs"
                  rows={okrs.map((o) => ({
                    primary: o.objective,
                    secondary: o.quarter ?? o.status,
                  }))}
                />
                <SubBlock
                  icon={<ListChecks className="size-3.5" />}
                  title="Action items"
                  count={actions.length}
                  href="/execute/tasks"
                  rows={actions.slice(0, 5).map((a) => ({
                    primary: a.title,
                    secondary: `${a.status}${a.owner_label ? ` · ${a.owner_label}` : ""}`,
                  }))}
                />
              </div>
              <Comments entityType="pillar" entityId={pillar.id} />
            </SectionCard>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function SubBlock({
  icon,
  title,
  count,
  href,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  href: string;
  rows: { primary: string; secondary: string }[];
}) {
  return (
    <div className="border border-slate-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          {icon}
          {title} · {count}
        </div>
        <Link to={href} className="text-xs text-brand-primary hover:underline flex items-center gap-0.5">
          Open <ArrowRight className="size-3" />
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 italic">None linked to this priority.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li key={i} className="text-xs">
              <p className="text-slate-800 line-clamp-2">{r.primary}</p>
              <p className="text-slate-400 mt-0.5">{r.secondary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
