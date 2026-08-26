import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
} from "@/components/app-shell/AppShell";
import { GripVertical, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useCurrentPlan } from "@/hooks/use-current-plan";
import { toast } from "sonner";

type Pillar = {
  id: string;
  name: string;
  description: string | null;
  owner: string | null;
  color: string | null;
  sort_order: number;
};

const PALETTE = ["#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#0F172A"];

export const Route = createFileRoute("/_authenticated/plan/priorities")({
  head: () => ({ meta: [{ title: "Strategic Priorities — NMM Navigator" }] }),
  component: PrioritiesPage,
});

function PrioritiesPage() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const { planId, loading: planLoading } = useCurrentPlan(orgId);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("strategic_pillars")
      .select("id,name,description,owner,color,sort_order")
      .eq("organization_id", orgId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setPillars((data as Pillar[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function remove(id: string) {
    const { error } = await supabase.from("strategic_pillars").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setPillars((prev) => prev.filter((p) => p.id !== id));
  }

  const ready = !orgLoading && !planLoading && orgId && planId;

  return (
    <AppShell
      title="Strategic Priorities"
      subtitle="3–5 bold commitments that earn the right to be on every quarterly review."
      actions={
        <PrimaryButton onClick={() => setShowForm((s) => !s)} disabled={!ready}>
          <Plus className="size-3.5 inline-block -mt-0.5 mr-1" />
          {showForm ? "Close" : "Priority"}
        </PrimaryButton>
      }
    >
      {(orgLoading || planLoading || loading) && (
        <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>
      )}

      {ready && showForm && (
        <NewPillarForm
          orgId={orgId!}
          planId={planId!}
          nextSort={pillars.length}
          defaultColor={PALETTE[pillars.length % PALETTE.length]}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {ready && !loading && pillars.length === 0 && !showForm && (
        <SectionCard>
          <p className="text-sm text-slate-500 text-center py-8">
            No priorities yet. Click <b>+ Priority</b> to add your first one.
          </p>
        </SectionCard>
      )}

      {ready && !loading && pillars.length > 0 && (
        <SectionCard padding="p-2">
          <ul className="divide-y divide-slate-100">
            {pillars.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center gap-4 p-4 hover:bg-slate-50/60 rounded-lg group"
              >
                <GripVertical className="size-4 text-slate-300" />
                <div
                  className="size-10 rounded-full text-white flex items-center justify-center font-serif text-lg shrink-0"
                  style={{ background: p.color || "#0f172a" }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{p.name}</p>
                  {(p.owner || p.description) && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {p.owner ? `${p.owner}` : ""}
                      {p.owner && p.description ? " · " : ""}
                      {p.description ?? ""}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => remove(p.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600"
                  aria-label="Delete priority"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </AppShell>
  );
}

function NewPillarForm({
  orgId,
  planId,
  nextSort,
  defaultColor,
  onCreated,
  onCancel,
}: {
  orgId: string;
  planId: string;
  nextSort: number;
  defaultColor: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("strategic_pillars").insert({
      organization_id: orgId,
      plan_id: planId,
      name: name.trim(),
      description: description.trim() || null,
      owner: owner.trim() || null,
      color,
      sort_order: nextSort,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Priority added");
    onCreated();
  }

  return (
    <SectionCard title="New priority">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <label className="md:col-span-2 text-xs">
          <span className="block text-slate-500 mb-1">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
            placeholder="e.g. Programmatic Excellence"
          />
        </label>
        <label className="md:col-span-2 text-xs">
          <span className="block text-slate-500 mb-1">Short description</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
            placeholder="One line of context"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Owner</span>
          <input
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
            placeholder="Name or role"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Color</span>
          <div className="flex items-center gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`size-6 rounded-full border-2 ${color === c ? "border-slate-900" : "border-transparent"}`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </label>
        <div className="md:col-span-6 flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onCancel}>Cancel</GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save priority"}
          </PrimaryButton>
        </div>
      </form>
    </SectionCard>
  );
}
