"use client";

import { useState, useRef, useEffect } from "react";
import {
  Loader2,
  ArrowLeft,
  MessageCircle,
  BookOpen,
  Sparkles,
} from "lucide-react";
import type { BookBrief } from "@/lib/book-chat";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";

type Mode = "qa" | "story";

interface Bubble {
  role: "user" | "assistant";
  text: string;
}

type View =
  | {
      kind: "question";
      question: string;
      options: string[];
      allow_freeform: boolean;
    }
  | { kind: "brief"; brief: BookBrief }
  | { kind: "message"; text: string };

interface ApiResponse {
  messages: unknown[];
  view: View;
}

const MODE_INTROS: Record<Mode, { greeting: string; placeholders: string[] }> =
  {
    qa: {
      greeting:
        "Hi! Tell me about the coloring book you'd like to make — what's the rough idea?",
      placeholders: [
        "Cute jungle animals for toddlers…",
        "Mandalas for adult mindfulness…",
        "Dinosaurs with names and habitats…",
        "Unicorns and rainbows for ages 4-7…",
        "Construction trucks and diggers…",
        "Sea creatures of the deep ocean…",
      ],
    },
    story: {
      greeting:
        "Let's turn a story into a coloring book. What's the story? It can be a classic fairy tale, a folk story, or your own original idea.",
      placeholders: [
        "The Tortoise and the Hare…",
        "Goldilocks and the Three Bears…",
        "A brave little firefly looking for friends…",
        "The Three Little Pigs…",
        "A pirate kitten searching for buried fish…",
        "Jack and the Beanstalk…",
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
  onBrief: (brief: BookBrief, mode: Mode) => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [messages, setMessages] = useState<unknown[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [bubbles, view, busy]);

  function pickMode(m: Mode) {
    setMode(m);
    setBubbles([{ role: "assistant", text: MODE_INTROS[m].greeting }]);
    setMessages([]);
    setView(null);
    setError(null);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy || !mode) return;
    setError(null);
    setBubbles((b) => [...b, { role: "user", text: trimmed }]);
    setView(null);
    draftRef.current = "";
    setBusy(true);
    try {
      const res = await fetch("/api/book-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
            text: `Done! ${v.brief.prompts.length}-page plan ready. Loading the form so you can review and tweak…`,
          },
        ]);
        setTimeout(() => onBrief(v.brief, mode), 700);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (!mode) {
    return (
      <div className="p-6 md:p-8 space-y-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-violet-500/15 to-cyan-500/15 border border-violet-500/30 text-[11px] font-medium text-violet-300 mb-2">
            <Sparkles className="w-3 h-3" />
            Guided creation
          </div>
          <h3 className="font-display text-xl md:text-2xl font-bold text-white">
            How would you like to create your book?
          </h3>
          <p className="text-sm text-neutral-400 mt-1">
            I&apos;ll ask a few questions and generate a complete plan you can
            review before saving.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <button
            onClick={() => pickMode("qa")}
            className="group text-left p-5 rounded-2xl border border-white/10 bg-black/40 hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center mb-3">
              <MessageCircle className="w-5 h-5 text-violet-300" />
            </div>
            <div className="font-semibold text-white text-base mb-1">
              Theme book (Q&amp;A)
            </div>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Each page is a single subject in a shared theme — like 20 jungle
              animals or 30 unicorns. Best for browsing-friendly KDP books.
            </p>
          </button>

          <button
            onClick={() => pickMode("story")}
            className="group text-left p-5 rounded-2xl border border-white/10 bg-black/40 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mb-3">
              <BookOpen className="w-5 h-5 text-cyan-300" />
            </div>
            <div className="font-semibold text-white text-base mb-1">
              Story book
            </div>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Tell me a story — fairy tale or original. Each page becomes a
              scene in narrative order with the same characters throughout.
            </p>
          </button>
        </div>

      </div>
    );
  }

  const inputDisabled =
    busy || (view?.kind === "question" && !view.allow_freeform);

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
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 md:px-8 py-2 space-y-3"
      >
        {bubbles.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-violet-500/20 border border-violet-500/30 text-violet-50 rounded-br-md"
                  : "bg-white/5 border border-white/10 text-neutral-100 rounded-bl-md"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10">
              <Loader2 className="w-4 h-4 animate-spin text-violet-300" />
            </div>
          </div>
        )}

        {view?.kind === "question" && view.options.length > 0 && !busy && (
          <div className="flex flex-wrap gap-2 pt-1">
            {view.options.map((opt) => (
              <button
                key={opt}
                onClick={() => send(opt)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-violet-500/10 border border-violet-500/30 text-violet-200 hover:bg-violet-500/20"
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="text-sm text-red-300 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-3 md:p-4">
        <PlaceholdersAndVanishInput
          key={`${mode}-${bubbles.length}-${view?.kind === "question" && !view.allow_freeform ? "locked" : "open"}`}
          placeholders={
            view?.kind === "question" && !view.allow_freeform
              ? ["Pick an option above…"]
              : bubbles.length <= 1
                ? MODE_INTROS[mode].placeholders
                : TYPE_ANSWER_PLACEHOLDERS
          }
          disabled={inputDisabled}
          onChange={(e) => {
            draftRef.current = e.target.value;
          }}
          onSubmit={() => {
            const text = draftRef.current.trim();
            if (text) send(text);
          }}
        />
      </div>
    </div>
  );
}
