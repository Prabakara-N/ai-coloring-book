import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export function HeroPrimaryCta() {
  return (
    <Link
      href="/playground"
      className="group inline-flex items-center gap-2 h-12 md:h-14 px-6 md:px-7 rounded-full text-sm md:text-base font-semibold text-white bg-linear-to-r from-violet-500 via-indigo-400 to-cyan-400 shadow-2xl shadow-violet-500/40 hover:shadow-violet-500/60 transition-shadow"
    >
      <Sparkles className="w-4 h-4" />
      Start Generating Free
      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
    </Link>
  );
}
