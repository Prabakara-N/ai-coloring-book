import { openai } from "@ai-sdk/openai";
import {
  generateText,
  tool,
  type ModelMessage,
  type AssistantModelMessage,
  type ToolModelMessage,
  type ToolCallPart,
} from "ai";
import { z } from "zod";
import { OPENAI_TEXT_MODEL } from "@/lib/constants";
import { lookupCanonicalPlot } from "@/lib/canonical-fable";
import { NO_REAL_BRAND_RULE } from "@/lib/prompts";

// Text-only book brief chat — cheaper than the vision-critical refine
// chat. Distinct constant from OPENAI_REFINE_MODEL so the vision paths
// (refine-chat / quality-gate / character-extractor / style-extractor)
// stay on gpt-5.5 even when text models are upgraded.
const MODEL_ID = OPENAI_TEXT_MODEL;

export type BookChatMode = "qa" | "story";

/**
 * One locked story-book character. Story-mode briefs include 1-3 of these so
 * the renderer can ship recurring characters that look identical across every
 * page. QA-mode briefs leave this field undefined.
 */
export interface BookBriefCharacter {
  name: string;
  descriptor: string;
}

/** Locked story-book palette — used on every page render in story mode. */
export interface BookBriefPalette {
  name: string;
  hexes: string[];
}

/** Optional speech bubble on a story-book page. */
export interface BookBriefDialogueLine {
  speaker: string;
  text: string;
}

export interface BookBriefPrompt {
  name: string;
  subject: string;
  /** Story mode only — 0-2 speech bubbles to render on this page. */
  dialogue?: BookBriefDialogueLine[];
  /** Story mode only — short caption rendered above/below the page art. */
  narration?: string;
  /** Story mode only — soft camera / framing hint (e.g. "wide shot, both characters left of center"). */
  composition?: string;
}

export interface BookBrief {
  name: string;
  icon: string;
  coverScene: string;
  pageScene: string;
  prompts: BookBriefPrompt[];
  bottomStripPhrases?: string[];
  sidePlaqueLines?: string[];
  coverBadgeStyle?: string;
  /** Story mode only — 1-3 locked characters used for cross-page consistency. */
  characters?: BookBriefCharacter[];
  /** Story mode only — locked color palette applied to every page. */
  palette?: BookBriefPalette;
}

export type BookChatView =
  | {
      kind: "question";
      question: string;
      options: string[];
      /** Optional per-option tooltip strings, indexed-aligned with `options`. */
      option_descriptions?: string[];
      allow_freeform: boolean;
      allow_multi: boolean;
    }
  | { kind: "brief"; brief: BookBrief }
  | { kind: "message"; text: string };

export interface BookChatTurnResult {
  messages: ModelMessage[];
  view: BookChatView;
}

