import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
  EmptyState,
} from "@/components/app-shell/AppShell";
import { Layers, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/execute/programs")({
  head: () => ({ meta: [{ title: "Programs & Events — NMM Navigator" }] }),
  component: ProgramsPage,
});

type Program = {
  id: string;
  name: string;
  type: string;
  participants: number | null;
  budget: number | null;
  status: string;
};

function ProgramsPage() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("programs")
      .select("id,name,type,participants,budget,status")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setPrograms((data as Program[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function remove(id: string) {
    const { error } = await supabase.from("programs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setPrograms((prev) => prev.filter((p) => p.id !== id));
  }

  const ready = !orgLoading && !loading;

  return (
    <AppShell
      title="Programs & Events"
      subtitle="Every program connects to a strategic priority, a budget line, and an evaluation plan."
      actions={
        <PrimaryButton onClick={() => setShowForm((s) => !s)} disabled={!ready}>
          {showForm ? "Close" : "+ New program"}
        </PrimaryButton>
      }
    >
      {!ready && <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>}

      {ready && showForm && (
        <NewProgramForm
          orgId={orgId!}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {ready && !showForm && programs.length === 0 && (
        <EmptyState
          icon={Layers}
          title="No programs tracked yet"
          description="Add the programs and recurring events you run — each can link to a strategic priority so the roadmap and budget reflect real work."
          action={<PrimaryButton onClick={() => setShowForm(true)}>+ New program</PrimaryButton>}
        />
      )}

      {ready && programs.length > 0 && (
        <SectionCard padding="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="text-left p-5 font-semibold">Name</th>
                <th className="text-left p-5 font-semibold">Type</th>
                <th className="text-left p-5 font-semibold">Participants</th>
                <th className="text-left p-5 font-semibold">Budget</th>
                <th className="text-left p-5 font-semibold">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {programs.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 group">
                  <td className="p-5 font-medium text-slate-900">{p.name}</td>
                  <td className="p-5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                        p.type === "Program"
                          ? "bg-brand-primary/10 text-brand-primary"
                          : "bg-brand-accent/10 text-brand-accent"
                      }`}
                    >
                      {p.type}
                    </span>
                  </td>
                  <td className="p-5 text-slate-600 tabular-nums">{p.participants ?? "—"}</td>
                  <td className="p-5 text-slate-600 tabular-nums">
                    {p.budget != null ? `$${p.budget.toLocaleString()}` : "—"}
                  </td>
                  <td className="p-5 text-slate-500">{p.status}</td>
                  <td className="p-5">
                    <button
                      onClick={() => remove(p.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600"
                      aria-label={`Delete ${p.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}
    </AppShell>
  );
}

function NewProgramForm({
  orgId,
  onCreated,
  onCancel,
}: {
  orgId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Program");
  const [participants, setParticipants] = useState("");
  const [budget, setBudget] = useState("");
  const [status, setStatus] = useState("planning");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("programs").insert({
      organization_id: orgId,
      name: name.trim(),
      type,
      participants: participants ? Number(participants) : null,
      budget: budget ? Number(budget) : null,
      status,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Program added");
    onCreated();
  }

  return (
    <SectionCard title="New program" className="mb-6">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <label className="md:col-span-2 text-xs">
          <span className="block text-slate-500 mb-1">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          >
            <option value="Program">Program</option>
            <option value="Event">Event</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Participants</span>
          <input
            type="number"
            min={0}
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Budget ($)</span>
          <input
            type="number"
            min={0}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          >
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="complete">Complete</option>
          </select>
        </label>
        <div className="md:col-span-5 flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onCancel}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save program"}
          </PrimaryButton>
        </div>
      </form>
    </SectionCard>
  );
}
