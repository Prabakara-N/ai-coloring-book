"use client";

import { cn } from "@/lib/utils";
import type { QualityScore } from "./types";

/**
 * Small status pill showing the AI quality score (1-10) with tier color.
 * Hover for the full reason via title attribute.
 */
export function QualityBadge({ quality }: { quality: QualityScore }) {
  const tier =
    quality.score >= 8
      ? {
          cls: "bg-emerald-500/20 border-emerald-500/40 text-emerald-200",
          label: `${quality.score}/10 ✓`,
        }
      : quality.score >= 6
        ? {
            cls: "bg-amber-500/20 border-amber-500/40 text-amber-200",
            label: `${quality.score}/10 ⚠`,
          }
        : {
            cls: "bg-red-500/20 border-red-500/40 text-red-200",
            label: `${quality.score}/10 ✗`,
          };
  return (
    <span
      title={quality.reason}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border backdrop-blur",
        tier.cls,
      )}
    >
      {tier.label}
    </span>
  );
}

/**
 * Larger callout card showing the AI quality score + the specific reason
 * (e.g. "subject too small", "fused limbs"). Used in PageDetail and now
 * in ImageRefineModal so users see the AI's assessment when refining.
 */
export function QualityReason({ quality }: { quality: QualityScore }) {
  const ringCls =
    quality.score >= 8
      ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-200"
      : quality.score >= 6
        ? "border-amber-500/40 bg-amber-500/5 text-amber-200"
        : "border-red-500/40 bg-red-500/5 text-red-200";
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-xs leading-relaxed",
        ringCls,
      )}
    >
      <div className="font-semibold mb-0.5">
        AI quality score: {quality.score}/10
      </div>
      <div className="opacity-90">{quality.reason}</div>
    </div>
  );
}
