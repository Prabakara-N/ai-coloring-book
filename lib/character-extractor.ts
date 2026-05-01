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
            "Short identifier for this character (e.g. 'the bear', 'the lion cub', 'the tractor', 'the chef pig'). Use generic-but-specific labels — descriptive enough that the page-generation prompt can refer to the same character.",
          ),
        descriptor: z
          .string()
          .min(60)
          .max(500)
          .describe(
            "Concrete physical descriptor. MUST cover, in this order:\n(1) SPECIES + AGE STAGE if relevant (e.g. 'lion CUB', 'young grown lion', 'adult lioness') — the age stage controls whether the model adds mane, scales, etc.\n(2) PRIMARY COLOR(S) on the cover (cover is in color even though interiors are B&W — character must stay consistent across cover, belongs-to page, and any colored asset).\n(3) BODY PROPORTIONS — chubby vs skinny, tall vs short, head-to-body ratio. Most-violated dimension; be explicit.\n(4) HEAD / FACE SHAPE.\n(5) EYE STYLE and color.\n(6) EAR / SNOUT / LIMB / TAIL shape.\n(7) DISTINCTIVE MARKINGS — stripes, patches, spots, accessories (hat, scarf, bow).\n(8) EXPRESSION vibe.\n(9) 🚫 NEGATIVE FEATURES (THE KEY FIELD — without these the image model defaults to its training prior and adds 'expected' features). End the descriptor with 1-3 explicit 'NO X' / 'WITHOUT X' clauses listing what this character does NOT have, especially when it differs from the species' default look. Examples: 'NO mane, NO facial hair, smooth round chin' (for a lion cub — without this, the model adds a small mane). 'NO horns, NO antlers' (for a young deer/cow). 'NO whiskers' (for a cat that has none on the cover). 'NO long flowing mane — only a tiny tuft on top of the head' (for a young lion). 'NO clothing' (for an animal). 'NO floppy ears — ears are pointed and short' (for a dog that has pointed ears). Be specific and contrastive.\n\n60-200 words. Plain prose, all clauses inline.\n\nFULL EXAMPLE — Lion cub: 'Lion CUB (young, not adult). Tan/golden fur, white belly, brown nose. Chubby round body with short legs, wide oval head, large round black eyes with small white highlights, small rounded triangular ears, short tail with a small dark tuft, friendly open-mouth smile showing tiny teeth. NO mane, NO facial hair, NO ruff around the neck — the chin and cheeks are smooth and bare. NO scar, NO markings on the face. NO clothing.'\n\nFULL EXAMPLE — Young grown lion: 'Young adult LION (older than a cub, not fully grown). Tan fur. Slim athletic body, longer legs than a cub, narrow head, almond-shaped eyes. SMALL TUFT-LIKE MANE only — short, fluffy, just framing the face — NOT a long flowing adult mane. NO scar. NO clothing.'\n\nFULL EXAMPLE — Tabby cat: 'Adult tabby CAT. Orange-and-cream striped fur, white belly. Slim long body, triangular head, narrow almond eyes (green), pointed upright ears, long thin tail with rings. Whiskers on each cheek. NO collar, NO clothing, NO bow — the cat is plain. NO black markings.'",
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
- Include the cover's primary color(s) so the cover and the colored "belongs-to" page stay consistent (interior B&W pages ignore color).

🚫 CRITICAL — END EVERY DESCRIPTOR WITH NEGATIVE FEATURES
The downstream image model (Gemini Nano Banana) has very strong training priors. When you say "lion", it adds a flowing mane by default. When you say "cat", it adds whiskers. When you say "dog", it adds floppy ears. Without explicit negation, the model overrides what's actually on the cover with its own prior on what the species "should" look like.

So EVERY descriptor MUST end with 1-3 explicit "NO X" or "WITHOUT X" clauses naming the features this specific character does NOT have, especially when the cover differs from the species' default look. Examples:
- A lion cub on the cover with no mane → "NO mane, NO facial hair, smooth round chin"
- A young grown lion with a small partial mane → "NO long flowing mane — only a small tuft framing the face"
- A black cat with no collar → "NO collar, NO clothing, NO bow"
- A dog with pointed ears → "NO floppy ears — ears are short and pointed"
- A cow without horns → "NO horns, NO udder visible from this angle"
- A young deer (fawn) → "NO antlers, NO horns"
- A goat with bell on collar → keep the bell as a positive feature, but say "NO horns" if the cover shows a hornless goat
- A bunny → "NO long whiskers, NO fluffy tail (tail is small and round)"
- A tabby cat with stripes → "NO solid color (always stripes), NO black patches"

The negation is what locks the character. Do not skip this section. If you can't think of distinguishing negatives, default to "NO accessories, NO clothing" at minimum.

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
