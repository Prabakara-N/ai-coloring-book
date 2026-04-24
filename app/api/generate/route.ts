import { NextResponse } from "next/server";
import { generateColoringImage, SUPPORTED_ASPECTS, type AspectRatio } from "@/lib/gemini";
import {
  MASTER_PROMPT_TEMPLATE,
  COLOR_COVER_PROMPT_TEMPLATE,
  findCategory,
  type AgeRange,
  type Detail,
  type Background,
} from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  mode?: "subject" | "raw" | "cover";
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
  // Per-prompt variation (so each page in a book differs)
  variantSeed?: string;
  // Optional reference image — used as style/composition inspiration
  referenceDataUrl?: string;
}

function parseDataUrl(url: string): { mimeType: string; data: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(url);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
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
    text = COLOR_COVER_PROMPT_TEMPLATE({ title, scene });
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

  if (text.length > 4000) {
    return NextResponse.json({ error: "Prompt too long (max 4000 chars)." }, { status: 400 });
  }

  let referenceImage: { mimeType: string; data: string } | undefined;
  if (body.referenceDataUrl) {
    const parsed = parseDataUrl(body.referenceDataUrl);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid reference image data URL." },
        { status: 400 }
      );
    }
    referenceImage = parsed;
    // Prepend a clear instruction so Gemini uses it as reference, not as the image to edit
    text = `You are given a reference image. Use it only as visual inspiration for style, line weight, color palette, and overall composition — NOT as the subject. Now generate a completely new illustration following these instructions: ${text}`;
  }

  try {
    const image = await generateColoringImage(text, {
      aspectRatio,
      sourceImage: referenceImage,
    });
    return NextResponse.json({
      mimeType: image.mimeType,
      data: image.data,
      dataUrl: `data:${image.mimeType};base64,${image.data}`,
      prompt: text,
      aspectRatio,
      mode,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
