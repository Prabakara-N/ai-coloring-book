"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Sparkles, Wand2, X } from "lucide-react";
import {
  extractCoverPalette,
  type PaletteSwatch,
} from "@/lib/extract-cover-palette";

interface BackCoverRefinePanelProps {
  /**
   * Front cover image — the source of the color palette. When omitted
   * the swatch row is skipped and only tagline picking is shown.
   */
  frontCoverDataUrl?: string;
  /** Book title — used to seed the tagline generator. */
  bookTitle: string;
  /** Cover scene description — gives the tagline generator context. */
  coverScene?: string;
  /** KDP description — richer context for the tagline generator. */
  bookDescription?: string;
  /** Audience tag (toddlers/kids/etc.). */
  audience?: string;
  /** Sample subjects from interior pages — strongest signal for taglines. */
  pageSubjects?: string[];
  /** Number of interior coloring pages — when set, taglines may cite it. */
  pageCount?: number;
  /** True while the parent is regenerating (so we can disable Apply). */
  busy: boolean;
  /**
   * Apply handler — receives the picked color hue name (e.g. "soft
   * pastel pink") and the picked tagline text, both required. The parent
   * is expected to call /api/generate with mode=back-cover + forceColor
   * + forceTagline + add a synthesized chat turn.
   */
  onApply: (color: string, tagline: string) => void;
}

