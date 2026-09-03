import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
  EmptyState,
} from "@/components/app-shell/AppShell";
import { ResponsiveContainer, PieChart as RPieChart, Pie, Cell } from "recharts";
import { PieChart, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fund/donor-segments")({
  head: () => ({ meta: [{ title: "Donor Segments — NMM Navigator" }] }),
  component: DonorSegments,
});

type Segment = {
  id: string;
  label: string;
  donor_count: number;
  total_amount: number;
  retention_pct: number | null;
  yoy_change_pct: number | null;
  color: string;
};

function DonorSegments() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("donor_segments")
      .select("id,label,donor_count,total_amount,retention_pct,yoy_change_pct,color")
      .eq("organization_id", orgId)
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setSegments((data as Segment[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function remove(id: string) {
    const { error } = await supabase.from("donor_segments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setSegments((prev) => prev.filter((s) => s.id !== id));
  }

  const ready = !orgLoading && !loading;
  const totalDonors = segments.reduce((a, b) => a + b.donor_count, 0);
  const totalRevenue = segments.reduce((a, b) => a + b.total_amount, 0);
  const avgRetention =
    totalDonors > 0
      ? Math.round(
          (segments.reduce((a, b) => a + (b.retention_pct ?? 0) * b.donor_count, 0) / totalDonors) *
            100,
        )
      : 0;

  return (
    <AppShell
      title="Donor Segmentation"
      subtitle="Who gives, how much, and how loyal — entered as rollup totals per segment rather than a full donor database."
      actions={
        <PrimaryButton onClick={() => setShowForm((s) => !s)} disabled={!ready}>
          {showForm ? "Close" : "+ Segment"}
        </PrimaryButton>
      }
    >
      {!ready && <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>}

      {ready && showForm && (
        <NewSegmentForm
          orgId={orgId!}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {ready && !showForm && segments.length === 0 && (
        <EmptyState
          icon={PieChart}
          title="No donor segments tracked yet"
          description="Enter aggregate totals for your giving segments — major donors, mid-level, sustainers, and so on — to see revenue mix and retention at a glance."
          action={<PrimaryButton onClick={() => setShowForm(true)}>+ Segment</PrimaryButton>}
        />
      )}

      {ready && !showForm && segments.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Stat label="Total donors" value={totalDonors.toLocaleString()} />
            <Stat label="Total giving revenue" value={`$${(totalRevenue / 1000).toFixed(0)}k`} />
            <Stat
              label="Weighted avg. retention"
              value={`${avgRetention}%`}
              hint="Weighted by donor count"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SectionCard title="Revenue by segment" className="lg:col-span-2" padding="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="text-left p-3">Segment</th>
                      <th className="text-right p-3">Donors</th>
                      <th className="text-right p-3">Total</th>
                      <th className="text-right p-3">Avg gift</th>
                      <th className="text-right p-3">Retention</th>
                      <th className="text-right p-3">YoY</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {segments.map((s) => {
                      const avg = s.donor_count > 0 ? s.total_amount / s.donor_count : 0;
                      return (
                        <tr
                          key={s.id}
                          className="border-t border-slate-100 hover:bg-slate-50/60 group"
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="size-2 rounded-full"
                                style={{ background: s.color }}
                              />
                              <span className="font-medium text-slate-800">{s.label}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right text-slate-600 tabular-nums">
                            {s.donor_count}
                          </td>
                          <td className="p-3 text-right font-medium text-brand-deep tabular-nums">
                            ${(s.total_amount / 1000).toFixed(0)}k
                          </td>
                          <td className="p-3 text-right text-slate-500 tabular-nums">
                            ${avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          <td className="p-3 text-right tabular-nums">
                            {s.retention_pct != null ? (
                              <span
                                className={
                                  s.retention_pct >= 0.8
                                    ? "text-emerald-600"
                                    : s.retention_pct >= 0.6
                                      ? "text-amber-600"
                                      : "text-rose-600"
                                }
                              >
                                {Math.round(s.retention_pct * 100)}%
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {s.yoy_change_pct != null ? (
                              <span
                                className={`inline-flex items-center gap-0.5 tabular-nums text-xs ${s.yoy_change_pct >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                              >
                                {s.yoy_change_pct >= 0 ? (
                                  <ArrowUpRight className="size-3" />
                                ) : (
                                  <ArrowDownRight className="size-3" />
                                )}
                                {Math.abs(Math.round(s.yoy_change_pct * 100))}%
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => remove(s.id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="Revenue mix">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie
                      data={segments}
                      dataKey="total_amount"
                      innerRadius={42}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {segments.map((s) => (
                        <Cell key={s.id} fill={s.color} />
                      ))}
                    </Pie>
                  </RPieChart>
                </ResponsiveContainer>
              </div>
              <ul className="text-xs space-y-1.5 mt-3">
                {segments
                  .slice()
                  .sort((a, b) => b.total_amount - a.total_amount)
                  .slice(0, 4)
                  .map((s) => (
                    <li key={s.id} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-slate-600 truncate">
                        <span className="size-2 rounded-full" style={{ background: s.color }} />
                        {s.label}
                      </span>
                      <span className="tabular-nums text-slate-500">
                        {totalRevenue > 0 ? Math.round((s.total_amount / totalRevenue) * 100) : 0}%
                      </span>
                    </li>
                  ))}
              </ul>
            </SectionCard>
          </div>
        </>
      )}
    </AppShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-3xl font-serif text-brand-deep mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function NewSegmentForm({
  orgId,
  onCreated,
  onCancel,
}: {
  orgId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [donorCount, setDonorCount] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [retention, setRetention] = useState("");
  const [yoyChange, setYoyChange] = useState("");
  const [color, setColor] = useState("#0f172a");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("donor_segments").insert({
      organization_id: orgId,
      label: label.trim(),
      donor_count: Number(donorCount) || 0,
      total_amount: Number(totalAmount) || 0,
      retention_pct: retention ? Number(retention) / 100 : null,
      yoy_change_pct: yoyChange ? Number(yoyChange) / 100 : null,
      color,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Segment added");
    onCreated();
  }

  return (
    <SectionCard title="New segment" className="mb-6">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <label className="md:col-span-2 text-xs">
          <span className="block text-slate-500 mb-1">Segment name</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            placeholder="e.g. Major donors ($10k+)"
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Donor count</span>
          <input
            type="number"
            min={0}
            value={donorCount}
            onChange={(e) => setDonorCount(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Total ($)</span>
          <input
            type="number"
            min={0}
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Retention (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={retention}
            onChange={(e) => setRetention(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">YoY change (%)</span>
          <input
            type="number"
            value={yoyChange}
            onChange={(e) => setYoyChange(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <div className="md:col-span-6 flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onCancel}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save segment"}
          </PrimaryButton>
        </div>
      </form>
    </SectionCard>
  );
}
