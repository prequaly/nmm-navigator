import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
  EmptyState,
} from "@/components/app-shell/AppShell";
import { Users2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/plan/stakeholders")({
  head: () => ({ meta: [{ title: "Stakeholder Map — NMM Navigator" }] }),
  component: StakeholderMap,
});

type StakeholderType = "Funder" | "Partner" | "Beneficiary" | "Regulator" | "Peer" | "Influencer";
type Relationship = "strong" | "neutral" | "at-risk" | "none";
type Stakeholder = {
  id: string;
  name: string;
  type: StakeholderType;
  interest: number;
  influence: number;
  relationship: Relationship;
  owner: string | null;
};

const TYPES: StakeholderType[] = [
  "Funder",
  "Partner",
  "Beneficiary",
  "Regulator",
  "Peer",
  "Influencer",
];
const TYPE_COLOR: Record<StakeholderType, string> = {
  Funder: "#2563eb",
  Partner: "#10b981",
  Beneficiary: "#f59e0b",
  Regulator: "#dc2626",
  Peer: "#8b5cf6",
  Influencer: "#ec4899",
};
const REL_TONE: Record<Relationship, string> = {
  strong: "bg-emerald-100 text-emerald-700 border-emerald-200",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  "at-risk": "bg-amber-100 text-amber-700 border-amber-200",
  none: "bg-rose-100 text-rose-700 border-rose-200",
};

function StakeholderMap() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState<StakeholderType | "all">("all");

  async function refresh() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("stakeholders")
      .select("id,name,type,interest,influence,relationship,owner")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setStakeholders((data as Stakeholder[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function remove(id: string) {
    const { error } = await supabase.from("stakeholders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setStakeholders((prev) => prev.filter((s) => s.id !== id));
  }

  const ready = !orgLoading && !loading;
  const filtered =
    typeFilter === "all" ? stakeholders : stakeholders.filter((s) => s.type === typeFilter);
  const cellKey = (interest: number, influence: number) => `${interest}-${influence}`;
  const groups: Record<string, Stakeholder[]> = {};
  for (const s of filtered) (groups[cellKey(s.interest, s.influence)] ||= []).push(s);

  return (
    <AppShell
      title="Stakeholder Map"
      subtitle="Who cares vs. who can move things. Manage closely, keep satisfied, keep informed, or monitor."
      actions={
        <>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as StakeholderType | "all")}
            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white"
          >
            <option value="all">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <PrimaryButton onClick={() => setShowForm((s) => !s)} disabled={!ready}>
            {showForm ? "Close" : "+ Stakeholder"}
          </PrimaryButton>
        </>
      }
    >
      {!ready && <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>}

      {ready && showForm && (
        <NewStakeholderForm
          orgId={orgId!}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {ready && !showForm && stakeholders.length === 0 && (
        <EmptyState
          icon={Users2}
          title="No stakeholders mapped yet"
          description="Add the funders, partners, beneficiaries, regulators, and influencers who shape your organization's success — and see who needs the closest attention."
          action={<PrimaryButton onClick={() => setShowForm(true)}>+ Stakeholder</PrimaryButton>}
        />
      )}

      {ready && !showForm && stakeholders.length > 0 && (
        <>
          <div className="flex flex-wrap gap-3 mb-6 text-xs">
            {Object.entries(TYPE_COLOR).map(([t, c]) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: c }} />
                <span className="text-slate-600">{t}</span>
              </span>
            ))}
          </div>

          <SectionCard
            title="Interest × Influence grid"
            subtitle="Top-right = manage closely. Top-left = keep satisfied. Bottom-right = keep informed. Bottom-left = monitor."
          >
            <div className="relative">
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Influence →
              </div>
              <div className="ml-8">
                <div className="grid grid-cols-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <span>Keep satisfied</span>
                  <span className="text-right">Manage closely</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 border border-slate-200 rounded-lg p-1.5 bg-slate-50/50">
                  {[5, 4, 3, 2, 1].flatMap((influence) =>
                    [1, 2, 3, 4, 5].map((interest) => {
                      const cell = groups[cellKey(interest, influence)] ?? [];
                      const isManageClosely = interest >= 4 && influence >= 4;
                      const isKeepSatisfied = interest <= 2 && influence >= 4;
                      const isKeepInformed = interest >= 4 && influence <= 2;
                      const isMonitor = interest <= 2 && influence <= 2;
                      const tint = isManageClosely
                        ? "bg-brand-accent/5"
                        : isKeepSatisfied
                          ? "bg-amber-50"
                          : isKeepInformed
                            ? "bg-brand-primary/5"
                            : isMonitor
                              ? "bg-slate-100/60"
                              : "bg-white";
                      return (
                        <div
                          key={`${influence}-${interest}`}
                          className={`min-h-[110px] rounded-md border border-slate-100 p-1.5 ${tint}`}
                        >
                          <div className="space-y-1">
                            {cell.map((s) => (
                              <div
                                key={s.id}
                                title={`${s.name} · ${s.type} · ${s.relationship} · ${s.owner ?? "unassigned"}`}
                                className="text-[10px] font-medium px-1.5 py-1 rounded leading-tight text-white truncate"
                                style={{ background: TYPE_COLOR[s.type] }}
                              >
                                {s.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }),
                  )}
                </div>
                <div className="grid grid-cols-2 mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <span>Monitor</span>
                  <span className="text-right">Keep informed</span>
                </div>
                <div className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">
                  Interest →
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Stakeholders" subtitle="Full register" padding="p-0" className="mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="text-left p-3">Stakeholder</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Interest</th>
                    <th className="text-left p-3">Influence</th>
                    <th className="text-left p-3">Relationship</th>
                    <th className="text-left p-3">Owner</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/60 group">
                      <td className="p-3 font-medium text-slate-800">{s.name}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                          <span
                            className="size-2 rounded-full"
                            style={{ background: TYPE_COLOR[s.type] }}
                          />
                          {s.type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 tabular-nums">{s.interest}/5</td>
                      <td className="p-3 text-slate-500 tabular-nums">{s.influence}/5</td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full ${REL_TONE[s.relationship]}`}
                        >
                          {s.relationship}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{s.owner ?? "—"}</td>
                      <td className="p-3">
                        <button
                          onClick={() => remove(s.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}
    </AppShell>
  );
}

function NewStakeholderForm({
  orgId,
  onCreated,
  onCancel,
}: {
  orgId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<StakeholderType>("Funder");
  const [interest, setInterest] = useState(3);
  const [influence, setInfluence] = useState(3);
  const [relationship, setRelationship] = useState<Relationship>("neutral");
  const [owner, setOwner] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("stakeholders").insert({
      organization_id: orgId,
      name: name.trim(),
      type,
      interest,
      influence,
      relationship,
      owner: owner.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Stakeholder added");
    onCreated();
  }

  return (
    <SectionCard title="New stakeholder" className="mb-6">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
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
            onChange={(e) => setType(e.target.value as StakeholderType)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Interest (1–5)</span>
          <input
            type="number"
            min={1}
            max={5}
            value={interest}
            onChange={(e) => setInterest(Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Influence (1–5)</span>
          <input
            type="number"
            min={1}
            max={5}
            value={influence}
            onChange={(e) => setInfluence(Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Relationship</span>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value as Relationship)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          >
            <option value="strong">Strong</option>
            <option value="neutral">Neutral</option>
            <option value="at-risk">At risk</option>
            <option value="none">None</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Owner</span>
          <input
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <div className="md:col-span-6 flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onCancel}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save stakeholder"}
          </PrimaryButton>
        </div>
      </form>
    </SectionCard>
  );
}