const QA_SYSTEM_PROMPT = `You are Sparky AI ✨ — the friendly book-planning assistant for CrayonSparks. You help a creator design an AI-generated coloring book that will be sold on Amazon KDP. If the user asks who you are or your name, say "I'm Sparky AI, the planner inside CrayonSparks". Stay warm, brief, and a little playful.

CONVERSATION STYLE — VERY IMPORTANT
You are a real assistant, not a form-filler. Match the user's energy:
- Greetings ("hi", "hello", "hey", "good morning") → reply warmly with a short conversational message (no tool call). Acknowledge the hello, briefly say what you can help with, and invite them to share an idea. Example: "Hey! I'm Sparky — I help plan kid-friendly coloring books. Tell me a theme or audience you have in mind, or ask me for niche ideas."
- Casual questions like "what do you do?", "how does this work?", "what can you make?" → reply with a short message explaining (no tool call).
- Vague messages ("idk", "help me", "give me ideas") → reply with a short message offering 2-3 starter directions, no question yet.
- ONLY when the user expresses real intent (a theme, a niche, "make me a book about X", or accepts one of your suggestions) do you start the planning flow with \`ask_user\`.
- Once planning has started, follow the rules below.

When you reply with a plain message (no tool call), keep it under 3 sentences and end with an open invite. Format for readability — when listing 3+ ideas/options/examples in plain text, put each on its own line with a leading "- " so the chat bubble renders them as a vertical list, not a wall of commas. NEVER use the bullet/dash style as a workaround for clickable choices — if the items are choices the user should pick from, call \`ask_user\` instead.

PLANNING JOB (after the user shows real intent)
Ask 3-6 short questions to learn enough about the idea, then call \`finalize_brief\` with a SINGLE-SUBJECT-per-page plan.

RULES
- Use \`ask_user\` to ask exactly ONE question per turn. Always include 3-5 quick-pick options when meaningful; default allow_freeform to true. Set allow_multi=true when the question is plural-by-nature (e.g. "which characters/themes/animals do you want?") so the user can pick several. Use allow_multi=false (default) for one-answer questions (age range, page count, art style).
- Cover these dimensions across questions: target audience (toddlers 3-6 / kids 6-10 / tweens 10-14 — KIDS ONLY, never offer "adults" as an option, the brand is kid-focused), main theme, art vibe, page count, sub-themes.
- Stop and call \`finalize_brief\` as soon as you have enough — never exceed 6 questions.
- Be warm but concise.

WHEN YOU CALL finalize_brief
- name: SHORT KDP cover title. STRICT: max 35 characters, ideally 15-30. Just the theme name — do NOT append "Coloring Book" or subtitles. Examples: "Jungle Animals", "Mighty Dinosaurs", "Magical Unicorns". The system appends " Coloring Book" automatically; keep it short so the cover title doesn't get cramped.
- icon: ONE emoji
- coverScene: vivid 2-4 character/object cover description
- pageScene: shared page backdrop, 2-3 elements, no smiling suns or cartoon-faced clouds
- bottomStripPhrases: EXACTLY 3 short ALL-CAPS phrases (12-22 chars each) tailored to THIS book's theme — one about content variety, one about a creative or developmental benefit, one about fun. Do NOT claim hand-drawn / hand-illustrated / handmade / original artwork. EXAMPLE format only (do not copy unless they truly fit): ["BIG SIMPLE DESIGNS","BOOSTS CREATIVITY","HOURS OF FUN"].
- sidePlaqueLines: EXACTLY 3 short ALL-CAPS lines (6-22 chars each) reading top-to-bottom as a parent-facing benefit statement. Tailor to the chosen audience (TODDLERS / KIDS / TWEENS) and theme. Do NOT claim hand-drawn / handmade. EXAMPLE format only: ["BIG & EASY","PAGES","PERFECT FOR TODDLERS!"].
- coverBadgeStyle: ONE sentence (max 200 chars) describing the design language of the cover's three overlay objects (page-count badge, side plaque, bottom ribbon) so they look like objects from THIS book's world rather than generic UI. ONE coherent system shared across all three overlays — material, shape, color motif. EXAMPLE format only (illustrative — derive from THIS book's actual subject): farm book → "rustic wooden plank signs with brown grain, painted cream lettering, rope or nail accents at the corners"; food book → "chalkboard menu boards with a warm wooden frame, white cursive chalk lettering, and small painted utensil motifs"; space book → "metallic brushed-steel control panels with rivets, glowing cyan indicator dots, and chrome edging".
- prompts: 15-30 items. Each \`subject\` is 8-14 words describing ONE animal/object/character with a distinctive pose. Each \`name\` is a 1-3 word page label.
- ${NO_REAL_BRAND_RULE}
- Subjects must be recognizable, age-appropriate, printable as B&W line art.
- No duplicates or near-duplicates.

🚫 CRITICAL TOOL-CALLING RULE — READ TWICE:
You MUST call exactly ONE tool per turn (\`ask_user\` OR \`finalize_brief\`). NEVER respond with plain text containing a question and options as bullets/list/dashes — the UI cannot render those as clickable. If you write text like "Choose: - Toddlers - Kids - Tweens" that is BROKEN behavior. Instead call \`ask_user\` with the question + options array. Even if a previous user message mentioned an image you can't directly see, call \`ask_user\` to ask the next clarifying question — DO NOT type the options inline. Plain-text responses are not allowed when there is a question with choices. The user's UI relies entirely on your tool calls to render clickable chips.`;

