import { Document, Packer, AlignmentType, Paragraph, TextRun, type Table } from "docx";
import { saveAs } from "file-saver";
import {
  fetchStrategicPlanData,
  formatMoney,
  formatDate,
  parseValues,
  sumYearly,
} from "./data";
import { BRAND, h1, h2, h3, p, bullet, spacer, tableFromRows } from "./docx-helpers";
import { PLAN_SECTIONS, IMPACT_LENSES } from "@/lib/plan/sections";

// Render a narrative body that may contain markdown-style **Bold:** sub-headings
// as a sequence of paragraphs with bold lead-ins.
function renderNarrative(body: string): Paragraph[] {
  if (!body?.trim()) {
    return [p("Not yet drafted. Visit Plan Narrative to draft this section with AI.", { italic: true, color: BRAND.muted })];
  }
  const out: Paragraph[] = [];
  const blocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/);
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    // Detect **Heading:** style sub-header at start of block.
    const headMatch = trimmed.match(/^\*\*(.+?)\*\*\s*(:?)\s*([\s\S]*)$/);
    if (headMatch) {
      const head = headMatch[1].trim();
      const colon = headMatch[2] ?? "";
      const rest = headMatch[3].trim();
      const runs: TextRun[] = [
        new TextRun({ text: `${head}${colon} `, bold: true, color: BRAND.deep, size: 22 }),
      ];
      if (rest) runs.push(new TextRun({ text: rest, size: 22, color: BRAND.text }));
      out.push(new Paragraph({ spacing: { after: 100 }, children: runs }));
    } else {
      out.push(p(trimmed));
    }
  }
  return out;
}

