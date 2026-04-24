import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Spotlight } from "@/components/ui/spotlight";
import { BookStudio } from "./book-studio";
import { BookPlus, Sparkles, Wand2 } from "lucide-react";

export const metadata = {
  title: "Bulk Book Generator — ColorBook AI",
  description:
    "Describe your coloring book idea, let AI plan 20 pages + cover, and generate the full KDP-ready book in one flow with pause/resume and per-page refinement.",
};

export default function BookPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-24 pb-16 bg-black relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" fill="#8b5cf6" />
          <div className="absolute inset-0 grid-pattern opacity-20" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,black_65%)]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 text-xs font-medium text-violet-300 mb-4 backdrop-blur">
              <BookPlus className="w-3 h-3" />
              AI-planned · Bulk · KDP-ready
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-white">
              From <span className="gradient-text">idea</span> to printable book — in one flow
            </h1>
            <p className="mt-4 text-neutral-400 max-w-2xl mx-auto">
              Describe your book. Gemini plans 20 page prompts + a cover. Review, tweak, then generate the whole book as a carousel with pause/resume and click-to-refine on every page.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-2 max-w-xl mx-auto">
              {[
                { icon: <Sparkles className="w-4 h-4" />, l: "AI plans", s: "Idea → 20 prompts" },
                { icon: <Wand2 className="w-4 h-4" />, l: "Live carousel", s: "See each as it ships" },
                { icon: <BookPlus className="w-4 h-4" />, l: "One export", s: "KDP PDF in a click" },
              ].map((f) => (
                <div
                  key={f.l}
                  className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/10 text-center"
                >
                  <div className="inline-flex w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 items-center justify-center text-violet-300 mb-1">
                    {f.icon}
                  </div>
                  <p className="text-[11px] font-semibold text-white">{f.l}</p>
                  <p className="text-[10px] text-neutral-500">{f.s}</p>
                </div>
              ))}
            </div>
          </div>

          <BookStudio />
        </div>
      </main>
      <Footer />
    </>
  );
}
