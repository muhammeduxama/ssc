import "server-only";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

const A4: [number, number] = [595.28, 841.89];
const M = 48;
const INK = rgb(0.05, 0.09, 0.08);
const MUTED = rgb(0.29, 0.35, 0.33);
const BRAND = rgb(0.055, 0.353, 0.282);

/** Small flowing-text PDF writer (headings, paragraphs, key/value rows) on A4 pages. */
export async function pdfDoc() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage = doc.addPage(A4);
  let y = A4[1] - M;
  const width = A4[0] - M * 2;
  // WinAnsi can't encode every character; keep what the standard fonts support.
  const clean = (s: string) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^\x20-\x7E£\n]/g, "");

  const ensure = (h: number) => {
    if (y - h < M) {
      page = doc.addPage(A4);
      y = A4[1] - M;
    }
  };
  const wrap = (text: string, f: PDFFont, size: number, w = width) => {
    const out: string[] = [];
    for (const para of clean(text).split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (f.widthOfTextAtSize(next, size) > w && line) {
          out.push(line);
          line = word;
        } else line = next;
      }
      out.push(line);
    }
    return out;
  };
  const text = (s: string, o: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; gap?: number } = {}) => {
    const size = o.size ?? 10.5;
    const f = o.bold ? bold : font;
    for (const line of wrap(s, f, size)) {
      ensure(size + 4);
      page.drawText(line, { x: M, y: y - size, size, font: f, color: o.color ?? INK });
      y -= size + 4;
    }
    y -= o.gap ?? 6;
  };
  return {
    doc,
    title: (s: string) => text(s, { size: 20, bold: true, color: BRAND, gap: 10 }),
    h: (s: string) => {
      y -= 6;
      text(s, { size: 13, bold: true, gap: 4 });
    },
    p: (s: string) => text(s),
    small: (s: string) => text(s, { size: 9, color: MUTED }),
    row: (k: string, v: string) => {
      const size = 10.5;
      const lines = wrap(v, font, size, width - 170);
      ensure(lines.length * (size + 4) + 4);
      page.drawText(clean(k), { x: M, y: y - size, size, font: bold, color: MUTED });
      lines.forEach((l, i) => page.drawText(l, { x: M + 170, y: y - size - i * (size + 4), size, font, color: INK }));
      y -= lines.length * (size + 4) + 4;
    },
    rule: () => {
      ensure(12);
      page.drawLine({ start: { x: M, y: y - 4 }, end: { x: A4[0] - M, y: y - 4 }, thickness: 0.6, color: rgb(0.83, 0.87, 0.85) });
      y -= 14;
    },
    save: () => doc.save(),
  };
}
