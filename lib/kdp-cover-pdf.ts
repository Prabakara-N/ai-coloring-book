/**
 * KDP cover-wrap PDF builder.
 *
 * Amazon KDP requires the book cover as a SINGLE wide PDF page that
 * combines back cover + spine + front cover with proper bleed:
 *
 *   ┌──────────────────────────────────────────────────┐  ← page edge (with bleed)
 *   │  ┌──────────────┐ │ S │ ┌──────────────┐   │  │
 *   │  │              │ │ p │ │              │   │  │
 *   │  │  BACK COVER  │ │ i │ │  FRONT COVER │   │  │
 *   │  │              │ │ n │ │              │   │  │
 *   │  └──────────────┘ │ e │ └──────────────┘   │  │
 *   └──────────────────────────────────────────────────┘
 *      ←──── trim ────→  ↑    ←──── trim ────→  ↑    ↑
 *                        spine                  bleed (0.125")
 *                        width
 *
 * Total dimensions:
 *   width  = 2 × trim_width + spine_width + 2 × 0.125"
 *   height = trim_height + 2 × 0.125"
 *
 * Spine width = page_count × paper_thickness:
 *   - black ink on white paper:  0.002252" per page
 *   - standard color paper:      0.002347" per page
 *   - premium color paper:       0.0024" per page
 *
 * Example: 22-page coloring book at 8.5×11 trim, standard paper:
 *   spine = 22 × 0.002347 = 0.052"
 *   width = 17 + 0.052 + 0.25 = 17.302"
 *   height = 11 + 0.25 = 11.25"
 *
 * The KDP error "expected cover size 17.342×11.250 but submitted
 * 17.000×11.000" means the user uploaded a cover that lacked bleed
 * (and probably the spine width too). This builder fixes that.
 *
 * Source: https://kdp.amazon.com/en_US/help/topic/G201834260 (cover specs)
 *         https://kdp.amazon.com/en_US/help/topic/G201857950 (cover calculator)
 */

import { PDFDocument, PDFImage, rgb } from "pdf-lib";

const INCH_TO_PT = 72;

/** Bleed required by KDP on every outer edge. */
export const KDP_BLEED_INCHES = 0.125;

/** Per-page paper thickness used to calculate spine width (inches/page). */
export const KDP_PAPER_THICKNESS = {
  bw: 0.002252,
  standardColor: 0.002347,
  premiumColor: 0.0024,
} as const;

export type KdpPaperType = keyof typeof KDP_PAPER_THICKNESS;

export interface KdpCoverInput {
  /** Front cover image as data URL. Will be drawn on the right half. */
  frontCover: { dataUrl: string };
  /** Back cover image as data URL. Will be drawn on the left half. */
  backCover: { dataUrl: string };
  /** Trim width in inches (e.g. 8.5 for 8.5×11). */
  trimWidthInches: number;
  /** Trim height in inches (e.g. 11 for 8.5×11). */
  trimHeightInches: number;
  /** Total interior page count INCLUDING blanks (drives spine width). */
  interiorPageCount: number;
  /** Paper type — drives the per-page thickness multiplier. */
  paper: KdpPaperType;
}

export interface KdpCoverDimensions {
  totalWidthInches: number;
  totalHeightInches: number;
  spineWidthInches: number;
  bleedInches: number;
  trimWidthInches: number;
  trimHeightInches: number;
}

/**
 * Compute the full KDP cover-wrap dimensions for the given trim, page
 * count, and paper. Useful for showing the user the expected upload
 * size BEFORE generating the PDF, and for the PDF builder itself.
 */
export function computeCoverDimensions(input: {
  trimWidthInches: number;
  trimHeightInches: number;
  interiorPageCount: number;
  paper: KdpPaperType;
}): KdpCoverDimensions {
  const spine =
    input.interiorPageCount * KDP_PAPER_THICKNESS[input.paper];
  return {
    totalWidthInches:
      2 * input.trimWidthInches + spine + 2 * KDP_BLEED_INCHES,
    totalHeightInches: input.trimHeightInches + 2 * KDP_BLEED_INCHES,
    spineWidthInches: spine,
    bleedInches: KDP_BLEED_INCHES,
    trimWidthInches: input.trimWidthInches,
    trimHeightInches: input.trimHeightInches,
  };
}

function decodeDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } {
  if (!dataUrl.startsWith("data:")) throw new Error("Invalid data URL");
  const sep = dataUrl.indexOf(";base64,");
  if (sep < 0) throw new Error("Invalid data URL");
  const mime = dataUrl.slice(5, sep);
  const b64 = dataUrl.slice(sep + 8);
  if (!mime || !b64) throw new Error("Invalid data URL");
  return { mime, bytes: new Uint8Array(Buffer.from(b64, "base64")) };
}

async function embedImage(doc: PDFDocument, dataUrl: string): Promise<PDFImage> {
  const { mime, bytes } = decodeDataUrl(dataUrl);
  if (mime === "image/png") return doc.embedPng(bytes);
  if (mime === "image/jpeg" || mime === "image/jpg") return doc.embedJpg(bytes);
  throw new Error(`Unsupported image type: ${mime}`);
}

/**
 * Builds the KDP cover-wrap PDF — single wide landscape page with back
 * cover (left), spine (center), front cover (right), proper bleed on
 * all four outer edges.
 *
 * Returns the PDF as Uint8Array ready to download.
 */
export async function buildKdpCoverPdf(
  input: KdpCoverInput,
): Promise<Uint8Array> {
  const dims = computeCoverDimensions(input);

  const totalW = dims.totalWidthInches * INCH_TO_PT;
  const totalH = dims.totalHeightInches * INCH_TO_PT;
  const trimW = input.trimWidthInches * INCH_TO_PT;
  const trimH = input.trimHeightInches * INCH_TO_PT;
  const bleed = KDP_BLEED_INCHES * INCH_TO_PT;
  const spine = dims.spineWidthInches * INCH_TO_PT;

  const doc = await PDFDocument.create();
  doc.setTitle("KDP Cover Wrap");
  doc.setAuthor("CrayonSparks");
  doc.setProducer("CrayonSparks");
  doc.setCreator("CrayonSparks");

  const page = doc.addPage([totalW, totalH]);

  // Background fill — pure white. Both covers are full-bleed, so any pixel
  // not covered by the embedded images stays white. Most of the time the
  // covers fill their slots completely so this is just defensive.
  page.drawRectangle({
    x: 0,
    y: 0,
    width: totalW,
    height: totalH,
    color: rgb(1, 1, 1),
  });

  // BACK COVER — left side, occupies (bleed + trim) wide × full height.
  // Draws from x=0 (page left edge, behind the bleed) to
  // x = bleed + trim_width. This puts back-cover artwork all the way
  // to the page's left bleed edge.
  const back = await embedImage(doc, input.backCover.dataUrl);
  const backSlotW = bleed + trimW;
  const backSlotX = 0;
  drawImageObjectCover(page, back, backSlotX, 0, backSlotW, totalH);

  // FRONT COVER — right side, mirror of back. Occupies (trim + bleed) wide.
  // Draws from x = bleed + trim_width + spine to x = totalW.
  const front = await embedImage(doc, input.frontCover.dataUrl);
  const frontSlotX = bleed + trimW + spine;
  const frontSlotW = trimW + bleed;
  drawImageObjectCover(page, front, frontSlotX, 0, frontSlotW, totalH);

  // SPINE — solid color band between back and front. Pulls the dominant
  // color from the front cover (eyeball average — drawn as mid-grey
  // placeholder for now; can be enhanced to detect color later).
  // For interior page counts < 80 the spine is too thin for text; we
  // leave it as a clean solid band.
  const spineX = bleed + trimW;
  page.drawRectangle({
    x: spineX,
    y: 0,
    width: spine,
    height: totalH,
    color: rgb(0.92, 0.88, 0.82), // soft cream — neutral, prints fine
  });

  return doc.save();
}

/**
 * Draws an image into a slot using object-cover semantics — scales the
 * image to fill the slot with no white space, cropping the longer
 * dimension if aspect ratios don't match. Same approach used for the
 * existing single-page cover render.
 */
function drawImageObjectCover(
  page: ReturnType<PDFDocument["addPage"]>,
  image: PDFImage,
  slotX: number,
  slotY: number,
  slotW: number,
  slotH: number,
): void {
  const imgRatio = image.width / image.height;
  const slotRatio = slotW / slotH;
  let drawW: number;
  let drawH: number;
  if (imgRatio > slotRatio) {
    drawH = slotH;
    drawW = slotH * imgRatio;
  } else {
    drawW = slotW;
    drawH = slotW / imgRatio;
  }
  const drawX = slotX + (slotW - drawW) / 2;
  const drawY = slotY + (slotH - drawH) / 2;
  page.drawImage(image, { x: drawX, y: drawY, width: drawW, height: drawH });
}
