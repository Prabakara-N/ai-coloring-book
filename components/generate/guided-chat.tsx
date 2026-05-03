"use client";

import { useState, useRef, useEffect } from "react";
import {
  Loader2,
  ArrowLeft,
  MessageCircle,
  BookOpen,
  Sparkles,
  ImagePlus,
  X,
  Eraser,
  Square,
} from "lucide-react";
import type { BookBrief } from "@/lib/book-chat";
import {
  PlaceholdersAndVanishInput,
  type PlaceholdersAndVanishInputHandle,
} from "@/components/ui/placeholders-and-vanish-input";
import { UserBubble } from "@/components/generate/chat-bubble";
import { ImagePreviewDialog } from "@/components/ui/image-preview-dialog";
import { MultiSelectChips } from "@/components/generate/multi-select-chips";
import { SparkyThinkingBubble } from "@/components/generate/sparky-thinking-bubble";
import { useDialog } from "@/components/ui/confirm-dialog";

const MAX_REFERENCE_BYTES = 6 * 1024 * 1024; // 6MB
const ACCEPTED_REFERENCE_TYPES = ["image/png", "image/jpeg", "image/webp"];

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

type Mode = "qa" | "story";

/**
 * Render a Sparky reply with sensible structure: blank line between paragraphs,
 * leading "- " or "• " lines turned into a real bulleted list, and inline
 * commas with a trailing question kept as a single paragraph. Avoids the
 * wall-of-text feeling when the model lists 4+ ideas in one sentence.
 */
