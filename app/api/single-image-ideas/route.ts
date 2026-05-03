import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { OPENAI_TEXT_MODEL } from "@/lib/constants";
import { SINGLE_IMAGE_IDEAS_SYSTEM_PROMPT } from "@/lib/prompts/single-image-ideas";

export const runtime = "nodejs";
export const maxDuration = 30;

interface Body {
  category?: string;
  variantSeed?: number;
}

const SCHEMA = z.object({
  ideas: z
    .array(z.string().min(20).max(220))
    .min(4)
    .max(6)
    .describe("4-6 single-sentence image prompts matching the requested category."),
});

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const category = (body.category ?? "generic").trim().toLowerCase();
  const variantNote =
    body.variantSeed && body.variantSeed > 0
      ? ` This is request #${body.variantSeed + 1} — output 5 NEW prompts MEANINGFULLY DIFFERENT from any prior batch.`
      : "";

  try {
    const result = await generateObject({
      model: openai(OPENAI_TEXT_MODEL),
      system: SINGLE_IMAGE_IDEAS_SYSTEM_PROMPT,
      schema: SCHEMA,
      prompt: `Category: ${category}\n\nReturn 5 prompts.${variantNote}`,
    });
    return NextResponse.json({ ideas: result.object.ideas });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Idea fetch failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
