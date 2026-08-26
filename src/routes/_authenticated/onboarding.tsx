import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { seedSampleData } from "@/lib/demo/seed";
import { toast } from "sonner";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building2,
  Heart,
  ClipboardCheck,
  Target,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — NMM Navigator" }] }),
  component: OnboardingWizard,
});

const STEPS = [
  { key: "org", label: "Organization", icon: Building2 },
  { key: "values", label: "Core Values", icon: Heart },
  { key: "health", label: "Quick Health Check", icon: ClipboardCheck },
  { key: "priority", label: "First Priority", icon: Target },
] as const;

const VALUE_SUGGESTIONS = [
  "Integrity",
  "Community first",
  "Equity",
  "Excellence",
  "Collaboration",
  "Transparency",
  "Innovation",
  "Compassion",
  "Stewardship",
  "Accountability",
  "Inclusion",
  "Sustainability",
];

const HEALTH_QUESTIONS = [
  { id: "mission_clarity", label: "Our mission is clearly defined and shared by the whole team." },
  { id: "strategic_plan", label: "We have a written strategic plan that's actively used." },
  { id: "board_engagement", label: "Our board is engaged and contributes beyond meetings." },
  { id: "financial_visibility", label: "We have real-time visibility into our financial position." },
  { id: "outcome_tracking", label: "We track program outcomes against measurable goals." },
] as const;

