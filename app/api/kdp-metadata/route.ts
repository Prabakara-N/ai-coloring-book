import { NextResponse } from "next/server";
import {
  generateKdpMetadata,
  type AgeBand,
  type KdpMetadataInput,
} from "@/lib/kdp-metadata";
import { generateKdpMetadataHybrid } from "@/lib/kdp-metadata-hybrid";

export const runtime = "nodejs";
export const maxDuration = 90;

type Provider = "gemini" | "hybrid";

interface Body {
  bookTitle?: string;
  scene?: string;
  age?: AgeBand;
  pageCount?: number;
  samplePages?: string[];
  provider?: Provider;
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

  const provider: Provider = body.provider === "hybrid" ? "hybrid" : "gemini";

  try {
    const metadata =
      provider === "hybrid"
        ? await generateKdpMetadataHybrid(input)
        : await generateKdpMetadata(input);
    return NextResponse.json({ metadata, provider });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "KDP metadata generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
