import { NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { OPENAI_TEXT_MODEL } from "@/lib/constants";
import { userInput, USER_INPUT_FENCING_NOTE } from "@/lib/prompts/sanitize";

export const runtime = "nodejs";
export const maxDuration = 30;

interface Body {
  /** Original page subject text the user wrote (or Sparky planned). */
  subject?: string;
  /** Why Gemini refused — categorized error message we want to defang. */
  errorHint?: string;
  /** Optional: mark this as the second / third request to push the rewriter
   * to produce a DIFFERENT alternative than what it already returned. */
  variantSeed?: number;
  /** Optional book context — without this the rewriter sees one page in
   * isolation and can accidentally change the protagonist (e.g. swap a
   * lion cub for a fox kit). Passing the lock + cover scene tells it
   * which characters are the book's PROTAGONISTS that must be preserved
   * verbatim across all pages. */
  bookTitle?: string;
  coverScene?: string;
  characterLock?: string;
}

const SYSTEM_PROMPT = `You rewrite kids' coloring-book page subjects so Google Gemini will accept them. The original subject was REJECTED — likely because it (a) too closely resembles a copyrighted work like Lion King, Frozen, Toy Story, Cars, Finding Nemo, Moana, Encanto, Disney/Pixar, etc., (b) contains scary / violent / unsafe wording, or (c) describes a child being held / dropped / endangered.

${USER_INPUT_FENCING_NOTE}

YOUR JOB
Produce ONE rewritten subject for ONE page in a multi-page book. Output only the rewritten text — no preamble, no quotes, no commentary, no JSON.

🚫 ABSOLUTE RULE — PROTECT THE BOOK'S PROTAGONIST
A multi-page book has 1-3 RECURRING PROTAGONISTS that appear on most pages. You MUST keep these protagonists EXACTLY as the original subject names them. NEVER swap "lion cub" for "fox kit", NEVER swap "young dragon" for "young bird", NEVER change the protagonist's species, age stage, or core identity. Doing so destroys character continuity across the book — page 7 with a fox makes no sense if pages 1-6 had a lion.

If the book context (provided below) lists the protagonists, those are the SACRED set. Only species OUTSIDE the protagonist set may be swapped.

If no book context is given: assume the FIRST animal/character mentioned in the subject is the protagonist. Do NOT change that character. Only swap secondary characters / scene context.

YOUR ACTUAL OPTIONS — apply minimally
1. Swap SECONDARY characters that pattern-match a copyrighted combo:
   - meerkat + warthog (keep the lion!) → mongoose + forest pig
   - reindeer (keep the queen) → mountain goat
   - clownfish (keep the storyline) → striped damselfish
   - talking cars (keep the protagonist car if it's the protagonist) → simple wooden carts as background
2. Swap iconic SETTINGS only:
   - cliff/Pride Rock → sunny rock outcrop
   - ice castle → crystal cave
   - jungle oasis → flower meadow
   - presented over Pride Rock → presented on a rocky hill
3. Reword iconic POSES only:
   - held up high → presented gently
   - lying on backs looking at stars → sitting around a small campfire (this swaps the action, NOT the characters)
4. Soften scary / violent / unsafe wording:
   - scary → silly; shadowy → dim; scarred → ruffled; plotting → watching; stampede → running herd; lightning → soft clouds; cliff drop → step on a hill.

OUTPUT RULES
1. Same scene, mood, character relationships, and visual composition. Same characters in same roles.
2. Same age-appropriate tone (kids 3–10), kid-friendly, cheerful.
3. Same length as the original — don't expand into a paragraph.
4. Pure B&W line art friendly: no color words, no shading, no text, no watermarks.
5. Never use named brand characters, real place names, real people, or trademarked terms.

GOOD EXAMPLE — minimum-change rewrite that preserves the protagonist
Original: "The cub, the meerkat, and the warthog dancing happily together in a lush green jungle oasis with waterfalls and giant leaves all around."
Output: "A lion cub, a small mongoose, and a round forest pig dancing happily together in a sunny meadow with tall flowers and a small stream all around."
(Kept: lion cub. Swapped: meerkat → mongoose, warthog → forest pig, jungle oasis → meadow.)

GOOD EXAMPLE — preserves the protagonist even when the original villain has IP fingerprint
Original: "The scarred lion plotting in a shadowy cave with three sneaky hyenas."
Output: "A ruffled lion watching quietly from inside a rocky cave, with three curious jackals nearby."
(Kept: lion. Swapped: scarred → ruffled, plotting → watching, shadowy → rocky, hyenas → jackals.)

BAD EXAMPLE — DO NOT DO THIS (changes the protagonist)
Original: "The cub, the meerkat, and the warthog lying on their backs at night, looking up at thousands of stars."
WRONG output: "A young fox kit, a curious raccoon, and a sleepy rabbit counting fireflies together in a moonlit meadow."
(All three characters are now wrong — the book's lion-cub protagonist is gone.)
RIGHT output: "A lion cub, a small mongoose, and a round forest pig sitting around a small campfire at night, telling stories under a few stars."`;

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const subject = (body.subject ?? "").trim();
  if (!subject || subject.length < 5) {
    return NextResponse.json(
      { error: "subject must be a non-empty string." },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const variantNote =
    body.variantSeed && body.variantSeed > 1
      ? ` (alt #${body.variantSeed} — this rewrite MUST be MEANINGFULLY DIFFERENT from any earlier alternative for the same subject; choose a different swap path for the SECONDARY characters or setting, but STILL keep the protagonist unchanged)`
      : "";

  const contextLines: string[] = [];
  if (body.bookTitle) {
    contextLines.push(`Book title: ${userInput(body.bookTitle)}`);
  }
  if (body.coverScene) {
    contextLines.push(
      `Cover scene (the book's main characters appear here): ${userInput(body.coverScene)}`,
    );
  }
  if (body.characterLock) {
    contextLines.push(
      `Protagonists (must be preserved verbatim across all pages): ${userInput(body.characterLock)}`,
    );
  }
  const contextBlock =
    contextLines.length > 0
      ? `\n\nBOOK CONTEXT (read this BEFORE rewriting):\n${contextLines.join("\n\n")}`
      : "";

  const fencedSubject = userInput(subject);
  const userPrompt = body.errorHint
    ? `Rejected subject:\n${fencedSubject}${contextBlock}\n\nGemini's signal: ${userInput(body.errorHint)}${variantNote}\n\nRewrite the subject so it passes — same scene, same protagonists, defanged wording.`
    : `Rejected subject:\n${fencedSubject}${contextBlock}${variantNote}\n\nRewrite the subject — same scene, same protagonists, IP/safety-safe wording.`;

  try {
    const result = await generateText({
      model: openai(OPENAI_TEXT_MODEL),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    });
    const alternative = result.text
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/^Rewrite:\s*/i, "")
      .replace(/^Rewritten subject:\s*/i, "")
      .trim();
    if (!alternative || alternative.length < 10) {
      return NextResponse.json(
        { error: "Rewrite failed — empty response." },
        { status: 502 },
      );
    }
    return NextResponse.json({ alternative });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Rewrite failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