const STORY_SYSTEM_PROMPT = `You are Sparky AI ✨ — the friendly story coach for CrayonSparks. You help a creator turn a STORY into a multi-page coloring book where every page is a SCENE in narrative order, sold on Amazon KDP. If the user asks who you are, say "I'm Sparky AI, the planner inside CrayonSparks — and I know hundreds of classic fables".

CONVERSATION STYLE — VERY IMPORTANT
You are a real assistant, not a form-filler. Match the user's energy:
- Greetings ("hi", "hello", "hey") → reply warmly with a short conversational message (no tool call). Mention you know hundreds of classic fables (Aesop, Panchatantra, Grimm, Mother Goose) and can also build original stories. Invite them to share a title or idea. Example: "Hey! I'm Sparky — I love turning stories into coloring books. Drop a fable title (Tortoise & Hare, Crow & Pitcher, anything your kid loves) or tell me an original idea."
- Casual questions like "what do you do?", "what stories do you know?" → reply with a short message (no tool call).
- Vague messages ("idk", "help me", "give me ideas") → reply with a short message offering 2-3 starter fable suggestions, no question yet.
- ONLY when the user names a story (classic or original) or asks to begin planning do you start the planning flow with \`ask_user\` or \`lookup_canonical_plot\`.

When you reply with a plain message (no tool call), keep it under 3 sentences and end with an open invite. Format for readability — when listing 3+ ideas/options/examples in plain text, put each on its own line with a leading "- " so the chat bubble renders them as a vertical list, not a wall of commas. NEVER use the bullet/dash style as a workaround for clickable choices — if the items are choices the user should pick from, call \`ask_user\` instead.

PLANNING JOB (after the user names a story or accepts a suggestion)
Ask 2-4 short questions to clarify the story, then call \`finalize_brief\` with a NARRATIVE plan where each prompt is a scene in story order.

CLASSIC STORY RECOGNITION (IMPORTANT — READ THE GROUNDING RULES)
Many users will name a famous fable or moral story from school textbooks — Aesop's Fables, the Panchatantra, Jataka tales, Hitopadesha, Grimm's fairy tales, Hans Christian Andersen, Mother Goose, Bible parables, classic American/British children's stories.

When the user names a story title (e.g. "Union is Strength", "The Crow and the Pitcher", "The Foolish Donkey", "The Tortoise and the Hare", "The Three Little Pigs", "The Lion and the Mouse", "The Ugly Duckling", "Hansel and Gretel", "Jack and the Beanstalk", "Little Red Riding Hood", "Noah's Ark", etc.), pick ONE of these three paths:

1. ✅ HIGH CONFIDENCE — Western canonical fables you know cold (Aesop, Grimm, Mother Goose, Bible parables, very famous tales): recognize directly, confirm with one short question like "I know that one — the [one-line plot]. Use the classic version, or add a twist?" then build scenes from your training knowledge. NO lookup needed.

2. 🔍 GROUND IT — Regional or less-famous fables (Panchatantra, Jataka, Hitopadesha, regional folktales, lesser-known Aesop, anything where you're under ~90% confident on canonical plot): call \`lookup_canonical_plot\` FIRST with the exact title. The system returns a canonical plot summary from live web research. Use that summary as ground truth, then call \`ask_user\` to confirm scene count + age range, then \`finalize_brief\`. CRITICAL: Indian Panchatantra and Jataka tales have multiple regional versions — ALWAYS ground these with the lookup tool before planning.

3. ✏️ ORIGINAL — If the user explicitly says it's their own / original story: skip the lookup, ask about characters and arc directly via \`ask_user\`.

Rule of thumb: when in doubt about whether the canonical plot you "remember" is accurate, GROUND IT. The lookup is cheap; hallucinated plots are expensive (a customer notices and writes a 1-star review).

RULES
- Use \`ask_user\` to ask exactly ONE question per turn. Always include 3-5 quick-pick options when meaningful; default allow_freeform to true. Set allow_multi=true when the question is plural-by-nature (e.g. "which characters/themes/animals do you want?") so the user can pick several. Use allow_multi=false (default) for one-answer questions (age range, page count, art style).
- Questions should cover: which story (recognize classic title vs. original idea), main characters (or confirm canonical ones for classic stories), age range, scene count (typical 8-20), art vibe.
- For ORIGINAL story ideas: help shape it by asking about characters and arc.
- For CLASSIC stories: confirm the title-recognition with a one-line plot summary, ask only about scene count + age range, then go.
- Stop and call \`finalize_brief\` as soon as you have enough — usually 2-3 questions for classics, 3-4 for originals.

NARRATIVE FLOW (universal — applies to every story regardless of subject)
The book reads like ONE STORY with a beginning, middle, and end — not N disconnected scenes that share the same characters. Apply these rules to every \`finalize_brief\`:

1. ESTABLISHING SHOT — page 1 (and ideally page 2) shows the WORLD: a wide shot of the location with the main character in context. NEVER open on a tight close-up of a single action. If the story takes place at a school, page 1 shows the SCHOOL building (not just a gate); if a forest, page 1 shows the forest with the character entering it; if a journey, page 1 shows the starting point with the destination implied. The reader needs to know WHERE we are before WHAT happens.

2. SCENE-TO-SCENE CONTINUITY — each page picks up where the previous one left off. If page 5 ends with the character entering a room, page 6 starts INSIDE that room — not back outside. If page 8 has the character holding an object, page 9 still has the object (or the page mentions putting it down).

3. LOCATION TRANSITIONS — characters travel through space, they don't teleport. When the story moves from one place to another, the BRIDGING page should show the movement explicitly ("walking toward the door", "stepping outside"). Otherwise add a one-line narration on the new-location page that cues the move.

4. RESOLUTION — the final 1-2 pages must explicitly close the arc started on page 1. If page 1 was "first day, nervous", the final page is "back home, smiling about the day" — not just another middle scene. Test: read page 1's subject and the final page's subject; do they form a clear before/after?

5. SCENE TITLES TELL THE STORY — read the \`name\` fields top-to-bottom. They should form a coherent story you can follow without reading the subjects. "Morning Walk → School Gates → Shy Hello → Name Tag → Make a Friend → ... → Wave Goodbye" is OK. "Bao Smiles → Bao Eats → Bao Plays → Bao Rests" is NOT a story — those are independent moments.

6. BRIDGING DIALOGUE — when the location or activity changes between pages, use one short \`dialogue\` line or \`narration\` on the new-location page to bridge ("Time to head outside!" / "After lunch we played..."). This stops the reader feeling whiplash between unrelated scenes.

BACKGROUND VARIETY (universal)
Each page MUST sit in a visually DISTINCT sub-location, even when the whole story takes place in one building or world. Spell out the specific sub-location in the \`subject\`: entrance vs hallway vs classroom vs art-room vs lunch-table vs playground vs library vs nap-area vs exit (or whatever the equivalent is for THIS story's world — kitchen vs garden vs den, treetop vs forest-floor vs riverbank, etc.). Two consecutive pages should NEVER share the same wall pattern, the same furniture set, the same window placement, or the same toy shelf. If the story does require two scenes in the same room, the camera angle MUST be visibly different (close-up on character vs wide shot of the room).

SCENE-DIALOGUE COHERENCE (universal)
The visual action drawn in each page's \`subject\` MUST literally show the action implied by that page's \`dialogue\`. If a character says "Watch out!" the scene shows the imminent thing being watched-out-for (a falling block, a wet floor, an obstacle). If a character says "Write your name here!" the scene shows a name tag, paper, or sign-in sheet visible on the page. A speech bubble that doesn't match the visible action confuses the reader and reads as broken to KDP reviewers. Test every page: cover the dialogue with your hand — can a child still tell what's happening from the picture alone? If yes AND the dialogue then ADDS context, you're fine. If the dialogue describes something not in the picture, fix the subject.

CHARACTER CONSISTENCY (CRITICAL — most common quality killer)
This rule applies to EVERY book regardless of species/theme. Examples below use lion+mouse and farm animals + space alien just to TEACH the pattern — apply the SAME pattern to whatever characters this book actually has (cats, dragons, robots, fairies, foxes, dolphins, anything).

- BEFORE writing any scene, lock 1-3 character descriptors. Each descriptor MUST include SIX specific traits: (a) species, (b) RELATIVE SIZE compared to other characters in this book / a known object, (c) at least 2 distinct visual features (color, body shape, fur/feather/scale type, eye style), (d) any clothing/accessory + tail/feet type if it's a feature that could be confused with another species in the same book, (e) ACCESSORY COUNT + PLACEMENT — when a character wears an accessory (watch, bow, hat, scarf, medal, backpack), spell out EXACTLY ONE of it and where it sits ("a single red wristwatch on the LEFT wrist", "ONE blue bow tied at the neck"), so the renderer never duplicates it across pages or drifts it to a different limb, (f) NEGATIVE CONSTRAINTS — list what the character DOES NOT have, especially body markings the model commonly invents: "NO logo on chest, NO target on belly, NO heart marking, NO tribal pattern, NO collar, NO bow tie, NO clothing other than the listed backpack". Without negative constraints the renderer drifts and adds a target / heart / club logo to the character's chest by page 5.

- Examples (TEACHING the pattern — your book may have totally different species):
  Lion+Mouse fable:
    Bad:  "Mighty: a brave lion"
    Good: "Mighty: a large adult lion roughly 4× the size of the mouse, golden mane, muscular body, long furry tail with tassel, no clothes, cheerful expression"
    Bad:  "Tiny: a small mouse"
    Good: "Tiny: a small grey mouse, slim body NOT chubby, tiny round ears, thin pink string-like tail (NEVER a long furry tail like the lion's), no clothes"
  Farm book:
    Good: "Bessie: a large black-and-white Holstein cow, large body, short curved horns, pink udder, long thin tail with hair tuft (NOT bushy like the dog's)"
    Good: "Buddy: a medium golden retriever dog, fluffy fur, floppy ears, bushy tail (NOT thin like a cow's), no horns (NEVER add horns even though the cow has them)"
  Space book:
    Good: "Astra: a small purple alien, three short arms, two large round eyes, antennae on head (NOT animal ears), no tail at all"

- EVERY \`subject\` must restate ALL key features verbatim — species + size + 2 visual features + tail/feet/ears type. Do NOT shorten across pages — the image generator forgets character details between scenes and will swap features.

- Anti-mixing: when a scene has TWO+ characters, name BOTH and reaffirm what each one DOES and DOES NOT have, especially for body parts the other character has (a mouse near a lion must explicitly say "thin string tail, NOT a furry lion-tail"; a dog near a cow must say "floppy ears, NOT cow horns").

- 🚫 NO DUPLICATE CHARACTERS IN ONE SCENE: render each named character EXACTLY ONCE per page. If the scene has a Hare and a Tortoise, draw ONE hare and ONE tortoise — never two hares, never the hero appearing twice. If the brief calls for a CROWD or AUDIENCE (e.g. forest animals cheering at the finish line), describe them as "a small crowd of simple silhouetted forest animals in the background, no detailed faces" — do NOT list specific named characters in the crowd, and NEVER include the main hero IN the crowd watching themselves.

NARRATIVE SPATIAL CONTINUITY (load-bearing for race / chase / journey stories)
- When the story has a SPATIAL ARC — racing, chasing, journeying from A to B, climbing, falling, growing — every \`subject\` after the turning point must be SPATIALLY CONSISTENT with the outcome the user expects. Picture-book readers track who is "ahead" page-to-page through composition cues (left-of-frame vs right-of-frame, foreground vs background, finish line proximity). If page 6 says "Hare zooms ahead" and page 7 says "Hare is napping" the reader expects page 8 onward to show the TORTOISE ahead of the napping hare, not the hare still ahead.
- Tortoise-and-Hare (and any race story): once the hare stops/naps, EVERY subsequent scene puts the tortoise CLOSER to the finish line than the hare — never the reverse. The hare may chase from BEHIND in the final stretch, but the tortoise's lead must be visually obvious on the page (tortoise foreground / right side / closer to finish ribbon).
- Chase / pursuit stories: the chaser stays BEHIND in the frame on every chase page; reverse-chase only after a clear narrative beat ("the cat got tired", "the mouse turned around").
- Quest / journey stories: each scene moves visibly closer to the goal. Don't put the hero "almost at the castle" on page 4 and then "still in the forest" on page 6 — that breaks the arc.
- Spell out the spatial state in the \`subject\` itself: "Tortoise plods steadily, NOW AHEAD of the napping hare in the foreground; the hare is small in the distant background asleep under a tree." Don't rely on the renderer to infer "who's ahead" from the scene name alone.

SCENE COMPOSITION VARIETY (KDP buyers HATE repetitive layouts)
- Each \`subject\` must describe a VISUALLY DISTINCT moment — different camera framing, different action, different focal element. Do not write 8 scenes that are all "Hare and Tortoise standing on the path." Vary the staging:
  - Close-up on one character's expression (just the hare's panicked face)
  - Wide shot showing the whole landscape with characters small in frame
  - Action shot mid-stride, mid-jump, mid-fall, mid-sleep
  - Object focus (just the finish-line ribbon, just the trophy, just the hare's discarded boast-flag)
  - Looking-up / looking-down angles
- Vary which character is foreground vs. background per scene. Don't put both characters at the same camera distance every time.
- Each scene's \`subject\` should add 1-2 SCENE-SPECIFIC props that aren't on every other page (a tree stump for the napping scene, a stopwatch for the start-line, a banner for the finish, a mound of dirt at the burrow). These props are what make each page visually unique.

WHEN YOU CALL finalize_brief
- name: SHORT story-driven title for the KDP cover. STRICT: max 35 characters, ideally 15-30. Just the story name — do NOT append "Color the Story", "Coloring Book", subtitles, or em-dashes. Examples: "Union is Strength", "The Tortoise and the Hare", "The Crow and the Pitcher", "Three Little Pigs". The system will append " Coloring Book" automatically; keep it short so the cover title doesn't get cramped.
- icon: ONE emoji that fits
- coverScene: vivid cover showing the main characters together (use the locked descriptors)
- pageScene: shared page backdrop / world (e.g. "a sunny meadow path with rolling hills and scattered wildflowers"). 2-3 elements max, no smiling suns.
- bottomStripPhrases: EXACTLY 3 short ALL-CAPS phrases (12-22 chars each) tailored to THIS story — one about the story content (a moral, a journey, characters), one about a kid benefit (creativity, focus, story-time), one about fun or engagement. Do NOT claim hand-drawn / hand-illustrated / handmade / original artwork. EXAMPLE format only (do not copy unless they truly fit): ["BIG SIMPLE DESIGNS","BOOSTS CREATIVITY","HOURS OF FUN"].
- sidePlaqueLines: EXACTLY 3 short ALL-CAPS lines (6-22 chars each) reading top-to-bottom as a parent-facing benefit statement. Tailor to the chosen audience (TODDLERS / KIDS / TWEENS) and the story. Do NOT claim hand-drawn / handmade. EXAMPLE format only: ["BIG & EASY","PAGES","PERFECT FOR TODDLERS!"].
- prompts: 8-20 items in STORY ORDER. Each \`name\` is a 1-3 word scene label ("Start Line", "Hare Naps", "Finish"). Each \`subject\` is 12-20 words describing the scene with the locked character descriptors inline. Each prompt MAY include up to 2 \`dialogue\` lines (speaker + text, hard cap 12 words per line) when the scene has natural speech — wordless action pages should omit dialogue entirely. Optional \`narration\` (max 14 words) for pages that need a sentence of narrator context. Optional \`composition\` for camera/framing hints.
- characters: 1-3 recurring characters that appear across multiple pages. Each entry is { name, descriptor } where descriptor restates the FOUR-trait lock from the CHARACTER CONSISTENCY section above (species, RELATIVE size compared to the others, 2+ visual features, clothing/tail/feet differentiator). Reuse the same name verbatim in every \`dialogue.speaker\` and inside each \`subject\` so the renderer can pin character identity across pages.
- palette: 3-8 hex colors that lock the whole book to one consistent color world. Pick one dominant background tone, one or two character accents, and one warm neutral. The label (\`palette.name\`) is a short human description; the values (\`palette.hexes\`) are what the renderer enforces.
- ${NO_REAL_BRAND_RULE} Public-domain folktales and fully original stories only.
- Output is a full-color picture book (NOT a B&W coloring book). Speech bubbles, dialogue text, and full-bleed full-color illustrations are allowed and expected.

🚫 CRITICAL TOOL-CALLING RULE — READ TWICE:
You MUST call exactly ONE tool per turn (\`ask_user\` OR \`finalize_brief\`). NEVER respond with plain text containing a question and options as bullets/list/dashes — the UI cannot render those as clickable. If you write text like "Choose: - Toddlers - Kids - Tweens" that is BROKEN behavior. Instead call \`ask_user\` with the question + options array. Even if a previous user message mentioned an image you can't directly see, call \`ask_user\` to ask the next clarifying question — DO NOT type the options inline. Plain-text responses are not allowed when there is a question with choices. The user's UI relies entirely on your tool calls to render clickable chips.`;

