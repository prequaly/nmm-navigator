import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
  EmptyState,
} from "@/components/app-shell/AppShell";
import { AlertTriangle, CheckCircle2, Plus, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/governance/board-matrix")({
  head: () => ({ meta: [{ title: "Board Matrix — NMM Navigator" }] }),
  component: BoardMatrix,
});

type Member = {
  id: string;
  name: string;
  role: string;
  term_start: number | null;
  term_end: number | null;
  committees: string[];
  skills: string[];
  race: string | null;
  gender: string | null;
  age_range: string | null;
};

const SKILLS = ["Finance", "Legal", "Fundraising", "Programs", "Marketing", "HR / People", "Tech", "DEI", "Lived Experience"];
const COMMITTEES = ["Executive", "Finance", "Governance", "Development", "Programs"];
const CURRENT_YEAR = new Date().getFullYear();

const EXAMPLES: Omit<Member, "id">[] = [
  { name: "Angela Rivera", role: "Chair", term_start: 2023, term_end: 2026, committees: ["Executive", "Governance"], skills: ["Fundraising", "Legal"], race: "Latina", gender: "F", age_range: "55-64" },
  { name: "Marcus Chen", role: "Treasurer", term_start: 2022, term_end: 2025, committees: ["Finance", "Executive"], skills: ["Finance", "Tech"], race: "Asian", gender: "M", age_range: "45-54" },
  { name: "Dr. Joelle Banks", role: "Secretary", term_start: 2024, term_end: 2027, committees: ["Governance", "Programs"], skills: ["Programs", "DEI", "Lived Experience"], race: "Black", gender: "F", age_range: "35-44" },
];

