"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODEL_LABELS, type GeminiImageModel } from "@/lib/constants";

interface ModelPickerProps {
  /**
   * Visible prefix inside the trigger pill, e.g. "Cover" or "Pages". Pass
   * an empty string when an external label is rendered next to the picker.
   */
  label: string;
  value: GeminiImageModel;
  options: readonly GeminiImageModel[];
  onChange: (next: GeminiImageModel) => void;
  /** Disables the control during generation. */
  disabled?: boolean;
  /** Native title for the trigger (tooltip). */
  title?: string;
}

/**
 * Custom dark-theme model picker. Uses a styled button + absolutely
 * positioned panel rather than a native <select> so it blends with the
 * rest of the dark UI (the OS dropdown was rendering as a white box that
 * looked completely out of place).
 *
 * Behavior:
 *   - Click the trigger to open. Click an option to select.
 *   - ESC closes. Outside-click closes.
 *   - ArrowUp / ArrowDown navigate while open. Enter / Space select the
 *     highlighted option. Tab closes (we don't trap focus — the selected
 *     value is preserved when the panel closes).
 *   - Renders selection with a check-mark; current option is highlighted.
 *   - Pure CSS, no portal — the panel uses absolute + z-50, which is enough
 *     for the toolbar (review phase) and the playground sidebar form.
 */
export function ModelPicker({
  label,
  value,
  options,
  onChange,
  disabled,
  title,
}: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  // Highlighted index — drives keyboard navigation. Resets to the current
  // selection each time the panel opens so users start from "where they are".
  const [highlight, setHighlight] = useState(() =>
    Math.max(0, options.indexOf(value)),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Close on outside click. We attach to mousedown (not click) so that a
  // click on a trigger inside another container doesn't fire after our
  // panel has been re-rendered closed.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Keep the highlighted index in sync with the externally-controlled value
  // whenever the panel opens (so opening always lands on the current pick).
  useEffect(() => {
    if (open) setHighlight(Math.max(0, options.indexOf(value)));
  }, [open, options, value]);

  function commit(next: GeminiImageModel) {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onPanelKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % options.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + options.length) % options.length);
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setHighlight(options.length - 1);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const next = options[highlight];
      if (next) commit(next);
    }
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={panelId}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        title={title}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
          "bg-white/10 text-white border border-white/20 backdrop-blur",
          "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60",
          disabled
            ? "opacity-60 cursor-not-allowed"
            : "cursor-pointer hover:bg-white/15",
        )}
      >
        {label && <span className="text-white/70">{label}</span>}
        <span className="font-semibold">{MODEL_LABELS[value]}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "w-3.5 h-3.5 text-white/70 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          id={panelId}
          role="listbox"
          tabIndex={-1}
          onKeyDown={onPanelKeyDown}
          // Auto-focus the panel so keyboard navigation works immediately.
          ref={(el) => el?.focus()}
          className={cn(
            "absolute z-50 mt-1.5 left-0 min-w-[180px] py-1",
            "rounded-xl border border-white/15 bg-zinc-950/95 backdrop-blur-xl",
            "shadow-2xl shadow-black/50 ring-1 ring-white/5",
            "focus:outline-none",
          )}
        >
          {options.map((opt, i) => {
            const selected = opt === value;
            const highlighted = i === highlight;
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => commit(opt)}
                className={cn(
                  "w-full flex items-center gap-2 pl-2.5 pr-3 py-1.5 text-left",
                  "text-xs text-white transition-colors",
                  highlighted ? "bg-violet-500/25" : "hover:bg-white/10",
                )}
              >
                <Check
                  aria-hidden
                  className={cn(
                    "w-3.5 h-3.5 shrink-0",
                    selected ? "text-violet-300" : "text-transparent",
                  )}
                />
                <span className={cn(selected ? "font-semibold" : "font-medium")}>
                  {MODEL_LABELS[opt]}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
