"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { readSession, writeSession } from "@/lib/book-storage";
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
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReferenceImageField } from "@/components/ui/reference-image-field";
import { ModelPicker } from "@/components/playground/model-picker";
import {
  ALL_IMAGE_MODELS,
  INTERIOR_MODEL_OPTIONS,
  DEFAULT_INTERIOR_MODEL,
  isGeminiImageModel,
  type GeminiImageModel,
} from "@/lib/constants";

type AspectRatio = "1:1" | "3:4" | "4:3" | "2:3" | "3:2" | "9:16" | "16:9";
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
  const [coloringBookMode, setColoringBookMode] = useState(false);
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

  // Restore last single-image session on mount
  const hydratedRef = useRef(false);
  useEffect(() => {
    const restored = readSession<{
      prompt: string;
      aspectRatio: AspectRatio;
      coloringBookMode: boolean;
      versions: Version[];
      currentIndex: number;
      model?: GeminiImageModel;
    }>("playground-single");
    if (restored && restored.versions?.length) {
      setPrompt(restored.prompt ?? "");
      setAspectRatio(restored.aspectRatio ?? "3:4");
      setColoringBookMode(restored.coloringBookMode ?? false);
      setVersions(restored.versions);
      setCurrentIndex(restored.currentIndex ?? 0);
      // Allowlist-validate persisted model id; skip if it's been deprecated.
      // The mode-vs-model reconciliation effect above will further snap the
      // value to a default if it's not in the active option list.
      if (isGeminiImageModel(restored.model)) {
        setModel(restored.model);
      }
    }
    hydratedRef.current = true;
  }, []);

  // Save snapshot whenever versions/prompt/options change
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (versions.length === 0) return;
    const t = setTimeout(() => {
      writeSession("playground-single", {
        prompt,
        aspectRatio,
        coloringBookMode,
        versions,
        currentIndex,
        model,
      });
    }, 500);
    return () => clearTimeout(t);
  }, [prompt, aspectRatio, coloringBookMode, versions, currentIndex, model]);

  const current = versions[currentIndex];

  const runGenerate = useCallback(async () => {
    const text = prompt.trim();
    if (!text) return;
    setStatus("generating");
    setError(null);
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
      setVersions([v]);
      setCurrentIndex(0);
      setModalOpen(true);
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
      {/* Form */}
      <div className="rounded-3xl p-6 md:p-8 bg-zinc-900/60 backdrop-blur-xl border border-white/10 space-y-5">
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

        {/* Reference image */}
        <ReferenceImageField
          value={reference}
          onChange={setReference}
          helper="Gemini will borrow style, palette, and composition from this image."
        />

        {/* Sample prompts */}
        {!prompt && (
          <div>
            <p className="text-xs font-medium text-neutral-400 mb-2">
              Or try one of these
            </p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPrompt(s)}
                  className="text-left text-xs px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-neutral-300 hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-white transition-colors"
                >
                  {s.slice(0, 60)}…
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Aspect ratio */}
        <div>
          <label className="block text-sm font-semibold text-neutral-200 mb-2">
            Aspect ratio
          </label>
          <div className="flex flex-wrap gap-1.5">
            {ASPECTS.map((a) => {
              const active = a.value === aspectRatio;
              return (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAspectRatio(a.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    active
                      ? "bg-linear-to-r from-violet-500 to-cyan-400 text-white border-transparent shadow"
                      : "bg-black/40 border-white/10 text-neutral-300 hover:border-violet-500/40"
                  )}
                >
                  {a.label}
                  <span
                    className={cn(
                      "ml-1.5 text-[10px] font-mono",
                      active ? "text-white/70" : "text-neutral-500"
                    )}
                  >
                    {a.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Coloring book mode toggle */}
        <label
          className={cn(
            "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
            coloringBookMode
              ? "bg-violet-500/10 border-violet-500/40"
              : "bg-black/40 border-white/10 hover:border-violet-500/30",
          )}
        >
          <input
            type="checkbox"
            checked={coloringBookMode}
            onChange={(e) => setColoringBookMode(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-violet-500 cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white">
              Coloring book style
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
              Wrap your prompt in the master KDP-quality formula (B&amp;W line
              art, safe margins, anatomy guard, AI vision quality score).
              Off = freeform raw prompt.
            </p>
          </div>
        </label>

        {/* Image model picker. Coloring-book mode narrows to the two Flash
            variants (matches the bulk-book interior pages); raw mode shows
            all three including Pro. The explainer below surfaces the
            rationale so users don't wonder why Pro disappeared — Pro
            optimizes for photorealism / shading, which the pure-B&W
            line-art quality gate actively rejects. */}
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
                  ? "Coloring-book mode uses the Flash tier — best for clean B&W line art at low cost."
                  : "Raw freeform generation — Pro for premium one-off shots, Flash tiers for quick iterations."
              }
            />
          </div>
          {coloringBookMode && (
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Nano Banana 3 Pro is hidden here — it&apos;s tuned for
              photorealism, shading, and texture, which the pure black-and-white
              line-art quality gate rejects. Flash models give cleaner outlines
              for KDP, generate ~3-6× faster, and cost a fraction per page.
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

      {/* Gallery of previous versions */}
      {versions.length > 0 && !modalOpen && (
        <div className="mt-6 rounded-2xl p-5 bg-zinc-900/40 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-neutral-200">
              Last generation
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="text-xs text-violet-300 hover:text-violet-200 font-semibold"
            >
              Open →
            </button>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="block w-full max-w-xs mx-auto rounded-xl overflow-hidden border border-white/10 hover:border-violet-500/40 transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={versions[versions.length - 1].dataUrl}
              alt="Latest generation"
              className="w-full h-auto bg-white"
            />
          </button>
        </div>
      )}

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
                  <button
                    onClick={() => {
                      setVersions([]);
                      setCurrentIndex(0);
                      setModalOpen(false);
                      setInstruction("");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-white hover:bg-white/10 border border-white/10"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Start over
                  </button>
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
