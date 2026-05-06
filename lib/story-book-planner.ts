/**
 * One-shot story-book planner — sibling of `lib/book-planner.ts` (coloring
 * books). Used by the Bulk Book idea form when the user picks "Story book"
 * and clicks "Plan my book with AI". For richer multi-turn planning the
 * user can still go through the Sparky AI chat (`lib/book-chat.ts`).
 *
 * Output shape extends `BookPlan` with the story-only fields the renderer
 * needs (characters[], palette, per-page dialogue/narration/composition).
 * The fields line up with the `Plan` interface in
 * `components/playground/book-studio.tsx` so the existing story-mode
 * pipeline picks the brief up unchanged.
 */

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { OPENAI_TEXT_MODEL } from "@/lib/constants";
import { NO_REAL_BRAND_RULE } from "@/lib/prompts";

export type StoryType =
  | "moral"
  | "fiction"
  | "non-fiction"
  | "mystery"
  | "fantasy"
  | "comic"
  | "fairytale"
  | "adventure"
  | "bedtime";

export const STORY_TYPES: { value: StoryType; label: string }[] = [
  { value: "moral", label: "Moral" },
  { value: "fairytale", label: "Fairytale" },
  { value: "fantasy", label: "Fantasy" },
  { value: "adventure", label: "Adventure" },
  { value: "bedtime", label: "Bedtime" },
  { value: "fiction", label: "Fiction" },
  { value: "non-fiction", label: "Non-Fiction" },
  { value: "mystery", label: "Mystery" },
  { value: "comic", label: "Comic" },
];

export interface StoryBookPlanInput {
  idea: string;
  pageCount: number;
  age?: "toddlers" | "kids" | "tweens";
  storyType?: StoryType;
  /** Comma-separated free-form names (e.g. "Pip, Daisy, Miss Honey"). Optional. */
  characterNames?: string;
}

const dialogueSchema = z.object({
  speaker: z
    .string()
    .min(1)
    .describe(
      "Speaker's name. MUST exactly match a name from the top-level characters list.",
    ),
  text: z
    .string()
    .min(1)
    .max(80)
    .describe("Spoken line. Hard cap 12 words for the toddler band."),
});

// OpenAI's strict structured-output mode requires EVERY property to be
// in the `required` list — there is no concept of "optional". Fields the
// model can omit must be expressed as `.nullable()` (so the model returns
// `null` to mean "absent"). The planStoryBook() function normalizes
// `null` → `undefined` before returning, so the consumer side stays
// clean and matches the existing Plan/PromptItem types.
const promptSchema = z.object({
  name: z.string().min(1).max(40).describe("1-3 word scene label."),
  subject: z
    .string()
    .min(8)
    .describe(
      "Full visual description of the scene with locked character descriptors inline (12-20 words).",
    ),
  dialogue: z
    .array(dialogueSchema)
    .max(2)
    .nullable()
    .describe(
      "Up to 2 speech bubbles for this page; return null when the scene has no dialogue.",
    ),
  narration: z
    .string()
    .max(120)
    .nullable()
    .describe(
      "One-line narration caption (max 14 words). Return null when not needed — most pages let dialogue + art carry the story.",
    ),
  composition: z
    .string()
    .max(160)
    .nullable()
    .describe(
      "Camera/framing hint (e.g. 'wide shot, both characters left of center, sunset behind them'). Return null when no specific hint is needed.",
    ),
});

const characterSchema = z.object({
  name: z.string().min(1).max(40),
  descriptor: z.string().min(20).max(400),
});

