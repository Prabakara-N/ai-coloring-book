"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, RefreshCw, Loader2, X } from "lucide-react";
import type { IdeaAudience, IdeaSuggestion } from "@/lib/idea-suggestions";

const AUDIENCES: Array<{ slug: IdeaAudience; label: string }> = [
  { slug: "any", label: "Surprise me" },
  { slug: "toddlers", label: "Toddlers 3-6" },
  { slug: "kids", label: "Kids 6-10" },
  { slug: "tweens", label: "Tweens 10-14" },
];

const FALLBACK_IDEAS: IdeaSuggestion[] = [
  {
    text: "20 ocean sea creatures with expressive faces and bubbles for toddlers ages 3-6",
    category: "Animals",
    icon: "🐠",
  },
  {
    text: "Mighty dinosaurs in prehistoric jungle scenes for kids 6-10",
    category: "Animals",
    icon: "🦖",
  },
  {
    text: "Magical unicorns in enchanted forests with rainbows and stars",
    category: "Fantasy",
    icon: "🦄",
  },
  {
    text: "Construction vehicles for little builders — trucks, cranes, bulldozers, mixers",
    category: "Vehicles",
    icon: "🚜",
  },
  {
    text: "Cute baby farm animals — calves, lambs, piglets, ducklings — in a sunny meadow",
    category: "Animals",
    icon: "🐮",
  },
  {
    text: "Halloween scenes with friendly ghosts, pumpkins, and trick-or-treaters",
    category: "Holiday",
    icon: "🎃",
  },
];

interface IdeaSuggestionsPanelProps {
  open: boolean;
  onClose: () => void;
  /** Called with the chosen idea's text. The parent fills its idea field. */
  onPick: (text: string) => void;
}

export function IdeaSuggestionsPanel({
  open,
  onClose,
  onPick,
}: IdeaSuggestionsPanelProps) {
  const [audience, setAudience] = useState<IdeaAudience>("any");
  const [ideas, setIdeas] = useState<IdeaSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const fetchIdeas = useCallback(async (aud: IdeaAudience) => {
    setLoading(true);
    setError(null);
    setUsingFallback(false);
    try {
      const res = await fetch("/api/idea-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience: aud }),
      });
      const json = (await res.json()) as {
        ideas?: IdeaSuggestion[];
        error?: string;
      };
      if (!res.ok || !json.ideas?.length) {
        throw new Error(json.error || "No ideas returned.");
      }
      setIdeas(json.ideas);
    } catch (e) {
      // Soft-fail: show static fallback so the UX still works.
      setError(e instanceof Error ? e.message : "Couldn't fetch ideas.");
      setIdeas(FALLBACK_IDEAS);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch when first opened, then re-fetch when audience changes.
  useEffect(() => {
    if (!open) return;
    void fetchIdeas(audience);
  }, [open, audience, fetchIdeas]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl border border-violet-500/30 bg-zinc-950/95 backdrop-blur-xl shadow-2xl shadow-violet-500/20 p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <h4 className="font-display text-sm font-semibold text-white">
              Pick an idea, Sparky&apos;ll plan it
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/5 text-neutral-400"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {AUDIENCES.map((a) => {
            const active = a.slug === audience;
            return (
              <button
                key={a.slug}
                type="button"
                onClick={() => setAudience(a.slug)}
                disabled={loading}
                className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors disabled:opacity-50 ${
                  active
                    ? "bg-linear-to-r from-violet-500 to-cyan-400 text-white border-transparent"
                    : "bg-white/5 border-white/10 text-neutral-300 hover:border-violet-500/40 hover:text-white"
                }`}
              >
                {a.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => void fetchIdeas(audience)}
            disabled={loading}
            className="ml-auto inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300 hover:border-violet-500/40 hover:text-white disabled:opacity-50"
            aria-label="Refresh ideas"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Refresh
          </button>
        </div>

        {usingFallback && (
          <p className="text-[10px] text-amber-300/80 italic">
            ⚠ Couldn&apos;t reach the AI right now — showing starter ideas.
            {error ? ` (${error})` : ""}
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-1.5 max-h-[60vh] overflow-y-auto pr-1">
          {loading && ideas.length === 0
            ? [0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl bg-white/5 border border-white/10 animate-pulse"
                />
              ))
            : ideas.map((idea, i) => (
                <button
                  key={`${idea.text}-${i}`}
                  type="button"
                  onClick={() => {
                    onPick(idea.text);
                    onClose();
                  }}
                  className="text-left p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5 transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base shrink-0 leading-tight">
                      {idea.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-200 leading-snug group-hover:text-white">
                        {idea.text}
                      </p>
                      <span className="inline-block mt-1 text-[9px] uppercase tracking-wider font-mono text-violet-300/80">
                        {idea.category}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
