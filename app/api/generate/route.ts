import { NextResponse } from "next/server";
import {
  generateColoringImage,
  SUPPORTED_ASPECTS,
  type AspectRatio,
} from "@/lib/gemini";
import {
  DEFAULT_COVER_MODEL,
  DEFAULT_INTERIOR_MODEL,
  isGeminiImageModel,
  type GeminiImageModel,
} from "@/lib/constants";
import {
  MASTER_PROMPT_TEMPLATE,
  REFERENCE_LED_PROMPT_TEMPLATE,
  COLOR_COVER_PROMPT_TEMPLATE,
  BACK_COVER_PROMPT_TEMPLATE,
  BELONGS_TO_PROMPT_TEMPLATE,
  findCategory,
  type AgeRange,
  type Detail,
  type Background,
  type CoverStyle,
  type CoverBorder,
  type BelongsToStyle,
} from "@/lib/prompts";
import { rateColoringPage, type QualityScore } from "@/lib/quality-gate";
import { extractStyleFromReference } from "@/lib/style-extractor";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  mode?: "subject" | "raw" | "cover" | "back-cover" | "belongs-to";
  subject?: string;
  prompt?: string;
  age?: AgeRange;
  detail?: Detail;
  background?: Background;
  aspectRatio?: AspectRatio;
  categorySlug?: string;
  // Custom-category overrides (for user-defined books)
  scene?: string;
  coverTitle?: string;
  coverScene?: string;
  coverStyle?: CoverStyle;
  coverBorder?: CoverBorder;
  // Page count of the interior — used to render the "N CUTE & FUN DESIGNS"
  // corner badge on the front cover.
  pageCount?: number;
  // Optional age label override (e.g. "Ages 4-8"). Defaults to "Ages 3-6"
  // inside the cover prompt template when omitted.
  ageLabel?: string;
  // Three short ALL-CAPS phrases for the front-cover footer ribbon.
  // When omitted (or invalid) the template falls back to the default
  // CrayonSparks brand strip.
  bottomStripPhrases?: string[];
  // Three short ALL-CAPS lines for the front-cover side plaque, in
  // top-to-bottom order. Falls back to a generic plaque when omitted.
  sidePlaqueLines?: string[];
  // One-sentence design-language description applied to the page-count
  // badge, side plaque, and bottom strip so all three overlays look like
  // objects from the book's world (e.g. wooden farm signs, chalkboard
  // menus, metallic space panels). Falls back to a clean default.
  coverBadgeStyle?: string;
  // Optional override for the small brand strapline inside the bottom
  // strip's second line. Defaults to the CrayonSparks brand line.
  brandStrapline?: string;
  // For back-cover mode: marketing blurb that appears on the back
  backCoverDescription?: string;
  // Back-cover refine panel — when set, force a specific named hue for
  // the back-cover body (e.g. "soft pastel pink") instead of letting
  // Gemini infer from the front cover reference.
  backCoverColor?: string;
  // Back-cover refine panel — when set, force this exact tagline text
  // instead of letting Gemini invent one.
  backCoverTagline?: string;
  // For belongs-to mode: 1-3 main characters from the book (used in corner
  // cameos) + bw|color style choice.
  belongsToCharacters?: string;
  belongsToStyle?: BelongsToStyle;
  // CHARACTER LOCK extracted once from the cover by /api/extract-characters.
  // Pre-formatted block (starts with "🔒 CHARACTER LOCK ...") that gets
  // injected into the master subject prompt so every page draws recurring
  // characters identical to the cover. Solves the "fat cat on cover,
  // skinny cat on page 7" KDP-rejection problem.
  characterLock?: string;
  // Per-prompt variation (so each page in a book differs)
  variantSeed?: string;
  // Optional reference image — used as style/composition inspiration
  referenceDataUrl?: string;
  // Optional STYLE-CHAIN reference: a previously generated page from the
  // SAME book, passed alongside the user's reference (if any) so Gemini
  // can match character look + line weight + overall style across pages.
  // Solves the "bear looks different on page 3 vs page 7" drift problem.
  // Unlike `referenceDataUrl`, this does NOT switch to the slim
  // reference-led prompt template — full master prompt rules stay in effect.
  chainReferenceDataUrl?: string;
  /**
   * Cover image of the same book — when set, attached as an ADDITIONAL
   * visual reference alongside the chain reference. Locks character
   * design to the cover for every interior page (not just page 1, the
   * way the chain ref drifts after promotion). Sent independently so we
   * can have BOTH the previous-interior anchor (border + style) AND the
   * cover (character look) influence the new page.
   */
  coverReferenceDataUrl?: string;
  // Whether to run the AI vision quality gate after generation. Defaults to true
  // for "subject" and "cover" modes (skipped for "raw" playground mode).
  qualityGate?: boolean;
  // Optional image-model override. When omitted, the server picks a sensible
  // default based on `mode` (covers → DEFAULT_COVER_MODEL, everything else →
  // DEFAULT_INTERIOR_MODEL). The bulk-book UI sends an explicit model from
  // its cover/interior dropdowns; the playground and other surfaces can
  // omit this field and inherit the per-mode default.
  model?: GeminiImageModel;
}

