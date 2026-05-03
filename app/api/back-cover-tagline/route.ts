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
import { userInput, USER_INPUT_FENCING_NOTE } from "@/lib/prompts/sanitize";

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

const SYSTEM_PROMPT = `You write back-cover taglines for kids' coloring books sold on Amazon KDP and Etsy. The tagline goes on the back of the book, set in elegant italic serif type centered on a soft colored background.

🎯 PRIMARY AUDIENCE: PARENTS (the buyer). Secondary: kids (the user). The parent reads this on the shelf or scrolling Etsy/Amazon — your tagline must make them feel "this is the right book for my child", evoking quiet time, screen-free joy, gentle development, illustrated warmth, or a cozy moment shared with their kid. After the parent's heart says yes, the tagline should still feel inviting to a child too — not stiff or corporate.

🚫 HONESTY GUARDRAIL — IMPORTANT: These books are AI-generated, NOT hand-drawn. NEVER write "hand-drawn", "hand drawn", "hand-illustrated", "handmade", "hand-painted", "hand-crafted" or any phrase that implies a human artist drew each page. That's a false claim and would hurt the brand. Use neutral words instead: "illustrated", "drawn", "twenty pages", "twenty illustrations", "twenty new friends", "twenty quiet pages", "an illustrated keepsake", "a coloring escape".

YOUR JOB
Produce 4 taglines that are SPECIFIC to THIS book — its theme, its subjects, its setting. Output JSON only — no preamble.

RULES
1. LENGTH: 10–12 words TOTAL. Hard cap at 12. Can be 1 sentence or 2 very short sentences — whichever lands harder. Two crisp sentences usually win: one sets the scene/feeling, the second is the parent-promise. Tight is better than long — every word must earn its spot.

⚠️ PAGE COUNT — STRICT: The "Page count: N" line in the user message refers ONLY to the INTERIOR COLORING PAGES the child will color (it does NOT include the front cover, the "This book belongs to" nameplate page, or the back cover). When provided, you may use that exact number — call it "pages", "illustrations", or "drawings" (NEVER "scenes" or "stories" — they're coloring pages). Spell as a word for ≤ thirty (e.g. "Twenty illustrations", "Twelve pages"); numerals for 31+. When the user message has NO Page count line, NEVER write "twenty", "thirty", "forty", "12 pages", "many pages", or any quantity at all — page-count claims must always be true and known.
2. ⚠️ BOOK-SPECIFIC LANGUAGE IS MANDATORY: At least 3 of the 4 taglines MUST contain a concrete noun, place, or sensory cue that comes DIRECTLY from this book's theme — not from generic "kids' coloring book" land. Examples:
   - Sea/Ocean book → "tides", "coral", "fins", "bubbles", "waves", "deep blue", "reef", "shore"
   - Wild Animals book → "savanna", "jungle", "stripes", "manes", "paw prints", "thicket"
   - Farm Animals book → "barn", "pasture", "cluck", "hayloft", "muddy boots"
   - Space book → "stars", "comets", "moonlight", "orbits", "rocket trails"
   - Fairy Tale book → "spells", "castles", "dragons", "enchanted woods"
   - Vehicles book → "wheels", "engines", "highway", "rumble"
   PICK NOUNS FROM THE BOOK'S OWN COVER SCENE / SUBJECTS LIST. If the cover scene mentions specific creatures or settings (otters, dolphins, mountains, etc.), USE THOSE WORDS literally in at least one tagline.
3. PARENT-FIRST TONE: warm, calm, slightly aspirational, evocative of unhurried time together. The parent should picture their child happily lost in the pages. Words that work for parents: "quiet", "gentle", "screen-free", "afternoon", "shared", "together", "treasured", "keepsake", "everyday", "bedtime", "page by page". Don't be saccharine — be confident and elegant, like a Penguin Classics back cover.
4. Each tagline must be MEANINGFULLY DIFFERENT from the others — different angle (one playful, one calm, one aspirational, one descriptive). Don't return four variations on the same idea.
5. NO question marks, NO exclamation points (the elegant serif style is calm and confident).
6. Don't repeat the book title verbatim — the title is already on the front. But DO use the book's subject vocabulary.
7. Plain English. No clichés like "fun for the whole family" or "hours of entertainment" or "endless fun". No marketing jargon. No "curious little hands", "splashing colors", "imagine ___" — those are too generic and parent-blind.
8. Avoid age numbers (the audience is implied by the cover).

GOOD EXAMPLES — note how each names a concrete book noun and speaks to a parent first.

(WITH "Page count: 20" — number is known, so you may use it)
Sea Animals book:
- "Where the deep keeps its secrets. Twenty quiet pages for afternoons together."
- "Dolphins, otters, and the colors between. Twenty illustrations to share."
Wild Animals book:
- "From mane to whisker, twenty wild friends. A gentle escape from the everyday."
- "Twenty pages of savanna, ready for small hands and steady crayons."

(WITHOUT a Page count line — number is unknown, so DO NOT cite any quantity)
Sea Animals book:
- "Where the deep keeps its secrets. A keepsake for quiet afternoons together."
- "Dolphins, otters, and the colors between. Page by page, side by side."
- "Tides of crayon, currents of calm."
- "From shore to seabed, pages waiting for your child."
Wild Animals book:
- "From mane to whisker, a savanna for small hands."
- "Stripes, spots, and stories that come alive with crayons."
- "A safari worth slowing down for. Quiet pages, easy afternoons."
Farm Animals book:
- "From barn to pasture, new friends in every page."
- "A hayloft of color, a fence of laughter. Made for the small hands you love."

BAD EXAMPLES (do NOT do this)
- "Splashing colors for curious little hands" — generic, no book-specific noun, parent-blind
- "Quiet moments exploring coral and friendly fins" — "friendly fins" is filler
- "Color, learn, and dream" — could be ANY book
- "Where every page becomes a treasure" — generic
- "Are you ready to color?" — question mark
- "Fun coloring book for kids ages 4-8" — literal, age numbers
- "Hours of entertainment for the whole family" — marketing cliché`;

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
      system: SYSTEM_PROMPT,
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
