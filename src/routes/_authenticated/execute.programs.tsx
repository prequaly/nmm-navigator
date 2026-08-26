import { createFileRoute } from "@tanstack/react-router";
import { AppShell, SectionCard, PrimaryButton } from "@/components/app-shell/AppShell";
import { PROGRAMS } from "@/lib/mock/riverside";

export const Route = createFileRoute("/_authenticated/execute/programs")({
  head: () => ({ meta: [{ title: "Programs & Events — NMM Navigator" }] }),
  component: () => (
    <AppShell
      title="Programs & Events"
      subtitle="Every program connects to a strategic priority, a budget line, and an evaluation plan."
      actions={<PrimaryButton>+ New program</PrimaryButton>}
    >
      <SectionCard padding="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <th className="text-left p-5 font-semibold">Name</th>
              <th className="text-left p-5 font-semibold">Type</th>
              <th className="text-left p-5 font-semibold">Participants</th>
              <th className="text-left p-5 font-semibold">Budget</th>
              <th className="text-left p-5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {PROGRAMS.map((p) => (
              <tr key={p.name} className="hover:bg-slate-50/60">
                <td className="p-5 font-medium text-slate-900">{p.name}</td>
                <td className="p-5">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                      p.type === "Program"
                        ? "bg-brand-primary/10 text-brand-primary"
                        : "bg-brand-accent/10 text-brand-accent"
                    }`}
                  >
                    {p.type}
                  </span>
                </td>
                <td className="p-5 text-slate-600 tabular-nums">{p.participants}</td>
                <td className="p-5 text-slate-600 tabular-nums">${p.budget.toLocaleString()}</td>
                <td className="p-5 text-slate-500">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </AppShell>
  ),
});
