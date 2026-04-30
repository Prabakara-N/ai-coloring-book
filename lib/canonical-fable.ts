/**
 * Look up the canonical plot of a classic fable / school-textbook story
 * via Perplexity Sonar (live web grounding).
 *
 * Used by Story Mode in book-chat.ts when the model isn't confident enough
 * about a story it sees in user input — especially regional fables
 * (Panchatantra, Jataka, Hitopadesha) that have multiple retellings.
 *
 * The returned plain-prose summary is fed back to the OpenAI chat as a
 * tool-result, and the model uses it as ground truth when planning scenes.
 */

import { callPerplexity } from "@/lib/perplexity";

const SYSTEM_PROMPT = `You are a children's-literature researcher.

Given a classic fable / moral story / fairy tale title, return the canonical plot summary in under 220 words. Cover, in order:

1. SOURCE — which collection/origin the story comes from (Aesop's Fables, Panchatantra, Jataka tales, Hitopadesha, Grimm's, Hans Christian Andersen, Mother Goose, Bible parable, etc.). If multiple regional versions exist (very common for Panchatantra/Jataka), name the most widely-told version and note 1-2 alternative names if any.
2. CHARACTERS — main characters with one short visual descriptor each (species, size, key trait). 1-3 characters max.
3. SETTING — one short line of where the story takes place.
4. PLOT BEATS — 3-6 numbered beats in story order. Each beat is one sentence.
5. MORAL — the lesson, in one short line (skip if it's a fairy tale with no explicit moral).

Rules:
- Plain prose, no markdown headings, no bold, no code fences.
- If the title doesn't match a known fable, say so explicitly: "Not a recognized canonical fable — likely original or very obscure."
- Do not embellish. Stick to canonical details.
- Keep total length under 220 words.`;

export interface CanonicalPlotResult {
  /** Plot summary in plain prose, ready to feed back into the chat as ground truth. */
  summary: string;
  /** Live web sources Perplexity cited (if any). */
  citations?: string[];
}

export async function lookupCanonicalPlot(
  title: string,
): Promise<CanonicalPlotResult> {
  const cleaned = title.trim().slice(0, 200);
  if (!cleaned) {
    throw new Error("Empty fable title.");
  }

  const res = await callPerplexity({
    system: SYSTEM_PROMPT,
    user: `Story title: "${cleaned}".\n\nReturn the canonical plot summary.`,
    temperature: 0.2,
  });

  return {
    summary: res.text.trim(),
    citations: res.citations,
  };
}
