"use client";

import { useEffect, useState } from "react";
import { Check, Send } from "lucide-react";

interface MultiSelectChipsProps {
  options: string[];
  /** Optional per-option tooltip strings (index-aligned with `options`). */
  optionDescriptions?: string[];
  /** Called with comma-joined picks when the user submits. */
  onSubmit: (joined: string) => void;
  /** Resets internal state when the question changes. */
  questionKey: string;
}

/**
 * Multi-select chips for AI-generated questions where the user picks several
 * options (e.g. "which characters?"). Single-click toggles selection. The
 * submit button sends them as a comma-joined user message back to the chat.
 */
export function MultiSelectChips({
  options,
  optionDescriptions,
  onSubmit,
  questionKey,
}: MultiSelectChipsProps) {
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPicked(new Set());
  }, [questionKey]);

  function toggle(opt: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(opt)) next.delete(opt);
      else next.add(opt);
      return next;
    });
  }

  const orderedPicks = options.filter((o) => picked.has(o));
  const canSubmit = orderedPicks.length > 0;

  return (
    <div className="space-y-2 pt-1">
      <div className="flex flex-wrap gap-2">
        {options.map((opt, idx) => {
          const active = picked.has(opt);
          const desc = optionDescriptions?.[idx];
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              aria-pressed={active}
              title={desc}
              className={`group/chip relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                active
                  ? "bg-violet-500/30 border-violet-400 text-white shadow-md shadow-violet-500/30 scale-[1.03]"
                  : "bg-violet-500/10 border-violet-500/30 text-violet-200 hover:bg-violet-500/20"
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm border ${
                  active
                    ? "bg-violet-400 border-violet-300 text-white"
                    : "border-violet-400/50"
                }`}
                aria-hidden
              >
                {active && <Check className="w-3 h-3" strokeWidth={3} />}
              </span>
              {opt}
              {desc && (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-md bg-zinc-900 border border-white/15 text-[11px] font-normal text-neutral-100 leading-snug whitespace-normal w-max max-w-[18rem] opacity-0 invisible group-hover/chip:opacity-100 group-hover/chip:visible transition-opacity shadow-lg shadow-black/40 z-20"
                >
                  {desc}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-[11px] text-neutral-500">
          {orderedPicks.length === 0
            ? "Pick one or more"
            : `${orderedPicks.length} selected`}
        </p>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSubmit(orderedPicks.join(", "))}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-linear-to-r from-violet-500 to-cyan-400 text-white shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-3 h-3" />
          Send selections
        </button>
      </div>
    </div>
  );
}
