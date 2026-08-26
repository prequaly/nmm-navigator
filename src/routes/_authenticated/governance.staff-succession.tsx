import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
  EmptyState,
} from "@/components/app-shell/AppShell";
import { AlertTriangle, CheckCircle2, ShieldAlert, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/governance/staff-succession")({
  head: () => ({ meta: [{ title: "Staff Capacity & Succession — NMM Navigator" }] }),
  component: StaffSuccession,
});

type Risk = "high" | "medium" | "low";
type Role = {
  id: string;
  title: string;
  holder: string | null;
  tenure: string | null;
  key_person_risk: Risk;
  backup: string | null;
  documented: boolean;
  emergency_successor: string | null;
};

const EXAMPLES: Omit<Role, "id">[] = [
  { title: "Executive Director", holder: "Devon Park", tenure: "6y", key_person_risk: "high", backup: null, documented: false, emergency_successor: "Board Treasurer" },
  { title: "Program Director", holder: "Aaliyah Brooks", tenure: "4y", key_person_risk: "medium", backup: "Lead Teaching Artist", documented: true, emergency_successor: "Deputy Program Manager" },
  { title: "Director of Development", holder: "Lena Park", tenure: "2y", key_person_risk: "high", backup: null, documented: false, emergency_successor: null },
];

