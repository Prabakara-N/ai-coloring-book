import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { CATEGORIES } from "@/lib/prompts";
import { loadGallerySamples } from "@/lib/gallery";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export const metadata = {
  title: "Gallery — CrayonSparks",
  description:
    "Browse all 14 coloring book categories and 280 ready-to-ship prompts.",
};

export default function GalleryPage() {
  const samples = loadGallerySamples(3);

  return (
    <>
      <Navbar />
      <main className="flex-1 pt-28 pb-16 bg-linear-to-b from-black via-violet-950/20 to-black">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-linear-to-r from-violet-950/50 to-cyan-950/50 text-xs font-medium text-violet-300 mb-4">
              14 categories · 280 prompts
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              The <span className="gradient-text">prompt library</span>
            </h1>
            <p className="mt-4 text-neutral-400 max-w-2xl mx-auto">
              Every prompt is curated for ages 3-6, tested against the Gemini Nano
              Banana image model, and comes with a complete KDP listing template.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((cat) => {
              const previews = samples[cat.slug] ?? [];
              return (
                <Link
                  key={cat.slug}
                  href={`/generate?category=${cat.slug}`}
                  className="group relative rounded-2xl p-6 bg-zinc-900/60 backdrop-blur-xl border border-white/10 hover:border-violet-700 hover:shadow-2xl hover:shadow-violet-500/10 transition-all overflow-hidden"
                >
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-linear-to-br from-violet-500/10 to-cyan-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />

                  <div className="relative flex items-start justify-between mb-4">
                    <span className="text-5xl group-hover:scale-110 group-hover:rotate-6 transition-transform inline-block">
                      {cat.icon}
                    </span>
                    <span className="text-xs font-mono text-neutral-500">
                      #{String(cat.number).padStart(2, "0")}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold mb-1">{cat.name}</h3>
                  <p className="text-sm text-neutral-400 mb-4">
                    {cat.description}
                  </p>

                  {previews.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1.5 mb-4">
                      {previews.map((s) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={s.file}
                          src={s.src}
                          alt={s.alt}
                          className="aspect-square rounded-md object-contain bg-white ring-1 ring-white/10"
                          loading="lazy"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {cat.prompts.slice(0, 4).map((p) => (
                        <span
                          key={p.id}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-violet-950/40 text-violet-300 font-medium"
                        >
                          {p.name}
                        </span>
                      ))}
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-400">
                        +{cat.prompts.length - 4} more
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <span className="text-xs text-neutral-500">
                      {cat.prompts.length} prompts · KDP template
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-violet-400 group-hover:gap-2 transition-all">
                      Generate
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-20 text-center">
            <Link
              href="/generate"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-base font-semibold text-white bg-linear-to-r from-violet-500 via-indigo-400 to-cyan-400 hover:shadow-xl hover:shadow-violet-500/40 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Open the Generator
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