const askUserSchema = z.object({
  question: z.string().describe("One short question to ask the user."),
  options: z
    .array(z.string())
    .max(8)
    .describe(
      "Up to 8 quick-pick option labels (use up to 5 for single-select, up to 8 when allow_multi). Empty array if open-ended.",
    ),
  option_descriptions: z
    .array(z.string())
    .max(8)
    .optional()
    .describe(
      "OPTIONAL — provide a 6-14 word tooltip describing each option in the same order as `options`. STRONGLY ENCOURAGED for jargon or aesthetic choices users might not recognize ('classic style', 'bold outlines', 'flat 2D', 'mandala'). Skip for self-evident options (age ranges, page counts). When provided, the array length MUST match `options` length. Example for ['Classic style', 'Modern style', 'Cute kawaii']: ['Hand-drawn fable feel — think Aesop or Grimm illustrations', 'Clean Pixar-like shapes with rounded edges', 'Big eyes, soft pastels, sticker-friendly Japanese cuteness'].",
    ),
  allow_freeform: z
    .boolean()
    .describe("Whether the user may also type a custom answer."),
  allow_multi: z
    .boolean()
    .describe(
      "When true, the user picks SEVERAL of the options (e.g. choosing characters, themes, sub-topics). When false (default for most questions), they pick ONE (e.g. age range, page count, art style). Use multi for plural-by-nature questions: 'which characters', 'which themes', 'which animals'. Use single for one-answer questions: 'what age range', 'how many pages'.",
    ),
});

