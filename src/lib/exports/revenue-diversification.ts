import { Document, Packer, type Table, Paragraph } from "docx";
import { saveAs } from "file-saver";
import { fetchRevenueDiversificationData, formatMoney, formatDate } from "./data";
import { BRAND, h1, h2, p, spacer, tableFromRows } from "./docx-helpers";
import { slug, styleHeaderRow, addKV } from "./strategic-plan";
import ExcelJS from "exceljs";

export function hhiBand(hhi: number) {
  if (hhi < 0.15) return "Highly Diversified";
  if (hhi < 0.25) return "Well Diversified";
  if (hhi < 0.4) return "Moderately Concentrated";
  if (hhi < 0.6) return "Highly Concentrated";
  return "Severely Concentrated";
}

export async function downloadRevenueDiversificationDocx(orgId: string) {
  const { org, categories, total, hhi, assessment } = await fetchRevenueDiversificationData(orgId);
  if (!org) throw new Error("Organization not found");

  const children: Array<Paragraph | Table> = [
    h1("Revenue Diversification Report"),
    p(
      `${org.name} — concentration risk scored with the Herfindahl-Hirschman Index (HHI). Lower is better.`,
    ),
    spacer(),
    h2("Concentration Summary"),
    tableFromRows(
      ["Metric", "Value"],
      [
        ["Total Revenue (all categories)", formatMoney(total)],
        ["HHI Score", hhi.toFixed(3)],
        ["Risk Band", hhiBand(hhi)],
        ["Categories Tracked", String(categories.length)],
      ],
      [4680, 4680],
    ),
    spacer(),
    h2("Revenue by Category"),
  ];
  if (categories.length === 0) {
    children.push(p("No revenue streams logged yet.", { italic: true, color: BRAND.muted }));
  } else {
    children.push(
      tableFromRows(
        ["Category", "Amount", "Share of Total"],
        categories.map((c) => [c.category, formatMoney(c.amount), `${Math.round(c.share * 100)}%`]),
        [4000, 2680, 2680],
      ),
    );
  }
  children.push(spacer());
  if (assessment) {
    children.push(
      h2("Fundraising Readiness Assessment"),
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
    );
  }

  const doc = new Document({
    creator: "NMM Navigator",
    title: `${org.name} — Revenue Diversification Report`,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children,
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slug(org.name)}-revenue-diversification.docx`);
}

export async function downloadRevenueDiversificationXlsx(orgId: string) {
  const { org, categories, total, hhi } = await fetchRevenueDiversificationData(orgId);
  if (!org) throw new Error("Organization not found");

  const wb = new ExcelJS.Workbook();
  wb.creator = "NMM Navigator";
  wb.created = new Date();

  const sm = wb.addWorksheet("Summary");
  sm.columns = [{ width: 30 }, { width: 30 }];
  addKV(sm, "Total Revenue", formatMoney(total));
  addKV(sm, "HHI Score", hhi.toFixed(3));
  addKV(sm, "Risk Band", hhiBand(hhi));

  const cat = wb.addWorksheet("By Category");
  cat.columns = [
    { header: "Category", key: "c", width: 30 },
    { header: "Amount", key: "a", width: 18 },
    { header: "Share", key: "s", width: 14 },
  ];
  styleHeaderRow(cat.getRow(1));
  for (const c of categories)
    cat.addRow({ c: c.category, a: c.amount, s: `${Math.round(c.share * 100)}%` });

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${slug(org.name)}-revenue-diversification.xlsx`,
  );
}
