"use client";

import Link from "next/link";
import { MovingBorderButton } from "@/components/ui/moving-border";
import { Sparkles, ArrowRight } from "lucide-react";

export function HeroPrimaryCta() {
  return (
    <MovingBorderButton
      borderRadius="9999px"
      duration={3500}
      as="div"
      containerClassName="h-12 md:h-14 p-[2px] shadow-2xl shadow-violet-500/40"
      className="px-6 md:px-7 text-sm md:text-base font-semibold text-white bg-linear-to-r from-violet-500 via-indigo-400 to-cyan-400 rounded-full gap-2 border-0"
    >
      <Link
        href="/generate"
        className="group inline-flex items-center gap-2 h-full w-full px-6 md:px-7 rounded-full"
      >
        <Sparkles className="w-4 h-4" />
        Start Generating Free
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </Link>
    </MovingBorderButton>
  );
}
