"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Wand2,
  Loader2,
  Sparkles,
  X,
  Download,
  RefreshCw,
  MessageSquare,
  Send,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReferenceImageField } from "@/components/ui/reference-image-field";
import { ModelPicker } from "@/components/playground/model-picker";
import { AspectRatioPicker } from "@/components/playground/aspect-ratio-picker";
import { forwardRef } from "react";
import {
  ALL_IMAGE_MODELS,
  INTERIOR_MODEL_OPTIONS,
  DEFAULT_INTERIOR_MODEL,
  isGeminiImageModel,
  type GeminiImageModel,
} from "@/lib/constants";

type AspectRatio = "1:1" | "3:4" | "4:3" | "2:3" | "3:2" | "9:16" | "16:9";

type ImageCategory =
  | "generic"
  | "coloring-page"
  | "wall-art"
  | "nursery-print"
  | "sticker"
  | "greeting-card"
  | "book-illustration"
  | "pinterest-pin";

const CATEGORIES: { value: ImageCategory; label: string }[] = [
  { value: "generic", label: "Generic — anything goes" },
  { value: "coloring-page", label: "Coloring page (B&W line art)" },
  { value: "wall-art", label: "Wall art / poster" },
  { value: "nursery-print", label: "Nursery print" },
  { value: "sticker", label: "Sticker design" },
  { value: "greeting-card", label: "Greeting card" },
  { value: "book-illustration", label: "Children's book illustration" },
  { value: "pinterest-pin", label: "Pinterest pin (9:16)" },
];
type Status = "idle" | "generating" | "refining" | "done" | "error";

interface Version {
  dataUrl: string;
  instruction?: string;
  /**
   * Model that produced this version. Refines inherit this value so each
   * follow-up edit stays on the same model the source was generated with —
   * keeps line weight / detail consistent across versions and avoids
   * silent quality jumps when the dropdown is changed mid-flow.
   */
  model?: GeminiImageModel;
}

const ASPECTS: { value: AspectRatio; label: string; sub: string }[] = [
  { value: "1:1", label: "Square", sub: "1:1" },
  { value: "3:4", label: "KDP", sub: "3:4" },
  { value: "2:3", label: "Tall", sub: "2:3" },
  { value: "4:3", label: "Landscape", sub: "4:3" },
  { value: "3:2", label: "Wide", sub: "3:2" },
  { value: "9:16", label: "Pin", sub: "9:16" },
  { value: "16:9", label: "Banner", sub: "16:9" },
];

const QUICK_REFINEMENTS = [
  "Add a decorative border around the page",
  "Remove the sun from the scene",
  "Move the subject to the right side",
  "Add more flowers in the foreground",
  "Make the character look happier",
  "Thicken the outlines for easier coloring",
  "Remove the background, plain white",
  "Add a butterfly in the corner",
];

const SAMPLE_PROMPTS = [
  "A happy cow standing in a farm field with a barn in the background, rectangular border around the page, coloring book line art",
  "A friendly dinosaur in a jungle with palm trees, decorative border, coloring book page",
  "A smiling astronaut floating among planets and stars, thick outlines, printable coloring page",
  "A unicorn with flowing mane in a magical forest with stars and flowers, coloring book style",
];

