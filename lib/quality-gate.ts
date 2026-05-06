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
import { OPENAI_VISION_MODEL } from "@/lib/constants";

const MODEL_ID = OPENAI_VISION_MODEL;

const SCORE_SCHEMA = z.object({
  score: z
    .number()
    .min(1)
    .max(10)
    .describe("Overall quality score from 1 (terrible) to 10 (perfect)."),
  pure_bw: z
    .boolean()
    .describe(
      "Pure black-and-white LINE ART. True only when (a) the page is white background with black outlines, (b) no solid black fills appear on the subject (no all-black body, leg, paw, mane, hair, eye-area filled solid black), (c) no solid black fills appear on the sky, ground, or any prop, (d) no gray shading, halftones, hatching, stippling, or cross-hatch, (e) the page is NOT a black/dark background with white-line drawings (any inverted negative-space rendering = false, even for space/night scenes). False if ANY of those are violated. The reason field must name which one (e.g., 'subject's body filled solid black', 'page background is black with white stars instead of white background with black outlines', 'gray shading on dinosaur belly').",
    ),
  closed_outlines: z
    .boolean()
    .describe(
      "All shapes are enclosed by clean continuous outlines — kid can color inside without color spilling out.",
    ),
  on_subject: z
    .boolean()
    .describe("The image clearly shows the requested subject."),
  subject_size_ok: z
    .boolean()
    .describe(
      "The main subject is dominant — occupies 50-65% of the page area, large and instantly recognizable. False if (a) the subject looks SMALL/lost in white space (page has empty white margin around the scene — fail), (b) the subject is overshadowed by a wall of busy background, or (c) the page is OVER-CROWDED with scattered tiny decorations (sparkles, sticker dots, random hearts/stars/butterflies that don't belong) that drown the subject.",
    ),
  anatomy_ok: z
    .boolean()
    .describe(
      "Anatomy is correct, complete, and species-appropriate. KDP REJECTS books with anatomy flaws — be merciless. Mark FALSE for ANY of: (1) extra/missing/fused limbs, eyes, ears, tails, wings; (2) asymmetric or warped face; (3) features SWAPPED BETWEEN SPECIES (mouse/rat with long fluffy lion-style tail, dog with cat ears, bird with mammal whiskers); (4) inanimate object given a cartoon face (vehicle, sun, cloud, fruit) with WRONG NUMBER of eyes (must be exactly TWO matched eyes), uneven/mismatched eyes, off-center mouth, missing mouth, or smudged/distorted face. A car must have EXACTLY 2 eyes (not 1, not 3) placed symmetrically on the front. Reject anything that wouldn't pass an Amazon KDP human reviewer.",
    ),
  size_consistency_ok: z
    .boolean()
    .describe(
      "If multiple characters appear, their relative sizes are believable for the species (a mouse should be much smaller than a lion, a bird smaller than a cow, etc.). False if a small species appears unnaturally large/fat or a large species appears tiny.",
    ),
  no_text: z
    .boolean()
    .describe(
      "Image contains no text, letters, numbers, watermarks, or signatures.",
    ),
  no_ai_border: z
    .boolean()
    .describe(
      "TRUE if the AI did NOT draw any rectangular border / page outline / printer's frame on the page (it should be borderless — the printer's border is added later as a vector layer in post-processing). FALSE if you see ANY rectangular outline, frame, or page border drawn anywhere on the page — even a faint one — because that would create a double border at print time.",
    ),
  reason: z
    .string()
    .max(220)
    .describe(
      "One short sentence explaining the score. If score < 7 OR no_ai_border failed, name the SPECIFIC issue (e.g. 'subject too small (~40% of page)', 'fused limbs on left arm', 'gray shading on belly', 'AI drew a rectangular border at the page edge', 'wrong-species fluffy tail on a mouse'). Be specific — the auto-retry loop uses this exact text as an improvement hint, so call out the dimension that failed.",
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
- No text, letters, numbers, watermarks, signatures
- NO BORDER (strict — the AI should NOT draw a border): the page must be BORDERLESS from the AI's side. The printer's rectangular border is added later as a vector layer in post-processing, so any AI-drawn border creates a DOUBLE border on the printed page. Mark no_ai_border=false if you see ANY rectangular outline, page frame, printer's mark, decorative scrollwork frame, or thin black rectangle at ANY inset from the page edge — even a faint one. Mark no_ai_border=true only when the page is completely free of any border / frame / outline at the edges. Common AI mistake: drawing a thin black rectangle at 3-5% inset out of "coloring book convention" — that is a violation here. The reason field MUST name the violation specifically when no_ai_border fails ("AI drew a rectangular border at the page edge", "decorative frame around the artwork", etc.) so the auto-retry can target the fix.
- Correct anatomy: right number of legs/arms/eyes/ears for the species, symmetric face, nothing fused or duplicated
- SPECIES INTEGRITY: features must match the actual species. A mouse/rat MUST NOT have a long fluffy lion-style tail (rodent tails are thin and string-like). A bird must not have mammal whiskers. A dog must not have cat-shape ears. Mark anatomy_ok=false for any wrong-species feature swap.
- ANTHROPOMORPHIC FACES (vehicles/objects with cartoon faces): the face must have EXACTLY TWO MATCHED EYES placed symmetrically (not 1, not 3, not asymmetric). Mouth must be present, centered, and clearly drawn. Mark anatomy_ok=false if a vehicle has wrong eye count, uneven eyes, or distorted/missing/off-center mouth. KDP rejects books with malformed character faces.
- THEMATIC FIT: every background element must logically belong with the subject. Mark subject_size_ok=false if you spot OUT-OF-THEME elements (e.g. coral on a farm scene, sun in an underwater scene, butterflies on a space scene, jungle leaves on a city/vehicle page, fish in a forest). Wrong-environment elements destroy KDP credibility.
- COMPOSITION DENSITY: the scene should fill the canvas with 4-6 well-chosen themed elements + the subject — NOT empty white space around the subject AND NOT over-crowded with dozens of scattered tiny stickers (random sparkles, ornaments, hearts, stars). Mark subject_size_ok=false if EITHER end of that spectrum applies.
- SIZE CONSISTENCY: when multiple characters appear, their relative sizes must be believable for the species. A mouse must look much smaller than a lion (NOT chubby/fat), a bird smaller than a cow. Mark size_consistency_ok=false for size mismatches.
- Cartoon style, friendly happy expression
- Consistent line weight, no broken lines, no double lines

Be honest and strict. KDP buyers return books for the smallest visual flaw — wrong-species features and size mismatches between characters are obvious red flags that destroy the book's credibility.

Return your structured assessment.`;

const COVER_SYSTEM = `You are a strict quality reviewer for a premium Amazon KDP coloring book COVER.

This is the COVER (not an interior page), so it should be:
- Fully colored with vibrant flat cartoon palette (no gradients, no realistic shading)
- Has the book title text rendered clearly with no spelling errors
- Shows 2-4 main characters/objects from the book together
- Background fits the theme naturally (outdoor scene → sky/grass; space → stars; ocean → water)
- Decorative border frame is OK on the cover (covers can have a decorative ornamental frame as part of the art)
- No watermark, no URL, no extra marketing text besides the title
- Cheerful, friendly, KDP-buyer-friendly look

Note: the rules "pure_bw", "no_text", and "no_ai_border" do NOT apply to covers — set them all to true if the cover follows COVER rules (colored, has only the title text, full-bleed). Only flag those false if the cover violates its own cover rules (e.g., has extra non-title text, or is unintentionally B&W). Covers don't need an internal printer border — the cover-wrap math handles the print bleed at production time.

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
  });

  return result.object;
}

/** Convenience: returns true if the page passes the default quality bar. */
export function isAcceptable(score: QualityScore, threshold = 7): boolean {
  return score.score >= threshold;
}
