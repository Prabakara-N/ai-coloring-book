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

const MODEL_ID = process.env.OPENAI_VISION_MODEL ?? "gpt-5.5";

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
    return `You are an art director extracting a STYLE description from a reference image so another image generator can imitate the style for a NEW black-and-white coloring page.

The output goes into a coloring-page prompt where the FINAL IMAGE WILL BE PURE BLACK-AND-WHITE LINE ART. Therefore IGNORE the reference's colors entirely. Focus on:
- Line weight & quality (thick/thin, smooth/rough, uniform/varied)
- Character/subject style (cartoon proportions, kawaii, realistic, geometric, organic, friendliness)
- Eye style and facial features
- Composition habits (centered, dynamic, framed, full-bleed)
- Level of detail (minimalist vs intricate)
- Era/genre vibe (1980s storybook, modern picture-book, mid-century, Pixar-style, manga, etc.)

Be CONCRETE and SPECIFIC. Avoid generic words like "cute" or "nice". Use language another AI can act on, e.g. "thick uniform 3pt black outlines, kawaii faces with oversized round eyes and tiny pupils, simplified rounded body shapes, single pose centered with generous white space, mid-2010s indie picture-book aesthetic".

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
    temperature: 0.2,
  });

  return { description: result.object.description };
}
