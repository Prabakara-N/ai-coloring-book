import { PRODUCT_NAME } from "@/lib/constants";

export type AgeRange = "toddlers" | "kids" | "tweens";
export type Detail = "simple" | "detailed" | "intricate";
export type Background = "scene" | "framed" | "minimal";

export interface PromptOptions {
  age?: AgeRange;
  detail?: Detail;
  background?: Background;
  scene?: string;
  variantSeed?: string;
  /**
   * Optional CHARACTER LOCK block extracted once from the front cover by
   * `lib/character-extractor.ts`. When present, every page enforces that
   * recurring characters are drawn EXACTLY per these descriptors so KDP
   * reviewers don't see a fat cat on the cover and a skinny cat on
   * page 7. Inject as-is into the master prompt (already formatted).
   */
  characterLock?: string;
}

const POSE_VARIANTS = [
  "facing the viewer directly with a happy smile",
  "slightly angled to the left, looking to the side",
  "slightly angled to the right, looking to the side",
  "in a gentle playful pose with a hint of motion",
  "standing or sitting naturally, relaxed and friendly",
  "tilted head, curious expression",
];

const POSITION_VARIANTS = [
  "centered on the page",
  "slightly left of center",
  "slightly right of center",
  "centered but lower on the page with more sky above",
  "centered but higher on the page with more ground below",
];