function BoardMatrix() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExamples, setShowExamples] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: mem } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userData.user.id)
        .limit(1)
        .maybeSingle();
      if (!mem) { setLoading(false); return; }
      setOrgId(mem.organization_id);
      const { data } = await supabase
        .from("board_members")
        .select("*")
        .eq("organization_id", mem.organization_id)
        .order("created_at", { ascending: true });
      setMembers((data as Member[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const displayed: Member[] = members.length > 0
    ? members
    : showExamples
      ? EXAMPLES.map((e, i) => ({ id: `ex-${i}`, ...e }))
      : [];

  const skillCoverage = SKILLS.map((s) => ({
    skill: s,
    count: displayed.filter((m) => m.skills.includes(s)).length,
  }));
  const expiringSoon = displayed.filter((m) => (m.term_end ?? CURRENT_YEAR + 99) - CURRENT_YEAR <= 1);
  const racePct = (race: string) =>
    displayed.length === 0 ? 0 : Math.round((displayed.filter((m) => m.race === race).length / displayed.length) * 100);

  async function handleDelete(id: string) {
    if (!confirm("Remove this member?")) return;
    const { error } = await supabase.from("board_members").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleAdd(payload: Omit<Member, "id">) {
    if (!orgId) { toast.error("No organization"); return; }
    const { data, error } = await supabase
      .from("board_members")
      .insert({ ...payload, organization_id: orgId })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setMembers((prev) => [...prev, data as Member]);
    setDialogOpen(false);
    toast.success("Board member added");
  }

  return (
    <AppShell
      title="Board Matrix"
      subtitle="Skills, demographics, terms, and committee assignments at a glance."
      actions={
        <>
          {members.length === 0 && (
            <GhostButton onClick={() => setShowExamples((v) => !v)}>
              {showExamples ? "Hide example data" : "Show example data"}
            </GhostButton>
          )}
          <PrimaryButton onClick={() => setDialogOpen(true)}>
            <Plus className="size-3.5 inline -mt-0.5" /> Add Member
          </PrimaryButton>
        </>
      }
    >
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No board members yet"
          description="Track skills, committees, terms, and demographics for every board member. Spot gaps before your next nominating cycle."
          action={
            <div className="flex gap-2">
              <PrimaryButton onClick={() => setDialogOpen(true)}><Plus className="size-3.5 inline -mt-0.5" /> Add first member</PrimaryButton>
              <GhostButton onClick={() => setShowExamples(true)}>See example board</GhostButton>
            </div>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Stat label="Total members" value={displayed.length.toString()} hint="Target 9-12" />
            <Stat label="Term expirations" value={expiringSoon.length.toString()} hint="In next 12 months" tone={expiringSoon.length > 2 ? "warn" : "ok"} />
            <Stat label="Skill gaps" value={skillCoverage.filter((s) => s.count === 0).length.toString()} hint={`Of ${SKILLS.length} tracked`} tone={skillCoverage.some((s) => s.count === 0) ? "warn" : "ok"} />
            <Stat label="Lived experience" value={`${displayed.filter((m) => m.skills.includes("Lived Experience")).length}/${displayed.length}`} hint="Members with direct experience" />
          </div>

          <SectionCard title="Members" subtitle={members.length === 0 ? "Example data — add your first real member to save it." : "Your board roster."} padding="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Role</th>
                    <th className="text-left p-3">Term</th>
                    <th className="text-left p-3">Committees</th>
                    <th className="text-left p-3">Skills</th>
                    <th className="text-left p-3">Demographics</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((m) => {
                    const yrsLeft = (m.term_end ?? CURRENT_YEAR + 99) - CURRENT_YEAR;
                    const isReal = !m.id.startsWith("ex-");
                    return (
                      <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="p-3 font-medium text-slate-800">{m.name}</td>
                        <td className="p-3 text-slate-600">{m.role}</td>
                        <td className="p-3 text-slate-600 tabular-nums">
                          {m.term_start ?? "—"}–{m.term_end ?? "—"}
                          {m.term_end != null && yrsLeft <= 1 && (
                            <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              {yrsLeft <= 0 ? "expired" : `${yrsLeft}y left`}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">
                          <div className="flex flex-wrap gap-1">
                            {m.committees.map((c) => (
                              <span key={c} className="text-[10px] bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded">{c}</span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-slate-600">
                          <div className="flex flex-wrap gap-1">
                            {m.skills.map((s) => (
                              <span key={s} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{s}</span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-xs text-slate-500">
                          {[m.race, m.gender, m.age_range].filter(Boolean).join(" · ") || "—"}
                        </td>
                        <td className="p-3 text-right">
                          {isReal && (
                            <button onClick={() => handleDelete(m.id)} className="text-slate-400 hover:text-rose-600" aria-label="Remove">
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <SectionCard title="Skill coverage" subtitle="Members per skill area">
              <ul className="space-y-2.5">
                {skillCoverage.map((s) => {
                  const pct = displayed.length ? (s.count / displayed.length) * 100 : 0;
                  const gap = s.count === 0;
                  return (
                    <li key={s.skill}>
                      <div className="flex items-baseline justify-between text-sm mb-1">
                        <span className={`flex items-center gap-2 ${gap ? "text-rose-700 font-medium" : "text-slate-700"}`}>
                          {gap ? <AlertTriangle className="size-3" /> : <CheckCircle2 className="size-3 text-emerald-500" />}
                          {s.skill}
                        </span>
                        <span className="text-slate-500 tabular-nums">{s.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${gap ? "bg-rose-300" : "bg-brand-primary"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>

            <SectionCard title="Demographic snapshot" subtitle="Composition across the board">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Race / Ethnicity</p>
                  <ul className="space-y-2 text-sm">
                    {Array.from(new Set(displayed.map((m) => m.race).filter(Boolean) as string[])).map((r) => (
                      <li key={r} className="flex items-center justify-between">
                        <span className="text-slate-700">{r}</span>
                        <span className="text-slate-500 tabular-nums">{racePct(r)}%</span>
                      </li>
                    ))}
                    {displayed.every((m) => !m.race) && <li className="text-xs text-slate-400">Add race/ethnicity to members to see composition.</li>}
                  </ul>
                </div>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Committees" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {COMMITTEES.map((c) => {
                const cm = displayed.filter((m) => m.committees.includes(c));
                return (
                  <div key={c} className="border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{c}</p>
                    <p className="text-2xl font-serif text-brand-deep mt-1">{cm.length}</p>
                    <ul className="text-xs text-slate-500 mt-2 space-y-0.5">
                      {cm.map((m) => (
                        <li key={m.id} className="truncate">{m.name}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </>
      )}

      {dialogOpen && (
        <AddMemberDialog onClose={() => setDialogOpen(false)} onSave={handleAdd} />
      )}
    </AppShell>
  );
}

function AddMemberDialog({ onClose, onSave }: { onClose: () => void; onSave: (m: Omit<Member, "id">) => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Member");
  const [termStart, setTermStart] = useState<string>(String(CURRENT_YEAR));
  const [termEnd, setTermEnd] = useState<string>(String(CURRENT_YEAR + 3));
  const [committees, setCommittees] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [race, setRace] = useState("");
  const [gender, setGender] = useState("");
  const [ageRange, setAgeRange] = useState("");

  const toggle = (arr: string[], v: string, setter: (a: string[]) => void) =>
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      role: role.trim() || "Member",
      term_start: termStart ? Number(termStart) : null,
      term_end: termEnd ? Number(termEnd) : null,
      committees,
      skills,
      race: race || null,
      gender: gender || null,
      age_range: ageRange || null,
    });
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl"
      >
        <h2 className="text-xl font-serif text-brand-deep mb-4">Add Board Member</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name *"><input required value={name} onChange={(e) => setName(e.target.value)} className="input" /></Field>
          <Field label="Role"><input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Chair, Treasurer, Member…" className="input" /></Field>
          <Field label="Term start"><input type="number" value={termStart} onChange={(e) => setTermStart(e.target.value)} className="input" /></Field>
          <Field label="Term end"><input type="number" value={termEnd} onChange={(e) => setTermEnd(e.target.value)} className="input" /></Field>
          <Field label="Race / Ethnicity"><input value={race} onChange={(e) => setRace(e.target.value)} className="input" /></Field>
          <Field label="Gender"><input value={gender} onChange={(e) => setGender(e.target.value)} className="input" /></Field>
          <Field label="Age range"><input value={ageRange} onChange={(e) => setAgeRange(e.target.value)} placeholder="e.g. 45-54" className="input" /></Field>
        </div>

        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Committees</p>
          <div className="flex flex-wrap gap-2">
            {COMMITTEES.map((c) => (
              <button key={c} type="button" onClick={() => toggle(committees, c, setCommittees)}
                className={`text-xs px-3 py-1.5 rounded-full border ${committees.includes(c) ? "bg-brand-primary text-white border-brand-primary" : "bg-white text-slate-600 border-slate-200"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Skills</p>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map((s) => (
              <button key={s} type="button" onClick={() => toggle(skills, s, setSkills)}
                className={`text-xs px-3 py-1.5 rounded-full border ${skills.includes(s) ? "bg-brand-primary text-white border-brand-primary" : "bg-white text-slate-600 border-slate-200"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <GhostButton onClick={onClose} type="button">Cancel</GhostButton>
          <PrimaryButton type="submit">Save member</PrimaryButton>
        </div>
        <style>{`.input { width:100%; padding:0.5rem 0.75rem; border:1px solid rgb(226 232 240); border-radius:0.5rem; font-size:0.875rem; }`}</style>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value, hint, tone = "neutral" }: { label: string; value: string; hint?: string; tone?: "neutral" | "warn" | "ok" }) {
  const valueColor = tone === "warn" ? "text-amber-700" : tone === "ok" ? "text-emerald-600" : "text-brand-deep";
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`text-3xl font-serif mt-1 ${valueColor}`}>{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
