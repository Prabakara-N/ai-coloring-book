import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { OPENAI_TEXT_MODEL } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 30;

interface Body {
  category?: string;
  variantSeed?: number;
}

const SYSTEM_PROMPT = `You suggest single-image generation prompts for a Gemini image model. The user picks a category (coloring page, wall art, nursery print, sticker, greeting card, book illustration, etc.) and you produce 5 ready-to-paste prompts for that aesthetic.

RULES
1. Output 5 distinct, MEANINGFULLY DIFFERENT prompts — different subjects, different scenes, different moods. Don't return five variations of the same idea.
2. Each prompt is ONE SENTENCE, 14-22 words. Specific enough to be a directly usable prompt — name what's in the scene.
3. Match the requested category aesthetic:
   - "coloring-page": pure B&W line art, kid-friendly subject, full-page scene, thick clean outlines
   - "wall-art": full-color minimalist or boho poster, framed feel, kid-bedroom-friendly
   - "nursery-print": soft pastels, cute baby-room art, gentle and dreamy
   - "sticker": bold thick outlines, single subject on white background, simple shapes
   - "greeting-card": illustration with empty space for handwritten text, warm and personal
   - "book-illustration": full-color picture-book art, narrative scene, character-driven
   - "product-mockup": clean lifestyle/photo composition, neutral background, premium feel
   - "pinterest-pin": vertical 9:16 composition, eye-catching focal point, scrollable visual
   - "generic" / unknown: balanced creative scene, no specific styling enforced
4. Keep age-appropriate for kids. No copyrighted characters, no real people, no scary content. NEVER suggest prompts featuring: brain coral or organ-shaped reef shapes, skulls/bones/blood, weapons (swords/guns/knives/spears even on knights/pirates — use shields, flags, treasure instead), any creature (or character) drawn in horror/realistic style — every subject must be round, smiling, friendly cartoon style, predator hunting/feeding scenes, fire/destruction, dead/cracked trees with face-like knots, anatomical/medical/dental imagery, graveyards/ghosts/demons, religious or political symbols, alcohol/cigarettes/drugs, or anything sexual/suggestive. Pass the parent test — would a parent happily show this to a 4-year-old at bedtime? If no, pick a different subject.
5. Output ONLY a JSON object — no preamble, no commentary.

EXAMPLES

Category: coloring-page
{"ideas": [
  "A friendly cartoon dragon curled around a small castle with stars in the sky and grass below",
  "A smiling whale gliding through coral with seaweed and tiny fish swimming all around",
  "A young fox sitting on a forest stump with mushrooms, ferns, and butterflies framing the scene",
  "A unicorn galloping across a flower meadow under a rainbow with clouds and tall grass",
  "A baby dinosaur hatching from an egg in a jungle with palm fronds and bright sun"
]}

Category: wall-art
{"ideas": [
  "A minimalist hot air balloon floating among soft watercolor clouds at sunset, framed poster style",
  "A whimsical mountain range with a tiny tent and pine trees under a sky of stars",
  "A bohemian moon phase chart in muted earth tones with hand-drawn celestial details",
  "A dreamy ocean horizon with a sailboat and a flock of seabirds in pastel hues",
  "A vintage botanical illustration of a single wildflower with delicate latin label below"
]}`;

const SCHEMA = z.object({
  ideas: z
    .array(z.string().min(20).max(220))
    .min(4)
    .max(6)
    .describe("4-6 single-sentence image prompts matching the requested category."),
});

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const category = (body.category ?? "generic").trim().toLowerCase();
  const variantNote =
    body.variantSeed && body.variantSeed > 0
      ? ` This is request #${body.variantSeed + 1} — output 5 NEW prompts MEANINGFULLY DIFFERENT from any prior batch.`
      : "";

  try {
    const result = await generateObject({
      model: openai(OPENAI_TEXT_MODEL),
      system: SYSTEM_PROMPT,
      schema: SCHEMA,
      prompt: `Category: ${category}\n\nReturn 5 prompts.${variantNote}`,
    });
    return NextResponse.json({ ideas: result.object.ideas });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Idea fetch failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
