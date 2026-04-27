import { NextResponse } from "next/server";
import {
  generateRefineSuggestions,
  type RefineContext,
  type QualityHint,
} from "@/lib/refine-suggestions";

export const runtime = "nodejs";
export const maxDuration = 30;

interface Body {
  imageDataUrl?: string;
  context?: RefineContext;
  quality?: QualityHint | null;
}

const VALID_CONTEXTS: RefineContext[] = ["page", "cover", "back-cover"];

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const imageDataUrl = body.imageDataUrl?.trim();
  if (!imageDataUrl?.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "imageDataUrl must be a data URL." },
      { status: 400 },
    );
  }
  const context: RefineContext =
    body.context && VALID_CONTEXTS.includes(body.context)
      ? body.context
      : "page";

  try {
    const result = await generateRefineSuggestions({
      imageDataUrl,
      context,
      quality: body.quality,
    });
    return NextResponse.json({ suggestions: result.suggestions });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate suggestions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
