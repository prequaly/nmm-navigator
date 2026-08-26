import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, SectionCard, PrimaryButton, GhostButton } from "@/components/app-shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useServerFn } from "@tanstack/react-start";
import { draftNarrative } from "@/lib/ai/draft.functions";
import { PLAN_SECTIONS, IMPACT_LENSES, detectImpactCoverage } from "@/lib/plan/sections";
import { toast } from "sonner";
import { Sparkles, Save, Loader2, FileText, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/plan/narrative")({
  head: () => ({ meta: [{ title: "Plan Narrative — NMM Navigator" }] }),
  component: PlanNarrativePage,
});

type Row = { section_key: string; body: string; ai_drafted_at: string | null; updated_at: string };

function PlanNarrativePage() {
  const { orgId } = useCurrentOrg();
  const draftFn = useServerFn(draftNarrative);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [draftingKey, setDraftingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("plan_narratives")
      .select("section_key,body,ai_drafted_at,updated_at")
      .eq("organization_id", orgId);
    if (error) {
      toast.error(error.message);
    } else {
      const map: Record<string, Row> = {};
      const ds: Record<string, string> = {};
      for (const r of (data ?? []) as Row[]) {
        map[r.section_key] = r;
        ds[r.section_key] = r.body;
      }
      setRows(map);
      setDrafts(ds);
      setDirty({});
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function save(key: string) {
    if (!orgId) return;
    setSavingKey(key);
    const body = drafts[key] ?? "";
    const { error } = await supabase
      .from("plan_narratives")
      .upsert(
        { organization_id: orgId, section_key: key, body },
        { onConflict: "organization_id,section_key" },
      );
    setSavingKey(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Saved");
      setDirty((d) => ({ ...d, [key]: false }));
      refresh();
    }
  }

  async function aiDraft(key: string) {
    if (!orgId) return;
    setDraftingKey(key);
    try {
      const result = (await draftFn({
        data: { kind: "plan_section", organizationId: orgId, sectionKey: key },
      })) as { text: string };
      setDrafts((d) => ({ ...d, [key]: result.text }));
      setDirty((d) => ({ ...d, [key]: true }));
      toast.success("AI draft ready — review and save");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "AI draft failed";
      toast.error(msg);
    } finally {
      setDraftingKey(null);
    }
  }

  return (
    <AppShell
      title="Plan Narrative"
      subtitle="The story behind the data. AI can draft each section from your org's profile, pillars, KPIs, risks, and budget — you refine and save."
      actions={
        <a href="/report/exports">
          <PrimaryButton>
            <FileText className="size-4 mr-1.5" />
            Go to exports
          </PrimaryButton>
        </a>
      }
    >
      {loading ? (
        <div className="text-sm text-slate-500 p-6">Loading…</div>
      ) : (
        (() => {
          const sectionCoverage = PLAN_SECTIONS.map((s) => {
            const cov = detectImpactCoverage(drafts[s.key] ?? "");
            const n = IMPACT_LENSES.filter((l) => cov[l.key]).length;
            return { section: s, covered: n, complete: n === IMPACT_LENSES.length };
          });
          const totalLenses = PLAN_SECTIONS.length * IMPACT_LENSES.length;
          const totalCovered = sectionCoverage.reduce((a, b) => a + b.covered, 0);
          const totalPct = Math.round((totalCovered / totalLenses) * 100);
          const sectionsComplete = sectionCoverage.filter((c) => c.complete).length;
          return (
            <div className="space-y-6">
              <SectionCard
                title="Plan IMPACT coverage"
                subtitle="Every section should address all six IMPACT lenses. Jump to any section to fill in what's missing."
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Overall progress
                  </div>
                  <div className="text-xs font-medium text-slate-700">
                    {totalCovered}/{totalLenses} lenses · {sectionsComplete}/{PLAN_SECTIONS.length} sections complete · {totalPct}%
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 mb-4">
                  <div
                    className={`h-full transition-all ${
                      totalPct === 100
                        ? "bg-emerald-500"
                        : totalPct >= 50
                          ? "bg-brand-primary"
                          : "bg-amber-500"
                    }`}
                    style={{ width: `${totalPct}%` }}
                  />
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {sectionCoverage.map(({ section, covered, complete }) => (
                    <li key={section.key}>
                      <a
                        href={`#section-${section.key}`}
                        className={`flex items-center justify-between gap-2 text-xs rounded px-2 py-1.5 border transition-colors ${
                          complete
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : covered > 0
                              ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate">
                          <span className="font-mono mr-1.5 text-slate-400">{section.numeral}.</span>
                          {section.title}
                        </span>
                        <span className="font-medium tabular-nums shrink-0">
                          {covered}/{IMPACT_LENSES.length}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </SectionCard>
              {PLAN_SECTIONS.map((s) => {
                const existing = rows[s.key];
                const value = drafts[s.key] ?? "";
                const isDirty = dirty[s.key];
                const coverage = detectImpactCoverage(value);
                const covered = IMPACT_LENSES.filter((l) => coverage[l.key]).length;
                const pct = Math.round((covered / IMPACT_LENSES.length) * 100);
                return (
                  <div key={s.key} id={`section-${s.key}`} className="scroll-mt-24">
                    <SectionCard
                      title={`${s.numeral}. ${s.title}`}
                      subtitle={s.helper}
                    >
                <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      IMPACT framework coverage
                    </div>
                    <div className="text-xs font-medium text-slate-700">
                      {covered}/{IMPACT_LENSES.length} lenses · {pct}%
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 mb-3">
                    <div
                      className={`h-full transition-all ${
                        pct === 100
                          ? "bg-emerald-500"
                          : pct >= 50
                            ? "bg-brand-primary"
                            : "bg-amber-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                    {IMPACT_LENSES.map((lens) => {
                      const done = coverage[lens.key];
                      return (
                        <li
                          key={lens.key}
                          className={`flex items-center gap-2 text-xs rounded px-2 py-1 ${
                            done ? "text-emerald-700 bg-emerald-50" : "text-slate-500"
                          }`}
                        >
                          <span
                            className={`flex size-4 items-center justify-center rounded-full border ${
                              done
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {done && <Check className="size-3" strokeWidth={3} />}
                          </span>
                          <span className={done ? "font-medium" : ""}>{lens.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <textarea
                  value={value}
                  onChange={(e) => {
                    setDrafts((d) => ({ ...d, [s.key]: e.target.value }));
                    setDirty((d) => ({ ...d, [s.key]: true }));
                  }}
                  rows={14}
                  placeholder={
                    'Use the IMPACT framework sub-headings: "Inclusive Partnerships", "Measurable Outcomes", "Purpose-Driven Innovation", "Adaptive Strategies", "Community Empowerment", "Transparency & Accountability". Click "AI draft" to generate.'
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono leading-relaxed focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />

                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-slate-500">
                    {existing?.ai_drafted_at && (
                      <span>
                        Last AI draft {new Date(existing.ai_drafted_at).toLocaleDateString()} •{" "}
                      </span>
                    )}
                    {existing?.updated_at && (
                      <span>Saved {new Date(existing.updated_at).toLocaleString()}</span>
                    )}
                    {isDirty && <span className="text-amber-600 ml-2">• Unsaved changes</span>}
                  </div>
                  <div className="flex gap-2">
                    <GhostButton
                      onClick={() => aiDraft(s.key)}
                      disabled={draftingKey === s.key}
                    >
                      {draftingKey === s.key ? (
                        <Loader2 className="size-4 mr-1.5 animate-spin" />
                      ) : (
                        <Sparkles className="size-4 mr-1.5" />
                      )}
                      AI draft
                    </GhostButton>
                    <PrimaryButton
                      onClick={() => save(s.key)}
                      disabled={savingKey === s.key || !isDirty}
                    >
                      {savingKey === s.key ? (
                        <Loader2 className="size-4 mr-1.5 animate-spin" />
                      ) : (
                        <Save className="size-4 mr-1.5" />
                      )}
                      Save
                    </PrimaryButton>
                  </div>
                </div>
                    </SectionCard>
                  </div>
                );
              })}
            </div>
          );
        })()
      )}
    </AppShell>
  );
}
