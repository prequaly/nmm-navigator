import { Document, Packer, type Table, Paragraph } from "docx";
import { saveAs } from "file-saver";
import { fetchGrantReadinessData, formatMoney } from "./data";
import { BRAND, h1, h2, p, bullet, spacer, tableFromRows } from "./docx-helpers";
import { slug, styleHeaderRow, addKV } from "./strategic-plan";
import ExcelJS from "exceljs";

export async function downloadGrantReadinessDocx(orgId: string) {
  const { org, checklist, readyCount, grants, assessment } = await fetchGrantReadinessData(orgId);
  if (!org) throw new Error("Organization not found");

  const children: Array<Paragraph | Table> = [
    h1("Grant Readiness Report"),
    p(`${org.name} — ${readyCount} of ${checklist.length} readiness criteria met.`),
    spacer(),
    h2("Readiness Checklist"),
  ];
  for (const item of checklist) children.push(bullet(`${item.done ? "✓" : "✗"} ${item.label}`));
  children.push(spacer());

  if (assessment) {
    children.push(
      h2("Fundraising Readiness Assessment"),
      tableFromRows(
        ["Score", "Maturity Level"],
        [[String(assessment.score ?? "—"), assessment.maturity_level || "—"]],
        [4680, 4680],
      ),
      spacer(),
    );
  }

  children.push(h2("Grant Pipeline"));
  if (grants.length === 0) {
    children.push(p("No grants logged yet.", { italic: true, color: BRAND.muted }));
  } else {
    children.push(
      tableFromRows(
        ["Funder", "Grant", "Status", "Amount"],
        (
          grants as Array<{
            funder_name: string;
            grant_name: string;
            status: string;
            amount_requested: number | null;
            amount_awarded: number | null;
          }>
        ).map((g) => [
          g.funder_name,
          g.grant_name,
          g.status,
          formatMoney(g.amount_awarded ?? g.amount_requested),
        ]),
        [2400, 3000, 1560, 2400],
      ),
    );
  }

  const doc = new Document({
    creator: "NMM Navigator",
    title: `${org.name} — Grant Readiness Report`,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children,
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slug(org.name)}-grant-readiness.docx`);
}

export async function downloadGrantReadinessXlsx(orgId: string) {
  const { org, checklist, boardCount, policyCount, grantResponseCount, grants } =
    await fetchGrantReadinessData(orgId);
  if (!org) throw new Error("Organization not found");

  const wb = new ExcelJS.Workbook();
  wb.creator = "NMM Navigator";
  wb.created = new Date();

  const cl = wb.addWorksheet("Checklist");
  cl.columns = [
    { header: "Criterion", key: "c", width: 44 },
    { header: "Met?", key: "m", width: 10 },
  ];
  styleHeaderRow(cl.getRow(1));
  for (const item of checklist) cl.addRow({ c: item.label, m: item.done ? "Yes" : "No" });

  const sm = wb.addWorksheet("Summary");
  sm.columns = [{ width: 30 }, { width: 20 }];
  addKV(sm, "Board Members Recorded", String(boardCount));
  addKV(sm, "Governance Policies Filed", String(policyCount));
  addKV(sm, "Grant Response Bank Entries", String(grantResponseCount));

  const gr = wb.addWorksheet("Grant Pipeline");
  gr.columns = [
    { header: "Funder", key: "f", width: 26 },
    { header: "Grant", key: "g", width: 30 },
    { header: "Status", key: "s", width: 16 },
    { header: "Requested", key: "r", width: 16 },
    { header: "Awarded", key: "a", width: 16 },
  ];
  styleHeaderRow(gr.getRow(1));
  for (const g of grants as Array<{
    funder_name: string;
    grant_name: string;
    status: string;
    amount_requested: number | null;
    amount_awarded: number | null;
  }>) {
    gr.addRow({
      f: g.funder_name,
      g: g.grant_name,
      s: g.status,
      r: g.amount_requested,
      a: g.amount_awarded,
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${slug(org.name)}-grant-readiness.xlsx`,
  );
}
