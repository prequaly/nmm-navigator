import { Document, Packer, type Table, Paragraph } from "docx";
import { saveAs } from "file-saver";
import { fetchFinancialSustainabilityData, formatMoney } from "./data";
import { BRAND, h1, h2, p, spacer, tableFromRows } from "./docx-helpers";
import { slug, addKV } from "./strategic-plan";
import ExcelJS from "exceljs";

export async function downloadFinancialSustainabilityDocx(orgId: string) {
  const { org, assumption, totalRevenue, totalExpenses, net, reserveMonths } =
    await fetchFinancialSustainabilityData(orgId);
  if (!org) throw new Error("Organization not found");

  const children: Array<Paragraph | Table> = [
    h1("Financial Sustainability Report"),
    p(`${org.name} — reserves, runway, and budget assumptions.`),
    spacer(),
    h2("Financial Snapshot"),
    tableFromRows(
      ["Metric", "Value"],
      [
        ["Total Revenue (plan horizon)", formatMoney(totalRevenue)],
        ["Total Expenses (plan horizon)", formatMoney(totalExpenses)],
        ["Net", formatMoney(net)],
        [
          "Current Reserve Balance",
          assumption ? formatMoney(assumption.current_reserve_balance) : "—",
        ],
        ["Reserve Target (months)", assumption ? String(assumption.reserve_target_months) : "—"],
        ["Reserve Runway (months)", reserveMonths != null ? reserveMonths.toFixed(1) : "—"],
        [
          "Revenue Growth Rate",
          assumption ? `${(assumption.revenue_growth_rate * 100).toFixed(1)}%` : "—",
        ],
        ["Inflation Rate", assumption ? `${(assumption.inflation_rate * 100).toFixed(1)}%` : "—"],
      ],
      [4680, 4680],
    ),
    spacer(),
  ];
  if (assumption?.notes) {
    children.push(h2("Notes"), p(assumption.notes));
  } else if (!assumption) {
    children.push(
      p("No financial assumptions logged yet. Visit Budget & Pro Forma to set them.", {
        italic: true,
        color: BRAND.muted,
      }),
    );
  }

  const doc = new Document({
    creator: "NMM Navigator",
    title: `${org.name} — Financial Sustainability Report`,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children,
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slug(org.name)}-financial-sustainability.docx`);
}

export async function downloadFinancialSustainabilityXlsx(orgId: string) {
  const { org, assumption, totalRevenue, totalExpenses, net, reserveMonths } =
    await fetchFinancialSustainabilityData(orgId);
  if (!org) throw new Error("Organization not found");

  const wb = new ExcelJS.Workbook();
  wb.creator = "NMM Navigator";
  wb.created = new Date();

  const ws = wb.addWorksheet("Financial Sustainability");
  ws.columns = [{ width: 34 }, { width: 24 }];
  addKV(ws, "Total Revenue", formatMoney(totalRevenue));
  addKV(ws, "Total Expenses", formatMoney(totalExpenses));
  addKV(ws, "Net", formatMoney(net));
  addKV(
    ws,
    "Current Reserve Balance",
    assumption ? formatMoney(assumption.current_reserve_balance) : "—",
  );
  addKV(ws, "Reserve Target (months)", assumption ? assumption.reserve_target_months : "—");
  addKV(ws, "Reserve Runway (months)", reserveMonths != null ? reserveMonths.toFixed(1) : "—");
  addKV(
    ws,
    "Revenue Growth Rate",
    assumption ? `${(assumption.revenue_growth_rate * 100).toFixed(1)}%` : "—",
  );
  addKV(
    ws,
    "Inflation Rate",
    assumption ? `${(assumption.inflation_rate * 100).toFixed(1)}%` : "—",
  );

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${slug(org.name)}-financial-sustainability.xlsx`,
  );
}
