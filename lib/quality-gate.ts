/**
 * Vision-based quality gate for generated coloring pages.
 *
 * Sends the generated image (data URL) to GPT-4o-mini Vision and asks it to
 * score the page on KDP-coloring-book quality criteria. Returns a numeric
 * score (1-10) and a short reason. Calling code can decide whether to keep
 * the page or queue a regeneration.
 *
 * Cost: ~$0.0001 per call with gpt-4o-mini → ~$0.002 for a 20-page book.
 */

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const MODEL_ID = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";

const SCORE_SCHEMA = z.object({
  score: z
    .number()
    .min(1)
    .max(10)
    .describe("Overall quality score from 1 (terrible) to 10 (perfect)."),
  pure_bw: z.boolean().describe("Pure black-and-white line art with no gray, no color, no shading."),
  closed_outlines: z
    .boolean()
    .describe("All shapes are enclosed by clean continuous outlines — kid can color inside without color spilling out."),
  on_subject: z
    .boolean()
    .describe("The image clearly shows the requested subject."),
  subject_size_ok: z
    .boolean()
    .describe(
      "The main subject is large and dominant — occupies at least 60% of the visible page area. False if the subject looks small, lost in scenery, or overshadowed by background.",
    ),
  anatomy_ok: z
    .boolean()
    .describe("Anatomy is correct — no extra/missing/fused limbs, no asymmetric face."),
  no_text: z
    .boolean()
    .describe("Image contains no text, letters, numbers, watermarks, or signatures."),
  no_border: z
    .boolean()
    .describe("Image has no border, frame, or rectangle drawn around the page."),
  reason: z
    .string()
    .max(200)
    .describe(
      "One short sentence explaining the score. If score < 7, name the specific issue (e.g. 'subject too small (~40% of page)', 'fused limbs on left arm', 'gray shading on belly', 'extra eye').",
    ),
});

export type QualityScore = z.infer<typeof SCORE_SCHEMA>;

export interface QualityGateInput {
  /** data URL like "data:image/png;base64,..." OR base64 string. */
  imageDataUrl: string;
  /** What the page was supposed to depict (passed to the rater for on-subject check). */
  expectedSubject: string;
  /** Whether this is a cover (different rules) vs a coloring page. */
  isCover?: boolean;
}

const PAGE_SYSTEM = `You are a strict quality reviewer for a premium Amazon KDP children's coloring book.

You are reviewing ONE page that should meet ALL of these criteria:
- Pure black-and-white line art (no gray, no color, no shading, no halftones)
- All shapes enclosed by clean continuous outlines so a child can color inside without spillover
- Single clear main subject, recognizable
- SUBJECT SIZE — the main subject MUST occupy at LEAST 60% of the page. Be strict here: if the subject looks small, lost in scenery, or overshadowed by background elements, mark subject_size_ok=false. Visual consistency across pages depends on every page having a similarly-sized dominant subject.
- No text, letters, numbers, watermarks, signatures, or page borders
- Correct anatomy: right number of legs/arms/eyes/ears for the species, symmetric face, nothing fused or duplicated
- Cartoon style, friendly happy expression
- Consistent line weight, no broken lines, no double lines

Be honest and strict. KDP buyers return books for the smallest visual flaw, and inconsistent subject sizes across pages are an obvious red flag.

Return your structured assessment.`;

const COVER_SYSTEM = `You are a strict quality reviewer for a premium Amazon KDP coloring book COVER.

This is the COVER (not an interior page), so it should be:
- Fully colored with vibrant flat cartoon palette (no gradients, no realistic shading)
- Has the book title text rendered clearly with no spelling errors
- Shows 2-4 main characters/objects from the book together
- Background fits the theme naturally (outdoor scene → sky/grass; space → stars; ocean → water)
- Decorative border frame is OK on the cover
- No watermark, no URL, no extra marketing text besides the title
- Cheerful, friendly, KDP-buyer-friendly look

Note: the rules "pure_bw" and "no_text" do NOT apply to covers — set them to true if the cover follows COVER rules (colored, has only the title text). Only flag those false if the cover violates its own cover rules (e.g., has extra non-title text, or is unintentionally B&W).

For covers, "subject_size_ok" means the main characters/objects are prominent and visible — not lost behind the title or background.

Return your structured assessment.`;

export async function rateColoringPage(
  input: QualityGateInput,
): Promise<QualityScore> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const dataUrl = input.imageDataUrl.startsWith("data:")
    ? input.imageDataUrl
    : `data:image/png;base64,${input.imageDataUrl}`;

  const system = input.isCover ? COVER_SYSTEM : PAGE_SYSTEM;
  const userText = input.isCover
    ? `Rate this coloring book COVER. Expected to depict: "${input.expectedSubject}".`
    : `Rate this coloring book PAGE. Expected subject: "${input.expectedSubject}".`;

  const result = await generateObject({
    model: openai(MODEL_ID),
    system,
    schema: SCORE_SCHEMA,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image", image: dataUrl },
        ],
      },
    ],
    temperature: 0.1,
  });

  return result.object;
}

/** Convenience: returns true if the page passes the default quality bar. */
export function isAcceptable(score: QualityScore, threshold = 7): boolean {
  return score.score >= threshold;
}
