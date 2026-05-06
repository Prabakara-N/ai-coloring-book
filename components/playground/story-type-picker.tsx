"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STORY_TYPES,
  type StoryType,
} from "@/lib/story-book-planner";

/**
 * One-line description shown next to each story-type label inside the
 * dropdown. Helps the user pick without reading docs.
 */
const STORY_TYPE_INFO: Record<StoryType, { emoji: string; description: string }> = {
  moral: {
    emoji: "📖",
    description: "Builds to a clear lesson — Aesop-style fable arc",
  },
  fairytale: {
    emoji: "🏰",
    description: "Once upon a time, magical wonder, happy ending",
  },
  fantasy: {
    emoji: "🦄",
    description: "Magical world or creature; gentle, kid-safe wonder",
  },
  adventure: {
    emoji: "🧭",
    description: "Journey with setup, setback, triumph",
  },
  bedtime: {
    emoji: "🌙",
    description: "Calm pacing that winds down to sleep",
  },
  fiction: {
    emoji: "✏️",
    description: "Original character-driven short story",
  },
  "non-fiction": {
    emoji: "🌍",
    description: "Real concept told as a narrative tour",
  },
  mystery: {
    emoji: "🔍",
    description: "Small puzzle resolved page by page",
  },
  comic: {
    emoji: "😂",
    description: "Humor and visual gags lead the way",
  },
};

interface StoryTypePickerProps {
  /** Currently selected story type. `null` = "No preference (use default)". */
  value: StoryType | null;
  onChange: (value: StoryType | null) => void;
  disabled?: boolean;
  id?: string;
}

/**
 * Compact dropdown popover for the story-type field. Trigger button shares
 * the same height/padding as the sibling text input so the form stays
 * visually balanced. The dropdown panel anchors below the trigger and
 * lists 9 story types plus a "No preference" row at the top — picking
 * "No preference" tells the planner to use the canonical plot (for known
 * fables) or the most natural shape (for original ideas).
 */
export function StoryTypePicker({
  value,
  onChange,
  disabled,
  id,
}: StoryTypePickerProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (
        wrapRef.current &&
        e.target instanceof Node &&
        !wrapRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const current = value ? STORY_TYPES.find((t) => t.value === value) : null;
  const currentEmoji = value ? STORY_TYPE_INFO[value].emoji : null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-colors",
          !disabled && "hover:border-cyan-500/40",
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          {currentEmoji && (
            <span className="text-base shrink-0" aria-hidden>
              {currentEmoji}
            </span>
          )}
          <span
            className={cn(
              "truncate",
              current ? "font-medium" : "text-neutral-500",
            )}
          >
            {current ? current.label : "No preference (use default)"}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute z-50 left-0 right-0 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950/98 shadow-2xl shadow-cyan-500/10 backdrop-blur-md p-1"
          >
            <li>
              <button
                type="button"
                role="option"
                aria-selected={value === null}
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                  value === null
                    ? "bg-cyan-500/15 text-white"
                    : "text-neutral-300 hover:bg-white/5",
                )}
              >
                <span className="w-7 shrink-0 flex items-center justify-center">
                  {value === null ? (
                    <Check
                      className="w-4 h-4 text-cyan-400"
                      strokeWidth={2.5}
                    />
                  ) : (
                    <span className="text-base text-neutral-500" aria-hidden>
                      ✨
                    </span>
                  )}
                </span>
                <span className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium">
                    No preference (use default)
                  </span>
                  <span className="text-[11px] text-neutral-500 truncate">
                    Canonical plot for known fables; natural shape for original
                    ideas
                  </span>
                </span>
              </button>
            </li>

            <li className="my-1 border-t border-white/10" aria-hidden />

            {STORY_TYPES.map((t) => {
              const info = STORY_TYPE_INFO[t.value];
              const selected = t.value === value;
              return (
                <li key={t.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(t.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                      selected
                        ? "bg-cyan-500/15 text-white"
                        : "text-neutral-300 hover:bg-white/5",
                    )}
                  >
                    <span className="w-7 shrink-0 flex items-center justify-center">
                      {selected ? (
                        <Check
                          className="w-4 h-4 text-cyan-400"
                          strokeWidth={2.5}
                        />
                      ) : (
                        <span className="text-base" aria-hidden>
                          {info.emoji}
                        </span>
                      )}
                    </span>
                    <span className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium">{t.label}</span>
                      <span className="text-[11px] text-neutral-500 truncate">
                        {info.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
