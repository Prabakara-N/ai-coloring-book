"use client";

import { RefreshCw, Loader2 } from "lucide-react";
import type { QualityScore } from "./types";

interface RegenerateCardButtonProps {
  /** Called when the user clicks regenerate. Receives the quality reason
   *  (if any) so the regen can target the specific flaw. */
  onClick: (improvementHint?: string) => void;
  busy?: boolean;
  /** Optional last quality score — its reason becomes the improvement hint
   *  ("subject too small" → regen tries to make subject larger). */
  quality?: QualityScore | null;
  /** Disabled when there's nothing to regenerate (e.g. page not yet done). */
  disabled?: boolean;
}

/**
 * Small floating regenerate button overlaid on apple-carousel cards.
 * When the page has a quality score, the reason is sent to the regen
 * endpoint as an "improvement directive" so the new attempt targets
 * the flaw rather than producing a same-or-worse variation.
 */
export function RegenerateCardButton({
  onClick,
  busy = false,
  quality,
  disabled = false,
}: RegenerateCardButtonProps) {
  const hint = quality?.reason ?? undefined;
  const tier =
    !quality || quality.score >= 8
      ? "neutral"
      : quality.score >= 6
        ? "warn"
        : "critical";

  const cls = {
    neutral:
      "bg-white/10 border-white/20 text-white hover:bg-white/20",
    warn: "bg-amber-500/20 border-amber-500/40 text-amber-100 hover:bg-amber-500/30",
    critical:
      "bg-red-500/20 border-red-500/40 text-red-100 hover:bg-red-500/30",
  }[tier];

  return (
    <button
      type="button"
      onClick={() => onClick(hint)}
      disabled={disabled || busy}
      title={
        hint
          ? `Regenerate (target: ${hint})`
          : "Regenerate this image"
      }
      aria-label={hint ? `Regenerate to fix: ${hint}` : "Regenerate"}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full backdrop-blur border transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${cls}`}
    >
      {busy ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <RefreshCw className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
