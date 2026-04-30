/**
 * Two-step reference-image flow — Step 1.
 *
 * Gemini 2.5 Flash Image is primarily an image-EDIT model; passing a raw
 * image as input nudges it to "modify this" rather than "use as style only".
 * Instead we ask gpt-4o-mini Vision to extract a concise textual style
 * description from the reference, then append that text to the prompt for
 * Gemini. No image is sent to Gemini — eliminating the edit-mode confusion.
 *
 * Cost per call: ~$0.0001 (one gpt-4o-mini vision turn).
 */

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { OPENAI_VISION_MODEL } from "@/lib/constants";

const MODEL_ID = OPENAI_VISION_MODEL;

export type StyleMode = "page" | "cover";

const STYLE_SCHEMA = z.object({
  description: z
    .string()
    .min(20)
    .max(700)
    .describe(
      "A 50-100 word art-style description that another image generator could use to imitate this style. Concrete and specific.",
    ),
});

function systemPromptFor(mode: StyleMode): string {
  if (mode === "page") {
    return `You are an art director extracting a STYLE-ONLY description from a reference image so another image generator can imitate the LINE-ART STYLE for a NEW black-and-white coloring page that may have a COMPLETELY DIFFERENT subject and a COMPLETELY DIFFERENT background.

The output goes into a coloring-page prompt where the FINAL IMAGE WILL BE PURE BLACK-AND-WHITE LINE ART. Therefore IGNORE the reference's colors entirely. Focus ONLY on:
- Line weight & quality (thick/thin, smooth/rough, uniform/varied)
- Character/subject RENDERING style (cartoon proportions, kawaii, realistic, geometric, organic, friendliness — describe HOW characters are drawn, not WHICH characters)
- Eye style and facial features (e.g. "oversized round eyes with tiny pupils")
- Stroke and shading conventions (e.g. "uniform thick outlines, no internal shading")
- Level of detail (minimalist vs intricate; sparse vs dense pattern work)
- Era/genre vibe (1980s storybook, modern picture-book, mid-century, Pixar-style, manga, etc.)

🚫 STRICT EXCLUSIONS — DO NOT describe any of these (they would leak the reference's specific scene into every page of the book and make all 20 pages look the same):
- The reference's specific subject (don't say "a bear", "a unicorn", "a cat")
- The reference's specific background or setting (don't say "in a forest", "with a barn", "on a beach", "underwater", "in space")
- The reference's specific props or scene elements (don't say "with flowers", "with stars", "with a fence")
- The reference's specific composition layout (don't say "subject on the left with trees on the right")
- Color choices (it's going to B&W anyway)

Be CONCRETE and SPECIFIC about STYLE. Use language another AI can act on, e.g. "thick uniform 3pt black outlines, kawaii faces with oversized round eyes and tiny pupils, simplified rounded body shapes, mid-2010s indie picture-book aesthetic, no internal shading, clean closed contours". The downstream prompt will supply its own subject and background — your job is JUST the visual style fingerprint.

Output structured response only.`;
  }
  // cover
  return `You are an art director extracting a STYLE description from a reference cover image so another image generator can imitate the style for a NEW colored book cover.

The output goes into a fully-colored book-cover prompt. Include:
- Art style era/genre (modern picture-book, Pixar-3D, watercolor, flat cartoon, painterly, retro, etc.)
- Color palette (warm/cool, saturated/muted, specific hues)
- Lighting & shading approach (flat, soft directional, dramatic, painterly)
- Line weight (thick black outlines, subtle tonal edges, no outlines)
- Character/subject treatment (proportions, expressions, realism)
- Composition (centered hero, ensemble cast, environment-led)
- Mood/vibe (cheerful, magical, adventurous, calm)

Be CONCRETE and SPECIFIC. Avoid generic words. Output structured response only.`;
}

export interface StyleExtractionResult {
  description: string;
}

export async function extractStyleFromReference(
  imageDataUrl: string,
  mode: StyleMode,
): Promise<StyleExtractionResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const dataUrl = imageDataUrl.startsWith("data:")
    ? imageDataUrl
    : `data:image/png;base64,${imageDataUrl}`;

  const result = await generateObject({
    model: openai(MODEL_ID),
    system: systemPromptFor(mode),
    schema: STYLE_SCHEMA,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract the art style from this reference image. Concrete details only.",
          },
          { type: "image", image: dataUrl },
        ],
      },
    ],
  });

  return { description: result.object.description };
}
