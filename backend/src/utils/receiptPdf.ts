/**
 * Minimal, dependency-free PDF writer used for customer receipts.
 * It draws text, lines and rectangles on A4 pages with the four standard PDF fonts, so nothing needs installing.
 * The standard fonts have no rupee sign, so amounts are printed as "Rs.".
 */
export interface ReceiptData {
  store: { name: string; address?: string | null; gstin?: string | null };
  orderNumber: string;
  date: Date;
  customer: { name: string; email: string; phone?: string | null };
  address: { fullName?: string | null; phone?: string | null; line1: string; line2?: string | null; city: string; state: string; pincode: string };
  items: { name: string; quantity: number; unitPaise: number }[];
  subtotalPaise: number; discountPaise: number; deliveryPaise: number; totalPaise: number;
  payment: { method?: string | null; status: string };
}

type FontKey = "F1" | "F2" | "F3" | "F4"; // Helvetica, Helvetica-Bold, Times-Roman, Times-Bold
const BASE_FONT: Record<FontKey, string> = { F1: "Helvetica", F2: "Helvetica-Bold", F3: "Times-Roman", F4: "Times-Bold" };
const WIDTHS: Record<FontKey, number[]> = {
  F1: [ // Helvetica, character codes 32..255 (1000 units per em)
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
    1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
    667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
    333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
    556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, 761,
    556, 500, 222, 556, 333, 1000, 556, 556, 333, 1000, 667, 333, 1000, 500, 611, 500,
    500, 222, 222, 333, 333, 350, 556, 1000, 333, 1000, 500, 333, 944, 500, 500, 667,
    278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333,
    400, 584, 333, 333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611,
    667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278,
    722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611,
    556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500
  ],
  F2: [ // Helvetica-Bold, character codes 32..255 (1000 units per em)
    278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
    975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
    667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
    333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
    611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584, 761,
    556, 500, 278, 556, 500, 1000, 556, 556, 333, 1000, 667, 333, 1000, 500, 611, 500,
    500, 278, 278, 500, 500, 350, 556, 1000, 333, 1000, 556, 333, 944, 500, 500, 667,
    278, 333, 556, 556, 556, 556, 280, 556, 333, 737, 370, 556, 584, 333, 737, 333,
    400, 584, 333, 333, 333, 611, 556, 278, 333, 333, 365, 556, 834, 834, 834, 611,
    722, 722, 722, 722, 722, 722, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278,
    722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611,
    556, 556, 556, 556, 556, 556, 889, 556, 556, 556, 556, 556, 278, 278, 278, 278,
    611, 611, 611, 611, 611, 611, 611, 584, 611, 611, 611, 611, 611, 556, 611, 556
  ],
  F3: [ // Times-Roman, character codes 32..255 (1000 units per em)
    250, 333, 408, 500, 500, 833, 778, 180, 333, 333, 500, 564, 250, 333, 250, 278,
    500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 278, 278, 564, 564, 564, 444,
    921, 722, 667, 667, 722, 611, 556, 722, 722, 333, 389, 722, 611, 889, 722, 722,
    556, 722, 667, 556, 611, 722, 722, 944, 722, 722, 611, 333, 278, 333, 469, 500,
    333, 444, 500, 444, 500, 444, 333, 500, 500, 278, 278, 500, 278, 778, 500, 500,
    500, 500, 333, 389, 278, 500, 500, 722, 500, 500, 444, 480, 200, 480, 541, 761,
    500, 500, 333, 500, 444, 1000, 500, 500, 333, 1000, 556, 333, 889, 500, 611, 500,
    500, 333, 333, 444, 444, 350, 500, 1000, 333, 980, 389, 333, 722, 500, 444, 722,
    250, 333, 500, 500, 500, 500, 200, 500, 333, 760, 276, 500, 564, 333, 760, 333,
    400, 564, 300, 300, 333, 500, 453, 250, 333, 300, 310, 500, 750, 750, 750, 444,
    722, 722, 722, 722, 722, 722, 889, 667, 611, 611, 611, 611, 333, 333, 333, 333,
    722, 722, 722, 722, 722, 722, 722, 564, 722, 722, 722, 722, 722, 722, 556, 500,
    444, 444, 444, 444, 444, 444, 667, 444, 444, 444, 444, 444, 278, 278, 278, 278,
    500, 500, 500, 500, 500, 500, 500, 564, 500, 500, 500, 500, 500, 500, 500, 500
  ],
  F4: [ // Times-Bold, character codes 32..255 (1000 units per em)
    250, 333, 555, 500, 500, 1000, 833, 278, 333, 333, 500, 570, 250, 333, 250, 278,
    500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 333, 333, 570, 570, 570, 500,
    930, 722, 667, 722, 722, 667, 611, 778, 778, 389, 500, 778, 667, 944, 722, 778,
    611, 778, 722, 556, 667, 722, 722, 1000, 722, 722, 667, 333, 278, 333, 581, 500,
    333, 500, 556, 444, 556, 444, 333, 500, 556, 278, 333, 556, 278, 833, 556, 500,
    556, 556, 444, 389, 333, 556, 500, 722, 500, 500, 444, 394, 220, 394, 520, 761,
    500, 500, 333, 500, 500, 1000, 500, 500, 333, 1000, 556, 333, 1000, 500, 667, 500,
    500, 333, 333, 500, 500, 350, 500, 1000, 333, 1000, 389, 333, 722, 500, 444, 722,
    250, 333, 500, 500, 500, 500, 220, 500, 333, 747, 300, 500, 570, 333, 747, 333,
    400, 570, 300, 300, 333, 556, 540, 250, 333, 300, 330, 500, 750, 750, 750, 500,
    722, 722, 722, 722, 722, 722, 1000, 722, 667, 667, 667, 667, 389, 389, 389, 389,
    722, 722, 778, 778, 778, 778, 778, 570, 778, 722, 722, 722, 722, 722, 611, 556,
    500, 500, 500, 500, 500, 500, 722, 444, 444, 444, 444, 444, 278, 278, 278, 278,
    500, 556, 500, 500, 500, 500, 500, 570, 500, 556, 556, 556, 556, 500, 556, 500
  ],
};

