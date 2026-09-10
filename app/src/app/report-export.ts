import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
export interface ReportDocument {
  readonly title: string;
  readonly stamp: string;
  readonly scope: string;
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly paragraphs: readonly string[];
}
function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportCsv(report: ReportDocument) {
  const cell = (value: string) => '"' + (/^[=+@-]/.test(value) ? "'" + value : value).replaceAll('"', '""') + '"';
  const text = [report.columns, ...report.rows].map((row) => row.map(cell).join(";")).join("\r\n");
  save(new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" }), "LicenGeo-relatorio.csv");
}
export async function exportPdf(report: ReportDocument) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  let page = pdf.addPage([595.28, 841.89]);
  let y = 792;
  const clean = (value: string) => value.replaceAll("→", " para ").replaceAll("×", " x ").replaceAll("◈", "").replaceAll("▣", "").replace(/[^\u0020-\u00ff\n]/g, " ");
  const line = (text: string, size = 10) => {
    if (y < 60) { page = pdf.addPage([595.28, 841.89]); y = 792; }
    page.drawText(text, { x: 44, y, size, font, color: rgb(0.1, 0.15, 0.18) }); y -= size + 6;
  };
  const paragraph = (value: string, size = 10) => {
    let buffer = "";
    for (const word of clean(value).split(/\s+/)) {
      if (font.widthOfTextAtSize(buffer + " " + word, size) > 500 && buffer) { line(buffer, size); buffer = ""; }
      buffer += (buffer ? " " : "") + word;
    }
    if (buffer) line(buffer, size);
    y -= 8;
  };
  paragraph("LicenGeo SP / SEMIL", 16); paragraph(report.title, 14); paragraph(report.stamp); paragraph(report.scope);
  report.paragraphs.forEach((text) => paragraph(text));
  report.rows.forEach((row, index) => { paragraph((index + 1) + ". " + row.map((value, i) => report.columns[i] + ": " + value).join(" | ")); });
  pdf.getPages().forEach((item, index, pages) => item.drawText("Documento demonstrativo / " + (index + 1) + " de " + pages.length, { x: 44, y: 30, size: 8, font }));
  const bytes = await pdf.save();
  save(new Blob([new Uint8Array(bytes).buffer], { type: "application/pdf" }), "LicenGeo-relatorio.pdf");
}
