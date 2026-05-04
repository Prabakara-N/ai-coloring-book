/**
 * Story-book PDF assembler — Phase 1 (toddler band, 6x9 portrait).
 *
 * Different from `lib/pdf.ts` (coloring books):
 *   - Full-bleed: every image fills the entire trim area, no margins.
 *   - No blank facing pages: color print uses both sides of the sheet.
 *   - No CSS-style border overlay: story books are full-bleed art.
 *   - Default trim 6x9" portrait (KDP color paperback standard).
 *
 * Bleed math: KDP wants 0.125" extra on each outer edge. The image is
 * generated AT TRIM size (6x9). The PDF places each image at trim size
 * — KDP's previewer treats 0 outside the trim as "no bleed needed" since
 * the art is full-bleed at the trim boundary. If we want strict 0.125"
 * bleed, the generator must be asked for 6.25x9.25" and we need a trim
 * mask layer; that's a follow-up after the visual pipeline is proven.
 */

import { PDFDocument, type PDFImage } from "pdf-lib";

const INCH_TO_PT = 72;

export interface StoryPageInput {
  /** Stable id for the page (unused in the rendered PDF, kept for caller bookkeeping). */
  id: string;
  /** Friendly label for the page (unused in the rendered PDF). */
  name: string;
  /** Generated image as a data URL. */
  dataUrl: string;
}

export interface AssembleStoryBookOptions {
  /** Document title written into PDF metadata. */
  title?: string;
  /** Author / brand line written into PDF metadata. */
  author?: string;
  /** Optional front cover — placed as the first page. */
  cover?: { dataUrl: string };
  /** Optional back cover — placed as the last page. */
  backCover?: { dataUrl: string };
  /** Story scenes in narrative order. */
  pages: StoryPageInput[];
  /** Trim width in inches. Defaults to 6.0 (KDP color paperback default). */
  trimWidthInches?: number;
  /** Trim height in inches. Defaults to 9.0 (KDP color paperback default). */
  trimHeightInches?: number;
}

function decodeDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } {
  if (!dataUrl.startsWith("data:")) throw new Error("Invalid data URL");
  const sep = dataUrl.indexOf(";base64,");
  if (sep < 0) throw new Error("Invalid data URL");
  const mime = dataUrl.slice(5, sep);
  const b64 = dataUrl.slice(sep + 8);
  if (!mime || !b64) throw new Error("Invalid data URL");
  const binary = Buffer.from(b64, "base64");
  return { mime, bytes: new Uint8Array(binary) };
}

async function embedImage(
  doc: PDFDocument,
  dataUrl: string,
): Promise<PDFImage> {
  const { mime, bytes } = decodeDataUrl(dataUrl);
  if (mime === "image/png") return doc.embedPng(bytes);
  if (mime === "image/jpeg" || mime === "image/jpg") return doc.embedJpg(bytes);
  throw new Error(`Unsupported image type: ${mime}`);
}

function drawFullBleed(
  page: ReturnType<PDFDocument["addPage"]>,
  image: PDFImage,
  pageWidthPt: number,
  pageHeightPt: number,
): void {
  const imgRatio = image.width / image.height;
  const pageRatio = pageWidthPt / pageHeightPt;

  let drawWidth: number;
  let drawHeight: number;
  if (imgRatio > pageRatio) {
    drawHeight = pageHeightPt;
    drawWidth = pageHeightPt * imgRatio;
  } else {
    drawWidth = pageWidthPt;
    drawHeight = pageWidthPt / imgRatio;
  }
  const x = (pageWidthPt - drawWidth) / 2;
  const y = (pageHeightPt - drawHeight) / 2;
  page.drawImage(image, { x, y, width: drawWidth, height: drawHeight });
}

export async function assembleStoryBookPdf(
  opts: AssembleStoryBookOptions,
): Promise<Uint8Array> {
  if (opts.pages.length === 0) {
    throw new Error("Story book PDF requires at least one page.");
  }

  const trimWidth = opts.trimWidthInches ?? 6.0;
  const trimHeight = opts.trimHeightInches ?? 9.0;
  const pageWidthPt = trimWidth * INCH_TO_PT;
  const pageHeightPt = trimHeight * INCH_TO_PT;

  const doc = await PDFDocument.create();
  doc.setTitle(opts.title ?? "CrayonSparks story book");
  doc.setAuthor(opts.author ?? "CrayonSparks");
  doc.setCreator("CrayonSparks");
  doc.setProducer("CrayonSparks");

  if (opts.cover) {
    const coverImage = await embedImage(doc, opts.cover.dataUrl);
    const page = doc.addPage([pageWidthPt, pageHeightPt]);
    drawFullBleed(page, coverImage, pageWidthPt, pageHeightPt);
  }

  for (const pageInput of opts.pages) {
    const image = await embedImage(doc, pageInput.dataUrl);
    const page = doc.addPage([pageWidthPt, pageHeightPt]);
    drawFullBleed(page, image, pageWidthPt, pageHeightPt);
  }

  if (opts.backCover) {
    const backImage = await embedImage(doc, opts.backCover.dataUrl);
    const page = doc.addPage([pageWidthPt, pageHeightPt]);
    drawFullBleed(page, backImage, pageWidthPt, pageHeightPt);
  }

  return doc.save();
}
