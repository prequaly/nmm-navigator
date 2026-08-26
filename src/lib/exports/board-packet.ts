import { Document, Packer, AlignmentType, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import ExcelJS from "exceljs";
import {
  fetchBoardPacketData,
  formatDate,
} from "./data";
import { BRAND, h1, h2, p, bullet, spacer, tableFromRows } from "./docx-helpers";
import { slug, styleHeaderRow, addKV, styleHeader } from "./strategic-plan";

export async function downloadBoardPacketDocx(orgId: string, meetingId?: string) {
  const { org, meeting, agenda, attendees, decisions, actionItems } = await fetchBoardPacketData(orgId, meetingId);
  if (!org) throw new Error("Organization not found");
  if (!meeting) throw new Error("No meeting found");

  const children: any[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: "BOARD PACKET", bold: true, size: 18, color: BRAND.muted })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: meeting.title || "Meeting", bold: true, size: 44, color: BRAND.deep })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: org.name, size: 22, color: BRAND.text })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
      children: [
        new TextRun({
          text: meeting.scheduled_at
            ? new Date(meeting.scheduled_at).toLocaleString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : "Date TBD",
          size: 22,
          color: BRAND.muted,
        }),
      ],
    }),

    h1("Meeting Details"),
    tableFromRows(
      ["Field", "Value"],
      [
        ["Location", (meeting as any).location || "—"],
        ["Duration", (meeting as any).duration_minutes ? `${(meeting as any).duration_minutes} minutes` : "—"],
        ["Status", String((meeting as any).status ?? "—")],
        ["Cadence", String((meeting as any).cadence ?? "—")],
      ],
      [3000, 6360],
    ),
    spacer(),

    h1("Attendees"),
  ];
  if (attendees.length === 0) {
    children.push(p("No attendees recorded.", { italic: true, color: BRAND.muted }));
  } else {
    children.push(
      tableFromRows(
        ["Name", "Role", "Status"],
        (attendees as any[]).map((a) => [a.display_name || "—", a.role || "—", String(a.status ?? "—")]),
        [4360, 2500, 2500],
      ),
    );
  }
  children.push(spacer());

  children.push(h1("Agenda"));
  if (agenda.length === 0) {
    children.push(p("No agenda items.", { italic: true, color: BRAND.muted }));
  } else {
    for (const item of agenda as any[]) {
      children.push(h2(`${item.sort_order ?? ""}. ${item.title}${item.duration_minutes ? ` (${item.duration_minutes} min)` : ""}`));
      if (item.description) children.push(p(item.description));
    }
  }
  children.push(spacer());

  children.push(h1("Decisions"));
  if (decisions.length === 0) {
    children.push(p("No decisions logged.", { italic: true, color: BRAND.muted }));
  } else {
    for (const d of decisions as any[]) {
      children.push(h2(d.title));
      children.push(p(`${formatDate(d.decided_at)} — Decided by ${d.decided_by || "—"}`, { italic: true, color: BRAND.muted }));
      if (d.rationale) {
        children.push(p("Rationale:", { bold: true }));
        children.push(p(d.rationale));
      }
      if (d.impact) {
        children.push(p("Impact:", { bold: true }));
        children.push(p(d.impact));
      }
      if (d.follow_up) {
        children.push(p("Follow-up:", { bold: true }));
        children.push(p(d.follow_up));
      }
    }
  }
  children.push(spacer());

  children.push(h1("Action Items"));
  if (actionItems.length === 0) {
    children.push(p("No action items.", { italic: true, color: BRAND.muted }));
  } else {
    children.push(
      tableFromRows(
        ["Action", "Due", "Status"],
        (actionItems as any[]).map((a) => [
          a.action_items?.title || a.context || "—",
          formatDate(a.commitment_due_date),
          a.action_items?.status || "—",
        ]),
        [5360, 2000, 2000],
      ),
    );
  }

  if (meeting.summary) {
    children.push(spacer());
    children.push(h1("Summary"));
    children.push(p(meeting.summary));
  }

  const doc = new Document({
    creator: "NMM Navigator",
    title: `${org.name} — Board Packet — ${meeting.title}`,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slug(org.name)}-board-packet-${slug(meeting.title || "meeting")}.docx`);
}

export async function downloadBoardPacketXlsx(orgId: string, meetingId?: string) {
  const { org, meeting, agenda, attendees, decisions, actionItems } = await fetchBoardPacketData(orgId, meetingId);
  if (!org) throw new Error("Organization not found");
  if (!meeting) throw new Error("No meeting found");
  const wb = new ExcelJS.Workbook();
  wb.creator = "NMM Navigator";

  const ov = wb.addWorksheet("Meeting");
  ov.columns = [{ width: 22 }, { width: 60 }];
  styleHeader(ov.addRow([`${meeting.title} — Board Packet`, ""]).getCell(1));
  ov.mergeCells("A1:B1");
  ov.addRow([]);
  addKV(ov, "Organization", org.name);
  addKV(ov, "Date", meeting.scheduled_at ? new Date(meeting.scheduled_at).toLocaleString() : "—");
  addKV(ov, "Location", (meeting as any).location);
  addKV(ov, "Duration", (meeting as any).duration_minutes ? `${(meeting as any).duration_minutes} min` : "—");
  addKV(ov, "Status", (meeting as any).status);
  addKV(ov, "Summary", meeting.summary);

  const att = wb.addWorksheet("Attendees");
  att.columns = [
    { header: "Name", key: "n", width: 30 },
    { header: "Role", key: "r", width: 20 },
    { header: "Status", key: "s", width: 14 },
  ];
  styleHeaderRow(att.getRow(1));
  for (const a of attendees as any[]) att.addRow({ n: a.display_name, r: a.role, s: a.status });

  const ag = wb.addWorksheet("Agenda");
  ag.columns = [
    { header: "#", key: "o", width: 6 },
    { header: "Title", key: "t", width: 36 },
    { header: "Description", key: "d", width: 60 },
    { header: "Duration (min)", key: "m", width: 14 },
  ];
  styleHeaderRow(ag.getRow(1));
  for (const i of agenda as any[]) ag.addRow({ o: i.sort_order, t: i.title, d: i.description, m: i.duration_minutes });

  const dec = wb.addWorksheet("Decisions");
  dec.columns = [
    { header: "Title", key: "t", width: 36 },
    { header: "Date", key: "d", width: 14 },
    { header: "Decided by", key: "by", width: 16 },
    { header: "Rationale", key: "r", width: 40 },
    { header: "Impact", key: "i", width: 30 },
    { header: "Follow-up", key: "f", width: 30 },
  ];
  styleHeaderRow(dec.getRow(1));
  for (const d of decisions as any[]) dec.addRow({ t: d.title, d: formatDate(d.decided_at), by: d.decided_by, r: d.rationale, i: d.impact, f: d.follow_up });

  const ai = wb.addWorksheet("Action Items");
  ai.columns = [
    { header: "Action", key: "t", width: 40 },
    { header: "Due", key: "d", width: 14 },
    { header: "Status", key: "s", width: 14 },
    { header: "Context", key: "c", width: 40 },
  ];
  styleHeaderRow(ai.getRow(1));
  for (const a of actionItems as any[]) ai.addRow({ t: a.action_items?.title, d: formatDate(a.commitment_due_date), s: a.action_items?.status, c: a.context });

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${slug(org.name)}-board-packet.xlsx`);
}