export async function downloadStrategicPlanDocx(orgId: string) {
  const data = await fetchStrategicPlanData(orgId);
  const { org, pillars, kpis, risks, okrs, roadmap, revenue, expenses, grants, narratives } = data;
  if (!org) throw new Error("Organization not found");
  const values = parseValues(org.values);
  const totalRev = sumYearly(revenue as Array<{ yearly_amounts: unknown }>);
  const totalExp = sumYearly(expenses as Array<{ yearly_amounts: unknown }>);

  const get = (key: string) => narratives[key]?.body ?? "";

  const children: Array<Paragraph | Table> = [];

  // ===== Cover =====
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: "STRATEGIC PLAN", bold: true, size: 18, color: BRAND.muted })],
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
          text: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
          size: 22,
          color: BRAND.muted,
        }),
      ],
    }),
  );

  // ===== Table of Contents =====
  children.push(h1("Table of Contents"));
  for (const s of PLAN_SECTIONS) {
    children.push(p(`${s.numeral}. ${s.title}`));
  }
  children.push(p("V. Strategic Goals & Objectives"));
  children.push(p("Appendix: Task Chart & Gantt"));
  children.push(spacer());

  // ===== I. Executive Summary =====
  children.push(h1("I. Executive Summary"));
  children.push(...renderNarrative(get("executive_summary")));
  children.push(spacer());

  // ===== II. Organizational Overview =====
  children.push(h1("II. Organizational Overview"));
  children.push(...renderNarrative(get("organizational_overview")));
  children.push(h3("Mission"));
  children.push(p(org.mission || "Not yet defined."));
  children.push(h3("Vision"));
  children.push(p(org.vision || "Not yet defined."));
  children.push(h3("Core Values"));
  if (values.length) {
    for (const v of values) children.push(bullet(v));
  } else {
    children.push(p("No values defined yet.", { italic: true, color: BRAND.muted }));
  }
  children.push(h3("Organization Snapshot"));
  children.push(
    tableFromRows(
      ["Metric", "Value"],
      [
        ["Annual Budget", formatMoney(org.annual_budget)],
        ["Staff", String(org.staff_count ?? "—")],
        ["Volunteers", String(org.volunteer_count ?? "—")],
        ["Geographic Area", org.geographic_area || "—"],
        ["Beneficiaries", org.beneficiaries || "—"],
      ],
      [3000, 6360],
    ),
  );
  children.push(spacer());

  // ===== III. Current State Assessment =====
  children.push(h1("III. Current State Assessment"));
  children.push(...renderNarrative(get("current_state")));
  children.push(spacer());

  // ===== IV. Strategic Issues =====
  children.push(h1("IV. Strategic Issues & IMPACT Framework Approach"));
  children.push(...renderNarrative(get("strategic_issues")));
  children.push(h3("The IMPACT Framework"));
  for (const lens of IMPACT_LENSES) {
    children.push(bullet(lens.label));
  }
  children.push(spacer());

  // ===== V. Strategic Goals & Objectives =====
  children.push(h1("V. Strategic Goals & Objectives"));
  children.push(h2("Strategic Pillars"));
  if (pillars.length === 0) {
    children.push(p("No strategic pillars defined yet.", { italic: true, color: BRAND.muted }));
  } else {
    for (const pillar of pillars as Array<{ name: string; description: string | null }>) {
      children.push(h3(pillar.name));
      if (pillar.description) children.push(p(pillar.description));
    }
  }
  children.push(h2("OKRs (Objectives & Key Results)"));
  if (okrs.length === 0) {
    children.push(p("No OKRs defined yet.", { italic: true, color: BRAND.muted }));
  } else {
    children.push(
      tableFromRows(
        ["Objective", "Quarter", "Owner", "Status"],
        (okrs as Array<{ objective: string; quarter: string | null; owner: string | null; status: string }>).map((o) => [
          o.objective,
          o.quarter || "—",
          o.owner || "—",
          o.status || "—",
        ]),
        [4800, 1500, 1560, 1500],
      ),
    );
  }
  children.push(spacer());

  // ===== VI. Financial Strategy =====
  children.push(h1("VI. Financial Strategy"));
  children.push(...renderNarrative(get("financial_strategy")));
  children.push(h3("Financial Snapshot"));
  children.push(
    tableFromRows(
      ["Metric", "Value"],
      [
        ["Annual Budget", formatMoney(org.annual_budget)],
        ["Projected Revenue (plan horizon)", formatMoney(totalRev)],
        ["Projected Expenses (plan horizon)", formatMoney(totalExp)],
        ["Active Grants", String(grants.filter((g: { status: string }) => g.status === "awarded").length)],
      ],
      [3960, 5400],
    ),
  );
  if (grants.length) {
    children.push(h3("Key Funders & Grants"));
    children.push(
      tableFromRows(
        ["Funder", "Grant", "Status", "Amount"],
        (grants as Array<{ funder_name: string; grant_name: string; status: string; amount_awarded: number | null; amount_requested: number | null }>)
          .slice(0, 15)
          .map((g) => [
            g.funder_name,
            g.grant_name,
            g.status,
            formatMoney(g.amount_awarded ?? g.amount_requested),
          ]),
        [2400, 3000, 1560, 2400],
      ),
    );
  }
  children.push(spacer());

  // ===== VII. Program Enhancements =====
  children.push(h1("VII. Program & Curriculum Enhancements"));
  children.push(...renderNarrative(get("program_enhancements")));
  children.push(spacer());

  // ===== VIII. Community Engagement =====
  children.push(h1("VIII. Community Engagement & Partnerships"));
  children.push(...renderNarrative(get("community_engagement")));
  children.push(spacer());

  // ===== IX. Leadership & Succession =====
  children.push(h1("IX. Leadership & Succession Planning"));
  children.push(...renderNarrative(get("leadership_succession")));
  children.push(spacer());

  // ===== X. Measurement & Evaluation =====
  children.push(h1("X. Measurement & Evaluation Plan"));
  children.push(...renderNarrative(get("measurement_evaluation")));
  children.push(h3("Key Performance Indicators"));
  if (kpis.length === 0) {
    children.push(p("No KPIs defined yet.", { italic: true, color: BRAND.muted }));
  } else {
    children.push(
      tableFromRows(
        ["KPI", "Baseline", "Current", "Target"],
        (kpis as Array<{ name: string; unit: string | null; baseline: number | null; current_value: number | null; target: number | null }>).map((k) => [
          `${k.name}${k.unit ? ` (${k.unit})` : ""}`,
          String(k.baseline ?? "—"),
          String(k.current_value ?? "—"),
          String(k.target ?? "—"),
        ]),
        [3960, 1800, 1800, 1800],
      ),
    );
  }
  children.push(spacer());

  // ===== XI. Risk Mitigation =====
  children.push(h1("XI. Risk Mitigation Strategies"));
  children.push(...renderNarrative(get("risk_mitigation")));
  children.push(h3("Risk Register"));
  if (risks.length === 0) {
    children.push(p("No risks logged yet.", { italic: true, color: BRAND.muted }));
  } else {
    children.push(
      tableFromRows(
        ["Risk", "Category", "Likelihood", "Impact", "Mitigation"],
        (risks as Array<{ title: string; category: string | null; likelihood: number | null; impact: number | null; mitigation: string | null }>).map((r) => [
          r.title,
          r.category || "—",
          String(r.likelihood ?? "—"),
          String(r.impact ?? "—"),
          r.mitigation || "—",
        ]),
        [2400, 1400, 1200, 1200, 3160],
      ),
    );
  }
  children.push(spacer());

  // ===== XII. Conclusion =====
  children.push(h1("XII. Conclusion"));
  children.push(...renderNarrative(get("conclusion")));
  children.push(spacer());

  // ===== Appendix: Task Chart =====
  children.push(h1("Appendix: Task Chart"));
  if (roadmap.length === 0) {
    children.push(p("No roadmap items logged yet.", { italic: true, color: BRAND.muted }));
  } else {
    children.push(
      tableFromRows(
        ["Task", "Start", "End", "Owner", "Status"],
        (roadmap as Array<{ title: string; start_date: string | null; end_date: string | null; owner: string | null; status: string }>).map((r) => [
          r.title,
          formatDate(r.start_date),
          formatDate(r.end_date),
          r.owner || "—",
          r.status || "—",
        ]),
        [3360, 1500, 1500, 1500, 1500],
      ),
    );
  }

  const doc = new Document({
    creator: "NMM Navigator",
    title: `${org.name} — Strategic Plan`,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slug(org.name)}-strategic-plan.docx`);
}

import ExcelJS from "exceljs";

export async function downloadStrategicPlanXlsx(orgId: string) {
  const { org, pillars, kpis, risks, okrs, roadmap, revenue, expenses, grants, narratives } =
    await fetchStrategicPlanData(orgId);
  if (!org) throw new Error("Organization not found");
  const values = parseValues(org.values);
  const wb = new ExcelJS.Workbook();
  wb.creator = "NMM Navigator";
  wb.created = new Date();

  // Overview
  const ov = wb.addWorksheet("Overview");
  ov.columns = [{ width: 24 }, { width: 80 }];
  styleHeader(ov.addRow([`${org.name} — Strategic Plan`, ""]).getCell(1));
  ov.mergeCells("A1:B1");
  ov.addRow([]);
  addKV(ov, "Mission", org.mission);
  addKV(ov, "Vision", org.vision);
  addKV(ov, "Values", values.join(" • "));
  addKV(ov, "Annual Budget", formatMoney(org.annual_budget));
  addKV(ov, "Staff", org.staff_count);
  addKV(ov, "Volunteers", org.volunteer_count);
  addKV(ov, "Geographic Area", org.geographic_area);
  addKV(ov, "Beneficiaries", org.beneficiaries);

  // Narrative sections
  const nrr = wb.addWorksheet("Narrative");
  nrr.columns = [
    { header: "Section", key: "s", width: 36 },
    { header: "Body", key: "b", width: 100 },
  ];
  styleHeaderRow(nrr.getRow(1));
  for (const s of PLAN_SECTIONS) {
    const body = narratives[s.key]?.body || "(not yet drafted)";
    const row = nrr.addRow({ s: `${s.numeral}. ${s.title}`, b: body });
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
    row.height = Math.min(200, Math.max(30, Math.ceil(body.length / 60) * 14));
  }

  // Pillars
  const ps = wb.addWorksheet("Pillars");
  ps.columns = [
    { header: "Order", key: "o", width: 8 },
    { header: "Pillar", key: "n", width: 28 },
    { header: "Description", key: "d", width: 70 },
  ];
  styleHeaderRow(ps.getRow(1));
  for (const pl of pillars as Array<{ sort_order: number | null; name: string; description: string | null }>) {
    ps.addRow({ o: pl.sort_order ?? "", n: pl.name, d: pl.description || "" });
  }

  // OKRs
  const os = wb.addWorksheet("OKRs");
  os.columns = [
    { header: "Objective", key: "ob", width: 50 },
    { header: "Quarter", key: "q", width: 12 },
    { header: "Owner", key: "ow", width: 20 },
    { header: "Status", key: "st", width: 14 },
    { header: "Progress %", key: "pr", width: 12 },
  ];
  styleHeaderRow(os.getRow(1));
  for (const o of okrs as Array<{ objective: string; quarter: string | null; owner: string | null; status: string; progress: number | null }>) {
    os.addRow({ ob: o.objective, q: o.quarter, ow: o.owner, st: o.status, pr: o.progress });
  }

  // KPIs
  const ks = wb.addWorksheet("KPIs");
  ks.columns = [
    { header: "KPI", key: "n", width: 36 },
    { header: "Category", key: "c", width: 16 },
    { header: "Unit", key: "u", width: 10 },
    { header: "Baseline", key: "b", width: 12 },
    { header: "Current", key: "cur", width: 12 },
    { header: "Target", key: "t", width: 12 },
    { header: "Target Year", key: "y", width: 12 },
  ];
  styleHeaderRow(ks.getRow(1));
  for (const k of kpis as Array<{ name: string; category: string | null; unit: string | null; baseline: number | null; current_value: number | null; target: number | null; target_year: number | null }>) {
    ks.addRow({
      n: k.name,
      c: k.category || "",
      u: k.unit || "",
      b: k.baseline,
      cur: k.current_value,
      t: k.target,
      y: k.target_year,
    });
  }

  // Risks
  const rs = wb.addWorksheet("Risks");
  rs.columns = [
    { header: "Risk", key: "t", width: 30 },
    { header: "Category", key: "c", width: 16 },
    { header: "Likelihood", key: "l", width: 12 },
    { header: "Impact", key: "i", width: 12 },
    { header: "Mitigation", key: "m", width: 50 },
  ];
  styleHeaderRow(rs.getRow(1));
  for (const r of risks as Array<{ title: string; category: string | null; likelihood: number | null; impact: number | null; mitigation: string | null }>) {
    rs.addRow({ t: r.title, c: r.category || "", l: r.likelihood, i: r.impact, m: r.mitigation || "" });
  }

  // Financials
  const fin = wb.addWorksheet("Financials");
  fin.columns = [{ width: 30 }, { width: 60 }];
  styleHeader(fin.addRow(["Financial Summary", ""]).getCell(1));
  fin.mergeCells("A1:B1");
  fin.addRow([]);
  addKV(fin, "Annual Budget", formatMoney(org.annual_budget));
  addKV(fin, "Projected Revenue (plan horizon)", formatMoney(sumYearly(revenue as Array<{ yearly_amounts: unknown }>)));
  addKV(fin, "Projected Expenses (plan horizon)", formatMoney(sumYearly(expenses as Array<{ yearly_amounts: unknown }>)));
  addKV(fin, "Grants Logged", String(grants.length));
  addKV(fin, "Revenue Streams Logged", String(revenue.length));
  addKV(fin, "Expense Lines Logged", String(expenses.length));

  // Roadmap / Task Chart
  const tc = wb.addWorksheet("Task Chart");
  tc.columns = [
    { header: "Task", key: "t", width: 40 },
    { header: "Start", key: "s", width: 14 },
    { header: "End", key: "e", width: 14 },
    { header: "Owner", key: "o", width: 20 },
    { header: "Status", key: "st", width: 14 },
  ];
  styleHeaderRow(tc.getRow(1));
  for (const r of roadmap as Array<{ title: string; start_date: string | null; end_date: string | null; owner: string | null; status: string }>) {
    tc.addRow({ t: r.title, s: formatDate(r.start_date), e: formatDate(r.end_date), o: r.owner || "", st: r.status });
  }

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${slug(org.name)}-strategic-plan.xlsx`,
  );
}

export function slug(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "export"
  );
}

export function styleHeader(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 14 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
}

export function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    c.alignment = { vertical: "middle" };
  });
}

export function addKV(ws: ExcelJS.Worksheet, k: string, v: unknown) {
  const row = ws.addRow([k, v == null || v === "" ? "—" : v]);
  row.getCell(1).font = { bold: true, color: { argb: "FF64748B" } };
  row.getCell(2).alignment = { wrapText: true, vertical: "top" };
}
