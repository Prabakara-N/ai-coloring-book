/**
 * Story-book back-cover prompt (Phase 1 — toddler band 3-6).
 *
 * Mirrors the coloring book's `BACK_COVER_PROMPT_TEMPLATE` pattern: keep
 * it INTENTIONALLY SIMPLE. No upper illustration, no character portrait,
 * no barcode area — just a soft colored background that matches the front
 * cover plus one centered tagline. Optional brand strapline below the
 * tagline. Calm, spacious, lots of breathing room.
 *
 * The front cover is passed as a visual reference (attached image) so the
 * back cover automatically matches its dominant color family.
 */

import {
  KID_SAFE_CONTENT_RULE,
  NO_REAL_BRAND_RULE,
} from "./guardrails";
import type { StoryPalette } from "./story-page";

export interface StoryBackCoverTemplateOptions {
  /** Book title — context only, NOT printed on the back cover. */
  title: string;
  /**
   * Locked palette — same as the front cover and interior. Used to nudge
   * the model toward an on-palette body color. The attached front-cover
   * image is the primary signal for color matching.
   */
  palette: StoryPalette;
  /**
   * Tagline rendered verbatim, centered in the middle of the back cover.
   * Hard cap 22 words for toddlers (one or two short sentences).
   */
  tagline: string;
  /**
   * When set, the back cover MUST use this named color hue (e.g.
   * "soft pastel pink", "warm tan", "deep teal") for its body color.
   * Overrides the "match the front cover" instruction. Used by a refine
   * panel after the user picks a swatch from the palette.
   */
  forceColor?: string;
  /** Optional brand strapline rendered as a small italic line below the tagline. */
  brandStrapline?: string;
}

const TODDLER_BAND_NOTE =
  "Audience: toddlers 3-6. Calm, spacious, lots of breathing room — the visual mood matches the gentle picture-book feel of the front cover.";

const COMPOSITION_RULE =
  "Composition: just two things — a soft textured colored background covering the canvas edge-to-edge, and one elegant tagline floating in the middle. No characters, no scene, no upper illustration zone, no barcode rectangle. Calm, spacious, lots of breathing room — Penguin-Classics back cover energy applied to a kids' picture book.";

const BACKGROUND_LAYER_RULE =
  "Background layering: apply the body color as TWO horizontal layers — a hairline header band at the very top (2-3% of cover height, slightly darker / more saturated of the same hue), and the remaining 97-98% in a noticeably lighter pastel of the same hue. Clean straight horizontal edge between the two layers (no gradient). Subtle paper-texture speckle on both layers so it reads as a printed surface, not a flat digital fill.";

const FULL_BLEED_RULE =
  "Full-bleed back-cover canvas, 6x9 portrait (aspect ratio 2:3). The colored background reaches all four edges. NO border, NO frame, NO white margin.";

const TAGLINE_PLACEMENT_RULE =
  "Tagline placement: centered horizontally and around 50% vertically. Set in elegant italic serif (Garamond, Caslon, or Playfair Display italic), dark warm grey to near-black, generous letter spacing, line-height ~1.4, broken across 2-3 centered lines at natural clause breaks.";

const FLOURISHES_RULE =
  "Optional flourishes (subtle, NOT mandatory — pick at most one of each): a tiny ornament (single flower, star, or 3-dot mark, 4-6% of cover width, same dark warm grey as the tagline) ~5% above the tagline; a short thin horizontal divider line ~3% below the tagline (15-20% of cover width). Both flourishes share the tagline's color so they read as one elegant text-block, not separate decorations.";

const TEXT_POLICY_RULE =
  "Text policy: the only printed text on this entire cover is the tagline (centered) and, when provided, a small brand strapline below it. No author name, no publisher imprint, no ISBN block, no barcode, no rating, no website, no social handle, no email, no marketing blurb, no watermark, no URL, no page count, no age label, no random letters in the background.";

const NO_HAND_DRAWN_CLAIM_RULE =
  "Do not include any claim or watermark suggesting the art is hand-drawn, hand-painted, hand-illustrated, handmade, or original artwork.";

