"use client";
import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

export function AuroraBackground({
  className,
  children,
  showRadialGradient = true,
}: {
  className?: string;
  children?: ReactNode;
  showRadialGradient?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col min-h-[100vh] items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-slate-950 transition-bg",
        className
      )}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={cn(
            `pointer-events-none absolute -inset-[10px] opacity-50 blur-[10px] invert dark:invert-0 will-change-transform`,
            `[--white-gradient:repeating-linear-gradient(100deg,#fff_0%,#fff_7%,transparent_10%,transparent_12%,#fff_16%)]`,
            `[--dark-gradient:repeating-linear-gradient(100deg,#000_0%,#000_7%,transparent_10%,transparent_12%,#000_16%)]`,
            `[--aurora:repeating-linear-gradient(100deg,#a855f7_10%,#ec4899_15%,#f59e0b_20%,#a855f7_25%,#ec4899_30%)]`,
            `[background-image:var(--white-gradient),var(--aurora)]`,
            `dark:[background-image:var(--dark-gradient),var(--aurora)]`,
            `[background-size:300%,_200%]`,
            `[background-position:50%_50%,50%_50%]`,
            `filter blur-[10px] after:content-[""] after:absolute after:inset-0 after:[background-image:var(--white-gradient),var(--aurora)] after:dark:[background-image:var(--dark-gradient),var(--aurora)] after:[background-size:200%,_100%] after:animate-aurora after:[background-attachment:fixed] after:mix-blend-difference`,
            showRadialGradient &&
              `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]`
          )}
        />
      </div>
      {children}
    </div>
  );
}
