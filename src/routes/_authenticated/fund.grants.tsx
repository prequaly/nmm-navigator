import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell, SectionCard, PrimaryButton, GhostButton, EmptyState } from "@/components/app-shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Plus, Calendar, Trash2, Save, Banknote } from "lucide-react";
import { toast } from "sonner";
import { currency, type GrantRow } from "@/lib/finance/projections";

export const Route = createFileRoute("/_authenticated/fund/grants")({
  head: () => ({ meta: [{ title: "Grants — NMM Navigator" }] }),
  component: GrantsPage,
});

const STATUSES = ["prospect", "applied", "pending", "awarded", "active", "closed", "declined"] as const;
const TYPES = ["general_operating", "program", "capital", "capacity_building", "multi_year", "in_kind", "other"] as const;
const RESTRICTIONS = ["unrestricted", "temporarily_restricted", "permanently_restricted"] as const;

const STATUS_TONE: Record<string, string> = {
  prospect: "bg-slate-100 text-slate-600",
  applied: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
  awarded: "bg-emerald-100 text-emerald-700",
  active: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-100 text-slate-600",
  declined: "bg-rose-100 text-rose-700",
};

type DraftGrant = Partial<GrantRow> & { organization_id?: string };

function GrantsPage() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<DraftGrant | null>(null);

  async function load() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("grants")
      .select("*")
      .eq("organization_id", orgId)
      .order("start_date", { ascending: true, nullsFirst: false });
    if (error) toast.error(error.message);
    setGrants((data as GrantRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (orgId) load();
  }, [orgId]);

  const totals = useMemo(() => {
    let committed = 0;
    let weighted = 0;
    let pipeline = 0;
    for (const g of grants) {
      const committedAmount = Number(g.amount_awarded ?? 0);
      const requested = Number(g.amount_requested ?? 0);
      if (["awarded", "active", "closed"].includes(g.status)) committed += committedAmount;
      else if (g.status !== "declined") {
        pipeline += requested;
        weighted += requested * (g.probability / 100);
      }
    }
    return { committed, weighted, pipeline };
  }, [grants]);

  async function save() {
    if (!editing || !orgId) return;
    if (!editing.funder_name || !editing.grant_name) {
      toast.error("Funder and grant name required");
      return;
    }
    const payload: any = {
      organization_id: orgId,
      funder_name: editing.funder_name,
      grant_name: editing.grant_name,
      grant_type: editing.grant_type ?? "program",
      status: editing.status ?? "prospect",
      restriction: editing.restriction ?? "temporarily_restricted",
      program_area: editing.program_area ?? null,
      amount_requested: editing.amount_requested ?? null,
      amount_awarded: editing.amount_awarded ?? null,
      probability: editing.probability ?? 0,
      start_date: editing.start_date || null,
      end_date: editing.end_date || null,
    };
    let error;
    if (editing.id) {
      ({ error } = await supabase.from("grants").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("grants").insert(payload));
    }
    if (error) return toast.error(error.message);
    toast.success("Grant saved");
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this grant?")) return;
    const { error } = await supabase.from("grants").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  return (
    <AppShell
      title="Grants"
      subtitle="Track funder commitments and pipeline with start/end dates — the pro-forma reads from this directly."
      actions={
        <>
          <GhostButton onClick={() => window.location.assign("/fund/proforma")}>View pro-forma →</GhostButton>
          <PrimaryButton
            onClick={() =>
              setEditing({
                grant_type: "program",
                status: "prospect",
                restriction: "temporarily_restricted",
                probability: 0,
              })
            }
          >
            <Plus className="size-3.5 inline -mt-0.5 mr-1" />
            New grant
          </PrimaryButton>
        </>
      }
    >
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SummaryTile label="Committed" value={totals.committed} tone="emerald" />
        <SummaryTile label="Pipeline (gross)" value={totals.pipeline} tone="slate" />
        <SummaryTile label="Probability-weighted" value={totals.weighted} tone="blue" />
      </div>

      <SectionCard title="Grant register" subtitle="Status, period, and amount drive your projection." padding="p-0">
        {orgLoading || loading ? (
          <div className="p-10 text-sm text-slate-500 text-center">Loading…</div>
        ) : !orgId ? (
          <div className="p-10 text-sm text-slate-500 text-center">
            No organization found. <a href="/profile" className="text-brand-primary underline">Set up your organization →</a>
          </div>
        ) : grants.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Banknote}
              title="No grants yet"
              description="Track every funder relationship — from cold prospect to closed award. Status, dates, and amount flow straight into your pro-forma and revenue gap."
              action={
                <PrimaryButton
                  onClick={() =>
                    setEditing({
                      grant_type: "program",
                      status: "prospect",
                      restriction: "temporarily_restricted",
                      probability: 0,
                    })
                  }
                >
                  <Plus className="size-3.5 inline -mt-0.5 mr-1" /> Add first grant
                </PrimaryButton>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="text-left p-3">Funder / Grant</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Period</th>
                  <th className="text-right p-3">Requested</th>
                  <th className="text-right p-3">Awarded</th>
                  <th className="text-right p-3">Prob.</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => (
                  <tr key={g.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="p-3">
                      <button
                        onClick={() => setEditing(g)}
                        className="text-left font-medium text-slate-800 hover:text-brand-primary"
                      >
                        {g.funder_name}
                      </button>
                      <div className="text-xs text-slate-500">{g.grant_name}</div>
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${STATUS_TONE[g.status] || "bg-slate-100 text-slate-600"}`}>
                        {g.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-600">
                      {g.start_date && g.end_date ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="size-3 text-slate-400" />
                          {new Date(g.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })} →{" "}
                          {new Date(g.end_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No period</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-slate-600 tabular-nums">
                      {g.amount_requested ? currency(Number(g.amount_requested)) : "—"}
                    </td>
                    <td className="p-3 text-right text-slate-800 tabular-nums font-medium">
                      {g.amount_awarded ? currency(Number(g.amount_awarded)) : "—"}
                    </td>
                    <td className="p-3 text-right text-slate-500 tabular-nums">{g.probability}%</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => remove(g.id)}
                        className="text-slate-300 hover:text-rose-600"
                        title="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Edit drawer */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-stretch justify-end" onClick={() => setEditing(null)}>
          <div
            className="w-full max-w-lg bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-medium text-slate-900">{editing.id ? "Edit grant" : "New grant"}</h2>
              <p className="text-xs text-slate-500 mt-1">
                Start & end dates determine how revenue is spread in the pro-forma.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <Field label="Funder">
                <input
                  className="input"
                  value={editing.funder_name ?? ""}
                  onChange={(e) => setEditing({ ...editing, funder_name: e.target.value })}
                />
              </Field>
              <Field label="Grant name">
                <input
                  className="input"
                  value={editing.grant_name ?? ""}
                  onChange={(e) => setEditing({ ...editing, grant_name: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Type">
                  <select
                    className="input"
                    value={editing.grant_type ?? "program"}
                    onChange={(e) => setEditing({ ...editing, grant_type: e.target.value as any })}
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    className="input"
                    value={editing.status ?? "prospect"}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Restriction">
                <select
                  className="input"
                  value={editing.restriction ?? "temporarily_restricted"}
                  onChange={(e) => setEditing({ ...editing, restriction: e.target.value as any })}
                >
                  {RESTRICTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Program area">
                <input
                  className="input"
                  value={editing.program_area ?? ""}
                  onChange={(e) => setEditing({ ...editing, program_area: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Start date">
                  <input
                    type="date"
                    className="input"
                    value={editing.start_date ?? ""}
                    onChange={(e) => setEditing({ ...editing, start_date: e.target.value })}
                  />
                </Field>
                <Field label="End date">
                  <input
                    type="date"
                    className="input"
                    value={editing.end_date ?? ""}
                    onChange={(e) => setEditing({ ...editing, end_date: e.target.value })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Requested ($)">
                  <input
                    type="number"
                    className="input"
                    value={editing.amount_requested ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, amount_requested: e.target.value ? Number(e.target.value) : null })
                    }
                  />
                </Field>
                <Field label="Awarded ($)">
                  <input
                    type="number"
                    className="input"
                    value={editing.amount_awarded ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, amount_awarded: e.target.value ? Number(e.target.value) : null })
                    }
                  />
                </Field>
                <Field label="Probability (%)">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="input"
                    value={editing.probability ?? 0}
                    onChange={(e) => setEditing({ ...editing, probability: Number(e.target.value) })}
                  />
                </Field>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-2">
              <GhostButton onClick={() => setEditing(null)}>Cancel</GhostButton>
              <PrimaryButton onClick={save}>
                <Save className="size-3.5 inline -mt-0.5 mr-1" />
                Save
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input {
          width: 100%;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: white;
          color: rgb(15 23 42);
        }
        .input:focus { outline: 2px solid rgb(37 99 235 / 0.3); border-color: rgb(37 99 235); }
      `}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: "emerald" | "slate" | "blue" }) {
  const toneClasses = {
    emerald: "border-emerald-200 bg-emerald-50/60",
    slate: "border-slate-200 bg-white",
    blue: "border-blue-200 bg-blue-50/60",
  }[tone];
  return (
    <div className={`border rounded-xl p-5 ${toneClasses}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-2 tabular-nums">{currency(value)}</p>
    </div>
  );
}
