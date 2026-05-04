/**
 * Story-book page prompts (Phase 1 — toddlers 3-6 picture book band).
 *
 * Distinct from the coloring-book master prompt: full color, full-bleed,
 * speech bubbles allowed, no decorative border, no B&W rules. Same
 * static-system / dynamic-user split so the long stable prefix benefits
 * from Gemini implicit context caching.
 *
 * Approach A (per docs/STORY_BOOK_PLAN.txt §2): Gemini renders text inside
 * speech bubbles. Quality gate verifies spelling; if regen rate is too high
 * we add Approach B (canvas compositing) later.
 */

import {
  ANATOMY_GUARDRAIL,
  KID_SAFE_CONTENT_RULE,
  NO_REAL_BRAND_RULE,
} from "./guardrails";

export interface StoryCharacter {
  /** Short name as it appears in dialogue and scene text (e.g. "Pip"). */
  name: string;
  /**
   * Full visual descriptor — species, size, distinctive features, colors,
   * accessories. Restated verbatim on every page so the image model
   * doesn't drift between scenes.
   */
  descriptor: string;
}

export interface StoryDialogueLine {
  /** Must match a character name from the locked descriptor list above. */
  speaker: string;
  /** Spoken text. Hard cap 12 words for the toddler band. */
  text: string;
}

export interface StoryPalette {
  /** Human label (e.g. "Cheerful bright"). Used in chat UI, not the prompt. */
  name: string;
  /** Locked hex set. Each page is rendered using these colors only. */
  hexes: string[];
}

export interface StoryPageTemplateOptions {
  /** 1-3 locked characters that may appear on this page. */
  characters: StoryCharacter[];
  /** Locked palette for the whole book — same on every page. */
  palette: StoryPalette;
  /**
   * Description of the visible scene — composition, action, location,
   * mood. 12-30 words. Should NAME each character that actually appears
   * (the prompt enforces "only named characters are drawn").
   */
  scene: string;
  /**
   * Up to 2 speech bubbles for this page. Each speaker name must match
   * a character in `characters`. Hard cap 12 words per line.
   */
  dialogue?: StoryDialogueLine[];
  /**
   * Optional one-line narration rendered as a small caption at the top or
   * bottom of the page (not inside a bubble). Useful when the scene needs
   * a sentence of context that isn't dialogue. Hard cap 14 words.
   */
  narration?: string;
  /**
   * Optional camera / framing hint (e.g. "wide shot, both characters
   * visible left of center"). Read as a soft suggestion.
   */
  composition?: string;
}

const TODDLER_BAND_NOTE =
  "Audience: toddlers 3-6. Friendly rounded characters with big expressive eyes, big simple shapes, calm safe scenes, no scary or stressful imagery.";

const STYLE_RULE =
  "Style: flat 2D cartoon illustration, vibrant flat colors with bold black outlines, soft warm lighting feel, minimal shading (no realistic gradients, no painterly texture). Friendly rounded character forms with large expressive eyes, simple expressive mouths, gentle proportions. Modern picture-book aesthetic in the family of contemporary indie children's books.";

const FULL_BLEED_RULE =
  "Composition: full-bleed illustration that fills the entire 6x9 portrait canvas to all four edges. NO border, NO frame, NO outer rectangle, NO white margin around the artwork. The background reaches every edge of the page. Aspect ratio 2:3 (portrait).";

const NO_TEXT_OUTSIDE_BUBBLES_RULE =
  "Text policy: the ONLY text drawn anywhere on this page is the dialogue inside speech bubbles and the optional narration caption listed below. No author name, no publisher, no URL, no page number, no watermark, no signature, no logo, no model attribution, no random letters or numbers in the background scenery. If a sign or book appears in the scene, leave it blank or use abstract squiggles, never readable letters.";

const SPEECH_BUBBLE_RULE =
  "Speech bubble rendering rules — CRITICAL: Each speech bubble is a clean white rounded oval / cloud with a thin dark outline and a clear pointed tail aimed at the speaking character's mouth. Inside the bubble, render the line of dialogue EXACTLY as written below — same words, same spelling, same punctuation, same casing — using a friendly readable rounded sans-serif at a size large enough to read at thumbnail. Center the text inside the bubble with comfortable padding on all sides. Bubbles are placed in empty sky / wall / background space, NEVER overlapping a character's face or another bubble. Maximum two bubbles on this page.";

const SPEECH_BUBBLE_OWNERSHIP_RULE =
  "Speech bubble ownership — STRICT, applies whenever a page has 2+ named characters: each bubble belongs to ONE speaker only and MUST be positioned next to THAT speaker, not the other one. Place the bubble in the empty space directly above or beside the speaker's head, close enough that the tail reaches the speaker's mouth in a short clean line. The bubble's center sits closer to its own speaker than to any other character on the page. Never cluster both bubbles above the same character. Never let the tail of one speaker's bubble cross over a different character's body to reach back to its real speaker — if the tail would have to cross another character, MOVE THE BUBBLE to the speaker's own side of the page. Visual test before drawing: cover the tail with a thumb — would a child still know who is speaking from the bubble's position alone? If no, reposition.";

const RELATIVE_SCALE_RULE =
  "Relative-scale lock — STRICT, applies whenever 2+ named characters share the page: the height and body-mass ratio between characters MUST follow the locked descriptors above. If a descriptor calls one character small / tiny / a chick / a duckling and another large / chubby / a bear / an adult, the small one is visibly SHORTER and SMALLER on the page — typically the small character's head reaches only the larger character's chest or hip, not their shoulders or face. Adult-to-child ratio is roughly 1.6-2x. Small-creature-to-large-creature ratio (duckling to panda, mouse to lion) is roughly 3-5x. Maintain the SAME ratio on every page so the protagonists feel consistent across the book — a duckling that is hip-high to the panda on page 6 must still be hip-high to the panda on page 10, never face-high.";

