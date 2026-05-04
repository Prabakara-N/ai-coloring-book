/**
 * Story-book PDF assembly endpoint (Phase 1).
 *
 * Body:
 *   {
 *     title?: string,
 *     pages: [{ id, name, dataUrl }, ...],
 *     cover?: { dataUrl },
 *     backCover?: { dataUrl },
 *     trimWidthInches?: number,   // default 6
 *     trimHeightInches?: number,  // default 9
 *   }
 *
 * Returns: application/pdf bytes (Content-Disposition attachment).
 */

import { NextResponse } from "next/server";
import {
  assembleStoryBookPdf,
  type StoryPageInput,
} from "@/lib/story-book-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  title?: string;
  pages?: StoryPageInput[];
  cover?: { dataUrl: string };
  backCover?: { dataUrl: string };
  trimWidthInches?: number;
  trimHeightInches?: number;
}

function isPage(value: unknown): value is StoryPageInput {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as StoryPageInput).id === "string" &&
    typeof (value as StoryPageInput).name === "string" &&
    typeof (value as StoryPageInput).dataUrl === "string" &&
    (value as StoryPageInput).dataUrl.startsWith("data:")
  );
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const pages = Array.isArray(body.pages) ? body.pages.filter(isPage) : [];
  if (pages.length === 0) {
    return NextResponse.json(
      { error: "At least one page with a data URL is required." },
      { status: 400 },
    );
  }

  try {
    const bytes = await assembleStoryBookPdf({
      title: body.title,
      pages,
      cover: body.cover,
      backCover: body.backCover,
      trimWidthInches: body.trimWidthInches,
      trimHeightInches: body.trimHeightInches,
    });
    const filename = (body.title ?? "crayonsparks-story-book")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Story book PDF assembly failed",
      },
      { status: 500 },
    );
  }
}
