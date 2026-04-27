"use client";

import { Loader2, RefreshCw, MessageSquare, BookPlus } from "lucide-react";
import type { QualityScore } from "@/components/playground/types";

export interface BackCoverState {
  status: "pending" | "generating" | "done" | "error";
  dataUrl?: string;
  error?: string;
  quality?: QualityScore | null;
}

interface BackCoverDetailProps {
  back: BackCoverState;
  /** Whether the front cover has been generated. Back cover is gated until then. */
  frontCoverReady: boolean;
  onRegenerate: () => Promise<void> | void;
  onOpenRefine: (dataUrl: string) => void;
}

/**
 * Fullscreen detail for the back-cover card. Shows the generated back cover
 * with a clear visualization of the Amazon barcode safe-zone (lower-right
 * empty area).
 */
export function BackCoverDetail({
  back,
  frontCoverReady,
  onRegenerate,
  onOpenRefine,
}: BackCoverDetailProps) {
  return (
    <div className="grid md:grid-cols-[1fr_280px] gap-6">
      <div
        className="relative rounded-2xl overflow-hidden bg-linear-to-br from-zinc-800 to-zinc-900 border border-white/10"
        style={{ aspectRatio: "3 / 4" }}
      >
        {back.status === "done" && back.dataUrl ? (
          <button
            type="button"
            onClick={() => onOpenRefine(back.dataUrl!)}
            className="absolute inset-0 w-full h-full group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={back.dataUrl}
              alt="Back cover"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Barcode safe-zone overlay (visualization only, not in output) */}
            <div
              className="absolute border-2 border-dashed border-amber-400/70 bg-amber-300/15 backdrop-blur-[1px] flex items-center justify-center text-[10px] font-mono uppercase tracking-wider text-amber-200 pointer-events-none"
              style={{
                right: "4%",
                bottom: "4%",
                width: "28%",
                height: "18%",
              }}
              title="Amazon barcode safe-zone"
            >
              barcode
            </div>
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
              <MessageSquare className="w-5 h-5" />
              <span className="text-xs font-semibold">Click to refine</span>
            </div>
          </button>
        ) : back.status === "generating" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-violet-300">
            <Loader2 className="w-7 h-7 animate-spin" />
            <p className="text-sm">Generating back cover…</p>
          </div>
        ) : back.status === "error" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-950/30 p-4 text-center">
            <p className="text-xs text-red-200 max-w-xs">
              {back.error ?? "Back cover failed"}
            </p>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-400">
            <BookPlus className="w-8 h-8" />
            <p className="text-sm">Back cover not generated yet</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 min-w-0">
        <p className="text-xs uppercase tracking-wider text-neutral-500">
          KDP back cover
        </p>
        <p className="text-xs text-neutral-400 leading-relaxed">
          The back cover includes your title, description, and a few
          decorative thumbnails. The bottom-right area is reserved for
          Amazon&apos;s ISBN barcode (highlighted in amber when generated).
        </p>
        {frontCoverReady ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200 leading-relaxed">
            <strong>Color match:</strong> the back cover uses the front cover
            as a style reference, so palette + border + character look stay
            consistent.
          </div>
        ) : (
          <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 px-3 py-2 text-[11px] text-violet-200 leading-relaxed">
            <strong>Generate the front cover first.</strong> The back cover
            uses it as a style reference to match colors and border.
          </div>
        )}
        <button
          type="button"
          onClick={() => void onRegenerate()}
          disabled={back.status === "generating" || !frontCoverReady}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-linear-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {back.status === "generating" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {back.status === "done" ? "Regenerate back cover" : "Generate back cover"}
        </button>
      </div>
    </div>
  );
}
