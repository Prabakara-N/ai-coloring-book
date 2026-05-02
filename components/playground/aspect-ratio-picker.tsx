"use client";

import { cn } from "@/lib/utils";

export type AspectRatioValue =
  | "1:1"
  | "3:4"
  | "4:3"
  | "2:3"
  | "3:2"
  | "9:16"
  | "16:9";

interface AspectOption {
  value: AspectRatioValue;
  label: string;
}

const DEFAULT_OPTIONS: AspectOption[] = [
  { value: "1:1", label: "Square" },
  { value: "3:4", label: "KDP" },
  { value: "2:3", label: "Tall" },
  { value: "4:3", label: "Landscape" },
  { value: "3:2", label: "Wide" },
  { value: "9:16", label: "Pin" },
  { value: "16:9", label: "Banner" },
];

const MAX_BOX = 36;

function boxDims(value: AspectRatioValue): { w: number; h: number } {
  const [num, den] = value.split(":").map(Number);
  if (num >= den) {
    const h = Math.round((MAX_BOX * den) / num);
    return { w: MAX_BOX, h };
  }
  const w = Math.round((MAX_BOX * num) / den);
  return { w, h: MAX_BOX };
}

interface AspectRatioPickerProps {
  value: AspectRatioValue;
  onChange: (v: AspectRatioValue) => void;
  options?: AspectOption[];
  disabled?: boolean;
}

export function AspectRatioPicker({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  disabled = false,
}: AspectRatioPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = opt.value === value;
        const { w, h } = boxDims(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "group flex flex-col items-center gap-1 px-2.5 py-2 rounded-lg border transition-all min-w-[64px]",
              active
                ? "bg-violet-500/15 border-violet-400 shadow-md shadow-violet-500/20"
                : "bg-black/40 border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5",
              disabled && "opacity-50 cursor-not-allowed",
            )}
            aria-pressed={active}
            title={`${opt.label} · ${opt.value}`}
          >
            <span
              className="block flex items-center justify-center"
              style={{ width: MAX_BOX, height: MAX_BOX }}
              aria-hidden
            >
              <span
                className={cn(
                  "block rounded-sm border-2 transition-colors",
                  active
                    ? "border-violet-300 bg-violet-500/20"
                    : "border-neutral-500 bg-white/5 group-hover:border-violet-400",
                )}
                style={{ width: w, height: h }}
              />
            </span>
            <span
              className={cn(
                "text-[11px] font-semibold leading-tight",
                active ? "text-white" : "text-neutral-300",
              )}
            >
              {opt.label}
            </span>
            <span
              className={cn(
                "text-[10px] font-mono leading-tight",
                active ? "text-violet-200" : "text-neutral-500",
              )}
            >
              {opt.value}
            </span>
          </button>
        );
      })}
    </div>
  );
}
