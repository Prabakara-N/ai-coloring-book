import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { OPENAI_TEXT_MODEL, PRODUCT_NAME } from "@/lib/constants";

// Text-only generative idea list — cheaper than vision paths.
const MODEL_ID = OPENAI_TEXT_MODEL;

export type IdeaAudience = "any" | "toddlers" | "kids" | "tweens";

/**
 * Which flavor of suggestions to generate. Coloring-book ideas are theme-
 * shaped ("20 X with simple outlines for ages Y"); story-book ideas are
 * narrative-shaped (a fable title or a 1-line original story for ages Y).
 */
export type IdeaKind = "coloring" | "story";

export interface IdeaSuggestion {
  /** One-line book idea (~10-18 words) the user pastes into the idea textarea. */
  text: string;
  /** Short tag the panel shows next to the idea (e.g. "Animals", "Holiday"). */
  category: string;
  /** Single emoji for visual scanability. */
  icon: string;
}

const AUDIENCE_NOTES: Record<IdeaAudience, string> = {
  any: "Mix kid audiences (toddlers, kids, tweens). Show breadth.",
  toddlers:
    "Target 3-6 year olds. Simple shapes, friendly characters, animals, vehicles, food.",
  kids: "Target 6-10 year olds. Adventure, animals, dinosaurs, space, fairies, sports.",
  tweens:
    "Target 10-14 year olds. Mandalas, fashion, complex animals, mythology, fantasy creatures.",
};

const COLORING_SYSTEM_PROMPT = `You are Sparky AI — the idea generator for ${PRODUCT_NAME} coloring book creators selling on Amazon KDP.

GOAL
Suggest 8 distinct coloring book ideas for the user to choose from. Each idea is one short sentence the user could paste into a "describe your book" field.

RULES
- Mix PROVEN KDP sellers (animals, mandalas, holiday, fantasy, mythology) with one or two FRESHER niche angles (under-served themes that still have search demand).
- Each idea: 10-18 words. Specific enough to be a directly usable prompt — say WHAT goes on the pages, not just the genre.
- Good: "20 ocean sea creatures with expressive faces and bubbles for toddlers ages 3-6"
- Avoid (too vague): "Ocean creatures"
- Avoid (too long, no audience): "A coloring book that contains many beautiful illustrations of various ocean creatures including dolphins, fish, sea turtles, octopuses, jellyfish, and more for kids"
- Avoid copyrighted material (Disney, Pokémon, Marvel, brand logos, real celebrities).
- No duplicates or near-duplicates within a single batch.
- Use a category tag from this set: Animals, Vehicles, Fantasy, Holiday, Mandala, Nature, Space, Food, Sports, Mythology, Educational, Character.
- Each idea has ONE emoji icon.`;

const STORY_SYSTEM_PROMPT = `You are Sparky AI — the idea generator for ${PRODUCT_NAME} story-book (full-color picture book) creators selling on Amazon KDP.

GOAL
Suggest 8 distinct STORY ideas for the user to choose from. Each idea is one short sentence the user could paste into a "tell me your story idea" field. The output is a full-color picture book with locked characters and per-page dialogue — NOT a coloring book.

RULES
- Mix CLASSIC PUBLIC-DOMAIN FABLES (Aesop, Grimm, Hans Christian Andersen, Mother Goose, Bible parables, Panchatantra, Jataka, Hitopadesha) with ORIGINAL story ideas (a panda's first day at school, a tiny dragon learning to fly, a friendly ghost helping the night animals).
- Of the 8 ideas, aim for ~4 classic fables (using their actual titles — "The Tortoise and the Hare", "The Crow and the Pitcher", "Goldilocks and the Three Bears") and ~4 original story premises.
- Each idea: 10-18 words. Specific enough to be a directly usable prompt — name the protagonist OR the fable title, the audience, and the page count.
- Good: "The Tortoise and the Hare retold for toddlers ages 3-6 (8 scenes)"
- Good: "A tiny dragon learning to fly with help from his forest friends for ages 4-7 (10 scenes)"
- Good: "The Lion and the Mouse — a moral fable for kids ages 5-8 (8 scenes)"
- Avoid (too vague): "An animal story"
- Avoid (too long): "A long picture book about a small animal that goes on an adventure with many friends and learns a valuable lesson at the end while exploring various habitats and meeting different creatures along the way"
- Avoid copyrighted characters (Disney/Pixar versions, Marvel, Pokemon, branded characters, real celebrities). Public-domain folktales and fully original stories ONLY.
- No duplicates or near-duplicates within a single batch.
- Use a category tag from this set: Fable, Fairytale, Bedtime, Adventure, Mystery, Mythology, Original, Educational.
- Each idea has ONE emoji icon.`;

const ideaSchema = z.object({
  ideas: z
    .array(
      z.object({
        text: z.string().min(20).max(200),
        category: z.string().min(2).max(20),
        icon: z.string().min(1).max(4),
      }),
    )
    .min(6)
    .max(10),
});

export async function generateIdeaSuggestions(
  audience: IdeaAudience = "any",
  kind: IdeaKind = "coloring",
): Promise<IdeaSuggestion[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const audienceNote = AUDIENCE_NOTES[audience] ?? AUDIENCE_NOTES.any;
  const system =
    kind === "story" ? STORY_SYSTEM_PROMPT : COLORING_SYSTEM_PROMPT;

  const result = await generateObject({
    model: openai(MODEL_ID),
    system,
    prompt: `Suggest 8 ideas. Audience focus: ${audienceNote}`,
    schema: ideaSchema,
  });

  return result.object.ideas
    .map((i) => ({
      text: i.text.trim(),
      category: i.category.trim(),
      icon: i.icon.trim().slice(0, 4) || "📚",
    }))
    .filter((i) => i.text.length >= 20);
}
