import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
  EmptyState,
} from "@/components/app-shell/AppShell";
import { HandCoins, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fund/asks-bank")({
  head: () => ({ meta: [{ title: "Asks Bank — NMM Navigator" }] }),
  component: AsksBank,
});

type AskType = "Program" | "Capital" | "Capacity" | "Operating";
type Ask = {
  id: string;
  title: string;
  type: AskType;
  amount: number;
  secured_amount: number;
  audience: string | null;
  status: string;
};

const TYPE_TONE: Record<AskType, string> = {
  Program: "bg-brand-primary/10 text-brand-primary",
  Capital: "bg-brand-accent/10 text-brand-accent",
  Capacity: "bg-amber-50 text-amber-700",
  Operating: "bg-slate-100 text-slate-700",
};

function AsksBank() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const [asks, setAsks] = useState<Ask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("asks")
      .select("id,title,type,amount,secured_amount,audience,status")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setAsks((data as Ask[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function remove(id: string) {
    const { error } = await supabase.from("asks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setAsks((prev) => prev.filter((a) => a.id !== id));
  }

  const ready = !orgLoading && !loading;

  return (
    <AppShell
      title="Asks Bank"
      subtitle="Every ask, ready to route to a donor, sponsor, grant, or board member."
      actions={
        <PrimaryButton onClick={() => setShowForm((s) => !s)} disabled={!ready}>
          {showForm ? "Close" : "+ New ask"}
        </PrimaryButton>
      }
    >
      {!ready && <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>}

      {ready && showForm && (
        <NewAskForm
          orgId={orgId!}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {ready && !showForm && asks.length === 0 && (
        <EmptyState
          icon={HandCoins}
          title="No asks yet"
          description="Turn a funding need into a concrete ask — a program, a capital project, a capacity investment, or general operating support."
          action={<PrimaryButton onClick={() => setShowForm(true)}>+ New ask</PrimaryButton>}
        />
      )}

      {ready && !showForm && asks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {asks.map((a) => (
            <SectionCard key={a.id} padding="p-6">
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${TYPE_TONE[a.type]}`}
                >
                  {a.type}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 italic">{a.status}</span>
                  <button
                    onClick={() => remove(a.id)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="text-2xl font-serif italic">{a.title}</h3>
              <div className="flex items-baseline gap-2 mt-4">
                <span className="text-4xl font-serif text-brand-deep">
                  ${(a.amount / 1000).toFixed(0)}k
                </span>
                <span className="text-xs text-slate-500">target</span>
                {a.secured_amount > 0 && (
                  <span className="text-xs text-emerald-600 ml-2">
                    ${(a.secured_amount / 1000).toFixed(0)}k secured
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-3">Audience: {a.audience ?? "—"}</p>
              <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
                <button
                  disabled
                  className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md text-slate-400 cursor-not-allowed"
                  title="AI-drafted language coming in a later pass"
                >
                  Donor version
                </button>
                <button
                  disabled
                  className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md text-slate-400 cursor-not-allowed"
                  title="AI-drafted language coming in a later pass"
                >
                  Grant version
                </button>
                <button
                  disabled
                  className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md text-slate-400 cursor-not-allowed"
                  title="AI-drafted language coming in a later pass"
                >
                  Board version
                </button>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function NewAskForm({
  orgId,
  onCreated,
  onCancel,
}: {
  orgId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<AskType>("Program");
  const [amount, setAmount] = useState("");
  const [securedAmount, setSecuredAmount] = useState("");
  const [audience, setAudience] = useState("");
  const [status, setStatus] = useState("open");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !amount) return;
    setSaving(true);
    const { error } = await supabase.from("asks").insert({
      organization_id: orgId,
      title: title.trim(),
      type,
      amount: Number(amount) || 0,
      secured_amount: Number(securedAmount) || 0,
      audience: audience.trim() || null,
      status,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Ask added");
    onCreated();
  }

  return (
    <SectionCard title="New ask" className="mb-6">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <label className="md:col-span-2 text-xs">
          <span className="block text-slate-500 mb-1">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AskType)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          >
            <option value="Program">Program</option>
            <option value="Capital">Capital</option>
            <option value="Capacity">Capacity</option>
            <option value="Operating">Operating</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Amount ($)</span>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Secured so far ($)</span>
          <input
            type="number"
            min={0}
            value={securedAmount}
            onChange={(e) => setSecuredAmount(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Audience</span>
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="e.g. Major donors"
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
            <option value="open">Open</option>
            <option value="in-discussion">In discussion</option>
            <option value="committed">Committed</option>
            <option value="declined">Declined</option>
          </select>
        </label>
        <div className="md:col-span-6 flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onCancel}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save ask"}
          </PrimaryButton>
        </div>
      </form>
    </SectionCard>
  );
}
