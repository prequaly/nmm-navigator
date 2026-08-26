import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, ExternalLink, Sparkles } from "lucide-react";
import { SectionCard } from "@/components/app-shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { ALL } from "@/lib/assessments/configs";

type Row = {
  assessment_type: string;
  score: number | null;
  maturity_level: string | null;
  completed_at: string | null;
};

const ROUTE: Record<string, string> = {
  health: "/assess/health",
  capacity: "/assess/capacity",
  financial: "/assess/financial",
  fundraising: "/assess/fundraising",
  "program-impact": "/assess/program-impact",
  governance: "/assess/governance",
  community: "/assess/community",
  digital: "/assess/digital",
  impact: "/assess/impact",
  "4rs": "/assess/4rs",
  "revenue-hhi": "/assess/revenue-hhi",
  dei: "/assess/dei",
};

export function AssessmentRecommendations({ orgId }: { orgId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const { data } = await supabase
        .from("assessment_responses")
        .select("assessment_type,score,maturity_level,completed_at")
        .eq("organization_id", orgId)
        .not("completed_at", "is", null)
        .order("updated_at", { ascending: false });
      // de-dupe by type (keep most recent)
      const seen = new Set<string>();
      const dedup: Row[] = [];
      for (const r of (data as Row[]) ?? []) {
        if (seen.has(r.assessment_type)) continue;
        seen.add(r.assessment_type);
        dedup.push(r);
      }
      setRows(dedup);
      setLoading(false);
    })();
  }, [orgId]);

  if (loading) return null;

  if (rows.length === 0) {
    return (
      <SectionCard
        title="Recommendations & evidence base"
        subtitle="Complete an assessment to unlock tailored next steps backed by citable research."
        className="mb-8"
      >
        <div className="text-sm text-slate-500 italic">
          No completed assessments yet.{" "}
          <Link to="/assess/health" className="text-brand-primary underline not-italic">
            Start with the Strategic Planning Health check →
          </Link>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Recommendations & evidence base"
      subtitle="Tailored next steps and citable research from each completed assessment."
      className="mb-8"
      padding="p-0"
    >
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => {
          const cfg = ALL[r.assessment_type as keyof typeof ALL];
          if (!cfg) return null;
          const score = r.score ?? 0;
          const rec = cfg.recommendations.find((x) => score >= x.score[0] && score <= x.score[1]);
          const route = ROUTE[r.assessment_type] ?? "/dashboard";
          return (
            <li key={r.assessment_type} className="p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">
                    {cfg.framework}
                  </span>
                  <h3 className="text-lg font-serif italic mt-1">{cfg.title}</h3>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-serif tabular-nums text-brand-deep">{score}<span className="text-sm text-slate-400">/100</span></div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">
                    {r.maturity_level ?? rec?.maturity ?? "—"}
                  </div>
                </div>
              </div>

              {rec && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                      <Sparkles className="size-3 text-brand-accent" /> Recommended next steps
                    </div>
                    <ul className="space-y-1.5">
                      {rec.advice.map((a) => (
                        <li key={a} className="text-sm text-slate-700 leading-snug">• {a}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                      <BookOpen className="size-3 text-brand-primary" /> Cite this work
                    </div>
                    <ul className="space-y-2">
                      {cfg.references.slice(0, 3).map((ref) => (
                        <li key={ref.url} className="text-sm">
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-brand-deep hover:text-brand-primary inline-flex items-start gap-1 leading-snug"
                          >
                            {ref.title}
                            <ExternalLink className="size-3 shrink-0 mt-0.5 opacity-60" />
                          </a>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {ref.source}{ref.year ? ` · ${ref.year}` : ""}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <Link
                to={route}
                className="mt-4 inline-block text-xs text-brand-primary hover:underline"
              >
                View full assessment →
              </Link>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
