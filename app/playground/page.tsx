import { Suspense } from "react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Spotlight } from "@/components/ui/spotlight";
import { PlaygroundShell } from "./playground-shell";
import { Wand2, Sparkles, MessageSquare } from "lucide-react";

export const metadata = {
  title: "Playground — CrayonSparks",
  description:
    "Free-form image generator and AI-guided book planner. Generate a single image with Gemini, or chat to plan a complete coloring book.",
};

export default function PlaygroundPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-28 pb-20 bg-black relative overflow-hidden">
        <div className="absolute inset-0 -top-28 overflow-hidden pointer-events-none">
          <Spotlight className="-top-20 left-20" fill="#8b5cf6" />
          <div className="absolute inset-0 grid-pattern opacity-25" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,black_80%)]" />
        </div>

        <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 text-xs font-medium text-violet-300 mb-5 backdrop-blur">
              <Sparkles className="w-3 h-3" />
              Free-form · Iterative · Powered by AI
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-white">
              Your own <span className="gradient-text">AI playground</span>
            </h1>
            <p className="mt-4 text-neutral-400 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
              Generate a single image and refine it with natural-language
              feedback — or switch to chat mode and let AI plan a complete
              coloring book from your idea.
            </p>
          </div>

          <Suspense fallback={<div className="h-32" />}>
            <PlaygroundShell />
          </Suspense>
        </section>
      </main>
      <Footer />
    </>
  );
}
