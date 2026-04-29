"use client";

import { useImperativeHandle, useLayoutEffect, useRef, useState, forwardRef } from "react";
import { Paperclip, Send, Square, X, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Autosize bounds — textarea grows from MIN_ROWS lines (resting) up to
// MAX_ROWS visible lines, then scrolls. Tuned to match the shadcn-expansions
// autosize-textarea ergonomics so short prompts feel compact and longer
// prompts have room to breathe before scrolling kicks in.
const MIN_ROWS = 1;
const MAX_ROWS = 6;
const LINE_HEIGHT_PX = 22; // matches text-[15px] leading-relaxed
const VERTICAL_PADDING_PX = 20; // px-3.5 py-2.5 → 10px top + 10px bottom

interface ChatComposerProps {
  /** Quick-suggestion chips shown above the textarea. Click → sends. */
  suggestions: string[];
  /** Whether suggestions are still being fetched. */
  suggestionsLoading?: boolean;
  /** Disable input while a turn is in flight. */
  busy: boolean;
  /** Called when the user submits a turn. */
  onSend: (text: string, referenceDataUrl?: string) => void;
  /** Called when the user clicks the Stop button (only visible while busy). */
  onStop?: () => void;
}

export interface ChatComposerHandle {
  /** Repopulate the textarea (used by the Edit-message flow). */
  setText: (text: string) => void;
  focus: () => void;
}

const MAX_REF_BYTES = 4 * 1024 * 1024;

export const ChatComposer = forwardRef<ChatComposerHandle, ChatComposerProps>(
  function ChatComposer(
    { suggestions, suggestionsLoading = false, busy, onSend, onStop },
    ref,
  ) {
  const [text, setText] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [refError, setRefError] = useState<string | null>(null);
  // Suggestions drawer is OPEN by default — clicking the header collapses it
  // down out of view; clicking again slides it back up.
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Imperative handle so the parent can push text into the composer
  // (e.g. when the user clicks Edit on a sent message).
  useImperativeHandle(ref, () => ({
    setText: (next: string) => {
      setText(next);
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
    focus: () => textareaRef.current?.focus(),
  }), []);

  // Autosize: reset to MIN, then grow to fit content up to MAX. Reset before
  // measuring so the textarea can SHRINK as content is deleted, not just grow.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const minH = MIN_ROWS * LINE_HEIGHT_PX + VERTICAL_PADDING_PX;
    const maxH = MAX_ROWS * LINE_HEIGHT_PX + VERTICAL_PADDING_PX;
    el.style.height = `${minH}px`;
    const next = Math.min(Math.max(el.scrollHeight, minH), maxH);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxH ? "auto" : "hidden";
  }, [text]);

  function pickFile() {
    fileRef.current?.click();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setRefError("Reference must be an image.");
      return;
    }
    if (file.size > MAX_REF_BYTES) {
      setRefError("Reference image is too large (max 4MB).");
      return;
    }
    setRefError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") setReference(result);
    };
    reader.readAsDataURL(file);
  }

  function send(initialText?: string) {
    const value = (initialText ?? text).trim();
    if (!value || busy) return;
    onSend(value, reference ?? undefined);
    setText("");
    setReference(null);
    setRefError(null);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const hasSuggestions = suggestions.length > 0 || suggestionsLoading;

  return (
    <div className="border-t border-white/10 bg-zinc-950/80 backdrop-blur-md p-3 space-y-2">
      {hasSuggestions && (
        <div>
          <button
            type="button"
            onClick={() => setSuggestionsOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-2 py-1 rounded-md text-[11px] font-semibold text-violet-300 hover:bg-violet-500/5 transition-colors"
            aria-expanded={suggestionsOpen}
          >
            <span className="inline-flex items-center gap-1.5">
              <Lightbulb className="w-3 h-3" />
              Quick suggestions
            </span>
            {suggestionsOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronUp className="w-3 h-3" />
            )}
          </button>
          <AnimatePresence initial={false}>
            {suggestionsOpen && (
              <motion.div
                key="drawer"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-1.5 pt-2 pb-1">
                  {suggestionsLoading
                    ? [110, 90, 130, 100].map((w, i) => (
                      <div
                        key={i}
                        className="h-6 rounded-full bg-white/5 border border-white/10 animate-pulse"
                        style={{ width: w }}
                      />
                    ))
                    : suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={busy}
                        onClick={() => send(s)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300 hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-white disabled:opacity-50 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {reference && (
        <div className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={reference}
            alt="Pending reference"
            className="w-8 h-8 rounded object-cover"
          />
          <span className="text-[11px] text-neutral-300">
            Reference attached
          </span>
          <button
            type="button"
            onClick={() => setReference(null)}
            className="p-0.5 rounded hover:bg-white/10 text-neutral-400"
            aria-label="Remove reference"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      {refError && (
        <p className="text-[11px] text-red-300">{refError}</p>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={pickFile}
          disabled={busy}
          className="p-2 rounded-lg bg-white/5 border border-white/10 text-neutral-300 hover:bg-violet-500/10 hover:text-white hover:border-violet-500/40 disabled:opacity-50 transition-colors"
          aria-label="Attach reference image"
          title="Attach reference image"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Tell Sparky what to change…"
          rows={MIN_ROWS}
          disabled={busy}
          className="flex-1 px-3.5 py-2.5 rounded-lg bg-black/50 border border-white/10 text-white text-[15px] leading-relaxed placeholder:text-neutral-500 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 resize-none"
        />
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            disabled={!onStop}
            className="p-2.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 hover:bg-red-500/30 hover:text-white shadow disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Stop generating"
            title="Stop"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => send()}
            disabled={!text.trim()}
            className="p-2.5 rounded-lg bg-linear-to-br from-violet-500 to-cyan-400 text-white shadow-lg shadow-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
});
