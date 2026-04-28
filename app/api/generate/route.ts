import { NextResponse } from "next/server";
import { generateColoringImage, SUPPORTED_ASPECTS, type AspectRatio } from "@/lib/gemini";
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
  // For back-cover mode: marketing blurb that appears on the back
  backCoverDescription?: string;
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
  // Whether to run the AI vision quality gate after generation. Defaults to true
  // for "subject" and "cover" modes (skipped for "raw" playground mode).
  qualityGate?: boolean;
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
      "A fun coloring book with original hand-drawn illustrations.";
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
  // prompt + story-mode scene descriptors with inline character locks +
  // regenerate-with-quality-flaw improvement directives can run 7-10k chars.
  // 14000 leaves comfortable headroom while still rejecting runaway inputs.
  if (text.length > 14000) {
    return NextResponse.json({ error: "Prompt too long (max 14000 chars)." }, { status: 400 });
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
    } else {
      // Cover / back-cover — keep the existing text-only style-extraction.
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
  const chainImages: Array<{ mimeType: string; data: string }> = [];
  if (body.chainReferenceDataUrl && mode !== "raw") {
    const parsedChain = parseDataUrl(body.chainReferenceDataUrl);
    if (parsedChain) {
      chainImages.push(parsedChain);
      // Stronger directive — calls out the cover-as-anchor case (color
      // reference → B&W output) and the specific failure mode (different-
      // colored cat / different breed). Most KDP rejections come from
      // exactly this drift.
      text = `🔗 CHARACTER + STYLE CHAIN — CRITICAL CONSISTENCY ANCHOR: An image from THE SAME BOOK (usually the front cover) is attached as a visual reference. STRICT — the recurring character(s) on this attached image MUST appear IDENTICAL on the new page: same species, same body proportions (chubby vs skinny — if the reference shows a chubby cat, draw a chubby cat, NOT a skinny one), same head/face shape, same distinguishing markings (stripe pattern, color patches, accessories). If the reference shows a BLACK cat, the new page MUST have a BLACK cat — NOT an orange/grey/different-colored one. If the reference shows a fat tabby, you MUST draw the same fat tabby — NOT a generic skinny cat. The reference may be COLOR while the new page is B&W line art — that is FINE: convert the colors to line art faithfully (e.g. black cat → solid black-filled silhouette OR detailed line work showing the same proportions; fluffy fur texture preserved). MATCH: (1) recurring character designs exactly, (2) line-weight feel, (3) overall illustration polish. DO NOT copy the reference's composition or scene — generate the NEW scene described below — but the characters in it must be the SAME characters from the reference. KDP rejects books where cover characters differ from interior characters.\n\n${text}`;
    }
  }

  try {
    const image = await generateColoringImage(text, {
      aspectRatio,
      sourceImage: referenceImage,
      extraImages: chainImages.length ? chainImages : undefined,
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
