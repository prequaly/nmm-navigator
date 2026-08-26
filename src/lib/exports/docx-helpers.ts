import {
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
} from "docx";

export const BRAND = {
  deep: "1E3A5F",
  primary: "2563EB",
  text: "0F172A",
  muted: "64748B",
  light: "F1F5F9",
  border: "CBD5E1",
};

export function h1(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 160 },
    children: [new TextRun({ text, bold: true, size: 32, color: BRAND.deep })],
  });
}

export function h2(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 26, color: BRAND.deep })],
  });
}

export function h3(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 160, after: 80 },
    children: [new TextRun({ text, bold: true, size: 22, color: BRAND.text })],
  });
}

export function p(text: string, opts: { bold?: boolean; italic?: boolean; color?: string } = {}) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({
        text: text || "—",
        bold: opts.bold,
        italics: opts.italic,
        color: opts.color ?? BRAND.text,
        size: 22,
      }),
    ],
  });
}

export function bullet(text: string) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 22, color: BRAND.text })],
  });
}

export function spacer() {
  return new Paragraph({ children: [new TextRun({ text: " ", size: 12 })] });
}

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: BRAND.border };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

export function tableFromRows(
  header: string[],
  rows: string[][],
  widths?: number[],
) {
  const totalWidth = 9360; // US Letter, 1" margins
  const colWidths = widths ?? header.map(() => Math.floor(totalWidth / header.length));

  const headerRow = new TableRow({
    tableHeader: true,
    children: header.map((text, i) =>
      new TableCell({
        borders: cellBorders,
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: { fill: BRAND.deep, type: ShadingType.CLEAR, color: "auto" },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 20 })],
          }),
        ],
      }),
    ),
  });

  const bodyRows = rows.map(
    (r) =>
      new TableRow({
        children: r.map((cell, i) =>
          new TableCell({
            borders: cellBorders,
            width: { size: colWidths[i], type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: cell || "—", size: 20 })],
              }),
            ],
          }),
        ),
      }),
  );

  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...bodyRows],
  });
}
