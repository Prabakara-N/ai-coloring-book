"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ImagePlus, X, Upload, Clipboard, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImagePreviewDialog } from "./image-preview-dialog";

const MAX_BYTES = 6 * 1024 * 1024; // 6MB
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ReferenceImageField({
  value,
  onChange,
  compact = false,
  label = "Reference image",
  helper = "Gemini will use this as style/composition inspiration.",
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  compact?: boolean;
  label?: string;
  helper?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!ACCEPTED.includes(file.type)) {
        setError("Please use PNG, JPEG, or WebP.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("Image too large (max 6 MB). Try a smaller one.");
        return;
      }
      try {
        const url = await fileToDataUrl(file);
        onChange(url);
      } catch {
        setError("Could not read the file.");
      }
    },
    [onChange]
  );

  const onPick = () => inputRef.current?.click();

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    // Reset so the same file can be chosen twice
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile]
  );

  // Paste anywhere while the component is mounted
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            void handleFile(file);
            e.preventDefault();
            return;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFile]);

  if (value) {
    return (
      <>
        <div className={cn("rounded-xl border border-violet-500/40 bg-violet-500/5 p-3 flex items-center gap-3", compact ? "" : "p-4 gap-4")}>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="group relative shrink-0"
            title="Click to view full size"
            aria-label="View reference at full size"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Reference — click to expand"
              className={cn(
                "rounded-lg object-cover bg-black/40 border border-white/10 group-hover:border-violet-400 transition-colors",
                compact ? "w-16 h-16" : "w-20 h-20"
              )}
            />
            <span className="absolute inset-0 rounded-lg bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Maximize2 className="w-4 h-4" />
            </span>
          </button>
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="text-xs font-semibold text-violet-300 uppercase tracking-wider mb-0.5 hover:text-violet-200 hover:underline cursor-pointer text-left"
            >
              Reference attached · click to view
            </button>
            <p className="text-xs text-neutral-400 truncate">
              {helper}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white/5 border border-white/10 text-neutral-300 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300"
          >
            <X className="w-3.5 h-3.5" />
            Remove
          </button>
        </div>
        <ImagePreviewDialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          src={value}
          alt="Reference image"
          caption="Reference attached — Sparky uses this to match style/composition"
        />
      </>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-200 mb-2">
        {label}{" "}
        <span className="text-xs font-normal text-neutral-500">(optional)</span>
      </label>
      <button
        type="button"
        onClick={onPick}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "w-full group relative rounded-xl border-2 border-dashed transition-all flex items-center gap-4 p-4 text-left",
          dragOver
            ? "border-violet-400 bg-violet-500/10"
            : "border-white/15 bg-black/30 hover:border-violet-500/50 hover:bg-violet-500/5"
        )}
      >
        <div className="shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
          <ImagePlus className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">
            {dragOver ? "Drop it here" : "Upload, drag, or paste"}
          </p>
          <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
            {helper}
          </p>
          <div className="mt-1.5 flex items-center gap-3 text-[10px] text-neutral-500">
            <span className="inline-flex items-center gap-1">
              <Upload className="w-3 h-3" /> PNG, JPG, WebP · up to 6 MB
            </span>
            <span className="inline-flex items-center gap-1">
              <Clipboard className="w-3 h-3" /> ⌘/Ctrl+V supported
            </span>
          </div>
        </div>
      </button>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  );
}

export function useReferenceImage() {
  const [value, setValue] = useState<string | null>(null);
  return { value, setValue };
}
