/**
 * Story-book back-cover generation endpoint (Phase 1 — toddler band).
 *
 * Body:
 *   {
 *     title: string,
 *     palette: { name, hexes: [...] },
 *     tagline: string,                          // hard cap 22 words for toddlers
 *     coverReferenceDataUrl?: string,           // front cover image (color anchor)
 *     brandStrapline?: string,
 *     forceColor?: string,
 *     model?: ImageModel,
 *   }
 *
 * Returns: { dataUrl, model, elapsedMs }
 */

import { NextResponse } from "next/server";
import { generateImageByModel } from "@/lib/image-providers";
import {
  DEFAULT_COVER_MODEL,
  isImageModel,
  type ImageModel,
} from "@/lib/constants";
import {
  STORY_BACK_COVER_TODDLER_SYSTEM,
  STORY_BACK_COVER_TODDLER_USER,
  type StoryPalette,
} from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  title?: string;
  palette?: StoryPalette;
  tagline?: string;
  coverReferenceDataUrl?: string;
  brandStrapline?: string;
  forceColor?: string;
  model?: ImageModel;
}

function isPalette(value: unknown): value is StoryPalette {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as StoryPalette).name === "string" &&
    Array.isArray((value as StoryPalette).hexes)
  );
}

function parseDataUrl(
  url: string,
): { mimeType: string; data: string } | null {
  if (!url.startsWith("data:")) return null;
  const sep = url.indexOf(";base64,");
  if (sep < 0) return null;
  const mimeType = url.slice(5, sep);
  const data = url.slice(sep + 8);
  if (!mimeType || !data) return null;
  return { mimeType, data };
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

const MAX_TAGLINE_WORDS_TODDLER = 22;

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const title = body.title?.trim();
  const tagline = body.tagline?.trim();
  const palette = isPalette(body.palette) ? body.palette : null;

  if (!title) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }
  if (!tagline) {
    return NextResponse.json(
      { error: "tagline is required." },
      { status: 400 },
    );
  }
  if (countWords(tagline) > MAX_TAGLINE_WORDS_TODDLER) {
    return NextResponse.json(
      {
        error: `Tagline exceeds the toddler-band limit of ${MAX_TAGLINE_WORDS_TODDLER} words.`,
      },
      { status: 400 },
    );
  }
  if (!palette) {
    return NextResponse.json(
      { error: "palette is required ({ name, hexes })." },
      { status: 400 },
    );
  }

  const userText = STORY_BACK_COVER_TODDLER_USER({
    title,
    palette,
    tagline,
    forceColor: body.forceColor?.trim() || undefined,
    brandStrapline: body.brandStrapline,
  });
  const fullPrompt = `${STORY_BACK_COVER_TODDLER_SYSTEM} ${userText}`;
  if (fullPrompt.length > 20000) {
    return NextResponse.json(
      { error: "Prompt too long (max 20000 chars)." },
      { status: 400 },
    );
  }

  const extraImages: Array<{ mimeType: string; data: string }> = [];
  if (body.coverReferenceDataUrl) {
    const parsed = parseDataUrl(body.coverReferenceDataUrl);
    if (parsed) extraImages.push(parsed);
  }

  const resolvedModel: ImageModel = isImageModel(body.model)
    ? body.model
    : DEFAULT_COVER_MODEL;

  try {
    const start = Date.now();
    const image = await generateImageByModel(fullPrompt, {
      aspectRatio: "2:3",
      model: resolvedModel,
      systemInstruction: STORY_BACK_COVER_TODDLER_SYSTEM,
      extraImages: extraImages.length ? extraImages : undefined,
    });
    return NextResponse.json({
      dataUrl: `data:${image.mimeType};base64,${image.data}`,
      model: resolvedModel,
      elapsedMs: Date.now() - start,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Story back-cover generation failed",
      },
      { status: 500 },
    );
  }
}
