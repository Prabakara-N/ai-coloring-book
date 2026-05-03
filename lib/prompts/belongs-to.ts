import { PRODUCT_NAME } from "@/lib/constants";
import type { BelongsToStyle } from "./types";
import { ANATOMY_GUARDRAIL, ANTHRO_FACE_GUARDRAIL } from "./guardrails";

/**
 * "This book belongs to" nameplate page generated automatically right after
 * the front cover. Composition: a decorative banner / nameplate centered on
 * the page with "This book belongs to:" in elegant lettering above a bold
 * blank writing line. Two of the book's main characters peek from the
 * left and right corners. Comes in two styles:
 *   - "bw"    → pure black-and-white line art so the kid can color it too
 *   - "color" → fully colored decorative page (parent fills the name in pen)
 */
export const BELONGS_TO_PROMPT_TEMPLATE = (opts: {
  bookTitle: string;
  /** 1-3 main characters from the book — used to draw cameos in the corners. */
  characters: string;
  style: BelongsToStyle;
  /**
   * Optional CHARACTER LOCK block extracted from the cover. When present
   * the corner cameos MUST use these exact descriptors so the cameos
   * match the front cover's characters (same fat tabby cat, not a
   * generic skinny one). Cross-page consistency is the whole point of
   * the lock — belongs-to is the FIRST page after the cover, so any
   * mismatch here is glaring.
   */
  characterLock?: string;
}): string => {
  const isColor = opts.style === "color";
  const styleHeader = isColor
    ? "Children's nameplate / bookplate page, full color. Vibrant flat 2D cartoon, thick clean outlines, warm friendly palette, flat color fills (no gradients, no shading)."
    : "Children's nameplate / bookplate page, pure black-and-white line art only — no color, no gray, no shading. Thick clean closed outlines a child can color.";

  const lock = opts.characterLock?.trim();
  const cameoCharacters = lock
    ? "The cameos must be the same characters that appear on the front cover (provided as a visual reference). Pick two from the character lock block above and reproduce them exactly — same species, body proportions, head shape, color, and distinguishing features. A different-colored or different-breed cameo is a failure."
    : `Pick two characters from this list: ${opts.characters}.`;

  return [
    "Bookplate / 'This Book Belongs To' page, portrait 3:4 aspect ratio, 8.5x11 interior page.",
    styleHeader,
    ...(lock ? [lock] : []),
    "Layout (fixed composition):",
    "1. Center: a decorative ornamental banner / scroll / nameplate frame (curved ribbon, oval cartouche, or rounded rectangle with corner flourishes). Occupies roughly the central 60% width × 40% height with thick clean outlined edges and one consistent flourish (curl, leaf, or dot) at each corner.",
    `2. Inside the banner — top line: the words "This Book Belongs To:" in playful but readable hand-lettered storybook font, ${isColor ? "dark warm grey or near-black" : "solid black ink"}, centered. Letters spelled exactly, generous letter-spacing.`,
    `3. Inside the banner — bottom area: a single bold horizontal blank line for the child's name (${isColor ? "solid dark warm grey" : "solid black"}), 60-70% of the banner's interior width, centered horizontally, ~60% down from the top of the banner. Don't pre-fill any name. Don't add text below the line.`,
    `4. Corner cameos: one character peeking from the bottom-left corner (head and upper body only, looking inward) and one from the bottom-right (also looking inward). ${cameoCharacters} Each cameo is 18-22% of the page height, looking up at the banner with friendly happy expressions. ${isColor ? "Same vibrant cartoon palette as the cover." : "Pure B&W line art, no fills."}`,
    "5. Background: mostly empty white. A few tiny scattered ornaments around the banner (small stars, dots, or simple flowers) are fine. No scenery — no sun, clouds, or landscape.",
    `6. Brand-mark safe-zone: leave the bottom 6% of the page empty. The ${PRODUCT_NAME} brand mark is overlaid by the PDF assembler — don't draw any text or logo there.`,
    "Don't include: any pre-filled name, any text other than 'This Book Belongs To:', page numbers, page borders, decorative perimeter frames, URLs, author signatures, the book title, speech bubbles, or patterns inside the banner.",
    ANATOMY_GUARDRAIL,
    ANTHRO_FACE_GUARDRAIL,
    `(Context only — don't render: the book is "${opts.bookTitle}".)`,
    "Output: a clean printable bookplate page ready to be page 2 of a KDP coloring book.",
  ].join(" ");
};
