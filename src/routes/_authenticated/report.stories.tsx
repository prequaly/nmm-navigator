import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
  EmptyState,
} from "@/components/app-shell/AppShell";
import { Quote, Camera, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/report/stories")({
  head: () => ({ meta: [{ title: "Beneficiary Stories — NMM Navigator" }] }),
  component: StoriesLibrary,
});

type Consent = "full" | "first-name-only" | "anonymous";
type Story = {
  id: string;
  subject_name: string;
  age: string | null;
  program: string | null;
  quote: string | null;
  outcome: string | null;
  consent: Consent;
  captured_on: string | null;
  tags: string[];
  uses: string[];
};

const CONSENT_TONE: Record<Consent, { label: string; tone: string }> = {
  full: { label: "Full consent", tone: "bg-emerald-100 text-emerald-700" },
  "first-name-only": { label: "First name only", tone: "bg-amber-100 text-amber-700" },
  anonymous: { label: "Anonymous", tone: "bg-slate-100 text-slate-700" },
};

function StoriesLibrary() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tag, setTag] = useState<string | null>(null);

  async function refresh() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("impact_stories")
      .select("id,subject_name,age,program,quote,outcome,consent,captured_on,tags,uses")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setStories((data as Story[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function remove(id: string) {
    const { error } = await supabase.from("impact_stories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setStories((prev) => prev.filter((s) => s.id !== id));
  }

  const ready = !orgLoading && !loading;
  const allTags = Array.from(new Set(stories.flatMap((s) => s.tags)));
  const filtered = tag ? stories.filter((s) => s.tags.includes(tag)) : stories;

  return (
    <AppShell
      title="Beneficiary Stories Library"
      subtitle="Narrative and quotes, tagged by program — ready to drop into grant apps, reports, and appeals."
      actions={
        <PrimaryButton onClick={() => setShowForm((s) => !s)} disabled={!ready}>
          <Plus className="size-3.5 inline -mt-0.5" /> {showForm ? "Close" : "Add story"}
        </PrimaryButton>
      }
    >
      {!ready && <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>}

      {ready && showForm && (
        <NewStoryForm
          orgId={orgId!}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {ready && !showForm && stories.length === 0 && (
        <EmptyState
          icon={Camera}
          title="No stories on file yet"
          description="Capture the quotes and outcomes that bring your impact to life — with clear consent tracking so you always know what's safe to use where."
          action={<PrimaryButton onClick={() => setShowForm(true)}>+ Add story</PrimaryButton>}
        />
      )}

      {ready && !showForm && stories.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Stat label="Stories on file" value={stories.length} hint="Active library" />
            <Stat
              label="Full consent"
              value={stories.filter((s) => s.consent === "full").length}
              hint="Cleared for public use"
            />
            <Stat label="Tags in use" value={allTags.length} />
          </div>

          <div className="flex flex-wrap gap-2 mb-6 text-xs">
            <button
              onClick={() => setTag(null)}
              className={`px-3 py-1.5 rounded-full border font-medium ${!tag ? "bg-brand-deep text-white border-brand-deep" : "bg-white text-slate-600 border-slate-200 hover:border-brand-primary/40"}`}
            >
              All tags
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setTag(t)}
                className={`px-3 py-1.5 rounded-full border font-medium ${tag === t ? "bg-brand-deep text-white border-brand-deep" : "bg-white text-slate-600 border-slate-200 hover:border-brand-primary/40"}`}
              >
                #{t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filtered.map((s) => {
              const c = CONSENT_TONE[s.consent];
              return (
                <SectionCard key={s.id}>
                  <div className="flex items-start gap-3">
                    <div className="size-12 bg-brand-deep/5 rounded-xl flex items-center justify-center shrink-0">
                      <Camera className="size-5 text-brand-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${c.tone}`}
                        >
                          {c.label}
                        </span>
                        {s.captured_on && (
                          <span className="text-xs text-slate-400">· {s.captured_on}</span>
                        )}
                      </div>
                      <h3 className="text-lg font-medium text-slate-800">
                        {s.subject_name}{" "}
                        {s.age && (
                          <span className="text-sm font-normal text-slate-500">· age {s.age}</span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">{s.program ?? "—"}</p>
                    </div>
                    <button
                      onClick={() => remove(s.id)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  {s.quote && (
                    <div className="relative bg-brand-deep/[0.03] rounded-lg p-4 mt-4">
                      <Quote className="size-4 text-brand-accent absolute top-3 left-3 opacity-30" />
                      <p className="text-sm font-serif italic text-slate-700 pl-6">{s.quote}</p>
                    </div>
                  )}

                  {s.outcome && (
                    <div className="mt-4 text-sm">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        Outcome
                      </p>
                      <p className="text-slate-700">{s.outcome}</p>
                    </div>
                  )}

                  {s.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1 pt-3 border-t border-slate-100">
                      {s.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </SectionCard>
              );
            })}
          </div>
        </>
      )}
    </AppShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-3xl font-serif text-brand-deep mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function NewStoryForm({
  orgId,
  onCreated,
  onCancel,
}: {
  orgId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [subjectName, setSubjectName] = useState("");
  const [age, setAge] = useState("");
  const [program, setProgram] = useState("");
  const [quote, setQuote] = useState("");
  const [outcome, setOutcome] = useState("");
  const [consent, setConsent] = useState<Consent>("anonymous");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("impact_stories").insert({
      organization_id: orgId,
      subject_name: subjectName.trim(),
      age: age.trim() || null,
      program: program.trim() || null,
      quote: quote.trim() || null,
      outcome: outcome.trim() || null,
      consent,
      captured_on: new Date().toISOString().slice(0, 10),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Story added");
    onCreated();
  }

  return (
    <SectionCard title="New story" className="mb-6">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Name (or identifier)</span>
          <input
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            required
            placeholder="First name, or 'Anonymous'"
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Age (optional)</span>
          <input
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Program</span>
          <input
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Consent</span>
          <select
            value={consent}
            onChange={(e) => setConsent(e.target.value as Consent)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          >
            <option value="full">Full</option>
            <option value="first-name-only">First name only</option>
            <option value="anonymous">Anonymous</option>
          </select>
        </label>
        <label className="md:col-span-4 text-xs">
          <span className="block text-slate-500 mb-1">Quote</span>
          <textarea
            rows={2}
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="md:col-span-2 text-xs">
          <span className="block text-slate-500 mb-1">Outcome</span>
          <input
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="md:col-span-2 text-xs">
          <span className="block text-slate-500 mb-1">Tags (comma-separated)</span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="youth voice, academic"
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <div className="md:col-span-4 flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onCancel}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save story"}
          </PrimaryButton>
        </div>
      </form>
    </SectionCard>
  );
}
