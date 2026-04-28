import { Paperclip } from "lucide-react";

interface PageReferenceBadgeProps {
  /** Already-resolved label, e.g. "page 3 — Lion in savanna" or "your reference". */
  label: string;
}

/**
 * Inline pill that explains what the assistant attached as a style/character
 * reference for a given turn. Shown directly below an assistant image bubble
 * so the user knows "Sparky used page 3 to keep the bear consistent".
 */
export function PageReferenceBadge({ label }: PageReferenceBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-[10px] font-medium text-violet-200">
      <Paperclip className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}
