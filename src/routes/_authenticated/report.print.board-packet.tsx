import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PrintLayout, PrintSection, PrintKV } from "@/components/print/PrintLayout";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { fetchBoardPacketData, formatDate } from "@/lib/exports/data";

export const Route = createFileRoute("/_authenticated/report/print/board-packet")({
  head: () => ({ meta: [{ title: "Board Packet — Print" }] }),
  component: PrintBoardPacket,
});

function PrintBoardPacket() {
  const { orgId } = useCurrentOrg();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!orgId) return;
    fetchBoardPacketData(orgId).then(setData);
  }, [orgId]);

  if (!data) return <div className="p-10 text-center text-sm text-slate-500">Loading…</div>;
  if (!data.org) return <div className="p-10 text-center text-sm">No organization.</div>;
  if (!data.meeting)
    return (
      <div className="p-10 text-center text-sm text-slate-500">
        No meetings found. Schedule one to generate a board packet.
      </div>
    );

  const { org, meeting, agenda, attendees, decisions, actionItems } = data;
  const when = meeting.scheduled_at
    ? new Date(meeting.scheduled_at).toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Date TBD";

  return (
    <PrintLayout title="Board Packet" org={org.name} subtitle={`${meeting.title} · ${when}`}>
      <PrintSection title="Meeting Details">
        <dl>
          <PrintKV label="Location" value={meeting.location} />
          <PrintKV
            label="Duration"
            value={meeting.duration_minutes ? `${meeting.duration_minutes} minutes` : "—"}
          />
          <PrintKV label="Status" value={meeting.status} />
          <PrintKV label="Cadence" value={meeting.cadence} />
        </dl>
      </PrintSection>

      <PrintSection title="Attendees">
        {attendees.length === 0 ? (
          <p className="text-slate-400 italic">No attendees recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Role</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((a: any) => (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="py-2">{a.display_name || "—"}</td>
                  <td>{a.role || "—"}</td>
                  <td>{a.status || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PrintSection>

      <PrintSection title="Agenda">
        {agenda.length === 0 ? (
          <p className="text-slate-400 italic">No agenda items.</p>
        ) : (
          <ol className="space-y-3">
            {agenda.map((i: any) => (
              <li key={i.id} className="avoid-break">
                <div className="flex justify-between items-baseline gap-4">
                  <h4 className="font-semibold text-slate-900">
                    {i.sort_order ? `${i.sort_order}. ` : ""}{i.title}
                  </h4>
                  {i.duration_minutes && (
                    <span className="text-xs text-slate-500 shrink-0">{i.duration_minutes} min</span>
                  )}
                </div>
                {i.description && (
                  <p className="text-sm text-slate-700 mt-1 leading-relaxed">{i.description}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </PrintSection>

      <PrintSection title="Decisions">
        {decisions.length === 0 ? (
          <p className="text-slate-400 italic">No decisions logged.</p>
        ) : (
          <div className="space-y-4">
            {decisions.map((d: any) => (
              <div key={d.id} className="avoid-break border-l-2 border-brand-deep pl-3">
                <h4 className="font-semibold text-slate-900">{d.title}</h4>
                <p className="text-xs text-slate-500 italic mt-0.5">
                  {formatDate(d.decided_at)} — Decided by {d.decided_by || "—"}
                </p>
                {d.rationale && (
                  <p className="text-sm text-slate-700 mt-2">
                    <span className="font-semibold">Rationale:</span> {d.rationale}
                  </p>
                )}
                {d.impact && (
                  <p className="text-sm text-slate-700 mt-1">
                    <span className="font-semibold">Impact:</span> {d.impact}
                  </p>
                )}
                {d.follow_up && (
                  <p className="text-sm text-slate-700 mt-1">
                    <span className="font-semibold">Follow-up:</span> {d.follow_up}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </PrintSection>

      <PrintSection title="Action Items">
        {actionItems.length === 0 ? (
          <p className="text-slate-400 italic">No action items.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left py-2">Action</th>
                <th className="text-left py-2">Due</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {actionItems.map((a: any) => (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="py-2">{a.action_items?.title || a.context || "—"}</td>
                  <td>{formatDate(a.commitment_due_date)}</td>
                  <td>{a.action_items?.status || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PrintSection>

      {meeting.summary && (
        <PrintSection title="Summary">
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {meeting.summary}
          </p>
        </PrintSection>
      )}
    </PrintLayout>
  );
}
