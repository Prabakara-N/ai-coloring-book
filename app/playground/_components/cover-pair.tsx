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
  coverStyle: CoverStyle;
  coverBorder: CoverBorder;
  onCoverStyleChange: (s: CoverStyle) => void;
  onCoverBorderChange: (b: CoverBorder) => void;
  onRegenerateFront: () => void;
  onRegenerateBack: () => void;
  onRefineFront?: (dataUrl: string) => void;
  onRefineBack?: (dataUrl: string) => void;
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
  coverStyle,
  coverBorder,
  onCoverStyleChange,
  onCoverBorderChange,
  onRegenerateFront,
  onRegenerateBack,
  onRefineFront,
  onRefineBack,
  rightExtras,
}: CoverPairProps) {
  const [swapped, setSwapped] = useState(false);
  const frontCoverReady = frontCover.status === "done" && !!frontCover.dataUrl;

  const frontTile = (
    <CoverTile
      key="front"
      label="Front cover"
      state={frontCover}
      onRegenerate={onRegenerateFront}
      onRefine={onRefineFront}
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

      {/* Body: 2-col layout, images left (wider), controls right (narrower) */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-5">
        {/* LEFT — covers + swap */}
        <div className="flex items-start justify-center gap-3 md:gap-4">
          <div className="w-full max-w-[200px] md:max-w-[240px] shrink">
            {leftTile}
          </div>

          <div className="flex flex-col items-center pt-10 md:pt-12 shrink-0">
            <button
              type="button"
              onClick={() => setSwapped((v) => !v)}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 text-white shadow-lg shadow-violet-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
              title="Swap cover positions"
              aria-label="Swap front and back cover positions"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            <span className="mt-1.5 text-[9px] uppercase tracking-wider text-neutral-500 font-mono">
              swap
            </span>
          </div>

          <div className="w-full max-w-[200px] md:max-w-[240px] shrink">
            {rightTile}
          </div>
        </div>

        {/* RIGHT — toggles stacked + extras */}
        <div className="flex flex-col gap-4">
          <SegmentedToggle
            label="Style"
            value={coverStyle}
            onChange={onCoverStyleChange}
            options={[
              { value: "flat", label: "Flat", sub: "Bold cartoon" },
              { value: "illustrated", label: "Illustrated", sub: "Picture-book" },
            ]}
          />
          <SegmentedToggle
            label="Border"
            value={coverBorder}
            onChange={onCoverBorderChange}
            options={[
              { value: "framed", label: "Framed", sub: "Cream edge" },
              { value: "bleed", label: "Full bleed", sub: "Edge to edge" },
            ]}
          />
          {rightExtras && (
            <div className="pt-1 mt-auto border-t border-white/10 pt-3">
              {rightExtras}
            </div>
          )}
        </div>
      </div>
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
      <div className="flex flex-col gap-1 p-1 rounded-xl bg-black/40 border border-white/10">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors",
                active
                  ? "bg-gradient-to-r from-violet-500 to-cyan-400 text-white shadow"
                  : "text-neutral-300 hover:bg-white/5",
              )}
            >
              <div>{opt.label}</div>
              {opt.sub && (
                <div
                  className={cn(
                    "text-[10px] font-normal mt-0.5",
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
