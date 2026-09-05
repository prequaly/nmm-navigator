import { Document, Packer, type Table, Paragraph } from "docx";
import { saveAs } from "file-saver";
import { fetch4RsReportData, formatDate } from "./data";
import { BRAND, h1, h2, h3, p, bullet, spacer, tableFromRows } from "./docx-helpers";
import { slug, styleHeaderRow } from "./strategic-plan";
import { FOURRS_LENSES } from "@/lib/plan/sections";
import ExcelJS from "exceljs";

export async function download4RsReportDocx(orgId: string) {
  const { org, assessment, pillars, narrativeBody } = await fetch4RsReportData(orgId);
  if (!org) throw new Error("Organization not found");

  const children: Array<Paragraph | Table> = [
    h1("4Rs Framework Report"),
    p(`${org.name} — Relationships · Resources · Results · Reputation`),
    spacer(),
    h2("Assessment Snapshot"),
  ];
  if (assessment) {
    children.push(
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
    if (assessment.reflection) {
      children.push(spacer(), h3("Leadership Reflection"), p(assessment.reflection));
    }
  } else {
    children.push(
      p("The 4Rs Framework Audit has not been completed yet.", {
        italic: true,
        color: BRAND.muted,
      }),
    );
  }
  children.push(spacer());

  children.push(h2("How Strategic Pillars Map to the 4Rs"));
  if (pillars.length === 0) {
    children.push(p("No strategic pillars defined yet.", { italic: true, color: BRAND.muted }));
  } else {
    for (const lens of FOURRS_LENSES) {
      const matches = (pillars as Array<{ name: string; fourrs_dimensions: string[] }>).filter(
        (pl) => (pl.fourrs_dimensions ?? []).includes(lens.key),
      );
      children.push(h3(lens.label));
      if (matches.length === 0) {
        children.push(
          p("No pillar currently tagged to this dimension.", { italic: true, color: BRAND.muted }),
        );
      } else {
        for (const m of matches) children.push(bullet(m.name));
      }
    }
  }
  children.push(spacer());

  children.push(h2("Financial Strategy Narrative"));
  children.push(p(narrativeBody || "Not yet drafted. Visit Plan Narrative to draft this section."));

  const doc = new Document({
    creator: "NMM Navigator",
    title: `${org.name} — 4Rs Report`,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children,
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slug(org.name)}-4rs-report.docx`);
}

export async function download4RsReportXlsx(orgId: string) {
  const { org, assessment, pillars } = await fetch4RsReportData(orgId);
  if (!org) throw new Error("Organization not found");

  const wb = new ExcelJS.Workbook();
  wb.creator = "NMM Navigator";
  wb.created = new Date();

  const ov = wb.addWorksheet("Assessment");
  ov.columns = [
    { header: "Score", key: "s", width: 12 },
    { header: "Maturity", key: "m", width: 24 },
    { header: "Completed", key: "c", width: 16 },
  ];
  styleHeaderRow(ov.getRow(1));
  ov.addRow({
    s: assessment?.score ?? "—",
    m: assessment?.maturity_level || "—",
    c: formatDate(assessment?.completed_at ?? null),
  });

  const ls = wb.addWorksheet("Dimension Coverage");
  ls.columns = [
    { header: "4Rs Dimension", key: "l", width: 30 },
    { header: "Pillar", key: "p", width: 40 },
  ];
  styleHeaderRow(ls.getRow(1));
  for (const lens of FOURRS_LENSES) {
    const matches = (pillars as Array<{ name: string; fourrs_dimensions: string[] }>).filter((pl) =>
      (pl.fourrs_dimensions ?? []).includes(lens.key),
    );
    if (matches.length === 0) ls.addRow({ l: lens.label, p: "(unassigned)" });
    else for (const m of matches) ls.addRow({ l: lens.label, p: m.name });
  }

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${slug(org.name)}-4rs-report.xlsx`,
  );
}