type RGB = [number, number, number];
const GREEN: RGB = [10, 42, 33], GOLD: RGB = [219, 176, 119], GOLD_DARK: RGB = [122, 90, 42], CREAM: RGB = [233, 223, 203], INK: RGB = [28, 40, 34], MUTED: RGB = [100, 108, 103], HAIR: RGB = [214, 203, 180];

const W = 595, H = 842, M = 48; // A4 in points, page margin
const CP1252: Record<number, number> = { 0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e,
  0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f };

/** Text to WinAnsi bytes. Anything the standard fonts can't show (for example Gujarati or Hindi letters) becomes "?". */
function encode(s: string): number[] {
  const out: number[] = [];
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    out.push(cp < 0x20 ? 0x20 : cp <= 0x7e || (cp >= 0xa0 && cp <= 0xff) ? cp : CP1252[cp] ?? 0x3f);
  }
  return out;
}
const pdfString = (bytes: number[]) => "(" + bytes.map((b) => (b === 0x28 || b === 0x29 || b === 0x5c ? "\\" + String.fromCharCode(b) : b < 33 || b > 126 ? "\\" + b.toString(8).padStart(3, "0") : String.fromCharCode(b))).join("") + ")";
const num = (n: number) => (Math.round(n * 100) / 100).toString();
const rgb = (c: RGB) => c.map((v) => num(v / 255)).join(" ");

function textWidth(s: string, font: FontKey, size: number, charSpace = 0) {
  const bytes = encode(s);
  return bytes.reduce((w, b) => w + ((WIDTHS[font][b - 32] ?? 500) / 1000) * size, 0) + charSpace * bytes.length;
}
function wrap(s: string, font: FontKey, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of s.split(/\s+/).filter(Boolean)) {
    let w = word;
    while (textWidth(w, font, size) > maxWidth) { // a single very long word: split it
      let cut = w.length - 1;
      while (cut > 1 && textWidth(w.slice(0, cut), font, size) > maxWidth) cut--;
      if (line) { lines.push(line); line = ""; }
      lines.push(w.slice(0, cut)); w = w.slice(cut);
    }
    const next = line ? line + " " + w : w;
    if (line && textWidth(next, font, size) > maxWidth) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/** Amounts as "Rs. 87,930" (Indian digit grouping). */
export const inr = (paise: number) => "Rs. " + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 });

