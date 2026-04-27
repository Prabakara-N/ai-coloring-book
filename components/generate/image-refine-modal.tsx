"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Loader2,
  Send,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { QualityReason } from "@/components/playground/quality-display";
import type { QualityScore } from "@/components/playground/types";

function useStateMounted(): [boolean, (v: boolean) => void] {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return [mounted, setMounted];
}

export type RefineContext = "cover" | "back-cover" | "page" | "custom";

type AspectRatio = "1:1" | "3:4" | "4:3" | "2:3" | "3:2" | "9:16" | "16:9";

interface Version {
  dataUrl: string;
  instruction?: string;
}

const QUICK_REFINEMENTS_COVER = [
  "Make the title larger",
  "Change title color to pink",
  "Add more characters to the cover",
  "Remove the sun from the sky",
  "Use a brighter background",
  "Add a decorative border",
];

const QUICK_REFINEMENTS_BACK_COVER = [
  "Make the tagline text larger",
  "Use a different short tagline",
  "Make the top band darker",
  "Make the bottom layer lighter",
  "Center the tagline vertically",
  "Add a small flower ornament above the tagline",
  "Add a thin divider line below the tagline",
  "Remove the divider line",
  "Make the barcode rectangle larger",
  "Make the barcode rectangle smaller",
];

const QUICK_REFINEMENTS_PAGE = [
  "Remove the sun from the scene",
  "Add a decorative border around the page",
  "Move the subject to the right side",
  "Add more flowers in the foreground",
  "Thicken the outlines",
  "Remove the background, plain white",
  "Add a butterfly in the corner",
  "Make the character look happier",
];

