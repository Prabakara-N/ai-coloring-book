import { NextResponse } from "next/server";
import { generateColoringImage } from "@/lib/gemini";
import { findMockupStyle } from "@/lib/mockup-prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  styleId?: string;
  coverDataUrl?: string;
  /**
   * Optional second reference image. For "open-book" and "hand-coloring"
   * mockups this should be the user's first generated INTERIOR PAGE so
   * Gemini composites their actual content (not a hallucinated sample) into
   * the open-book/hand-coloring shot.
   */
  interiorDataUrl?: string;
  extraInstruction?: string;
}

function parseDataUrl(url: string): { mimeType: string; data: string } | null {
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

  const style = findMockupStyle(body.styleId ?? "");
  if (!style) {
    return NextResponse.json({ error: "Unknown mockup style." }, { status: 400 });
  }
  const parsed = body.coverDataUrl ? parseDataUrl(body.coverDataUrl) : null;
  if (!parsed) {
    return NextResponse.json(
      { error: "Cover image is required to generate a mockup." },
      { status: 400 }
    );
  }

  const interiorParsed = body.interiorDataUrl
    ? parseDataUrl(body.interiorDataUrl)
    : null;

  // For mockups that show inside-page content, instruct Gemini to use
  // image #1 (cover) for the cover and image #2 (interior page) literally
  // as the visible inside-page art.
  const usesInterior =
    interiorParsed && (style.id === "open-book" || style.id === "hand-coloring");

  const interiorInstruction = usesInterior
    ? " IMPORTANT: TWO REFERENCE IMAGES are provided. Image 1 is the BOOK COVER (use it for the cover/background reference only). Image 2 is the EXACT interior coloring-book page that must be rendered as the visible art on the open page (the right-hand page). Reproduce image 2 faithfully on the open page — do not invent or substitute different art. The interior art must look exactly like image 2."
    : "";

  const prompt =
    style.prompt +
    interiorInstruction +
    (body.extraInstruction?.trim()
      ? ` Additional direction: ${body.extraInstruction.trim()}`
      : "");

  try {
    const image = await generateColoringImage(prompt, {
      aspectRatio: style.aspect,
      sourceImage: parsed,
      extraImages: usesInterior && interiorParsed ? [interiorParsed] : undefined,
    });
    return NextResponse.json({
      mimeType: image.mimeType,
      data: image.data,
      dataUrl: `data:${image.mimeType};base64,${image.data}`,
      styleId: style.id,
      aspect: style.aspect,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Mockup generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