export function PlaygroundStudio() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("3:4");
  const [category, setCategory] = useState<ImageCategory>("generic");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasError, setIdeasError] = useState<string | null>(null);
  const [ideasSeed, setIdeasSeed] = useState(0);
  const coloringBookMode = category === "coloring-page";
  // Image model for single-image generation. Coloring-book mode narrows the
  // dropdown to the two Flash variants (matching the bulk-book interior
  // pages convention); raw mode opens up the full lineup including Pro.
  // The active list is computed below from `coloringBookMode`.
  const [model, setModel] = useState<GeminiImageModel>(DEFAULT_INTERIOR_MODEL);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const availableModels: readonly GeminiImageModel[] = coloringBookMode
    ? INTERIOR_MODEL_OPTIONS
    : ALL_IMAGE_MODELS;

  // When the user toggles coloring-book mode, the previously-selected model
  // may no longer be in the active option list (e.g. they had Pro selected
  // and just turned coloring-book mode ON). Snap to the workhorse default
  // so the <select> never shows a value that isn't actually rendered.
  useEffect(() => {
    if (!availableModels.includes(model)) {
      setModel(DEFAULT_INTERIOR_MODEL);
    }
  }, [availableModels, model]);

  const [versions, setVersions] = useState<Version[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const current = versions[currentIndex];

  const fetchIdeas = useCallback(
    async (cat: ImageCategory, seed: number) => {
      if (cat === "generic") return;
      setIdeasLoading(true);
      setIdeasError(null);
      try {
        const res = await fetch("/api/single-image-ideas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: cat, variantSeed: seed }),
        });
        const data = (await res.json()) as
          | { ideas: string[] }
          | { error: string };
        if (!res.ok || "error" in data) {
          throw new Error("error" in data ? data.error : "Idea fetch failed.");
        }
        setIdeas(data.ideas);
      } catch (err: unknown) {
        setIdeasError(
          err instanceof Error ? err.message : "Could not fetch ideas.",
        );
      } finally {
        setIdeasLoading(false);
      }
    },
    [],
  );

  const runGenerate = useCallback(async () => {
    const text = prompt.trim();
    if (!text) return;
    setStatus("generating");
    setError(null);
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    try {
      const body = coloringBookMode
        ? {
            mode: "subject" as const,
            subject: text,
            age: "kids" as const,
            detail: "simple" as const,
            background: "scene" as const,
            aspectRatio,
            referenceDataUrl: reference ?? undefined,
            model,
          }
        : {
            mode: "raw" as const,
            prompt: text,
            aspectRatio,
            referenceDataUrl: reference ?? undefined,
            model,
          };
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { dataUrl?: string; error?: string };
      if (!res.ok || !json.dataUrl) throw new Error(json.error || "Generation failed");
      const v: Version = { dataUrl: json.dataUrl, model };
      setVersions((prev) => {
        const next = [...prev, v];
        setCurrentIndex(next.length - 1);
        return next;
      });
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Generation failed");
    }
  }, [prompt, aspectRatio, reference, coloringBookMode, model]);

  const runRefine = useCallback(async () => {
    const text = instruction.trim();
    if (!text || !current) return;
    setStatus("refining");
    setError(null);
    // Refine inherits the source version's model (or, for legacy versions
    // without a tag, falls back to the live dropdown). The new version is
    // tagged with the same model so subsequent refines stay on lineage.
    const sourceModel: GeminiImageModel = current.model ?? model;
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: text,
          sourceDataUrl: current.dataUrl,
          aspectRatio,
          model: sourceModel,
        }),
      });
      const json = (await res.json()) as { dataUrl?: string; error?: string };
      if (!res.ok || !json.dataUrl) throw new Error(json.error || "Refinement failed");
      const newVersion: Version = {
        dataUrl: json.dataUrl,
        instruction: text,
        model: sourceModel,
      };
      setVersions((prev) => [...prev.slice(0, currentIndex + 1), newVersion]);
      setCurrentIndex((i) => i + 1);
      setInstruction("");
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Refinement failed");
    }
  }, [instruction, current, currentIndex, aspectRatio, model]);

  const nav = (delta: number) => {
    setCurrentIndex((i) => Math.max(0, Math.min(versions.length - 1, i + delta)));
  };

  return (
    <>
      <div className="rounded-3xl p-6 md:p-8 bg-zinc-900/60 backdrop-blur-xl border border-white/10 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-neutral-200 mb-2">
            Category
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <CategoryDropdown
              value={category}
              onChange={(v) => {
                setCategory(v);
                setIdeas([]);
                setIdeasError(null);
              }}
              disabled={status === "generating"}
            />
            {category !== "generic" && (
              <button
                type="button"
                onClick={() => fetchIdeas(category, ideasSeed)}
                disabled={ideasLoading || status === "generating"}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-violet-500/15 border border-violet-500/40 text-violet-200 hover:bg-violet-500/25 disabled:opacity-50"
              >
                {ideasLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {ideas.length > 0 ? "More ideas" : "Give me ideas"}
              </button>
            )}
          </div>
          {ideasError && (
            <p className="text-[11px] text-red-300 mt-2">{ideasError}</p>
          )}
          {ideas.length > 0 && (
            <div className="mt-3 grid gap-1.5">
              {ideas.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => {
                    setPrompt(idea);
                    setIdeas([]);
                  }}
                  className="text-left text-xs px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-neutral-300 hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-white transition-colors"
                >
                  {idea}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  const next = ideasSeed + 1;
                  setIdeasSeed(next);
                  fetchIdeas(category, next);
                }}
                disabled={ideasLoading}
                className="self-start mt-1 text-[11px] text-violet-300 hover:text-violet-200 inline-flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw
                  className={cn("w-3 h-3", ideasLoading && "animate-spin")}
                />
                Suggest different ones
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-200 mb-2">
            Your prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) runGenerate();
            }}
            placeholder="Describe what to draw — e.g. a friendly dragon sitting in a magical forest, full scene with trees and stars, thick black line art, coloring-book style…"
            rows={5}
            className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white text-sm placeholder:text-neutral-500 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 resize-y min-h-[120px]"
            disabled={status === "generating"}
          />
          <div className="flex items-center justify-between mt-2 text-[11px] text-neutral-500">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px]">
                ⌘/Ctrl
              </kbd>{" "}
              +{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px]">
                Enter
              </kbd>{" "}
              to generate
            </span>
            <span className="font-mono">{prompt.length} chars</span>
          </div>
        </div>

        <ReferenceImageField
          value={reference}
          onChange={setReference}
          helper="Gemini will borrow style, palette, and composition from this image."
        />

        <div>
          <label className="block text-sm font-semibold text-neutral-200 mb-2">
            Aspect ratio
          </label>
          <AspectRatioPicker
            value={aspectRatio}
            onChange={setAspectRatio}
            disabled={status === "generating"}
          />
        </div>

        <div className="flex flex-col gap-1.5 px-1">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-neutral-300">
              Image model
            </span>
            <ModelPicker
              label=""
              value={model}
              options={availableModels}
              onChange={setModel}
              disabled={status === "generating"}
              title={
                coloringBookMode
                  ? "Coloring-page category uses the Flash tier — best for clean B&W line art at low cost."
                  : "Pro for premium one-off shots, Flash tiers for quick iterations."
              }
            />
          </div>
          {coloringBookMode && (
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Nano Banana 3 Pro is hidden for the coloring-page category — it&apos;s
              tuned for photorealism / shading, which the B&amp;W line-art quality
              gate rejects. Flash models give cleaner outlines, generate faster,
              and cost a fraction per page.
            </p>
          )}
        </div>

        <button
          onClick={runGenerate}
          disabled={!prompt.trim() || status === "generating"}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-linear-to-r from-violet-500 via-indigo-400 to-cyan-400 shadow-lg shadow-violet-500/40 hover:shadow-xl hover:shadow-violet-500/60 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {status === "generating" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          {status === "generating" ? "Generating…" : "Generate image"}
        </button>

        {status === "error" && error && (
          <div className="flex items-start gap-2 text-sm text-red-300">
            <X className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <ResultsGallery
        ref={resultsRef}
        versions={versions}
        currentIndex={currentIndex}
        onSelect={(i) => setCurrentIndex(i)}
        onOpen={() => setModalOpen(true)}
        generating={status === "generating"}
        aspectRatio={aspectRatio}
      />

      {/* Modal — portaled to body so stacking contexts don't trap it */}
      <PlaygroundModal
        open={modalOpen && !!current}
        onClose={() => setModalOpen(false)}
      >
        {modalOpen && current && (
          <motion.div
            key="modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-9999 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setModalOpen(false)}
          >
            <button
              onClick={() => setModalOpen(false)}
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
              className="w-full max-w-5xl max-h-[92vh] rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl shadow-violet-500/20 overflow-hidden grid md:grid-cols-[1fr_400px]"
            >
              {/* Image pane */}
              <div className="relative bg-black flex items-center justify-center min-h-[320px] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.dataUrl}
                  alt="Current version"
                  className="w-full h-full max-h-[92vh] object-contain bg-white"
                />
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
                      onClick={() => nav(-1)}
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
                      onClick={() => nav(1)}
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
              <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[90vh]">
                <div>
                  <h3 className="font-display text-lg font-semibold text-white mb-1">
                    Refine with feedback
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Tell Gemini what to change. Each refinement builds on the current version.
                  </p>
                </div>

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
                  placeholder="e.g. Remove the sun from the top, add a decorative border around the page, and add more grass at the bottom"
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
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_REFINEMENTS.map((r) => (
                      <button
                        key={r}
                        onClick={() => setInstruction(r)}
                        disabled={status === "refining"}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300 hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-white disabled:opacity-50 transition-colors"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-white/10 flex flex-wrap gap-2">
                  <a
                    href={current.dataUrl}
                    download={`playground_v${currentIndex + 1}.png`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white text-black hover:bg-neutral-200"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PNG
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
      </PlaygroundModal>
    </>
  );
}

interface CategoryDropdownProps {
  value: ImageCategory;
  onChange: (v: ImageCategory) => void;
  disabled?: boolean;
}

function CategoryDropdown({ value, onChange, disabled }: CategoryDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);
  const current = CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[0];
  return (
    <div ref={ref} className="relative inline-block w-[280px]">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm hover:border-violet-500/40 transition-colors",
          open && "border-violet-500/60",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <span className="truncate text-left">{current.label}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-neutral-400 transition-transform shrink-0",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute top-full mt-1 left-0 right-0 z-30 rounded-lg bg-zinc-950 border border-white/15 shadow-2xl shadow-black/60 py-1"
        >
          {CATEGORIES.map((c) => {
            const active = c.value === value;
            return (
              <button
                key={c.value}
                role="option"
                aria-selected={active}
                type="button"
                onClick={() => {
                  onChange(c.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors",
                  active
                    ? "bg-violet-500/15 text-white"
                    : "text-neutral-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <span className="truncate">{c.label}</span>
                {active && (
                  <Check className="w-3.5 h-3.5 text-violet-300 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ResultsGalleryProps {
  versions: Version[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onOpen: () => void;
  generating: boolean;
  aspectRatio: AspectRatio;
}

const ResultsGallery = forwardRef<HTMLDivElement, ResultsGalleryProps>(
  function ResultsGallery(
    { versions, currentIndex, onSelect, onOpen, generating, aspectRatio },
    ref,
  ) {
    const rowRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
      const el = rowRef.current;
      if (!el) return;
      el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    }, [versions.length, generating]);
    if (versions.length === 0 && !generating) return null;
    const aspectStyle = aspectRatio.replace(":", " / ");
    const totalCount = versions.length + (generating ? 1 : 0);
    const shouldCenter = totalCount <= 2;
    return (
      <div
        ref={ref}
        className="mt-6 rounded-2xl p-5 bg-zinc-900/40 border border-white/10"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-neutral-200">
            Generations{" "}
            <span className="text-neutral-500 font-normal">
              ({versions.length})
            </span>
          </p>
          {versions.length > 0 && (
            <button
              onClick={onOpen}
              className="text-xs text-violet-300 hover:text-violet-200 font-semibold"
            >
              Open full view →
            </button>
          )}
        </div>
        <div
          ref={rowRef}
          className={cn(
            "flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory",
            shouldCenter ? "justify-center" : "justify-start",
          )}
        >
          {versions.map((v, i) => {
            const active = i === currentIndex;
            return (
              <button
                key={v.dataUrl.slice(-32) + i}
                type="button"
                onClick={() => {
                  onSelect(i);
                  onOpen();
                }}
                className={cn(
                  "shrink-0 snap-start w-[220px] md:w-[260px] rounded-xl overflow-hidden border-2 bg-white transition-all",
                  active
                    ? "border-violet-400 shadow-lg shadow-violet-500/30"
                    : "border-white/10 hover:border-violet-500/40",
                )}
                style={{ aspectRatio: aspectStyle }}
                title={v.instruction ?? "Open"}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.dataUrl}
                  alt={`Generation ${i + 1}`}
                  className="w-full h-full object-contain"
                />
              </button>
            );
          })}
          {generating && (
            <div
              className="shrink-0 snap-start w-[220px] md:w-[260px] rounded-xl border border-violet-500/30 bg-linear-to-br from-violet-500/10 via-zinc-800 to-cyan-500/10 animate-pulse flex items-center justify-center text-violet-300"
              style={{ aspectRatio: aspectStyle }}
            >
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-[11px] font-semibold tracking-wide">
                  Generating…
                </span>
              </div>
            </div>
          )}
        </div>
        {versions.length > 1 && (
          <p className="text-[11px] text-neutral-500 mt-2">
            Newest on the right. Click any tile to open the full view, scroll
            sideways to see older generations.
          </p>
        )}
      </div>
    );
  },
);

function PlaygroundModal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(<AnimatePresence>{children}</AnimatePresence>, document.body);
}
