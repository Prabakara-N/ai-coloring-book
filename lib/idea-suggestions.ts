import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const MODEL_ID = process.env.OPENAI_MODEL ?? "gpt-5.5";

export type IdeaAudience =
  | "any"
  | "toddlers"
  | "kids"
  | "tweens"
  | "adults";

export interface IdeaSuggestion {
  /** One-line book idea (~10-18 words) the user pastes into the idea textarea. */
  text: string;
  /** Short tag the panel shows next to the idea (e.g. "Animals", "Holiday"). */
  category: string;
  /** Single emoji for visual scanability. */
  icon: string;
}

const AUDIENCE_NOTES: Record<IdeaAudience, string> = {
  any: "Mix audiences (toddlers, kids, tweens, adults). Show breadth.",
  toddlers:
    "Target 3-6 year olds. Simple shapes, friendly characters, animals, vehicles, food.",
  kids: "Target 6-10 year olds. Adventure, animals, dinosaurs, space, fairies, sports.",
  tweens:
    "Target 10-14 year olds. Mandalas, fashion, complex animals, mythology, fantasy creatures.",
  adults:
    "Target adults. Intricate mandalas, florals, animals with detail, geometric patterns, zen scenes, swear-word humor (only if tasteful).",
};

const SYSTEM_PROMPT = `You are Sparky AI — the idea generator for CrayonSparks coloring book creators selling on Amazon KDP.

GOAL
Suggest 8 distinct coloring book ideas for the user to choose from. Each idea is one short sentence the user could paste into a "describe your book" field.

RULES
- Mix PROVEN KDP sellers (animals, mandalas, holiday, fantasy, mythology) with one or two FRESHER niche angles (under-served themes that still have search demand).
- Each idea: 10-18 words. Specific enough to be a directly usable prompt — say WHAT goes on the pages, not just the genre.
- ✅ "20 ocean sea creatures with expressive faces and bubbles for toddlers ages 3-6"
- ❌ "Ocean creatures" (too vague)
- ❌ "A coloring book that contains many beautiful illustrations of various ocean creatures including dolphins, fish, sea turtles, octopuses, jellyfish, and more for kids" (too long, no audience)
- Avoid copyrighted material (Disney, Pokémon, Marvel, brand logos, real celebrities).
- No duplicates or near-duplicates within a single batch.
- Use a category tag from this set: Animals, Vehicles, Fantasy, Holiday, Mandala, Nature, Space, Food, Sports, Mythology, Educational, Character.
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
): Promise<IdeaSuggestion[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const audienceNote = AUDIENCE_NOTES[audience] ?? AUDIENCE_NOTES.any;

  const result = await generateObject({
    model: openai(MODEL_ID),
    system: SYSTEM_PROMPT,
    prompt: `Suggest 8 ideas. Audience focus: ${audienceNote}`,
    schema: ideaSchema,
    temperature: 0.9,
  });

  return result.object.ideas
    .map((i) => ({
      text: i.text.trim(),
      category: i.category.trim(),
      icon: i.icon.trim().slice(0, 4) || "📚",
    }))
    .filter((i) => i.text.length >= 20);
}
