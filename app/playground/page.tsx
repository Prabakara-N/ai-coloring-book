import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Spotlight } from "@/components/ui/spotlight";
import { PlaygroundStudio } from "./playground-studio";
import { Wand2, Sparkles, MessageSquare } from "lucide-react";

export const metadata = {
  title: "Playground — ColorBook AI",
  description:
    "Free-form image generator. Type any prompt, generate with Gemini, then refine iteratively by giving natural-language feedback.",
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

        <section className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 text-xs font-medium text-violet-300 mb-5 backdrop-blur">
              <Sparkles className="w-3 h-3" />
              Free-form · Iterative · Powered by Gemini
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-white">
              Your own <span className="gradient-text">AI playground</span>
            </h1>
            <p className="mt-4 text-neutral-400 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
              Skip the category templates. Write any prompt. Generate a single
              image, then refine it with natural-language feedback —{" "}
              <em>&quot;remove the sun&quot;</em>,{" "}
              <em>&quot;add a border&quot;</em>,{" "}
              <em>&quot;move the tree to the right&quot;</em>.
            </p>

            <div className="mt-7 grid grid-cols-3 gap-3 max-w-xl mx-auto">
              {[
                {
                  icon: <Wand2 className="w-4 h-4" />,
                  label: "Any prompt",
                  sub: "Free-form text",
                },
                {
                  icon: <Sparkles className="w-4 h-4" />,
                  label: "Instant",
                  sub: "~8s per image",
                },
                {
                  icon: <MessageSquare className="w-4 h-4" />,
                  label: "Refine",
                  sub: "Chat-style edits",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-3 rounded-xl bg-zinc-900/60 border border-white/10 text-center"
                >
                  <div className="inline-flex w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 items-center justify-center text-violet-300 mb-1.5">
                    {s.icon}
                  </div>
                  <p className="text-xs font-semibold text-white">{s.label}</p>
                  <p className="text-[10px] text-neutral-500">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>

          <PlaygroundStudio />
        </section>
      </main>
      <Footer />
    </>
  );
}
