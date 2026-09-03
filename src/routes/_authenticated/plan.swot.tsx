import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PrimaryButton } from "@/components/app-shell/AppShell";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useCurrentPlan } from "@/hooks/use-current-plan";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/plan/swot")({
  head: () => ({ meta: [{ title: "SWOT Matrix — NMM Navigator" }] }),
  component: SwotPage,
});

type Quadrant = "strengths" | "weaknesses" | "opportunities" | "threats";
type SwotItem = { id: string; quadrant: Quadrant; text: string; sort_order: number };

const QUADS: { key: Quadrant; label: string; tone: string; bg: string }[] = [
  { key: "strengths", label: "STRENGTHS", tone: "text-emerald-600", bg: "bg-emerald-50" },
  { key: "weaknesses", label: "WEAKNESSES", tone: "text-rose-600", bg: "bg-rose-50" },
  { key: "opportunities", label: "OPPORTUNITIES", tone: "text-sky-600", bg: "bg-sky-50" },
  { key: "threats", label: "THREATS", tone: "text-amber-600", bg: "bg-amber-50" },
];

function SwotPage() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const { planId, loading: planLoading } = useCurrentPlan(orgId);
  const [items, setItems] = useState<SwotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function refresh() {
    if (!planId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("swot_items")
      .select("id,quadrant,text,sort_order")
      .eq("plan_id", planId)
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setItems((data as SwotItem[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId || !planId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, planId]);

  async function addItem(quadrant: Quadrant) {
    const text = (drafts[quadrant] ?? "").trim();
    if (!text || !orgId || !planId) return;
    const sort_order = items.filter((i) => i.quadrant === quadrant).length;
    const { data, error } = await supabase
      .from("swot_items")
      .insert({ organization_id: orgId, plan_id: planId, quadrant, text, sort_order })
      .select("id,quadrant,text,sort_order")
      .single();
    if (error) return toast.error(error.message);
    setItems((prev) => [...prev, data as SwotItem]);
    setDrafts({ ...drafts, [quadrant]: "" });
  }

  async function removeItem(id: string) {
    const { error } = await supabase.from("swot_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const ready = !orgLoading && !planLoading && !loading;

  return (
    <AppShell
      title="SWOT Matrix"
      subtitle="Internal (Strengths/Weaknesses) and external (Opportunities/Threats). Synthesize before you set priorities."
    >
      {!ready && <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>}

      {ready && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {QUADS.map((q) => {
            const list = items.filter((i) => i.quadrant === q.key);
            return (
              <div key={q.key} className={`rounded-2xl border border-slate-200 ${q.bg} p-6`}>
                <div className={`text-xs font-bold tracking-widest mb-4 ${q.tone}`}>{q.label}</div>
                <ul className="space-y-2 text-sm">
                  {list.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200 group"
                    >
                      <span className="text-slate-300">•</span>
                      <span className="flex-1 text-slate-700">{item.text}</span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                  {list.length === 0 && (
                    <li className="text-xs text-slate-400 italic px-1">Nothing here yet.</li>
                  )}
                </ul>
                <div className="mt-3 flex gap-2">
                  <input
                    value={drafts[q.key] ?? ""}
                    onChange={(e) => setDrafts({ ...drafts, [q.key]: e.target.value })}
                    placeholder="Add an item…"
                    className="flex-1 px-3 py-2 text-sm bg-white rounded-lg border border-slate-200"
                    onKeyDown={(e) => e.key === "Enter" && addItem(q.key)}
                  />
                  <button
                    onClick={() => addItem(q.key)}
                    className="px-3 py-2 bg-brand-deep text-white rounded-lg text-sm"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
