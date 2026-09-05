import { Document, Packer, type Table, Paragraph } from "docx";
import { saveAs } from "file-saver";
import { fetchLogicModelData } from "./data";
import { BRAND, h1, h2, p, bullet, spacer } from "./docx-helpers";
import { slug } from "./strategic-plan";
import ExcelJS from "exceljs";

const CHAIN: Array<{
  key: "inputs" | "activities" | "outputs" | "outcomes" | "impact";
  label: string;
}> = [
  { key: "inputs", label: "Inputs" },
  { key: "activities", label: "Activities" },
  { key: "outputs", label: "Outputs" },
  { key: "outcomes", label: "Outcomes" },
  { key: "impact", label: "Impact" },
];

export async function downloadLogicModelDocx(orgId: string) {
  const { org, toc } = await fetchLogicModelData(orgId);
  if (!org) throw new Error("Organization not found");

  const children: Array<Paragraph | Table> = [
    h1("Logic Model & Theory of Change"),
    p(`${org.name} — the causal chain from resources to lasting impact.`),
    spacer(),
  ];

  if (!toc) {
    children.push(
      p("No theory of change defined yet. Visit Theory of Change to build it.", {
        italic: true,
        color: BRAND.muted,
      }),
    );
  } else {
    children.push(h2("Problem Statement"), p(toc.problemStatement || "Not yet defined."), spacer());
    for (const step of CHAIN) {
      children.push(h2(step.label));
      const items = toc[step.key];
      if (items.length === 0) {
        children.push(p("Not yet defined.", { italic: true, color: BRAND.muted }));
      } else {
        for (const item of items) children.push(bullet(item));
      }
      children.push(spacer());
    }
    children.push(h2("Assumptions"));
    if (toc.assumptions.length === 0)
      children.push(p("Not yet defined.", { italic: true, color: BRAND.muted }));
    else for (const a of toc.assumptions) children.push(bullet(a));
    children.push(spacer());

    children.push(h2("External Factors"));
    if (toc.externalFactors.length === 0)
      children.push(p("Not yet defined.", { italic: true, color: BRAND.muted }));
    else for (const f of toc.externalFactors) children.push(bullet(f));
  }

  const doc = new Document({
    creator: "NMM Navigator",
    title: `${org.name} — Logic Model & Theory of Change`,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children,
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slug(org.name)}-logic-model.docx`);
}

export async function downloadLogicModelXlsx(orgId: string) {
  const { org, toc } = await fetchLogicModelData(orgId);
  if (!org) throw new Error("Organization not found");

  const wb = new ExcelJS.Workbook();
  wb.creator = "NMM Navigator";
  wb.created = new Date();

  const ws = wb.addWorksheet("Logic Model");
  ws.columns = [
    { header: "Inputs", key: "inputs", width: 30 },
    { header: "Activities", key: "activities", width: 30 },
    { header: "Outputs", key: "outputs", width: 30 },
    { header: "Outcomes", key: "outcomes", width: 30 },
    { header: "Impact", key: "impact", width: 30 },
  ];
  ws.getRow(1).eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
  });
  const rowCount = toc
    ? Math.max(
        toc.inputs.length,
        toc.activities.length,
        toc.outputs.length,
        toc.outcomes.length,
        toc.impact.length,
      )
    : 0;
  for (let i = 0; i < rowCount; i++) {
    ws.addRow({
      inputs: toc?.inputs[i] ?? "",
      activities: toc?.activities[i] ?? "",
      outputs: toc?.outputs[i] ?? "",
      outcomes: toc?.outcomes[i] ?? "",
      impact: toc?.impact[i] ?? "",
    });
  }

  const meta = wb.addWorksheet("Problem & Assumptions");
  meta.columns = [{ width: 24 }, { width: 80 }];
  meta.addRow(["Problem Statement", toc?.problemStatement || ""]);
  meta.addRow(["Assumptions", (toc?.assumptions ?? []).join("; ")]);
  meta.addRow(["External Factors", (toc?.externalFactors ?? []).join("; ")]);

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${slug(org.name)}-logic-model.xlsx`,
  );
}
