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
    return <>{children}</>;
  }

  const missing: string[] = [];
  if (!frontCoverReady) missing.push("front cover");
  if (pagesReady < minPages) {
    missing.push(`${minPages - pagesReady} more page${minPages - pagesReady === 1 ? "" : "s"}`);
  }

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-2.5 text-[11px] text-violet-200 leading-snug flex items-start gap-2">
      <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-violet-300" />
      <span>
        <strong>Amazon mockups</strong> unlock once you generate the {missing.join(" + ")}.
      </span>
    </div>
  );
}
