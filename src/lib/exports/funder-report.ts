import { Document, Packer, AlignmentType, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import ExcelJS from "exceljs";
import {
  fetchFunderReportData,
  formatMoney,
  formatDate,
  sumYearly,
} from "./data";
import { BRAND, h1, h2, p, spacer, tableFromRows } from "./docx-helpers";
import { slug, styleHeaderRow, addKV, styleHeader } from "./strategic-plan";

export async function downloadFunderReportDocx(orgId: string) {
  const { org, grants, kpis, revenue, expenses } = await fetchFunderReportData(orgId);
  if (!org) throw new Error("Organization not found");

  const revTotal = sumYearly(revenue);
  const expTotal = sumYearly(expenses);
  const active = (grants as any[]).filter((g) => ["awarded", "active"].includes(g.status));
  const pipeline = (grants as any[]).filter((g) => !["awarded", "active", "declined", "closed"].includes(g.status));
  const awardedTotal = active.reduce((a, g) => a + Number(g.amount_awarded ?? g.amount_requested ?? 0), 0);
  const pipelineWeighted = pipeline.reduce((a, g) => a + Number(g.amount_requested ?? 0) * Number(g.probability ?? 0) / 100, 0);

  const children: any[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: "FUNDER REPORT", bold: true, size: 18, color: BRAND.muted })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: org.name, bold: true, size: 48, color: BRAND.deep })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          size: 22, color: BRAND.muted,
        }),
      ],
    }),

    h1("About"),
    p(org.mission || "Mission not defined."),
    spacer(),

    h1("Organization Profile"),
    tableFromRows(
      ["Field", "Value"],
      [
        ["Annual Budget", formatMoney(org.annual_budget)],
        ["Staff", String(org.staff_count ?? "—")],
        ["Volunteers", String(org.volunteer_count ?? "—")],
        ["Geographic Area", org.geographic_area || "—"],
        ["Beneficiaries Served", org.beneficiaries || "—"],
      ],
      [3000, 6360],
    ),
    spacer(),

    h1("Financial Summary"),
    tableFromRows(
      ["Metric", "Amount"],
      [
        ["Total Annual Revenue (projected)", formatMoney(revTotal)],
        ["Total Annual Expenses (projected)", formatMoney(expTotal)],
        ["Net", formatMoney(revTotal - expTotal)],
        ["Grants Awarded / Active", formatMoney(awardedTotal)],
        ["Grant Pipeline (probability-weighted)", formatMoney(pipelineWeighted)],
      ],
      [5360, 4000],
    ),
    spacer(),

    h1("Active & Awarded Grants"),
  ];

  if (active.length === 0) {
    children.push(p("No active or awarded grants.", { italic: true, color: BRAND.muted }));
  } else {
    children.push(
      tableFromRows(
        ["Funder", "Grant", "Amount", "Start", "End"],
        active.map((g) => [
          g.funder_name,
          g.grant_name,
          formatMoney(g.amount_awarded ?? g.amount_requested),
          formatDate(g.start_date),
          formatDate(g.end_date),
        ]),
        [2200, 2600, 1560, 1500, 1500],
      ),
    );
  }
  children.push(spacer());

  children.push(h1("Grant Pipeline"));
  if (pipeline.length === 0) {
    children.push(p("No prospects in pipeline.", { italic: true, color: BRAND.muted }));
  } else {
    children.push(
      tableFromRows(
        ["Funder", "Grant", "Requested", "Probability", "Status"],
        pipeline.map((g) => [
          g.funder_name,
          g.grant_name,
          formatMoney(g.amount_requested),
          `${g.probability ?? 0}%`,
          g.status,
        ]),
        [2200, 2600, 1560, 1500, 1500],
      ),
    );
  }
  children.push(spacer());

  children.push(h1("Program Outcomes (KPIs)"));
  if (kpis.length === 0) {
    children.push(p("No outcome metrics defined yet.", { italic: true, color: BRAND.muted }));
  } else {
    children.push(
      tableFromRows(
        ["Metric", "Current", "Target", "% to Goal"],
        (kpis as any[]).map((k) => {
          const cur = Number(k.current_value ?? 0);
          const tgt = Number(k.target ?? 0);
          const pct = tgt ? `${Math.round((cur / tgt) * 100)}%` : "—";
          return [`${k.name}${k.unit ? ` (${k.unit})` : ""}`, String(k.current_value ?? "—"), String(k.target ?? "—"), pct];
        }),
        [4560, 1600, 1600, 1600],
      ),
    );
  }

  const doc = new Document({
    creator: "NMM Navigator",
    title: `${org.name} — Funder Report`,
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
  saveAs(blob, `${slug(org.name)}-funder-report.docx`);
}

export async function downloadFunderReportXlsx(orgId: string) {
  const { org, grants, kpis, revenue, expenses } = await fetchFunderReportData(orgId);
  if (!org) throw new Error("Organization not found");
  const revTotal = sumYearly(revenue);
  const expTotal = sumYearly(expenses);

  const wb = new ExcelJS.Workbook();
  wb.creator = "NMM Navigator";

  const ov = wb.addWorksheet("Overview");
  ov.columns = [{ width: 28 }, { width: 50 }];
  styleHeader(ov.addRow([`${org.name} — Funder Report`, ""]).getCell(1));
  ov.mergeCells("A1:B1");
  ov.addRow([]);
  addKV(ov, "Mission", org.mission);
  addKV(ov, "Annual Budget", formatMoney(org.annual_budget));
  addKV(ov, "Staff", org.staff_count);
  addKV(ov, "Volunteers", org.volunteer_count);
  addKV(ov, "Geographic Area", org.geographic_area);
  addKV(ov, "Beneficiaries", org.beneficiaries);
  addKV(ov, "Projected Revenue", formatMoney(revTotal));
  addKV(ov, "Projected Expenses", formatMoney(expTotal));
  addKV(ov, "Net", formatMoney(revTotal - expTotal));

  const gs = wb.addWorksheet("Grants");
  gs.columns = [
    { header: "Funder", key: "f", width: 24 },
    { header: "Grant", key: "g", width: 28 },
    { header: "Status", key: "s", width: 14 },
    { header: "Requested", key: "rq", width: 14, style: { numFmt: '"$"#,##0' } },
    { header: "Awarded", key: "aw", width: 14, style: { numFmt: '"$"#,##0' } },
    { header: "Probability", key: "p", width: 12 },
    { header: "Program Area", key: "pa", width: 22 },
    { header: "Start", key: "st", width: 14 },
    { header: "End", key: "en", width: 14 },
  ];
  styleHeaderRow(gs.getRow(1));
  for (const g of grants as any[]) {
    gs.addRow({
      f: g.funder_name, g: g.grant_name, s: g.status,
      rq: Number(g.amount_requested ?? 0),
      aw: Number(g.amount_awarded ?? 0),
      p: `${g.probability ?? 0}%`,
      pa: g.program_area, st: formatDate(g.start_date), en: formatDate(g.end_date),
    });
  }

  const ks = wb.addWorksheet("KPIs");
  ks.columns = [
    { header: "KPI", key: "n", width: 36 },
    { header: "Category", key: "c", width: 16 },
    { header: "Unit", key: "u", width: 10 },
    { header: "Current", key: "cur", width: 12 },
    { header: "Target", key: "t", width: 12 },
    { header: "% to Goal", key: "pct", width: 12 },
  ];
  styleHeaderRow(ks.getRow(1));
  for (const k of kpis as any[]) {
    const cur = Number(k.current_value ?? 0);
    const tgt = Number(k.target ?? 0);
    ks.addRow({
      n: k.name, c: k.category, u: k.unit, cur, t: tgt,
      pct: tgt ? `${Math.round((cur / tgt) * 100)}%` : "—",
    });
  }

  const rs = wb.addWorksheet("Revenue");
  rs.columns = [
    { header: "Source", key: "n", width: 30 },
    { header: "Category", key: "c", width: 18 },
    { header: "Total", key: "t", width: 16, style: { numFmt: '"$"#,##0' } },
  ];
  styleHeaderRow(rs.getRow(1));
  for (const r of revenue as any[]) rs.addRow({ n: r.name, c: r.category, t: sumYearly([r]) });

  const es = wb.addWorksheet("Expenses");
  es.columns = [
    { header: "Line", key: "n", width: 30 },
    { header: "Category", key: "c", width: 18 },
    { header: "Total", key: "t", width: 16, style: { numFmt: '"$"#,##0' } },
  ];
  styleHeaderRow(es.getRow(1));
  for (const e of expenses as any[]) es.addRow({ n: e.name, c: e.category, t: sumYearly([e]) });

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${slug(org.name)}-funder-report.xlsx`);
}
