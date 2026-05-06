/**
 * Image-generation dispatcher. Routes a single call to the right provider
 * (Gemini Nano Banana family or OpenAI gpt-image-* family) based on the
 * model id. Both providers return the same `{ mimeType, data }` shape so
 * call sites stay provider-agnostic.
 */

import {
  isGeminiImageModel,
  isOpenAiImageModel,
  DEFAULT_INTERIOR_MODEL,
} from "./constants";
import type { ImageModel } from "./constants";
import { generateColoringImage } from "./gemini";
import type { GenerateImageResult, GenerateOptions } from "./gemini";
import { generateOpenAiImage } from "./openai-image";

export interface DispatchOptions extends Omit<GenerateOptions, "model"> {
  model: ImageModel;
}

/**
 * Generate an image using whichever provider owns `opts.model`.
 *
 * - Gemini models: forwarded to `generateColoringImage` with the existing
 *   GenerateOptions shape (multi-image references, systemInstruction
 *   caching, etc.).
 * - OpenAI models: forwarded to `generateOpenAiImage` which uses the
 *   /images/edits endpoint when reference images are supplied and
 *   /images/generations otherwise.
 */
export async function generateImageByModel(
  prompt: string,
  opts: DispatchOptions,
): Promise<GenerateImageResult> {
  if (isOpenAiImageModel(opts.model)) {
    return generateOpenAiImage(prompt, { ...opts, model: opts.model });
  }
  if (isGeminiImageModel(opts.model)) {
    return generateColoringImage(prompt, { ...opts, model: opts.model });
  }
  // Caller passed an unknown model — fall back to the safe Gemini default
  // rather than throwing, so a stale client-side model id doesn't break
  // the run mid-bulk.
  return generateColoringImage(prompt, {
    ...opts,
    model: DEFAULT_INTERIOR_MODEL,
  });
}