const DEFAULT_BRAND_STRAPLINE = "Made by CrayonSparks for your child";

/**
 * Stable system rules for the toddler-band story-book back cover.
 */
export const STORY_BACK_COVER_TODDLER_SYSTEM = [
  "You generate back-cover illustrations for premium Amazon KDP children's picture books in the toddler band (ages 3-6). Every back cover must be print-ready 300 DPI quality and match the front cover's color family. Keep the layout minimal — colored background plus a single centered tagline, with an optional small brand strapline below.",
  TODDLER_BAND_NOTE,
  COMPOSITION_RULE,
  BACKGROUND_LAYER_RULE,
  FULL_BLEED_RULE,
  TAGLINE_PLACEMENT_RULE,
  FLOURISHES_RULE,
  TEXT_POLICY_RULE,
  NO_REAL_BRAND_RULE,
  KID_SAFE_CONTENT_RULE,
  NO_HAND_DRAWN_CLAIM_RULE,
  "Output: a single coherent full-bleed picture-book back cover — soft textured colored background plus centered tagline.",
].join(" ");

function formatPalette(palette: StoryPalette): string {
  const cleanHexes = palette.hexes
    .map((h) => h.trim())
    .filter((h) => /^#?[0-9a-fA-F]{6}$/.test(h.trim()))
    .map((h) => (h.startsWith("#") ? h.toUpperCase() : `#${h.toUpperCase()}`))
    .slice(0, 8);
  if (cleanHexes.length === 0) {
    return "Palette: warm friendly children's-book palette.";
  }
  return `Palette context — pick the back-cover body color from this set, weighted toward whichever hue dominates the attached front cover: ${cleanHexes.join(", ")}.`;
}

function formatColorSource(opts: StoryBackCoverTemplateOptions): string {
  if (opts.forceColor) {
    return `BODY COLOR — MANDATORY, OVERRIDES THE REFERENCE IMAGE: The user explicitly picked "${opts.forceColor}" for this back cover. The ENTIRE background MUST be a clear, recognizable "${opts.forceColor}" — verifiably that named hue, not a default cream and not a different color from the front cover. Even though a front-cover reference image is attached for context, IGNORE its color and apply "${opts.forceColor}" instead. A buyer should look at the back cover and immediately call it that color name.`;
  }
  return "Background color: a reference image of the front cover is attached. Identify its single largest-area background color and use that color family on the back (front pink to back pink, front mint to back mint, etc.). Apply it as a soft pastel of the front-cover hue — slightly lighter so the dark tagline reads cleanly against it.";
}

/**
 * Per-cover dynamic content. Pair with {@link STORY_BACK_COVER_TODDLER_SYSTEM}.
 */
export const STORY_BACK_COVER_TODDLER_USER = (
  opts: StoryBackCoverTemplateOptions,
): string => {
  const brandStrapline =
    opts.brandStrapline?.trim().slice(0, 60) || DEFAULT_BRAND_STRAPLINE;
  const tagline = opts.tagline.trim().replace(/\s+/g, " ");
  const parts: string[] = [
    "Toddler picture-book back cover (ages 3-6).",
    `Book title (for context only — the title is NOT printed on the back cover): "${opts.title.trim()}".`,
    formatPalette(opts.palette),
    formatColorSource(opts),
    `Tagline (render this exact text — verbatim, centered in the middle of the cover): "${tagline}"`,
    `Brand strapline (small italic line ~3% below the tagline, centered, mixed-case italic / rounded script with a small four-point sparkle shape between the brand name and the next word, brand name "CrayonSparks" exactly as written, one word, capital C and capital S, no space): "${brandStrapline}"`,
  ];
  return parts.join(" ");
};

export const STORY_BACK_COVER_TODDLER_TEMPLATE = (
  opts: StoryBackCoverTemplateOptions,
): string => {
  return `${STORY_BACK_COVER_TODDLER_SYSTEM} ${STORY_BACK_COVER_TODDLER_USER(opts)}`;
};
