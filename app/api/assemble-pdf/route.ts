import { NextResponse } from "next/server";
import { assembleColoringBookPdf, type PdfPageInput } from "@/lib/pdf";
import {
  buildKdpCoverPdf,
  type KdpPaperType,
} from "@/lib/kdp-cover-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  title?: string;
  category?: string;
  pages?: PdfPageInput[];
  cover?: { dataUrl: string };
  backCover?: { dataUrl: string };
  belongsTo?: { dataUrl: string; style: "bw" | "color" };
  /**
   * Output mode:
   *   "combined"    — single PDF with cover + interior + back cover
   *                   (the legacy default; works for digital preview but
   *                   KDP rejects it because it expects cover separately)
   *   "interior"    — PDF with belongs-to + numbered pages only,
   *                   no covers. Pair with a separate cover-wrap PDF.
   *   "cover-wrap"  — single wide PDF with back + spine + front + bleed,
   *                   sized exactly to KDP's expected dimensions.
   * Defaults to "combined" for back-compat.
   */
  mode?: "combined" | "interior" | "cover-wrap";
  /** Trim size in inches (only used for cover-wrap mode). Default 8.5×11. */
  trimWidthInches?: number;
  trimHeightInches?: number;
  /** Paper type for spine width math. Default "bw" (cheapest). */
  paper?: KdpPaperType;
  /** Total interior page count INCLUDING blanks (drives spine width).
   *  When omitted, falls back to (pages.length × 2 + extras). */
  interiorPageCount?: number;
  /**
   * When false, the assembler does NOT insert alternating blank pages
   * between content. Used by the Etsy/Gumroad single-PDF download where
   * the buyer prints the file directly — they want page after page of
   * art, no in-between blanks. KDP uploads keep the default true.
   */
  includeBlankPages?: boolean;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mode = body.mode ?? "combined";
  const safeCategory = (body.category ?? "book").replace(/[^a-z0-9]+/gi, "_");

  // ---- COVER-WRAP MODE — KDP-correct cover PDF only --------------------
  if (mode === "cover-wrap") {
    if (!body.cover?.dataUrl?.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "cover.dataUrl required for cover-wrap mode." },
        { status: 400 },
      );
    }
    if (!body.backCover?.dataUrl?.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "backCover.dataUrl required for cover-wrap mode." },
        { status: 400 },
      );
    }
    const interiorPageCount =
      body.interiorPageCount ??
      (body.pages?.length
        ? body.pages.length * 2 + (body.belongsTo ? 2 : 0)
        : 24);
    try {
      const bytes = await buildKdpCoverPdf({
        frontCover: body.cover,
        backCover: body.backCover,
        trimWidthInches: body.trimWidthInches ?? 8.5,
        trimHeightInches: body.trimHeightInches ?? 11,
        interiorPageCount,
        paper: body.paper ?? "bw",
      });
      const arrayBuffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      );
      return new NextResponse(arrayBuffer as ArrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="crayonsparks_${safeCategory}_cover_KDP.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Cover wrap PDF build failed.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // ---- COMBINED + INTERIOR MODE — pages-based assembly -----------------
  const pages = body.pages ?? [];
  if (pages.length === 0) {
    return NextResponse.json({ error: "No pages to assemble." }, { status: 400 });
  }
  if (pages.length > 60) {
    return NextResponse.json({ error: "Too many pages (max 60)." }, { status: 400 });
  }
  for (const p of pages) {
    if (!p.dataUrl?.startsWith("data:image/")) {
      return NextResponse.json(
        { error: `Invalid dataUrl for page ${p.id}.` },
        { status: 400 },
      );
    }
  }
  try {
    if (body.cover?.dataUrl && !body.cover.dataUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid cover dataUrl." }, { status: 400 });
    }
    if (
      body.backCover?.dataUrl &&
      !body.backCover.dataUrl.startsWith("data:image/")
    ) {
      return NextResponse.json(
        { error: "Invalid back-cover dataUrl." },
        { status: 400 },
      );
    }
    if (
      body.belongsTo?.dataUrl &&
      !body.belongsTo.dataUrl.startsWith("data:image/")
    ) {
      return NextResponse.json(
        { error: "Invalid belongs-to dataUrl." },
        { status: 400 },
      );
    }
    const bytes = await assembleColoringBookPdf({
      title: body.title,
      category: body.category ?? "book",
      pages,
      cover: body.cover,
      backCover: body.backCover,
      belongsTo: body.belongsTo,
      interiorOnly: mode === "interior",
      includeBlankPages: body.includeBlankPages,
      trimWidthInches: body.trimWidthInches,
      trimHeightInches: body.trimHeightInches,
    });
    const arrayBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    );
    const filenameSuffix = mode === "interior" ? "interior_KDP" : "KDP";
    return new NextResponse(arrayBuffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="crayonsparks_${safeCategory}_${filenameSuffix}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF assembly failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
