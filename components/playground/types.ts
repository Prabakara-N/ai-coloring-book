/**
 * Shared types for the playground BookStudio + its child components.
 * Extracted so small reusable components can import without depending on
 * the giant book-studio.tsx file.
 */

export interface QualityScore {
  score: number;
  reason: string;
  pure_bw?: boolean;
  closed_outlines?: boolean;
  on_subject?: boolean;
  subject_size_ok?: boolean;
  anatomy_ok?: boolean;
  size_consistency_ok?: boolean;
  no_text?: boolean;
  /**
   * True when the AI did NOT draw a rectangular page border. The printer's
   * border is added by lib/pdf.ts as a vector layer in post-processing —
   * any AI-drawn border on top of that creates a double border. Surfaced
   * to the user as a quality flag; never triggers automatic regeneration
   * (user reviews and decides).
   */
  no_ai_border?: boolean;
}
