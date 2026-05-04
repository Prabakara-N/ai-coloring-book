/**
 * Story-book front-cover prompt (Phase 1 — toddler band 3-6).
 *
 * Distinct from `cover.ts` which builds the COLORING-BOOK cover (with
 * subtitle pill, page-count badge, side plaque, and bottom strip overlays).
 * Story-book covers are picture-book covers: title + characters in a hero
 * scene, no marketing overlays. The cover is also passed back to every
 * interior page as a visual anchor (character look + style ground truth),
 * so its visual language defines the look of the entire book.
 */

import {
  ANATOMY_GUARDRAIL,
  KID_SAFE_CONTENT_RULE,
  NO_REAL_BRAND_RULE,
} from "./guardrails";
import type {
  StoryCharacter,
  StoryPalette,
} from "./story-page";

export interface StoryCoverTemplateOptions {
  /** Full book title — rendered as the cover title-block. */
  title: string;
  /** 1-3 locked characters that appear together on the cover. */
  characters: StoryCharacter[];
  /** Locked palette — same as the interior pages. */
  palette: StoryPalette;
  /**
   * Description of the cover composition — who is in it, what they're
   * doing, the setting, the mood. 12-30 words. Should NAME each character
   * who appears so the prompt enforces "only named characters are drawn".
   */
  coverScene: string;
  /** Optional camera / framing hint. */
  composition?: string;

  /** Audience label for the subtitle pill (e.g. "PICTURE BOOK · AGES 3-6"). */
  audienceLabel?: string;
  /** Number of scenes/pages — drives the corner badge copy. */
  pageCount?: number;
  /** Three short ALL-CAPS phrases for the bottom strip. */
  bottomStripPhrases?: string[];
  /** Three short ALL-CAPS lines for the side plaque, top to bottom. */
  sidePlaqueLines?: string[];
  /** One-sentence overlay design language for badge / plaque / strip. */
  coverBadgeStyle?: string;
  /** Brand strapline rendered under the bottom strip. */
  brandStrapline?: string;
}

const TODDLER_BAND_NOTE =
  "Audience: toddlers 3-6. Friendly rounded characters with big expressive eyes, big simple shapes, calm safe scene, no scary or stressful imagery.";

const STYLE_RULE =
  "Style: flat 2D cartoon illustration, vibrant flat colors with bold black outlines, soft warm lighting feel, minimal shading (no realistic gradients, no painterly texture). Friendly rounded character forms with large expressive eyes, simple expressive mouths, gentle proportions. This cover defines the visual language of the entire book — every interior page will be illustrated to match it.";

const FULL_BLEED_RULE =
  "Composition: full-bleed cover illustration that fills the entire 6x9 portrait canvas to all four edges. NO border, NO frame, NO outer rectangle, NO white margin. The background reaches every edge. Aspect ratio 2:3 (portrait).";

const TITLE_TYPOGRAPHY_RULE =
  "Title typography — IMPORTANT: render the title at the top of the cover with PLENTY of breathing room. The title block occupies roughly the top 25-32% of the cover with comfortable padding all around. Style: chunky multi-color hand-drawn cartoon letters (mix of bright red, yellow, blue, pink), each letter has a subtle dark outline and slight playful bounce. Letters are clearly distinguishable, never overlapping. If the title has more than 4 words or 25 characters, BREAK IT onto 2 OR 3 LINES at natural word breaks. Each line is centered. Generous letter-spacing, never cramped. Spell every letter exactly as given — no typos, no extra letters, no missing letters, no rearranging.";

const CHARACTER_FIDELITY_RULE =
  "Character fidelity (load-bearing): draw each character on the cover EXACTLY per the locked descriptors above — same species, body proportions, head shape, color, accessories, distinguishing features. No invented clothing, accessories, traits, or colors. Each character appears at most ONCE; never duplicate. Only characters explicitly named in the cover-scene description below are drawn — no extra animals, no random side characters, no human onlookers unless named.";

const TEXT_POLICY_RULE =
  "Text policy: the ONLY text drawn anywhere on this cover is the text explicitly named in the user-prompt brief below (the book title, plus any overlay copy listed there). No author name, no publisher imprint, no URL, no social handle, no watermark, no signature, no model attribution, no random letters or numbers in the background scenery. If a sign or book appears in the scene, leave it blank or use abstract squiggles — never readable letters.";

const NO_HAND_DRAWN_CLAIM_RULE =
  "Do not include any claim or watermark suggesting the art is hand-drawn, hand-painted, hand-illustrated, handmade, or original artwork. The art style is illustrated, not artisanal.";

