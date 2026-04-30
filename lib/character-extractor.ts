/**
 * Character Locker — extracts a precise textual description of every
 * recurring character drawn on the front cover so that EVERY interior
 * page can re-render the same character (same body shape, same proportions,
 * same distinguishing features). Without this lock Gemini drifts: the
 * cover shows a fat tabby cat with round belly, page 7 shows a skinny
 * orange cat with a long tail — and KDP reviewers reject the book.
 *
 * Run ONCE per book, right after the front cover is generated. The
 * resulting descriptor is injected into every page-generation prompt.
 *
 * Cost: ~$0.001 once per book (one GPT-5.5 vision turn).
 */

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { OPENAI_VISION_MODEL } from "@/lib/constants";

const MODEL_ID = OPENAI_VISION_MODEL;

const CHARACTER_SCHEMA = z.object({
  characters: z
    .array(
      z.object({
        name: z
          .string()
          .min(1)
          .max(40)
          .describe(
            "Short identifier for this character (e.g. 'the bear', 'the lion', 'the tractor', 'the chef pig'). Use generic-but-specific labels — descriptive enough that the page-generation prompt can refer to the same character.",
          ),
        descriptor: z
          .string()
          .min(40)
          .max(400)
          .describe(
            "Concrete physical descriptor. MUST cover (in this order): (1) species/type, (2) PRIMARY COLOR(S) on the cover — write this even though most pages are B&W, because the belongs-to color page and the cover need consistent colors and KDP rejects books where the cover has a black cat but page 2 has an orange cat, (3) body proportions (chubby vs skinny, tall vs short), (4) head/face shape, (5) eye style and color, (6) ear/snout/limb shape, (7) distinctive markings (stripes, patches, spots), accessories (hat, scarf, bow), (8) expression vibe. 40-100 words. Example: 'BLACK cat with bright yellow-green eyes, small pumpkin friend nearby. Chubby round body, wide oval head, large circular eyes, small triangular ears, short stubby legs, plump tail with a slight upward curl, friendly closed-mouth smile, no clothing.'",
          ),
      }),
    )
    .min(1)
    .max(5)
    .describe("Every recognizable character on the cover (1-5 max)."),
});

export type ExtractedCharacters = z.infer<typeof CHARACTER_SCHEMA>;

const SYSTEM_PROMPT = `You are a character-design extractor for a children's coloring book. The user will sell this book on Amazon KDP, so character consistency across pages MATTERS — KDP reviewers reject books where the same character looks different on different pages.

Your job: given the FRONT COVER of the book, extract a precise textual descriptor for EVERY recurring character that should appear on the interior pages.

WHAT MAKES A GOOD DESCRIPTOR
- Concrete and physical, not adjectives like "cute" or "friendly". Say WHAT shapes (round vs angular, long vs short, big vs small).
- Cover BODY PROPORTIONS specifically: "chubby round body", "tall lanky frame", "small compact form". This is the most-violated dimension across pages — describe it explicitly.
- Cover head/face shape, eye style, ear/snout/limb shape — anything that makes this character recognizable in B&W line art.
- Mention distinctive markings (spots, stripes, patches), accessories (hat, scarf, bow), and expression style.
- NEVER describe colors — the interior pages are pure black-and-white line art, so colors are irrelevant.
- Keep each descriptor 40-100 words.

OUTPUT
Return one entry per recurring character (1-5 total). If the cover only shows one character, return one entry. If the cover shows an ensemble (e.g. 4 vehicles, 3 farm animals), return one entry per character.

If a character on the cover is clearly a one-off (a tiny butterfly in the corner, a background prop) — DO NOT include it. Only include characters that will recur on interior pages.`;

export async function extractCharactersFromCover(
  coverDataUrl: string,
  bookTitle: string,
): Promise<ExtractedCharacters> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const dataUrl = coverDataUrl.startsWith("data:")
    ? coverDataUrl
    : `data:image/png;base64,${coverDataUrl}`;

  const result = await generateObject({
    model: openai(MODEL_ID),
    system: SYSTEM_PROMPT,
    schema: CHARACTER_SCHEMA,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Book title: "${bookTitle}". Extract concrete physical descriptors for every recurring character on this cover so they can be re-drawn EXACTLY the same on every interior page in B&W line art.`,
          },
          { type: "image", image: dataUrl },
        ],
      },
    ],
  });

  return result.object;
}

/**
 * Formats an ExtractedCharacters object into a single CHARACTER LOCK
 * directive block that drops cleanly into a master page-generation prompt.
 */
export function formatCharacterLock(extracted: ExtractedCharacters): string {
  if (!extracted.characters.length) return "";
  const lines = extracted.characters.map(
    (c, i) => `(${i + 1}) ${c.name} — ${c.descriptor}`,
  );
  return `🔒 CHARACTER LOCK — STRICT (extracted from this book's cover; every character mentioned in the page subject MUST be drawn EXACTLY as described, identical across all pages of the book — KDP rejects books with inconsistent characters):\n${lines.join("\n")}`;
}
