"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Sparkles,
} from "lucide-react";
import type { ModelMessage } from "ai";
import { QualityReason } from "@/components/playground/quality-display";
import type { QualityScore } from "@/components/playground/types";
import type { PageMeta, PageStatus } from "@/lib/refine-chat";
import { ChatComposer } from "./chat-composer";
import { UserBubble, AssistantBubble } from "./chat-bubble";

function useStateMounted(): [boolean, (v: boolean) => void] {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return [mounted, setMounted];
}

export type RefineContext = "cover" | "back-cover" | "page" | "custom";

type AspectRatio = "1:1" | "3:4" | "4:3" | "2:3" | "3:2" | "9:16" | "16:9";

interface Version {
  dataUrl: string;
  /** What instruction (if any) produced this version. */
  instruction?: string;
}

type Turn =
  | {
      kind: "user";
      id: string;
      text: string;
      referenceDataUrl?: string;
    }
  | {
      kind: "assistant";
      id: string;
      reply: string;
      /** True while waiting for the chat reply to arrive. Shows typing dots. */
      awaitingReply?: boolean;
      /** True while the image is generating (after chat reply, before refine returns). */
      generatingImage?: boolean;
      imageDataUrl?: string;
      referenceLabels?: string[];
    };

const FALLBACK_SUGGESTIONS_COVER = [
  "Make the title larger",
  "Use a brighter background",
  "Add a decorative border",
];
const FALLBACK_SUGGESTIONS_BACK_COVER = [
  "Make the tagline larger",
  "Make the top band darker",
  "Center the tagline vertically",
];
const FALLBACK_SUGGESTIONS_PAGE = [
  "Remove the sun from the scene",
  "Thicken the outlines",
  "Add a butterfly in the corner",
];

function fallbackSuggestions(context: RefineContext): string[] {
  if (context === "back-cover") return FALLBACK_SUGGESTIONS_BACK_COVER;
  if (context === "cover") return FALLBACK_SUGGESTIONS_COVER;
  return FALLBACK_SUGGESTIONS_PAGE;
}

export interface RefineBookContextProp {
  bookTitle: string;
  bookScene?: string;
  audience?: string;
  /** Id of the page being edited. */
  targetId: string;
  /** Human label for the page being edited (e.g. "Front cover", "Page 3"). */
  targetLabel: string;
  targetSubject?: string;
  pages: PageMeta[];
  coverStatus: PageStatus;
  backCoverStatus: PageStatus;
}

export interface ImageRefineModalProps {
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
  /**
   * Full book context — enables Sparky to answer cross-page questions
   * ("match page 3"), refuse references to ungenerated pages, etc.
   * When omitted, Sparky still works but treats the source as a single
   * standalone image with no other pages to reference.
   */
  bookContext?: RefineBookContextProp;
  /**
   * Lazy resolver invoked when Sparky asks for another page as a reference.
   * Returns the dataUrl for the requested pageId, or null if not available.
   */
  getPageDataUrl?: (pageId: string) => string | null;
}

