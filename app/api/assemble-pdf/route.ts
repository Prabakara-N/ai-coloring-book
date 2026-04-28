import { NextResponse } from "next/server";
import { assembleColoringBookPdf, type PdfPageInput } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  title?: string;
  category?: string;
  pages?: PdfPageInput[];
  cover?: { dataUrl: string };
  backCover?: { dataUrl: string };
  belongsTo?: { dataUrl: string; style: "bw" | "color" };
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
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
        { status: 400 }
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
    });
    const safeCategory = (body.category ?? "book").replace(/[^a-z0-9]+/gi, "_");
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return new NextResponse(arrayBuffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="crayonsparks_${safeCategory}_KDP.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF assembly failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
