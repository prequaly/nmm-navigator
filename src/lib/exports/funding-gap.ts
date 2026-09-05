import { Document, Packer, type Table, Paragraph } from "docx";
import { saveAs } from "file-saver";
import { fetchFundingGapData, formatMoney } from "./data";
import { BRAND, h1, h2, p, spacer, tableFromRows } from "./docx-helpers";
import { slug, styleHeaderRow, addKV } from "./strategic-plan";
import ExcelJS from "exceljs";

export async function downloadFundingGapDocx(orgId: string) {
  const { org, asks, totalRequired, totalSecured, totalGap } = await fetchFundingGapData(orgId);
  if (!org) throw new Error("Organization not found");

  const children: Array<Paragraph | Table> = [
    h1("Funding Gap Report"),
    p(`${org.name} — required vs. secured funding across the Asks Bank.`),
    spacer(),
    h2("Summary"),
    tableFromRows(
      ["Metric", "Value"],
      [
        ["Total Required", formatMoney(totalRequired)],
        ["Total Secured", formatMoney(totalSecured)],
        ["Remaining Gap", formatMoney(totalGap)],
        ["Asks Logged", String(asks.length)],
      ],
      [4680, 4680],
    ),
    spacer(),
    h2("Asks Detail"),
  ];
  if (asks.length === 0) {
    children.push(
      p("No asks logged yet. Visit the Asks Bank to add funding needs.", {
        italic: true,
        color: BRAND.muted,
      }),
    );
  } else {
    children.push(
      tableFromRows(
        ["Ask", "Type", "Pillar", "Required", "Secured", "Gap", "Status"],
        asks.map((a) => [
          a.title,
          a.type,
          a.pillar_name || "—",
          formatMoney(a.amount),
          formatMoney(a.secured_amount),
          formatMoney(a.gap),
          a.status,
        ]),
        [2400, 1200, 1560, 1400, 1400, 1400, 1000],
      ),
    );
  }

  const doc = new Document({
    creator: "NMM Navigator",
    title: `${org.name} — Funding Gap Report`,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children,
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slug(org.name)}-funding-gap.docx`);
}

export async function downloadFundingGapXlsx(orgId: string) {
  const { org, asks, totalRequired, totalSecured, totalGap } = await fetchFundingGapData(orgId);
  if (!org) throw new Error("Organization not found");

  const wb = new ExcelJS.Workbook();
  wb.creator = "NMM Navigator";
  wb.created = new Date();

  const sm = wb.addWorksheet("Summary");
  sm.columns = [{ width: 30 }, { width: 24 }];
  addKV(sm, "Total Required", formatMoney(totalRequired));
  addKV(sm, "Total Secured", formatMoney(totalSecured));
  addKV(sm, "Remaining Gap", formatMoney(totalGap));

  const detail = wb.addWorksheet("Asks Detail");
  detail.columns = [
    { header: "Ask", key: "t", width: 30 },
    { header: "Type", key: "ty", width: 14 },
    { header: "Pillar", key: "pl", width: 24 },
    { header: "Required", key: "r", width: 16 },
    { header: "Secured", key: "s", width: 16 },
    { header: "Gap", key: "g", width: 16 },
    { header: "Status", key: "st", width: 14 },
  ];
  styleHeaderRow(detail.getRow(1));
  for (const a of asks) {
    detail.addRow({
      t: a.title,
      ty: a.type,
      pl: a.pillar_name || "",
      r: a.amount,
      s: a.secured_amount,
      g: a.gap,
      st: a.status,
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${slug(org.name)}-funding-gap.xlsx`,
  );
}
