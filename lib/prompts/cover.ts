import type { CoverStyle, CoverBorder } from "./types";
import { KID_SAFE_CONTENT_RULE } from "./guardrails";

/**
 * Back-cover prompt — kept INTENTIONALLY SIMPLE.
 *
 * Strategy: instead of cramming title + description + thumbnails + barcode
 * area onto the back, keep it minimal. The front cover should be passed as
 * a STYLE REFERENCE separately (via the referenceDataUrl flow) so the back
 * cover automatically matches the front's colors, palette, and border style.
 *
 * The back has only:
 *   1. Same overall background scene as the front (just less crowded)
 *   2. ONE short cheerful tagline (max 8 words)
 *   3. Bottom-right white safe-zone for Amazon's ISBN barcode
 */
export const BACK_COVER_PROMPT_TEMPLATE = (opts: {
  title: string;
  description: string;
  scene: string;
  style?: CoverStyle;
  border?: CoverBorder;
  ageLabel?: string;
  /**
   * When set, the back cover MUST use this named color hue (e.g.
   * "soft pastel pink", "warm tan", "deep teal") for its body color.
   * Overrides the "match the front cover's dominant color" instruction.
   * Used by the back-cover refine panel after the user picks a swatch
   * from the front-cover palette.
   */
  forceColor?: string;
  /**
   * When set, render this exact text as the back-cover tagline instead
   * of letting Gemini invent one. Used by the back-cover refine panel
   * after the user picks one of the AI-suggested taglines.
   */
  forceTagline?: string;
}) => {
  const border = opts.border ?? "framed";
  const colorSource = opts.forceColor
    ? `BODY COLOR — MANDATORY, OVERRIDES THE REFERENCE IMAGE: The user explicitly picked "${opts.forceColor}" for this back cover. The ENTIRE background (top hairline band + 97% body) MUST be a clear, recognizable "${opts.forceColor}" — verifiably that named hue, not a default beige or cream and not a different color from the front cover. Even though a front-cover reference image is attached for context, IGNORE its color and apply "${opts.forceColor}" instead. If "${opts.forceColor}" contains words like "teal", "yellow", "pink", "blue", "green", "purple", "orange", "lavender", "mint", etc., the dominant hue MUST match that word — a buyer should look at the back cover and immediately call it that color name.`
    : `A reference image of the front cover is attached. Identify its single largest-area background color and use that color family on the back (front pink to back pink, front tan to back tan, front mint to back mint).`;
  const taglineBody = opts.forceTagline
    ? `Render exactly this text — verbatim, no rewording, no added punctuation: "${opts.forceTagline}". Verify every letter matches.`
    : `Write one tagline of 1-2 short sentences (10-12 words total, hard cap 12) that speaks first to the parent (calm, evocative of quiet time together) and references a concrete noun from this cover scene: "${opts.scene}". Tone: calm and confident, like a Penguin Classics back. Never claim "hand-drawn" / "hand-illustrated" / "handmade" (these are AI-generated — use "illustrated", "pages", "drawings", "keepsake"). Never cite a page count or age number. Avoid clichés ("splashing colors", "curious little hands", "endless fun", "hours of entertainment"). Compose a fresh tagline tailored to THIS book's specific subjects — do not borrow phrasing from any other book.`;
  return [
    "Book back cover, portrait 3:4. Publishing-grade Amazon KDP quality, inspired by Penguin Classics and modern indie picture-book backs.",
    "Composition: just two things — a soft textured colored background covering the canvas edge-to-edge (including the bottom-right corner), and one elegant tagline floating in the middle. Calm, spacious, lots of breathing room.",
    `Background colour: ${colorSource} Apply it as two horizontal layers — a hairline header band at the very top (2-3% of cover height, slightly darker / more saturated), and the remaining 97-98% in a noticeably lighter pastel of the same hue. Clean straight horizontal edge between layers (no gradient). Subtle paper-texture speckle on both. Every pixel of the bottom layer is the same pastel; the bottom-right corner is uninterrupted.`,
    `Tagline: centered horizontally and around 50% vertically. ${taglineBody} Set in elegant italic serif (Garamond, Caslon, or Playfair Display italic), dark warm grey to near-black, generous letter spacing, line-height ~1.4, broken across 2-3 centered lines at natural clause breaks.`,
    "Optional flourishes: a tiny ornament (single flower, star, or 3-dot mark, 4-6% of cover width, same dark warm grey) ~5% above the tagline; a short thin horizontal divider line ~3% below the tagline (15-20% of cover width).",
    border === "framed"
      ? "Border: same decorative cream-beige speckled rounded-rectangle frame as the front cover (only the inside of the frame is the soft colored back)."
      : "Border: no outer border, full bleed.",
    "The only printed text on this entire cover is the tagline. No age label, page count, publisher name, ISBN block, barcode, rating, website, social handle, email, marketing blurb, watermark, URL, or author name anywhere — especially not in the bottom-right corner. 300 DPI print quality.",
    `(Context only — do not render: book is "${opts.title}", ${opts.description})`,
  ].join(" ");
};

