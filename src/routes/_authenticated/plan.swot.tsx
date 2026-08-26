import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PrimaryButton } from "@/components/app-shell/AppShell";
import { SWOT } from "@/lib/mock/riverside";
import { useState } from "react";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/plan/swot")({
  head: () => ({ meta: [{ title: "SWOT Matrix — NMM Navigator" }] }),
  component: SwotPage,
});

const QUADS = [
  { key: "strengths", label: "STRENGTHS", tone: "text-emerald-600", bg: "bg-emerald-50" },
  { key: "weaknesses", label: "WEAKNESSES", tone: "text-rose-600", bg: "bg-rose-50" },
  { key: "opportunities", label: "OPPORTUNITIES", tone: "text-sky-600", bg: "bg-sky-50" },
  { key: "threats", label: "THREATS", tone: "text-amber-600", bg: "bg-amber-50" },
] as const;

function SwotPage() {
  const [data, setData] = useState<Record<string, string[]>>({ ...SWOT });
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  return (
    <AppShell
      title="SWOT Matrix"
      subtitle="Internal (Strengths/Weaknesses) and external (Opportunities/Threats). Synthesize before you set priorities."
      actions={<PrimaryButton>Export SWOT</PrimaryButton>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {QUADS.map((q) => (
          <div key={q.key} className={`rounded-2xl border border-slate-200 ${q.bg} p-6`}>
            <div className={`text-xs font-bold tracking-widest mb-4 ${q.tone}`}>{q.label}</div>
            <ul className="space-y-2 text-sm">
              {(data[q.key] ?? []).map((item, i) => (
                <li key={i} className="flex items-start gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200 group">
                  <span className="text-slate-300">•</span>
                  <span className="flex-1 text-slate-700">{item}</span>
                  <button
                    onClick={() => setData({ ...data, [q.key]: data[q.key].filter((_, ii) => ii !== i) })}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <input
                value={drafts[q.key] ?? ""}
                onChange={(e) => setDrafts({ ...drafts, [q.key]: e.target.value })}
                placeholder="Add an item…"
                className="flex-1 px-3 py-2 text-sm bg-white rounded-lg border border-slate-200"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && drafts[q.key]) {
                    setData({ ...data, [q.key]: [...(data[q.key] ?? []), drafts[q.key]] });
                    setDrafts({ ...drafts, [q.key]: "" });
                  }
                }}
              />
              <button
                onClick={() => {
                  if (!drafts[q.key]) return;
                  setData({ ...data, [q.key]: [...(data[q.key] ?? []), drafts[q.key]] });
                  setDrafts({ ...drafts, [q.key]: "" });
                }}
                className="px-3 py-2 bg-brand-deep text-white rounded-lg text-sm"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
