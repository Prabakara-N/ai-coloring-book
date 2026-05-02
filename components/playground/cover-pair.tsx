"use client";

import { useState, type ReactNode } from "react";
import { ArrowLeftRight, BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CoverStyle, CoverBorder } from "@/lib/prompts";
import { CoverTile, type CoverTileStatus } from "./cover-tile";

interface CoverPairProps {
  bookSlug: string;
  /** Book title shown at the top of the card. */
  title: string;
  /** Book description / cover scene shown under the title. */
  description?: string;
  frontCover: CoverTileStatus;
  backCover: CoverTileStatus;
  /**
   * Optional "This Book Belongs To" page tile — when provided, rendered as a
   * third tile alongside the covers and gets its own B&W/Color toggle in
   * the right-side options column.
   */
  belongsTo?: CoverTileStatus;
  belongsToStyle?: "bw" | "color";
  onBelongsToStyleChange?: (v: "bw" | "color") => void;
  onRegenerateBelongsTo?: () => void;
  onRefineBelongsTo?: (dataUrl: string) => void;
  coverStyle: CoverStyle;
  coverBorder: CoverBorder;
  onCoverStyleChange: (s: CoverStyle) => void;
  onCoverBorderChange: (b: CoverBorder) => void;
  onRegenerateFront: () => void;
  onRegenerateBack: () => void;
  onRefineFront?: (dataUrl: string) => void;
  onRefineBack?: (dataUrl: string) => void;
  /**
   * When set, disables Regenerate / Refine on the front cover and shows
   * the given reason on hover. Used to lock the cover once interior
   * pages have started — changing the cover after that point would
   * desync the chain anchor + character lock from the existing pages.
   */
  frontLocked?: boolean;
  frontLockedReason?: string;
  /**
   * Optional content rendered at the bottom of the right-column toggle stack
   * (typically the Amazon mockup generator gated behind generated content).
   */
  rightExtras?: ReactNode;
}

/**
 * Single card containing: title + description on top, then a 2-column layout
 * with cover images on the LEFT (wider) and style/border toggles + extras
 * on the RIGHT (narrower, stacked).
 *
 * Default layout: back cover LEFT, front cover RIGHT. The center swap button
 * flips them. Used by both BookStudio (`/playground?tab=bulk-book`) and
 * GeneratorStudio (`/generate`) so the cover UX is consistent.
 */