class Page {
  ops: string[] = [];
  rect(x: number, y: number, w: number, h: number, fill: RGB) { this.ops.push(`${rgb(fill)} rg ${num(x)} ${num(H - y - h)} ${num(w)} ${num(h)} re f`); }
  line(x1: number, y1: number, x2: number, y2: number, color: RGB, width = 0.6) { this.ops.push(`${rgb(color)} RG ${num(width)} w ${num(x1)} ${num(H - y1)} m ${num(x2)} ${num(H - y2)} l S`); }
  /** y is the text baseline, measured from the top of the page. */
  text(s: string, x: number, y: number, o: { font?: FontKey; size?: number; color?: RGB; align?: "left" | "right" | "center"; charSpace?: number } = {}) {
    const { font = "F1", size = 10, color = INK, align = "left", charSpace = 0 } = o;
    const w = textWidth(s, font, size, charSpace);
    const px = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
    this.ops.push(`BT /${font} ${num(size)} Tf ${rgb(color)} rg ${num(charSpace)} Tc ${num(px)} ${num(H - y)} Td ${pdfString(encode(s))} Tj ET`);
  }
}

export function buildReceiptPdf(d: ReceiptData): Buffer {
  const pages: Page[] = [];
  const newPage = () => { const p = new Page(); pages.push(p); return p; };
  let p = newPage();

  // ---- header band
  p.rect(0, 0, W, 108, GREEN);
  p.text(d.store.name, M, 54, { font: "F4", size: 24, color: GOLD });
  let hy = 71;
  for (const l of wrap(d.store.address ?? "", "F1", 8.5, 290).slice(0, 3)) { if (l) { p.text(l, M, hy, { size: 8.5, color: CREAM }); hy += 11; } }
  if (d.store.gstin) p.text("GSTIN: " + d.store.gstin, M, hy, { size: 8.5, color: CREAM });
  p.text("RECEIPT", W - M, 50, { font: "F3", size: 24, color: GOLD, align: "right", charSpace: 3 });
  p.text("Order " + d.orderNumber, W - M, 70, { font: "F2", size: 10.5, color: CREAM, align: "right" });
  p.text(d.date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }), W - M, 85, { size: 9, color: CREAM, align: "right" });
  p.rect(0, 108, W, 2.5, GOLD);

  // ---- billed to / deliver to
  const label = (s: string, x: number, y: number) => p.text(s.toUpperCase(), x, y, { font: "F2", size: 7.5, color: GOLD_DARK, charSpace: 1.6 });
  let y = 146;
  label("Billed to", M, y); label("Deliver to", 320, y);
  let ly = y + 17, ry = y + 17;
  p.text(d.customer.name, M, ly, { font: "F2", size: 11 }); ly += 14;
  if (d.customer.phone) { p.text(d.customer.phone, M, ly, { size: 9.5 }); ly += 12.5; }
  for (const l of wrap(d.customer.email, "F1", 9.5, 240)) { p.text(l, M, ly, { size: 9.5 }); ly += 12.5; }
  const a = d.address;
  p.text(a.fullName || d.customer.name, 320, ry, { font: "F2", size: 11 }); ry += 14;
  for (const l of [a.line1, a.line2 ?? "", `${a.city}, ${a.state} ${a.pincode}`, a.phone ? "Phone: " + a.phone : ""].filter(Boolean).flatMap((t) => wrap(t, "F1", 9.5, 227))) { p.text(l, 320, ry, { size: 9.5 }); ry += 12.5; }
  y = Math.max(ly, ry) + 20;

  // ---- items table
  const COL = { qty: 372, rate: 460, amount: W - M };
  const tableHeader = (pg: Page, yy: number) => {
    pg.line(M, yy - 12, W - M, yy - 12, GOLD_DARK, 0.8);
    pg.text("ITEM", M, yy, { font: "F2", size: 7.5, color: GOLD_DARK, charSpace: 1.6 });
    pg.text("QTY", COL.qty, yy, { font: "F2", size: 7.5, color: GOLD_DARK, charSpace: 1.6, align: "right" });
    pg.text("RATE", COL.rate, yy, { font: "F2", size: 7.5, color: GOLD_DARK, charSpace: 1.6, align: "right" });
    pg.text("AMOUNT", COL.amount, yy, { font: "F2", size: 7.5, color: GOLD_DARK, charSpace: 1.6, align: "right" });
    pg.line(M, yy + 8, W - M, yy + 8, GOLD_DARK, 0.8);
    return yy + 26;
  };
  y = tableHeader(p, y + 12);
  for (const it of d.items) {
    const lines = wrap(it.name, "F1", 10, 270);
    const rowH = lines.length * 13 + 10;
    if (y + rowH > H - 190) { p = newPage(); y = tableHeader(p, 70); }
    lines.forEach((l, i) => p.text(l, M, y + i * 13, { size: 10 }));
    p.text(String(it.quantity), COL.qty, y, { size: 10, align: "right" });
    p.text(inr(it.unitPaise), COL.rate, y, { size: 10, align: "right" });
    p.text(inr(it.unitPaise * it.quantity), COL.amount, y, { font: "F2", size: 10, align: "right" });
    y += rowH;
    p.line(M, y - 13, W - M, y - 13, HAIR, 0.5); // midway between this row and the next
  }

  // ---- totals
  if (y > H - 190) { p = newPage(); y = 80; }
  y += 8;
  const row = (l: string, v: string, yy: number) => { p.text(l, 372, yy, { size: 10, color: MUTED }); p.text(v, W - M, yy, { size: 10, align: "right" }); };
  row("Subtotal", inr(d.subtotalPaise), y); y += 16;
  if (d.discountPaise > 0) { row("Coupon discount", "- " + inr(d.discountPaise), y); y += 16; }
  row("Delivery", d.deliveryPaise ? inr(d.deliveryPaise) : "Free", y); y += 12;
  p.rect(350, y, W - M - 350, 30, CREAM);
  p.text("TOTAL", 362, y + 19.5, { font: "F2", size: 8.5, color: GOLD_DARK, charSpace: 1.8 });
  p.text(inr(d.totalPaise), W - M - 10, y + 20, { font: "F4", size: 15, color: GREEN, align: "right" });
  y += 30;

  // ---- payment
  const cod = (d.payment.method ?? "").toUpperCase() === "COD";
  const paid = d.payment.status === "PAID";
  const payText = cod ? (paid ? "Cash on delivery. Received in full, thank you." : `Cash on delivery. Please pay ${inr(d.totalPaise)} when your order arrives.`)
    : paid ? "Paid in full." : "Payment " + d.payment.status.toLowerCase().replace(/_/g, " ") + ".";
  const py = y - 16;
  label("Payment", M, py + 4);
  wrap(payText, "F1", 9.5, 280).forEach((l, i) => p.text(l, M, py + 20 + i * 12.5, { size: 9.5 }));

  // ---- footer on every page
  pages.forEach((pg, i) => {
    pg.line(M, H - 66, W - M, H - 66, GOLD, 0.8);
    pg.text(`Thank you for shopping with ${d.store.name}.`, W / 2, H - 46, { font: "F3", size: 12, color: GREEN, align: "center" });
    pg.text("This is a computer-generated receipt and does not need a signature." + (pages.length > 1 ? `   Page ${i + 1} of ${pages.length}` : ""), W / 2, H - 30, { size: 8, color: MUTED, align: "center" });
  });

  // ---- assemble the file: 1 catalog, 2 page tree, 3-6 fonts, then (page, content) pairs
  const objs: string[] = [];
  const kids = pages.map((_, i) => `${7 + i * 2} 0 R`).join(" ");
  objs.push("<< /Type /Catalog /Pages 2 0 R >>", `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  (["F1", "F2", "F3", "F4"] as FontKey[]).forEach((k) => objs.push(`<< /Type /Font /Subtype /Type1 /BaseFont /${BASE_FONT[k]} /Encoding /WinAnsiEncoding >>`));
  pages.forEach((pg, i) => {
    const content = pg.ops.join("\n");
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >> >> /Contents ${8 + i * 2} 0 R >>`,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  const infoNo = objs.length + 1;
  objs.push(`<< /Title ${pdfString(encode("Receipt " + d.orderNumber))} /Producer ${pdfString(encode(d.store.name))} >>`);
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info ${infoNo} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1"); // everything above is plain ASCII, so character count equals byte count
}