const COVER_STYLE_DIRECTIVES: Record<CoverStyle, string> = {
  flat: "Style: flat 2D cartoon, thick clean black outlines on every element, vibrant flat color fills using a bold primary palette (sky blue, sunshine yellow, grass green, brick red, soft pink). Every shape filled with one solid color — no gradients, no realistic shading, no airbrushing. Cheerful and whimsical, friendly happy facial expressions on every character.",
  illustrated:
    "Style: premium illustrated children's picture-book art, semi-3D rendered cartoon with soft directional lighting, gentle painterly shading, subtle highlights and shadows, depth between foreground and background. Modern Pixar/Disney-storybook aesthetic. Outlines are subtle (not thick black cartoon strokes — soft tonal edges). Vibrant saturated palette with smooth color gradients. Characters have rounded forms, friendly happy facial expressions, large expressive eyes. Polished commercial book-cover quality.",
};

const COVER_BORDER_DIRECTIVES: Record<CoverBorder, string> = {
  framed:
    "Border: a decorative cream beige speckled rounded-rectangle border frame around the entire cover, slightly hand-drawn. The artwork sits inside this frame.",
  bleed:
    "Border: NO outer border, NO frame, NO speckled edge. The illustration extends fully to all four edges of the cover (full bleed). The background color and scene continue right to the edges with no margin or framing element.",
};

const DEFAULT_BOTTOM_STRIP_PHRASES = [
  "BIG SIMPLE DESIGNS",
  "BOOSTS CREATIVITY",
  "HOURS OF FUN",
] as const;

const DEFAULT_SIDE_PLAQUE_LINES = [
  "BIG & EASY",
  "PAGES",
  "PERFECT FOR TODDLERS!",
] as const;

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

const DEFAULT_OVERLAY_DESIGN_LANGUAGE =
  "clean modern children's-book overlays — a bright sunburst circle for the round badge, a soft cream wooden sign with a slim contrasting outline for the side plaque, and a deep saturated solid-color ribbon for the bottom strip; lettering is rounded sans-serif with thin dark outlines for legibility";

const DEFAULT_BRAND_STRAPLINE = "Made by CrayonSparks for your child";

