import { GoogleGenAI } from "@google/genai";

const MODEL_ID = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";

let _client: GoogleGenAI | null = null;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local — see .env.local.example for the template."
    );
  }
  if (!_client) _client = new GoogleGenAI({ apiKey });
  return _client;
}

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "2:3" | "3:2";

export const SUPPORTED_ASPECTS: AspectRatio[] = [
  "1:1",
  "3:4",
  "4:3",
  "2:3",
  "3:2",
  "9:16",
  "16:9",
];

export interface GenerateImageResult {
  mimeType: string;
  data: string;
}

export interface GenerateOptions {
  aspectRatio?: AspectRatio;
  sourceImage?: { mimeType: string; data: string };
}

export async function generateColoringImage(
  prompt: string,
  opts: GenerateOptions = {}
): Promise<GenerateImageResult> {
  const client = getClient();
  const aspectRatio = opts.aspectRatio ?? "1:1";

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
  if (opts.sourceImage) {
    parts.push({
      inlineData: {
        mimeType: opts.sourceImage.mimeType,
        data: opts.sourceImage.data,
      },
    });
  }
  parts.push({ text: prompt });

  const response = await client.models.generateContent({
    model: MODEL_ID,
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio },
    },
  });

  const responseParts =
    response.candidates?.[0]?.content?.parts ??
    (response as unknown as { response?: { candidates?: { content?: { parts?: unknown[] } }[] } })
      .response?.candidates?.[0]?.content?.parts ??
    [];

  for (const part of responseParts as { inlineData?: { mimeType?: string; data?: string } }[]) {
    const inline = part.inlineData;
    if (inline?.data) {
      return {
        mimeType: inline.mimeType ?? "image/png",
        data: inline.data,
      };
    }
  }

  throw new Error(
    "Gemini did not return an image. The model may have refused the prompt or an unexpected response shape was received."
  );
}