function FormattedAssistantText({ text }: { text: string }) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const lines = trimmed.split(/\r?\n/);
  type Block = { kind: "para"; text: string } | { kind: "list"; items: string[] };
  const blocks: Block[] = [];
  let buffer: string[] = [];
  const flushPara = () => {
    if (buffer.length === 0) return;
    blocks.push({ kind: "para", text: buffer.join(" ").trim() });
    buffer = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      continue;
    }
    const bulletMatch = line.match(/^[-•*]\s+(.+)$/);
    if (bulletMatch) {
      flushPara();
      const last = blocks[blocks.length - 1];
      if (last && last.kind === "list") {
        last.items.push(bulletMatch[1]);
      } else {
        blocks.push({ kind: "list", items: [bulletMatch[1]] });
      }
      continue;
    }
    buffer.push(line);
  }
  flushPara();
  return (
    <div className="space-y-2">
      {blocks.map((b, i) =>
        b.kind === "para" ? (
          <p key={i} className="whitespace-pre-wrap break-words">
            {b.text}
          </p>
        ) : (
          <ul key={i} className="list-disc pl-5 space-y-1 marker:text-violet-300">
            {b.items.map((it, j) => (
              <li key={j} className="break-words">
                {it}
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

interface Bubble {
  role: "user" | "assistant";
  text: string;
}

type View =
  | {
      kind: "question";
      question: string;
      options: string[];
      option_descriptions?: string[];
      allow_freeform: boolean;
      allow_multi: boolean;
    }
  | { kind: "brief"; brief: BookBrief }
  | { kind: "message"; text: string };

interface ApiResponse {
  messages: unknown[];
  view: View;
}

interface ModeIntro {
  greeting: string;
  placeholders: string[];
  /**
   * Quick-start prompts shown as clickable chips below the greeting bubble
   * before the user has typed anything. Disappear once any user message is
   * sent. Each chip's text is sent verbatim as the user's first message —
   * keep them natural ("Tell me a classic fable") rather than form-filling
   * ("Toddlers ages 3-6").
   */
  quickStarts: string[];
}

const MODE_INTROS: Record<Mode, ModeIntro> = {
  qa: {
    greeting:
      "Hi, I'm Sparky AI ✨ Tell me about the coloring book you'd like to make — or just say hi.",
    placeholders: [
      "Cute jungle animals for toddlers…",
      "Detailed mandala animals for tweens…",
      "Dinosaurs with names and habitats…",
      "Unicorns and rainbows for ages 4-7…",
      "Construction trucks and diggers…",
      "Sea creatures of the deep ocean…",
    ],
    quickStarts: [
      "Suggest a theme that sells on KDP",
      "What are bestselling coloring book niches right now?",
      "Help me plan a unicorn coloring book for ages 4-7",
    ],
  },
  story: {
    greeting:
      "Hi, I'm Sparky AI ✨ I turn stories into coloring books — classic fables (Aesop, Panchatantra, Grimm) or your own ideas. Say hi or tell me a story.",
    placeholders: [
      "The Tortoise and the Hare…",
      "Goldilocks and the Three Bears…",
      "A brave little firefly looking for friends…",
      "The Three Little Pigs…",
      "A pirate kitten searching for buried fish…",
      "Jack and the Beanstalk…",
    ],
    quickStarts: [
      "Give me a classic fable I can turn into a book",
      "Show me popular school-textbook stories",
      "Help me build an original kids' story",
    ],
  },
};

const TYPE_ANSWER_PLACEHOLDERS = [
  "Type your answer…",
  "Tell me more…",
  "Add details…",
];

export function GuidedChat({
  onBrief,
  onBack,
}: {
  onBrief: (
    brief: BookBrief,
    mode: Mode,
    referenceDataUrl?: string | null,
  ) => void;
  onBack: () => void;
}) {
  const [reference, setReference] = useState<string | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [referencePreviewOpen, setReferencePreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialog = useDialog();

  async function handleReferenceUpload(file: File) {
    setReferenceError(null);
    if (!ACCEPTED_REFERENCE_TYPES.includes(file.type)) {
      setReferenceError("PNG, JPG, or WebP only.");
      return;
    }
    if (file.size > MAX_REFERENCE_BYTES) {
      setReferenceError("Image too large (max 6 MB).");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setReference(dataUrl);
    } catch {
      setReferenceError("Could not read the image.");
    }
  }
  const [mode, setMode] = useState<Mode | null>(null);
  const [messages, setMessages] = useState<unknown[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [view, setView] = useState<View | null>(null);
  const [pendingBrief, setPendingBrief] = useState<BookBrief | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputHandleRef = useRef<PlaceholdersAndVanishInputHandle | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [bubbles, view, busy, pendingBrief]);

  function pickMode(m: Mode) {
    setMode(m);
    setBubbles([{ role: "assistant", text: MODE_INTROS[m].greeting }]);
    setMessages([]);
    setView(null);
    setPendingBrief(null);
    setError(null);
  }

  function stopInFlight() {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
  }

  function editLastUserMessage(text: string) {
    inputHandleRef.current?.setText(text);
  }

  async function clearChat() {
    if (!mode || busy) return;
    if (bubbles.length <= 1) return; // already at greeting
    const ok = await dialog.confirm({
      title: "Clear chat?",
      message: "This will start a fresh conversation with Sparky. Your in-progress answers will be lost.",
      confirmText: "Clear chat",
      cancelText: "Keep chatting",
      variant: "danger",
    });
    if (!ok) return;
    setBubbles([{ role: "assistant", text: MODE_INTROS[mode].greeting }]);
    setMessages([]);
    setView(null);
    setPendingBrief(null);
    setError(null);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy || !mode) return;
    setError(null);
    setBubbles((b) => [...b, { role: "user", text: trimmed }]);
    setView(null);
    setBusy(true);
    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/book-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages,
          userMessage: trimmed,
          mode,
        }),
      });
      const data = (await res.json()) as ApiResponse | { error: string };
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Chat failed.");
      }
      setMessages(data.messages);
      const v = data.view;
      if (v.kind === "question") {
        setBubbles((b) => [...b, { role: "assistant", text: v.question }]);
        setView(v);
      } else if (v.kind === "message") {
        setBubbles((b) => [
          ...b,
          { role: "assistant", text: v.text || "(no response)" },
        ]);
      } else {
        setBubbles((b) => [
          ...b,
          {
            role: "assistant",
            text: `Here's your ${v.brief.prompts.length}-page plan. Take a look — confirm to save it, or tell me what to tweak.`,
          },
        ]);
        setPendingBrief(v.brief);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      // Interrupted requests (user cancel, server timeout, network drop)
      // shouldn't show the scary raw "signal is aborted" message — surface
      // it as a calm assistant bubble and skip the red banner.
      const isInterrupted =
        (e instanceof Error && e.name === "AbortError") ||
        /aborted|signal/i.test(message);
      if (isInterrupted) {
        setBubbles((b) => [
          ...b,
          {
            role: "assistant",
            text: "Hmm, that got interrupted. Want to try again?",
          },
        ]);
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  function confirmBrief() {
    if (!pendingBrief || !mode) return;
    onBrief(pendingBrief, mode, reference);
  }

  function tweakBrief(feedback: string) {
    setPendingBrief(null);
    void send(`Please revise the plan: ${feedback}`);
  }

  if (!mode) {
    return (
      <div className="p-6 md:p-8 space-y-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-linear-to-r from-violet-500/15 to-cyan-500/15 border border-violet-500/30 text-[11px] font-medium text-violet-300 mb-2">
            <Sparkles className="w-3 h-3" />
            Sparky AI · pick a mode
          </div>
          <h3 className="font-display text-xl md:text-2xl font-bold text-white">
            How would you like to create your book?
          </h3>
          <p className="text-sm text-neutral-400 mt-1">
            I&apos;ll ask a few questions and generate a complete plan you can
            review before saving. Pick the mode that fits what you&apos;re
            making — they produce <em>different</em> kinds of books.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <button
            onClick={() => pickMode("qa")}
            className="group text-left p-5 rounded-2xl border border-white/10 bg-black/40 hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-violet-300" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/30">
                No story · single subjects
              </span>
            </div>
            <div className="font-semibold text-white text-base mb-1">
              Q&amp;A mode — Theme book
            </div>
            <p className="text-sm text-neutral-400 leading-relaxed mb-3">
              <strong className="text-neutral-200">When to use:</strong> you have
              a <em>theme</em> in mind (jungle animals, unicorns, dinosaurs,
              vehicles) but NO story. Sparky asks 3-5 questions about audience,
              style, and which characters → builds a coloring book where each
              page shows ONE subject from that theme.
            </p>
            <ul className="text-[12px] text-neutral-500 space-y-1 leading-relaxed">
              <li>📋 Each page = one stand-alone subject</li>
              <li>🎯 No narrative — pages are independent</li>
              <li>📚 Like the 14 hardcoded themes (Farm Animals, Vehicles…)</li>
              <li>💼 Best for browsing-friendly KDP books that sell on theme</li>
            </ul>
          </button>

          <button
            onClick={() => pickMode("story")}
            className="group text-left p-5 rounded-2xl border border-white/10 bg-black/40 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-colors"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-cyan-300" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30">
                Has plot · scenes in order
              </span>
            </div>
            <div className="font-semibold text-white text-base mb-1">
              Story mode — Narrative book
            </div>
            <p className="text-sm text-neutral-400 leading-relaxed mb-3">
              <strong className="text-neutral-200">When to use:</strong> you have
              a <em>story</em> — classic fable (Tortoise &amp; Hare, Union is
              Strength, Lion &amp; Mouse) or your own original. Sparky knows
              hundreds of fables by name. Each page becomes a SCENE in
              narrative order with the same characters throughout.
            </p>
            <ul className="text-[12px] text-neutral-500 space-y-1 leading-relaxed">
              <li>🎬 Each page = a scene from the story</li>
              <li>👥 Characters stay consistent across all pages</li>
              <li>📖 Reads like a picture book — beginning → middle → end</li>
              <li>🌟 Best for fables, folktales, original kids&apos; stories</li>
            </ul>
          </button>
        </div>

      </div>
    );
  }

  // Free-form typing is ALWAYS allowed when not busy — option chips are a
  // convenience for quick replies, not a hard gate. Locking the textarea
  // forced users to pick from AI suggestions even when none of them fit.
  const inputDisabled = busy;

  return (
    <div className="flex flex-col h-[60vh] min-h-[420px]">
      <div className="px-6 md:px-8 pt-3 pb-3 flex items-center gap-2">
        <button
          onClick={() => {
            setMode(null);
            setBubbles([]);
            setMessages([]);
            setView(null);
            setError(null);
          }}
          className="p-1.5 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white"
          title="Switch chat mode"
          aria-label="Switch chat mode"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
            mode === "story"
              ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-200"
              : "bg-violet-500/15 border-violet-500/30 text-violet-200"
          }`}
        >
          {mode === "story" ? (
            <BookOpen className="w-3 h-3" />
          ) : (
            <MessageCircle className="w-3 h-3" />
          )}
          {mode === "story" ? "Story mode" : "Q&A mode"}
        </span>
        <button
          onClick={clearChat}
          disabled={busy || bubbles.length <= 1}
          className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-neutral-400 hover:bg-white/5 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Clear chat and start over"
          aria-label="Clear chat"
        >
          <Eraser className="w-3.5 h-3.5" />
          Clear chat
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 md:px-8 py-2 space-y-3"
      >
        {bubbles.map((m, i) => {
          if (m.role === "user") {
            // Last user bubble gets the Edit button so users can re-send a
            // tweaked version. Earlier user bubbles only get Copy.
            const isLastUser =
              i ===
              bubbles
                .map((b, idx) => ({ b, idx }))
                .filter((x) => x.b.role === "user")
                .at(-1)?.idx;
            return (
              <UserBubble
                key={i}
                text={m.text}
                onEdit={isLastUser && !busy ? editLastUserMessage : undefined}
              />
            );
          }
          return (
            <div key={i} className="flex justify-start">
              <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-bl-md text-sm leading-relaxed bg-white/5 border border-white/10 text-neutral-100">
                <FormattedAssistantText text={m.text} />
              </div>
            </div>
          );
        })}

        {/* Quick-start chips: show when only the greeting bubble exists */}
        {bubbles.length === 1 && !busy && !view && !pendingBrief && mode && (
          <div className="flex flex-col items-start gap-1.5 pt-1">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold ml-1">
              Try one of these
            </span>
            <div className="flex flex-wrap gap-1.5">
              {MODE_INTROS[mode].quickStarts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="text-left text-xs leading-snug px-3 py-1.5 rounded-2xl border border-white/10 bg-white/[0.03] text-neutral-200 hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-white transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {busy && <SparkyThinkingBubble />}

        {view?.kind === "question" && view.options.length > 0 && !busy && (
          view.allow_multi ? (
            <MultiSelectChips
              options={view.options}
              optionDescriptions={view.option_descriptions}
              questionKey={view.question}
              onSubmit={(joined) => send(joined)}
            />
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {view.options.map((opt, idx) => {
                const desc = view.option_descriptions?.[idx];
                return (
                  <button
                    key={opt}
                    onClick={() => send(opt)}
                    title={desc}
                    className="group/chip relative px-3 py-1.5 rounded-full text-xs font-medium bg-violet-500/10 border border-violet-500/30 text-violet-200 hover:bg-violet-500/20"
                  >
                    {opt}
                    {desc && (
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute bottom-full left-0 mb-1.5 px-2.5 py-1.5 rounded-md bg-zinc-900 border border-white/15 text-[11px] font-normal text-neutral-100 leading-snug whitespace-normal w-max max-w-[18rem] opacity-0 invisible group-hover/chip:opacity-100 group-hover/chip:visible transition-opacity shadow-lg shadow-black/40 z-20"
                      >
                        {desc}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )
        )}

        {pendingBrief && !busy && (
          <BriefPreview
            brief={pendingBrief}
            onConfirm={confirmBrief}
            onTweak={tweakBrief}
          />
        )}

        {error && (
          <div className="text-sm text-red-300 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-3 md:p-4 space-y-2">
        {/* Reference image attachment row */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border border-white/10 bg-black/40 text-neutral-300 hover:bg-white/5 hover:text-white transition-colors"
              title="Attach a reference image — Sparky will use its style"
            >
              <ImagePlus className="w-3 h-3" />
              {reference ? "Change reference" : "Attach reference"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_REFERENCE_TYPES.join(",")}
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleReferenceUpload(file);
                e.target.value = "";
              }}
            />
            {reference && (
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setReferencePreviewOpen(true)}
                  title="Click to view full size"
                  className="shrink-0 group relative"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={reference}
                    alt="Reference attached — click to expand"
                    className="w-7 h-7 rounded object-cover ring-1 ring-violet-500/40 group-hover:ring-2 group-hover:ring-violet-400 transition-all"
                  />
                  <span className="absolute inset-0 rounded bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[8px] font-bold text-white">
                    VIEW
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setReferencePreviewOpen(true)}
                  className="text-[11px] text-violet-300 font-medium truncate hover:text-violet-200 hover:underline"
                >
                  Reference attached
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReference(null);
                    setReferenceError(null);
                  }}
                  className="p-0.5 rounded hover:bg-white/10 text-neutral-400 hover:text-red-300"
                  title="Remove reference"
                  aria-label="Remove reference"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          {referenceError && (
            <span className="text-[10px] text-red-300">{referenceError}</span>
          )}
        </div>

        <PlaceholdersAndVanishInput
          ref={inputHandleRef}
          key={`${mode}-${pendingBrief ? "preview" : "open"}`}
          placeholders={
            pendingBrief
              ? ["Use the buttons above to confirm or tweak…"]
              : view?.kind === "question" && view.options?.length
                ? ["Pick an option above or type your own answer…"]
                : bubbles.length <= 1
                  ? MODE_INTROS[mode].placeholders
                  : TYPE_ANSWER_PLACEHOLDERS
          }
          disabled={inputDisabled || !!pendingBrief}
          loading={busy}
          onStop={stopInFlight}
          onSubmit={() => {
            // Read from the input handle directly — single source of truth.
            // (Tried mirroring into a ref via onChange first, but Edit-fill
            // didn't reliably trigger the parent's onChange.)
            const text = (inputHandleRef.current?.getValue() ?? "").trim();
            if (text) send(text);
          }}
        />
      </div>

      {reference && (
        <ImagePreviewDialog
          open={referencePreviewOpen}
          onClose={() => setReferencePreviewOpen(false)}
          src={reference}
          alt="Chat reference image"
          caption="Sparky will use this as visual style reference for your book"
        />
      )}
    </div>
  );
}

function BriefPreview({
  brief,
  onConfirm,
  onTweak,
}: {
  brief: BookBrief;
  onConfirm: () => void;
  onTweak: (feedback: string) => void;
}) {
  const [tweakOpen, setTweakOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  return (
    <div className="mt-2 rounded-2xl border border-violet-500/40 bg-linear-to-br from-violet-500/10 to-cyan-500/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="text-3xl shrink-0">{brief.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-violet-300">
            Plan ready · {brief.prompts.length} pages
          </div>
          <div className="text-base font-bold text-white truncate mt-0.5">
            {brief.name}
          </div>
        </div>
      </div>

      <details className="group">
        <summary className="cursor-pointer text-xs text-violet-200 hover:text-white font-semibold list-none flex items-center gap-1 select-none">
          <span className="group-open:rotate-90 transition-transform inline-block">
            ▶
          </span>
          Show all {brief.prompts.length} prompts
        </summary>
        <div className="mt-3 max-h-48 overflow-y-auto rounded-lg bg-black/30 border border-white/10 p-3 space-y-1.5 text-xs">
          {brief.prompts.map((p, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-violet-400 font-mono shrink-0 w-6">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-neutral-300">
                <span className="font-semibold text-white">{p.name}:</span>{" "}
                {p.subject}
              </span>
            </div>
          ))}
        </div>
      </details>

      {tweakOpen ? (
        <div className="space-y-2">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={2}
            placeholder="What should I change? e.g. 'make it shorter, 10 pages instead of 20' or 'use a different protagonist name'"
            className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/60 resize-y"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => setTweakOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (feedback.trim()) onTweak(feedback.trim());
              }}
              disabled={!feedback.trim()}
              className="ml-auto px-4 py-1.5 rounded-lg text-xs font-semibold bg-violet-500 text-white hover:bg-violet-400 disabled:opacity-50"
            >
              Send revision
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-linear-to-r from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/30 hover:shadow-xl"
          >
            ✓ Looks good — save it
          </button>
          <button
            onClick={() => setTweakOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-violet-100 bg-white/5 border border-white/15 hover:bg-white/10"
          >
            ✏️ Tweak this
          </button>
        </div>
      )}
    </div>
  );
}
