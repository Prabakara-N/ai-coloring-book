import { NextResponse } from "next/server";
import { generateColoringImage, SUPPORTED_ASPECTS, type AspectRatio } from "@/lib/gemini";
import {
  MASTER_PROMPT_TEMPLATE,
  REFERENCE_LED_PROMPT_TEMPLATE,
  COLOR_COVER_PROMPT_TEMPLATE,
  BACK_COVER_PROMPT_TEMPLATE,
  findCategory,
  type AgeRange,
  type Detail,
  type Background,
  type CoverStyle,
  type CoverBorder,
} from "@/lib/prompts";
import { rateColoringPage, type QualityScore } from "@/lib/quality-gate";
import { extractStyleFromReference } from "@/lib/style-extractor";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  mode?: "subject" | "raw" | "cover" | "back-cover";
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
  // Per-prompt variation (so each page in a book differs)
  variantSeed?: string;
  // Optional reference image — used as style/composition inspiration
  referenceDataUrl?: string;
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
    });
    aspectRatio =
      body.aspectRatio && SUPPORTED_ASPECTS.includes(body.aspectRatio)
        ? body.aspectRatio
        : "3:4";
  }

  // Gemini 2.5 Flash Image easily handles 32k+ tokens. Our wrapped master
  // prompt + story-mode scene descriptors with inline character locks runs
  // ~4-5k chars. 8000 leaves comfortable headroom while still rejecting
  // obviously runaway/spammy inputs.
  if (text.length > 8000) {
    return NextResponse.json({ error: "Prompt too long (max 8000 chars)." }, { status: 400 });
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

  try {
    const image = await generateColoringImage(text, {
      aspectRatio,
      sourceImage: referenceImage,
    });
    const dataUrl = `data:${image.mimeType};base64,${image.data}`;

    let quality: QualityScore | null = null;
    const wantsGate =
      body.qualityGate !== false &&
      mode !== "raw" &&
      !!process.env.OPENAI_API_KEY;
    if (wantsGate) {
      try {
        const isCover = mode === "cover" || mode === "back-cover";
        const expected = isCover
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
