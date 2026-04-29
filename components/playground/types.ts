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
   * Border quality checks — Gemini draws the printable border itself now,
   * so these verify the border IS present, IS clean, and that no artwork
   * crosses it. Failure on any of these triggers the auto-retry loop in
   * BookStudio.generatePage.
   */
  border_drawn?: boolean;
  border_clean?: boolean;
  content_within_border?: boolean;
}
