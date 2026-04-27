import { PDFDocument, StandardFonts, rgb, PDFImage } from "pdf-lib";

const INCH_TO_PT = 72;
const PAGE_WIDTH = 8.5 * INCH_TO_PT;
const PAGE_HEIGHT = 11 * INCH_TO_PT;
const MARGIN_OUTER = 0.25 * INCH_TO_PT;
const MARGIN_GUTTER = 0.375 * INCH_TO_PT;

export interface PdfPageInput {
  id: string;
  name: string;
  dataUrl: string;
}

export interface AssembleOptions {
  title?: string;
  category: string;
  pages: PdfPageInput[];
  cover?: { dataUrl: string };
  /**
   * Optional back cover image. When provided, it's added as the FINAL page
   * of the PDF (industry-standard position for KDP paperback test prints).
   * Renders full-bleed like the front cover.
   */
  backCover?: { dataUrl: string };
  includeTitlePage?: boolean;
  includeBlankPages?: boolean;
}

function decodeDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } {
  // String-based parsing — regex backtracking on multi-MB base64 caused V8
  // stack overflow ("RangeError: Maximum call stack size exceeded").
  if (!dataUrl.startsWith("data:")) throw new Error("Invalid data URL");
  const sep = dataUrl.indexOf(";base64,");
  if (sep < 0) throw new Error("Invalid data URL");
  const mime = dataUrl.slice(5, sep);
  const b64 = dataUrl.slice(sep + 8);
  if (!mime || !b64) throw new Error("Invalid data URL");
  const binary = Buffer.from(b64, "base64");
  return { mime, bytes: new Uint8Array(binary) };
}

async function embedImage(doc: PDFDocument, dataUrl: string): Promise<PDFImage> {
  const { mime, bytes } = decodeDataUrl(dataUrl);
  if (mime === "image/png") return doc.embedPng(bytes);
  if (mime === "image/jpeg" || mime === "image/jpg") return doc.embedJpg(bytes);
  throw new Error(`Unsupported image type: ${mime}`);
}

