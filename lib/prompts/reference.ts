import type { AgeRange } from "./types";
import { AGE_PRESETS } from "./master-page";
import {
  ANATOMY_GUARDRAIL,
  ANTHRO_FACE_GUARDRAIL,
  ARTIFACT_GUARDRAIL,
  KID_SAFE_CONTENT_RULE,
} from "./guardrails";

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
