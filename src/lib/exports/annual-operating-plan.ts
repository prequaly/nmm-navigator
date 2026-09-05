import { Document, Packer, type Table, Paragraph } from "docx";
import { saveAs } from "file-saver";
import { fetchAnnualOperatingPlanData, formatMoney, formatDate } from "./data";
import { BRAND, h1, h2, h3, p, spacer, tableFromRows } from "./docx-helpers";
import { slug, styleHeaderRow, addKV } from "./strategic-plan";
import ExcelJS from "exceljs";

export async function downloadAnnualOperatingPlanDocx(orgId: string) {
  const { org, pillars, kpis, roadmap, programs, totalRevenue, totalExpenses } =
    await fetchAnnualOperatingPlanData(orgId);
  if (!org) throw new Error("Organization not found");
  const year = new Date().getFullYear();

  const children: Array<Paragraph | Table> = [
    h1(`Annual Operating Plan — ${year}`),
    p(`${org.name} — year-1 work plan, programs, and budget.`),
    spacer(),
    h2("Budget Summary"),
    tableFromRows(
      ["Metric", "Value"],
      [
        ["Projected Revenue", formatMoney(totalRevenue)],
        ["Projected Expenses", formatMoney(totalExpenses)],
        ["Net", formatMoney(totalRevenue - totalExpenses)],
      ],
      [4680, 4680],
    ),
    spacer(),
    h2("Strategic Pillars"),
  ];
  if (pillars.length === 0) {
    children.push(p("No strategic pillars defined yet.", { italic: true, color: BRAND.muted }));
  } else {
    for (const pl of pillars as Array<{
      name: string;
      description: string | null;
      priority_level: string | null;
      timeline_start: string | null;
      timeline_end: string | null;
    }>) {
      children.push(h3(pl.name));
      if (pl.description) children.push(p(pl.description));
      children.push(
        p(
          `Priority: ${pl.priority_level || "—"} · Timeline: ${formatDate(pl.timeline_start)} – ${formatDate(pl.timeline_end)}`,
          { color: BRAND.muted },
        ),
      );
    }
  }
  children.push(spacer());

  children.push(h2("Programs"));
  if (programs.length === 0) {
    children.push(p("No programs logged yet.", { italic: true, color: BRAND.muted }));
  } else {
    children.push(
      tableFromRows(
        ["Program", "Type", "Status", "Budget"],
        (
          programs as Array<{ name: string; type: string; status: string; budget: number | null }>
        ).map((pr) => [pr.name, pr.type, pr.status, formatMoney(pr.budget)]),
        [3360, 2000, 1800, 2200],
      ),
    );
  }
  children.push(spacer());

  children.push(h2("Quarterly Work Plan"));
  if (roadmap.length === 0) {
    children.push(p("No roadmap items logged yet.", { italic: true, color: BRAND.muted }));
  } else {
    children.push(
      tableFromRows(
        ["Item", "Owner", "Start", "End", "Status"],
        (
          roadmap as Array<{
            title: string;
            owner: string | null;
            start_date: string;
            end_date: string;
            status: string;
          }>
        ).map((r) => [
          r.title,
          r.owner || "—",
          formatDate(r.start_date),
          formatDate(r.end_date),
          r.status,
        ]),
        [3360, 1800, 1500, 1500, 1200],
      ),
    );
  }
  children.push(spacer());

  children.push(h2("Key Performance Indicators"));
  if (kpis.length === 0) {
    children.push(p("No KPIs defined yet.", { italic: true, color: BRAND.muted }));
  } else {
    children.push(
      tableFromRows(
        ["KPI", "Baseline", "Current", "Target"],
        (
          kpis as Array<{
            name: string;
            baseline: number | null;
            current_value: number | null;
            target: number | null;
          }>
        ).map((k) => [
          k.name,
          String(k.baseline ?? "—"),
          String(k.current_value ?? "—"),
          String(k.target ?? "—"),
        ]),
        [3960, 1800, 1800, 1800],
      ),
    );
  }

  const doc = new Document({
    creator: "NMM Navigator",
    title: `${org.name} — Annual Operating Plan`,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children,
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slug(org.name)}-annual-operating-plan.docx`);
}

export async function downloadAnnualOperatingPlanXlsx(orgId: string) {
  const { org, pillars, kpis, roadmap, programs, totalRevenue, totalExpenses } =
    await fetchAnnualOperatingPlanData(orgId);
  if (!org) throw new Error("Organization not found");

  const wb = new ExcelJS.Workbook();
  wb.creator = "NMM Navigator";
  wb.created = new Date();

  const sm = wb.addWorksheet("Budget Summary");
  sm.columns = [{ width: 30 }, { width: 20 }];
  addKV(sm, "Projected Revenue", formatMoney(totalRevenue));
  addKV(sm, "Projected Expenses", formatMoney(totalExpenses));
  addKV(sm, "Net", formatMoney(totalRevenue - totalExpenses));

  const ps = wb.addWorksheet("Pillars");
  ps.columns = [
    { header: "Pillar", key: "n", width: 28 },
    { header: "Priority", key: "p", width: 14 },
    { header: "Start", key: "s", width: 14 },
    { header: "End", key: "e", width: 14 },
  ];
  styleHeaderRow(ps.getRow(1));
  for (const pl of pillars as Array<{
    name: string;
    priority_level: string | null;
    timeline_start: string | null;
    timeline_end: string | null;
  }>) {
    ps.addRow({
      n: pl.name,
      p: pl.priority_level || "",
      s: formatDate(pl.timeline_start),
      e: formatDate(pl.timeline_end),
    });
  }

  const pr = wb.addWorksheet("Programs");
  pr.columns = [
    { header: "Program", key: "n", width: 28 },
    { header: "Type", key: "t", width: 16 },
    { header: "Status", key: "s", width: 14 },
    { header: "Budget", key: "b", width: 16 },
  ];
  styleHeaderRow(pr.getRow(1));
  for (const p2 of programs as Array<{
    name: string;
    type: string;
    status: string;
    budget: number | null;
  }>) {
    pr.addRow({ n: p2.name, t: p2.type, s: p2.status, b: p2.budget });
  }

  const rm = wb.addWorksheet("Work Plan");
  rm.columns = [
    { header: "Item", key: "t", width: 34 },
    { header: "Owner", key: "o", width: 18 },
    { header: "Start", key: "s", width: 14 },
    { header: "End", key: "e", width: 14 },
    { header: "Status", key: "st", width: 14 },
  ];
  styleHeaderRow(rm.getRow(1));
  for (const r of roadmap as Array<{
    title: string;
    owner: string | null;
    start_date: string;
    end_date: string;
    status: string;
  }>) {
    rm.addRow({
      t: r.title,
      o: r.owner || "",
      s: formatDate(r.start_date),
      e: formatDate(r.end_date),
      st: r.status,
    });
  }

  const ks = wb.addWorksheet("KPIs");
  ks.columns = [
    { header: "KPI", key: "n", width: 28 },
    { header: "Baseline", key: "b", width: 12 },
    { header: "Current", key: "c", width: 12 },
    { header: "Target", key: "t", width: 12 },
  ];
  styleHeaderRow(ks.getRow(1));
  for (const k of kpis as Array<{
    name: string;
    baseline: number | null;
    current_value: number | null;
    target: number | null;
  }>) {
    ks.addRow({ n: k.name, b: k.baseline, c: k.current_value, t: k.target });
  }

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${slug(org.name)}-annual-operating-plan.xlsx`,
  );
}
