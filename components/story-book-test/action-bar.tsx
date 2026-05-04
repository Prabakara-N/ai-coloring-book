"use client";

import { cn } from "@/lib/utils";

interface ActionBarProps {
  totalScenes: number;
  doneCount: number;
  coverDone: boolean;
  backCoverDone: boolean;
  allPagesDone: boolean;
  running: boolean;
  pdfBuilding: boolean;
  pdfReady: boolean;
  onGenerateAll: () => void;
  onAbort: () => void;
  onDownloadPdf: () => void;
}

export function ActionBar({
  totalScenes,
  doneCount,
  coverDone,
  backCoverDone,
  allPagesDone,
  running,
  pdfBuilding,
  pdfReady,
  onGenerateAll,
  onAbort,
  onDownloadPdf,
}: ActionBarProps) {
  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-white/10 p-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onGenerateAll}
        disabled={running || allPagesDone}
        className={cn(
          "text-sm font-semibold px-4 py-2 rounded-xl transition-colors",
          running || allPagesDone
            ? "bg-white/5 text-neutral-500 cursor-not-allowed"
            : "bg-linear-to-r from-violet-500 to-cyan-400 text-white hover:opacity-90",
        )}
      >
        {allPagesDone
          ? "All pages generated"
          : running
            ? "Generating…"
            : `Generate all ${totalScenes} pages`}
      </button>
      {running && (
        <button
          type="button"
          onClick={onAbort}
          className="text-xs font-semibold px-3 py-2 rounded-xl bg-rose-500/20 text-rose-200 hover:bg-rose-500/30"
        >
          Stop
        </button>
      )}
      <button
        type="button"
        onClick={onDownloadPdf}
        disabled={!pdfReady || pdfBuilding}
        className={cn(
          "text-sm font-semibold px-4 py-2 rounded-xl transition-colors",
          !pdfReady || pdfBuilding
            ? "bg-white/5 text-neutral-500 cursor-not-allowed"
            : "bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30",
        )}
      >
        {pdfBuilding ? "Assembling PDF…" : "Download PDF"}
      </button>
      <span className="text-xs font-mono text-neutral-500 ml-auto">
        cover {coverDone ? "✓" : "·"} back {backCoverDone ? "✓" : "·"} pages{" "}
        {doneCount}/{totalScenes}
      </span>
    </div>
  );
}
