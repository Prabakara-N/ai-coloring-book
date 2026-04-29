import { NextResponse } from "next/server";
import { type AgeBand, type KdpMetadataInput } from "@/lib/kdp-metadata";
import { generateKdpMetadataHybrid } from "@/lib/kdp-metadata-hybrid";

export const runtime = "nodejs";
export const maxDuration = 90;

interface Body {
  bookTitle?: string;
  scene?: string;
  age?: AgeBand;
  pageCount?: number;
  samplePages?: string[];
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const bookTitle = body.bookTitle?.trim();
  const scene = body.scene?.trim();
  const age: AgeBand = body.age ?? "toddlers";
  const pageCount = Math.max(5, Math.min(100, Number(body.pageCount ?? 20)));
  const samplePages = Array.isArray(body.samplePages)
    ? body.samplePages.filter((s): s is string => typeof s === "string")
    : [];

  if (!bookTitle || !scene) {
    return NextResponse.json(
      { error: "bookTitle and scene are required." },
      { status: 400 },
    );
  }

  const input: KdpMetadataInput = {
    bookTitle,
    scene,
    age,
    pageCount,
    samplePages,
  };

  // Always use the hybrid (Perplexity research + GPT-5-mini copy)
  // generator. The Gemini-only fallback was removed — Perplexity-grounded
  // KDP metadata is materially better because it sees live Amazon
  // listings instead of guessing from training data.
  try {
    const metadata = await generateKdpMetadataHybrid(input);
    return NextResponse.json({ metadata, provider: "hybrid" });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "KDP metadata generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