/**
 * Stable system rules for the toddler-band story-book cover. Sent via
 * Gemini's `systemInstruction` channel for implicit caching.
 */
export const STORY_COVER_TODDLER_SYSTEM = [
  "You generate front-cover illustrations for premium Amazon KDP children's picture books in the toddler band (ages 3-6). Every cover must be print-ready 300 DPI quality and visually polished enough to win an Amazon thumbnail click.",
  TODDLER_BAND_NOTE,
  STYLE_RULE,
  FULL_BLEED_RULE,
  TITLE_TYPOGRAPHY_RULE,
  CHARACTER_FIDELITY_RULE,
  TEXT_POLICY_RULE,
  NO_REAL_BRAND_RULE,
  KID_SAFE_CONTENT_RULE,
  ANATOMY_GUARDRAIL,
  NO_HAND_DRAWN_CLAIM_RULE,
  "Output: a single coherent full-color full-bleed picture-book front cover.",
].join(" ");

function formatCharacterLock(characters: StoryCharacter[]): string {
  if (characters.length === 0) {
    return "Locked characters for this book: none — the cover may have no named characters, only the scene described below.";
  }
  const lines = characters
    .map((c) => `${c.name.trim()}: ${c.descriptor.trim()}`)
    .join(" / ");
  return `Locked characters for this book (each character that appears on this cover MUST match these descriptors EXACTLY): ${lines}.`;
}

