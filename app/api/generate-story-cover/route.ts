/**
 * Story-book front-cover generation endpoint (Phase 1 — toddler band).
 *
 * Body:
 *   {
 *     title: string,
 *     characters: [{ name, descriptor }, ...],   // 1-3 locked characters
 *     palette: { name, hexes: [...] },
 *     coverScene: string,                        // 12-30 word cover description
 *     coverComposition?: string,                 // optional camera/framing hint
 *     ageBand?: "toddlers",                      // reserved for future bands
 *     model?: GeminiImageModel,                  // optional override
 *   }
 *
 * Returns: { dataUrl, model, elapsedMs }
 */

import { NextResponse } from "next/server";
import { generateColoringImage } from "@/lib/gemini";
import {
  DEFAULT_COVER_MODEL,
  isGeminiImageModel,
  type GeminiImageModel,
} from "@/lib/constants";
import {
  STORY_COVER_TODDLER_SYSTEM,
  STORY_COVER_TODDLER_USER,
  type StoryCharacter,
  type StoryPalette,
} from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  title?: string;
  characters?: StoryCharacter[];
  palette?: StoryPalette;
  coverScene?: string;
  coverComposition?: string;
  ageBand?: "toddlers";
  model?: GeminiImageModel;
  audienceLabel?: string;
  pageCount?: number;
  bottomStripPhrases?: string[];
  sidePlaqueLines?: string[];
  coverBadgeStyle?: string;
  brandStrapline?: string;
}

function isStoryCharacter(value: unknown): value is StoryCharacter {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as StoryCharacter).name === "string" &&
    (value as StoryCharacter).name.trim().length > 0 &&
    typeof (value as StoryCharacter).descriptor === "string" &&
    (value as StoryCharacter).descriptor.trim().length > 0
  );
}

function isPalette(value: unknown): value is StoryPalette {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as StoryPalette).name === "string" &&
    Array.isArray((value as StoryPalette).hexes)
  );
}

const MAX_CHARACTERS = 3;

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const title = body.title?.trim();
  const coverScene = body.coverScene?.trim();
  const palette = isPalette(body.palette) ? body.palette : null;
  const characters = Array.isArray(body.characters)
    ? body.characters.filter(isStoryCharacter).slice(0, MAX_CHARACTERS)
    : [];

  if (!title) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }
  if (!coverScene) {
    return NextResponse.json(
      { error: "coverScene is required." },
      { status: 400 },
    );
  }
  if (!palette) {
    return NextResponse.json(
      { error: "palette is required ({ name, hexes })." },
      { status: 400 },
    );
  }
  if (characters.length === 0) {
    return NextResponse.json(
      { error: "At least one locked character is required." },
      { status: 400 },
    );
  }

  const userText = STORY_COVER_TODDLER_USER({
    title,
    characters,
    palette,
    coverScene,
    composition: body.coverComposition?.trim(),
    audienceLabel: body.audienceLabel,
    pageCount: body.pageCount,
    bottomStripPhrases: body.bottomStripPhrases,
    sidePlaqueLines: body.sidePlaqueLines,
    coverBadgeStyle: body.coverBadgeStyle,
    brandStrapline: body.brandStrapline,
  });

  const fullPrompt = `${STORY_COVER_TODDLER_SYSTEM} ${userText}`;
  if (fullPrompt.length > 20000) {
    return NextResponse.json(
      { error: "Prompt too long (max 20000 chars)." },
      { status: 400 },
    );
  }

  const resolvedModel: GeminiImageModel = isGeminiImageModel(body.model)
    ? body.model
    : DEFAULT_COVER_MODEL;

  try {
    const start = Date.now();
    const image = await generateColoringImage(fullPrompt, {
      aspectRatio: "2:3",
      model: resolvedModel,
      systemInstruction: STORY_COVER_TODDLER_SYSTEM,
    });
    const dataUrl = `data:${image.mimeType};base64,${image.data}`;
    return NextResponse.json({
      dataUrl,
      model: resolvedModel,
      elapsedMs: Date.now() - start,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Story cover generation failed",
      },
      { status: 500 },
    );
  }
}
