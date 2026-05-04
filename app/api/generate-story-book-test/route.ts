/**
 * Throwaway test endpoint — generates either the front cover or one
 * interior page from a story-book fixture so the pipeline can be
 * validated end-to-end before the real chat planning flow ships.
 *
 * The PROMPTS this calls (story-cover.ts, story-page.ts) are 100%
 * generic. The fixture is the only theme-specific input — swap fixtures
 * via `bookSlug` to validate any story.
 *
 * Body:
 *   {
 *     mode?: "cover" | "page",     // default "page"
 *     sceneIndex?: number,         // page mode only, default 0
 *     bookSlug?: string,           // default DEFAULT_FIXTURE_SLUG
 *     coverReferenceDataUrl?: string,   // page mode only — anchors look
 *     chainReferenceDataUrl?: string,   // page mode only — previous page
 *     model?: GeminiImageModel,
 *   }
 *
 * Returns:
 *   page mode:  { dataUrl, sceneId, sceneName, scene, dialogue, narration, model, elapsedMs, bookSlug, bookTitle }
 *   cover mode: { dataUrl, model, elapsedMs, bookSlug, bookTitle }
 */

import { NextResponse } from "next/server";
import { generateColoringImage } from "@/lib/gemini";
import {
  DEFAULT_COVER_MODEL,
  isGeminiImageModel,
  type GeminiImageModel,
} from "@/lib/constants";
import {
  STORY_PAGE_TODDLER_SYSTEM,
  STORY_PAGE_TODDLER_USER,
  STORY_COVER_TODDLER_SYSTEM,
  STORY_COVER_TODDLER_USER,
  STORY_BACK_COVER_TODDLER_SYSTEM,
  STORY_BACK_COVER_TODDLER_USER,
} from "@/lib/prompts";
import {
  DEFAULT_FIXTURE_SLUG,
  getFixture,
} from "@/lib/story-book-fixtures";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  mode?: "cover" | "back-cover" | "page";
  sceneIndex?: number;
  bookSlug?: string;
  coverReferenceDataUrl?: string;
  chainReferenceDataUrl?: string;
  model?: GeminiImageModel;
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

function buildPageAnchorPreamble(hasCover: boolean, hasChain: boolean): string {
  if (!hasCover && !hasChain) return "";
  const refLabel =
    hasCover && hasChain
      ? "TWO images from THE SAME BOOK are attached as visual references — image 1 is the FRONT COVER, image 2 is the previously generated INTERIOR PAGE"
      : hasCover
        ? "An image from THE SAME BOOK is attached as a visual reference — the FRONT COVER"
        : "An image from THE SAME BOOK is attached as a visual reference — a previously generated INTERIOR PAGE";
  return `Reference image guidance (load-bearing). ${refLabel}. The references are the ground truth for character look and the book's visual style — match them exactly. (A) Recurring characters that appear on the new page MUST be drawn identical to how they appear in the references — same species, body proportions, head/face shape, fur/feather/skin color, accessories, distinguishing features. The cover (when attached) is the ground truth for character design. (B) Style: line weight, character rendering polish, color saturation, lighting feel — sibling-of-the-references. (C) DO NOT copy the references' specific scene, background, props, or character poses. The new page is a fresh scene composed from the page's own brief below; only the LOOK of recurring characters and the OVERALL style carries over. (D) Speech-bubble layout style stays consistent with prior pages — same bubble shape, same lettering style.`;
}

