import { cn } from "@/lib/utils";
import React from "react";

export function BentoGrid({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
}

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
  badge,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string;
}) {
  return (
    <div
      className={cn(
        "relative row-span-1 rounded-2xl group/bento hover:shadow-xl transition-all duration-300 shadow-input p-5 bg-zinc-900/60 backdrop-blur-xl border border-white/10 justify-between flex flex-col space-y-4 hover:border-violet-700",
        className
      )}
    >
      {badge && (
        <span className="absolute top-3 right-3 z-10 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur">
          {badge}
        </span>
      )}
      {header}
      <div className="group-hover/bento:translate-x-2 transition duration-200">
        {icon}
        <div className="font-semibold text-neutral-200 mt-2 mb-1 tracking-tight text-lg">
          {title}
        </div>
        <div className="font-normal text-neutral-400 text-sm leading-relaxed">
          {description}
        </div>
      </div>
    </div>
  );
}
