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
  no_border?: boolean;
}