const paletteSchema = z.object({
  name: z.string().min(1).max(60),
  hexes: z
    .array(z.string().regex(/^#?[0-9a-fA-F]{6}$/))
    .min(3)
    .max(8),
});

const PLAN_SCHEMA = z.object({
  title: z.string().min(1).max(200),
  coverTitle: z.string().min(1).max(60),
  description: z.string().min(15).max(400),
  scene: z.string().min(10).max(400),
  coverScene: z.string().min(10).max(400),
  backCoverTagline: z
    .string()
    .min(8)
    .max(120)
    .describe(
      "Parent-facing one-line tagline rendered VERBATIM on the back cover (10-18 words, hard cap 18). Calm, evocative, like a Penguin Classics back. Reference one concrete noun from the story. Never include character descriptor parentheticals like '(small)' or '(stripey)' — write it as a clean human-readable sentence.",
    ),
  bottomStripPhrases: z.array(z.string().min(3).max(28)).length(3),
  sidePlaqueLines: z.array(z.string().min(3).max(32)).length(3),
  coverBadgeStyle: z.string().max(200).nullable(),
  characters: z.array(characterSchema).min(1).max(3),
  palette: paletteSchema,
  prompts: z.array(promptSchema).min(5).max(50),
  notes: z.string().max(200).nullable(),
});

/**
 * Public output shape of `planStoryBook()`. The model's raw response
 * uses `null` for fields it didn't fill (OpenAI strict mode requires
 * this), but we normalize null → undefined before returning so the
 * consumer matches the existing Plan / PromptItem types in
 * `components/playground/book-studio.tsx`.
 */
export interface StoryBookPlan {
  title: string;
  coverTitle: string;
  description: string;
  scene: string;
  coverScene: string;
  /** Clean parent-facing tagline rendered verbatim on the back cover. */
  backCoverTagline: string;
  bottomStripPhrases: string[];
  sidePlaqueLines: string[];
  coverBadgeStyle?: string;
  characters: Array<{ name: string; descriptor: string }>;
  palette: { name: string; hexes: string[] };
  prompts: Array<{
    name: string;
    subject: string;
    dialogue?: Array<{ speaker: string; text: string }>;
    narration?: string;
    composition?: string;
  }>;
  notes?: string;
}

const STORY_TYPE_GUIDANCE: Record<StoryType, string> = {
  moral:
    "Moral fable structure: a clear lesson emerges from the events. Each scene moves the lesson forward; the final 1-2 scenes deliver the moral implicitly through resolution (not stated as a slogan).",
  fairytale:
    "Classic fairytale beats: once-upon-a-time opening, magical/threshold event, transformation, happy ending. Lean on familiar archetypes (kind hero, gentle wonder).",
  fantasy:
    "Fantasy with a magical world or creature. Build a small consistent world (one magical rule, one magical creature, one ordinary friend) so the wonder feels grounded.",
  adventure:
    "Adventure arc: setup → setback → discovery → triumph. Each scene visibly advances the journey or stake.",
  bedtime:
    "Calm, soothing pacing toward sleep. Soft conflicts, gentle resolutions. Final 2 scenes wind down to rest. Avoid stress, danger, or scares.",
  fiction:
    "Short original character-driven narrative. Beginning / middle / end. Pick one small problem and resolve it warmly.",
  "non-fiction":
    "Factual concept rendered as a narrative tour (e.g. a day at the farm, how rain falls, how a butterfly grows). Each page introduces one concrete fact through action.",
  mystery:
    "Gentle puzzle / find-it story. A small mystery (lost item, missing pet, unexplained sound) is investigated and resolved page by page. No scary content.",
  comic:
    "Humor-driven. Visual gags, mild slapstick, expressive reactions. Punchline lands in the final 1-2 pages.",
};

function ageDescriptor(age: StoryBookPlanInput["age"]): string {
  return age === "tweens"
    ? "tweens aged 10-14"
    : age === "kids"
      ? "children aged 6-10"
      : "toddlers and preschoolers aged 3-6";
}

function buildSystemPrompt(): string {
  return `You are a professional planner for premium Amazon KDP children's picture books. You produce a single one-shot plan from a short brief — no clarifying questions. Output strictly via the schema; no prose, no markdown.

You output a FULL-COLOR PICTURE BOOK plan, NOT a black-and-white coloring book. Every scene is rendered in color, with speech bubbles for dialogue.`;
}

function buildUserPrompt(input: StoryBookPlanInput): string {
  const audience = ageDescriptor(input.age);
  const hasType = !!input.storyType;
  const storyType = input.storyType;
  // When the user picks a type we apply that shape to the story. When
  // they leave it blank the planner stays close to whatever the user's
  // idea naturally is — for a named fable that means the canonical plot;
  // for an original idea that means the most natural narrative shape.
  const headline = hasType
    ? `Plan a ${storyType} picture book for ${audience} with EXACTLY ${input.pageCount} pages.`
    : `Plan a picture book for ${audience} with EXACTLY ${input.pageCount} pages.`;
  const typeGuidance = hasType
    ? `STORY TYPE GUIDANCE (${storyType}): ${STORY_TYPE_GUIDANCE[storyType!]}\nApply this shape on top of the user's idea — if the idea names a known fable, keep its canonical plot beats but re-style the pacing/tone to match the chosen type.`
    : `STORY TYPE: not specified — the user did not pick a shape. If the idea names a known fable (Aesop, Grimm, Hans Christian Andersen, Mother Goose, Bible parables, Panchatantra, Jataka, Hitopadesha, classic Western folklore), use that fable's CANONICAL plot beats — opening, rising action, turning point, resolution, moral if applicable. If the idea is original, pick the most natural narrative shape (a moral fable for a lesson-shaped idea, an adventure for a journey-shaped idea, a bedtime tale for a soothing idea, etc.). Do not force a structure that doesn't fit.`;
  const namesSeed = input.characterNames?.trim();
  const namesInstruction = namesSeed
    ? `The user requested these character names: ${namesSeed}. Reuse these names verbatim in the locked \`characters\` list and inside every \`prompts[].subject\` and \`dialogue.speaker\`. You may add up to ONE more character if the story really needs it; otherwise stay with the names provided.`
    : `The user did not specify character names. Invent 1-3 short, friendly, kid-safe names that fit the story (e.g. "Pip", "Daisy", "Miss Honey"). For a known fable, use the canonical character names if the fable has them (Aesop's "Tortoise" and "Hare", Grimm's named protagonists, etc.). Avoid copyrighted character names.`;

  return `${headline}

USER'S STORY IDEA: "${input.idea}"

${typeGuidance}

CHARACTERS
${namesInstruction}

CHARACTER LOCK — CRITICAL (most common quality killer)
Lock 1-3 recurring characters in the top-level \`characters\` array. EACH descriptor MUST include SIX specific traits:
1. Species (e.g. "small panda", "tortoise", "young dragon").
2. RELATIVE SIZE compared to the OTHER characters in this book (e.g. "roughly half the height of Mighty", "about 2× the size of Tiny", "small enough to sit on the lion's paw").
3. At least 2 distinct visual features — color, body shape, fur/feather/scale type, eye style.
4. Tail / feet / ears differentiator (especially when another character could be confused — "thin pink string-like tail (NOT a furry lion-tail)").
5. ACCESSORY COUNT + PLACEMENT — when a character wears something, spell out EXACTLY ONE of it and where it sits ("wears a single red wristwatch on the LEFT wrist", "ONE blue bow tied at the neck"), so the renderer never duplicates it across pages.
6. NEGATIVE CONSTRAINTS — list what the character DOES NOT have, especially body markings the model commonly invents: "NO logo on chest, NO target on belly, NO heart marking, NO tribal pattern, NO collar, NO bow tie, NO clothing other than the listed backpack". Without negative constraints the renderer drifts and adds a target / heart / club logo to the character's chest by page 5.

Reuse each character's name VERBATIM inside every \`prompts[].subject\` and inside every \`dialogue.speaker\`. The image renderer pins identity by exact name match.

NARRATIVE FLOW (universal — applies to every story regardless of subject)
The book MUST read like ONE STORY with a beginning, middle, and end — not ${input.pageCount} disconnected scenes with the same characters. Apply these rules to the prompts array:

1. ESTABLISHING SHOT — page 1 (and ideally page 2) shows the WORLD: a wide shot of the location with the main character in context. NEVER open on a tight close-up of a single action. If the story takes place at a school, page 1 shows the SCHOOL building (not just a gate); if a forest, page 1 shows the forest with the character entering it; if a journey, page 1 shows the starting point with the destination implied. The reader needs to know WHERE we are before WHAT happens.

2. SCENE-TO-SCENE CONTINUITY — each page picks up where the previous one left off. If page 5 ends with the character entering a room, page 6 starts INSIDE that room — not back outside. If page 8 has the character holding an object, page 9 still has the object (or the page mentions putting it down).

3. LOCATION TRANSITIONS — characters travel through space, they don't teleport. When the story moves from one place to another, the BRIDGING page shows the movement explicitly ("walking toward the door", "stepping outside"). Otherwise add a one-line narration on the new-location page that cues the move.

4. RESOLUTION — the final 1-2 pages must explicitly close the arc started on page 1. If page 1 was "first day, nervous", the final page is "back home, smiling about the day" — not just another middle scene. Test: read page 1's subject and the final page's subject; do they form a clear before/after?

5. SCENE TITLES TELL THE STORY — read the \`name\` fields top-to-bottom. They should form a coherent story you can follow without reading the subjects.

6. BRIDGING DIALOGUE — when the location or activity changes between pages, add a short \`dialogue\` line or \`narration\` on the new-location page that bridges ("Time to head outside!" / "After lunch we played...").

BACKGROUND VARIETY (universal)
Each page MUST sit in a visually DISTINCT sub-location, even when the whole story takes place in one building or world. Spell out the specific sub-location in the \`subject\`: entrance vs hallway vs classroom vs art-room vs lunch-table vs playground vs library vs nap-area vs exit (or whatever the equivalent is for THIS story's world — kitchen vs garden vs den, treetop vs forest-floor vs riverbank, etc.). Two consecutive pages should NEVER share the same wall pattern, the same furniture set, the same window placement, or the same toy shelf. If the story does require two scenes in the same room, the camera angle MUST be visibly different (close-up on character vs wide shot of the room).

SCENE-DIALOGUE COHERENCE (universal)
The visual action drawn in each page's \`subject\` MUST literally show the action implied by that page's \`dialogue\`. If a character says "Watch out!" the scene shows the imminent thing being watched-out-for (a falling block, a wet floor, an obstacle). If a character says "Write your name here!" the scene shows a name tag, paper, or sign-in sheet visible on the page. A speech bubble that doesn't match the visible action confuses the reader. Test every page: if the dialogue mentions an object or action, that object or action must be visible in the subject.

PALETTE LOCK
Pick a 3-8 hex color palette that locks the whole book to one consistent color world. One dominant background tone, one or two character accents, and one warm neutral. The palette label is a short human description ("Cheerful bright", "Soft pastel woodland"); the hex values are what the renderer enforces.

NARRATIVE SPATIAL CONTINUITY (for race / chase / journey stories)
If the story has a SPATIAL ARC, every \`subject\` after the turning point must be SPATIALLY CONSISTENT with the outcome. Spell out the spatial state in the \`subject\` itself — "Tortoise plods steadily, NOW AHEAD of the napping hare in the foreground; the hare is small in the distant background asleep." Don't rely on the renderer to infer "who's ahead" from the scene name alone.

SCENE COMPOSITION VARIETY
Each \`subject\` describes a VISUALLY DISTINCT moment — different camera framing, different action, different focal element. Vary close-ups, wide shots, action mid-stride, object focus, looking-up / looking-down angles. Each scene gets 1-2 SCENE-SPECIFIC props that don't appear on every page.

DIALOGUE AND NARRATION (per page, optional)
- \`dialogue\`: up to 2 speech bubbles per page, hard cap 12 words per line. Skip on wordless action pages.
- \`narration\`: optional one-line caption (max 14 words) for pages that need a sentence of narrator context. Use sparingly.
- \`composition\`: optional camera/framing hint.

Anatomy: render every animal with the correct body-part count for its species — rabbits/hares have EXACTLY 2 ears, tortoises have EXACTLY 4 legs poking out from under the shell, mammals have 4 legs / 2 eyes / 1 tail. The renderer enforces this; don't write descriptions that imply extras.

OUTPUT SHAPE — strict
- "title": ≤200 chars, KDP-ready full title (include audience and product type, e.g. "Pip's First Day: A Picture Book for Toddlers Ages 3-6").
- "coverTitle": short cover title, max 60 chars.
- "description": 25-45 word Amazon product description (parent-facing, calm, evocative).
- "scene": shared backdrop / world for the whole book (2-3 elements max).
- "coverScene": vivid cover description showing the locked characters together.
- "backCoverTagline": ONE clean parent-facing tagline (10-18 words, hard cap 18) that gets rendered verbatim on the back cover. Calm, elegant, references one concrete noun from the story. Penguin-Classics back-cover energy. NEVER include character descriptor parentheticals like "(small)", "(with stripes)", or restate locked-character traits — this string is human-readable prose, NOT a re-statement of the characters list. Avoid clichés ("hours of fun", "splashing colors"). Don't claim "hand-drawn" / "hand-illustrated" / "handmade".
- "bottomStripPhrases": EXACTLY 3 short ALL-CAPS phrases (12-22 chars each) tailored to THIS story.
- "sidePlaqueLines": EXACTLY 3 short ALL-CAPS lines (6-22 chars each).
- "coverBadgeStyle": ONE sentence describing the visual design language of the cover overlays.
- "characters": 1-3 entries with locked descriptors per the rules above.
- "palette": { name, hexes: [...] } — 3-8 hex colors.
- "prompts": EXACTLY ${input.pageCount} entries in narrative order. Each has name, subject, optional dialogue, optional narration, optional composition.
- "notes": one short line flagging anything assumed or unclear (optional).

${NO_REAL_BRAND_RULE} Public-domain folktales and fully original stories only.

Output is a full-color picture book — speech bubbles, dialogue text, and full-bleed full-color illustrations are expected.`;
}

export async function planStoryBook(
  input: StoryBookPlanInput,
): Promise<StoryBookPlan> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }
  const result = await generateObject({
    model: openai(OPENAI_TEXT_MODEL),
    system: buildSystemPrompt(),
    prompt: buildUserPrompt(input),
    schema: PLAN_SCHEMA,
  });
  const raw = result.object;
  // Guard against the model under-shooting the requested page count. A
  // picture-book with too few scenes breaks the narrative arc.
  if (raw.prompts.length < Math.min(input.pageCount, 5)) {
    throw new Error(
      `Story planner returned only ${raw.prompts.length} pages; expected ~${input.pageCount}.`,
    );
  }
  // Normalize the strict-mode null fields back to undefined so consumers
  // can keep using the simpler optional-property pattern.
  return {
    title: raw.title,
    coverTitle: raw.coverTitle,
    description: raw.description,
    scene: raw.scene,
    coverScene: raw.coverScene,
    backCoverTagline: raw.backCoverTagline,
    bottomStripPhrases: raw.bottomStripPhrases,
    sidePlaqueLines: raw.sidePlaqueLines,
    coverBadgeStyle: raw.coverBadgeStyle ?? undefined,
    characters: raw.characters,
    palette: raw.palette,
    prompts: raw.prompts.map((p) => ({
      name: p.name,
      subject: p.subject,
      dialogue: p.dialogue ?? undefined,
      narration: p.narration ?? undefined,
      composition: p.composition ?? undefined,
    })),
    notes: raw.notes ?? undefined,
  };
}