export async function POST(req: Request) {
  let body: Body = {};
  try {
    if (req.headers.get("content-length") !== "0") {
      body = (await req.json()) as Body;
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const fixture = getFixture(body.bookSlug ?? DEFAULT_FIXTURE_SLUG);
  const mode: "cover" | "back-cover" | "page" =
    body.mode === "cover"
      ? "cover"
      : body.mode === "back-cover"
        ? "back-cover"
        : "page";
  const resolvedModel: GeminiImageModel = isGeminiImageModel(body.model)
    ? body.model
    : DEFAULT_COVER_MODEL;

  if (mode === "cover") {
    const userText = STORY_COVER_TODDLER_USER({
      title: fixture.title,
      characters: fixture.characters,
      palette: fixture.palette,
      coverScene: fixture.coverScene,
      composition: fixture.coverComposition,
      pageCount: fixture.scenes.length,
    });
    const fullPrompt = `${STORY_COVER_TODDLER_SYSTEM} ${userText}`;
    try {
      const start = Date.now();
      const image = await generateColoringImage(fullPrompt, {
        aspectRatio: "2:3",
        model: resolvedModel,
        systemInstruction: STORY_COVER_TODDLER_SYSTEM,
      });
      return NextResponse.json({
        dataUrl: `data:${image.mimeType};base64,${image.data}`,
        model: resolvedModel,
        elapsedMs: Date.now() - start,
        bookSlug: fixture.slug,
        bookTitle: fixture.title,
        mode: "cover",
      });
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof Error ? e.message : "Story cover generation failed",
        },
        { status: 500 },
      );
    }
  }

  if (mode === "back-cover") {
    const userText = STORY_BACK_COVER_TODDLER_USER({
      title: fixture.title,
      palette: fixture.palette,
      tagline: fixture.backCoverTagline,
    });
    const fullPrompt = `${STORY_BACK_COVER_TODDLER_SYSTEM} ${userText}`;
    const extraImages: Array<{ mimeType: string; data: string }> = [];
    if (body.coverReferenceDataUrl) {
      const parsed = parseDataUrl(body.coverReferenceDataUrl);
      if (parsed) extraImages.push(parsed);
    }
    try {
      const start = Date.now();
      const image = await generateColoringImage(fullPrompt, {
        aspectRatio: "2:3",
        model: resolvedModel,
        systemInstruction: STORY_BACK_COVER_TODDLER_SYSTEM,
        extraImages: extraImages.length ? extraImages : undefined,
      });
      return NextResponse.json({
        dataUrl: `data:${image.mimeType};base64,${image.data}`,
        model: resolvedModel,
        elapsedMs: Date.now() - start,
        bookSlug: fixture.slug,
        bookTitle: fixture.title,
        mode: "back-cover",
        anchored: { cover: extraImages.length > 0 },
      });
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof Error
              ? e.message
              : "Story back-cover generation failed",
        },
        { status: 500 },
      );
    }
  }

  const requestedIndex =
    typeof body.sceneIndex === "number" && Number.isFinite(body.sceneIndex)
      ? Math.floor(body.sceneIndex)
      : 0;
  if (requestedIndex < 0 || requestedIndex >= fixture.scenes.length) {
    return NextResponse.json(
      {
        error: `sceneIndex must be in [0, ${fixture.scenes.length - 1}].`,
      },
      { status: 400 },
    );
  }

  const scene = fixture.scenes[requestedIndex];
  const userText = STORY_PAGE_TODDLER_USER({
    characters: fixture.characters,
    palette: fixture.palette,
    scene: scene.scene,
    dialogue: scene.dialogue,
    narration: scene.narration,
    composition: scene.composition,
  });

  const extraImages: Array<{ mimeType: string; data: string }> = [];
  let hasCover = false;
  let hasChain = false;
  if (body.coverReferenceDataUrl) {
    const parsed = parseDataUrl(body.coverReferenceDataUrl);
    if (parsed) {
      extraImages.push(parsed);
      hasCover = true;
    }
  }
  if (
    body.chainReferenceDataUrl &&
    body.chainReferenceDataUrl !== body.coverReferenceDataUrl
  ) {
    const parsed = parseDataUrl(body.chainReferenceDataUrl);
    if (parsed) {
      extraImages.push(parsed);
      hasChain = true;
    }
  }
  const anchor = buildPageAnchorPreamble(hasCover, hasChain);
  const fullPrompt = anchor
    ? `${STORY_PAGE_TODDLER_SYSTEM} ${anchor} ${userText}`
    : `${STORY_PAGE_TODDLER_SYSTEM} ${userText}`;

  try {
    const start = Date.now();
    const image = await generateColoringImage(fullPrompt, {
      aspectRatio: "2:3",
      model: resolvedModel,
      systemInstruction: STORY_PAGE_TODDLER_SYSTEM,
      extraImages: extraImages.length ? extraImages : undefined,
    });
    return NextResponse.json({
      dataUrl: `data:${image.mimeType};base64,${image.data}`,
      sceneId: scene.id,
      sceneName: scene.name,
      scene: scene.scene,
      dialogue: scene.dialogue ?? [],
      narration: scene.narration ?? null,
      model: resolvedModel,
      elapsedMs: Date.now() - start,
      bookSlug: fixture.slug,
      bookTitle: fixture.title,
      mode: "page",
      anchored: { cover: hasCover, chain: hasChain },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Story page generation failed",
      },
      { status: 500 },
    );
  }
}