export function ImageRefineModal(props: ImageRefineModalProps) {
  const {
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
    bookContext,
    getPageDataUrl,
  } = props;

  const [versions, setVersions] = useState<Version[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [history, setHistory] = useState<ModelMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[] | null>(
    null,
  );
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const transcriptRef = useRef<HTMLDivElement | null>(null);

  // Reset everything whenever the modal is opened with a fresh source.
  useEffect(() => {
    if (!open || !sourceDataUrl) return;
    setVersions([{ dataUrl: sourceDataUrl }]);
    setCurrentIndex(0);
    setTurns([]);
    setHistory([]);
    setBusy(false);
    setError(null);
    setDynamicSuggestions(null);
  }, [open, sourceDataUrl]);

  // Pull AI suggestions tailored to the currently-displayed image.
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

  // Auto-scroll the transcript to the bottom whenever a new turn arrives.
  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns]);

  const current = versions[currentIndex];

  const labelForReferenceTag = useCallback(
    (tag: "user-upload" | `page:${string}`): string => {
      if (tag === "user-upload") return "your reference";
      const id = tag.slice("page:".length);
      const page = bookContext?.pages.find((p) => p.id === id);
      if (!page) return "another page";
      return `page ${page.index} — ${page.name}`;
    },
    [bookContext],
  );

  const resolveReferenceDataUrls = useCallback(
    (
      tags: Array<"user-upload" | `page:${string}`>,
      userReferenceDataUrl: string | undefined,
    ): { urls: string[]; labels: string[] } => {
      const urls: string[] = [];
      const labels: string[] = [];
      for (const tag of tags) {
        if (tag === "user-upload") {
          if (userReferenceDataUrl) {
            urls.push(userReferenceDataUrl);
            labels.push(labelForReferenceTag(tag));
          }
          continue;
        }
        const id = tag.slice("page:".length);
        const url = getPageDataUrl?.(id);
        if (url) {
          urls.push(url);
          labels.push(labelForReferenceTag(tag));
        }
      }
      return { urls, labels };
    },
    [getPageDataUrl, labelForReferenceTag],
  );

  const send = useCallback(
    async (text: string, userReferenceDataUrl?: string) => {
      if (!current || busy) return;

      const userTurnId = `u-${Date.now()}`;
      const assistantTurnId = `a-${Date.now() + 1}`;
      setTurns((prev) => [
        ...prev,
        {
          kind: "user",
          id: userTurnId,
          text,
          referenceDataUrl: userReferenceDataUrl,
        },
        {
          kind: "assistant",
          id: assistantTurnId,
          reply: "",
          awaitingReply: true,
        },
      ]);
      setBusy(true);
      setError(null);

      const ctx =
        bookContext ?? {
          bookTitle: title ?? "Image",
          targetId: "single",
          targetLabel: title ?? "Image",
          targetSubject: subtitle,
          pages: [],
          coverStatus: "pending" as PageStatus,
          backCoverStatus: "pending" as PageStatus,
        };

      // Gather every image Sparky should be able to SEE this turn:
      // current source first (always), then cover/back-cover, then every
      // generated page. Each gets a label so Sparky can map pixels back to
      // page metadata when answering "what's on page 3?"-type questions.
      const attachedImages: Array<{ label: string; dataUrl: string }> = [];
      attachedImages.push({
        label: `CURRENT (${ctx.targetLabel}) — this is the image being edited`,
        dataUrl: current.dataUrl,
      });
      const coverUrl = getPageDataUrl?.("cover");
      if (coverUrl && ctx.targetId !== "cover") {
        attachedImages.push({ label: "Front cover", dataUrl: coverUrl });
      }
      const backUrl = getPageDataUrl?.("back-cover");
      if (backUrl && ctx.targetId !== "back-cover") {
        attachedImages.push({ label: "Back cover", dataUrl: backUrl });
      }
      for (const p of ctx.pages) {
        if (p.status !== "done" || p.id === ctx.targetId) continue;
        const url = getPageDataUrl?.(p.id);
        if (!url) continue;
        attachedImages.push({
          label: `page ${p.index} — ${p.name}`,
          dataUrl: url,
        });
      }
      if (userReferenceDataUrl) {
        attachedImages.push({
          label: "User-uploaded reference (style inspiration)",
          dataUrl: userReferenceDataUrl,
        });
      }

      try {
        const chatRes = await fetch("/api/refine-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context: {
              bookTitle: ctx.bookTitle,
              bookScene: ctx.bookScene,
              audience: ctx.audience,
              target: {
                kind: context,
                id: ctx.targetId,
                label: ctx.targetLabel,
                subject: ctx.targetSubject,
                aspectRatio,
              },
              pages: ctx.pages,
              coverStatus: ctx.coverStatus,
              backCoverStatus: ctx.backCoverStatus,
            },
            history,
            userMessage: text,
            hasUserReference: !!userReferenceDataUrl,
            attachedImages,
          }),
        });
        const chatJson = (await chatRes.json()) as {
          messages?: ModelMessage[];
          reply?: string;
          action?:
            | {
                kind: "refine";
                instruction: string;
                sourceFrom: "current" | `page:${string}`;
                extraReferences: Array<"user-upload" | `page:${string}`>;
              }
            | { kind: "text_only" };
          error?: string;
        };
        if (!chatRes.ok || !chatJson.reply || !chatJson.action) {
          throw new Error(chatJson.error || "Sparky did not reply.");
        }

        if (chatJson.messages) setHistory(chatJson.messages);

        if (chatJson.action.kind === "text_only") {
          setTurns((prev) =>
            prev.map((t) =>
              t.id === assistantTurnId && t.kind === "assistant"
                ? {
                    ...t,
                    awaitingReply: false,
                    generatingImage: false,
                    reply: chatJson.reply!,
                  }
                : t,
            ),
          );
          setBusy(false);
          return;
        }

        // Action = refine. First flip the bubble from "awaiting reply" →
        // "generating image" so the user sees Sparky's text reply IMMEDIATELY
        // and the image loader frame appears below it (no big modal-wide
        // spinner blocking everything).
        setTurns((prev) =>
          prev.map((t) =>
            t.id === assistantTurnId && t.kind === "assistant"
              ? {
                  ...t,
                  awaitingReply: false,
                  generatingImage: true,
                  reply: chatJson.reply!,
                }
              : t,
          ),
        );

        const action = chatJson.action;
        let sourceUrl: string | null = null;
        if (action.sourceFrom === "current") {
          sourceUrl = current.dataUrl;
        } else {
          const id = action.sourceFrom.slice("page:".length);
          sourceUrl = getPageDataUrl?.(id) ?? null;
        }
        if (!sourceUrl) {
          throw new Error(
            "Sparky asked for a page that isn't generated yet — try again or generate that page first.",
          );
        }

        const { urls: extraUrls, labels: refLabels } =
          resolveReferenceDataUrls(action.extraReferences, userReferenceDataUrl);

        const refineRes = await fetch("/api/refine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction: action.instruction,
            sourceDataUrl: sourceUrl,
            aspectRatio,
            context,
            extraReferenceDataUrls: extraUrls.length ? extraUrls : undefined,
          }),
        });
        const refineJson = (await refineRes.json()) as {
          dataUrl?: string;
          error?: string;
        };
        if (!refineRes.ok || !refineJson.dataUrl) {
          throw new Error(refineJson.error || "Refinement failed.");
        }

        const newDataUrl = refineJson.dataUrl;
        setVersions((prev) => [
          ...prev.slice(0, currentIndex + 1),
          { dataUrl: newDataUrl, instruction: action.instruction },
        ]);
        setCurrentIndex((i) => i + 1);
        setTurns((prev) =>
          prev.map((t) =>
            t.id === assistantTurnId && t.kind === "assistant"
              ? {
                  ...t,
                  awaitingReply: false,
                  generatingImage: false,
                  reply: chatJson.reply!,
                  imageDataUrl: newDataUrl,
                  referenceLabels: refLabels.length ? refLabels : undefined,
                }
              : t,
          ),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong.";
        setTurns((prev) =>
          prev.map((t) =>
            t.id === assistantTurnId && t.kind === "assistant"
              ? {
                  ...t,
                  awaitingReply: false,
                  generatingImage: false,
                  reply: `⚠️ ${msg}`,
                }
              : t,
          ),
        );
        setError(msg);
      } finally {
        setBusy(false);
      }
    },
    [
      current,
      busy,
      bookContext,
      title,
      subtitle,
      context,
      aspectRatio,
      history,
      currentIndex,
      getPageDataUrl,
      resolveReferenceDataUrls,
    ],
  );

  const branchFrom = useCallback(
    (dataUrl: string) => {
      const idx = versions.findIndex((v) => v.dataUrl === dataUrl);
      if (idx >= 0) setCurrentIndex(idx);
    },
    [versions],
  );

  const clearChat = useCallback(() => {
    setTurns([]);
    setHistory([]);
    setError(null);
    if (sourceDataUrl) {
      setVersions([{ dataUrl: sourceDataUrl }]);
      setCurrentIndex(0);
    }
  }, [sourceDataUrl]);

  const acceptVersion = useCallback(() => {
    if (current && onRefined) onRefined(current.dataUrl);
    onClose();
  }, [current, onRefined, onClose]);

  const suggestions = dynamicSuggestions ?? fallbackSuggestions(context);

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
            className="relative w-full max-w-6xl max-h-[92vh] rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl shadow-violet-500/20 overflow-hidden grid md:grid-cols-[minmax(0,1fr)_minmax(0,560px)]"
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
                      setCurrentIndex((i) =>
                        Math.min(versions.length - 1, i + 1),
                      )
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

            {/* Chat pane */}
            <div className="flex flex-col max-h-[92vh] bg-zinc-950">
              {/* Header */}
              <div className="px-5 py-3 border-b border-white/10">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-linear-to-r from-violet-500/15 to-cyan-500/15 border border-violet-500/30 text-[10px] font-semibold uppercase tracking-wider text-violet-300 mb-1.5">
                  {context === "cover"
                    ? "Cover"
                    : context === "back-cover"
                      ? "Back cover"
                      : context === "page"
                        ? "Page"
                        : "Image"}{" "}
                  · Refine chat
                </div>
                <h3 className="font-display text-base font-semibold text-white">
                  {title ?? "Refine with Sparky"}
                </h3>
                {subtitle && (
                  <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>
                )}
              </div>

              {/* Transcript */}
              <div
                ref={transcriptRef}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
              >
                {quality && currentIndex === 0 && turns.length === 0 && (
                  <QualityReason quality={quality} />
                )}
                {turns.length === 0 && (
                  <div className="text-center text-xs text-neutral-500 py-6">
                    <Sparkles className="w-5 h-5 mx-auto mb-2 text-violet-400" />
                    <p className="leading-relaxed">
                      Tell Sparky what to change.
                      <br />
                      Try{" "}
                      <span className="text-violet-300">
                        &quot;match the bear from page 3&quot;
                      </span>{" "}
                      or attach a reference image.
                    </p>
                  </div>
                )}
                {turns.map((t) =>
                  t.kind === "user" ? (
                    <UserBubble
                      key={t.id}
                      text={t.text}
                      referenceDataUrl={t.referenceDataUrl}
                    />
                  ) : (
                    <AssistantBubble
                      key={t.id}
                      reply={t.reply}
                      awaitingReply={t.awaitingReply}
                      generatingImage={t.generatingImage}
                      imageDataUrl={t.imageDataUrl}
                      referenceLabels={t.referenceLabels}
                      onBranch={
                        t.imageDataUrl
                          ? () => branchFrom(t.imageDataUrl!)
                          : undefined
                      }
                    />
                  ),
                )}
                {error && (
                  <div className="text-[11px] text-red-300 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}
              </div>

              <ChatComposer
                suggestions={suggestions}
                suggestionsLoading={suggestionsLoading}
                busy={busy}
                onSend={send}
              />

              {/* Footer actions */}
              <div className="px-4 py-2.5 border-t border-white/10 flex items-center gap-2 flex-wrap">
                {turns.length > 0 && (
                  <button
                    type="button"
                    onClick={clearChat}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-neutral-400 hover:text-white hover:bg-white/5 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear chat
                  </button>
                )}
                <div className="ml-auto flex items-center gap-2">
                  {onRefined && versions.length > 1 && (
                    <button
                      type="button"
                      onClick={acceptVersion}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50 shadow"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Use this version
                    </button>
                  )}
                  <a
                    href={current.dataUrl}
                    download={downloadName}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-black hover:bg-neutral-200"
                  >
                    <Download className="w-3 h-3" />
                    PNG
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
