import { Document, Packer, type Table, Paragraph } from "docx";
import { saveAs } from "file-saver";
import { fetch306090Data, formatDate } from "./data";
import { BRAND, h1, h2, p, spacer, tableFromRows } from "./docx-helpers";
import { slug, styleHeaderRow, addKV } from "./strategic-plan";
import ExcelJS from "exceljs";

type ActionItem = {
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  owner_label: string | null;
  pillar_name: string | null;
};

function bucketFor(dueDate: string | null): "0-30" | "31-60" | "61-90" | "90+" | "unscheduled" {
  if (!dueDate) return "unscheduled";
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

const BUCKET_LABELS: Record<string, string> = {
  "0-30": "Days 1–30",
  "31-60": "Days 31–60",
  "61-90": "Days 61–90",
  "90+": "Beyond 90 Days",
  unscheduled: "Unscheduled",
};

function bucketize(items: ActionItem[]) {
  const buckets: Record<string, ActionItem[]> = {
    "0-30": [],
    "31-60": [],
    "61-90": [],
    "90+": [],
    unscheduled: [],
  };
  for (const item of items) buckets[bucketFor(item.due_date)].push(item);
  return buckets;
}

export async function download306090Docx(orgId: string) {
  const { org, items } = await fetch306090Data(orgId);
  if (!org) throw new Error("Organization not found");
  const buckets = bucketize(items as ActionItem[]);

  const children: Array<Paragraph | Table> = [
    h1("30-60-90 Day Action Plan"),
    p(
      `${org.name} — generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    ),
    spacer(),
  ];

  for (const key of ["0-30", "31-60", "61-90", "90+", "unscheduled"]) {
    const rows = buckets[key];
    children.push(h2(BUCKET_LABELS[key]));
    if (rows.length === 0) {
      children.push(p("Nothing scheduled in this window.", { italic: true, color: BRAND.muted }));
    } else {
      children.push(
        tableFromRows(
          ["Task", "Pillar", "Owner", "Priority", "Due"],
          rows.map((r) => [
            r.title,
            r.pillar_name || "—",
            r.owner_label || "—",
            r.priority,
            formatDate(r.due_date),
          ]),
          [3360, 1800, 1560, 1200, 1440],
        ),
      );
    }
    children.push(spacer());
  }

  const doc = new Document({
    creator: "NMM Navigator",
    title: `${org.name} — 30-60-90 Day Action Plan`,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children,
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slug(org.name)}-30-60-90-day-plan.docx`);
}

export async function download306090Xlsx(orgId: string) {
  const { org, items } = await fetch306090Data(orgId);
  if (!org) throw new Error("Organization not found");
  const buckets = bucketize(items as ActionItem[]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "NMM Navigator";
  wb.created = new Date();

  for (const key of ["0-30", "31-60", "61-90", "90+", "unscheduled"]) {
    const ws = wb.addWorksheet(BUCKET_LABELS[key]);
    ws.columns = [
      { header: "Task", key: "t", width: 40 },
      { header: "Pillar", key: "pl", width: 24 },
      { header: "Owner", key: "o", width: 20 },
      { header: "Priority", key: "pr", width: 12 },
      { header: "Status", key: "s", width: 14 },
      { header: "Due", key: "d", width: 14 },
    ];
    styleHeaderRow(ws.getRow(1));
    for (const r of buckets[key]) {
      ws.addRow({
        t: r.title,
        pl: r.pillar_name || "",
        o: r.owner_label || "",
        pr: r.priority,
        s: r.status,
        d: formatDate(r.due_date),
      });
    }
  }

  const summary = wb.addWorksheet("Summary");
  summary.columns = [{ width: 30 }, { width: 20 }];
  for (const key of ["0-30", "31-60", "61-90", "90+", "unscheduled"]) {
    addKV(summary, BUCKET_LABELS[key], String(buckets[key].length));
  }

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${slug(org.name)}-30-60-90-day-plan.xlsx`,
  );
}