export function ImageRefineModal({
  open,
  onClose,
  sourceDataUrl,
  aspectRatio = "3:4",
  context,
  title,
  subtitle,
  onRefined,
  downloadName = "image.png",
  quality,
}: {
  open: boolean;
  onClose: () => void;
  sourceDataUrl?: string;
  aspectRatio?: AspectRatio;
  context: RefineContext;
  title?: string;
  subtitle?: string;
  onRefined?: (dataUrl: string) => void;
  downloadName?: string;
  /**
   * Optional AI quality score from the most recent gate run on the source
   * image. When present, surfaces the score + reason inside the modal so
   * the user knows why a refine is recommended.
   */
  quality?: QualityScore | null;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [instruction, setInstruction] = useState("");
  const [status, setStatus] = useState<"idle" | "refining" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[] | null>(
    null,
  );
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  useEffect(() => {
    if (open && sourceDataUrl) {
      setVersions([{ dataUrl: sourceDataUrl }]);
      setCurrentIndex(0);
      setInstruction("");
      setStatus("idle");
      setError(null);
      setDynamicSuggestions(null);
    }
  }, [open, sourceDataUrl]);

  // Fetch AI-generated context-aware suggestions whenever the active image
  // changes (initial open + after a refine produces a new version).
  useEffect(() => {
    if (!open) return;
    const target = versions[currentIndex];
    if (!target?.dataUrl) return;
    let cancelled = false;
    setSuggestionsLoading(true);
    setDynamicSuggestions(null);
    (async () => {
      try {
        const res = await fetch("/api/refine-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageDataUrl: target.dataUrl,
            context,
            // Pass the AI quality assessment so suggestions prioritize
            // fixing the specific flaws the rater detected.
            quality: currentIndex === 0 ? quality : undefined,
          }),
        });
        const json = (await res.json()) as {
          suggestions?: string[];
          error?: string;
        };
        if (cancelled) return;
        if (res.ok && json.suggestions?.length) {
          setDynamicSuggestions(json.suggestions);
        } else {
          // Fallback: leave null → component falls back to static list
          setDynamicSuggestions(null);
        }
      } catch {
        if (!cancelled) setDynamicSuggestions(null);
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, versions, currentIndex, context, quality]);

  const current = versions[currentIndex];

  const runRefine = useCallback(async () => {
    const text = instruction.trim();
    if (!text || !current) return;
    setStatus("refining");
    setError(null);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: text,
          sourceDataUrl: current.dataUrl,
          aspectRatio,
          context,
        }),
      });
      const json = (await res.json()) as { dataUrl?: string; error?: string };
      if (!res.ok || !json.dataUrl) throw new Error(json.error || "Refinement failed");
      setVersions((prev) => [
        ...prev.slice(0, currentIndex + 1),
        { dataUrl: json.dataUrl!, instruction: text },
      ]);
      setCurrentIndex((i) => i + 1);
      setInstruction("");
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Refinement failed");
    }
  }, [instruction, current, currentIndex, aspectRatio, context]);

  const acceptVersion = useCallback(() => {
    if (current && onRefined) onRefined(current.dataUrl);
    onClose();
  }, [current, onRefined, onClose]);

  // Prefer AI-generated dynamic suggestions; fall back to static list if
  // the call is in flight, failed, or returned empty (offline/quota etc.).
  const fallbackSuggestions =
    context === "back-cover"
      ? QUICK_REFINEMENTS_BACK_COVER
      : context === "cover"
        ? QUICK_REFINEMENTS_COVER
        : QUICK_REFINEMENTS_PAGE;
  const suggestions = dynamicSuggestions ?? fallbackSuggestions;

  const [mounted, setMounted] = useStateMounted();
  if (!mounted) return null;
  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      {open && current && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-9999 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Global close button — always visible */}
          <button
            onClick={onClose}
            className="fixed top-4 right-4 z-10000 p-2.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 transition-colors shadow-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl max-h-[92vh] rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl shadow-violet-500/20 overflow-hidden grid md:grid-cols-[1fr_400px]"
          >
            {/* Image pane */}
            <div className="relative bg-black flex items-center justify-center min-h-[320px] overflow-hidden">
              <div className="relative w-full h-full flex items-center justify-center bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.dataUrl}
                  alt={title ?? "Preview"}
                  className="w-full h-full max-h-[92vh] object-contain bg-white"
                />
                {context === "page" && (
                  <div
                    className="absolute inset-[5%] border-[2.5px] border-black pointer-events-none"
                    aria-hidden="true"
                  />
                )}
              </div>
              {status === "refining" && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-300" />
                  <p className="text-sm text-violet-200 font-medium">
                    Applying refinement…
                  </p>
                </div>
              )}
              {versions.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur border border-white/10 text-white text-xs">
                  <button
                    onClick={() =>
                      setCurrentIndex((i) => Math.max(0, i - 1))
                    }
                    disabled={currentIndex === 0}
                    className="p-1 rounded hover:bg-white/10 disabled:opacity-30"
                    aria-label="Previous version"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-mono">
                    {currentIndex + 1} / {versions.length}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentIndex((i) => Math.min(versions.length - 1, i + 1))
                    }
                    disabled={currentIndex === versions.length - 1}
                    className="p-1 rounded hover:bg-white/10 disabled:opacity-30"
                    aria-label="Next version"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Refinement pane */}
            <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[92vh]">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-linear-to-r from-violet-500/15 to-cyan-500/15 border border-violet-500/30 text-[10px] font-semibold uppercase tracking-wider text-violet-300 mb-2">
                  {context === "cover"
                    ? "Cover"
                    : context === "page"
                      ? "Page"
                      : "Image"}{" "}
                  · Refine
                </div>
                <h3 className="font-display text-lg font-semibold text-white">
                  {title ?? "Refine with feedback"}
                </h3>
                {subtitle && (
                  <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>
                )}
              </div>

              {/* AI quality assessment of the source image (only shown for
                  the original; refined versions don't have a re-rated score). */}
              {quality && currentIndex === 0 && (
                <QualityReason quality={quality} />
              )}

              {current.instruction && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
                  <p className="font-semibold mb-1 uppercase tracking-wider text-[10px] text-emerald-300">
                    Last change
                  </p>
                  <p className="leading-relaxed">{current.instruction}</p>
                </div>
              )}

              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) runRefine();
                }}
                placeholder={
                  context === "cover"
                    ? "e.g. make the title bigger and more colorful, add a rainbow"
                    : "e.g. remove the sun, add a decorative border around the page"
                }
                rows={4}
                disabled={status === "refining"}
                className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-sm placeholder:text-neutral-500 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 resize-y min-h-[100px]"
              />

              <button
                onClick={runRefine}
                disabled={!instruction.trim() || status === "refining"}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-linear-to-r from-violet-500 via-indigo-400 to-cyan-400 shadow-lg shadow-violet-500/30 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {status === "refining" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Apply refinement
              </button>

              <div>
                <p className="text-xs font-semibold text-neutral-400 mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" />
                  Quick suggestions
                  {suggestionsLoading && (
                    <span className="inline-flex items-center gap-1 ml-1 text-[10px] text-violet-300 font-normal">
                      <span className="inline-block w-1 h-1 rounded-full bg-violet-300 animate-bounce" />
                      <span
                        className="inline-block w-1 h-1 rounded-full bg-violet-300 animate-bounce"
                        style={{ animationDelay: "120ms" }}
                      />
                      <span
                        className="inline-block w-1 h-1 rounded-full bg-violet-300 animate-bounce"
                        style={{ animationDelay: "240ms" }}
                      />
                      <span className="ml-1">analyzing image…</span>
                    </span>
                  )}
                  {!suggestionsLoading && dynamicSuggestions && (
                    <span className="ml-1 text-[10px] text-violet-300 font-normal">
                      ✨ AI-tailored to this image
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestionsLoading ? (
                    <SuggestionSkeleton />
                  ) : (
                    suggestions.map((r) => (
                      <button
                        key={r}
                        onClick={() => setInstruction(r)}
                        disabled={status === "refining"}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300 hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-white disabled:opacity-50 transition-colors"
                      >
                        {r}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-white/10 flex flex-wrap gap-2">
                {onRefined && versions.length > 1 && (
                  <button
                    onClick={acceptVersion}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-400 shadow"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Use this version
                  </button>
                )}
                <a
                  href={current.dataUrl}
                  download={downloadName}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white text-black hover:bg-neutral-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  PNG
                </a>
              </div>

              {status === "error" && error && (
                <div className="flex items-start gap-2 text-xs text-red-300">
                  <X className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/**
 * Pulsing skeleton chips shown while the AI vision call is generating
 * dynamic suggestions for the current image.
 */
function SuggestionSkeleton() {
  const widths = [120, 90, 150, 110, 130, 100];
  return (
    <>
      {widths.map((w, i) => (
        <div
          key={i}
          className="h-6 rounded-full bg-white/5 border border-white/10 animate-pulse"
          style={{ width: w }}
        />
      ))}
    </>
  );
}
