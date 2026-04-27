"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, BookOpen } from "lucide-react";
import { BookFlip, type BookFlipPageInput } from "./book-flip";

interface PreviewBookModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  cover?: { imageUrl?: string };
  backCover?: { imageUrl?: string };
  pages: BookFlipPageInput[];
}

export function PreviewBookModal({
  open,
  onClose,
  title,
  cover,
  backCover,
  pages,
}: PreviewBookModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col items-center gap-5 max-w-full"
          >
            <div className="flex items-center gap-3 text-white">
              <BookOpen className="w-5 h-5 text-violet-300" />
              <h2 className="font-display text-xl font-bold tracking-tight">
                {title}
              </h2>
            </div>

            <BookFlip cover={cover} backCover={backCover} pages={pages} />

            <p className="text-xs text-neutral-400 mt-1">
              Click a page corner or swipe to flip · Press{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-[10px] font-mono">
                Esc
              </kbd>{" "}
              to close
            </p>
          </motion.div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
