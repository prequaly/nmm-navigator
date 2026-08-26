import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
  EmptyState,
  LoadingState,
} from "@/components/app-shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Plus, Calendar, Filter } from "lucide-react";

import { toast } from "sonner";
import { currency, type GrantRow } from "@/lib/finance/projections";

export const Route = createFileRoute("/_authenticated/fund/pipeline")({
  head: () => ({ meta: [{ title: "Grant Pipeline — NMM Navigator" }] }),
  component: GrantPipeline,
});

const STAGES = ["prospect", "applied", "pending", "awarded", "active", "declined"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_LABEL: Record<Stage, string> = {
  prospect: "Research",
  applied: "Submitted",
  pending: "Pending",
  awarded: "Awarded",
  active: "Active",
  declined: "Declined",
};

const STAGE_COLOR: Record<Stage, string> = {
  prospect: "bg-slate-100 text-slate-700",
  applied: "bg-brand-primary/15 text-brand-primary",
  pending: "bg-amber-100 text-amber-700",
  awarded: "bg-emerald-100 text-emerald-700",
  active: "bg-emerald-100 text-emerald-700",
  declined: "bg-rose-100 text-rose-700",
};

function fmtDeadline(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function GrantPipeline() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("grants")
      .select("*")
      .eq("organization_id", orgId)
      .order("application_deadline", { ascending: true, nullsFirst: false });
    if (error) toast.error(error.message);
    setGrants((data as GrantRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (orgId) load();
  }, [orgId]);

  const groups = useMemo(() => {
    const g: Record<Stage, GrantRow[]> = {
      prospect: [], applied: [], pending: [], awarded: [], active: [], declined: [],
    };
    for (const row of grants) {
      const s = (row.status as Stage) ?? "prospect";
      if (g[s]) g[s].push(row);
    }
    return g;
  }, [grants]);

  const totals = useMemo(() => {
    let weighted = 0;
    let totalAsk = 0;
    let awarded = 0;
    for (const g of grants) {
      if (g.status === "declined") continue;
      const req = Number(g.amount_requested ?? 0);
      const award = Number(g.amount_awarded ?? 0);
      if (g.status === "awarded" || g.status === "active") awarded += award;
      else {
        totalAsk += req;
        weighted += req * (g.probability / 100);
      }
    }
    return { weighted, totalAsk, awarded };
  }, [grants]);

  const activeCount = grants.filter((g) => g.status !== "declined").length;

  const upcoming = useMemo(() => {
    const now = Date.now();
    const sixtyDays = now + 60 * 24 * 60 * 60 * 1000;
    return grants
      .filter(
        (g) =>
          g.status !== "awarded" &&
          g.status !== "active" &&
          g.status !== "declined" &&
          g.application_deadline,
      )
      .filter((g) => {
        const t = new Date(g.application_deadline!).getTime();
        return t >= now - 24 * 60 * 60 * 1000 && t <= sixtyDays;
      })
      .sort(
        (a, b) =>
          new Date(a.application_deadline!).getTime() -
          new Date(b.application_deadline!).getTime(),
      )
      .slice(0, 6);
  }, [grants]);

  return (
    <AppShell
      title="Grant Pipeline"
      subtitle="Moves management for institutional fundraising — research through award. Weighted by probability."
      actions={
        <>
          <GhostButton onClick={() => window.location.assign("/fund/grants")}>Manage grants</GhostButton>
          <PrimaryButton onClick={() => window.location.assign("/fund/grants")}>
            <Plus className="size-3.5 inline -mt-0.5 mr-1" /> Add prospect
          </PrimaryButton>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Stat
          label="Pipeline (asks)"
          value={`$${(totals.totalAsk / 1000).toFixed(0)}k`}
          hint={`${activeCount} active prospects`}
        />
        <div className="bg-brand-deep text-white rounded-2xl p-5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">
            Weighted value
          </span>
          <p className="text-3xl font-serif mt-2 tabular-nums">
            ${(totals.weighted / 1000).toFixed(0)}k
          </p>
          <p className="text-xs text-slate-400 mt-1">Asks × probability</p>
        </div>
        <Stat label="Awarded" value={`$${(totals.awarded / 1000).toFixed(0)}k`} tone="emerald" />
        <Stat
          label="Win rate"
          value={
            grants.filter((g) => ["awarded", "active", "declined"].includes(g.status)).length === 0
              ? "—"
              : `${Math.round(
                  (grants.filter((g) => ["awarded", "active"].includes(g.status)).length /
                    grants.filter((g) => ["awarded", "active", "declined"].includes(g.status))
                      .length) *
                    100,
                )}%`
          }
          hint="Awarded ÷ decided"
        />
      </div>

      {orgLoading || loading ? (
        <LoadingState label="Loading pipeline…" />
      ) : !orgId ? (
        <EmptyState
          title="No organization found"
          description="Set up your organization profile to start the pipeline."
          action={
            <a href="/profile" className="text-sm text-brand-primary underline">
              Set up your organization →
            </a>
          }
        />
      ) : grants.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="No grants in pipeline"
          description="Add your first prospect to start building the pipeline."
          action={
            <PrimaryButton onClick={() => window.location.assign("/fund/grants")}>
              <Plus className="size-3.5 inline -mt-0.5 mr-1" /> Add prospect
            </PrimaryButton>
          }
        />
      ) : (

        <>
          {/* Kanban */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {STAGES.map((stage) => {
              const items = groups[stage];
              const total = items.reduce(
                (a, b) =>
                  a + Number(b.amount_awarded ?? b.amount_requested ?? 0),
                0,
              );
              return (
                <div key={stage} className="bg-slate-50 rounded-xl p-3 min-h-[320px]">
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${STAGE_COLOR[stage]}`}
                    >
                      {STAGE_LABEL[stage]}
                    </span>
                    <span className="text-xs text-slate-400 tabular-nums">{items.length}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3 tabular-nums">
                    ${(total / 1000).toFixed(0)}k total
                  </p>
                  <div className="space-y-2">
                    {items.map((g) => {
                      const amount = Number(g.amount_awarded ?? g.amount_requested ?? 0);
                      return (
                        <a
                          key={g.id}
                          href="/fund/grants"
                          className="block bg-white border border-slate-200 rounded-lg p-3 hover:border-brand-primary/40 cursor-pointer transition-colors"
                        >
                          <p className="text-sm font-medium text-slate-800 leading-tight">
                            {g.funder_name}
                          </p>
                          <p className="text-xs text-slate-500 mt-1 italic line-clamp-2">
                            {g.grant_name}
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                            <span className="text-xs font-medium tabular-nums text-brand-deep">
                              ${(amount / 1000).toFixed(0)}k
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {fmtDeadline(g.application_deadline)}
                            </span>
                          </div>
                          {g.probability > 0 && g.probability < 100 && stage !== "awarded" && stage !== "active" && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-brand-accent"
                                  style={{ width: `${g.probability}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500 tabular-nums">
                                {g.probability}%
                              </span>
                            </div>
                          )}
                          {g.program_area && (
                            <p className="text-[10px] text-slate-400 mt-1.5">
                              {g.program_area}
                            </p>
                          )}
                        </a>
                      );
                    })}
                    {items.length === 0 && (
                      <p className="text-[11px] text-slate-400 italic text-center py-4">
                        No grants
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <SectionCard
            title="Upcoming deadlines"
            subtitle="Open prospects with deadlines in the next 60 days"
            className="mt-6"
          >
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-2">
                No deadlines in the next 60 days.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcoming.map((g) => (
                  <li key={g.id} className="py-3 flex items-center gap-4">
                    <span className="text-sm font-medium text-brand-primary tabular-nums w-24 inline-flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      {fmtDeadline(g.application_deadline)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {g.funder_name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {g.grant_name}
                        {g.program_area ? ` · ${g.program_area}` : ""}
                      </p>
                    </div>
                    <span className="text-sm tabular-nums text-slate-700">
                      {currency(Number(g.amount_requested ?? 0))}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${STAGE_COLOR[(g.status as Stage) ?? "prospect"]}`}
                    >
                      {STAGE_LABEL[(g.status as Stage) ?? "prospect"]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </>
      )}
    </AppShell>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "emerald";
}) {
  const color = tone === "emerald" ? "text-emerald-600" : "text-brand-deep";
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`text-3xl font-serif mt-1 tabular-nums ${color}`}>{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
