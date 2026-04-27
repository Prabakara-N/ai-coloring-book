"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface ImagePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  src: string;
  alt?: string;
  /** Optional caption shown under the image. */
  caption?: string;
}

/**
 * Lightweight image lightbox. Click backdrop / X / Escape to close.
 * Used for any small thumbnail that should expand to full-size on click
 * (chat reference attachments, etc.). Portals to document.body so parent
 * stacking contexts can't trap it.
 */
export function ImagePreviewDialog({
  open,
  onClose,
  src,
  alt,
  caption,
}: ImagePreviewDialogProps) {
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
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt ?? ""}
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl shadow-black/60 bg-white"
            />
            {caption && (
              <p className="text-xs text-neutral-300 text-center max-w-2xl">
                {caption}
              </p>
            )}
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
