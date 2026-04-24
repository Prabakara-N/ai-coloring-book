import { NextResponse } from "next/server";
import { generateColoringImage } from "@/lib/gemini";
import { findMockupStyle } from "@/lib/mockup-prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  styleId?: string;
  coverDataUrl?: string;
  extraInstruction?: string;
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

  const prompt =
    style.prompt +
    (body.extraInstruction?.trim()
      ? ` Additional direction: ${body.extraInstruction.trim()}`
      : "");

  try {
    const image = await generateColoringImage(prompt, {
      aspectRatio: style.aspect,
      sourceImage: parsed,
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