function OnboardingWizard() {
  const navigate = useNavigate();
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1: org
  const [name, setName] = useState("");
  const [mission, setMission] = useState("");
  const [budget, setBudget] = useState<string>("");
  const [fyStart, setFyStart] = useState("01-01");

  // Step 2: values
  const [values, setValues] = useState<string[]>([]);
  const [customValue, setCustomValue] = useState("");

  // Step 3: health
  const [scores, setScores] = useState<Record<string, number>>({});

  // Step 4: priority
  const [pillarName, setPillarName] = useState("");
  const [pillarGoal, setPillarGoal] = useState("");

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("name,mission,annual_budget,values,onboarded_at")
        .eq("id", orgId)
        .maybeSingle();
      if (!data) return;
      if (data.onboarded_at) {
        // Already done — redirect
        navigate({ to: "/dashboard" });
        return;
      }
      setName(data.name || "");
      setMission(data.mission || "");
      setBudget(data.annual_budget ? String(data.annual_budget) : "");
      if (data.values) {
        try {
          const parsed = JSON.parse(data.values);
          if (Array.isArray(parsed)) setValues(parsed.map(String));
        } catch {
          setValues(data.values.split(/[,\n]/).map((s) => s.trim()).filter(Boolean));
        }
      }
    })();
  }, [orgId, navigate]);

  function toggleValue(v: string) {
    setValues((cur) =>
      cur.includes(v) ? cur.filter((x) => x !== v) : cur.length >= 5 ? cur : [...cur, v],
    );
  }

  function addCustomValue() {
    const trimmed = customValue.trim();
    if (!trimmed || values.includes(trimmed) || values.length >= 5) return;
    setValues((cur) => [...cur, trimmed]);
    setCustomValue("");
  }

  async function skipAll() {
    if (!orgId) return;
    if (!confirm("Skip the setup wizard? You can edit everything later.")) return;
    await supabase.from("organizations").update({ onboarded_at: new Date().toISOString() }).eq("id", orgId);
    navigate({ to: "/dashboard" });
  }

  async function loadDemo() {
    if (!orgId) return;
    if (!confirm("Load the 'Riverside Youth Arts' sample organization? This populates your current workspace with demo data so you can explore every feature.")) return;
    setSaving(true);
    try {
      await seedSampleData(orgId);
      toast.success("Sample data loaded");
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load sample data");
      setSaving(false);
    }
  }


  async function finish() {
    if (!orgId) return;
    setSaving(true);
    try {
      // 1. Org fields
      await supabase
        .from("organizations")
        .update({
          name: name || "My Organization",
          mission,
          annual_budget: budget ? Number(budget) : null,
          values: JSON.stringify(values),
          onboarded_at: new Date().toISOString(),
        })
        .eq("id", orgId);

      // Get-or-create a strategic plan for this org (required FK for pillars / responses)
      let planId: string | null = null;
      const { data: existingPlan } = await supabase
        .from("strategic_plans")
        .select("id")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (existingPlan) {
        planId = existingPlan.id;
      } else if (pillarName.trim() || Object.keys(scores).length) {
        const year = new Date().getFullYear();
        const { data: created, error: planErr } = await supabase
          .from("strategic_plans")
          .insert({
            organization_id: orgId,
            name: `${year} Strategic Plan`,
            fiscal_year_start: year,
            planning_horizon_years: 3,
            status: "active",
          })
          .select("id")
          .single();
        if (planErr) throw planErr;
        planId = created.id;
      }

      // 2. First strategic pillar (if provided)
      if (pillarName.trim() && planId) {
        await supabase.from("strategic_pillars").insert({
          organization_id: orgId,
          plan_id: planId,
          name: pillarName.trim(),
          description: pillarGoal.trim() || null,
          sort_order: 1,
        });
      }

      // 3. Health check scores saved as a single assessment_responses row
      const scoreEntries = Object.entries(scores);
      if (scoreEntries.length && planId) {
        const avg =
          scoreEntries.reduce((a, [, v]) => a + Number(v), 0) / scoreEntries.length;
        await supabase.from("assessment_responses").insert({
          organization_id: orgId,
          plan_id: planId,
          assessment_type: "planning_health_quick",
          responses: Object.fromEntries(scoreEntries),
          score: Math.round(avg * 20), // 1-5 → 20-100
          completed_at: new Date().toISOString(),
        });
      }


      toast.success("Welcome aboard! Your foundation is set.");
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e?.message ?? "Setup failed");
    } finally {
      setSaving(false);
    }
  }


  if (orgLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-brand-surface">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-surface flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 bg-brand-deep rounded-lg flex items-center justify-center">
            <Sparkles className="size-4 text-white" />
          </div>
          <span className="font-serif italic text-xl tracking-tight">Welcome to NMM Navigator</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDemo}
            disabled={saving}
            className="text-sm font-medium text-brand-deep hover:text-brand-deep/80 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="size-3.5" />
            Load sample data
          </button>
          <span className="text-slate-300">•</span>
          <button
            onClick={skipAll}
            className="text-sm text-slate-500 hover:text-slate-900 underline-offset-2 hover:underline"
          >
            Skip for now
          </button>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-3xl mx-auto w-full px-6 pt-8">
        <ol className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <li key={s.key} className="flex items-center gap-2 flex-1">
                <div
                  className={`size-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                        ? "bg-brand-deep text-white"
                        : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {done ? <Check className="size-4" /> : <Icon className="size-4" />}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:block ${
                    active ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-px ${done ? "bg-emerald-500" : "bg-slate-200"}`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Body */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {step === 0 && (
            <StepShell
              icon={Building2}
              title="Tell us about your organization"
              subtitle="The basics — you can refine everything later in Org Profile."
            >
              <Field label="Organization name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Riverside Youth Arts Collective"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
                />
              </Field>
              <Field label="Mission (one sentence)">
                <textarea
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  rows={3}
                  placeholder="What does your organization exist to do?"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-y"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Annual budget (USD)">
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="500000"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
                  />
                </Field>
                <Field label="Fiscal year start (MM-DD)">
                  <input
                    value={fyStart}
                    onChange={(e) => setFyStart(e.target.value)}
                    placeholder="07-01"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
                  />
                </Field>
              </div>
            </StepShell>
          )}

          {step === 1 && (
            <StepShell
              icon={Heart}
              title="Pick 3–5 core values"
              subtitle="The values you operate by. Choose from suggestions or add your own."
            >
              <div className="flex flex-wrap gap-2">
                {VALUE_SUGGESTIONS.map((v) => {
                  const on = values.includes(v);
                  return (
                    <button
                      key={v}
                      onClick={() => toggleValue(v)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        on
                          ? "bg-brand-deep text-white border-brand-deep"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {on && <Check className="size-3 inline -mt-0.5 mr-1" />}
                      {v}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-2">
                <input
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomValue())}
                  placeholder="Add your own…"
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={addCustomValue}
                  disabled={!customValue.trim() || values.length >= 5}
                  className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  Add
                </button>
              </div>

              {values.length > 0 && (
                <div className="text-xs text-slate-500 pt-2">
                  {values.length} of 5 selected · {values.join(" • ")}
                </div>
              )}
            </StepShell>
          )}

          {step === 2 && (
            <StepShell
              icon={ClipboardCheck}
              title="Quick health check"
              subtitle="Rate each statement 1 (strongly disagree) to 5 (strongly agree). This sets your baseline."
            >
              <div className="space-y-5">
                {HEALTH_QUESTIONS.map((q) => (
                  <div key={q.id}>
                    <p className="text-sm text-slate-800 mb-2">{q.label}</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((n) => {
                        const on = scores[q.id] === n;
                        return (
                          <button
                            key={n}
                            onClick={() => setScores((s) => ({ ...s, [q.id]: n }))}
                            className={`size-10 rounded-lg text-sm font-medium border transition-colors ${
                              on
                                ? "bg-brand-deep text-white border-brand-deep"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                            }`}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell
              icon={Target}
              title="Your first strategic priority"
              subtitle="What's the one thing you most need to move forward in the next 90 days?"
            >
              <Field label="Priority name">
                <input
                  value={pillarName}
                  onChange={(e) => setPillarName(e.target.value)}
                  placeholder="e.g., Diversify funding base"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
                />
              </Field>
              <Field label="90-day goal (optional)">
                <textarea
                  value={pillarGoal}
                  onChange={(e) => setPillarGoal(e.target.value)}
                  rows={3}
                  placeholder="What does success look like in 90 days?"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-y"
                />
              </Field>
              <p className="text-xs text-slate-500 pt-2">
                You can add more pillars and priorities anytime in Plan → Strategic Builder.
              </p>
            </StepShell>
          )}
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 disabled:opacity-30"
          >
            <ArrowLeft className="size-4" /> Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-deep text-white rounded-lg text-sm font-medium hover:bg-brand-deep/90"
            >
              Continue <ArrowRight className="size-4" />
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-deep text-white rounded-lg text-sm font-medium hover:bg-brand-deep/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Finish setup
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

function StepShell({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: any;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="size-10 rounded-lg bg-brand-deep/10 text-brand-deep flex items-center justify-center">
          <Icon className="size-5" />
        </div>
        <div>
          <h2 className="font-serif italic text-2xl text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
