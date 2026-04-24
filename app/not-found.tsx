import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Spotlight } from "@/components/ui/spotlight";
import { Home, Sparkles, ArrowRight, Search, BookMarked } from "lucide-react";

export const metadata = {
  title: "Page not found",
  description: "The page you're looking for wandered off the page.",
};

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-black relative overflow-hidden pt-24 pb-16">
        <Spotlight className="-top-20 left-20" fill="#8b5cf6" />
        <div className="absolute inset-0 grid-pattern opacity-25 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,black_80%)] pointer-events-none" />

        <section className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center min-h-[70vh] flex flex-col items-center justify-center">
          {/* Big 404 with gradient */}
          <div className="relative mb-8">
            <h1
              className="font-display font-black text-[12rem] md:text-[16rem] leading-none tracking-tighter select-none"
              style={{
                background:
                  "linear-gradient(135deg, #8b5cf6 0%, #6366f1 45%, #06b6d4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 60px rgba(139,92,246,0.35))",
              }}
            >
              404
            </h1>
            {/* Floating coloring-book-esque emojis */}
            <div className="absolute inset-0 pointer-events-none">
              {[
                { emoji: "🎨", pos: { left: "-2%", top: "15%" }, size: "text-5xl" },
                { emoji: "🖍️", pos: { right: "-2%", top: "10%" }, size: "text-5xl" },
                { emoji: "✨", pos: { left: "8%", bottom: "-5%" }, size: "text-4xl" },
                { emoji: "🦄", pos: { right: "8%", bottom: "-5%" }, size: "text-4xl" },
              ].map((f, i) => (
                <span
                  key={i}
                  className={`absolute ${f.size} opacity-80 animate-float`}
                  style={{ ...f.pos, animationDelay: `${i * 0.4}s` }}
                >
                  {f.emoji}
                </span>
              ))}
            </div>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
            This page wandered off the page
          </h2>
          <p className="text-neutral-400 max-w-md mx-auto mb-10 text-base leading-relaxed">
            Looks like the URL you hit doesn&apos;t exist — or the coloring
            book generator colored outside the lines. Let&apos;s get you back
            on track.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm md:text-base font-semibold text-white bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-400 shadow-lg shadow-violet-500/40 hover:shadow-xl hover:shadow-violet-500/60 transition-all"
            >
              <Home className="w-4 h-4" />
              Back home
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/generate"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm md:text-base font-medium text-white/90 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Open generator
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
            {[
              { href: "/gallery", icon: <Search className="w-4 h-4" />, label: "Prompt library", sub: "14 categories" },
              { href: "/blog", icon: <BookMarked className="w-4 h-4" />, label: "Blog", sub: "KDP guides" },
              { href: "/pricing", icon: <Sparkles className="w-4 h-4" />, label: "Pricing", sub: "Start free" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="group flex flex-col items-center gap-1 p-4 rounded-2xl bg-zinc-900/60 backdrop-blur border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all"
              >
                <span className="text-violet-300 group-hover:text-violet-200 mb-1">
                  {l.icon}
                </span>
                <span className="text-sm font-semibold text-white">{l.label}</span>
                <span className="text-[11px] text-neutral-500">{l.sub}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
