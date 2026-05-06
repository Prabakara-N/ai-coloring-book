import { GoogleGenAI } from "@google/genai";
import { GEMINI_TEXT_MODEL } from "@/lib/constants";
import { NO_REAL_BRAND_RULE } from "@/lib/prompts";

const MODEL_ID = GEMINI_TEXT_MODEL;

let _client: GoogleGenAI | null = null;
function getClient() {
  const apiKey = process.env.GEMINI_NANO_BANANA_API_KEY;
  if (!apiKey) throw new Error("GEMINI_NANO_BANANA_API_KEY is not set.");
  if (!_client) _client = new GoogleGenAI({ apiKey });
  return _client;
}

export interface BookPlanInput {
  idea: string;
  pageCount: number;
  age?: "toddlers" | "kids" | "tweens";
}

export interface BookPlan {
  title: string;
  description: string;
  scene: string;
  coverTitle: string;
  coverScene: string;
  prompts: Array<{ name: string; subject: string }>;
  bottomStripPhrases?: string[];
  sidePlaqueLines?: string[];
  coverBadgeStyle?: string;
  notes?: string;
}

function buildPrompt({
  idea,
  pageCount,
  age = "toddlers",
}: BookPlanInput): string {
  const ageLabel =
    age === "tweens"
      ? "tweens aged 10-14"
      : age === "kids"
        ? "children aged 6-10"
        : "toddlers and preschoolers aged 3-6";

  return `You are a professional planner for children's coloring books sold on Amazon KDP. The user wants to make a coloring book for ${ageLabel}.

User's idea: "${idea}"

STEP 1 — DETECT STRUCTURE FROM THE USER'S IDEA
Read the idea and decide which structure fits the book. Both produce a black-and-white coloring book; only the per-page structure differs.

- THEME structure (default for browse-friendly KDP coloring books): the user names a topic with INDEPENDENT subjects. Examples of theme intent: "farm animals", "20 dinosaurs", "construction vehicles", "ocean creatures", "fall leaves", "alphabet animals", "mandalas". Each page = one stand-alone subject from the topic. No narrative — pages can be flipped in any order.

- STORY structure (when the user names a fable / fairy tale OR describes a narrative): the user references a known story (Aesop, Grimm, Hans Christian Andersen, Mother Goose, Bible parables, Panchatantra, Jataka, Hitopadesha, classic Western folklore) OR describes an original narrative ("a tiny dragon learning to fly", "a panda's first day at school", "a brave knight on a quest"). Each page = a SCENE in the story in narrative order, with recurring characters appearing across pages. The reader experiences a beginning → middle → end.

DETECTION TEST — pick STORY when ANY of these is true: (a) the idea names a known fable or fairy tale title, (b) the idea describes a journey / arc / quest / "first day" / "learning" / "adventure" with a clear before→after, (c) the idea names a single protagonist who DOES something across pages. Otherwise pick THEME.

Plan a coloring book with exactly ${pageCount} pages.

Rules — THEME structure (apply when the idea is a topic / category):
- Each page has a SINGLE clear main subject (a single animal, object, character, or scene element) — not a crowd.
- Keep subjects varied but thematically coherent — no duplicates, no near-duplicates.
- "subject" is a short phrase (8-14 words) describing what to draw. Start with the character/thing, then add one distinctive pose or detail.
- PER-PAGE SUB-LOCATION (load-bearing — most common quality killer when missing): each \`subject\` MUST imply a DIFFERENT sub-location of the world AND a DIFFERENT supporting prop than the other pages. Don't write 20 subjects that all sit in the same place — vary the sub-location across pages so the renderer composes visually distinct scenes. The renderer takes whichever sub-location your \`subject\` names and composes that specific scene; if every subject is generic, every page looks identical. Spell out a specific spot per page (think "by the X", "near the Y", "on the Z") and rotate which prop is the page's signature.

Rules — STORY structure (apply when the idea is a fable / narrative):
- Lock 1-3 recurring characters in your head before writing scenes. Each character has FOUR specific traits: (a) species or kind, (b) RELATIVE size compared to the others, (c) at least 2 distinct visual features (color words for IDENTITY, not paint — output is still B&W), (d) a tail/feet/ears/clothing differentiator that distinguishes them from other characters in the book.
- Each \`subject\` is 12-20 words describing the scene. Inline-restate each character's KEY traits whenever they appear ("Mighty (large adult lion, golden mane, muscular)" not just "Mighty"). The renderer forgets details between pages — restating each time keeps characters consistent.
- Page 1 is an ESTABLISHING SHOT of the world: a wide scene introducing the setting and main character together (the school building, the forest entrance, the starting line). Reader needs to know WHERE we are. Do NOT open with a tight close-up of an action.
- Each subsequent page picks up where the previous one left off. Page 2 follows from page 1, page 3 from page 2 — no teleporting between unrelated moments.
- The final 1-2 pages explicitly close the arc started on page 1 (resolution, return home, lesson learned, finish line crossed).
- PER-PAGE SUB-LOCATION (load-bearing — most common quality killer): each page sits in a visually distinct sub-location of the story's world AND uses a different supporting prop. Spell the sub-location into the \`subject\` so the renderer composes that specific spot, not a generic backdrop. Two consecutive pages MUST NOT share the same sub-location, the same camera distance, or the same supporting-prop set. Vary close-up / mid-shot / wide-shot across pages.
- Multi-character scenes are allowed — name each character that appears with their inline traits. Each named character appears EXACTLY ONCE per page (no duplicates).
- The output is still PURE BLACK-AND-WHITE LINE ART — color words in the subject describe character IDENTITY ("a black-and-white panda", "a red bow"), not what to paint.

Universal rules (apply to BOTH structures):
- Subjects must be recognizable, kid-friendly, printable in black-and-white line art.
- "name" is a 1-3 word label (what an Amazon buyer would call this page).
- ${NO_REAL_BRAND_RULE}
- "scene" describes the WORLD TYPE — the kind of environment the book lives in — NOT a fixed stage set. Keep it abstract enough that each page can compose a different sub-location of that world. GOOD (abstract world description): "a sunny outdoor backyard world with grass, sky, and assorted plants" / "a colorful classroom world with desks, shelves, and tall windows" / "an underwater world with seaweed, coral patches, and bubbles". BAD (locks the renderer into one stage that gets cloned across pages): "a backyard with a doghouse on the left, an oak tree at the back, a sunflower on the right, and a wooden fence" / "a classroom with the teacher's desk in front, three rows of chairs, and a chalkboard". Each page's specific props come from its own \`subject\` field, not from \`scene\`. Do NOT mention smiling suns or cartoon-faced clouds — inanimate objects stay plain.
- "coverScene" describes a vibrant colored cover showing 2-4 key characters from the book together.
- "coverTitle" is a short, punchy KDP-ready title (under 55 chars).
- "title" is the full KDP title (under 150 chars, includes age range and page count).
- "description" is a 25-45 word Amazon product description.
- "bottomStripPhrases" is an array of EXACTLY 3 short ALL-CAPS marketing phrases (each 12-22 characters) that appear as a footer ribbon on the front cover. Each phrase highlights a different selling angle for THIS book — one about content variety, one about a creative or developmental benefit, one about fun or engagement. Tailor wording to the book's actual subject; do not claim the art is hand-drawn, hand-illustrated, handmade, or original artwork. EXAMPLE format only (illustrative, do not copy unless they truly fit this book): ["BIG SIMPLE DESIGNS", "BOOSTS CREATIVITY", "HOURS OF FUN"].
- "sidePlaqueLines" is an array of EXACTLY 3 short ALL-CAPS lines (each 6-22 characters) that read as a stacked plaque on the cover, top to bottom forming a single benefit statement to the parent. Tailor to the audience age and theme. Do not claim hand-drawn / handmade. EXAMPLE format only (illustrative): ["BIG & EASY", "PAGES", "PERFECT FOR TODDLERS!"].
- "coverBadgeStyle" is ONE sentence (max 200 characters) describing the visual design language of the cover's overlay objects (the page-count badge, the side plaque, and the bottom ribbon). Pick objects, materials, shapes, and color motifs that BELONG inside this book's world so the overlays feel native to the scene rather than generic UI. Describe ONE coherent design system that applies to all three overlays — same material vibe, same color family, consistent edge treatment. EXAMPLE format only (illustrative — DO NOT copy these unless they truly fit; use guidance derived from this book's actual subject): for a farm book "rustic wooden plank signs with brown grain, painted cream lettering, rope or nail accents at the corners"; for a food book "chalkboard menu boards with a warm wooden frame, white cursive chalk lettering, and small painted utensil motifs"; for a space book "metallic brushed-steel control panels with rivets, glowing cyan indicator dots, and chrome edging".

Respond with ONLY a JSON object (no prose, no markdown, no code fences) matching this shape:
{
  "title": "...",
  "coverTitle": "...",
  "description": "...",
  "scene": "...",
  "coverScene": "...",
  "bottomStripPhrases": ["...", "...", "..."],
  "sidePlaqueLines": ["...", "...", "..."],
  "coverBadgeStyle": "...",
  "prompts": [
    { "name": "...", "subject": "..." },
    ...
  ],
  "notes": "Start with 'STRUCTURE: theme' or 'STRUCTURE: story' so the renderer knows what you picked, then optionally one short line flagging assumptions."
}

Make sure prompts.length === ${pageCount}.`;
}

