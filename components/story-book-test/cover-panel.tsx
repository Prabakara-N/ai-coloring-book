"use client";

import { cn } from "@/lib/utils";
import type { SceneStatus } from "./scene-card";

export interface CoverPanelState {
  status: SceneStatus;
  dataUrl?: string;
  errorMessage?: string;
  elapsedMs?: number;
}

interface CoverPanelProps {
  /** Heading shown at the top of the panel (e.g. "Front cover", "Back cover"). */
  label: string;
  /** Description of what the panel will render. */
  description: string;
  /** Optional tagline shown under the description (used by back covers). */
  tagline?: string;
  /** Hint shown under the action button. */
  hint?: string;
  state: CoverPanelState;
  running: boolean;
  /** When true, the action button is disabled with this reason on hover. */
  disabledReason?: string;
  onGenerate: () => void;
  onRegenerate: () => void;
}

export function CoverPanel({
  label,
  description,
  tagline,
  hint,
  state,
  running,
  disabledReason,
  onGenerate,
  onRegenerate,
}: CoverPanelProps) {
  const busy = state.status === "generating";
  const done = state.status === "done";
  return (
    <section className="rounded-2xl bg-zinc-900/60 border border-white/10 p-4 flex flex-col md:flex-row gap-4">
      <div
        className="relative bg-zinc-800 rounded-xl overflow-hidden shrink-0 self-start"
        style={{ width: 200, aspectRatio: "2 / 3" }}
      >
        {state.dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={state.dataUrl}
            alt="Front cover"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-500 text-xs px-2 text-center">
            {busy ? "Rendering cover…" : "Cover not generated yet"}
          </div>
        )}
      </div>
      <div className="grow min-w-0 flex flex-col gap-2">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h2 className="text-base font-bold text-white">{label}</h2>
          <span
            className={cn(
              "text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md",
              done
                ? "bg-emerald-500/20 text-emerald-200"
                : busy
                  ? "bg-violet-500/30 text-violet-100 animate-pulse"
                  : state.status === "error"
                    ? "bg-rose-500/20 text-rose-200"
                    : "bg-zinc-700/50 text-neutral-300",
            )}
          >
            {done
              ? `Done${state.elapsedMs ? ` · ${(state.elapsedMs / 1000).toFixed(1)}s` : ""}`
              : busy
                ? "Generating…"
                : state.status === "error"
                  ? "Failed"
                  : "Pending"}
          </span>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          {description}
        </p>
        {tagline && (
          <p className="text-[11px] text-amber-200 leading-snug italic">
            “{tagline}”
          </p>
        )}
        {state.errorMessage && (
          <p className="text-[11px] text-rose-300 leading-snug">
            {state.errorMessage}
          </p>
        )}
        <div className="mt-auto pt-2">
          <button
            type="button"
            onClick={done ? onRegenerate : onGenerate}
            disabled={running || !!disabledReason}
            title={disabledReason ?? undefined}
            className={cn(
              "text-xs font-semibold px-3 py-2 rounded-lg transition-colors",
              running || !!disabledReason
                ? "bg-white/5 text-neutral-500 cursor-not-allowed"
                : done
                  ? "bg-white/5 text-neutral-200 hover:bg-white/10"
                  : "bg-linear-to-r from-violet-500 to-cyan-400 text-white hover:opacity-90",
            )}
          >
            {done ? `Regenerate ${label.toLowerCase()}` : `Generate ${label.toLowerCase()}`}
          </button>
          {(disabledReason || hint) && (
            <p className="text-[10px] text-neutral-500 mt-2 leading-snug">
              {disabledReason ?? hint}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
