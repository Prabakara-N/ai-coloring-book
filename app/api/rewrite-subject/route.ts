import { NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { OPENAI_TEXT_MODEL } from "@/lib/constants";
import { userInput } from "@/lib/prompts/sanitize";
import { REWRITE_SUBJECT_SYSTEM_PROMPT } from "@/lib/prompts/rewrite-subject";

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
      system: REWRITE_SUBJECT_SYSTEM_PROMPT,
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
