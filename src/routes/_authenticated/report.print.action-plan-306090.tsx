import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PrintLayout, PrintSection } from "@/components/print/PrintLayout";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { fetch306090Data, formatDate } from "@/lib/exports/data";

export const Route = createFileRoute("/_authenticated/report/print/action-plan-306090")({
  head: () => ({ meta: [{ title: "30-60-90 Day Plan — Print" }] }),
  component: PrintActionPlan306090,
});

type Item = {
  id: string;
  title: string;
  owner_label: string | null;
  priority: string;
  due_date: string | null;
  pillar_name: string | null;
};

function bucketFor(dueDate: string | null) {
  if (!dueDate) return "Unscheduled";
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
  if (days <= 30) return "Days 1–30";
  if (days <= 60) return "Days 31–60";
  if (days <= 90) return "Days 61–90";
  return "Beyond 90 Days";
}

function PrintActionPlan306090() {
  const { orgId } = useCurrentOrg();
  const [data, setData] = useState<{ org: { name: string } | null; items: Item[] } | null>(null);

  useEffect(() => {
    if (!orgId) return;
    fetch306090Data(orgId).then(setData);
  }, [orgId]);

  if (!data) return <div className="p-10 text-center text-sm text-slate-500">Loading…</div>;
  if (!data.org) return <div className="p-10 text-center text-sm">No organization.</div>;

  const buckets: Record<string, Item[]> = {
    "Days 1–30": [],
    "Days 31–60": [],
    "Days 61–90": [],
    "Beyond 90 Days": [],
    Unscheduled: [],
  };
  for (const item of data.items) buckets[bucketFor(item.due_date)].push(item);

  return (
    <PrintLayout title="30-60-90 Day Action Plan" org={data.org.name} backTo="/report/exports">
      {Object.entries(buckets).map(([label, items]) => (
        <PrintSection key={label} title={label}>
          {items.length === 0 ? (
            <p className="text-slate-400 italic">Nothing scheduled in this window.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="text-left py-2">Task</th>
                  <th className="text-left py-2">Pillar</th>
                  <th className="text-left py-2">Owner</th>
                  <th className="text-left py-2">Priority</th>
                  <th className="text-left py-2">Due</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2">{r.title}</td>
                    <td>{r.pillar_name || "—"}</td>
                    <td>{r.owner_label || "—"}</td>
                    <td>{r.priority}</td>
                    <td>{formatDate(r.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </PrintSection>
      ))}
    </PrintLayout>
  );
}