export const COLOR_COVER_PROMPT_TEMPLATE = (opts: {
  title: string;
  scene: string;
  ageLabel?: string;
  pageCount?: number;
  style?: CoverStyle;
  border?: CoverBorder;
  bottomStripPhrases?: string[];
  sidePlaqueLines?: string[];
  coverBadgeStyle?: string;
  brandStrapline?: string;
}) => {
  const style = opts.style ?? "flat";
  const border = opts.border ?? "framed";
  const ageLabel = opts.ageLabel?.trim() || "Ages 3-6";
  const designsLabel =
    typeof opts.pageCount === "number" && opts.pageCount > 0
      ? `${opts.pageCount} CUTE & FUN DESIGNS`
      : "CUTE & FUN DESIGNS";
  const bottomStrip = normalizePhraseList(
    opts.bottomStripPhrases,
    DEFAULT_BOTTOM_STRIP_PHRASES,
    24,
  );
  const plaqueLines = normalizePhraseList(
    opts.sidePlaqueLines,
    DEFAULT_SIDE_PLAQUE_LINES,
    28,
  );
  const bottomStripText = bottomStrip.join("  *  ");
  const overlayDesignLanguage =
    opts.coverBadgeStyle?.trim() || DEFAULT_OVERLAY_DESIGN_LANGUAGE;
  const brandStrapline =
    opts.brandStrapline?.trim().slice(0, 60) || DEFAULT_BRAND_STRAPLINE;
  return [
    "Fully colored children's coloring book cover illustration, portrait 3:4 aspect ratio. Premium Amazon KDP cover quality.",
    `TITLE TYPOGRAPHY — IMPORTANT: Render the title "${opts.title}" at the top of the cover with PLENTY of breathing room. The title must NEVER look cramped, congested, or run-together. If the title has more than 4 words or 25 characters, BREAK IT onto 2 OR 3 LINES at natural word breaks (between phrases, before "and", before "—", before "Coloring Book"). Each line is centered. Generous space between lines (line-height ~1.2-1.4). Generous space between letters (slight letter-spacing, NOT cramped kerning). The title block occupies roughly the top 28-34% of the cover with comfortable padding all around. Style: chunky multi-colored hand-drawn cartoon letters (mix of bright red, yellow, blue, pink), each letter has a subtle black outline and slight playful bounce. Letters are clearly distinguishable, not overlapping. Spell every letter exactly as given — no typos, no extra letters, no missing letters, no rearranging.`,
    `Foreground (the heroes of the cover): ${opts.scene}`,
    "Background: derive a setting that fits the foreground subjects naturally — if the scene is outdoors, use a bright sky with fluffy clouds and a hint of horizon/grass; if it is space, use deep blue/purple sky with stars and small planets; if it is underwater, use blue water with bubbles and seabed; if it is fantasy/magical, use whimsical sky with sparkles and distant castles or clouds. The background should feel like the natural habitat of the foreground subjects, never contradict them.",
    COVER_STYLE_DIRECTIVES[style],
    COVER_BORDER_DIRECTIVES[border],
    `SELLING-POINT OVERLAYS — render all four of these as graphic elements on the cover, in addition to the title. Spell every word EXACTLY as written in quotes. Keep them clearly readable, well-spaced, and never overlapping the main characters' faces.`,
    `OVERLAY DESIGN LANGUAGE — render the page-count badge (item 2), the side plaque (item 3), and the bottom strip (item 4) as physical objects that belong in this book's world, using this design language: ${overlayDesignLanguage}. The three overlays must read as a matching set — same material vibe, same color family, consistent edge treatment — not three random styles. Lettering inside each overlay stays bold capitals with enough contrast against the overlay's surface to be instantly readable from a thumbnail. The subtitle pill (item 1) is excluded from this design language; it stays a clean modern UI pill so the audience tag reads cleanly.`,
    `1) SUBTITLE PILL — directly under the main title, a horizontal rounded-rectangle pill in a deep saturated color (navy, deep teal, or burgundy) with a thin contrasting outline. Inside the pill, in clean bold sans-serif white capitals: "COLORING BOOK FOR KIDS ${ageLabel.toUpperCase()}". Pill width ~55-70% of cover width, centered.`,
    `2) PAGE-COUNT BADGE — top-right corner, a circular / seal-shaped badge (about 18-22% of cover width) styled per the overlay design language above. Inside, two stacked lines of bold rounded capitals: top line "${designsLabel.split(" ")[0]}", with the remaining words wrapped onto the line(s) below. Three small filled accent shapes (stars, dots, or a motif that fits the design language) sit under the text. Place the badge so it does NOT cover the title or any character's face.`,
    `3) SIDE PLAQUE — left side, mid-height, a small plaque / sign / banner shape (about 22-28% of cover width) styled per the overlay design language above, tilted ~5-10 degrees. Inside, three short stacked lines of friendly capitals (the first line in an accent color from the design language, the next two in the dominant readable color): "${plaqueLines[0]}" / "${plaqueLines[1]}" / "${plaqueLines[2]}". Position so it does NOT cover any character's face.`,
    `4) BOTTOM STRIP — at the very bottom of the cover, a slightly taller full-width horizontal ribbon / band styled per the overlay design language above (height ~9-12% of cover height) so it can hold TWO stacked lines of text with comfortable padding. The strip contains exactly these two lines, top to bottom: (a) one bold ALL-CAPS line of selling phrases, separated by small filled accent shapes (stars, dots, or a motif that fits the design language): "${bottomStripText}". (b) directly under it, a smaller mixed-case brand strapline in a clean italic or rounded script with a small four-point sparkle shape between the brand name and the next word: "${brandStrapline}". The strapline reads as a soft brand signature, NOT another marketing shout — about half the type-size of line (a), elegant, calmer color (cream / off-white / soft accent) so parents notice it without it competing with the main strip. Both lines are centered. Render the brand name "CrayonSparks" exactly as written, one word, capital C and capital S, no space.`,
    `Permitted text on this cover (and only this text): the title; the subtitle pill copy; the page-count badge copy; the side-plaque copy; the bottom-strip top line; the bottom-strip brand strapline. No other text anywhere — no author name, publisher, ISBN, barcode, URL, social handle, watermark, claim of being hand-drawn or handmade, or any extra marketing line beyond what is listed above.`,
    KID_SAFE_CONTENT_RULE,
    "Crisp printable quality at 300 DPI.",
  ].join(" ");
};

export const THUMBNAIL_PROMPT_TEMPLATE = (subject: string) =>
  `${subject} fully colored, bright flat cartoon colors, thick black outlines kept, no gradients, no shading, white background, small centered icon style, cheerful and simple.`;
