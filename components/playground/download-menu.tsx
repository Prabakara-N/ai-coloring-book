"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Download, FileText, Package, Loader2, ChevronDown } from "lucide-react";

interface DownloadMenuProps {
  onPdf: () => void;
  onZip: () => void;
  pdfBuilding?: boolean;
  disabled?: boolean;
}

/**
 * Single Download button that opens a small dropdown with two options:
 * "Download as PDF (KDP)" and "Download as ZIP". Replaces the previous
 * pair of separate top-level export buttons so the action row stays clean.
 */
export function DownloadMenu({
  onPdf,
  onZip,
  pdfBuilding = false,
  disabled = false,
}: DownloadMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Position the menu directly under the trigger button using fixed coords
  // (the menu is portaled, so it can't rely on parent positioning).
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setAnchor({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  function pick(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && !pdfBuilding && setOpen((v) => !v)}
        disabled={disabled || pdfBuilding}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-busy={pdfBuilding}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-black text-white hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
      >
        {pdfBuilding ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {pdfBuilding ? "Downloading…" : "Download"}
        {!pdfBuilding && (
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && anchor && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                role="menu"
                style={{
                  position: "fixed",
                  top: anchor.top,
                  right: anchor.right,
                  zIndex: 1000,
                }}
                className="w-64 rounded-xl bg-zinc-950 border border-white/15 shadow-2xl shadow-black/60 overflow-hidden"
              >
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => pick(onPdf)}
                  disabled={pdfBuilding}
                  className="w-full flex items-start gap-3 px-3.5 py-2.5 text-left hover:bg-white/5 disabled:opacity-60"
                >
                  <FileText className="w-4 h-4 mt-0.5 shrink-0 text-violet-300" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">
                      Download as PDF (KDP)
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Front cover + 20 pages + back cover, ready for KDP
                    </div>
                  </div>
                </button>

                <div className="border-t border-white/10" />

                <button
                  role="menuitem"
                  type="button"
                  onClick={() => pick(onZip)}
                  className="w-full flex items-start gap-3 px-3.5 py-2.5 text-left hover:bg-white/5"
                >
                  <Package className="w-4 h-4 mt-0.5 shrink-0 text-cyan-300" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">
                      Download as ZIP
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Individual PNG files for each page + cover
                    </div>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
