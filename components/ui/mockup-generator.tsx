"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  Loader2,
  X,
  Download,
  RefreshCw,
  ShoppingBag,
  Package,
} from "lucide-react";
import { MOCKUP_STYLES, type MockupStyle } from "@/lib/mockup-prompts";
import { cn } from "@/lib/utils";

type Status = "idle" | "generating" | "done" | "error";

interface MockupState {
  status: Status;
  dataUrl?: string;
  error?: string;
}

export function MockupGenerator({
  coverDataUrl,
  title,
  bookName,
}: {
  coverDataUrl: string | null;
  title?: string;
  bookName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mocks, setMocks] = useState<Record<string, MockupState>>({});
  const [extra, setExtra] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const runOne = useCallback(
    async (style: MockupStyle) => {
      if (!coverDataUrl) return;
      setMocks((prev) => ({ ...prev, [style.id]: { status: "generating" } }));
      try {
        const res = await fetch("/api/mockup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            styleId: style.id,
            coverDataUrl,
            extraInstruction: extra.trim() || undefined,
          }),
        });
        const json = (await res.json()) as { dataUrl?: string; error?: string };
        if (!res.ok || !json.dataUrl) throw new Error(json.error || "Failed");
        setMocks((prev) => ({
          ...prev,
          [style.id]: { status: "done", dataUrl: json.dataUrl },
        }));
      } catch (e) {
        setMocks((prev) => ({
          ...prev,
          [style.id]: {
            status: "error",
            error: e instanceof Error ? e.message : "Failed",
          },
        }));
      }
    },
    [coverDataUrl, extra]
  );

  const runAll = useCallback(async () => {
    for (const style of MOCKUP_STYLES) {
      if (mocks[style.id]?.status === "done") continue;
      await runOne(style);
    }
  }, [runOne, mocks]);

  const downloadZip = useCallback(async () => {
    const done = MOCKUP_STYLES.map((s) => ({ style: s, m: mocks[s.id] })).filter(
      (x) => x.m?.status === "done" && x.m.dataUrl
    );
    if (done.length === 0) return;
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (const d of done) {
      zip.file(`${d.style.id}.png`, d.m.dataUrl!.split(",")[1], { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `amazon_mockups_${(bookName ?? "book").replace(/[^a-z0-9]+/gi, "_")}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [mocks, bookName]);

  const doneCount = Object.values(mocks).filter((m) => m.status === "done").length;

  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            className="fixed top-4 right-4 z-[10000] p-2.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 shadow-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl shadow-violet-500/20 p-6 md:p-8 space-y-5"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500/15 to-cyan-500/15 border border-violet-500/30 text-[10px] font-semibold uppercase tracking-wider text-violet-300 mb-2">
                  <Camera className="w-3 h-3" />
                  Amazon mockups
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-white">
                  {title ?? "Generate Amazon product shots"}
                </h2>
                <p className="text-sm text-neutral-400 mt-1 max-w-lg">
                  6 photo-realistic product shots built from your cover — for Amazon A+
                  carousel, Etsy listings, and Pinterest pins.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={runAll}
                  disabled={!coverDataUrl}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-400 shadow-lg shadow-violet-500/40 hover:shadow-xl disabled:opacity-60"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Generate all 6
                </button>
                {doneCount > 0 && (
                  <button
                    onClick={downloadZip}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-white/10 text-white hover:bg-white/20 border border-white/30"
                  >
                    <Package className="w-3.5 h-3.5" />
                    ZIP ({doneCount})
                  </button>
                )}
              </div>
            </div>

            {!coverDataUrl && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200">
                Generate a cover first — mockups are built on top of the cover image.
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Extra direction{" "}
                <span className="font-normal text-neutral-500">(optional)</span>
              </label>
              <input
                type="text"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="e.g. winter holiday mood, pastel props, kid-sized hands"
                className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/60"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {MOCKUP_STYLES.map((style) => {
                const m = mocks[style.id];
                return (
                  <div
                    key={style.id}
                    className="rounded-2xl bg-zinc-900/60 border border-white/10 overflow-hidden"
                  >
                    <div
                      className="relative bg-black"
                      style={{ aspectRatio: style.aspect.replace(":", "/") }}
                    >
                      {m?.status === "done" && m.dataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.dataUrl}
                          alt={style.label}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : m?.status === "generating" ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-violet-950/20">
                          <Loader2 className="w-6 h-6 animate-spin text-violet-300" />
                          <p className="text-xs text-violet-200">Generating…</p>
                        </div>
                      ) : m?.status === "error" ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-950/30 p-3 text-center">
                          <X className="w-5 h-5 text-red-400" />
                          <p className="text-[10px] text-red-200 line-clamp-3">
                            {m.error}
                          </p>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-neutral-500">
                          <Camera className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-2">
                      <p className="text-sm font-semibold text-white">{style.label}</p>
                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                        {style.description}
                      </p>
                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={() => runOne(style)}
                          disabled={!coverDataUrl || m?.status === "generating"}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold bg-gradient-to-r from-violet-500 to-cyan-400 text-white hover:shadow-md disabled:opacity-60"
                        >
                          {m?.status === "generating" ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : m?.status === "done" ? (
                            <>
                              <RefreshCw className="w-3 h-3" /> Regen
                            </>
                          ) : (
                            <>
                              <Camera className="w-3 h-3" /> Generate
                            </>
                          )}
                        </button>
                        {m?.status === "done" && m.dataUrl && (
                          <a
                            href={m.dataUrl}
                            download={`mockup_${style.id}.png`}
                            className="inline-flex items-center justify-center p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!coverDataUrl}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-white/10 text-white hover:bg-white/20 backdrop-blur transition-colors border border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
        title={
          !coverDataUrl
            ? "Generate the cover first to enable mockups"
            : "Open Amazon mockup generator"
        }
      >
        <ShoppingBag className="w-4 h-4" />
        Amazon mockups
      </button>
      {mounted && open && createPortal(modal, document.body)}
    </>
  );
}
