import { Suspense } from "react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Spotlight } from "@/components/ui/spotlight";
import { GeneratorStudio } from "@/components/generate/generator-studio";
import { CATEGORIES } from "@/lib/prompts";

export const metadata = {
  title: "AI Generator — CrayonSparks",
  description:
    "Generate kid-friendly coloring book pages with Gemini Nano Banana. 280 curated prompts across 14 categories, or bring your own.",
};

export default function GeneratePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-24 pb-16 bg-black relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" fill="#6366f1" />
          <div className="absolute inset-0 grid-pattern opacity-20" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,black_65%)]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 text-xs font-medium text-violet-300 mb-4 backdrop-blur">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              Powered by Gemini Nano Banana
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-white">
              <span className="gradient-text">AI Coloring Book</span> Generator
            </h1>
            <p className="mt-4 text-neutral-400 max-w-2xl mx-auto">
              Pick a category, choose a prompt, and generate kid-friendly line art
              in seconds. Or create your own book from scratch.
            </p>
          </div>

          <Suspense fallback={<div className="h-32" />}>
            <GeneratorStudio categories={CATEGORIES} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