// Background variety variants — each page gets a different one (seeded by
// item.id) so a 20-page book has 20 visibly different backdrops within the
// same theme. KEY: every variant must produce a FILLED background that
// matches the theme — these are framing/feature swaps, NOT background
// suppression. Earlier versions said "no sky, no sun, no clouds" which
// fought the "fill the canvas" rule and made Gemini collapse to one safe
// default backdrop on every page.
const BACKGROUND_EMPHASIS_VARIANTS = [
  "wide-angle composition — distant horizon visible, lots of mid-ground depth, subject framed by far-off elements that fit the subject's environment",
  "close-up framing — subject large in foreground, immediate ground detail prominent, sky/upper area just a sliver at the top",
  "mid-distance composition — subject and surroundings balanced, supporting elements beside the subject AND distant scenery behind",
  "low-angle view — looking up slightly so the upper half is filled with sky/canopy/ceiling elements that match the theme, ground at the bottom",
  "side-profile landscape — horizontal strip composition, subject in motion across a long view (left to right), background stretches the full width",
  "vertical composition — emphasize a tall background element rising behind the subject, themed appropriately to the subject",
  "elevated viewpoint — looking down slightly, ground patterns more visible, subject sits on a textured surface",
  "open composition — subject centered with breathing room, supporting elements clustered to one side and distant elements opposite",
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function pickVariation(seed?: string) {
  if (!seed) {
    return {
      pose: POSE_VARIANTS[0],
      position: POSITION_VARIANTS[0],
      bgEmphasis: BACKGROUND_EMPHASIS_VARIANTS[3],
    };
  }
  const h = hash(seed);
  return {
    pose: POSE_VARIANTS[h % POSE_VARIANTS.length],
    position: POSITION_VARIANTS[Math.floor(h / 7) % POSITION_VARIANTS.length],
    bgEmphasis:
      BACKGROUND_EMPHASIS_VARIANTS[
        Math.floor(h / 49) % BACKGROUND_EMPHASIS_VARIANTS.length
      ],
  };
}

export const AGE_PRESETS: Record<AgeRange, { label: string; note: string }> = {
  toddlers: {
    label: "Toddlers (3-6)",
    note: "Large subject filling most of the foreground. Flat 2D cartoon, kid-friendly proportions, big round eyes, friendly happy expression.",
  },
  kids: {
    label: "Kids (6-10)",
    note: "Centered subject with slightly more detail. Friendly cartoon style, proportional anatomy, some secondary elements allowed (ribbons, simple accessories).",
  },
  tweens: {
    label: "Tweens (10-14)",
    note: "More detailed illustration. Balanced composition, realistic proportions, some pattern and texture detail. Still approachable line art.",
  },
};

export const DETAIL_PRESETS: Record<Detail, string> = {
  simple:
    "Thick clean black outlines only, minimal internal detail, easy to color inside.",
  detailed:
    "Medium-weight clean black outlines, moderate internal detail (texture, pattern hints), still clearly colorable.",
  intricate:
    "Fine clean black line work with intricate interior patterns, ornamental detail, mandala-style density.",
};


const ANATOMY_GUARDRAIL =
  "Anatomy must be correct and natural-looking: exactly the right number of legs, arms, ears, eyes, tail, fingers, and wings for the species — symmetrical facial features, both eyes on the face, mouth properly placed — nothing duplicated, nothing fused, nothing misaligned, nothing out of place. No extra limbs, no missing limbs.";

// Vehicles, objects, and inanimate things drawn with cartoon faces (talking
// trucks, friendly suns, character clouds) are a recurring trouble spot —
// the model often produces uneven eyes, off-center mouth, or "smudged"
// facial features. This guardrail enforces a clean, simple cartoon-face
// pattern wherever a non-living subject has a face.
const ANTHRO_FACE_GUARDRAIL =
  "If the subject is an inanimate object that has been given a cartoon face — applies whenever the subject is a non-creature thing such as a vehicle, fruit, sun, cloud, household item, or similar — the face MUST be SIMPLE and SYMMETRIC: exactly TWO equal-sized round eyes (filled black or simple circle outline), placed at the same height, evenly spaced left-and-right around the centerline, never cross-eyed and never with iris pupils that wander. ONE clearly visible mouth (a simple curved smile or open round 'O'), centered horizontally below the eyes. No eyebrows, no complex mouth shapes, no teeth detail, no crooked features. The face must look intentional and clean — like a child-friendly cartoon decal, not a smudged or distorted attempt. When the subject is a vehicle, place the face on the front grille / windshield area, not on the side.";

const ARTIFACT_GUARDRAIL =
  "ABSOLUTELY NO TEXT OR ATTRIBUTION OF ANY KIND ANYWHERE on the page. This includes: no model name (NO 'Nano', 'Banana', 'Gemini', 'AI', 'Generated by', or any vendor/product attribution text — the model must NEVER stamp its own name on the image), no letters, no numbers, no labels, no speech bubbles, no watermarks (visible or stylized), no signatures, no logos, no captions, no frames-within-frames, no page numbers, no signature dots, no glassy/translucent text overlays in any corner. Scan the four corners and bottom strip of the canvas for stray attribution text and ensure they are completely empty of letters. A single coherent illustration with ZERO text marks.";

// KDP print-ready quality directives — applied to every page.
const KDP_QUALITY_GUARDRAIL =
  "KDP print-ready quality: 100% pure black ink lines on 100% pure white page background. No solid black fills anywhere on the page — not on the subject's body parts (no all-black paw, leg, mane, tail), not on the sky, not on the ground, not on any prop. No gray shading, no halftones, no hatching, no stippling, no cross-hatch, no near-black tones, no near-white tones. No gradients of any kind: no atmospheric gradient near the page edges, no soft gray haze under the subject, no shadow gradient on the ground, no vignette around the artwork, no gray fog at the bottom or sides. The space between the printer's outer rectangle and the artwork is PURE WHITE — never a faded or grayish tint. The ground is rendered as a single thin line plus optional small detail (grass tufts / sand dots / floor lines), never as a shaded gray area. No silhouette / negative-space drawing (the page is never an inverted dark scene with white outlines — black is the line color, white is the background, always). Every line is a closed crisp continuous stroke — no broken lines, no gaps, no double lines. All shapes are fully enclosed by their outlines so a child can color them in cleanly without color spilling out. Consistent thick uniform line weight throughout the page (~3pt at print size). High-resolution, vector-clean appearance.";

// CRITICAL — repeat the color rule with absolute clarity at the END of the
// prompt. Scene/subject text often mentions colors ("golden grasses", "blue
// sky", "green trees", "brown fox") for identification — Gemini occasionally
// interprets those as fill instructions and emits a partly-colored image.
// This override is the LAST thing the model reads.
const FINAL_BW_OVERRIDE =
  "🚫 ABSOLUTE COLOR OVERRIDE — READ THIS LAST: This image MUST be 100% pure black-and-white line art ONLY. Even though the subject and scene descriptions above mention colors (golden, blue, green, brown, red, pink, yellow, orange, etc.), those color words are for IDENTIFICATION ONLY — they describe what the subject IS in real life, NOT what to paint. The actual generated image contains ZERO color, ZERO shading, ZERO gray fills, ZERO gradients. Pure white background, pure black outlines. If you are about to add any color or any non-black non-white pixel anywhere — STOP and remove it. The output is a coloring page for a child to color in themselves.";

const STYLE_CONSISTENCY =
  "Maintain a consistent cartoon style across the whole book: same line weight, same eye style (round friendly), same proportions philosophy, same level of detail. This page must look like a sibling of the other pages in the same book.";

// IMPORTANT: the scene should EXTEND to all four edges of the canvas like
// a real printed coloring-book page (think: cow standing in a field with
// barn + sky reaching every edge; pig in a meadow with trees + sun + fence
// reaching every edge). NO empty white margin around the scene. Only
// PRINTER-SAFE detail rule: keep critical features (eyes, mouth, faces,
// small text-like elements) at least 4% away from the absolute edge so a
// 2% trim variance during binding doesn't crop them off — but background
// elements (grass, sky, hills, water, foliage) SHOULD reach the page edge.
const FILL_CANVAS_RULE =
  "FILL THE ENTIRE CANVAS EDGE-TO-EDGE: the illustration extends to all four edges of the page like a printed picture-book scene. Whatever supporting elements belong to the subject's environment fill the canvas to the edges. Do not leave empty white margin around the artwork; do not contract the scene into the center with white space around it. Printer-safety: keep critical detail (the main character's face, eyes, mouth, tiny features) at least 4% away from the absolute edge so a binding-trim variance doesn't crop them off. Background elements MUST reach all the way to the page edge — pick whichever elements fit the subject's environment, never default to grass / hills / tree branches / clouds unless the subject lives in that kind of setting.";

// Used by the "minimal" / "framed" presets where the subject sits on
// mostly-white (not an edge-to-edge scene). Keeps essential features
// inside a generous central area without forcing background to the edges
// (since there isn't one).
const PRINT_TRIM_SAFETY_RULE =
  "PRINTER TRIM SAFETY: Keep the subject's critical features (face, eyes, hands, paws, tail tip) at least 5% inside from every edge of the page so a small binding-trim variance doesn't crop them. The subject silhouette should not bump directly into the page edge.";

// SINGLE source of truth for the printed page outline. Compressed to one
// concise rule on purpose — earlier versions repeated "border" 13+ times
// in one paragraph and the model started drawing two of them. KDP-framed:
// the inset and trim safety align with KDP's printer-safe interior spec.
const DRAW_BORDER_RULE =
  "📐 PAGE FRAME (KDP printer-safe rule, applies once — DO NOT REPEAT): Draw exactly ONE thin solid black rectangular outline at 3% inset from each page edge. Line weight ~1.5px, uniform thickness, four 90° corners, plain rectangle only. NO ornaments, NO rounded corners, NO decorative flourishes, NO double lines, NO second inset rectangle inside the first — if you start to draw a second one, stop. Keep all artwork inside this outline with ~4% buffer; nothing touches or crosses it. Identical position and thickness on every page in the book.";

// Locks the LOOK of common scene elements when (and only when) they actually
// belong in the scene. Critically does NOT mandate that they appear — only
// describes how to draw them IF the scene calls for them. Without this
// "IF/ONLY" framing, Gemini was adding sun+clouds to every page including
// underwater, indoor, space, and night scenes.
const COMMON_ELEMENT_STYLE =
  "STYLE LOCK FOR COMMON ELEMENTS — IMPORTANT: Do NOT add scene elements that are not explicitly listed in the scene description above. Do not invent a sun, sky, clouds, ground, trees, road, or any other backdrop element if the scene description does not call for them. If the scene is underwater → no sun/clouds, draw water and seabed instead. If indoor → no sun/clouds, draw walls/floor instead. If space/night → no sun, draw stars/moon. ⚠️ NEVER draw BOTH a sun AND a moon in the same scene — they cannot coexist. Day scene = sun only (no moon, no stars). Night scene = moon and/or stars only (no sun). If the scene description doesn't specify time of day, default to DAY (sun, no moon). ONLY IF the scene description explicitly mentions these elements, render them as: SUN = a plain simple circle with exactly 8 short straight evenly-spaced rays, NO face, NO smile, NO eyes; CLOUDS = simple rounded bumpy outlined shapes with no detail inside; GROUND = a single short horizontal line with at most 2 small grass tufts; TREES = simple rounded bushy crown on a straight trunk; ROAD = two parallel straight lines. Never decorate these supporting elements with faces or expressions — they are background only.";

const KID_SAFE_CONTENT_RULE =
  "Kid-safe: every creature, plant, and object is a round, smiling, friendly cartoon — would pass a parent's bedtime test for a 4-year-old. No realistic-anatomy detail on any object (no organ-like shapes, vein/intestine textures, brain-coral lookalikes); no skulls, bones, blood, scars, fangs, snarls, hunting scenes; no weapons of any kind (replace swords/guns with flags, shields, treasure); no fire/destruction, dead trees with face-like knots, hollow or glowing eyes; no medical/dental/surgical imagery, graveyards, frightening ghosts/demons; no religious or political symbols (crosses, swastikas, national flags); no alcohol/cigarettes/drugs; nothing sexual or suggestive. When a brief implies any of the above, swap to a kid-safe alternative (shark teeth → closed smile, sword → flag, cracked tree → healthy tree).";

// Five load-bearing rules stated once. Repetition was actively hurting
// compliance — the prior version mentioned "draw one border" 3-4 times
// and the model started drawing two nested borders.
const ANCHOR =
  "Five rules to obey: " +
  "(1) Pure black-and-white LINE ART only — thin black outlines on a 100% white page. " +
  "    No solid black fills (a paw, leg, body, hair, sky, or any other region must NEVER be filled solid black). " +
  "    No gray shading, no halftones, no hatching, no stippling, no cross-hatch, no spot-blacks, no silhouettes. " +
  "    No white-on-black inversion (the page is NEVER a black sky / black background with white drawings — even for night, space, or outer-space scenes the rule is reversed: draw black outlines of stars, moon, planets on the white page, NOT a black background with white stars). " +
  "    Color words in the brief refer to the subject's identity (a 'black cat', a 'red barn'), never to actual ink — render them as outlines only, the kid colors them. " +
  "(2) The scene fills the canvas edge-to-edge — no empty white margin around the artwork. " +
  "(3) The single main subject is 50-65% of the page (large, dominant, same scale on every page); the rest of the canvas is themed background, not white space. " +
  "(4) Each named character appears exactly once per page. Crowds are simple small silhouettes without detailed faces — never repeat the hero. " +
  "(5) Only the named subject is drawn as a character. No partial creatures (tails, ears, paws, manes) peeking from the background — the background is environment only.";

/**
 * Static guardrails block — pass via Gemini's `systemInstruction` so the
 * model implicitly caches the prefix across page calls (Gemini 2.5+
 * implicit caching kicks in at ~1024 stable tokens). Per-page dynamic
 * content (subject, scene, variation, character lock) goes in the user
 * prompt built by {@link MASTER_PROMPT_USER}.
 */
export const MASTER_PROMPT_SYSTEM = [
  "You generate single-page illustrations for premium Amazon KDP children's coloring books. Every page must be print-ready KDP quality.",
  ANCHOR,
  DRAW_BORDER_RULE,
  FILL_CANVAS_RULE,
  COMMON_ELEMENT_STYLE,
  KID_SAFE_CONTENT_RULE,
  ANATOMY_GUARDRAIL,
  ANTHRO_FACE_GUARDRAIL,
  KDP_QUALITY_GUARDRAIL,
  STYLE_CONSISTENCY,
  ARTIFACT_GUARDRAIL,
  "Output: a print-ready KDP coloring page. Every line purposeful, premium hand-illustrated cartoon look.",
].join(" ");

/**
 * Per-page dynamic content. Pair with {@link MASTER_PROMPT_SYSTEM} when
 * caching is desired. The standalone {@link MASTER_PROMPT_TEMPLATE} stitches
 * both together for callers that want a single string.
 */
export const MASTER_PROMPT_USER = (
  subject: string,
  opts: PromptOptions = {},
): string => {
  const age = opts.age ?? "toddlers";
  const detail = opts.detail ?? "simple";
  const background = opts.background ?? "scene";
  const scene = opts.scene?.trim() || null;
  const agePreset = AGE_PRESETS[age];
  const variation = pickVariation(opts.variantSeed);
  const characterLock = opts.characterLock?.trim();

  const preamble =
    age === "tweens"
      ? "Tween coloring book page."
      : "Kids coloring book page.";

  const parts: string[] = [preamble];
  if (characterLock) parts.push(characterLock);

  if (background === "scene") {
    parts.push(
      `Page subject (the only character drawn on this page): ${subject}. ${variation.pose}, positioned ${variation.position}. Occupies 50-65% of the page area — large, dominant, instantly recognizable.`,
      `Subject identity rule (load-bearing): draw exactly the subject named above and nothing else as a character. If the subject names an animal, an object, or a creature, that is what appears — do not substitute or add the cover's hero / mascot / human character unless the subject line literally names them. The character lock block (if present above) describes the visual style of recurring characters when they actually appear by name; it never adds them to a page that doesn't name them.`,
      scene
        ? `Background scene (4-6 elements, pick from "${scene}"): only use elements from that theme line that genuinely fit the subject's natural environment. Distribute across the canvas (sky elements top, ground bottom, mid-ground beside the subject). ${variation.bgEmphasis}. Background never overlaps the subject's face.`
        : `Background scene (4-6 elements): derive them yourself from the subject's own natural habitat. Match the elements to where the subject would actually be found. Distribute across the canvas (upper area at the top, ground at the bottom, mid-ground beside the subject). ${variation.bgEmphasis}. Background never overlaps the subject's face.`,
      `No-default-environment rule: do not insert trees, forest, hills, grass, sun, or clouds by default. Only include them if the theme line explicitly calls for them or the subject literally lives there. A superhero / city / vehicle / space / underwater / indoor / nighttime / abstract / mythology subject does not get trees in the background unless the brief said so.`,
      `No decorative-frame rule (this is a scene-mode page, NOT framed mode): do NOT draw a decorative floral wreath, leafy garland, vine arch, flower border, branch corners, or any ornamental motif framing the page edges. The page edges have ONLY the printer's plain rectangular border (drawn separately). Foliage / flowers may appear as background scenery sized appropriately within the scene, never as a corner ornament or top-of-page decorative arch.`,
      `Per-page variety (each page must look different): rotate the element mix and the sub-location every page so two pages of the book never share the same layout. Approach for THIS page: keep the book's overall theme, but pick a different sub-location, a different framing, and a different combination of supporting elements than the previous page. Use the variation framing instruction above as the anchor for what's different this time. If the previous page had element X as its signature, swap X out and bring in something else from the theme. If a chain-reference image is attached, use it ONLY for line-art style and recurring-character look — never copy its specific scene composition or background layout.`,
      `Thematic fit (strict): every background element must belong to the subject's actual environment. Test each element with one question: "would this naturally exist where this subject lives?" If the answer is no, omit it. Wrong-environment elements never appear on the page even if the cover or a previous page used them.`,
      "Restraint: total element count is 5-7 (subject + background). Fewer well-placed elements beats a busy page. No scattered sparkles, tiny hearts, dot textures, or sticker-like decorations.",
      "Ground line: a clear ground or surface (grass, sand, water, rooftop, floor — whatever fits the scene) extending across the page; the subject is never floating in white.",
      DETAIL_PRESETS[detail],
    );
  } else if (background === "framed") {
    parts.push(
      "Decorative patterned border frame around the entire page (flowers, stars, vines, or geometric repeats fitting the subject). The decorative border replaces the standard rectangle and follows the same line-quality rules.",
      "Per-page frame variety: the decorative pattern stays in the same family across the book, but each page rearranges or substitutes specific motifs so two pages never share an identical frame. The motif family is chosen to fit THIS book's subject (florals, geometric shapes, stars, abstract lines, era-appropriate ornaments — pick what suits the theme). If a chain-reference page is attached, copy only its line weight and overall density — never its exact motif placement.",
      `Subject: a single cute friendly ${subject} occupying at least 60% of the area inside the frame. ${variation.pose}, positioned ${variation.position}.`,
      PRINT_TRIM_SAFETY_RULE,
      DETAIL_PRESETS[detail],
    );
  } else {
    parts.push(
      `Subject: a single cute friendly ${subject} filling 70-85% of the page, centered. ${variation.pose}.`,
      PRINT_TRIM_SAFETY_RULE,
      DETAIL_PRESETS[detail],
      "Pure white background, no scene elements, just the subject.",
    );
  }

  parts.push(agePreset.note);
  return parts.join(" ");
};

/**
 * Backward-compatible single-string template. Concatenates the static
 * guardrails (system) and the dynamic per-page content (user). Prefer the
 * split form ({@link MASTER_PROMPT_SYSTEM} + {@link MASTER_PROMPT_USER})
 * when calling Gemini, so the static prefix triggers implicit caching.
 */
export const MASTER_PROMPT_TEMPLATE = (
  subject: string,
  opts: PromptOptions = {},
) => {
  return `${MASTER_PROMPT_SYSTEM} ${MASTER_PROMPT_USER(subject, opts)}`;
};

export type CoverStyle = "flat" | "illustrated";
export type CoverBorder = "framed" | "bleed";

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

/**
 * "This book belongs to" nameplate page generated automatically right after
 * the front cover. Composition: a decorative banner / nameplate centered on
 * the page with "This book belongs to:" in elegant lettering above a bold
 * blank writing line. Two of the book's main characters peek from the
 * left and right corners. Comes in two styles:
 *   - "bw"    → pure black-and-white line art so the kid can color it too
 *   - "color" → fully colored decorative page (parent fills the name in pen)
 */
export type BelongsToStyle = "bw" | "color";

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

/**
 * REFERENCE-LED prompt — used when the user uploads a reference image.
 *
 * The style extractor (gpt-4o-mini Vision) generates a textual description
 * of the reference (line weight, character proportions, scene density,
 * subject prominence, etc.). This template gives that description full
 * authority and DROPS the strict size/background rules from the master
 * prompt that often contradict the reference.
 *
 * Only ABSOLUTE rules remain: pure B&W, anatomy correct, no text / borders
 * / page numbers. Everything else is delegated to the reference style.
 */
export const REFERENCE_LED_PROMPT_TEMPLATE = (
  subject: string,
  styleDescription: string,
  opts: { age?: AgeRange } = {},
): string => {
  const age = opts.age ?? "toddlers";
  const agePreset = AGE_PRESETS[age];
  const preamble =
    age === "tweens"
      ? "Tween coloring book page."
      : "Kids coloring book page.";

  return [
    preamble,
    `Subject: ${subject}.`,
    `Reference is style inspiration only, not a scene template. A reference image is attached alongside this style description: "${styleDescription}". Use the reference for line weight, stroke style, character rendering, and pattern density only — not for the subject, scene, props, or composition.`,
    `Background: generate fresh from ${subject}'s actual natural environment, not the reference's. Pick 4-6 background elements that genuinely fit where ${subject} would be found. Scene reaches all four page edges — no empty white margin. Vary composition page-to-page so the book isn't repetitive.`,
    `Thematic fit (strict): every background element belongs to ${subject}'s environment. If the reference shows elements that don't fit, ignore them.`,
    `Subject placement: ${subject} fills 50-65% of the page; the rest is filled with the subject-appropriate background.`,
    ANATOMY_GUARDRAIL,
    ANTHRO_FACE_GUARDRAIL,
    KID_SAFE_CONTENT_RULE,
    "Output is pure black-and-white line art (the reference may be colored — the output is not). Clean closed continuous strokes a child can color inside.",
    ARTIFACT_GUARDRAIL,
    "No borders or frames around the page. No page numbers. No author signatures or watermarks.",
    agePreset.note,
    `Output: a printable KDP coloring page that borrows the reference's line-art style but inhabits a fresh ${subject}-appropriate scene.`,
  ].join(" ");
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

/**
 * Prefix prepended to the master/back-cover/cover prompt when the user
 * uploads a reference image and the style extractor returns a description.
 * Each builder returns a single string the route concatenates onto the
 * already-built `text`. Centralized here so the API route stays free of
 * inline prompt prose and the registry can track these.
 */
export const STYLE_REFERENCE_PROMPT = (styleDescription: string): string =>
  `Apply the following art style to a brand-new illustration of the subject below: "${styleDescription}". The style description was extracted from a reference image the user uploaded. Adopt only the visual style — line weight, palette, character rendering polish, pattern density. Do not copy specific scene elements, composition, or characters from the reference.`;

export const BACK_COVER_COLOR_ANCHOR_PROMPT = (
  styleDescription: string,
): string =>
  `A reference image of the front cover is attached. Use the same dominant background color family on the back cover (study the attached image to identify it). Style description from vision analysis: "${styleDescription}". Adopt that style, but the back cover stays minimal layout — colored background plus tagline plus barcode strip, never a copy of the front. Use the front cover only for color matching, never for content.`;

export const BACK_COVER_COLOR_ANCHOR_FALLBACK_PROMPT =
  "A reference image of the front cover is attached. Match its dominant background color exactly on the back cover.";

export const REFERENCE_ANALYSIS_FAILED_NOTE =
  "(Note: a reference image was provided but could not be analyzed.)";

export const RAW_REFERENCE_NOTE =
  "Reference image is provided as visual inspiration. Use its style and composition.";

/**
 * Cross-page consistency anchor used when an interior page is generated
 * with a previous page and/or the cover attached as visual references.
 * Border geometry is intentionally NOT restated here — DRAW_BORDER_RULE
 * already covers it once in MASTER_PROMPT_SYSTEM. Saying it twice was the
 * "draw two borders" failure pattern.
 */
export const CONSISTENCY_ANCHOR_PROMPT = (refLabel: string): string =>
  [
    `Consistency anchor — ${refLabel}. Match these three dimensions and these three only:`,
    "1. Recurring characters: any character that appears in the reference(s) is drawn identical here — same species, same body proportions (chubby vs skinny), same head/face shape, same fur/mane/tail style, same markings, same color. If the cover is attached, the cover is the ground truth for character design.",
    "2. Page-frame inset and stroke thickness (interior reference only): the rectangular outline matches the reference's position and weight. Decorative motifs that sat inside or around that rectangle on the prior page (vines, flowers, stars, hearts, dots, scattered shapes) are page-specific and do not carry over.",
    "3. Line-art style: line weight, character rendering polish, and overall density should feel like a sibling page.",
    "Everything else is fresh: a new scene, new background elements, new props, new composition. Do not reuse the prior page's tree positions, hill silhouettes, sun placement, scattered ornaments, or border decorations. Two pages with identical decorations make the book feel duplicated.",
  ].join("\n\n");

export interface ColoringPrompt {
  id: string;
  name: string;
  subject: string;
}

export interface ColoringCategory {
  slug: string;
  number: number;
  name: string;
  icon: string;
  description: string;
  scene: string;
  coverScene: string;
  coverTitle: string;
  kdp: {
    title: string;
    description: string;
    keywords: string[];
    coverPrompt: string;
  };
  prompts: ColoringPrompt[];
}

export const CATEGORIES: ColoringCategory[] = [
  {
    slug: "farm-animals",
    number: 1,
    name: "Farm Animals",
    icon: "🐄",
    description: "20 barnyard favorites — cows, pigs, ducks, sheep & more",
    scene:
      "a pastoral farm landscape with a red barn and silo in the distance, rolling green hills, a simple wooden fence, a plain sun and fluffy clouds in the sky, plus scattered flowers and tufts of grass on the ground",
    coverScene:
      "a happy cartoon cow with a cowbell, a smiling pink pig, and a yellow duckling standing together in front of a red barn, with a green pasture, white picket fence, and a few flowers around them",
    coverTitle: "Farm Animals Coloring Book",
    kdp: {
      title:
        "Farm Animals Coloring Book for Kids Ages 3-6: 20 Big & Simple Drawings | Single-Sided Pages",
      description:
        "A fun first coloring book for toddlers and preschoolers who love farm animals! 20 large, kid-friendly line drawings of cows, pigs, ducks, sheep, horses, chickens, rabbits, and more barnyard favorites.",
      keywords: [
        "farm animals coloring book kids",
        "toddler coloring book ages 3-6",
        "preschool coloring book animals",
        "cow pig duck coloring book",
        "big and simple coloring book",
        "single sided coloring book kids",
        "homeschool activity book preschool",
      ],
      coverPrompt:
        "Happy cartoon cow, pig and duck standing together on a farm with barn and sun in background.",
    },
    prompts: [
      {
        id: "1.01",
        name: "Cow",
        subject: "happy cow standing in a farm field",
      },
      {
        id: "1.02",
        name: "Pig",
        subject: "smiling pig sitting with curly tail",
      },
      { id: "1.03", name: "Sheep", subject: "fluffy sheep grazing on grass" },
      {
        id: "1.04",
        name: "Horse",
        subject: "cute horse trotting with flowing mane",
      },
      { id: "1.05", name: "Duck", subject: "waddling duck with open beak" },
      { id: "1.06", name: "Chicken", subject: "chicken pecking at the ground" },
      { id: "1.07", name: "Goat", subject: "friendly goat with small horns" },
      {
        id: "1.08",
        name: "Rooster",
        subject: "rooster crowing with tail feathers",
      },
      {
        id: "1.09",
        name: "Rabbit",
        subject: "rabbit with long floppy ears and short tail",
      },
      { id: "1.10", name: "Donkey", subject: "donkey standing with long ears" },
      {
        id: "1.11",
        name: "Turkey",
        subject: "turkey with tail feathers fanned out",
      },
      { id: "1.12", name: "Goose", subject: "goose walking with long neck" },
      { id: "1.13", name: "Llama", subject: "llama standing with fluffy coat" },
      { id: "1.14", name: "Piglet", subject: "tiny piglet with curly tail" },
      { id: "1.15", name: "Calf", subject: "baby cow with spotted body" },
      { id: "1.16", name: "Lamb", subject: "baby sheep with fluffy wool" },
      { id: "1.17", name: "Foal", subject: "baby horse with long legs" },
      {
        id: "1.18",
        name: "Chick",
        subject: "fluffy yellow chick hatching from egg",
      },
      { id: "1.19", name: "Sheepdog", subject: "farm dog with wagging tail" },
      { id: "1.20", name: "Farm Cat", subject: "cat sitting on a hay bale" },
    ],
  },
  {
    slug: "wild-animals",
    number: 2,
    name: "Wild Animals",
    icon: "🦁",
    description: "20 jungle & safari drawings — lion, tiger, elephant & more",
    scene:
      "an African savanna and jungle scene with acacia trees, tall grass, rolling hills in the distance, a warm sun and wispy clouds, plus a few rocks and scattered leaves on the ground",
    coverScene:
      "a cheerful cartoon lion with a fluffy mane, a smiling tiger with stripes, a happy elephant with a raised trunk, and a friendly giraffe together in a colorful jungle with palm trees",
    coverTitle: "Wild Animals Coloring Book",
    kdp: {
      title:
        "Wild Animals Coloring Book for Kids Ages 3-6: 20 Jungle & Safari Drawings | Lion, Tiger, Elephant",
      description:
        "Take your little one on a safari adventure with 20 big, friendly wild animal drawings! Features lions, tigers, elephants, giraffes, zebras, monkeys, pandas, kangaroos, and more jungle favorites.",
      keywords: [
        "wild animals coloring book kids",
        "jungle animals coloring book toddler",
        "safari coloring book ages 3-6",
        "lion tiger elephant coloring book",
        "zoo animals coloring book preschool",
        "single sided animal coloring book",
        "big simple coloring book boys girls",
      ],
      coverPrompt:
        "Happy cartoon lion, tiger, elephant and giraffe together in a jungle scene with trees and sun.",
    },
    prompts: [
      {
        id: "2.01",
        name: "Lion",
        subject: "friendly lion with big fluffy mane",
      },
      {
        id: "2.02",
        name: "Tiger",
        subject: "tiger with cartoon stripes and smile",
      },
      {
        id: "2.03",
        name: "Elephant",
        subject: "elephant with trunk raised up",
      },
      {
        id: "2.04",
        name: "Giraffe",
        subject: "tall giraffe with simple spot patterns",
      },
      { id: "2.05", name: "Zebra", subject: "zebra standing with stripes" },
      {
        id: "2.06",
        name: "Monkey",
        subject: "monkey sitting on a tree branch",
      },
      {
        id: "2.07",
        name: "Bear",
        subject: "chubby bear standing on hind legs",
      },
      { id: "2.08", name: "Panda", subject: "panda eating bamboo, sitting" },
      {
        id: "2.09",
        name: "Kangaroo",
        subject: "kangaroo with baby joey in pouch",
      },
      {
        id: "2.10",
        name: "Hippopotamus",
        subject: "big happy hippo with open mouth",
      },
      { id: "2.11", name: "Rhinoceros", subject: "rhino with single horn" },
      { id: "2.12", name: "Cheetah", subject: "running cheetah with spots" },
      {
        id: "2.13",
        name: "Leopard",
        subject: "leopard resting with spot pattern",
      },
      { id: "2.14", name: "Gorilla", subject: "friendly gorilla sitting" },
      { id: "2.15", name: "Wolf", subject: "wolf howling at the moon" },
      { id: "2.16", name: "Fox", subject: "fox sitting with bushy tail" },
      { id: "2.17", name: "Koala", subject: "koala hugging a tree branch" },
      { id: "2.18", name: "Sloth", subject: "sloth hanging from a branch" },
      { id: "2.19", name: "Deer", subject: "deer with small antlers" },
      { id: "2.20", name: "Squirrel", subject: "squirrel holding an acorn" },
    ],
  },
  {
    slug: "sea-creatures",
    number: 3,
    name: "Sea Creatures",
    icon: "🐬",
    description: "20 ocean animals — fish, dolphin, octopus & more",
    scene:
      "an underwater ocean scene with swaying seaweed, a few coral formations, rising bubbles, sandy ocean floor, and gentle wave lines at the surface",
    coverScene:
      "a smiling dolphin jumping out of the water, a cheerful orange clownfish, a friendly purple octopus, and a green sea turtle swimming together among bubbles and colorful coral",
    coverTitle: "Sea Creatures Coloring Book",
    kdp: {
      title:
        "Sea Creatures Coloring Book for Kids Ages 3-6: 20 Ocean Animals | Fish, Dolphin, Octopus & More",
      description:
        "Dive into the ocean with this underwater adventure coloring book! 20 big, kid-friendly line drawings of fish, dolphins, octopuses, turtles, whales, starfish, seahorses, and other ocean creatures.",
      keywords: [
        "sea creatures coloring book kids",
        "ocean animals coloring book toddler",
        "under the sea coloring book preschool",
        "fish dolphin octopus coloring book",
        "marine animals coloring book ages 3-6",
        "single sided ocean coloring book",
        "beach vacation activity book kids",
      ],
      coverPrompt:
        "Happy cartoon fish, dolphin, octopus and sea turtle swimming together underwater with bubbles and seaweed.",
    },
    prompts: [
      { id: "3.01", name: "Fish", subject: "cute fish swimming with bubble" },
      {
        id: "3.02",
        name: "Octopus",
        subject: "octopus with eight curly tentacles",
      },
      { id: "3.03", name: "Crab", subject: "crab with big friendly claws" },
      { id: "3.04", name: "Shark", subject: "smiling friendly shark" },
      { id: "3.05", name: "Dolphin", subject: "dolphin jumping out of water" },
      {
        id: "3.06",
        name: "Sea Turtle",
        subject: "sea turtle with patterned shell",
      },
      { id: "3.07", name: "Seahorse", subject: "seahorse with curled tail" },
      {
        id: "3.08",
        name: "Jellyfish",
        subject: "jellyfish with flowing tentacles",
      },
      {
        id: "3.09",
        name: "Starfish",
        subject: "five-pointed starfish with smile",
      },
      { id: "3.10", name: "Whale", subject: "whale with water spout" },
      { id: "3.11", name: "Puffer Fish", subject: "puffer fish all puffed up" },
      { id: "3.12", name: "Lobster", subject: "lobster with big claws" },
      { id: "3.13", name: "Clownfish", subject: "striped clownfish swimming" },
      { id: "3.14", name: "Eel", subject: "wavy eel with long body" },
      { id: "3.15", name: "Angelfish", subject: "angelfish with long fins" },
      { id: "3.16", name: "Manta Ray", subject: "manta ray with wide wings" },
      { id: "3.17", name: "Walrus", subject: "walrus with long tusks" },
      { id: "3.18", name: "Penguin", subject: "penguin standing on ice" },
      {
        id: "3.19",
        name: "Sea Otter",
        subject: "sea otter floating on back holding a shell",
      },
      { id: "3.20", name: "Narwhal", subject: "narwhal with spiral horn" },
    ],
  },
  {
    slug: "birds",
    number: 4,
    name: "Birds",
    icon: "🦜",
    description: "20 colorful birds — peacock, parrot, owl & more",
    scene:
      "a garden scene with a tree branch, a few leaves, small flowers below, and fluffy clouds and a plain sun in the sky",
    coverScene:
      "a colorful parrot on a branch, a peacock showing its tail feathers, and a wise-looking owl together in a flower garden with a rainbow",
    coverTitle: "Birds Coloring Book",
    kdp: {
      title:
        "Birds Coloring Book for Kids Ages 3-6: 20 Colorful Bird Drawings | Peacock, Parrot, Owl & More",
      description:
        "A beautiful first bird-watching coloring book for young children! Features 20 big, simple drawings of parrots, peacocks, owls, eagles, swans, flamingos, toucans, hummingbirds, and more feathered friends.",
      keywords: [
        "birds coloring book kids",
        "bird coloring book toddler ages 3-6",
        "peacock parrot owl coloring book",
        "nature coloring book preschool",
        "easy bird coloring book big lines",
        "single sided bird coloring book",
        "bird watching activity book kids",
      ],
      coverPrompt:
        "Happy cartoon peacock, parrot and owl together in a colorful garden with flowers.",
    },
    prompts: [
      {
        id: "4.01",
        name: "Parrot",
        subject: "colorful parrot on a branch (in line art)",
      },
      {
        id: "4.02",
        name: "Peacock",
        subject: "peacock with tail feathers fanned out",
      },
      {
        id: "4.03",
        name: "Owl",
        subject: "owl with big round eyes on a branch",
      },
      { id: "4.04", name: "Eagle", subject: "eagle with spread wings" },
      { id: "4.05", name: "Swan", subject: "elegant swan swimming" },
      { id: "4.06", name: "Flamingo", subject: "flamingo standing on one leg" },
      { id: "4.07", name: "Toucan", subject: "toucan with big colorful beak" },
      {
        id: "4.08",
        name: "Hummingbird",
        subject: "tiny hummingbird near a flower",
      },
      { id: "4.09", name: "Robin", subject: "robin bird with a worm" },
      { id: "4.10", name: "Sparrow", subject: "small sparrow on a branch" },
      { id: "4.11", name: "Crow", subject: "crow sitting on a fence" },
      { id: "4.12", name: "Woodpecker", subject: "woodpecker on a tree trunk" },
      { id: "4.13", name: "Pigeon", subject: "pigeon standing on a rooftop" },
      {
        id: "4.14",
        name: "Cardinal",
        subject: "cardinal bird on a snowy branch",
      },
      { id: "4.15", name: "Bluejay", subject: "bluejay with head crest" },
      {
        id: "4.16",
        name: "Ostrich",
        subject: "ostrich with long legs and neck",
      },
      {
        id: "4.17",
        name: "Kingfisher",
        subject: "kingfisher diving toward water",
      },
      { id: "4.18", name: "Duckling", subject: "baby duckling waddling" },
      { id: "4.19", name: "Pelican", subject: "pelican with big bill" },
      { id: "4.20", name: "Seagull", subject: "seagull flying over waves" },
    ],
  },
  {
    slug: "insects-bugs",
    number: 5,
    name: "Insects & Bugs",
    icon: "🦋",
    description: "20 garden bugs — butterfly, ladybug, bee & more",
    scene:
      "a cheerful garden scene with tall flowers, blades of grass, a few leaves, small mushrooms, a flying butterfly in the distance, and fluffy clouds and a plain sun",
    coverScene:
      "a colorful butterfly, a red ladybug with black spots, and a yellow-and-black striped bee together flying over a garden full of flowers and tall grass",
    coverTitle: "Bugs & Insects Coloring Book",
    kdp: {
      title:
        "Bugs & Insects Coloring Book for Kids Ages 3-6: 20 Fun Drawings | Butterfly, Ladybug, Bee & More",
      description:
        "Discover the tiny world of bugs and insects! 20 big, friendly drawings of butterflies, bees, ladybugs, ants, caterpillars, dragonflies, spiders, and more garden creatures.",
      keywords: [
        "bugs coloring book kids",
        "insects coloring book ages 3-6",
        "butterfly ladybug bee coloring book",
        "garden bugs coloring book toddler",
        "nature insects coloring book preschool",
        "single sided bug coloring book",
        "easy coloring book big outlines kids",
      ],
      coverPrompt:
        "Happy cartoon butterfly, ladybug and bee flying in a garden with flowers and grass.",
    },
    prompts: [
      {
        id: "5.01",
        name: "Butterfly",
        subject: "butterfly with patterned wings",
      },
      {
        id: "5.02",
        name: "Honey Bee",
        subject: "striped honey bee with round body",
      },
      { id: "5.03", name: "Ladybug", subject: "ladybug with spots on shell" },
      { id: "5.04", name: "Ant", subject: "ant carrying a leaf" },
      {
        id: "5.05",
        name: "Caterpillar",
        subject: "segmented caterpillar inching on leaf",
      },
      { id: "5.06", name: "Dragonfly", subject: "dragonfly with long wings" },
      {
        id: "5.07",
        name: "Grasshopper",
        subject: "grasshopper with long jumping legs",
      },
      {
        id: "5.08",
        name: "Cricket",
        subject: "cricket sitting on a blade of grass",
      },
      { id: "5.09", name: "Beetle", subject: "beetle with hard shiny shell" },
      { id: "5.10", name: "Spider", subject: "friendly spider on a web" },
      { id: "5.11", name: "Firefly", subject: "firefly with glowing tail" },
      { id: "5.12", name: "Moth", subject: "moth with spread wings" },
      {
        id: "5.13",
        name: "Bumblebee",
        subject: "fluffy bumblebee carrying flower",
      },
      { id: "5.14", name: "Snail", subject: "snail with spiral shell" },
      { id: "5.15", name: "Worm", subject: "wiggling earthworm" },
      {
        id: "5.16",
        name: "Centipede",
        subject: "centipede with many tiny legs",
      },
      {
        id: "5.17",
        name: "Praying Mantis",
        subject: "praying mantis with folded arms",
      },
      { id: "5.18", name: "Wasp", subject: "wasp with striped body" },
      {
        id: "5.19",
        name: "Stag Beetle",
        subject: "stag beetle with big pincers",
      },
      { id: "5.20", name: "Glow Worm", subject: "bright glow worm at night" },
    ],
  },
  {
    slug: "vehicles",
    number: 6,
    name: "Vehicles",
    icon: "🚒",
    description: "20 trucks, cars & trains — big & easy drawings",
    scene:
      "a simple town scene with a road, a few cartoon buildings in the distance, road signs, trees along the sidewalk, and a sky with a plain sun and fluffy clouds",
    coverScene:
      "a red fire truck with a ladder, a yellow school bus with windows full of kids, and a red race car on a sunny road, with cartoon city buildings behind them",
    coverTitle: "Vehicles Coloring Book",
    kdp: {
      title:
        "Vehicles Coloring Book for Kids Ages 3-6: 20 Trucks, Cars & Trains | Big & Easy Drawings",
      description:
        "The ultimate coloring book for little vehicle fans! 20 big, exciting drawings of cars, trucks, fire engines, school buses, trains, airplanes, helicopters, tractors, monster trucks, and more.",
      keywords: [
        "vehicles coloring book kids",
        "trucks cars coloring book toddler",
        "fire truck police car coloring book",
        "transportation coloring book ages 3-6",
        "boys coloring book vehicles big lines",
        "single sided truck coloring book",
        "construction vehicles coloring book kids",
      ],
      coverPrompt:
        "Happy cartoon fire truck, school bus and race car together on a sunny road with city buildings behind.",
    },
    prompts: [
      {
        id: "6.01",
        name: "Car",
        subject: "cartoon sedan car with headlight eyes",
      },
      {
        id: "6.02",
        name: "School Bus",
        subject: "yellow school bus with windows",
      },
      { id: "6.03", name: "Dump Truck", subject: "dump truck with raised bed" },
      { id: "6.04", name: "Train", subject: "steam locomotive with smoke" },
      {
        id: "6.05",
        name: "Airplane",
        subject: "passenger airplane flying in sky",
      },
      {
        id: "6.06",
        name: "Helicopter",
        subject: "helicopter with spinning propeller",
      },
      {
        id: "6.07",
        name: "Sailboat",
        subject: "sailboat with triangular sail",
      },
      { id: "6.08", name: "Bicycle", subject: "bicycle with two wheels" },
      { id: "6.09", name: "Motorcycle", subject: "motorcycle with rider" },
      {
        id: "6.10",
        name: "Tractor",
        subject: "farm tractor with big rear wheels",
      },
      {
        id: "6.11",
        name: "Fire Engine",
        subject: "fire truck with long ladder",
      },
      {
        id: "6.12",
        name: "Police Car",
        subject: "police car with light bar on top",
      },
      { id: "6.13", name: "Ambulance", subject: "ambulance with red cross" },
      {
        id: "6.14",
        name: "Race Car",
        subject: "sporty racing car with spoiler",
      },
      {
        id: "6.15",
        name: "Monster Truck",
        subject: "monster truck with huge wheels",
      },
      {
        id: "6.16",
        name: "Submarine",
        subject: "submarine underwater with periscope",
      },
      {
        id: "6.17",
        name: "Rocket",
        subject: "rocket blasting off with flames",
      },
      {
        id: "6.18",
        name: "Hot Air Balloon",
        subject: "hot air balloon with basket",
      },
      { id: "6.19", name: "Bulldozer", subject: "bulldozer with front scoop" },
      {
        id: "6.20",
        name: "Garbage Truck",
        subject: "garbage truck with bin on the side",
      },
    ],
  },
  {
    slug: "fruits",
    number: 7,
    name: "Fruits",
    icon: "🍎",
    description: "20 tasty fruits — apple, banana, mango & more",
    scene:
      "a kitchen-table scene with a simple fruit bowl, a checkered tablecloth, a window with sunlight streaming in, and small leaves and vines around",
    coverScene:
      "a smiling red apple, a bright yellow banana, a juicy strawberry, and a slice of watermelon with cartoon faces, all arranged together on a picnic blanket",
    coverTitle: "Fruits Coloring Book",
    kdp: {
      title:
        "Fruits Coloring Book for Kids Ages 3-6: 20 Tasty Fruit Drawings | Apple, Banana, Mango & More",
      description:
        "Teach your little one about healthy foods with this fun fruits coloring book! 20 big, simple drawings of apples, bananas, mangoes, strawberries, watermelons, grapes, oranges, and more tasty fruits.",
      keywords: [
        "fruits coloring book kids",
        "fruit coloring book toddler ages 3-6",
        "apple banana mango coloring book",
        "food coloring book preschool kids",
        "healthy foods coloring book children",
        "single sided fruit coloring book",
        "learning fruits coloring book kindergarten",
      ],
      coverPrompt:
        "Happy cartoon apple, banana, strawberry and watermelon together with smiling faces in a fruit basket.",
    },
    prompts: [
      { id: "7.01", name: "Apple", subject: "whole apple with leaf and stem" },
      { id: "7.02", name: "Banana", subject: "single curved banana" },
      { id: "7.03", name: "Mango", subject: "mango with leaf" },
      { id: "7.04", name: "Orange", subject: "whole orange with stem" },
      { id: "7.05", name: "Grapes", subject: "bunch of grapes with leaf" },
      {
        id: "7.06",
        name: "Strawberry",
        subject: "strawberry with seeds and leaf crown",
      },
      {
        id: "7.07",
        name: "Watermelon",
        subject: "watermelon slice with seeds",
      },
      { id: "7.08", name: "Pineapple", subject: "pineapple with spiky leaves" },
      { id: "7.09", name: "Pear", subject: "pear fruit with stem" },
      { id: "7.10", name: "Cherry", subject: "pair of cherries on stem" },
      { id: "7.11", name: "Lemon", subject: "whole lemon with leaf" },
      { id: "7.12", name: "Peach", subject: "peach with leaf" },
      {
        id: "7.13",
        name: "Coconut",
        subject: "coconut split in half with water drop",
      },
      {
        id: "7.14",
        name: "Papaya",
        subject: "papaya cut in half showing seeds",
      },
      { id: "7.15", name: "Kiwi", subject: "kiwi fruit cut in half" },
      {
        id: "7.16",
        name: "Pomegranate",
        subject: "pomegranate cut open showing seeds",
      },
      { id: "7.17", name: "Avocado", subject: "avocado cut in half with pit" },
      { id: "7.18", name: "Blueberry", subject: "cluster of blueberries" },
      { id: "7.19", name: "Dragon Fruit", subject: "dragon fruit with spikes" },
      {
        id: "7.20",
        name: "Custard Apple",
        subject: "custard apple with bumpy skin",
      },
    ],
  },
  {
    slug: "vegetables",
    number: 8,
    name: "Vegetables",
    icon: "🥕",
    description: "20 healthy veggies — carrot, tomato, corn & more",
    scene:
      "a simple vegetable garden scene with soil rows, small plants sprouting, a garden fence, and a sky with a plain sun",
    coverScene:
      "a smiling orange carrot, a red tomato with a leaf, a yellow corn cob, and a green broccoli together in a friendly vegetable garden",
    coverTitle: "Vegetables Coloring Book",
    kdp: {
      title:
        "Vegetables Coloring Book for Kids Ages 3-6: 20 Healthy Food Drawings | Carrot, Tomato & More",
      description:
        "Make healthy eating fun! 20 big, kid-friendly drawings of carrots, tomatoes, corn, pumpkins, broccoli, peppers, and more garden vegetables.",
      keywords: [
        "vegetables coloring book kids",
        "veggie coloring book toddler ages 3-6",
        "carrot tomato corn coloring book",
        "healthy food coloring book preschool",
        "garden vegetables coloring book children",
        "single sided vegetable coloring book",
        "learning veggies coloring book kindergarten",
      ],
      coverPrompt:
        "Happy cartoon carrot, tomato, corn and broccoli with smiling faces together in a garden.",
    },
    prompts: [
      { id: "8.01", name: "Carrot", subject: "carrot with green leafy top" },
      { id: "8.02", name: "Tomato", subject: "round tomato with leaf" },
      { id: "8.03", name: "Corn", subject: "corn on the cob with husk" },
      { id: "8.04", name: "Pumpkin", subject: "pumpkin with stem" },
      { id: "8.05", name: "Broccoli", subject: "broccoli floret" },
      {
        id: "8.06",
        name: "Cucumber",
        subject: "whole cucumber with bumpy skin",
      },
      { id: "8.07", name: "Bell Pepper", subject: "bell pepper with stem" },
      { id: "8.08", name: "Eggplant", subject: "eggplant with leafy top" },
      { id: "8.09", name: "Potato", subject: "whole potato with eyes" },
      { id: "8.10", name: "Onion", subject: "onion with roots and sprout" },
      {
        id: "8.11",
        name: "Cabbage",
        subject: "round cabbage with outer leaves",
      },
      {
        id: "8.12",
        name: "Cauliflower",
        subject: "cauliflower with green leaves",
      },
      { id: "8.13", name: "Lettuce", subject: "leafy lettuce head" },
      { id: "8.14", name: "Garlic", subject: "garlic bulb with skin" },
      { id: "8.15", name: "Chili Pepper", subject: "chili pepper with stem" },
      {
        id: "8.16",
        name: "Sweet Potato",
        subject: "sweet potato with skin texture",
      },
      { id: "8.17", name: "Radish", subject: "radish with leafy top" },
      { id: "8.18", name: "Spinach", subject: "bunch of spinach leaves" },
      { id: "8.19", name: "Peas", subject: "open pea pod showing peas" },
      {
        id: "8.20",
        name: "Mushroom",
        subject: "cute mushroom with spotted cap",
      },
    ],
  },
  {
    slug: "food-treats",
    number: 9,
    name: "Food & Treats",
    icon: "🍰",
    description: "20 yummy treats — ice cream, pizza, cake & more",
    scene:
      "a cheerful picnic scene with a checkered blanket, small paper plates, a tree with fruit, a sky with a plain sun and fluffy clouds, and scattered flowers",
    coverScene:
      "a smiling ice cream cone with two scoops, a donut with sprinkles, a slice of pizza with cheese strings, and a cupcake with a cherry on top — all with cute faces — together on a picnic blanket",
    coverTitle: "Food & Treats Coloring Book",
    kdp: {
      title:
        "Food & Treats Coloring Book for Kids Ages 3-6: 20 Yummy Drawings | Ice Cream, Pizza, Cake & More",
      description:
        "A delicious coloring book packed with 20 big drawings of kids' favorite foods and treats! Ice cream cones, pizza slices, cupcakes, donuts, cookies, pretzels, pancakes, and more yummy goodies.",
      keywords: [
        "food coloring book kids",
        "desserts coloring book toddler ages 3-6",
        "ice cream cake coloring book",
        "yummy treats coloring book preschool",
        "junk food coloring book kids",
        "single sided food coloring book",
        "cute food coloring book big lines",
      ],
      coverPrompt:
        "Happy cartoon ice cream cone, donut, pizza slice and cupcake with smiling faces together on a picnic blanket.",
    },
    prompts: [
      {
        id: "9.01",
        name: "Ice Cream Cone",
        subject: "ice cream cone with two scoops",
      },
      {
        id: "9.02",
        name: "Birthday Cake",
        subject: "slice of birthday cake with candle",
      },
      { id: "9.03", name: "Donut", subject: "donut with sprinkles on top" },
      {
        id: "9.04",
        name: "Pizza Slice",
        subject: "pizza slice with pepperoni and cheese",
      },
      {
        id: "9.05",
        name: "Cupcake",
        subject: "cupcake with frosting swirl and cherry",
      },
      {
        id: "9.06",
        name: "Cookie",
        subject: "round cookie with chocolate chips",
      },
      { id: "9.07", name: "Pretzel", subject: "twisted pretzel with salt" },
      { id: "9.08", name: "Lollipop", subject: "swirl lollipop on a stick" },
      {
        id: "9.09",
        name: "Hot Dog",
        subject: "hot dog in a bun with mustard line",
      },
      {
        id: "9.10",
        name: "Hamburger",
        subject: "hamburger with bun, patty, lettuce",
      },
      {
        id: "9.11",
        name: "French Fries",
        subject: "french fries in a container",
      },
      { id: "9.12", name: "Popcorn", subject: "popcorn bucket overflowing" },
      {
        id: "9.13",
        name: "Pancakes",
        subject: "stack of pancakes with syrup drip",
      },
      { id: "9.14", name: "Waffle", subject: "waffle with syrup and butter" },
      {
        id: "9.15",
        name: "Sandwich",
        subject: "triangle cut sandwich with filling",
      },
      { id: "9.16", name: "Pie", subject: "slice of fruit pie with lattice" },
      { id: "9.17", name: "Taco", subject: "folded taco with filling" },
      {
        id: "9.18",
        name: "Milkshake",
        subject: "milkshake with straw and cream",
      },
      {
        id: "9.19",
        name: "Sushi Roll",
        subject: "sushi roll with rice and filling",
      },
      {
        id: "9.20",
        name: "Gingerbread Man",
        subject: "gingerbread man cookie with icing face",
      },
    ],
  },
  {
    slug: "nature-weather",
    number: 10,
    name: "Nature & Weather",
    icon: "🌈",
    description: "20 sun, moon, rainbow & more nature drawings",
    scene:
      "a calm outdoor landscape with rolling hills, a few trees, a winding path, clouds in the sky, and simple flowers and grass on the ground",
    coverScene:
      "a smiling sun with rays, a crescent moon with a sleepy face, a colorful rainbow, and a cheerful flower together over rolling hills",
    coverTitle: "Nature & Weather Coloring Book",
    kdp: {
      title:
        "Nature & Weather Coloring Book for Kids Ages 3-6: 20 Sun, Moon, Rainbow & More Drawings",
      description:
        "Explore the wonders of nature! 20 big, simple drawings of the sun, moon, stars, rainbows, clouds, trees, flowers, leaves, mountains, and more weather and nature elements.",
      keywords: [
        "nature coloring book kids",
        "weather coloring book toddler ages 3-6",
        "sun moon star coloring book",
        "rainbow flower tree coloring book",
        "outdoors nature coloring book preschool",
        "single sided nature coloring book",
        "seasons weather coloring book kindergarten",
      ],
      coverPrompt:
        "Happy cartoon sun, moon, rainbow and flower together on a hillside with trees and clouds.",
    },
    prompts: [
      { id: "10.01", name: "Sun", subject: "smiling sun with rays all around" },
      {
        id: "10.02",
        name: "Moon",
        subject: "crescent moon with sleeping face",
      },
      { id: "10.03", name: "Star", subject: "five-pointed star with smile" },
      { id: "10.04", name: "Cloud", subject: "fluffy happy cloud" },
      {
        id: "10.05",
        name: "Tree",
        subject: "simple tree with leaves and trunk",
      },
      {
        id: "10.06",
        name: "Flower",
        subject: "daisy flower with petals and stem",
      },
      {
        id: "10.07",
        name: "Rainbow",
        subject: "rainbow arc with clouds at both ends",
      },
      {
        id: "10.08",
        name: "Mountain",
        subject: "mountain with snow cap and sun",
      },
      { id: "10.09", name: "Leaf", subject: "maple leaf with veins" },
      { id: "10.10", name: "Raindrop", subject: "raindrop with face" },
      { id: "10.11", name: "Lightning", subject: "lightning bolt with cloud" },
      {
        id: "10.12",
        name: "Snowflake",
        subject: "intricate snowflake pattern",
      },
      {
        id: "10.13",
        name: "Tornado",
        subject: "spinning tornado with wind swirls",
      },
      {
        id: "10.14",
        name: "Sunflower",
        subject: "tall sunflower with seeds in center",
      },
      {
        id: "10.15",
        name: "Rose",
        subject: "rose with stem and thorns and leaves",
      },
      {
        id: "10.16",
        name: "Forest Mushroom",
        subject: "cute red mushroom with white spots",
      },
      {
        id: "10.17",
        name: "Grass Patch",
        subject: "patch of grass with tiny flowers",
      },
      { id: "10.18", name: "Pinecone", subject: "pinecone with scales" },
      { id: "10.19", name: "Acorn", subject: "acorn with cap" },
      {
        id: "10.20",
        name: "Palm Tree",
        subject: "palm tree on a small island",
      },
    ],
  },
  {
    slug: "alphabet",
    number: 11,
    name: "Alphabet (A-T)",
    icon: "🔤",
    description: "20 letters A-T with fun objects — learn & color",
    scene:
      "a playful backdrop with floating stars, sparkles, small dots, and a few tiny doodles (clouds, hearts, squiggles) surrounding the letter and its paired object",
    coverScene:
      "a colorful letter A next to a red apple, a blue letter B with a bouncing ball, and a yellow letter C next to a smiling cat, with more alphabet letters scattered around on a playful background",
    coverTitle: "ABC Alphabet Coloring Book",
    kdp: {
      title:
        "ABC Alphabet Coloring Book for Kids Ages 3-6: 20 Letters A-T with Fun Objects | Learn & Color",
      description:
        "The perfect early-learning coloring book that teaches the alphabet! 20 letters from A-T each paired with a fun object.",
      keywords: [
        "alphabet coloring book kids",
        "ABC coloring book toddler ages 3-6",
        "letter coloring book preschool",
        "learn alphabet coloring book children",
        "phonics coloring book kindergarten",
        "single sided ABC coloring book",
        "A is for apple coloring book kids",
      ],
      coverPrompt:
        "Cartoon A with apple, B with ball, C with cat arranged playfully with more letter-object pairs around them.",
    },
    prompts: [
      {
        id: "11.01",
        name: "A for Apple",
        subject: "big letter A with an apple next to it",
      },
      { id: "11.02", name: "B for Ball", subject: "big letter B with a ball" },
      {
        id: "11.03",
        name: "C for Cat",
        subject: "big letter C with a smiling cat",
      },
      {
        id: "11.04",
        name: "D for Dog",
        subject: "big letter D with a wagging dog",
      },
      {
        id: "11.05",
        name: "E for Elephant",
        subject: "big letter E with a small elephant",
      },
      {
        id: "11.06",
        name: "F for Fish",
        subject: "big letter F with a friendly fish",
      },
      {
        id: "11.07",
        name: "G for Giraffe",
        subject: "big letter G with a giraffe",
      },
      { id: "11.08", name: "H for Hat", subject: "big letter H with a hat" },
      {
        id: "11.09",
        name: "I for Ice Cream",
        subject: "big letter I with an ice cream cone",
      },
      {
        id: "11.10",
        name: "J for Jellyfish",
        subject: "big letter J with a jellyfish",
      },
      {
        id: "11.11",
        name: "K for Kite",
        subject: "big letter K with a diamond kite",
      },
      {
        id: "11.12",
        name: "L for Lion",
        subject: "big letter L with a friendly lion",
      },
      {
        id: "11.13",
        name: "M for Mango",
        subject: "big letter M with a mango",
      },
      {
        id: "11.14",
        name: "N for Nest",
        subject: "big letter N with a bird nest and eggs",
      },
      {
        id: "11.15",
        name: "O for Owl",
        subject: "big letter O with an owl inside the O",
      },
      {
        id: "11.16",
        name: "P for Pineapple",
        subject: "big letter P with a pineapple",
      },
      {
        id: "11.17",
        name: "Q for Queen",
        subject: "big letter Q with a queen's crown",
      },
      {
        id: "11.18",
        name: "R for Rabbit",
        subject: "big letter R with a hopping rabbit",
      },
      {
        id: "11.19",
        name: "S for Sun",
        subject: "big letter S with a smiling sun",
      },
      {
        id: "11.20",
        name: "T for Tiger",
        subject: "big letter T with a cartoon tiger",
      },
    ],
  },
  {
    slug: "toys",
    number: 12,
    name: "Toys",
    icon: "🧸",
    description: "20 fun toys — teddy bear, ball, doll & more",
    scene:
      "a cozy playroom scene with a toy shelf, a patterned rug, a window with curtains, scattered stars and building blocks on the floor, and a bright cheerful atmosphere",
    coverScene:
      "a brown teddy bear with a red bow tie, a small blue toy race car, and a colorful beach ball together in a playroom with building blocks and stars around them",
    coverTitle: "Toys Coloring Book",
    kdp: {
      title:
        "Toys Coloring Book for Kids Ages 3-6: 20 Fun Toy Drawings | Teddy Bear, Ball, Doll & More",
      description:
        "A playful coloring book featuring 20 big, simple drawings of favorite toys! Teddy bears, balls, kites, dolls, toy cars, building blocks, rocking horses, and more classic playthings.",
      keywords: [
        "toys coloring book kids",
        "teddy bear coloring book toddler",
        "toy coloring book ages 3-6",
        "preschool toys coloring book",
        "doll ball kite coloring book children",
        "single sided toy coloring book",
        "classic toys coloring book big lines",
      ],
      coverPrompt:
        "Happy cartoon teddy bear, toy car and ball together in a playroom scene with blocks and stuffed animals.",
    },
    prompts: [
      {
        id: "12.01",
        name: "Teddy Bear",
        subject: "sitting teddy bear with bow tie",
      },
      { id: "12.02", name: "Soccer Ball", subject: "soccer ball with pattern" },
      {
        id: "12.03",
        name: "Kite",
        subject: "diamond kite with tail and string",
      },
      {
        id: "12.04",
        name: "Rag Doll",
        subject: "rag doll with pigtails and dress",
      },
      { id: "12.05", name: "Toy Car", subject: "small toy racing car" },
      {
        id: "12.06",
        name: "Puzzle Pieces",
        subject: "three connected jigsaw puzzle pieces",
      },
      {
        id: "12.07",
        name: "Building Blocks",
        subject: "stack of wooden alphabet blocks",
      },
      {
        id: "12.08",
        name: "Rocking Horse",
        subject: "wooden rocking horse with mane",
      },
      {
        id: "12.09",
        name: "Toy Train",
        subject: "wooden toy train with three cars",
      },
      { id: "12.10", name: "Yo-Yo", subject: "yo-yo with string coming down" },
      {
        id: "12.11",
        name: "Spinning Top",
        subject: "wooden spinning top in motion",
      },
      { id: "12.12", name: "Jump Rope", subject: "jump rope with handles" },
      { id: "12.13", name: "Hula Hoop", subject: "circular hula hoop" },
      { id: "12.14", name: "Marbles", subject: "three marbles in a row" },
      {
        id: "12.15",
        name: "Action Figure",
        subject: "superhero action figure standing",
      },
      {
        id: "12.16",
        name: "Plush Bunny",
        subject: "plush bunny toy with long ears",
      },
      {
        id: "12.17",
        name: "Xylophone",
        subject: "xylophone with colorful bars and mallets",
      },
      { id: "12.18", name: "Drum", subject: "toy drum with drumsticks" },
      { id: "12.19", name: "Piggy Bank", subject: "piggy bank with coin slot" },
      { id: "12.20", name: "Balloon", subject: "balloon on a string" },
    ],
  },
  {
    slug: "dinosaurs",
    number: 13,
    name: "Dinosaurs",
    icon: "🦖",
    description: "20 roarsome dinos — T-Rex, Triceratops & more",
    scene:
      "a prehistoric jungle scene with palm trees, tall ferns, a small erupting volcano in the distance, rocky terrain, and a sky with a plain sun and puffy clouds",
    coverScene:
      "a friendly green T-Rex, a smiling blue triceratops, and a happy orange stegosaurus together in a prehistoric jungle, with a small volcano, palm trees, and ferns around them",
    coverTitle: "Dinosaurs Coloring Book",
    kdp: {
      title:
        "Dinosaurs Coloring Book for Kids Ages 3-6: 20 Roarsome Drawings | T-Rex, Triceratops & More",
      description:
        "A roaring good time for little paleontologists! 20 big, friendly drawings of famous dinosaurs — T-Rex, Triceratops, Stegosaurus, Brontosaurus, Pterodactyl, Velociraptor, and more.",
      keywords: [
        "dinosaurs coloring book kids",
        "dinosaur coloring book boys ages 3-6",
        "T-Rex triceratops coloring book",
        "preschool dinosaur coloring book",
        "cute dinosaur coloring book toddler",
        "single sided dinosaur coloring book",
        "kids dinosaur activity book big lines",
      ],
      coverPrompt:
        "Happy cartoon T-Rex, triceratops and stegosaurus together in a prehistoric jungle with volcano and palm trees.",
    },
    prompts: [
      {
        id: "13.01",
        name: "Tyrannosaurus Rex",
        subject: "T-Rex with big teeth and tiny arms",
      },
      {
        id: "13.02",
        name: "Stegosaurus",
        subject: "stegosaurus with plates on back",
      },
      {
        id: "13.03",
        name: "Triceratops",
        subject: "triceratops with three horns and frill",
      },
      {
        id: "13.04",
        name: "Brontosaurus",
        subject: "brontosaurus with long neck and tail",
      },
      {
        id: "13.05",
        name: "Pterodactyl",
        subject: "pterodactyl flying with wings spread",
      },
      { id: "13.06", name: "Velociraptor", subject: "velociraptor running" },
      {
        id: "13.07",
        name: "Ankylosaurus",
        subject: "ankylosaurus with armored back and club tail",
      },
      {
        id: "13.08",
        name: "Diplodocus",
        subject: "diplodocus with very long neck",
      },
      {
        id: "13.09",
        name: "Spinosaurus",
        subject: "spinosaurus with sail on back",
      },
      {
        id: "13.10",
        name: "Parasaurolophus",
        subject: "parasaurolophus with tube crest on head",
      },
      {
        id: "13.11",
        name: "Iguanodon",
        subject: "iguanodon standing on hind legs",
      },
      {
        id: "13.12",
        name: "Allosaurus",
        subject: "allosaurus standing with sharp teeth",
      },
      {
        id: "13.13",
        name: "Brachiosaurus",
        subject: "brachiosaurus reaching up to eat leaves",
      },
      {
        id: "13.14",
        name: "Compsognathus",
        subject: "tiny compsognathus running",
      },
      {
        id: "13.15",
        name: "Archaeopteryx",
        subject: "archaeopteryx with feathered wings",
      },
      {
        id: "13.16",
        name: "Mosasaurus",
        subject: "mosasaurus swimming in sea",
      },
      {
        id: "13.17",
        name: "Dinosaur Egg",
        subject: "cracked dinosaur egg with baby peeking out",
      },
      {
        id: "13.18",
        name: "Baby Dinosaur",
        subject: "small baby dinosaur hatching",
      },
      {
        id: "13.19",
        name: "Dinosaur Footprint",
        subject: "big three-toed dinosaur footprint",
      },
      {
        id: "13.20",
        name: "Volcano with Dinosaur",
        subject: "volcano erupting with dinosaur silhouette",
      },
    ],
  },
  {
    slug: "fantasy-magic",
    number: 14,
    name: "Fantasy & Magic",
    icon: "🦄",
    description: "20 magical — dragon, mermaid, fairy & more",
    scene:
      "a magical forest landscape with a fairytale castle in the distance, twinkling stars, a rainbow arc, whimsical mushrooms, tall curly trees, and sparkles scattered throughout",
    coverScene:
      "a beautiful white unicorn with a rainbow mane, a tiny pink fairy with sparkling wings, and a friendly green dragon breathing small flames — all together in a magical forest with a distant castle, stars, and a rainbow",
    coverTitle: "Unicorns & Fantasy Coloring Book",
    kdp: {
      title:
        "Unicorns & Fantasy Coloring Book for Kids Ages 3-6: 20 Magical Drawings | Dragon, Mermaid, Fairy",
      description:
        "Enter a magical world of unicorns, dragons, mermaids, fairies, and fantasy friends! 20 big, enchanting drawings perfect for kids who love fairy tales and imaginative play.",
      keywords: [
        "unicorn coloring book kids",
        "fantasy coloring book girls ages 3-6",
        "dragon mermaid fairy coloring book",
        "magical coloring book toddler preschool",
        "princess castle coloring book children",
        "single sided fantasy coloring book",
        "fairy tale coloring book big lines kids",
      ],
      coverPrompt:
        "Happy cartoon unicorn, fairy and friendly dragon together in a magical forest with castle and rainbow.",
    },
    prompts: [
      {
        id: "14.01",
        name: "Unicorn",
        subject: "unicorn with flowing mane and single horn",
      },
      {
        id: "14.02",
        name: "Dragon",
        subject: "friendly dragon with small wings breathing a small flame",
      },
      {
        id: "14.03",
        name: "Mermaid",
        subject: "mermaid sitting on a rock with fish tail",
      },
      {
        id: "14.04",
        name: "Fairy",
        subject: "fairy with butterfly wings holding wand",
      },
      {
        id: "14.05",
        name: "Wizard",
        subject: "wizard with pointy hat and long beard",
      },
      {
        id: "14.06",
        name: "Knight",
        subject: "knight in armor with sword and shield",
      },
      {
        id: "14.07",
        name: "Princess",
        subject: "princess with crown and long dress",
      },
      { id: "14.08", name: "Prince", subject: "prince with crown and cape" },
      {
        id: "14.09",
        name: "Castle",
        subject: "fairy tale castle with turrets and flag",
      },
      {
        id: "14.10",
        name: "Magic Wand",
        subject: "magic wand with star on top and sparkles",
      },
      {
        id: "14.11",
        name: "Treasure Chest",
        subject: "open treasure chest with coins and jewels",
      },
      {
        id: "14.12",
        name: "Crystal Ball",
        subject: "crystal ball on a stand with swirls inside",
      },
      {
        id: "14.13",
        name: "Genie",
        subject: "smiling genie coming out of a lamp",
      },
      {
        id: "14.14",
        name: "Phoenix",
        subject: "phoenix bird with flame feathers",
      },
      {
        id: "14.15",
        name: "Griffin",
        subject: "griffin with eagle head and lion body",
      },
      {
        id: "14.16",
        name: "Pegasus",
        subject: "pegasus winged horse standing",
      },
      {
        id: "14.17",
        name: "Friendly Witch",
        subject: "friendly witch with pointy hat and broomstick",
      },
      {
        id: "14.18",
        name: "Pirate",
        subject: "pirate with hat, eye patch and sword",
      },
      {
        id: "14.19",
        name: "Leprechaun",
        subject: "leprechaun with pot of gold and rainbow",
      },
      {
        id: "14.20",
        name: "Gnome",
        subject: "garden gnome with pointy hat and beard",
      },
    ],
  },
];

export const TOTAL_PROMPTS = CATEGORIES.reduce(
  (sum, c) => sum + c.prompts.length,
  0,
);

export function findCategory(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}
