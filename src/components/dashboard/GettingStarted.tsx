import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Check, ChevronRight, Compass, Sparkles, X } from "lucide-react";
import { seedSampleData, clearSampleData, orgHasData } from "@/lib/demo/seed";

type Step = {
  id: string;
  title: string;
  description: string;
  to: string;
  done: boolean;
};

const DISMISS_KEY = "nmm.gettingStarted.dismissed";

export function GettingStarted({ orgId }: { orgId: string }) {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    }
  }, []);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const [org, assessments, pillars, kpis, grants, revenue] = await Promise.all([
        supabase.from("organizations").select("mission,vision").eq("id", orgId).maybeSingle(),
        supabase.from("assessment_responses").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("strategic_pillars").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("kpis").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("grants").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("revenue_streams").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      ]);

      setSteps([
        {
          id: "profile",
          title: "Complete your organization profile",
          description: "Mission, vision, and the basics — every other module pulls from this.",
          to: "/profile",
          done: !!(org.data?.mission && org.data?.vision),
        },
        {
          id: "health",
          title: "Take the Health Check",
          description: "A 10-minute self-assessment that surfaces your highest-leverage priorities.",
          to: "/assess/health",
          done: (assessments.count ?? 0) > 0,
        },
        {
          id: "pillars",
          title: "Define 3 strategic pillars",
          description: "The backbone of your plan — what you'll focus on for the next 1–3 years.",
          to: "/plan/builder",
          done: (pillars.count ?? 0) >= 1,
        },
        {
          id: "kpis",
          title: "Add measurable KPIs",
          description: "Make your strategy real with 3–5 numbers you'll review every month.",
          to: "/plan/kpis",
          done: (kpis.count ?? 0) >= 1,
        },
        {
          id: "money",
          title: "Track funding",
          description: "Log a grant or a revenue stream so the pro-forma starts working for you.",
          to: "/fund/grants",
          done: (grants.count ?? 0) > 0 || (revenue.count ?? 0) > 0,
        },
      ]);
    })();
  }, [orgId]);

  if (dismissed || !steps) return null;

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = completed === total;
  const nextStep = steps.find((s) => !s.done);
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="mb-8 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm overflow-hidden">
      <div className="p-6 flex items-start justify-between gap-4 border-b border-slate-100">
        <div className="flex gap-4 min-w-0">
          <div className="size-10 rounded-xl bg-brand-deep text-white flex items-center justify-center shrink-0">
            <Compass className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-serif italic text-slate-900">
              {allDone ? "You're set up — nice work" : "Start here"}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {allDone
                ? "Every foundation is in place. Use the dashboard to track progress."
                : `${completed} of ${total} foundations complete. ${nextStep ? `Next: ${nextStep.title}.` : ""}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
          }}
          className="text-slate-400 hover:text-slate-700 shrink-0"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="px-6 pt-4">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-deep transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ol className="p-2">
        {steps.map((step, i) => (
          <li key={step.id}>
            <Link
              to={step.to}
              className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <div
                className={`size-7 rounded-full flex items-center justify-center shrink-0 text-xs font-medium ${
                  step.done
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-white border border-slate-200 text-slate-500"
                }`}
              >
                {step.done ? <Check className="size-4" /> : i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    step.done ? "text-slate-400 line-through" : "text-slate-900"
                  }`}
                >
                  {step.title}
                </p>
                {!step.done && (
                  <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                )}
              </div>
              <ChevronRight className="size-4 text-slate-300 group-hover:text-slate-600 shrink-0" />
            </Link>
          </li>
        ))}
      </ol>

      <SampleDataFooter orgId={orgId} allDone={allDone} />
    </div>
  );
}

function SampleDataFooter({ orgId, allDone }: { orgId: string; allDone: boolean }) {
  const [busy, setBusy] = useState<"seed" | "clear" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    if (await orgHasData(orgId)) {
      if (!window.confirm("Your organization already has data. Loading sample data will add to it. Continue?")) {
        return;
      }
    }
    setBusy("seed");
    try {
      await seedSampleData(orgId);
      window.location.reload();
    } catch (e: any) {
      setError(e?.message ?? "Failed to load sample data.");
      setBusy(null);
    }
  };

  const clear = async () => {
    if (!window.confirm("Delete all data in this organization? This cannot be undone.")) return;
    setBusy("clear");
    setError(null);
    try {
      await clearSampleData(orgId);
      window.location.reload();
    } catch (e: any) {
      setError(e?.message ?? "Failed to clear data.");
      setBusy(null);
    }
  };

  return (
    <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <Sparkles className="size-4 text-amber-500 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">
            {allDone ? "Want to explore with sample data?" : "Just want to see what's possible?"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Load a realistic demo org (Riverside Youth Arts) — pillars, KPIs, grants, budget, risks, and more.
          </p>
          {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={clear}
          disabled={!!busy}
          className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1.5 rounded-md hover:bg-white disabled:opacity-50"
        >
          {busy === "clear" ? "Clearing…" : "Clear all data"}
        </button>
        <button
          onClick={load}
          disabled={!!busy}
          className="text-xs font-medium bg-brand-deep text-white px-3 py-1.5 rounded-md hover:bg-brand-deep/90 disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <Sparkles className="size-3.5" />
          {busy === "seed" ? "Loading sample…" : "Load sample data"}
        </button>
      </div>
    </div>
  );
}