function formatPalette(palette: StoryPalette): string {
  const cleanHexes = palette.hexes
    .map((h) => h.trim())
    .filter((h) => /^#?[0-9a-fA-F]{6}$/.test(h.trim()))
    .map((h) => (h.startsWith("#") ? h.toUpperCase() : `#${h.toUpperCase()}`))
    .slice(0, 8);
  if (cleanHexes.length === 0) {
    return "Palette: warm friendly children's-book palette — soft pastels and saturated accent colors that read clearly at thumbnail size.";
  }
  return `Palette lock — use only these colors and tonal blends of them across this cover (no off-palette hues): ${cleanHexes.join(", ")}.`;
}

const STORY_DEFAULT_BOTTOM_STRIP_PHRASES = [
  "MORAL STORY",
  "READ-ALOUD",
  "HAPPY ENDING",
] as const;

const STORY_DEFAULT_SIDE_PLAQUE_LINES = [
  "READ-ALOUD",
  "FAVORITE",
  "FOR LITTLE ONES",
] as const;

const STORY_DEFAULT_OVERLAY_DESIGN_LANGUAGE =
  "clean modern picture-book overlays — a soft cream rounded badge for the round corner element, a warm cream paper-cut sign with a slim contrasting outline for the side plaque, and a deep saturated solid-color ribbon for the bottom strip; lettering is rounded sans-serif with thin dark outlines for legibility";

const STORY_DEFAULT_BRAND_STRAPLINE = "Made by CrayonSparks for your child";

function normalizePhraseList(
  raw: string[] | undefined,
  fallback: readonly string[],
  perPhraseMaxChars: number,
): string[] {
  if (!Array.isArray(raw) || raw.length < 3) return [...fallback];
  const cleaned = raw
    .slice(0, 3)
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .map((s) => s.replace(/\s+/g, " "))
    .map((s) => s.slice(0, perPhraseMaxChars).trim())
    .map((s) => s.toUpperCase());
  if (cleaned.some((s) => !s)) return [...fallback];
  return cleaned;
}

function buildOverlayBlock(opts: StoryCoverTemplateOptions): string[] {
  const audienceLabel = (opts.audienceLabel?.trim() || "PICTURE BOOK · AGES 3-6").toUpperCase();
  const badgePrimary =
    typeof opts.pageCount === "number" && opts.pageCount > 0
      ? `${opts.pageCount} BIG SCENES`
      : "READ-ALOUD STORY";
  const bottomStrip = normalizePhraseList(
    opts.bottomStripPhrases,
    STORY_DEFAULT_BOTTOM_STRIP_PHRASES,
    24,
  );
  const plaqueLines = normalizePhraseList(
    opts.sidePlaqueLines,
    STORY_DEFAULT_SIDE_PLAQUE_LINES,
    28,
  );
  const bottomStripText = bottomStrip.join("  *  ");
  const overlayDesignLanguage =
    opts.coverBadgeStyle?.trim() || STORY_DEFAULT_OVERLAY_DESIGN_LANGUAGE;
  const brandStrapline =
    opts.brandStrapline?.trim().slice(0, 60) || STORY_DEFAULT_BRAND_STRAPLINE;

  const badgeWordsParts = badgePrimary.split(" ");
  const badgeTopLine = badgeWordsParts[0];
  const badgeRest = badgeWordsParts.slice(1).join(" ");

  return [
    "SELLING-POINT OVERLAYS — render all four of these as additional graphic elements on the cover, in addition to the title. Spell every word EXACTLY as written in quotes. Keep them clearly readable, well-spaced, and never overlapping the main characters' faces or the title.",
    `OVERLAY DESIGN LANGUAGE — render the page-count badge (item 2), the side plaque (item 3), and the bottom strip (item 4) as physical objects that belong in this book's world, using this design language: ${overlayDesignLanguage}. The three overlays must read as a matching set — same material vibe, same color family, consistent edge treatment. Lettering inside each overlay stays bold capitals with enough contrast against the overlay's surface to be instantly readable from a thumbnail. The subtitle pill (item 1) is excluded from this design language; it stays a clean modern UI pill.`,
    `1) SUBTITLE PILL — directly under the main title, a horizontal rounded-rectangle pill in a deep saturated color (navy, deep teal, or burgundy) with a thin contrasting outline. Inside the pill, in clean bold sans-serif white capitals: "${audienceLabel}". Pill width ~55-70% of cover width, centered.`,
    `2) PAGE-COUNT BADGE — top-right corner, a circular / seal-shaped badge (about 18-22% of cover width) styled per the overlay design language above. Inside, two stacked lines of bold rounded capitals: top line "${badgeTopLine}"${badgeRest ? `, bottom line "${badgeRest}"` : ""}. Three small filled accent shapes (stars, dots, or a motif that fits the design language) sit under the text. Place the badge so it does NOT cover the title or any character's face.`,
    `3) SIDE PLAQUE — left side, mid-height, a small plaque / sign / banner shape (about 22-28% of cover width) styled per the overlay design language above, tilted ~5-10 degrees. Inside, three short stacked lines of friendly capitals (the first line in an accent color from the design language, the next two in the dominant readable color): "${plaqueLines[0]}" / "${plaqueLines[1]}" / "${plaqueLines[2]}". Position so it does NOT cover any character's face.`,
    `4) BOTTOM STRIP — at the very bottom of the cover, a slightly taller full-width horizontal ribbon / band styled per the overlay design language above (height ~9-12% of cover height) so it can hold TWO stacked lines of text with comfortable padding. The strip contains exactly these two lines, top to bottom: (a) one bold ALL-CAPS line of selling phrases, separated by small filled accent shapes (stars, dots, or a motif that fits the design language): "${bottomStripText}". (b) directly under it, a smaller mixed-case brand strapline in a clean italic or rounded script with a small four-point sparkle shape between the brand name and the next word: "${brandStrapline}". The strapline reads as a soft brand signature, NOT another marketing shout — about half the type-size of line (a), elegant, calmer color (cream / off-white / soft accent). Both lines centered. Render the brand name "CrayonSparks" exactly as written, one word, capital C and capital S, no space.`,
    `Permitted text on this cover (and only this text): the title; the subtitle pill copy; the page-count badge copy; the side-plaque copy; the bottom-strip top line; the bottom-strip brand strapline. No other text anywhere on this cover.`,
  ];
}

/**
 * Per-cover dynamic content. Pair with {@link STORY_COVER_TODDLER_SYSTEM}
 * when calling Gemini so the static prefix is cached.
 */
export const STORY_COVER_TODDLER_USER = (
  opts: StoryCoverTemplateOptions,
): string => {
  const parts: string[] = [
    "Toddler picture-book front cover (ages 3-6).",
    `Title to render at the top of the cover: "${opts.title.trim()}".`,
    formatCharacterLock(opts.characters),
    formatPalette(opts.palette),
    `Cover scene description: ${opts.coverScene.trim()}`,
  ];
  if (opts.composition?.trim()) {
    parts.push(`Composition hint: ${opts.composition.trim()}.`);
  }
  parts.push(...buildOverlayBlock(opts));
  return parts.join(" ");
};

/**
 * Backward-compatible single-string template. Concatenates the static
 * guardrails (system) and the dynamic per-cover content (user).
 */
export const STORY_COVER_TODDLER_TEMPLATE = (
  opts: StoryCoverTemplateOptions,
): string => {
  return `${STORY_COVER_TODDLER_SYSTEM} ${STORY_COVER_TODDLER_USER(opts)}`;
};
