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
  `A reference image of the front cover is attached. Use the same dominant background color family on the back cover (study the attached image to identify it). Style description from vision analysis: "${styleDescription}". Adopt that style, but the back cover stays minimal layout — soft colored background plus a single centered tagline, never a copy of the front. No barcode area. Use the front cover only for color matching, never for content.`;

export const BACK_COVER_COLOR_ANCHOR_FALLBACK_PROMPT =
  "A reference image of the front cover is attached. Match its dominant background color exactly on the back cover.";

export const REFERENCE_ANALYSIS_FAILED_NOTE =
  "(Note: a reference image was provided but could not be analyzed.)";

export const RAW_REFERENCE_NOTE =
  "Reference image is provided as visual inspiration. Use its style and composition.";

/**
 * Cross-page consistency anchor used when an interior page is generated
 * with a previous page and/or the cover attached as visual references.
 * The page-frame is intentionally NOT discussed here — NO_AI_BORDER_RULE
 * in MASTER_PROMPT_SYSTEM tells the model not to draw a frame at all
 * (the printer's border is added as a vector layer in post-processing
 * by lib/pdf.ts), so there is nothing to keep consistent across pages.
 */
export const CONSISTENCY_ANCHOR_PROMPT = (refLabel: string): string =>
  [
    `🚨 REFERENCE-IMAGE USAGE RULE — STRICT — ${refLabel}.`,
    "The attached reference image(s) exist for ONE purpose: to lock the LOOK of recurring characters across the book. NOTHING ELSE.",
    "🚨 OUTPUT IS PURE BLACK-AND-WHITE LINE ART — read this first: the reference image (especially when it's the COVER) is FULLY COLORED. The output you generate is NOT colored. The output is pure black ink line art on a clean white page, ready for a kid to color in. ❌ DO NOT carry ANY color from the reference into the output. ❌ DO NOT add gray shading, grayscale fill, soft tonal shading, watercolor wash, hatching for shadow, or any tonal variance. ❌ DO NOT fill the character's fur / feathers / clothes with any color or tone. The reference being colored is purely for showing you what the CHARACTER LOOKS LIKE in shape and identity — the output reproduces ONLY the line-art skeleton of those characters: closed continuous black outlines on white, NOTHING FILLED. If you find yourself about to render any pixel that is not pure black or pure white, STOP — that pixel must become either pure black ink line or pure white background.",
    "✅ COPY from the reference (these and ONLY these):",
    "• Each recurring character's species, body proportions (chubby vs slim), head/face shape, fur / feather / scale type, eye style, markings PATTERN (drawn as line art — never filled), distinguishing accessories. The character's color identity is for IDENTIFICATION only — translate it into LINE-ART markings (e.g. a 'brown spotted dog' becomes a dog with outlined spot shapes on white fur, NOT a brown-filled dog).",
    "• Line-art style: line weight, stroke polish, density. The new page should feel like a SIBLING illustration to the reference — same drawing hand, same line quality, but black-on-white only.",
    "❌ DO NOT COPY from the reference (this list is load-bearing — composition copying is the most common quality killer):",
    "• Tree positions / shapes / counts — the prior page had a tree on the left at 30%? This page has no tree, OR a tree somewhere different, OR no trees at all if not needed.",
    "• Building / structure positions — doghouse, barn, castle, fence, gate, house — if it appeared on the reference at a specific spot, it does NOT appear at the same spot here. Move it, reshape it, or omit it.",
    "• Prop positions — flowers, mushrooms, rocks, stumps, signs — never reuse the same arrangement.",
    "• Character poses and placements — characters DO NOT stand in the same pose, the same direction, or the same screen position as the reference. New page = new pose, new framing.",
    "• Sky / cloud / sun arrangement — different cloud shapes, different positions, different counts. Or none if the new scene is indoor / underwater / night / abstract.",
    "• Camera angle and framing distance — alternate close-up, wide shot, low angle, high angle across pages.",
    "• Background-element count and density — alternate sparse / busy / mid-density.",
    "RULE OF THUMB: take the characters out of the reference and put them in a COMPLETELY DIFFERENT picture this time. The new picture is composed FROM SCRATCH from this page's own subject text — not by editing the reference. If the new page would look like a near-duplicate of the reference with characters slightly repositioned, you are DOING IT WRONG. Compose fresh.",
  ].join("\n\n");
