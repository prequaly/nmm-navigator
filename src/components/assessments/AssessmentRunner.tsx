import { useEffect, useState, type ReactNode } from "react";
import { AppShell, SectionCard, PrimaryButton, GhostButton } from "@/components/app-shell/AppShell";
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useCurrentPlan } from "@/hooks/use-current-plan";
import { toast } from "sonner";
import { AiDraftButton } from "@/components/ai/AiDraftButton";
import { draftNarrative } from "@/lib/ai/draft.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  type Answer,
  type Answers,
  type AnswerStatus,
  computeScore,
  isAnswered,
  normalizeAnswers,
} from "@/lib/assessments/scoring";

export type AssessmentQuestion = {
  id: string;
  prompt: string;
  helper?: string;
  /** Only set for questions that need elapsed time/track record a brand-new
   * org cannot have yet (a year of audits, donor retention, "in the last 12
   * months" framing) — those default to N/A for new orgs. Every other
   * question defaults to "projected" for a new org (still answerable as an
   * intention) and "historical" for an established one; most questions
   * don't need this hint at all. */
  newOrgDefault?: "na";
};

export type AssessmentReference = {
  title: string;
  source: string;
  year?: number;
  url: string;
  insight: string;
};

export type AssessmentConfig = {
  title: string;
  subtitle: string;
  framework: string;
  durationMin: number;
  scaleLabel?: [string, string];
  questions: AssessmentQuestion[];
  recommendations: { score: [number, number]; maturity: string; tone: string; advice: string[] }[];
  references: AssessmentReference[];
};