export function CoverPair({
  bookSlug,
  title,
  description,
  frontCover,
  backCover,
  belongsTo,
  belongsToStyle,
  onBelongsToStyleChange,
  onRegenerateBelongsTo,
  onRefineBelongsTo,
  coverStyle,
  coverBorder,
  onCoverStyleChange,
  onCoverBorderChange,
  onRegenerateFront,
  onRegenerateBack,
  onRefineFront,
  onRefineBack,
  frontLocked = false,
  frontLockedReason,
  rightExtras,
}: CoverPairProps) {
  // Default order: FRONT cover on LEFT, BACK cover on RIGHT.
  // (Previous default was back-left/front-right; user prefers front-first
  // because that's the cover most people scan first.)
  const [swapped, setSwapped] = useState(true);
  const frontCoverReady = frontCover.status === "done" && !!frontCover.dataUrl;

  const frontTile = (
    <CoverTile
      key="front"
      label="Front cover"
      state={frontCover}
      onRegenerate={onRegenerateFront}
      onRefine={onRefineFront}
      disabled={frontLocked}
      disabledReason={
        frontLockedReason ??
        "Front cover is locked — interior pages reference it. Reset the book to start over."
      }
      downloadName={`cover_${bookSlug}.png`}
    />
  );

  const backTile = (
    <CoverTile
      key="back"
      label="Back cover"
      state={backCover}
      onRegenerate={onRegenerateBack}
      onRefine={onRefineBack}
      disabled={!frontCoverReady}
      disabledReason="Generate the front cover first — back cover matches its style."
      showBarcodeZone
      downloadName={`back_cover_${bookSlug}.png`}
    />
  );

  const leftTile = swapped ? frontTile : backTile;
  const rightTile = swapped ? backTile : frontTile;

  return (
    <div className="rounded-3xl p-5 md:p-6 bg-zinc-900/60 backdrop-blur-xl border border-white/10 space-y-5">
      {/* Header: title + description */}
      <div className="flex items-start gap-3">
        <BookMarked className="w-5 h-5 mt-0.5 text-amber-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300 mb-0.5">
            Book covers
          </p>
          <h3 className="text-base md:text-lg font-bold text-white leading-tight truncate">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-neutral-400 leading-relaxed mt-1 line-clamp-2">
              {description}
            </p>
          )}
          <p className="text-[10px] text-neutral-500 mt-1">
            {swapped
              ? "Front (left) · Back (right)"
              : "Back (left) · Front (right)"}
          </p>
        </div>
      </div>

      {/* Body: covers group LEFT + belongs-to group RIGHT, separated by a
          soft-fading vertical gradient that spans the FULL height (both
          toggles and tiles). Each section has its own internal toggle
          row + tile row stacked vertically, so the splitter cleanly
          separates "product packaging" from "interior nameplate". */}
      <div
        className={cn(
          "grid gap-4 md:gap-6 items-start",
          belongsTo
            ? "grid-cols-1 md:grid-cols-[2fr_1px_1fr]"
            : "grid-cols-1",
        )}
      >
        {/* LEFT GROUP — cover toggles + back/front cover tiles */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
            <SegmentedToggle
              label="Cover style"
              value={coverStyle}
              onChange={onCoverStyleChange}
              options={[
                { value: "illustrated", label: "Illustrated", sub: "Picture-book" },
                { value: "flat", label: "Flat", sub: "Bold cartoon" },
              ]}
            />
            <SegmentedToggle
              label="Cover border"
              value={coverBorder}
              onChange={onCoverBorderChange}
              options={[
                { value: "bleed", label: "Full bleed", sub: "Edge to edge" },
                { value: "framed", label: "Framed", sub: "Cream edge" },
              ]}
            />
          </div>

          <div className="flex items-start justify-center gap-3 md:gap-4">
            <div className="w-full max-w-[180px] md:max-w-[200px] shrink">
              {leftTile}
            </div>

            <div className="flex flex-col items-center pt-10 md:pt-12 shrink-0">
              <button
                type="button"
                onClick={() => setSwapped((v) => !v)}
                className="w-9 h-9 rounded-full bg-linear-to-r from-violet-500 to-cyan-400 text-white shadow-lg shadow-violet-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                title="Swap cover positions"
                aria-label="Swap front and back cover positions"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
              <span className="mt-1 text-[9px] uppercase tracking-wider text-neutral-500 font-mono">
                swap
              </span>
            </div>

            <div className="w-full max-w-[180px] md:max-w-[200px] shrink">
              {rightTile}
            </div>
          </div>
        </div>

        {/* SPLITTER — full-height soft-fading vertical gradient. Hidden on
            mobile where the two groups stack vertically. */}
        {belongsTo && (
          <div
            className="hidden md:block self-stretch w-px bg-linear-to-b from-transparent via-violet-400/40 to-transparent"
            aria-hidden
          />
        )}

        {/* RIGHT GROUP — belongs-to toggle + belongs-to tile */}
        {belongsTo && (
          <div className="space-y-4">
            {belongsToStyle && onBelongsToStyleChange && (
              <div className="max-w-[240px] mx-auto">
                <SegmentedToggle
                  label="Belongs-to page"
                  value={belongsToStyle}
                  onChange={onBelongsToStyleChange}
                  options={[
                    { value: "color", label: "Color", sub: "Decorative" },
                    { value: "bw", label: "B&W", sub: "Kid colors it" },
                  ]}
                />
              </div>
            )}
            <div className="flex items-start justify-center">
              <div className="w-full max-w-[180px] md:max-w-[200px] shrink">
                <CoverTile
                  key="belongs-to"
                  label="Belongs to"
                  state={belongsTo}
                  onRegenerate={onRegenerateBelongsTo ?? (() => undefined)}
                  onRefine={onRefineBelongsTo}
                  disabled={!frontCoverReady}
                  disabledReason="Generate the front cover first — belongs-to page uses the same characters."
                  downloadName={`belongs_to_${bookSlug}.png`}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {rightExtras && (
        <div className="pt-3 border-t border-white/10">{rightExtras}</div>
      )}
    </div>
  );
}

interface SegmentedToggleOption<T extends string> {
  value: T;
  label: string;
  sub?: string;
}

function SegmentedToggle<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: SegmentedToggleOption<T>[];
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
        {label}
      </p>
      <div className="flex flex-row gap-1 p-1 rounded-xl bg-black/40 border border-white/10">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex-1 min-w-0 px-3 py-2 rounded-lg text-xs font-semibold text-center transition-colors",
                active
                  ? "bg-linear-to-r from-violet-500 to-cyan-400 text-white shadow"
                  : "text-neutral-300 hover:bg-white/5",
              )}
            >
              <div className="truncate">{opt.label}</div>
              {opt.sub && (
                <div
                  className={cn(
                    "text-[10px] font-normal mt-0.5 truncate",
                    active ? "text-white/80" : "text-neutral-500",
                  )}
                >
                  {opt.sub}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
