/**
 * Shared KDP metadata types.
 *
 * The Gemini-only generator that lived here previously was removed in
 * favor of the hybrid (Perplexity research + GPT-5-mini copy) generator
 * in `lib/kdp-metadata-hybrid.ts`. Hybrid produces noticeably better
 * KDP-aware titles + keywords because Perplexity grounds it in live
 * Amazon listings rather than the model's pre-trained world knowledge.
 *
 * This file now ONLY exports the shared types so existing imports across
 * the codebase (KdpMetadataPanel, kdp-package-pdf, BookStudio,
 * GeneratorStudio, etc.) continue to compile without churn.
 */

export type AgeBand = "toddlers" | "kids" | "tweens";

/**
 * Which Amazon KDP product family this listing is for. Drives the prompt
 * branch in the hybrid generator — coloring books and picture books have
 * different SEO landscapes (keywords, categories, copy, price bands) so
 * we can't share prompt prose.
 */
export type KdpKind = "coloring" | "story";

export interface KdpMetadataInput {
  bookTitle: string;
  scene: string;
  age: AgeBand;
  pageCount: number;
  /** A few sample page subjects to give the model a sense of the content. */
  samplePages: string[];
  /**
   * Defaults to "coloring" for backwards compatibility with the existing
   * coloring-book flow. Set to "story" when this book is a full-color
   * picture book (story-mode bulk pipeline) so the prompts target
   * picture-book SEO instead of coloring-book SEO.
   */
  kind?: KdpKind;
}

export interface KdpMetadata {
  /** SEO-optimized KDP title — under 200 chars. */
  title: string;
  /** Optional shorter subtitle. */
  subtitle: string;
  /** HTML-formatted description for KDP — bullets, bold allowed. */
  descriptionHtml: string;
  /** Plain-text fallback of the description. */
  descriptionText: string;
  /** Exactly 7 backend keywords, each ≤50 chars. */
  keywords: string[];
  /** 2 suggested KDP browse categories. */
  categories: string[];
  /** Suggested retail price (USD). */
  suggestedPriceUsd: string;
  /** Notes — anything the AI flagged. */
  notes?: string;
}
