import { createFileRoute } from "@tanstack/react-router";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
} from "@/components/app-shell/AppShell";
import { ArrowRight, Sparkles, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/plan/theory-of-change")({
  head: () => ({ meta: [{ title: "Theory of Change — NMM Navigator" }] }),
  component: TheoryOfChange,
});

const COLUMNS = [
  {
    key: "inputs",
    label: "Inputs",
    helper: "Resources we invest",
    color: "#0f172a",
    items: [
      "$1.4M annual budget",
      "11 FTE staff + 65 active volunteers",
      "Riverside Studio space (3,200 sqft)",
      "Partnerships with 4 Title I schools",
      "Curriculum library (8 years)",
    ],
  },
  {
    key: "activities",
    label: "Activities",
    helper: "What we do",
    color: "#2563eb",
    items: [
      "After-school arts programming, 3 sites",
      "Summer intensives (6 weeks)",
      "Teaching artist residencies",
      "Family engagement nights (quarterly)",
      "Public showcases (4/yr)",
    ],
  },
  {
    key: "outputs",
    label: "Outputs",
    helper: "Direct, countable results",
    color: "#10b981",
    items: [
      "420 youth served annually",
      "12,600 program-hours delivered",
      "85 family engagement contacts",
      "4 public performances · 1,200 audience",
      "32 teaching artists trained",
    ],
  },
  {
    key: "outcomes",
    label: "Outcomes",
    helper: "Short & medium-term change",
    color: "#f59e0b",
    items: [
      "88% of youth report increased confidence (pre/post survey)",
      "School attendance +12% on program days",
      "76% advance to next-level program",
      "61% of families attend at least 2 events/yr",
      "Teaching artists report stronger pedagogy",
    ],
  },
  {
    key: "impact",
    label: "Impact",
    helper: "Long-term, population-level change",
    color: "#dc2626",
    items: [
      "Young people in Riverside have equitable access to sustained arts education",
      "A pipeline of artist-educators rooted in the community",
      "Families experience the arts as a vehicle for joy, voice, and belonging",
    ],
  },
];

const ASSUMPTIONS = [
  "Sustained arts engagement (>2 years) is what produces durable confidence and academic gains — single-semester exposure is not enough.",
  "Teaching artists from the community produce different outcomes than imported artists, particularly on belonging.",
  "Family engagement is a leading indicator of youth persistence in programming.",
  "Public showcases are not vanity — they shift how families and youth see themselves as artists.",
];

function TheoryOfChange() {
  return (
    <AppShell
      title="Theory of Change"
      subtitle="The throughline from what you invest to the world you're trying to create."
      actions={
        <>
          <GhostButton>
            <Sparkles className="size-3.5 inline -mt-0.5" /> AI suggest gaps
          </GhostButton>
          <PrimaryButton>Export as logic model</PrimaryButton>
        </>
      }
    >
      <SectionCard title="Logic chain" subtitle="Each column should connect causally to the next. If a link is fuzzy, your strategy is fuzzy.">
        <div className="overflow-x-auto -mx-6 px-6">
          <div className="flex items-stretch gap-3 min-w-[920px]">
            {COLUMNS.map((c, i) => (
              <div key={c.key} className="flex items-stretch gap-3 flex-1">
                <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100" style={{ background: `${c.color}10` }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: c.color }}>
                      {c.label}
                    </p>
                    <p className="text-xs text-slate-500 italic">{c.helper}</p>
                  </div>
                  <ul className="p-3 space-y-2">
                    {c.items.map((it, ii) => (
                      <li key={ii} className="text-xs text-slate-700 bg-slate-50 rounded-md p-2 leading-snug">
                        {it}
                      </li>
                    ))}
                    <button className="w-full text-[10px] font-medium text-slate-400 hover:text-brand-primary py-1 flex items-center justify-center gap-1">
                      <Plus className="size-3" /> Add
                    </button>
                  </ul>
                </div>
                {i < COLUMNS.length - 1 && (
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
        <SectionCard title="Key assumptions" subtitle="The 'if true, then this works' beliefs" className="lg:col-span-2">
          <ul className="space-y-3">
            {ASSUMPTIONS.map((a, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="text-xs font-bold text-slate-400 tabular-nums w-5 shrink-0 mt-0.5">A{i + 1}</span>
                <p className="text-slate-700 italic font-serif">"{a}"</p>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="External factors" subtitle="What we don't control">
          <ul className="space-y-2 text-sm text-slate-700">
            <li>· State arts funding stability</li>
            <li>· District policy on extended-day programming</li>
            <li>· Cost of teaching-artist labor in market</li>
            <li>· Family economic precarity in service area</li>
            <li>· Federal/state DEI policy environment</li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Ready to translate this into measurement?" className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-slate-600">
            Each outcome and output above should map to a tracked KPI in the KPI Library. AI can draft the indicators for you.
          </p>
          <PrimaryButton>
            <Sparkles className="size-3.5 inline -mt-0.5" /> Generate KPIs from this model
          </PrimaryButton>
        </div>
      </SectionCard>
    </AppShell>
  );
}
