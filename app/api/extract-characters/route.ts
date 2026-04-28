import { NextResponse } from "next/server";
import {
  extractCharactersFromCover,
  formatCharacterLock,
} from "@/lib/character-extractor";

export const runtime = "nodejs";
export const maxDuration = 30;

interface Body {
  coverDataUrl?: string;
  bookTitle?: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const coverDataUrl = body.coverDataUrl;
  const bookTitle = (body.bookTitle ?? "").trim() || "Coloring Book";
  if (!coverDataUrl?.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "coverDataUrl is required (must be a data:image/... URL)." },
      { status: 400 },
    );
  }

  try {
    const extracted = await extractCharactersFromCover(coverDataUrl, bookTitle);
    return NextResponse.json({
      characters: extracted.characters,
      lockBlock: formatCharacterLock(extracted),
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Character extraction failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
