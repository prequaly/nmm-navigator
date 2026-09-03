import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, SectionCard, PrimaryButton } from "@/components/app-shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/values")({
  head: () => ({ meta: [{ title: "Core Values — NMM Navigator" }] }),
  component: ValuesPage,
});

// organizations.values is a single text field (comma-separated names — the
// same field profile.tsx already reads/writes). Values here don't have a
// separate description column, so "description" is not persisted yet; the
// field stays editable for now but is local-only until a real schema need
// for it shows up elsewhere.
type ValueRow = { id: string; name: string; description: string };

function parseValues(raw: string | null): ValueRow[] {
  return (raw ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((name) => ({ id: crypto.randomUUID(), name, description: "" }));
}

function ValuesPage() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const [values, setValues] = useState<ValueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("organizations")
        .select("values")
        .eq("id", orgId)
        .single();
      if (error) toast.error(error.message);
      setValues(parseValues(data?.values ?? null));
      setLoading(false);
    })();
  }, [orgId]);

  async function persist(next: ValueRow[]) {
    setValues(next);
    if (!orgId) return;
    setSaving(true);
    const raw = next
      .map((v) => v.name.trim())
      .filter(Boolean)
      .join(", ");
    const { error } = await supabase.from("organizations").update({ values: raw }).eq("id", orgId);
    setSaving(false);
    if (error) toast.error(error.message);
  }

  const ready = !orgLoading && !loading;

  return (
    <AppShell
      title="Core Values"
      subtitle="The non-negotiables your team uses to make decisions when no policy applies."
      actions={
        <PrimaryButton
          disabled={!ready || saving}
          onClick={() =>
            persist([...values, { id: crypto.randomUUID(), name: "New value", description: "" }])
          }
        >
          <Plus className="size-3.5 inline mr-1" /> Add value
        </PrimaryButton>
      }
    >
      {!ready && <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>}

      {ready && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {values.map((v, i) => (
            <SectionCard key={v.id} padding="p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">
                  Value {i + 1}
                </span>
                <button
                  onClick={() => persist(values.filter((x) => x.id !== v.id))}
                  className="text-slate-400 hover:text-rose-500"
                >
                  <X className="size-4" />
                </button>
              </div>
              <input
                value={v.name}
                onChange={(e) =>
                  setValues(values.map((x) => (x.id === v.id ? { ...x, name: e.target.value } : x)))
                }
                onBlur={() => persist(values)}
                className="text-2xl font-serif italic w-full bg-transparent border-0 outline-none focus:bg-slate-50 px-2 -mx-2 rounded"
              />
            </SectionCard>
          ))}
          {values.length === 0 && (
            <p className="text-sm text-slate-500 col-span-2 py-8 text-center">
              No values yet — add your first one, or set them during onboarding.
            </p>
          )}
        </div>
      )}
    </AppShell>
  );
}