function parseDataUrl(url: string): { mimeType: string; data: string } | null {
  // String-based parsing — regex backtracking on multi-MB base64 reference
  // images was overflowing V8's regex stack ("RangeError: Maximum call stack
  // size exceeded").
  if (!url.startsWith("data:")) return null;
  const sep = url.indexOf(";base64,");
  if (sep < 0) return null;
  const mimeType = url.slice(5, sep);
  const data = url.slice(sep + 8);
  if (!mimeType || !data) return null;
  return { mimeType, data };
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mode = body.mode ?? "subject";
  const category = body.categorySlug ? findCategory(body.categorySlug) : null;

  let text: string;
  let aspectRatio: AspectRatio;

  if (mode === "cover") {
    const title = body.coverTitle?.trim() || category?.coverTitle;
    const scene = body.coverScene?.trim() || category?.coverScene;
    if (!title || !scene) {
      return NextResponse.json(
        { error: "Cover mode requires a category or (coverTitle + coverScene)." },
        { status: 400 }
      );
    }
    text = COLOR_COVER_PROMPT_TEMPLATE({
      title,
      scene,
      style: body.coverStyle,
      border: body.coverBorder,
      pageCount: body.pageCount,
      ageLabel: body.ageLabel,
      bottomStripPhrases: body.bottomStripPhrases,
      sidePlaqueLines: body.sidePlaqueLines,
      coverBadgeStyle: body.coverBadgeStyle,
      brandStrapline: body.brandStrapline,
    });
    aspectRatio = "3:4";
  } else if (mode === "belongs-to") {
    const title = body.coverTitle?.trim() || category?.coverTitle || "Coloring Book";
    const characters = body.belongsToCharacters?.trim();
    if (!characters) {
      return NextResponse.json(
        { error: "Belongs-to mode requires belongsToCharacters." },
        { status: 400 },
      );
    }
    text = BELONGS_TO_PROMPT_TEMPLATE({
      bookTitle: title,
      characters,
      style: body.belongsToStyle ?? "bw",
      characterLock: body.characterLock?.trim(),
    });
    aspectRatio = "3:4";
  } else if (mode === "back-cover") {
    const title = body.coverTitle?.trim() || category?.coverTitle;
    const scene = body.coverScene?.trim() || category?.coverScene;
    const description =
      body.backCoverDescription?.trim() ||
      category?.kdp?.description ||
      "A fun coloring book with original illustrations.";
    if (!title || !scene) {
      return NextResponse.json(
        { error: "Back-cover mode requires a category or (coverTitle + coverScene)." },
        { status: 400 },
      );
    }
    text = BACK_COVER_PROMPT_TEMPLATE({
      title,
      scene,
      description,
      style: body.coverStyle,
      border: body.coverBorder,
      forceColor: body.backCoverColor?.trim() || undefined,
      forceTagline: body.backCoverTagline?.trim() || undefined,
    });
    aspectRatio = "3:4";
  } else if (mode === "raw") {
    const raw = (body.prompt ?? "").trim();
    if (!raw) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }
    text = raw;
    aspectRatio =
      body.aspectRatio && SUPPORTED_ASPECTS.includes(body.aspectRatio)
        ? body.aspectRatio
        : "1:1";
  } else {
    const subject = (body.subject ?? "").trim();
    if (!subject) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }
    text = MASTER_PROMPT_TEMPLATE(subject, {
      age: body.age,
      detail: body.detail,
      background: body.background,
      scene: body.scene?.trim() || category?.scene,
      variantSeed: body.variantSeed,
      characterLock: body.characterLock?.trim(),
    });
    aspectRatio =
      body.aspectRatio && SUPPORTED_ASPECTS.includes(body.aspectRatio)
        ? body.aspectRatio
        : "3:4";
  }

  // Gemini 2.5 Flash Image easily handles 32k+ tokens. Our wrapped master
  // prompt + story-mode scene descriptors + character lock (up to 5
  // characters × ~400 chars) + cover-as-anchor chain directive + border
  // verifier retry suffixes can run 12-16k chars on heavy retries.
  // 20000 keeps headroom while still rejecting pathological inputs.
  if (text.length > 20000) {
    return NextResponse.json({ error: "Prompt too long (max 20000 chars)." }, { status: 400 });
  }

  // Two-step reference flow:
  //   1. gpt-4o-mini Vision extracts a concise art-style description from
  //      the reference image (no raw image sent to Gemini).
  //   2. The style description is appended to the prompt so Gemini sees
  //      "imitate THIS STYLE" as text only — no image-edit confusion.
  // For "raw" mode (single-image playground freeform) we still pass the
  // raw image because the user wants direct image editing there.
  let referenceImage: { mimeType: string; data: string } | undefined;
  if (body.referenceDataUrl) {
    const parsed = parseDataUrl(body.referenceDataUrl);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid reference image data URL." },
        { status: 400 },
      );
    }

    if (mode === "raw") {
      // Playground mode — keep raw image-edit behavior.
      referenceImage = parsed;
      text = `Reference image is provided as visual inspiration. Use its style/composition. Generate following: ${text}`;
    } else if (mode === "subject") {
      // Coloring page with reference: use the REFERENCE-LED template
      // (slim rules + style description) AND send the raw image as visual
      // cue. This avoids the master prompt's strict subject-size /
      // background-minimal rules contradicting what the reference shows.
      try {
        const { description } = await extractStyleFromReference(
          body.referenceDataUrl,
          "page",
        );
        const subject = body.subject?.trim() ?? "";
        text = REFERENCE_LED_PROMPT_TEMPLATE(subject, description, {
          age: body.age,
        });
        referenceImage = parsed;
      } catch {
        // Style extraction failed — fall back to MASTER prompt without ref.
        text = `(Note: a reference image was provided but could not be analyzed.)\n${text}`;
      }
    } else if (mode === "back-cover") {
      // Back-cover: chain BOTH the text style description AND the actual
      // front-cover image. Text alone (the prior flow) lost color precision
      // — GPT-5.5 might say "soft pastel" and Gemini would default to mint
      // green even when the front was baby pink. Sending the image lets
      // Gemini visually anchor the dominant color, while the text guides
      // the overall composition rules (two-layer band, tagline placement).
      try {
        const { description } = await extractStyleFromReference(
          body.referenceDataUrl,
          "cover",
        );
        text = `🎨 FRONT-COVER COLOR ANCHOR — A reference image of the FRONT COVER is attached. The back cover MUST use the SAME dominant background color as the front cover (study the attached image to identify it). Style description from vision analysis: "${description}". Apply that style — but the BACK is minimal layout (no characters, no scene, just colored background + tagline + barcode strip), NOT a copy of the front. Use the front cover ONLY for color matching, not for content.\n\n${text}`;
        referenceImage = parsed;
      } catch {
        // Style extraction failed — still send the image so color match
        // works even without the text description.
        text = `🎨 FRONT-COVER COLOR ANCHOR — A reference image of the front cover is attached. Match its dominant background color exactly on the back cover.\n\n${text}`;
        referenceImage = parsed;
      }
    } else {
      // Front cover / other surfaces with a user-uploaded style reference.
      // Keep text-only — sending the image would put Gemini in image-edit
      // mode and copy elements rather than just adopting the style.
      try {
        const { description } = await extractStyleFromReference(
          body.referenceDataUrl,
          "cover",
        );
        text = `🎨 ART STYLE TO IMITATE — READ FIRST AND OBEY: Generate the new illustration in this art style: "${description}". This style description was extracted from a reference image the user uploaded. Apply this style to a COMPLETELY NEW illustration of the subject described below. DO NOT copy any specific elements from the reference; only adopt its visual style.\n\n${text}`;
      } catch {
        text = `(Note: a reference image was provided but could not be analyzed.)\n${text}`;
      }
    }
  }

  // STYLE-CHAIN reference: a previously generated page from the same book.
  // Sent as an additional image so Gemini can match recurring characters,
  // line weight, and overall style from page to page. We do NOT replace the
  // master prompt — full B&W / no-border / size rules stay in effect.
  //
  // Plus: the cover image is sent as a SECONDARY anchor (when provided)
  // so EVERY interior page sees the cover's character design, not just
  // page 1. Fixes the drift where the cover's character look gets
  // dropped after the chain ref is promoted to the first interior page.
  const chainImages: Array<{ mimeType: string; data: string }> = [];
  let chainHasInteriorPage = false;
  let chainHasCover = false;
  if (body.chainReferenceDataUrl && mode !== "raw") {
    const parsedChain = parseDataUrl(body.chainReferenceDataUrl);
    if (parsedChain) {
      chainImages.push(parsedChain);
      chainHasInteriorPage = true;
    }
  }
  if (
    body.coverReferenceDataUrl &&
    body.coverReferenceDataUrl !== body.chainReferenceDataUrl &&
    mode !== "raw" &&
    mode !== "cover" &&
    mode !== "back-cover"
  ) {
    const parsedCover = parseDataUrl(body.coverReferenceDataUrl);
    if (parsedCover) {
      chainImages.push(parsedCover);
      chainHasCover = true;
    }
  }
  if (chainImages.length > 0) {
    const refLabel =
      chainHasInteriorPage && chainHasCover
        ? "TWO images from THE SAME BOOK are attached as visual references — image 1 is a previously generated INTERIOR PAGE, image 2 is the COVER"
        : chainHasCover
          ? "An image from THE SAME BOOK is attached as a visual reference (the COVER)"
          : "An image from THE SAME BOOK is attached as a visual reference (a previously generated INTERIOR PAGE)";
    text = `Reference image guidance (load-bearing). ${refLabel}. The reference is for ONLY two things — character look and page frame. It is NOT a scene template and NEVER overrides the page subject.\n\n(A) Subject identity — HIGHEST PRIORITY: the page subject text below names exactly what to draw on this page. The subject text is law; the reference is decoration. Read the subject text below carefully, identify the exact species / object / character / fruit / vehicle / etc. it names, and draw THAT — not whatever similar-looking thing the reference image happens to show. If the subject names a different thing from the reference, the page draws the subject, not the reference's contents.\n\n(B) Recurring character(s): ONLY when the page subject explicitly names a character that also appears in the reference, match that character's look identically — same species, body proportions, head/face shape, fur/mane/tail style, markings, color. When the cover is attached, the cover is the ground truth for character design. If the page subject does NOT explicitly name any character from the reference, NO character from the reference appears on this page at all — the subject stands alone.\n\n(C) Page frame (only when an interior-page reference is attached): the new page's printable outline must sit at the same inset and thickness as the interior reference. Never draw two nested outlines. The cover doesn't have an interior page frame, so the cover's edge styling is not the source for the frame.\n\n(D) Style: line weight, character treatment, and illustration polish feel like a sibling page.\n\nWhat the reference is NOT for — STRICT: do NOT copy the reference's subject, the reference's background, scene composition, layout, sub-location, sky, ground, props, or any specific environmental element. The background of every interior page is freshly composed from THIS page's brief, and must visibly differ from the cover's background and from the previous page's background.\n\n${text}`;
  }

  try {
    // Cover surfaces (front, back, belongs-to is technically interior but it
    // sits on the inside cover and uses the cover-quality model so character
    // cameos match the front-cover style) → cover default.
    // Everything else → interior default.
    const isCoverSurface =
      mode === "cover" || mode === "back-cover" || mode === "belongs-to";
    const fallbackModel: GeminiImageModel = isCoverSurface
      ? DEFAULT_COVER_MODEL
      : DEFAULT_INTERIOR_MODEL;

    // Trust-but-verify: the body type system can't enforce the union at the
    // wire boundary, so reject anything outside the allowlist before it
    // reaches Gemini (avoids paying for a typo'd model id).
    const resolvedModel: GeminiImageModel = isGeminiImageModel(body.model)
      ? body.model
      : fallbackModel;

    const image = await generateColoringImage(text, {
      aspectRatio,
      sourceImage: referenceImage,
      extraImages: chainImages.length ? chainImages : undefined,
      model: resolvedModel,
    });
    const dataUrl = `data:${image.mimeType};base64,${image.data}`;

    let quality: QualityScore | null = null;
    const wantsGate =
      body.qualityGate !== false &&
      mode !== "raw" &&
      !!process.env.OPENAI_API_KEY;
    if (wantsGate) {
      try {
        // Treat covers + COLOR belongs-to as "cover" (relaxed B&W rules).
        // BW belongs-to is rated as a page (must stay pure black ink).
        const isCover =
          mode === "cover" ||
          mode === "back-cover" ||
          (mode === "belongs-to" && body.belongsToStyle === "color");
        const expected =
          mode === "belongs-to"
            ? `'This Book Belongs To' nameplate page with a decorative banner, a blank line for the child's name, and two corner character cameos drawn from: ${body.belongsToCharacters ?? "book characters"}`
            : isCover
              ? body.coverScene?.trim() || category?.coverScene || "book cover"
              : body.subject?.trim() || "coloring page subject";
        quality = await rateColoringPage({
          imageDataUrl: dataUrl,
          expectedSubject: expected,
          isCover,
        });
      } catch {
        // Don't fail the request if rating fails — just omit it.
        quality = null;
      }
    }

    return NextResponse.json({
      mimeType: image.mimeType,
      data: image.data,
      dataUrl,
      prompt: text,
      aspectRatio,
      mode,
      quality,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
