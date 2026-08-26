import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, SectionCard, PrimaryButton } from "@/components/app-shell/AppShell";
import { ORG } from "@/lib/mock/riverside";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/values")({
  head: () => ({ meta: [{ title: "Core Values — NMM Navigator" }] }),
  component: ValuesPage,
});

function ValuesPage() {
  const [values, setValues] = useState(
    ORG.values.map((v) => ({
      id: crypto.randomUUID(),
      name: v,
      description: "",
    })),
  );

  return (
    <AppShell
      title="Core Values"
      subtitle="The non-negotiables your team uses to make decisions when no policy applies."
      actions={
        <PrimaryButton
          onClick={() =>
            setValues([...values, { id: crypto.randomUUID(), name: "New value", description: "" }])
          }
        >
          <Plus className="size-3.5 inline mr-1" /> Add value
        </PrimaryButton>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {values.map((v, i) => (
          <SectionCard key={v.id} padding="p-6">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">
                Value {i + 1}
              </span>
              <button
                onClick={() => setValues(values.filter((x) => x.id !== v.id))}
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
              className="text-2xl font-serif italic w-full bg-transparent border-0 outline-none focus:bg-slate-50 px-2 -mx-2 rounded"
            />
            <textarea
              rows={3}
              placeholder="How does this value show up in everyday decisions?"
              value={v.description}
              onChange={(e) =>
                setValues(values.map((x) => (x.id === v.id ? { ...x, description: e.target.value } : x)))
              }
              className="w-full mt-4 px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </SectionCard>
        ))}
      </div>
    </AppShell>
  );
}
