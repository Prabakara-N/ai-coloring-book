"use client";

import type { StoryDialogueLine } from "@/lib/prompts";
import { cn } from "@/lib/utils";

export type SceneStatus =
  | "pending"
  | "queued"
  | "generating"
  | "done"
  | "error";

interface SceneCardProps {
  index: number;
  name: string;
  scene: string;
  dialogue?: StoryDialogueLine[];
  narration?: string;
  status: SceneStatus;
  dataUrl?: string;
  errorMessage?: string;
  elapsedMs?: number;
  onRegenerate: () => void;
}

const STATUS_LABEL: Record<SceneStatus, string> = {
  pending: "Pending",
  queued: "Queued",
  generating: "Generating…",
  done: "Done",
  error: "Failed",
};

const STATUS_PILL: Record<SceneStatus, string> = {
  pending: "bg-zinc-700/50 text-neutral-300",
  queued: "bg-cyan-500/20 text-cyan-200",
  generating: "bg-violet-500/30 text-violet-100 animate-pulse",
  done: "bg-emerald-500/20 text-emerald-200",
  error: "bg-rose-500/20 text-rose-200",
};

export function SceneCard({
  index,
  name,
  scene,
  dialogue,
  narration,
  status,
  dataUrl,
  errorMessage,
  elapsedMs,
  onRegenerate,
}: SceneCardProps) {
  const busy = status === "generating" || status === "queued";

  return (
    <article className="rounded-2xl bg-zinc-900/60 border border-white/10 overflow-hidden flex flex-col">
      <div
        className="relative bg-zinc-800"
        style={{ aspectRatio: "2 / 3" }}
      >
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={`Scene ${index + 1}: ${name}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-500 text-sm">
            {status === "generating" ? "Rendering page…" : "Not generated yet"}
          </div>
        )}
        <div
          className={cn(
            "absolute top-2 left-2 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md",
            STATUS_PILL[status],
          )}
        >
          {STATUS_LABEL[status]}
          {typeof elapsedMs === "number" && status === "done"
            ? ` · ${(elapsedMs / 1000).toFixed(1)}s`
            : ""}
        </div>
      </div>

      <div className="p-3 space-y-2 grow flex flex-col">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-mono text-neutral-500">
            #{String(index + 1).padStart(2, "0")}
          </span>
          <h3 className="text-sm font-semibold text-white truncate">{name}</h3>
        </div>
        <p className="text-xs text-neutral-400 leading-snug line-clamp-3">
          {scene}
        </p>
        {narration && (
          <p className="text-[11px] text-amber-200 leading-snug italic">
            “{narration}”
          </p>
        )}
        {dialogue && dialogue.length > 0 && (
          <ul className="text-[11px] space-y-1">
            {dialogue.map((d, i) => (
              <li key={i} className="text-neutral-300">
                <span className="text-violet-300 font-semibold">
                  {d.speaker}:
                </span>{" "}
                <span className="text-neutral-200">“{d.text}”</span>
              </li>
            ))}
          </ul>
        )}
        {errorMessage && (
          <p className="text-[11px] text-rose-300 leading-snug">
            {errorMessage}
          </p>
        )}
        <div className="grow" />
        <button
          type="button"
          onClick={onRegenerate}
          disabled={busy}
          className={cn(
            "mt-auto w-full text-xs font-semibold py-1.5 rounded-lg transition-colors",
            busy
              ? "bg-white/5 text-neutral-500 cursor-not-allowed"
              : "bg-linear-to-r from-violet-500 to-cyan-400 text-white hover:opacity-90",
          )}
        >
          {status === "done" ? "Regenerate" : "Generate"}
        </button>
      </div>
    </article>
  );
}
