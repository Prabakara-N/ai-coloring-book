"use client";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { KdpMetadata } from "./kdp-metadata";
import { buildKdpHtmlDocument } from "./kdp-html-export";

/**
 * Builds a one-or-two page PDF summarizing every KDP metadata field so the
 * user can paste each field into the Amazon KDP submission form quickly.
 *
 * Format: clean text-only PDF, 8.5x11 portrait, dark text on white.
 */
export interface KdpPackagePdfInput {
  bookName: string;
  pageCount: number;
  metadata: KdpMetadata;
}

const PAGE_W = 612; // 8.5"
const PAGE_H = 792; // 11"
const MARGIN = 54; // 0.75"
const LINE = 14; // line height

/**
 * pdf-lib's StandardFonts.Helvetica only supports WinAnsi encoding (a
 * subset of Latin-1). Any character above 0xFF (smart quotes, em-dashes,
 * the ≤ symbol used in our labels, AI-generated copy with stylized
 * punctuation, etc.) crashes the PDF build with "WinAnsi cannot encode".
 *
 * Rather than embed a TTF font (extra dep + ~150KB bundle hit), we
 * normalize common Unicode punctuation to ASCII equivalents before
 * drawing. Anything still > 0xFF after normalization is replaced with
 * "?" as a final safety net.
 */
function sanitizeForWinAnsi(text: string): string {
  return text
    .replace(/≤/g, "<=") // ≤
    .replace(/≥/g, ">=") // ≥
    .replace(/[—–]/g, "-") // — em-dash, – en-dash
    .replace(/[‘’]/g, "'") // ' ' smart single quotes
    .replace(/[“”]/g, '"') // " " smart double quotes
    .replace(/…/g, "...") // … ellipsis
    .replace(/ /g, " ") // non-breaking space → space
    .replace(/[•●]/g, "*") // • bullet, ● black circle
    .replace(/→/g, "->") // → arrow
    .replace(/[^\x00-\xFF]/g, "?"); // anything else outside Latin-1 → ?
}

export async function buildKdpPackagePdf(
  input: KdpPackagePdfInput,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${input.bookName} — KDP submission package`);
  doc.setAuthor("CrayonSparks");
  doc.setCreator("CrayonSparks");

  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;
  const black = rgb(0.07, 0.07, 0.07);
  const grey = rgb(0.4, 0.4, 0.42);
  const violet = rgb(0.55, 0.36, 0.96);

  function ensureSpace(needed: number) {
    if (y - needed < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  }

  function drawLabel(text: string) {
    ensureSpace(LINE * 2);
    page.drawText(sanitizeForWinAnsi(text).toUpperCase(), {
      x: MARGIN,
      y,
      size: 9,
      font: helvBold,
      color: violet,
    });
    y -= LINE;
  }

  function drawValue(text: string, opts: { mono?: boolean } = {}) {
    if (!text) {
      page.drawText("(empty)", {
        x: MARGIN,
        y,
        size: 10,
        font: helv,
        color: grey,
      });
      y -= LINE * 1.4;
      return;
    }
    const safe = sanitizeForWinAnsi(text);
    const font = opts.mono ? helv : helv;
    const maxWidth = PAGE_W - MARGIN * 2;
    const words = safe.split(/\s+/);
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, 10) > maxWidth) {
        ensureSpace(LINE);
        page.drawText(line, { x: MARGIN, y, size: 10, font, color: black });
        y -= LINE;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      ensureSpace(LINE);
      page.drawText(line, { x: MARGIN, y, size: 10, font, color: black });
      y -= LINE;
    }
    y -= LINE * 0.5;
  }

  // Header
  page.drawText("KDP SUBMISSION PACKAGE", {
    x: MARGIN,
    y,
    size: 18,
    font: helvBold,
    color: black,
  });
  y -= 22;
  page.drawText(sanitizeForWinAnsi(input.bookName), {
    x: MARGIN,
    y,
    size: 12,
    font: helv,
    color: grey,
  });
  y -= 28;

  // Title
  drawLabel("Book title (≤200 chars)");
  drawValue(input.metadata.title);

  // Subtitle
  if (input.metadata.subtitle) {
    drawLabel("Subtitle");
    drawValue(input.metadata.subtitle);
  }

  // Description (plain text version — easiest to paste)
  drawLabel("Description (plain text — paste into KDP description field)");
  drawValue(input.metadata.descriptionText);

  // HTML description — wrap in the SAME full standalone HTML document the
  // UI shows (DOCTYPE-ish skeleton with <html><head><title></title></head>
  // <body>…</body></html>) so the user can paste the entire block straight
  // into a .html file and preview it. Matches the on-screen Plain/HTML
  // toggle exactly.
  if (input.metadata.descriptionHtml) {
    drawLabel("Description (HTML — paste into a .html file to preview)");
    drawValue(
      buildKdpHtmlDocument({
        title: input.metadata.title || input.bookName,
        descriptionHtml: input.metadata.descriptionHtml,
      }),
      { mono: true },
    );
  }

  // Keywords
  drawLabel("7 backend keywords (paste one per field)");
  input.metadata.keywords.forEach((kw, i) => {
    drawValue(`${i + 1}. ${kw}`);
  });

  // Categories
  drawLabel("Suggested KDP browse categories (pick 2)");
  input.metadata.categories.forEach((cat, i) => {
    drawValue(`${i + 1}. ${cat}`);
  });

  // Pricing + page count
  drawLabel("Suggested retail price");
  drawValue(`$${input.metadata.suggestedPriceUsd} USD (${input.pageCount} pages)`);

  // Notes
  if (input.metadata.notes) {
    drawLabel("Notes");
    drawValue(input.metadata.notes);
  }

  // Footer
  ensureSpace(40);
  y = MARGIN - 6;
  page.drawText(
    sanitizeForWinAnsi(
      `Generated by CrayonSparks · ${new Date().toLocaleDateString("en-US")}`,
    ),
    { x: MARGIN, y, size: 8, font: helv, color: grey },
  );

  return await doc.save();
}
