import { Document, Packer, type Table, Paragraph } from "docx";
import { saveAs } from "file-saver";
import { fetchProgramImpactData, formatMoney, formatDate } from "./data";
import { BRAND, h1, h2, p, spacer, tableFromRows } from "./docx-helpers";
import { slug, styleHeaderRow } from "./strategic-plan";
import ExcelJS from "exceljs";

export async function downloadProgramImpactDocx(orgId: string) {
  const { org, programs, kpis, assessment } = await fetchProgramImpactData(orgId);
  if (!org) throw new Error("Organization not found");

  const children: Array<Paragraph | Table> = [
    h1("Program Impact Report"),
    p(`${org.name} — program roster and outcome metrics.`),
    spacer(),
  ];
  if (assessment) {
    children.push(
      h2("Program Impact Assessment"),
      tableFromRows(
        ["Score", "Maturity Level", "Completed"],
        [
          [
            String(assessment.score ?? "—"),
            assessment.maturity_level || "—",
            formatDate(assessment.completed_at),
          ],
        ],
        [2400, 3960, 3000],
      ),
      spacer(),
    );
  }

  children.push(h2("Programs"));
  if (programs.length === 0) {
    children.push(p("No programs logged yet.", { italic: true, color: BRAND.muted }));
  } else {
    children.push(
      tableFromRows(
        ["Program", "Type", "Status", "Budget", "Participants"],
        (
          programs as Array<{
            name: string;
            type: string;
            status: string;
            budget: number | null;
            participants: number | null;
          }>
        ).map((pr) => [
          pr.name,
          pr.type,
          pr.status,
          formatMoney(pr.budget),
          String(pr.participants ?? "—"),
        ]),
        [3160, 1800, 1600, 1600, 1200],
      ),
    );
  }
  children.push(spacer());

  children.push(h2("Outcome Metrics (KPIs)"));
  if (kpis.length === 0) {
    children.push(p("No KPIs defined yet.", { italic: true, color: BRAND.muted }));
  } else {
    children.push(
      tableFromRows(
        ["KPI", "Baseline", "Current", "Target"],
        (
          kpis as Array<{
            name: string;
            unit: string | null;
            baseline: number | null;
            current_value: number | null;
            target: number | null;
          }>
        ).map((k) => [
          `${k.name}${k.unit ? ` (${k.unit})` : ""}`,
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
    title: `${org.name} — Program Impact Report`,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children,
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slug(org.name)}-program-impact.docx`);
}

export async function downloadProgramImpactXlsx(orgId: string) {
  const { org, programs, kpis } = await fetchProgramImpactData(orgId);
  if (!org) throw new Error("Organization not found");

  const wb = new ExcelJS.Workbook();
  wb.creator = "NMM Navigator";
  wb.created = new Date();

  const ps = wb.addWorksheet("Programs");
  ps.columns = [
    { header: "Program", key: "n", width: 30 },
    { header: "Type", key: "ty", width: 16 },
    { header: "Status", key: "s", width: 14 },
    { header: "Budget", key: "b", width: 16 },
    { header: "Participants", key: "p", width: 14 },
  ];
  styleHeaderRow(ps.getRow(1));
  for (const pr of programs as Array<{
    name: string;
    type: string;
    status: string;
    budget: number | null;
    participants: number | null;
  }>) {
    ps.addRow({ n: pr.name, ty: pr.type, s: pr.status, b: pr.budget, p: pr.participants });
  }

  const ks = wb.addWorksheet("KPIs");
  ks.columns = [
    { header: "KPI", key: "n", width: 30 },
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
    `${slug(org.name)}-program-impact.xlsx`,
  );
}
