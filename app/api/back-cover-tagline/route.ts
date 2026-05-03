/**
 * Back-cover tagline generator. The user picks one of the suggestions in
 * the refine modal and we render it onto the back cover via Gemini.
 *
 * Returns 4-5 short taglines (≤8 words each) tailored to the book's
 * title + theme. Cheap (gpt-5-mini, single text turn), runs only when the
 * user opens the back-cover refine panel or clicks "Suggest more".
 */

import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { OPENAI_TEXT_MODEL } from "@/lib/constants";
import { BACK_COVER_TAGLINE_SYSTEM_PROMPT } from "@/lib/prompts/back-cover-tagline";

export const runtime = "nodejs";
export const maxDuration = 30;

interface Body {
  /** Book title (e.g. "Wild Animals Coloring Book"). */
  bookTitle?: string;
  /** Cover scene description so the rewriter knows the vibe. Optional. */
  coverScene?: string;
  /** Audience tag (toddlers/kids/tweens). Brand is kid-focused. */
  audience?: string;
  /** Sample subjects from the book's interior pages — strongest signal
   * for book-specific taglines. e.g. ["sea otter","dolphin","whale"]. */
  pageSubjects?: string[];
  /**
   * Number of INTERIOR COLORING PAGES the buyer will get (i.e. items
   * the child can color). Excludes: front cover, "belongs to" nameplate,
   * and back cover. When provided the AI may mention it (e.g. "Twenty
   * pages…"). When omitted the tagline must NOT cite any number —
   * page-count claims should never be invented.
   */
  pageCount?: number;
  /** When > 0, push the generator to produce DIFFERENT taglines from
   * earlier batches. Increment client-side on "Suggest more". */
  variantSeed?: number;
}


const SCHEMA = z.object({
  taglines: z
    .array(z.string().min(8).max(130))
    .min(3)
    .max(5)
    .describe(
      "3-5 short tagline candidates of 10-12 words (1 or 2 short sentences), parent-first tone, calm & elegant.",
    ),
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

  const title = (body.bookTitle ?? "").trim() || "a kids' coloring book";
  const scene = (body.coverScene ?? "").trim();
  const audience = (body.audience ?? "").trim();
  const subjects = (body.pageSubjects ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
  const pageCount =
    typeof body.pageCount === "number" && body.pageCount > 0
      ? Math.floor(body.pageCount)
      : null;
  const variantNote =
    body.variantSeed && body.variantSeed > 0
      ? ` This is request #${body.variantSeed + 1} — your output MUST be MEANINGFULLY DIFFERENT from any prior batch you produced for this book. Pick fresh angles, fresh wording.`
      : "";
  const userPrompt =
    `Book: ${title}` +
    (audience ? `\nAudience (the child): ${audience}` : "") +
    (scene ? `\nCover scene: ${scene}` : "") +
    (subjects.length > 0
      ? `\nSubjects featured inside the book: ${subjects.join(", ")}`
      : "") +
    (pageCount !== null ? `\nPage count: ${pageCount}` : "") +
    `\n\nWrite 4 back-cover tagline candidates per the rules. Each tagline is 1-2 short sentences (10-12 words total, hard cap at 12). Speak to the PARENT first (warm, calm, evocative of quiet time together) while staying inviting to the child. Use concrete nouns from THIS book's subjects/scene — never generic "kids coloring book" language.${pageCount !== null ? ` You MAY mention the page count (${pageCount}) — spell as a word for ≤30, numerals for 31+.` : " Page count is NOT provided — do NOT mention any quantity, number, or 'twenty/thirty/many pages' phrasing."}${variantNote}`;

  try {
    const result = await generateObject({
      model: openai(OPENAI_TEXT_MODEL),
      system: BACK_COVER_TAGLINE_SYSTEM_PROMPT,
      schema: SCHEMA,
      prompt: userPrompt,
    });
    const taglines = result.object.taglines
      .map((t) => t.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
    if (taglines.length < 3) {
      return NextResponse.json(
        { error: "Tagline generation returned too few candidates." },
        { status: 502 },
      );
    }
    return NextResponse.json({ taglines });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Tagline generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