const RISK_TONE: Record<Risk, { dot: string; chip: string; label: string }> = {
  high: { dot: "bg-rose-500", chip: "bg-rose-100 text-rose-700 border-rose-200", label: "High" },
  medium: { dot: "bg-amber-500", chip: "bg-amber-100 text-amber-700 border-amber-200", label: "Medium" },
  low: { dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Low" },
};

function StaffSuccession() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
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
        .from("staff_roles")
        .select("*")
        .eq("organization_id", mem.organization_id)
        .order("created_at", { ascending: true });
      setRoles((data as Role[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const displayed: Role[] = roles.length > 0
    ? roles
    : showExamples
      ? EXAMPLES.map((e, i) => ({ id: `ex-${i}`, ...e }))
      : [];

  const highRisk = displayed.filter((r) => r.key_person_risk === "high");
  const undocumented = displayed.filter((r) => !r.documented && r.holder && r.holder !== "VACANT");
  const noBackup = displayed.filter((r) => !r.backup && r.holder && r.holder !== "VACANT");

  async function handleDelete(id: string) {
    if (!confirm("Remove this role?")) return;
    const { error } = await supabase.from("staff_roles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRoles((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleAdd(payload: Omit<Role, "id">) {
    if (!orgId) { toast.error("No organization"); return; }
    const { data, error } = await supabase
      .from("staff_roles")
      .insert({ ...payload, organization_id: orgId })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setRoles((prev) => [...prev, data as Role]);
    setDialogOpen(false);
    toast.success("Role added");
  }

  return (
    <AppShell
      title="Staff Capacity & Succession"
      subtitle="Where is your organization one resignation away from a crisis?"
      actions={
        <>
          {roles.length === 0 && (
            <GhostButton onClick={() => setShowExamples((v) => !v)}>
              {showExamples ? "Hide example data" : "Show example data"}
            </GhostButton>
          )}
          <PrimaryButton onClick={() => setDialogOpen(true)}>+ Role</PrimaryButton>
        </>
      }
    >
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No roles logged yet"
          description="Map every critical role, its holder, backups, and succession readiness. Surface single points of failure before they hurt."
          action={
            <div className="flex gap-2">
              <PrimaryButton onClick={() => setDialogOpen(true)}>+ Add first role</PrimaryButton>
              <GhostButton onClick={() => setShowExamples(true)}>See example roster</GhostButton>
            </div>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-brand-deep text-white rounded-2xl p-5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">Roles tracked</span>
              <p className="text-4xl font-serif mt-2">{displayed.length}</p>
              <p className="text-xs text-slate-400 mt-1">{displayed.filter((r) => r.holder === "VACANT" || !r.holder).length} vacant</p>
            </div>
            <Card label="High key-person risk" value={highRisk.length} tone="rose" />
            <Card label="No backup" value={noBackup.length} tone="amber" />
            <Card label="Undocumented" value={undocumented.length} tone="amber" />
          </div>

          {highRisk.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 mb-6 flex items-start gap-3">
              <ShieldAlert className="size-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-rose-900">
                  {highRisk.length} high-risk role{highRisk.length === 1 ? "" : "s"} need attention this quarter
                </p>
                <p className="text-xs text-rose-800 mt-1">
                  {highRisk.map((r) => r.title).join(", ")} — lock down emergency continuity plans first, then build 12-month development plans for internal successors.
                </p>
              </div>
            </div>
          )}

          <SectionCard title="Roles & succession readiness" subtitle={roles.length === 0 ? "Example data — add your first real role to save it." : undefined} padding="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="text-left p-3">Role</th>
                    <th className="text-left p-3">Holder</th>
                    <th className="text-left p-3">Tenure</th>
                    <th className="text-left p-3">Key-person risk</th>
                    <th className="text-left p-3">Backup / deputy</th>
                    <th className="text-left p-3">Emergency successor</th>
                    <th className="text-left p-3">Role doc</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((r) => {
                    const t = RISK_TONE[r.key_person_risk];
                    const vacant = !r.holder || r.holder === "VACANT";
                    const isReal = !r.id.startsWith("ex-");
                    return (
                      <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="p-3 font-medium text-slate-800">{r.title}</td>
                        <td className={`p-3 ${vacant ? "text-rose-700 font-medium" : "text-slate-600"}`}>{r.holder || "VACANT"}</td>
                        <td className="p-3 text-slate-500 tabular-nums">{r.tenure ?? "—"}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest border px-2 py-1 rounded-full ${t.chip}`}>
                            <span className={`size-1.5 rounded-full ${t.dot}`} /> {t.label}
                          </span>
                        </td>
                        <td className={`p-3 text-sm ${r.backup ? "text-slate-600" : "text-rose-700"}`}>{r.backup ?? "— none —"}</td>
                        <td className={`p-3 text-sm ${r.emergency_successor ? "text-slate-600" : "text-rose-700"}`}>{r.emergency_successor ?? "— none —"}</td>
                        <td className="p-3">
                          {r.documented ? (
                            <CheckCircle2 className="size-4 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="size-4 text-amber-500" />
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {isReal && (
                            <button onClick={() => handleDelete(r.id)} className="text-slate-400 hover:text-rose-600" aria-label="Remove">
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
        </>
      )}

      {dialogOpen && <AddRoleDialog onClose={() => setDialogOpen(false)} onSave={handleAdd} />}
    </AppShell>
  );
}

function AddRoleDialog({ onClose, onSave }: { onClose: () => void; onSave: (r: Omit<Role, "id">) => void }) {
  const [title, setTitle] = useState("");
  const [holder, setHolder] = useState("");
  const [tenure, setTenure] = useState("");
  const [risk, setRisk] = useState<Risk>("medium");
  const [backup, setBackup] = useState("");
  const [documented, setDocumented] = useState(false);
  const [successor, setSuccessor] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      holder: holder.trim() || null,
      tenure: tenure.trim() || null,
      key_person_risk: risk,
      backup: backup.trim() || null,
      documented,
      emergency_successor: successor.trim() || null,
    });
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl">
        <h2 className="text-xl font-serif text-brand-deep mb-4">Add Role</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Role title *"><input required value={title} onChange={(e) => setTitle(e.target.value)} className="input" /></Field>
          <Field label="Current holder"><input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Name or VACANT" className="input" /></Field>
          <Field label="Tenure"><input value={tenure} onChange={(e) => setTenure(e.target.value)} placeholder="e.g. 4y" className="input" /></Field>
          <Field label="Key-person risk">
            <select value={risk} onChange={(e) => setRisk(e.target.value as Risk)} className="input">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>
          <Field label="Backup / deputy"><input value={backup} onChange={(e) => setBackup(e.target.value)} className="input" /></Field>
          <Field label="Emergency successor"><input value={successor} onChange={(e) => setSuccessor(e.target.value)} className="input" /></Field>
        </div>
        <label className="flex items-center gap-2 mt-4 text-sm text-slate-700">
          <input type="checkbox" checked={documented} onChange={(e) => setDocumented(e.target.checked)} /> Role is documented (JD, SOPs current)
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <GhostButton onClick={onClose} type="button">Cancel</GhostButton>
          <PrimaryButton type="submit">Save role</PrimaryButton>
        </div>
        <style>{`.input { width:100%; padding:0.5rem 0.75rem; border:1px solid rgb(226 232 240); border-radius:0.5rem; font-size:0.875rem; background:white; }`}</style>
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

function Card({ label, value, tone }: { label: string; value: number; tone: "rose" | "amber" }) {
  const color = tone === "rose" ? "text-rose-700" : "text-amber-700";
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`text-4xl font-serif mt-1 ${color}`}>{value}</p>
    </div>
  );
}
