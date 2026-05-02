// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

/** Product name used inside system prompts and PDF brand marks. */
export const PRODUCT_NAME = "CrayonSparks";

// ---------------------------------------------------------------------------
// Image generation (Google Gemini — "Nano Banana" family)
// ---------------------------------------------------------------------------

export const NANO_BANANA_25 = "gemini-2.5-flash-image";
export const NANO_BANANA_31 = "gemini-3.1-flash-image-preview";
export const NANO_BANANA_PRO = "gemini-3-pro-image-preview";

export type GeminiImageModel =
  | typeof NANO_BANANA_25
  | typeof NANO_BANANA_31
  | typeof NANO_BANANA_PRO;

/** Human-readable labels for the UI dropdowns. */
export const MODEL_LABELS: Record<GeminiImageModel, string> = {
  [NANO_BANANA_25]: "Nano Banana 2.5",
  [NANO_BANANA_31]: "Nano Banana 3.1",
  [NANO_BANANA_PRO]: "Nano Banana 3 Pro",
};

/**
 * Cover surfaces (front cover + back cover). 2.5 is the default — it's the
 * only stable, non-preview Gemini image model and the cheapest tier. Users
 * can manually upgrade to 3.1 (paid preview, Pro-level fidelity at Flash
 * speed) or 3 Pro (paid preview, top quality) when 2.5 output isn't good
 * enough. Listed first so the default is the most prominent choice.
 */
export const COVER_MODEL_OPTIONS: readonly GeminiImageModel[] = [
  NANO_BANANA_25,
  NANO_BANANA_31,
  NANO_BANANA_PRO,
] as const;

export const DEFAULT_COVER_MODEL: GeminiImageModel = NANO_BANANA_25;

/**
 * Interior surfaces (regular pages + "this book belongs to" page).
 * Same default-to-2.5 reasoning. Pro is intentionally not offered — pure
 * B&W line art doesn't reward photorealism and trips the quality gate.
 */
export const INTERIOR_MODEL_OPTIONS: readonly GeminiImageModel[] = [
  NANO_BANANA_25,
  NANO_BANANA_31,
] as const;

export const DEFAULT_INTERIOR_MODEL: GeminiImageModel = NANO_BANANA_25;

/**
 * Full lineup. Used by the single-image playground when the user is NOT in
 * "coloring book style" mode — raw freeform generation gets every option.
 * 2.5 first, matching the cover ordering for consistency.
 */
export const ALL_IMAGE_MODELS: readonly GeminiImageModel[] = [
  NANO_BANANA_25,
  NANO_BANANA_31,
  NANO_BANANA_PRO,
] as const;

export function isGeminiImageModel(v: unknown): v is GeminiImageModel {
  return v === NANO_BANANA_25 || v === NANO_BANANA_31 || v === NANO_BANANA_PRO;
}

/**
 * Surface tag used by the refine modal to pick which model options to
 * expose. Mirrors the values of `RefineContext` in image-refine-modal.tsx.
 */
export type RefineSurface = "cover" | "back-cover" | "page" | "custom";

/**
 * Models the user is allowed to pick from inside the refine modal,
 * per surface. Front cover is the only surface where Pro is offered —
 * it's the Amazon thumbnail, where photorealism / shading actively help.
 * Back cover is intentionally minimal (tagline + barcode safe-zone), and
 * interior pages need pure B&W line art that Pro tends to over-render
 * with subtle shading the quality gate rejects.
 */
export function refineModelOptionsFor(
  surface: RefineSurface,
): readonly GeminiImageModel[] {
  return surface === "cover" ? ALL_IMAGE_MODELS : INTERIOR_MODEL_OPTIONS;
}

/** Default model when the inherited source model is unknown or invalid. */
export function defaultRefineModelFor(
  surface: RefineSurface,
): GeminiImageModel {
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