export function AssessmentRunner({
  config,
  assessmentType,
  resultsExtra,
}: {
  config: AssessmentConfig;
  assessmentType: string;
  resultsExtra?: ReactNode;
}) {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const { planId, loading: planLoading } = useCurrentPlan(orgId);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [orgStage, setOrgStage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loadingPrev, setLoadingPrev] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reflection, setReflection] = useState<string>("");
  const draft = useServerFn(draftNarrative);

  // A new/pre-launch org shouldn't see historical questions defaulted as if
  // they had a track record — these two stages are "new" for this purpose.
  const isNewOrg = orgStage === "exploring" || orgStage === "new_launch";

  function defaultStatusFor(question: AssessmentQuestion): AnswerStatus {
    if (!isNewOrg) return "historical";
    return question.newOrgDefault === "na" ? "na" : "projected";
  }

  // Load org stage + latest saved response (if any) for this org+plan+type.
  useEffect(() => {
    if (!orgId || !planId) return;
    let cancelled = false;
    setLoadingPrev(true);
    (async () => {
      const [{ data: org }, { data, error }] = await Promise.all([
        supabase.from("organizations").select("stage").eq("id", orgId).maybeSingle(),
        supabase
          .from("assessment_responses")
          .select("id,responses,completed_at")
          .eq("organization_id", orgId)
          .eq("plan_id", planId)
          .eq("assessment_type", assessmentType)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (org) setOrgStage(org.stage);
      if (error) toast.error(error.message);
      if (data) {
        setExistingId(data.id);
        setAnswers(normalizeAnswers(data.responses as Record<string, unknown>));
        if (data.completed_at) setDone(true);
      }
      setLoadingPrev(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, planId, assessmentType]);

  const total = config.questions.length;
  const answeredCount = config.questions.filter((qq) => isAnswered(answers[qq.id])).length;
  const pct = Math.round((answeredCount / total) * 100);

  const q = config.questions[step];
  const current: Answer = q
    ? (answers[q.id] ?? { status: defaultStatusFor(q), value: null })
    : { status: "historical", value: null };

  const score = computeScore(answers);
  const rec = config.recommendations.find((r) => score >= r.score[0] && score <= r.score[1]);

  function setAnswer(id: string, next: Answer) {
    const nextAnswers = { ...answers, [id]: next };
    setAnswers(nextAnswers);
    void (async () => {
      if (!orgId || !planId) return;
      const { data: u } = await supabase.auth.getUser();
      const payload = {
        organization_id: orgId,
        plan_id: planId,
        assessment_type: assessmentType,
        responses: nextAnswers,
        created_by: u.user?.id ?? null,
      };
      if (existingId) {
        await supabase.from("assessment_responses").update(payload).eq("id", existingId);
      } else {
        const { data } = await supabase
          .from("assessment_responses")
          .insert(payload)
          .select("id")
          .single();
        if (data) setExistingId(data.id);
      }
    })();
  }

  async function persist(complete: boolean) {
    if (!orgId || !planId) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const payload = {
      organization_id: orgId,
      plan_id: planId,
      assessment_type: assessmentType,
      responses: answers,
      score: complete ? score : null,
      maturity_level: complete ? (rec?.maturity ?? null) : null,
      completed_at: complete ? new Date().toISOString() : null,
      created_by: u.user?.id ?? null,
    };
    if (existingId) {
      const { error } = await supabase
        .from("assessment_responses")
        .update(payload)
        .eq("id", existingId);
      if (error) toast.error(error.message);
    } else {
      const { data, error } = await supabase
        .from("assessment_responses")
        .insert(payload)
        .select("id")
        .single();
      if (error) toast.error(error.message);
      else if (data) setExistingId(data.id);
    }
    setSaving(false);
  }

  async function finish() {
    await persist(true);
    setDone(true);
    toast.success("Assessment saved");
  }

  async function retake() {
    setDone(false);
    setStep(0);
    setAnswers({});
    if (existingId) {
      await supabase.from("assessment_responses").delete().eq("id", existingId);
      setExistingId(null);
    }
  }

  if (orgLoading || planLoading || loadingPrev) {
    return (
      <AppShell title={config.title} subtitle={config.subtitle}>
        <SectionCard>
          <div className="flex items-center gap-3 text-slate-500 text-sm py-8 justify-center">
            <Loader2 className="size-4 animate-spin" /> Loading your saved progress…
          </div>
        </SectionCard>
      </AppShell>
    );
  }

  if (done) {
    return (
      <AppShell title={`${config.title} — Results`} subtitle={config.subtitle}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-brand-deep text-white rounded-2xl p-8 lg:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-brand-primary/20 to-transparent pointer-events-none" />
            <div className="relative">
              <span className="bg-brand-accent/20 text-brand-accent text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                {config.framework}
              </span>
              <div className="flex items-baseline gap-3 mt-6">
                <span className="text-7xl font-serif">{score}</span>
                <span className="text-2xl text-slate-400 font-sans">/100</span>
              </div>
              <p className="text-lg font-serif italic mt-2 text-brand-accent">{rec?.maturity}</p>
              <p className="text-slate-400 mt-4 max-w-md text-sm">{rec?.tone}</p>
            </div>
          </div>
          <SectionCard title="Recommended next steps">
            <ul className="space-y-3">
              {rec?.advice.map((a) => (
                <li key={a} className="flex gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="size-4 text-brand-accent shrink-0 mt-0.5" /> {a}
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        {config.references.length > 0 && (
          <SectionCard
            title="Evidence base & further reading"
            subtitle="Research and practitioner sources behind the framework — cite these when justifying next steps to your board."
            className="mb-6"
          >
            <ul className="divide-y divide-slate-100">
              {config.references.map((r) => (
                <li key={r.url} className="py-4 first:pt-0 last:pb-0">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-brand-deep hover:text-brand-primary underline-offset-4 hover:underline"
                  >
                    {r.title}
                  </a>
                  <p className="text-[11px] uppercase tracking-widest text-slate-400 mt-1">
                    {r.source}
                    {r.year ? ` · ${r.year}` : ""}
                  </p>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{r.insight}</p>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        <SectionCard
          title="Leadership reflection"
          right={
            <AiDraftButton
              label={reflection ? "Regenerate" : "Draft with AI"}
              onDraft={async () => {
                if (!orgId) throw new Error("No organization");
                const res = await draft({
                  data: {
                    kind: "assessment_reflection",
                    organizationId: orgId,
                    assessment: {
                      title: config.title,
                      framework: config.framework,
                      score,
                      maturity: rec?.maturity ?? "—",
                      answers: config.questions.map((qq) => ({
                        prompt: qq.prompt,
                        value: answers[qq.id]?.status === "na" ? 0 : (answers[qq.id]?.value ?? 0),
                      })),
                    },
                  },
                });
                setReflection(res.text);
                return res;
              }}
            />
          }
        >
          {reflection ? (
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
              {reflection}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic flex items-center gap-2">
              <Sparkles className="size-3.5 text-brand-primary" />
              Generate a two-paragraph reflection on what's working and the most important 90-day
              move.
            </p>
          )}
        </SectionCard>

        {resultsExtra}

        <SectionCard title="Your answers">
          <ul className="divide-y divide-slate-100">
            {config.questions.map((qq, i) => {
              const a = answers[qq.id];
              return (
                <li key={qq.id} className="py-3 flex items-start gap-4">
                  <span className="text-xs font-bold text-slate-400 w-6 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm text-slate-700 flex-1">{qq.prompt}</p>
                  {a?.status === "na" ? (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                      N/A
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-brand-primary tabular-nums w-8 text-right">
                      {a?.value ?? "–"}/5
                    </span>
                  )}
                  {a?.status === "projected" && (
                    <span className="text-[9px] font-bold uppercase tracking-widest text-brand-accent">
                      Planned
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            onClick={retake}
            className="mt-6 text-xs font-medium text-brand-primary hover:underline"
          >
            Retake assessment
          </button>
        </SectionCard>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={config.title}
      subtitle={config.subtitle}
      actions={
        <span className="text-xs italic text-slate-400">
          ~{config.durationMin} min • {saving ? "Saving…" : "Auto-saved"}
        </span>
      }
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="font-medium text-slate-600 italic">
            Question {step + 1} of {total}
          </span>
          <span className="font-medium text-slate-500">{pct}% complete</span>
        </div>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-accent rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <SectionCard padding="p-10">
        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">
          {config.framework}
        </span>
        <h2 className="text-3xl font-serif italic mt-3 leading-tight max-w-2xl">{q.prompt}</h2>
        {q.helper && <p className="text-sm text-slate-500 mt-3 max-w-xl">{q.helper}</p>}

        <div className="mt-8 flex flex-wrap gap-2">
          {(
            [
              ["historical", "This is true today"],
              ["projected", "This is our plan, not yet true"],
              ["na", "Not yet applicable — we're a new organization"],
            ] as [AnswerStatus, string][]
          ).map(([status, label]) => (
            <button
              key={status}
              onClick={() =>
                setAnswer(q.id, { status, value: status === "na" ? null : current.value })
              }
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                current.status === status
                  ? "bg-brand-deep text-white border-brand-deep"
                  : "bg-white text-slate-600 border-slate-200 hover:border-brand-primary/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {current.status === "na" ? (
            <p className="text-sm text-slate-500 italic bg-slate-50 border border-slate-200 rounded-xl px-4 py-6 text-center">
              Marked not yet applicable — this won't count against your score.
            </p>
          ) : (
            <>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                <span>{config.scaleLabel?.[0] ?? "Strongly disagree"}</span>
                <span>{config.scaleLabel?.[1] ?? "Strongly agree"}</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setAnswer(q.id, { status: current.status, value: n })}
                    className={`py-6 rounded-xl border text-2xl font-serif transition-all ${
                      current.value === n
                        ? "bg-brand-deep text-white border-brand-deep shadow-md"
                        : "border-slate-200 text-slate-600 hover:border-brand-primary/40 hover:bg-slate-50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between mt-10">
          <GhostButton onClick={() => setStep(Math.max(0, step - 1))}>
            <ChevronLeft className="size-3.5 inline -mt-0.5" /> Previous
          </GhostButton>
          {step === total - 1 ? (
            <PrimaryButton onClick={finish}>Finish & view results</PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => setStep(Math.min(total - 1, step + 1))}>
              Next <ChevronRight className="size-3.5 inline -mt-0.5" />
            </PrimaryButton>
          )}
        </div>
      </SectionCard>
    </AppShell>
  );
}

export function makeAssessment(
  override: Partial<AssessmentConfig> &
    Pick<AssessmentConfig, "title" | "subtitle" | "framework" | "questions">,
): AssessmentConfig {
  return {
    durationMin: 8,
    recommendations: [
      {
        score: [0, 40],
        maturity: "Emerging",
        tone: "You're in early stages. Focus on building foundations.",
        advice: [
          "Document current state",
          "Identify top 3 gaps",
          "Set a 90-day improvement target",
        ],
      },
      {
        score: [41, 70],
        maturity: "Developing",
        tone: "Real structure is in place but key gaps remain.",
        advice: [
          "Tighten weakest dimension",
          "Add one board-level metric",
          "Schedule a quarterly review",
        ],
      },
      {
        score: [71, 100],
        maturity: "Strong",
        tone: "You're operating with discipline and clarity.",
        advice: [
          "Mentor peer organizations",
          "Stretch to a longer horizon",
          "Codify your playbook",
        ],
      },
    ],
    references: [],
    ...override,
  };
}