export function BackCoverRefinePanel({
  frontCoverDataUrl,
  bookTitle,
  coverScene,
  bookDescription,
  audience,
  pageSubjects,
  pageCount,
  busy,
  onApply,
}: BackCoverRefinePanelProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(t) &&
        triggerRef.current &&
        !triggerRef.current.contains(t)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const [swatches, setSwatches] = useState<PaletteSwatch[]>([]);
  const [paletteLoading, setPaletteLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState<PaletteSwatch | null>(
    null,
  );

  const [taglines, setTaglines] = useState<string[]>([]);
  const [taglineSeed, setTaglineSeed] = useState(0);
  const [taglineLoading, setTaglineLoading] = useState(false);
  const [taglineError, setTaglineError] = useState<string | null>(null);
  const [selectedTagline, setSelectedTagline] = useState<string | null>(null);
  const [customTagline, setCustomTagline] = useState("");

  // Extract palette from the front cover once when the component mounts.
  useEffect(() => {
    if (!frontCoverDataUrl) return;
    let cancelled = false;
    setPaletteLoading(true);
    extractCoverPalette(frontCoverDataUrl)
      .then((s) => {
        if (cancelled) return;
        setSwatches(s);
        if (s.length > 0) setSelectedColor(s[0]);
      })
      .finally(() => {
        if (!cancelled) setPaletteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [frontCoverDataUrl]);

  // Fetch initial taglines on mount + on "Suggest more" clicks.
  useEffect(() => {
    let cancelled = false;
    setTaglineLoading(true);
    setTaglineError(null);
    fetch("/api/back-cover-tagline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookTitle,
        coverScene,
        bookDescription,
        audience,
        pageSubjects,
        pageCount,
        variantSeed: taglineSeed,
      }),
    })
      .then(async (res) => {
        const data = (await res.json()) as
          | { taglines: string[] }
          | { error: string };
        if (!res.ok || "error" in data) {
          throw new Error("error" in data ? data.error : "Tagline fetch failed.");
        }
        if (cancelled) return;
        setTaglines(data.taglines);
        if (data.taglines[0] && !selectedTagline) {
          setSelectedTagline(data.taglines[0]);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setTaglineError(
          err instanceof Error ? err.message : "Could not fetch taglines.",
        );
      })
      .finally(() => {
        if (!cancelled) setTaglineLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // selectedTagline intentionally NOT in deps — we only want to seed the
    // initial pick once; subsequent fetches don't reset the user's choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookTitle, coverScene, bookDescription, audience, pageCount, taglineSeed]);

  const finalTagline = customTagline.trim() || selectedTagline || "";
  const canApply =
    !busy && !!selectedColor?.hueName && finalTagline.length >= 4;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`group inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-linear-to-r from-violet-500/20 to-cyan-500/15 backdrop-blur px-3.5 py-2 text-xs font-semibold text-violet-100 hover:from-violet-500/30 hover:to-cyan-500/25 hover:text-white transition-all shadow-md shadow-violet-500/10 ${
          open ? "ring-2 ring-violet-400/50" : ""
        }`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Wand2 className="w-3.5 h-3.5" />
        Customize cover
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Customize back cover"
          className="absolute right-0 top-full mt-2 w-[340px] max-w-[calc(100vw-2rem)] z-50 rounded-2xl border border-violet-500/30 bg-zinc-950/95 backdrop-blur shadow-2xl shadow-black/40 p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-violet-300" />
              <p className="text-sm font-semibold text-white">
                Color &amp; tagline
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-neutral-400 hover:text-white p-1 rounded hover:bg-white/5"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

      {/* Color swatches */}
      <div className="space-y-1.5">
        <p className="text-[11px] uppercase tracking-wider text-violet-300 font-semibold">
          Front-cover palette
        </p>
        {paletteLoading ? (
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Extracting palette…
          </div>
        ) : swatches.length === 0 ? (
          <p className="text-xs text-neutral-400">
            Couldn&apos;t extract a palette from the cover. Pick a tagline
            below and the back cover will keep its current color.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {swatches.map((s) => {
              const active = selectedColor?.hex === s.hex;
              return (
                <button
                  key={s.hex}
                  type="button"
                  onClick={() => setSelectedColor(s)}
                  className={`group relative w-9 h-9 rounded-lg border-2 transition-all ${
                    active
                      ? "border-white shadow-lg scale-110"
                      : "border-white/15 hover:border-white/40"
                  }`}
                  style={{ backgroundColor: s.cssColor }}
                  title={s.hueName}
                  aria-label={`Color: ${s.hueName}`}
                >
                  {active && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border border-white" />
                  )}
                </button>
              );
            })}
            {selectedColor && (
              <span className="text-xs text-neutral-300 ml-1 capitalize">
                {selectedColor.hueName}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Taglines */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wider text-violet-300 font-semibold">
            Pick a tagline
          </p>
          <button
            type="button"
            onClick={() => setTaglineSeed((s) => s + 1)}
            disabled={taglineLoading || busy}
            className="inline-flex items-center gap-1 text-[11px] text-neutral-300 hover:text-white px-2 py-0.5 rounded hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3 h-3 ${taglineLoading ? "animate-spin" : ""}`}
            />
            Suggest more
          </button>
        </div>
        {taglineError ? (
          <p className="text-xs text-red-300">{taglineError}</p>
        ) : taglineLoading && taglines.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Generating taglines…
          </div>
        ) : (
          <div className="space-y-1">
            {taglines.map((t) => {
              const active = selectedTagline === t && customTagline === "";
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setSelectedTagline(t);
                    setCustomTagline("");
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-violet-500/20 border border-violet-400 text-white"
                      : "bg-black/30 border border-white/10 text-neutral-300 hover:border-white/30 hover:text-white"
                  }`}
                >
                  <span className="italic">{`"${t}"`}</span>
                </button>
              );
            })}
          </div>
        )}
        {/* Custom tagline override */}
        <input
          type="text"
          value={customTagline}
          onChange={(e) => {
            setCustomTagline(e.target.value);
            if (e.target.value.trim()) setSelectedTagline(null);
          }}
          placeholder="Or type your own tagline (≤8 words)"
          className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-black/40 border border-white/10 text-white placeholder:text-neutral-500 focus:outline-none focus:border-violet-400"
        />
      </div>

      {/* Apply */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            if (!canApply || !selectedColor) return;
            onApply(selectedColor.hueName, finalTagline);
            setOpen(false);
          }}
          disabled={!canApply}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-linear-to-r from-violet-500 to-cyan-400 text-white shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-4 h-4" />
          Apply &amp; regenerate
        </button>
      </div>
        </div>
      )}
    </div>
  );
}
