import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, SectionCard, PrimaryButton, GhostButton } from "@/components/app-shell/AppShell";
import { ArrowRight, Sparkles, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useCurrentPlan } from "@/hooks/use-current-plan";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/plan/theory-of-change")({
  head: () => ({ meta: [{ title: "Theory of Change — NMM Navigator" }] }),
  component: TheoryOfChange,
});

type ToC = {
  id: string;
  problem_statement: string | null;
  inputs: string[];
  activities: string[];
  outputs: string[];
  outcomes: string[];
  impact: string[];
  assumptions: string[];
  external_factors: string[];
};

const LIST_COLUMNS = [
  { key: "inputs", label: "Inputs", helper: "Resources we invest", color: "#0f172a" },
  { key: "activities", label: "Activities", helper: "What we do", color: "#2563eb" },
  { key: "outputs", label: "Outputs", helper: "Direct, countable results", color: "#10b981" },
  { key: "outcomes", label: "Outcomes", helper: "Short & medium-term change", color: "#f59e0b" },
  {
    key: "impact",
    label: "Impact",
    helper: "Long-term, population-level change",
    color: "#dc2626",
  },
] as const;

function TheoryOfChange() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const { planId, loading: planLoading } = useCurrentPlan(orgId);
  const [toc, setToc] = useState<ToC | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function refresh() {
    if (!orgId || !planId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("theory_of_change")
      .select(
        "id,problem_statement,inputs,activities,outputs,outcomes,impact,assumptions,external_factors",
      )
      .eq("plan_id", planId)
      .maybeSingle();
    if (error) toast.error(error.message);
    if (data) {
      setToc(data as unknown as ToC);
    } else {
      // Bootstrap an empty row so every later save is an UPDATE, not a
      // race-prone "insert if not exists".
      const { data: created, error: createErr } = await supabase
        .from("theory_of_change")
        .insert({ plan_id: planId, organization_id: orgId })
        .select(
          "id,problem_statement,inputs,activities,outputs,outcomes,impact,assumptions,external_factors",
        )
        .single();
      if (createErr) toast.error(createErr.message);
      setToc((created as unknown as ToC) ?? null);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId || !planId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, planId]);

  async function save(patch: Partial<ToC>) {
    if (!toc) return;
    const next = { ...toc, ...patch };
    setToc(next);
    const { error } = await supabase.from("theory_of_change").update(patch).eq("id", toc.id);
    if (error) toast.error(error.message);
  }

  function addItem(key: (typeof LIST_COLUMNS)[number]["key"] | "assumptions" | "external_factors") {
    const text = (drafts[key] ?? "").trim();
    if (!text || !toc) return;
    save({ [key]: [...(toc[key] as string[]), text] } as Partial<ToC>);
    setDrafts({ ...drafts, [key]: "" });
  }

  function removeItem(
    key: (typeof LIST_COLUMNS)[number]["key"] | "assumptions" | "external_factors",
    i: number,
  ) {
    if (!toc) return;
    const list = (toc[key] as string[]).filter((_, ii) => ii !== i);
    save({ [key]: list } as Partial<ToC>);
  }

  const ready = !orgLoading && !planLoading && !loading && toc;

  return (
    <AppShell
      title="Theory of Change"
      subtitle="The throughline from what you invest to the world you're trying to create."
      actions={
        <>
          <GhostButton disabled>
            <Sparkles className="size-3.5 inline -mt-0.5" /> AI suggest gaps
          </GhostButton>
          <PrimaryButton disabled>Export as logic model</PrimaryButton>
        </>
      }
    >
      {!ready && <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>}

      {ready && toc && (
        <>
          <SectionCard
            title="Logic chain"
            subtitle="Each column should connect causally to the next. If a link is fuzzy, your strategy is fuzzy."
          >
            <div className="overflow-x-auto -mx-6 px-6">
              <div className="flex items-stretch gap-3 min-w-[920px]">
                {LIST_COLUMNS.map((c, i) => (
                  <div key={c.key} className="flex items-stretch gap-3 flex-1">
                    <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <div
                        className="px-4 py-3 border-b border-slate-100"
                        style={{ background: `${c.color}10` }}
                      >
                        <p
                          className="text-[10px] font-bold uppercase tracking-widest"
                          style={{ color: c.color }}
                        >
                          {c.label}
                        </p>
                        <p className="text-xs text-slate-500 italic">{c.helper}</p>
                      </div>
                      <ul className="p-3 space-y-2">
                        {(toc[c.key] as string[]).map((it, ii) => (
                          <li
                            key={ii}
                            className="text-xs text-slate-700 bg-slate-50 rounded-md p-2 leading-snug flex items-start gap-1 group"
                          >
                            <span className="flex-1">{it}</span>
                            <button
                              onClick={() => removeItem(c.key, ii)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 shrink-0"
                            >
                              <X className="size-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                      <div className="px-3 pb-3 flex gap-1">
                        <input
                          value={drafts[c.key] ?? ""}
                          onChange={(e) => setDrafts({ ...drafts, [c.key]: e.target.value })}
                          onKeyDown={(e) => e.key === "Enter" && addItem(c.key)}
                          placeholder="Add…"
                          className="flex-1 text-[11px] border border-slate-200 rounded px-2 py-1"
                        />
                        <button
                          onClick={() => addItem(c.key)}
                          className="text-[10px] font-medium text-slate-400 hover:text-brand-primary px-1"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    </div>
                    {i < LIST_COLUMNS.length - 1 && (
                      <div className="flex items-center shrink-0">
                        <ArrowRight className="size-4 text-slate-300" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <SectionCard
              title="Key assumptions"
              subtitle="The 'if true, then this works' beliefs"
              className="lg:col-span-2"
            >
              <ul className="space-y-3">
                {toc.assumptions.map((a, i) => (
                  <li key={i} className="flex gap-3 text-sm group">
                    <span className="text-xs font-bold text-slate-400 tabular-nums w-5 shrink-0 mt-0.5">
                      A{i + 1}
                    </span>
                    <p className="flex-1 text-slate-700 italic font-serif">"{a}"</p>
                    <button
                      onClick={() => removeItem("assumptions", i)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 shrink-0"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <input
                  value={drafts.assumptions ?? ""}
                  onChange={(e) => setDrafts({ ...drafts, assumptions: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && addItem("assumptions")}
                  placeholder="Add an assumption…"
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
                <button
                  onClick={() => addItem("assumptions")}
                  className="px-3 py-2 bg-brand-deep text-white rounded-lg text-sm"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </SectionCard>

            <SectionCard title="External factors" subtitle="What we don't control">
              <ul className="space-y-2 text-sm text-slate-700">
                {toc.external_factors.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 group">
                    <span className="flex-1">· {f}</span>
                    <button
                      onClick={() => removeItem("external_factors", i)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 shrink-0"
                    >
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <input
                  value={drafts.external_factors ?? ""}
                  onChange={(e) => setDrafts({ ...drafts, external_factors: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && addItem("external_factors")}
                  placeholder="Add a factor…"
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
                <button
                  onClick={() => addItem("external_factors")}
                  className="px-3 py-2 bg-brand-deep text-white rounded-lg text-sm"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Ready to translate this into measurement?" className="mt-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-slate-600">
                Each outcome and output above should map to a tracked KPI in the KPI Library.
              </p>
              <GhostButton disabled>
                <Sparkles className="size-3.5 inline -mt-0.5" /> Generate KPIs from this model
              </GhostButton>
            </div>
          </SectionCard>
        </>
      )}
    </AppShell>
  );
}
