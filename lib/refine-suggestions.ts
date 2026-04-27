/**
 * AI-generated refinement suggestions per image.
 *
 * Sends the actual image to GPT-4o-mini Vision and asks for 6 short
 * context-aware refinement suggestions ("change the cow spots to stripes",
 * "remove the second cloud at top right", "make the title text smaller")
 * — much more useful than a hardcoded list of generic prompts.
 *
 * Cost: ~$0.0001 per call. Cacheable per image hash.
 */

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const MODEL_ID = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";

export type RefineContext = "page" | "cover" | "back-cover";

const SUGGESTIONS_SCHEMA = z.object({
  suggestions: z
    .array(z.string().min(4).max(80))
    .min(4)
    .max(8)
    .describe(
      "Array of short, specific refinement suggestions tailored to what is actually visible in this image. Each ≤80 chars, written as imperative direction the user could click to send to the AI editor.",
    ),
});

export type RefineSuggestions = z.infer<typeof SUGGESTIONS_SCHEMA>;

export interface QualityHint {
  score: number;
  reason: string;
  pure_bw?: boolean;
  closed_outlines?: boolean;
  on_subject?: boolean;
  subject_size_ok?: boolean;
  anatomy_ok?: boolean;
  size_consistency_ok?: boolean;
  no_text?: boolean;
  no_border?: boolean;
}

interface SuggestionsInput {
  /** data URL like "data:image/png;base64,..." OR raw base64. */
  imageDataUrl: string;
  context: RefineContext;
  /**
   * Optional AI quality assessment of the image. When provided, the system
   * prompt instructs the suggester to PRIORITIZE refinements that fix the
   * specific failed criteria, so users get one-click options for the actual
   * problems the vision rater detected.
   */
  quality?: QualityHint | null;
}

function qualityFlawsHint(q: QualityHint | null | undefined): string {
  if (!q) return "";
  const flaws: string[] = [];
  if (q.subject_size_ok === false) flaws.push("subject is too small");
  if (q.anatomy_ok === false) flaws.push("anatomy is wrong (extra/fused/swapped features)");
  if (q.size_consistency_ok === false) flaws.push("character sizes don't match between scenes");
  if (q.pure_bw === false) flaws.push("color/gray is bleeding into the line art");
  if (q.closed_outlines === false) flaws.push("outlines have gaps");
  if (q.on_subject === false) flaws.push("the subject doesn't match what was requested");
  if (q.no_text === false) flaws.push("unwanted text/numbers in the image");
  if (q.no_border === false) flaws.push("an unwanted border/frame is drawn");
  if (flaws.length === 0) return "";
  return `\n\nIMPORTANT — quality flaws detected on this image (vision rater scored ${q.score}/10): ${flaws.join("; ")}. The reason given was: "${q.reason}". Make 2-3 of your suggestions specifically target these flaws (e.g. for size flaw: "Make the subject 30% larger"; for anatomy: "Fix the extra leg"; for sky bleed: "Remove the sun and clouds"). The other 3-4 suggestions can be normal observational tweaks. Lead with the flaw-fix suggestions since those are most useful.`;
}

const SYSTEM_BY_CONTEXT: Record<RefineContext, string> = {
  page: `You are a coloring book art reviewer. The user is looking at ONE black-and-white line-art coloring page and may want to tweak it. Look at the image and suggest 6 SHORT specific refinements they might want, based on WHAT IS ACTUALLY IN THE IMAGE.

Examples of GOOD suggestions (specific to what's visible):
- "Remove the second cloud in the top-left"
- "Make the cow's spots smaller"
- "Add a butterfly above the tree"
- "Thicken the outline of the fence"
- "Move the subject slightly to the right"
- "Remove the small flower near the right edge"

Examples of BAD suggestions (too generic, useless):
- "Make it better"
- "Improve the composition"
- "Add more detail"

Be observational — name actual elements visible in the image. Each suggestion ≤80 characters. Imperative verbs ("Remove…", "Add…", "Move…", "Thicken…", "Reduce…").`,

  cover: `You are a children's book cover designer. The user is looking at ONE colored book cover and may want to tweak it. Look at the image and suggest 6 SHORT specific refinements based on WHAT'S ACTUALLY VISIBLE.

Examples of GOOD suggestions:
- "Make the title text 20% larger"
- "Change the lion's mane to deeper orange"
- "Move the cows to the left side"
- "Replace the green hill with mountains"
- "Add more clouds in the sky"
- "Make the background sky a softer pastel blue"

Be specific to elements actually present (characters, colors, layout, sky/background details). Each ≤80 chars. Imperative verbs.`,

  "back-cover": `You are a book back-cover designer. The user is looking at the BACK COVER of their coloring book — minimal layout: 2-tone background + a tagline + a barcode rectangle. They may want to tweak any of these. Look at the image and suggest 6 SHORT specific refinements based on what's visible.

Examples of GOOD suggestions:
- "Make the top band 30% darker"
- "Use a different short tagline"
- "Center the tagline vertically"
- "Make the tagline font larger"
- "Move the barcode rectangle slightly left"
- "Add a small star ornament above the tagline"
- "Replace the divider line with a flower"

Stay focused on the back-cover elements (background layers, tagline text, ornament, divider, barcode area). Each ≤80 chars. Imperative verbs.`,
};

export async function generateRefineSuggestions(
  input: SuggestionsInput,
): Promise<RefineSuggestions> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const dataUrl = input.imageDataUrl.startsWith("data:")
    ? input.imageDataUrl
    : `data:image/png;base64,${input.imageDataUrl}`;

  const result = await generateObject({
    model: openai(MODEL_ID),
    system: SYSTEM_BY_CONTEXT[input.context] + qualityFlawsHint(input.quality),
    schema: SUGGESTIONS_SCHEMA,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Suggest 6 short specific refinements for this image, based on what is actually visible.",
          },
          { type: "image", image: dataUrl },
        ],
      },
    ],
    temperature: 0.5,
  });

  return result.object;
}
