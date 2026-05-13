import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, HeadingLevel,
} from "docx";
import type { OnCallResult } from "./oncall-v2";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface PersonAgg {
  name: string;
  amount: number;
}

function aggregate(results: OnCallResult[]): PersonAgg[] {
  const map = new Map<string, PersonAgg>();
  for (const r of results) {
    const key = (r.person || "Unnamed").trim();
    if (!map.has(key)) map.set(key, { name: key, amount: 0 });
    map.get(key)!.amount += r.payment;
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function detectMonthYear(results: OnCallResult[]): { month: string; year: number } {
  const dates = results
    .map((r) => r.fromDate)
    .filter(Boolean)
    .map((d) => new Date(d + "T00:00:00"))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  const d = dates[0] ?? new Date();
  return { month: MONTHS[d.getMonth()], year: d.getFullYear() };
}

const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const cellBorders = { top: border, bottom: border, left: border, right: border };

function makeCell(text: string, opts: { bold?: boolean; shading?: string; width: number; align?: typeof AlignmentType[keyof typeof AlignmentType] } = { width: 3120 }) {
  return new TableCell({
    borders: cellBorders,
    width: { size: opts.width, type: WidthType.DXA },
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: opts.align,
        children: [new TextRun({ text, bold: opts.bold, font: "Calibri", size: 22 })],
      }),
    ],
  });
}

export async function exportPaymentDocx(results: OnCallResult[]): Promise<void> {
  const people = aggregate(results.filter((r) => r.payment > 0 || r.person.trim()));
  const { month, year } = detectMonthYear(results);
  const total = people.reduce((a, p) => a + p.amount, 0);

  const COL_NAME = 6240;
  const COL_AMT = 3120;
  const TABLE_W = COL_NAME + COL_AMT;

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      makeCell("Name", { bold: true, shading: "EFEFEF", width: COL_NAME }),
      makeCell("Amount", { bold: true, shading: "EFEFEF", width: COL_AMT, align: AlignmentType.RIGHT }),
    ],
  });

  const dataRows = people.map(
    (p) =>
      new TableRow({
        children: [
          makeCell(p.name, { width: COL_NAME }),
          makeCell(`€ ${p.amount.toLocaleString("en-IE")}`, { width: COL_AMT, align: AlignmentType.RIGHT }),
        ],
      }),
  );

  const totalRow = new TableRow({
    children: [
      makeCell("Total", { bold: true, shading: "F7F7F7", width: COL_NAME }),
      makeCell(`€ ${total.toLocaleString("en-IE")}`, { bold: true, shading: "F7F7F7", width: COL_AMT, align: AlignmentType.RIGHT }),
    ],
  });

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Calibri", size: 22 } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 360 },
            children: [
              new TextRun({ text: "Application for Additional Payment", bold: true, size: 32, font: "Calibri" }),
            ],
          }),
          new Paragraph({
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `Please pay extra payment for additional tasks in ${month} ${year} to following employees:`,
                font: "Calibri",
                size: 22,
              }),
            ],
          }),
          new Table({
            width: { size: TABLE_W, type: WidthType.DXA },
            columnWidths: [COL_NAME, COL_CC, COL_AMT],
            rows: [headerRow, ...dataRows, totalRow],
          }),
          new Paragraph({ spacing: { before: 720 }, children: [new TextRun("")] }),
          new Paragraph({ spacing: { before: 480 }, children: [new TextRun("")] }),
          new Paragraph({
            children: [new TextRun({ text: "Coordinator/Team Lead name", font: "Calibri", size: 22 })],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `additional-payment-${month}-${year}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
