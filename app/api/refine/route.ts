import { NextResponse } from "next/server";
import { generateColoringImage, SUPPORTED_ASPECTS, type AspectRatio } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

type RefineContext = "page" | "cover" | "back-cover" | "custom";

interface Body {
  instruction?: string;
  sourceDataUrl?: string;
  aspectRatio?: AspectRatio;
  /**
   * What kind of image is being refined. Drives which guardrails are
   * injected into the edit prompt so Gemini doesn't violate the original
   * design rules (e.g. drawing illustrations on a back cover that should be
   * minimal, or adding gray to a B&W coloring page).
   */
  context?: RefineContext;
}

function parseDataUrl(url: string): { mimeType: string; data: string } | null {
  // String-based parsing — regex on multi-MB base64 caused V8 stack overflow.
  if (!url.startsWith("data:")) return null;
  const sep = url.indexOf(";base64,");
  if (sep < 0) return null;
  const mimeType = url.slice(5, sep);
  const data = url.slice(sep + 8);
  if (!mimeType || !data) return null;
  return { mimeType, data };
}

const CONTEXT_GUARDRAILS: Record<RefineContext, string> = {
  page:
    "🎨 PAGE RULES (must remain): Pure 100% black-and-white line art, no color, no shading, no gray. All shapes enclosed by clean continuous outlines. NO text, NO numbers, NO page indicators (e.g. 1/2 or 2/3 — never add these), NO watermarks. NO border drawn around the page (the printer adds one separately). Keep anatomy correct.",
  cover:
    "🎨 FRONT COVER RULES (must remain): Keep the existing book TITLE text exactly as it appears (do not change spelling, font, or color). Keep the overall composition and the main characters. Do NOT add page numbers, bar codes, version indicators, or any text other than what's already on the cover. Keep colors vibrant.",
  "back-cover":
    "🎨 BACK COVER RULES (must remain): This is a MINIMAL back cover. STRICT — DO NOT add any of these even if they seem related to the book: NO illustrations, NO characters, NO animals, NO objects, NO scenes, NO landscapes, NO decorative motifs, NO patterns. NO page numbers (no '2/3', no page indicators of any kind). NO additional text beyond what is already there (no extra paragraphs, no new headlines). Keep the layout structure: a solid colored background + ONE white tagline box centered with text inside + ONE empty white barcode rectangle in the bottom-right. Both rectangles have crisp borders and white interiors. The tagline text inside the box is dark BLACK (not pink, not pastel) for readability.",
  custom:
    "Keep the original art style and composition consistent. Output as a full new image, not a diff.",
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const instruction = (body.instruction ?? "").trim();
  if (!instruction) {
    return NextResponse.json(
      { error: "Describe what to change (e.g. 'remove the sun, add a decorative border')." },
      { status: 400 }
    );
  }
  if (instruction.length > 2000) {
    return NextResponse.json(
      { error: "Instruction too long (max 2000 chars)." },
      { status: 400 }
    );
  }
  const parsed = body.sourceDataUrl ? parseDataUrl(body.sourceDataUrl) : null;
  if (!parsed) {
    return NextResponse.json(
      { error: "Missing or invalid source image." },
      { status: 400 }
    );
  }

  const aspectRatio: AspectRatio =
    body.aspectRatio && SUPPORTED_ASPECTS.includes(body.aspectRatio)
      ? body.aspectRatio
      : "1:1";

  const context: RefineContext =
    body.context && body.context in CONTEXT_GUARDRAILS
      ? body.context
      : "custom";
  const guardrails = CONTEXT_GUARDRAILS[context];

  const editPrompt = `Edit the provided image as follows: ${instruction}.

Keep the overall composition and identity consistent with the original. Output as a full image (not a diff).

${guardrails}`;

  try {
    const image = await generateColoringImage(editPrompt, {
      aspectRatio,
      sourceImage: parsed,
    });
    return NextResponse.json({
      mimeType: image.mimeType,
      data: image.data,
      dataUrl: `data:${image.mimeType};base64,${image.data}`,
      prompt: editPrompt,
      aspectRatio,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refinement failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
