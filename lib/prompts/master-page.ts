import type { AgeRange, Detail, PromptOptions } from "./types";
import {
  ANATOMY_GUARDRAIL,
  ANCHOR,
  ANTHRO_FACE_GUARDRAIL,
  ARTIFACT_GUARDRAIL,
  COMMON_ELEMENT_STYLE,
  DRAW_BORDER_RULE,
  FILL_CANVAS_RULE,
  KDP_QUALITY_GUARDRAIL,
  KID_SAFE_CONTENT_RULE,
  PRINT_TRIM_SAFETY_RULE,
  STYLE_CONSISTENCY,
} from "./guardrails";

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