function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]+?)\s*```/i.exec(text);
  const raw = fenced ? fenced[1] : text;
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace < 0)
    throw new Error("No JSON object in model response.");
  const slice = raw.slice(firstBrace, lastBrace + 1);
  return JSON.parse(slice);
}

function validatePlan(obj: unknown, expectedCount: number): BookPlan {
  if (!obj || typeof obj !== "object")
    throw new Error("Plan is not an object.");
  const o = obj as Record<string, unknown>;
  const str = (k: string): string => {
    const v = o[k];
    if (typeof v !== "string" || !v.trim())
      throw new Error(`Missing field: ${k}`);
    return v.trim();
  };
  const prompts = o.prompts;
  if (!Array.isArray(prompts) || prompts.length < Math.min(expectedCount, 3)) {
    throw new Error(
      `Expected ~${expectedCount} prompts, got ${Array.isArray(prompts) ? prompts.length : "none"}`,
    );
  }
  const cleaned = prompts
    .filter(
      (p): p is { name: string; subject: string } =>
        !!p &&
        typeof p === "object" &&
        typeof (p as { name?: unknown }).name === "string" &&
        typeof (p as { subject?: unknown }).subject === "string",
    )
    .map((p) => ({ name: p.name.trim(), subject: p.subject.trim() }))
    .filter((p) => p.name && p.subject)
    .slice(0, Math.max(expectedCount, 50));

  return {
    title: str("title"),
    coverTitle: str("coverTitle"),
    description: str("description"),
    scene: str("scene"),
    coverScene: str("coverScene"),
    prompts: cleaned,
    bottomStripPhrases: optionalPhraseTriple(o.bottomStripPhrases),
    sidePlaqueLines: optionalPhraseTriple(o.sidePlaqueLines),
    coverBadgeStyle: optionalShortString(o.coverBadgeStyle, 200),
    notes: typeof o.notes === "string" ? o.notes : undefined,
  };
}

function optionalShortString(value: unknown, maxChars: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxChars);
}

function optionalPhraseTriple(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length < 3) return undefined;
  const cleaned = value
    .slice(0, 3)
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
  return cleaned.length === 3 ? cleaned : undefined;
}

export async function planBook(input: BookPlanInput): Promise<BookPlan> {
  const client = getClient();
  const prompt = buildPrompt(input);
  const response = await client.models.generateContent({
    model: MODEL_ID,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  const text =
    response.candidates?.[0]?.content?.parts
      ?.map((p) =>
        typeof (p as { text?: string }).text === "string"
          ? (p as { text: string }).text
          : "",
      )
      .join("") ?? "";
  if (!text) throw new Error("Empty response from model.");
  const parsed = extractJson(text);
  return validatePlan(parsed, input.pageCount);
}
