export type AgeRange = "toddlers" | "kids" | "tweens";
export type Detail = "simple" | "detailed" | "intricate";
export type Background = "scene" | "framed" | "minimal";

export interface PromptOptions {
  age?: AgeRange;
  detail?: Detail;
  background?: Background;
  scene?: string;
  variantSeed?: string;
  /**
   * Optional CHARACTER LOCK block extracted once from the front cover by
   * `lib/character-extractor.ts`. When present, every page enforces that
   * recurring characters are drawn EXACTLY per these descriptors so KDP
   * reviewers don't see a fat cat on the cover and a skinny cat on
   * page 7. Inject as-is into the master prompt (already formatted).
   */
  characterLock?: string;
}

export type CoverStyle = "flat" | "illustrated";
export type CoverBorder = "framed" | "bleed";

export type BelongsToStyle = "bw" | "color";

export interface ColoringPrompt {
  id: string;
  name: string;
  subject: string;
}

export interface ColoringCategory {
  slug: string;
  number: number;
  name: string;
  icon: string;
  description: string;
  scene: string;
  coverScene: string;
  coverTitle: string;
  kdp: {
    title: string;
    description: string;
    keywords: string[];
    coverPrompt: string;
  };
  prompts: ColoringPrompt[];
}
