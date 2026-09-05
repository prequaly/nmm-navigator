import { Document, Packer, type Table, Paragraph } from "docx";
import { saveAs } from "file-saver";
import { h1, h2, p, bullet, spacer } from "./docx-helpers";
import { slug } from "./strategic-plan";

function renderMarkdown(md: string): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = [];
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) {
      out.push(p(para.join(" ").replace(/\*\*(.+?)\*\*/g, "$1")));
      para = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      flushPara();
      out.push(h2(line.slice(3)));
    } else if (/^[-*]\s+/.test(line)) {
      flushPara();
      out.push(bullet(line.replace(/^[-*]\s+/, "").replace(/\*\*(.+?)\*\*/g, "$1")));
    } else if (line.trim() === "") {
      flushPara();
    } else {
      para.push(line);
    }
  }
  flushPara();
  return out;
}

export async function downloadMonthlyReviewDocx(orgName: string, monthLabel: string, text: string) {
  const children: Array<Paragraph | Table> = [
    h1("Monthly Strategic Review"),
    p(`${orgName} — ${monthLabel}`),
    spacer(),
    ...renderMarkdown(text),
  ];

  const doc = new Document({
    creator: "NMM Navigator",
    title: `${orgName} — Monthly Strategic Review — ${monthLabel}`,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children,
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slug(orgName)}-monthly-review-${slug(monthLabel)}.docx`);
}