const lookupCanonicalPlotSchema = z.object({
  title: z
    .string()
    .min(2)
    .max(150)
    .describe(
      "The exact title of the classic fable / moral story / fairy tale the user mentioned. Examples: 'The Crow and the Pitcher', 'Union is Strength', 'The Foolish Donkey', 'The Hare in the Moon'.",
    ),
});

const finalizeBriefSchema = z.object({
  name: z.string().min(1).max(60).describe("Short book name."),
  icon: z.string().min(1).max(4).describe("A single emoji."),
  coverScene: z.string().min(10).describe("Vivid cover description."),
  pageScene: z.string().describe("Shared page backdrop, 2-3 elements max."),
  bottomStripPhrases: z
    .array(z.string().min(3).max(28))
    .length(3)
    .describe(
      "EXACTLY 3 short ALL-CAPS marketing phrases (each 12-22 characters) shown as a footer ribbon on the front cover. Each phrase highlights a different selling angle for THIS book — one about content variety, one about a creative or developmental benefit, one about fun or engagement. Tailor wording to the actual subject. Do not claim hand-drawn / hand-illustrated / handmade / original artwork. EXAMPLE format only: ['BIG SIMPLE DESIGNS', 'BOOSTS CREATIVITY', 'HOURS OF FUN'].",
    ),
  sidePlaqueLines: z
    .array(z.string().min(3).max(32))
    .length(3)
    .describe(
      "EXACTLY 3 short ALL-CAPS lines (each 6-22 characters) for a stacked plaque on the cover, top to bottom forming one benefit statement to the parent. Tailor to age + theme. Do not claim hand-drawn / handmade. EXAMPLE format only: ['BIG & EASY', 'PAGES', 'PERFECT FOR TODDLERS!'].",
    ),
  coverBadgeStyle: z
    .string()
    .min(20)
    .max(200)
    .describe(
      "ONE sentence (max 200 chars) describing the visual design language of the cover overlay objects (page-count badge, side plaque, bottom ribbon). Pick objects, materials, shapes, and color motifs that BELONG inside this book's world so overlays feel native to the scene. ONE coherent design system shared across all three overlays. EXAMPLE format only (illustrative — derive from THIS book's actual subject, do not copy): farm book → 'rustic wooden plank signs with brown grain, painted cream lettering, rope or nail accents at the corners'; food book → 'chalkboard menu boards with a warm wooden frame, white cursive chalk lettering, and small painted utensil motifs'; space book → 'metallic brushed-steel control panels with rivets, glowing cyan indicator dots, and chrome edging'.",
    ),
  prompts: z
    .array(
      z.object({
        name: z.string().min(1).describe("1-3 word page/scene label."),
        subject: z
          .string()
          .min(6)
          .describe(
            "Description of what to draw on this page. Single subject for QA mode, full scene for story mode.",
          ),
        dialogue: z
          .array(
            z.object({
              speaker: z
                .string()
                .min(1)
                .describe(
                  "Name of the speaking character. MUST exactly match a name in the top-level `characters` list.",
                ),
              text: z
                .string()
                .min(1)
                .max(80)
                .describe(
                  "Spoken line. Hard cap 12 words for toddler-band books — short, simple, parent-readable.",
                ),
            }),
          )
          .max(2)
          .optional()
          .describe(
            "STORY MODE ONLY. Up to 2 speech bubbles for this page. Omit when the scene has no dialogue (e.g. a wordless action page). Each speaker MUST appear in the top-level characters list.",
          ),
        narration: z
          .string()
          .max(120)
          .optional()
          .describe(
            "STORY MODE ONLY. Optional one-line narration (max ~14 words) rendered as a small caption at the top or bottom of the page. Use sparingly — most pages let the dialogue and art carry the story.",
          ),
        composition: z
          .string()
          .max(160)
          .optional()
          .describe(
            "STORY MODE ONLY. Optional soft framing/camera hint for this page (e.g. 'wide shot, both characters left of center, sunset behind them'). Keep brief.",
          ),
      }),
    )
    .min(5)
    .max(50),
  characters: z
    .array(
      z.object({
        name: z
          .string()
          .min(1)
          .max(40)
          .describe(
            "Short name as it appears in dialogue (e.g. 'Pip'). Must be reused verbatim in every prompt.subject and dialogue.speaker.",
          ),
        descriptor: z
          .string()
          .min(20)
          .max(400)
          .describe(
            "Full visual descriptor — species, RELATIVE size compared to the other characters, body shape, color, distinguishing features, accessories. Reused on every page so the image model doesn't drift between scenes.",
          ),
      }),
    )
    .max(3)
    .optional()
    .describe(
      "STORY MODE ONLY. 1-3 recurring characters for the whole book. Required when the story has named characters that appear on multiple pages.",
    ),
  palette: z
    .object({
      name: z
        .string()
        .min(1)
        .max(60)
        .describe(
          "Human label for the palette (e.g. 'Cheerful bright', 'Soft pastel woodland'). Shown in chat UI, not in the prompt body.",
        ),
      hexes: z
        .array(z.string().regex(/^#?[0-9a-fA-F]{6}$/))
        .min(3)
        .max(8)
        .describe(
          "3-8 hex colors. Every page in the book is rendered using only these colors and tonal blends of them.",
        ),
    })
    .optional()
    .describe(
      "STORY MODE ONLY. Locked color palette for every page render. Pick warm, kid-friendly hues; aim for one dominant background tone, one or two character accents, and one warm neutral.",
    ),
});

type AskUserInput = z.infer<typeof askUserSchema>;
type FinalizeInput = z.infer<typeof finalizeBriefSchema>;
type LookupInput = z.infer<typeof lookupCanonicalPlotSchema>;

const TOOLS = {
  ask_user: tool({
    description:
      "Ask the user one short question to clarify the book brief. Provide 3-5 quick-pick options when possible.",
    inputSchema: askUserSchema,
  }),
  finalize_brief: tool({
    description:
      "Call when you have enough info to produce the final book plan with all prompts.",
    inputSchema: finalizeBriefSchema,
  }),
  lookup_canonical_plot: tool({
    description:
      "STORY MODE ONLY. Use when the user names a classic fable / moral story / fairy tale AND you are not fully confident about the canonical plot — especially regional Indian/Asian tales (Panchatantra, Jataka, Hitopadesha) which have multiple versions. Returns a canonical plot summary grounded in live web research. Do NOT use for original user-invented stories or for very famous Western fables you know cold. After receiving the plot, treat it as ground truth and continue with ask_user / finalize_brief.",
    inputSchema: lookupCanonicalPlotSchema,
  }),
} as const;

function viewFromAsk(args: AskUserInput): BookChatView {
  const allowMulti = args.allow_multi ?? false;
  const max = allowMulti ? 8 : 5;
  const options = args.options
    .map((o) => o.trim())
    .filter(Boolean)
    .slice(0, max);
  const rawDescs = args.option_descriptions ?? [];
  // Only emit descriptions when the count matches options exactly —
  // otherwise the indices won't line up and tooltips become misleading.
  const option_descriptions =
    rawDescs.length === args.options.length
      ? rawDescs
          .map((d) => d.trim())
          .slice(0, max)
      : undefined;
  return {
    kind: "question",
    question: args.question.trim(),
    options,
    option_descriptions,
    allow_freeform: args.allow_freeform,
    allow_multi: allowMulti,
  };
}

function viewFromFinalize(args: FinalizeInput): BookChatView {
  const prompts: BookBriefPrompt[] = args.prompts
    .map((p) => {
      const dialogue =
        Array.isArray(p.dialogue) && p.dialogue.length > 0
          ? p.dialogue
              .map((d) => ({
                speaker: d.speaker.trim(),
                text: d.text.trim().replace(/\s+/g, " "),
              }))
              .filter((d) => d.speaker && d.text)
              .slice(0, 2)
          : undefined;
      return {
        name: p.name.trim(),
        subject: p.subject.trim(),
        dialogue: dialogue && dialogue.length > 0 ? dialogue : undefined,
        narration: p.narration?.trim().slice(0, 120) || undefined,
        composition: p.composition?.trim().slice(0, 160) || undefined,
      };
    })
    .filter((p) => p.name && p.subject);
  if (prompts.length < 5) {
    throw new Error(
      `Model returned too few prompts (${prompts.length}). Try again.`,
    );
  }
  const characters: BookBriefCharacter[] | undefined =
    Array.isArray(args.characters) && args.characters.length > 0
      ? args.characters
          .map((c) => ({
            name: c.name.trim(),
            descriptor: c.descriptor.trim(),
          }))
          .filter((c) => c.name && c.descriptor)
          .slice(0, 3)
      : undefined;
  const palette: BookBriefPalette | undefined =
    args.palette && Array.isArray(args.palette.hexes)
      ? {
          name: args.palette.name.trim(),
          hexes: args.palette.hexes
            .map((h) => h.trim())
            .filter((h) => /^#?[0-9a-fA-F]{6}$/.test(h))
            .map((h) => (h.startsWith("#") ? h.toUpperCase() : `#${h.toUpperCase()}`))
            .slice(0, 8),
        }
      : undefined;
  return {
    kind: "brief",
    brief: {
      name: args.name.trim().slice(0, 60),
      icon: args.icon.trim().slice(0, 4) || "📚",
      coverScene: args.coverScene.trim(),
      pageScene: args.pageScene.trim(),
      prompts,
      bottomStripPhrases: cleanPhraseTriple(args.bottomStripPhrases),
      sidePlaqueLines: cleanPhraseTriple(args.sidePlaqueLines),
      coverBadgeStyle: args.coverBadgeStyle?.trim().slice(0, 200) || undefined,
      characters: characters && characters.length > 0 ? characters : undefined,
      palette: palette && palette.hexes.length >= 3 ? palette : undefined,
    },
  };
}

function cleanPhraseTriple(value: string[] | undefined): string[] | undefined {
  if (!Array.isArray(value) || value.length !== 3) return undefined;
  const cleaned = value
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => s.length > 0);
  return cleaned.length === 3 ? cleaned : undefined;
}

function toolCallParts(message: AssistantModelMessage): ToolCallPart[] {
  if (typeof message.content === "string") return [];
  return message.content.filter(
    (p): p is ToolCallPart => p.type === "tool-call",
  );
}

/** Hard cap on Perplexity grounding round-trips per turn. */
const MAX_GROUNDING_PASSES = 1;

export async function runBookChatTurn(
  incoming: ModelMessage[],
  mode: BookChatMode = "qa",
): Promise<BookChatTurnResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const system = mode === "story" ? STORY_SYSTEM_PROMPT : QA_SYSTEM_PROMPT;

  let messages: ModelMessage[] = incoming;
  let groundingsLeft = mode === "story" ? MAX_GROUNDING_PASSES : 0;

  // Loop: in story mode the model may first call lookup_canonical_plot for
  // grounding, we resolve via Perplexity, then re-call so the model can emit
  // the user-facing tool (ask_user / finalize_brief). Capped at 2 passes total.
  for (let step = 0; step < 2; step++) {
    const result = await generateText({
      model: openai(MODEL_ID),
      system,
      messages,
      tools: TOOLS,
      toolChoice: "auto",
    });

    const newAssistant = result.response.messages
      .filter((m): m is AssistantModelMessage => m.role === "assistant")
      .at(-1);
    if (!newAssistant) {
      throw new Error("OpenAI returned no assistant message.");
    }

    messages = [...messages, newAssistant];
    const calls = toolCallParts(newAssistant);

    if (calls.length === 0) {
      const text = result.text || "";
      return { messages, view: { kind: "message", text } };
    }

    const first = calls[0];

    // Grounding pass: resolve Perplexity, append real tool-result, loop.
    if (first.toolName === "lookup_canonical_plot" && groundingsLeft > 0) {
      groundingsLeft--;
      const { title } = first.input as LookupInput;
      let plotSummary: string;
      try {
        const r = await lookupCanonicalPlot(title);
        plotSummary = r.summary;
      } catch {
        plotSummary = `Could not fetch live data for "${title}". Use your training knowledge of this story; if you're uncertain on key plot beats, ask the user to confirm them with ask_user.`;
      }
      const toolResult: ToolModelMessage = {
        role: "tool",
        content: calls.map((c) => ({
          type: "tool-result" as const,
          toolCallId: c.toolCallId,
          toolName: c.toolName,
          output:
            c.toolName === "lookup_canonical_plot"
              ? { type: "text" as const, value: plotSummary }
              : { type: "json" as const, value: { ok: true } },
        })),
      };
      messages = [...messages, toolResult];
      continue;
    }

    // Terminal tools (ask_user / finalize_brief): ack with stub result; UI
    // renders from the assistant's tool-call args, not the tool-result body.
    const stubResult: ToolModelMessage = {
      role: "tool",
      content: calls.map((c) => ({
        type: "tool-result" as const,
        toolCallId: c.toolCallId,
        toolName: c.toolName,
        output: { type: "json" as const, value: { ok: true } },
      })),
    };
    messages = [...messages, stubResult];

    if (first.toolName === "ask_user") {
      return { messages, view: viewFromAsk(first.input as AskUserInput) };
    }
    if (first.toolName === "finalize_brief") {
      return { messages, view: viewFromFinalize(first.input as FinalizeInput) };
    }
    if (first.toolName === "lookup_canonical_plot") {
      // Grounding budget exhausted — ask the user to summarize so we can move on.
      return {
        messages,
        view: {
          kind: "message",
          text: "Hmm, I couldn't verify that story's canonical plot. Could you give me a one-line summary so I can plan the scenes accurately?",
        },
      };
    }
    throw new Error(`Unknown tool: ${first.toolName}`);
  }

  // Two passes used and still no terminal tool — graceful fallback.
  return {
    messages,
    view: {
      kind: "message",
      text: "Let me try that again — could you describe the story in one or two sentences?",
    },
  };
}
