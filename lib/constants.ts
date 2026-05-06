// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

/** Product name used inside system prompts and PDF brand marks. */
export const PRODUCT_NAME = "CrayonSparks";

// ---------------------------------------------------------------------------
// Image generation — Google Gemini "Nano Banana" + OpenAI gpt-image families.
// Both providers expose a model id string we forward to the API; the
// dispatcher in lib/image-providers.ts picks the right SDK by id.
// ---------------------------------------------------------------------------

export const NANO_BANANA_25 = "gemini-2.5-flash-image";
export const NANO_BANANA_31 = "gemini-3.1-flash-image-preview";
export const NANO_BANANA_PRO = "gemini-3-pro-image-preview";

export type GeminiImageModel =
  | typeof NANO_BANANA_25
  | typeof NANO_BANANA_31
  | typeof NANO_BANANA_PRO;

export const GPT_IMAGE_1 = "gpt-image-1";
export const GPT_IMAGE_1_MINI = "gpt-image-1-mini";
export const GPT_IMAGE_1_5 = "gpt-image-1.5";

export type OpenAiImageModel =
  | typeof GPT_IMAGE_1
  | typeof GPT_IMAGE_1_MINI
  | typeof GPT_IMAGE_1_5;

/** Union of every image model the dispatcher knows how to route. */
export type ImageModel = GeminiImageModel | OpenAiImageModel;

/** Human-readable labels for the UI dropdowns. */
export const MODEL_LABELS: Record<ImageModel, string> = {
  [NANO_BANANA_25]: "Nano Banana 2.5",
  [NANO_BANANA_31]: "Nano Banana 3.1",
  [NANO_BANANA_PRO]: "Nano Banana 3 Pro",
  [GPT_IMAGE_1]: "GPT Image 1",
  [GPT_IMAGE_1_MINI]: "GPT Image 1 Mini",
  [GPT_IMAGE_1_5]: "GPT Image 1.5",
};

/**
 * Cover surfaces (front cover + back cover). Default is Nano Banana 2.5 —
 * stable, cheapest, and the historical baseline so existing flows are
 * unchanged. Users can upgrade to 3.1 / 3 Pro for higher Gemini quality,
 * or switch to gpt-image-1 / 1.5 when OpenAI's text rendering on the
 * cover badge / title block is needed (it follows typography prompts more
 * faithfully than Gemini).
 */
export const COVER_MODEL_OPTIONS: readonly ImageModel[] = [
  NANO_BANANA_25,
  NANO_BANANA_31,
  NANO_BANANA_PRO,
  GPT_IMAGE_1,
  GPT_IMAGE_1_MINI,
  GPT_IMAGE_1_5,
] as const;

export const DEFAULT_COVER_MODEL: ImageModel = NANO_BANANA_25;

/**
 * Interior surfaces (regular pages + "this book belongs to" page). Pro is
 * intentionally NOT offered — pure B&W line art doesn't reward photorealism
 * and trips the quality gate. GPT Image 1.5 is also excluded here: it's
 * the most expensive OpenAI tier and the smaller models follow the line-art
 * brief just as well at a fraction of the cost on bulk runs.
 */
export const INTERIOR_MODEL_OPTIONS: readonly ImageModel[] = [
  NANO_BANANA_25,
  NANO_BANANA_31,
  GPT_IMAGE_1,
  GPT_IMAGE_1_MINI,
] as const;

export const DEFAULT_INTERIOR_MODEL: ImageModel = NANO_BANANA_25;

/** Full lineup — used by the single-image playground freeform flow. */
export const ALL_IMAGE_MODELS: readonly ImageModel[] = [
  NANO_BANANA_25,
  NANO_BANANA_31,
  NANO_BANANA_PRO,
  GPT_IMAGE_1,
  GPT_IMAGE_1_MINI,
  GPT_IMAGE_1_5,
] as const;

export function isGeminiImageModel(v: unknown): v is GeminiImageModel {
  return v === NANO_BANANA_25 || v === NANO_BANANA_31 || v === NANO_BANANA_PRO;
}

export function isOpenAiImageModel(v: unknown): v is OpenAiImageModel {
  return v === GPT_IMAGE_1 || v === GPT_IMAGE_1_MINI || v === GPT_IMAGE_1_5;
}

export function isImageModel(v: unknown): v is ImageModel {
  return isGeminiImageModel(v) || isOpenAiImageModel(v);
}

/**
 * Surface tag used by the refine modal to pick which model options to
 * expose. Mirrors the values of `RefineContext` in image-refine-modal.tsx.
 */
export type RefineSurface = "cover" | "back-cover" | "page" | "custom";

/**
 * Models the user is allowed to pick from inside the refine modal,
 * per surface. Front cover gets the full lineup (Amazon thumbnail benefits
 * from photorealism + good text rendering). Back cover and interior pages
 * stick to the interior set so Pro isn't offered for B&W line art.
 */
export function refineModelOptionsFor(
  surface: RefineSurface,
): readonly ImageModel[] {
  return surface === "cover" ? ALL_IMAGE_MODELS : INTERIOR_MODEL_OPTIONS;
}

/** Default model when the inherited source model is unknown or invalid. */
export function defaultRefineModelFor(
  surface: RefineSurface,
): ImageModel {
  return surface === "cover" ? DEFAULT_COVER_MODEL : DEFAULT_INTERIOR_MODEL;
}

// ---------------------------------------------------------------------------
// Text generation (Google Gemini)
// ---------------------------------------------------------------------------

export const GEMINI_TEXT_MODEL = "gemini-2.5-flash";

// ---------------------------------------------------------------------------
// OpenAI — split per role so each call site can read intent at a glance.
// ---------------------------------------------------------------------------

/** Vision rater — used by the quality gate and character/style extractors. */
export const OPENAI_VISION_MODEL = "gpt-5.5";

/** Cheaper vision model — used for low-stakes refine suggestions. */
export const OPENAI_VISION_LIGHT_MODEL = "gpt-5-mini";

/** Plain text generation — book chat, idea suggestions. */
export const OPENAI_TEXT_MODEL = "gpt-5-mini";

/** KDP marketing copy generation. */
export const OPENAI_COPY_MODEL = "gpt-5-mini";

/** Refine chat assistant ("Sparky"). */
export const OPENAI_REFINE_MODEL = "gpt-5.5";

// ---------------------------------------------------------------------------
// Perplexity (web research for KDP categories / market signals)
// ---------------------------------------------------------------------------

export const PERPLEXITY_DEFAULT_MODEL = "sonar";
