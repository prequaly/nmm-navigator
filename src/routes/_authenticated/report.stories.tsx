import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
} from "@/components/app-shell/AppShell";
import { Quote, Camera, Sparkles, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/report/stories")({
  head: () => ({ meta: [{ title: "Beneficiary Stories — NMM Navigator" }] }),
  component: StoriesLibrary,
});

type Story = {
  id: string;
  name: string; // first name only for privacy
  age: string;
  program: string;
  quote: string;
  outcome: string;
  consent: "full" | "first-name-only" | "anonymous";
  captured: string;
  tags: string[];
  uses: string[]; // where it's been used
};

const STORIES: Story[] = [
  {
    id: "S-014",
    name: "Marisol",
    age: "16",
    program: "After-school Studio · Site 1",
    quote: "Before Studio, I had this feeling that art wasn't for kids like me. Now I'm applying to art school. I have a portfolio. I have a teacher who knows my name.",
    outcome: "Accepted to two pre-college art programs; advanced to Lead Apprentice tier.",
    consent: "first-name-only",
    captured: "May 2026",
    tags: ["youth voice", "academic", "long-term"],
    uses: ["FY26 Annual Report", "Hartwell renewal", "Spring appeal"],
  },
  {
    id: "S-013",
    name: "Devon (parent)",
    age: "—",
    program: "Family Engagement Series",
    quote: "My kid started coming home humming. Then she started drawing every night. Then she invited me to a showcase. That night I cried in the second row.",
    outcome: "Family attended 5 of 6 events; daughter completed 2 program years.",
    consent: "first-name-only",
    captured: "Apr 2026",
    tags: ["family", "engagement"],
    uses: ["Year-end appeal"],
  },
  {
    id: "S-012",
    name: "Jordan",
    age: "13",
    program: "Summer Intensive 2025",
    quote: "I never thought of myself as a writer. Sasha told me my poem was real and I should keep going. So I did.",
    outcome: "Continued in fall programming; published in zine.",
    consent: "full",
    captured: "Aug 2025",
    tags: ["youth voice", "writing"],
    uses: ["Hartwell renewal", "Website", "Instagram"],
  },
  {
    id: "S-011",
    name: "Anonymous Teaching Artist",
    age: "—",
    program: "Teaching Artist Residency",
    quote: "Riverside is the first place I've taught where the org actually invests in my pedagogy. I'm a better artist because of it, not just a better teacher.",
    outcome: "TA renewed for 3rd year; took on mentor role for new cohort.",
    consent: "anonymous",
    captured: "Mar 2026",
    tags: ["teaching artist", "field-building"],
    uses: ["NEA application"],
  },
  {
    id: "S-010",
    name: "Aaliyah",
    age: "11",
    program: "After-school Studio · Site 3",
    quote: "I'm not shy here. At school I'm shy.",
    outcome: "First-year participant; perfect attendance.",
    consent: "first-name-only",
    captured: "Feb 2026",
    tags: ["youth voice", "belonging"],
    uses: ["Site 3 expansion case", "Spring appeal"],
  },
];

const CONSENT_TONE = {
  full: { label: "Full consent", tone: "bg-emerald-100 text-emerald-700" },
  "first-name-only": { label: "First name only", tone: "bg-amber-100 text-amber-700" },
  anonymous: { label: "Anonymous", tone: "bg-slate-100 text-slate-700" },
};

function StoriesLibrary() {
  const [tag, setTag] = useState<string | null>(null);
  const allTags = Array.from(new Set(STORIES.flatMap((s) => s.tags)));
  const filtered = tag ? STORIES.filter((s) => s.tags.includes(tag)) : STORIES;

  return (
    <AppShell
      title="Beneficiary Stories Library"
      subtitle="Narrative, quotes, and media — tagged by program and outcome, ready to drop into grant apps, reports, and appeals."
      actions={
        <>
          <GhostButton>
            <Sparkles className="size-3.5 inline -mt-0.5" /> AI summarize for grant
          </GhostButton>
          <PrimaryButton>
            <Plus className="size-3.5 inline -mt-0.5" /> Add story
          </PrimaryButton>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Stories on file" value={STORIES.length} hint="Active library" />
        <Stat label="With media" value={3} hint="Photos / video clips" />
        <Stat label="Full consent" value={STORIES.filter((s) => s.consent === "full").length} hint="Cleared for public use" />
        <Stat label="Most recent" value="2w ago" />
      </div>

      {/* Tag filter */}
      <div className="flex flex-wrap gap-2 mb-6 text-xs">
        <button
          onClick={() => setTag(null)}
          className={`px-3 py-1.5 rounded-full border font-medium ${
            !tag ? "bg-brand-deep text-white border-brand-deep" : "bg-white text-slate-600 border-slate-200 hover:border-brand-primary/40"
          }`}
        >
          All tags
        </button>
        {allTags.map((t) => (
          <button
            key={t}
            onClick={() => setTag(t)}
            className={`px-3 py-1.5 rounded-full border font-medium ${
              tag === t ? "bg-brand-deep text-white border-brand-deep" : "bg-white text-slate-600 border-slate-200 hover:border-brand-primary/40"
            }`}
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
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.id}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${c.tone}`}>
                      {c.label}
                    </span>
                    <span className="text-xs text-slate-400">· {s.captured}</span>
                  </div>
                  <h3 className="text-lg font-medium text-slate-800">
                    {s.name} {s.age !== "—" && <span className="text-sm font-normal text-slate-500">· age {s.age}</span>}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{s.program}</p>
                </div>
              </div>

              <div className="relative bg-brand-deep/[0.03] rounded-lg p-4 mt-4">
                <Quote className="size-4 text-brand-accent absolute top-3 left-3 opacity-30" />
                <p className="text-sm font-serif italic text-slate-700 pl-6">{s.quote}</p>
              </div>

              <div className="mt-4 text-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Outcome</p>
                <p className="text-slate-700">{s.outcome}</p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-slate-100 flex-wrap">
                <div className="flex flex-wrap gap-1">
                  {s.tags.map((t) => (
                    <span key={t} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      #{t}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400">
                  Used in: {s.uses.length} {s.uses.length === 1 ? "place" : "places"}
                </span>
              </div>
            </SectionCard>
          );
        })}
      </div>
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
