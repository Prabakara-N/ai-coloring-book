/**
 * Public barrel for prompt-builder modules. External callers import from
 * `@/lib/prompts` and get the same surface that the legacy single-file
 * `lib/prompts.ts` exposed before the split.
 *
 * Internal `./guardrails` constants are mostly scaffolding for the
 * template builders inside this directory and are NOT re-exported here.
 * The one exception is `NO_REAL_BRAND_RULE`, which is shared with prompt
 * builders that live outside this folder (`lib/book-chat.ts`,
 * `lib/book-planner.ts`).
 */

export type {
  AgeRange,
  Detail,
  Background,
  PromptOptions,
  CoverStyle,
  CoverBorder,
  BelongsToStyle,
  ColoringPrompt,
  ColoringCategory,
} from "./types";

export {
  AGE_PRESETS,
  DETAIL_PRESETS,
  MASTER_PROMPT_SYSTEM,
  MASTER_PROMPT_USER,
  MASTER_PROMPT_TEMPLATE,
} from "./master-page";

export {
  BACK_COVER_PROMPT_TEMPLATE,
  COLOR_COVER_PROMPT_TEMPLATE,
  THUMBNAIL_PROMPT_TEMPLATE,
} from "./cover";

export { BELONGS_TO_PROMPT_TEMPLATE } from "./belongs-to";

export {
  REFERENCE_LED_PROMPT_TEMPLATE,
  STYLE_REFERENCE_PROMPT,
  BACK_COVER_COLOR_ANCHOR_PROMPT,
  BACK_COVER_COLOR_ANCHOR_FALLBACK_PROMPT,
  REFERENCE_ANALYSIS_FAILED_NOTE,
  RAW_REFERENCE_NOTE,
  CONSISTENCY_ANCHOR_PROMPT,
} from "./reference";

export { CATEGORIES, TOTAL_PROMPTS, findCategory } from "./categories";

export { NO_REAL_BRAND_RULE } from "./guardrails";

export {
  STORY_PAGE_TODDLER_SYSTEM,
  STORY_PAGE_TODDLER_USER,
  STORY_PAGE_TODDLER_TEMPLATE,
} from "./story-page";
export type {
  StoryCharacter,
  StoryDialogueLine,
  StoryPalette,
  StoryPageTemplateOptions,
} from "./story-page";

export {
  STORY_COVER_TODDLER_SYSTEM,
  STORY_COVER_TODDLER_USER,
  STORY_COVER_TODDLER_TEMPLATE,
} from "./story-cover";
export type { StoryCoverTemplateOptions } from "./story-cover";

export {
  STORY_BACK_COVER_TODDLER_SYSTEM,
  STORY_BACK_COVER_TODDLER_USER,
  STORY_BACK_COVER_TODDLER_TEMPLATE,
} from "./story-back-cover";
export type { StoryBackCoverTemplateOptions } from "./story-back-cover";
