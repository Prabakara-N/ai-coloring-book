import { NextResponse } from "next/server";
import { generateColoringImage, SUPPORTED_ASPECTS, type AspectRatio } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  instruction?: string;
  sourceDataUrl?: string;
  aspectRatio?: AspectRatio;
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

  const editPrompt = `Edit the provided image as follows: ${instruction}. Keep the overall composition, subject identity, and clean line-art coloring-book style consistent with the original. Do not change the art style. Output as a full image (not a diff).`;

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
