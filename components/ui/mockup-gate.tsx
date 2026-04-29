"use client";

import { Lock } from "lucide-react";
import type { ReactNode } from "react";

interface MockupGateProps {
  frontCoverReady: boolean;
  pagesReady: number;
  minPages?: number;
  children: ReactNode;
}

/**
 * Gate around the Amazon mockup composer. Mockups should never use a fake
 * cover or empty book — they're meant to look like the actual product.
 * Requires: front cover generated AND at least N interior pages done.
 */
export function MockupGate({
  frontCoverReady,
  pagesReady,
  minPages = 3,
  children,
}: MockupGateProps) {
  if (frontCoverReady && pagesReady >= minPages) {
    // Right-align unlocked children (the trigger button) so the mockup
    // CTA sits at the right edge of its row, matching the locked-state
    // pill below.
    return <div className="flex justify-end">{children}</div>;
  }

  const missing: string[] = [];
  if (!frontCoverReady) missing.push("front cover");
  if (pagesReady < minPages) {
    missing.push(`${minPages - pagesReady} more page${minPages - pagesReady === 1 ? "" : "s"}`);
  }

  // Compact bottom-right pill — vertically centered icon + text.
  // No longer a full-width banner; lives at the right edge of its row.
  return (
    <div className="flex justify-end">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/5 px-3 py-1.5 text-[11px] text-violet-200 leading-none">
        <Lock className="w-3 h-3 text-violet-300 shrink-0" />
        <span>
          <strong>Amazon mockups</strong> unlock once you generate the {missing.join(" + ")}.
        </span>
      </div>
    </div>
  );
}
