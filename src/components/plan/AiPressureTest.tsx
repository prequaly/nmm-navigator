import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2 } from "lucide-react";
import { SectionCard } from "@/components/app-shell/AppShell";
import { AiSuggestionCard } from "@/components/ai/AiSuggestionCard";
import { supabase } from "@/integrations/supabase/client";
import { pressureTestAssumptions, type PressureTestResult } from "@/lib/ai/recommend.functions";
import { toast } from "sonner";

const SEVERITY_TO_LIKELIHOOD_IMPACT: Record<string, number> = { low: 2, medium: 3, high: 4 };

export function AiPressureTest({ orgId, planId }: { orgId: string; planId: string }) {
  const run = useServerFn(pressureTestAssumptions);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PressureTestResult | null>(null);

  async function go() {
    setLoading(true);
    try {
      const r = await run({ data: { organizationId: orgId } });
      setResult(r as PressureTestResult);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pressure test failed");
    } finally {
      setLoading(false);
    }
  }

  async function acceptAsRisk(values: Record<string, string>) {
    const li = SEVERITY_TO_LIKELIHOOD_IMPACT[values.severity] ?? 3;
    const { error } = await supabase.from("risks").insert({
      organization_id: orgId,
      plan_id: planId,
      title: values.title,
      category: "Financial",
      likelihood: li,
      impact: li,
      mitigation: values.suggestedMitigation,
      status: "open",
    });
    if (error) throw error;
    toast.success("Added to risk register");
  }

  return (
    <SectionCard
      title="AI Pressure Test"
      subtitle="Analyzes your real revenue, expenses, and grants pipeline for unrealistic or risky assumptions — the FR's own example: 3 programs, 1 employee, $75k budget."
      right={
        <button
          onClick={go}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-medium bg-brand-deep text-white px-3 py-1.5 rounded-md hover:bg-brand-deep/90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {loading ? "Testing…" : result ? "Re-test" : "Pressure-test my budget"}
        </button>
      }
      className="mb-6"
    >
      {!result && !loading && (
        <p className="text-sm text-slate-500 italic">
          Click "Pressure-test my budget" to have the AI Strategist look for concentration risk and
          unrealistic growth assumptions in your actual numbers.
        </p>
      )}
      {result && result.findings.length === 0 && (
        <p className="text-sm text-emerald-700 italic">
          No concerning findings — your budget looks reasonably grounded.
        </p>
      )}
      {result && result.findings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {result.findings.map((f, i) => (
            <AiSuggestionCard
              key={i}
              badge={f.severity}
              fields={[
                { key: "title", label: "Title", value: f.title },
                { key: "explanation", label: "Why", value: f.explanation, multiline: true },
                {
                  key: "suggestedMitigation",
                  label: "Mitigation",
                  value: f.suggestedMitigation,
                  multiline: true,
                },
                { key: "severity", label: "Severity", value: f.severity },
              ]}
              onAccept={acceptAsRisk}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}
