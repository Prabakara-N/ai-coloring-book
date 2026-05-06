/**
 * OpenAI image generation — gpt-image-1 / gpt-image-1-mini / gpt-image-1.5.
 *
 * Two code paths:
 *   1. No reference image  → Vercel AI SDK (`generateImage` + `openai.image`).
 *      Gets us SDK retry handling, typed errors, and provider-option pass-through.
 *   2. With reference image (chain anchor for character consistency) →
 *      direct multipart POST to `/v1/images/edits`. The AI SDK as of v6 only
 *      exposes `/v1/images/generations` for OpenAI image models, so the edit
 *      endpoint has to be called by hand. Same `OPENAI_API_KEY` env var the
 *      SDK uses; same response shape (`b64_json`).
 */

import { generateImage } from "ai";
import { openai } from "@ai-sdk/openai";

import { GPT_IMAGE_1_MINI } from "./constants";
import type { OpenAiImageModel } from "./constants";
import type {
  AspectRatio,
  GenerateImageResult,
  GenerateOptions,
} from "./gemini";

/**
 * Map our internal aspect-ratio strings to the closest OpenAI-supported
 * size. gpt-image-1 only accepts 1024x1024, 1024x1536, 1536x1024 (plus
 * "auto"). For non-matching ratios we round to the nearest supported
 * orientation — the caller still gets a well-formed image; per-page
 * letterbox layout in pdf-lib + the FILL_CANVAS_RULE handle the rest.
 */
function aspectToSize(aspect: AspectRatio | undefined): string {
  switch (aspect) {
    case "3:4":
    case "2:3":
    case "9:16":
      return "1024x1536";
    case "4:3":
    case "3:2":
    case "16:9":
      return "1536x1024";
    case "1:1":
    default:
      return "1024x1024";
  }
}

/**
 * gpt-image-1 supports a `quality` parameter (low/medium/high). We default
 * to medium — a reasonable balance for kids' coloring books and the bulk
 * cost stays predictable. The mini variant only honours low/medium.
 */
function defaultQuality(model: OpenAiImageModel): "low" | "medium" | "high" {
  if (model === GPT_IMAGE_1_MINI) return "low";
  return "medium";
}

function dataUrlPartsToBlob(part: { mimeType: string; data: string }): Blob {
  const bin = Buffer.from(part.data, "base64");
  return new Blob([bin], { type: part.mimeType || "image/png" });
}

interface OpenAiEditsResponse {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string };
}

/**
 * Direct call to `/v1/images/edits` for the multi-image chain-reference
 * flow. Falls back to the same `OPENAI_API_KEY` env var the AI SDK reads.
 */
async function callImagesEdits(
  prompt: string,
  refs: Array<{ mimeType: string; data: string }>,
  model: OpenAiImageModel,
  size: string,
): Promise<GenerateImageResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured — set it in .env.local before using gpt-image-1.",
    );
  }
  const form = new FormData();
  form.set("model", model);
  form.set("prompt", prompt);
  form.set("size", size);
  form.set("quality", defaultQuality(model));
  form.set("n", "1");
  refs.forEach((ref, i) => {
    form.append("image[]", dataUrlPartsToBlob(ref), `ref_${i}.png`);
  });
  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const json = (await res.json()) as OpenAiEditsResponse;
  if (!res.ok) {
    throw new Error(
      json.error?.message ?? `OpenAI image edit failed (${res.status})`,
    );
  }
  const first = json.data?.[0];
  if (!first?.b64_json) {
    throw new Error(
      "OpenAI returned no image data on the edit endpoint (the model may have refused the prompt — try softer language).",
    );
  }
  return { mimeType: "image/png", data: first.b64_json };
}

/**
 * Generate an image with one of the gpt-image-* models. When reference
 * images are supplied (chain-anchor flow), we go through OpenAI's
 * `/v1/images/edits` endpoint via direct multipart fetch. Otherwise the
 * AI SDK handles the call.
 */
export async function generateOpenAiImage(
  prompt: string,
  opts: GenerateOptions & { model: OpenAiImageModel },
): Promise<GenerateImageResult> {
  const size = aspectToSize(opts.aspectRatio);
  const refs: Array<{ mimeType: string; data: string }> = [];
  if (opts.sourceImage) refs.push(opts.sourceImage);
  if (opts.extraImages?.length) refs.push(...opts.extraImages);

  const fullPrompt = opts.systemInstruction
    ? `${opts.systemInstruction}\n\n${prompt}`
    : prompt;

  if (refs.length > 0) {
    return callImagesEdits(fullPrompt, refs, opts.model, size);
  }

  const result = await generateImage({
    model: openai.image(opts.model),
    prompt: fullPrompt,
    size: size as `${number}x${number}`,
    providerOptions: {
      openai: { quality: defaultQuality(opts.model) },
    },
  });
  return {
    mimeType: result.image.mediaType ?? "image/png",
    data: result.image.base64,
  };
}