const CHARACTER_FIDELITY_RULE =
  "Character fidelity (load-bearing): redraw each character so they match the locked descriptors above EXACTLY — same species, body proportions, head shape, color, accessories, and distinguishing features. Do not invent new clothing, new accessories, new species traits, or new colors. Each character appears at most ONCE per page; never duplicate the same character. Only characters explicitly named in the scene description are drawn — no extra animals, no random side characters, no human onlookers unless the scene names them.";

const NO_HAND_DRAWN_CLAIM_RULE =
  "Do not include any claim or watermark suggesting the art is hand-drawn, hand-painted, hand-illustrated, handmade, or original artwork. The art style is illustrated, not artisanal.";

/**
 * Stable system rules for the toddler band — sent via Gemini's
 * `systemInstruction` channel so the long prefix benefits from implicit
 * context caching across every page in the same book run.
 */
export const STORY_PAGE_TODDLER_SYSTEM = [
  "You generate single-page full-color illustrations for premium Amazon KDP children's picture books in the toddler band (ages 3-6). Every page must be print-ready 300 DPI quality with consistent character design across the whole book.",
  TODDLER_BAND_NOTE,
  STYLE_RULE,
  FULL_BLEED_RULE,
  CHARACTER_FIDELITY_RULE,
  RELATIVE_SCALE_RULE,
  SPEECH_BUBBLE_RULE,
  SPEECH_BUBBLE_OWNERSHIP_RULE,
  NO_TEXT_OUTSIDE_BUBBLES_RULE,
  NO_REAL_BRAND_RULE,
  KID_SAFE_CONTENT_RULE,
  ANATOMY_GUARDRAIL,
  NO_HAND_DRAWN_CLAIM_RULE,
  "Output: a single coherent full-color full-bleed picture-book page.",
].join(" ");

function formatCharacterLock(characters: StoryCharacter[]): string {
  if (characters.length === 0) {
    return "Locked characters for this book: none — the page may have no named characters, only the scene described below.";
  }
  const lines = characters
    .map((c) => `${c.name.trim()}: ${c.descriptor.trim()}`)
    .join(" / ");
  return `Locked characters for this book (each character that appears on this page MUST match these descriptors EXACTLY): ${lines}.`;
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
  return `Palette lock — use only these colors and tonal blends of them across this page (no off-palette hues): ${cleanHexes.join(", ")}.`;
}

function formatDialogue(dialogue: StoryDialogueLine[] | undefined): string {
  if (!dialogue || dialogue.length === 0) {
    return "Dialogue on this page: none — render the scene without speech bubbles.";
  }
  const trimmed = dialogue.slice(0, 2).map((d, i) => {
    const speaker = d.speaker.trim();
    const text = d.text.trim().replace(/\s+/g, " ");
    return `Bubble ${i + 1} — owned by ${speaker} (place this bubble next to ${speaker}, tail aimed at ${speaker}'s mouth, NOT next to any other character), text: "${text}"`;
  });
  const speakers = Array.from(
    new Set(dialogue.slice(0, 2).map((d) => d.speaker.trim())),
  );
  const ownershipNote =
    speakers.length >= 2
      ? ` Each bubble must sit on ITS OWN speaker's side of the page — bubble 1 next to ${speakers[0]}, bubble 2 next to ${speakers[1]}. Do not stack both bubbles above one character.`
      : "";
  return `Dialogue on this page (${trimmed.length} bubble${trimmed.length === 1 ? "" : "s"} total — render each one as instructed in the speech-bubble rules above): ${trimmed.join("; ")}.${ownershipNote}`;
}

function formatNarration(narration: string | undefined): string {
  if (!narration?.trim()) return "";
  const text = narration.trim().replace(/\s+/g, " ");
  return `Optional narration caption — render at the very top OR very bottom of the page in a small, plain rectangular caption box (rounded corners, semi-opaque cream background, dark sans-serif text, no border): "${text}". Spell exactly as given. The caption never overlaps a character or a speech bubble.`;
}

/**
 * Per-page dynamic content. Pair with {@link STORY_PAGE_TODDLER_SYSTEM}
 * when calling Gemini so the static prefix is cached.
 */
export const STORY_PAGE_TODDLER_USER = (
  opts: StoryPageTemplateOptions,
): string => {
  const parts: string[] = [
    "Toddler picture-book page (ages 3-6).",
    formatCharacterLock(opts.characters),
    formatPalette(opts.palette),
    `Scene description: ${opts.scene.trim()}`,
  ];
  if (opts.composition?.trim()) {
    parts.push(`Composition hint: ${opts.composition.trim()}.`);
  }
  parts.push(formatDialogue(opts.dialogue));
  const narration = formatNarration(opts.narration);
  if (narration) parts.push(narration);
  return parts.join(" ");
};

/**
 * Backward-compatible single-string template. Concatenates the static
 * guardrails (system) and the dynamic per-page content (user). Prefer the
 * split form ({@link STORY_PAGE_TODDLER_SYSTEM} + {@link STORY_PAGE_TODDLER_USER})
 * when calling Gemini so the static prefix triggers implicit caching.
 */
export const STORY_PAGE_TODDLER_TEMPLATE = (
  opts: StoryPageTemplateOptions,
): string => {
  return `${STORY_PAGE_TODDLER_SYSTEM} ${STORY_PAGE_TODDLER_USER(opts)}`;
};
