"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const THINKING_MESSAGES = [
  "Sparky is thinking…",
  "Sparking up an idea…",
  "Drafting the next question…",
  "Reviewing your answer…",
  "Calling on Sparky's classic-fable memory…",
  "Tuning the brief for KDP…",
  "Lining up the best options…",
];

/**
 * Branded loading bubble shown while Sparky AI is generating its next chat
 * response. Combines the Sparky icon (from the brand sparkle), animated dots,
 * and a rotating status message that cycles every 2.5 seconds so users get
 * a sense the AI is actively working.
 */
export function SparkyThinkingBubble() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMessageIndex((i) => (i + 1) % THINKING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-500/15 to-cyan-500/10 border border-violet-500/30 backdrop-blur shadow-md shadow-violet-500/10 min-w-[230px]">
        <span
          className="relative inline-flex w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 items-center justify-center shrink-0"
          aria-hidden
        >
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="absolute inset-0 rounded-full ring-2 ring-violet-400/40 animate-ping opacity-60" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-violet-100 leading-tight transition-opacity">
            {THINKING_MESSAGES[messageIndex]}
          </p>
          <p
            className="text-[11px] text-violet-300/80 mt-0.5 inline-flex items-center gap-1"
            aria-hidden
          >
            <span
              className="inline-block w-1 h-1 rounded-full bg-violet-300 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="inline-block w-1 h-1 rounded-full bg-violet-300 animate-bounce"
              style={{ animationDelay: "120ms" }}
            />
            <span
              className="inline-block w-1 h-1 rounded-full bg-violet-300 animate-bounce"
              style={{ animationDelay: "240ms" }}
            />
          </p>
        </div>
      </div>
    </div>
  );
}