export async function assembleColoringBookPdf(opts: AssembleOptions): Promise<Uint8Array> {
  const hasCover = !!opts.cover;
  const includeTitle = opts.includeTitlePage ?? !hasCover;
  const includeBlanks = opts.includeBlankPages ?? true;

  const doc = await PDFDocument.create();
  doc.setTitle(opts.title ?? `CrayonSparks · ${opts.category}`);
  doc.setAuthor("CrayonSparks");
  doc.setCreator("CrayonSparks");
  doc.setProducer("CrayonSparks");
  const now = new Date();
  doc.setCreationDate(now);
  doc.setModificationDate(now);

  const helv = await doc.embedFont(StandardFonts.HelveticaBold);
  const helvNormal = await doc.embedFont(StandardFonts.Helvetica);

  if (hasCover && opts.cover) {
    const cover = await embedImage(doc, opts.cover.dataUrl);
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    // KDP covers must be FULL BLEED — no white margins at any edge.
    // Use object-cover semantics: scale up so the image FILLS the page,
    // cropping the longer dimension slightly if aspect ratios don't match
    // exactly (Gemini's 3:4 output may not perfectly match 8.5:11).
    const imgRatio = cover.width / cover.height;
    const pageRatio = PAGE_WIDTH / PAGE_HEIGHT;
    let drawW: number;
    let drawH: number;
    if (imgRatio > pageRatio) {
      // Image wider than page → match height, overflow horizontally
      drawH = PAGE_HEIGHT;
      drawW = PAGE_HEIGHT * imgRatio;
    } else {
      // Image narrower than page → match width, overflow vertically
      drawW = PAGE_WIDTH;
      drawH = PAGE_WIDTH / imgRatio;
    }
    const drawX = (PAGE_WIDTH - drawW) / 2;
    const drawY = (PAGE_HEIGHT - drawH) / 2;
    page.drawImage(cover, { x: drawX, y: drawY, width: drawW, height: drawH });
  } else if (includeTitle) {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const titleSize = 40;
    const title = opts.title ?? "Coloring Book";
    const titleLines = wrapText(title, helv, titleSize, PAGE_WIDTH - MARGIN_OUTER * 4);
    let y = PAGE_HEIGHT - 3 * INCH_TO_PT;
    for (const line of titleLines) {
      const w = helv.widthOfTextAtSize(line, titleSize);
      page.drawText(line, {
        x: (PAGE_WIDTH - w) / 2,
        y,
        size: titleSize,
        font: helv,
        color: rgb(0.05, 0.05, 0.1),
      });
      y -= titleSize * 1.15;
    }
    const sub = "Made with CrayonSparks";
    const subW = helvNormal.widthOfTextAtSize(sub, 12);
    page.drawText(sub, {
      x: (PAGE_WIDTH - subW) / 2,
      y: 1.5 * INCH_TO_PT,
      size: 12,
      font: helvNormal,
      color: rgb(0.5, 0.5, 0.55),
    });
  }

  for (const input of opts.pages) {
    const embedded = await embedImage(doc, input.dataUrl);
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const leftIsGutter = doc.getPageCount() % 2 === 0;
    const leftMargin = leftIsGutter ? MARGIN_GUTTER : MARGIN_OUTER;
    const rightMargin = leftIsGutter ? MARGIN_OUTER : MARGIN_GUTTER;
    const drawable = {
      x: leftMargin,
      y: MARGIN_OUTER,
      w: PAGE_WIDTH - leftMargin - rightMargin,
      h: PAGE_HEIGHT - 2 * MARGIN_OUTER,
    };
    const imgRatio = embedded.width / embedded.height;
    const boxRatio = drawable.w / drawable.h;
    let drawW = drawable.w;
    let drawH = drawable.h;
    if (imgRatio > boxRatio) {
      drawH = drawable.w / imgRatio;
    } else {
      drawW = drawable.h * imgRatio;
    }
    const drawX = drawable.x + (drawable.w - drawW) / 2;
    const drawY = drawable.y + (drawable.h - drawH) / 2;
    page.drawImage(embedded, { x: drawX, y: drawY, width: drawW, height: drawH });

    // Consistent uniform border frame (drawn on every page image at 5% inset,
    // matching the 12% safe margin Gemini is instructed to leave inside the image).
    const borderInset = Math.min(drawW, drawH) * 0.06;
    page.drawRectangle({
      x: drawX + borderInset,
      y: drawY + borderInset,
      width: drawW - 2 * borderInset,
      height: drawH - 2 * borderInset,
      borderColor: rgb(0.15, 0.15, 0.15),
      borderWidth: 1.0,
    });

    const footer = `${input.name}`;
    const fW = helvNormal.widthOfTextAtSize(footer, 9);
    page.drawText(footer, {
      x: (PAGE_WIDTH - fW) / 2,
      y: MARGIN_OUTER - 14,
      size: 9,
      font: helvNormal,
      color: rgb(0.7, 0.7, 0.75),
    });

    if (includeBlanks) doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  }

  // Back cover — final page, FULL BLEED (matches front cover treatment).
  // Same object-cover semantics — scale to fill, crop excess if needed.
  if (opts.backCover) {
    const back = await embedImage(doc, opts.backCover.dataUrl);
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const imgRatio = back.width / back.height;
    const pageRatio = PAGE_WIDTH / PAGE_HEIGHT;
    let drawW: number;
    let drawH: number;
    if (imgRatio > pageRatio) {
      drawH = PAGE_HEIGHT;
      drawW = PAGE_HEIGHT * imgRatio;
    } else {
      drawW = PAGE_WIDTH;
      drawH = PAGE_WIDTH / imgRatio;
    }
    const drawX = (PAGE_WIDTH - drawW) / 2;
    const drawY = (PAGE_HEIGHT - drawH) / 2;
    page.drawImage(back, { x: drawX, y: drawY, width: drawW, height: drawH });
  }

  return doc.save();
}

function wrapText(text: string, font: ReturnType<PDFDocument["embedFont"]> extends Promise<infer T> ? T : never, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const w = font.widthOfTextAtSize(candidate, size);
    if (w > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}
