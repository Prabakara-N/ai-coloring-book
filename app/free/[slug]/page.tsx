import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { findCategory, CATEGORIES } from "@/lib/prompts";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, Sparkles, CheckCircle2 } from "lucide-react";
import { LeadCaptureForm } from "./lead-capture-form";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const cat = findCategory(slug);
  if (!cat) return {};
  return {
    title: `Free ${cat.name} Coloring Pages — ColorBook AI`,
    description: `Get 5 free printable ${cat.name.toLowerCase()} coloring pages. Perfect for ages 3-6.`,
  };
}

export default async function FreePage({ params }: PageProps) {
  const { slug } = await params;
  const cat = findCategory(slug);
  if (!cat) notFound();

  return (
    <>
      <Navbar />
      <main className="flex-1 pt-28 pb-16 bg-gradient-to-b from-black via-violet-950/20 to-black">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="text-6xl mb-4">{cat.icon}</div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-950/50 to-orange-950/50 text-xs font-medium text-amber-300 mb-4">
              <Sparkles className="w-3 h-3" />
              FREE — Limited time
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              5 Free <span className="gradient-text">{cat.name}</span>
              <br className="hidden md:block" /> Coloring Pages
            </h1>
            <p className="mt-4 text-neutral-400 max-w-xl mx-auto">
              Kid-friendly, thick clean outlines, printable. Perfect for ages 3-6.
              Drop your email — PDF arrives in your inbox in 30 seconds.
            </p>
          </div>

          {/* Email capture */}
          <LeadCaptureForm categorySlug={cat.slug} />

          {/* Previews */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-5 gap-3">
            {cat.prompts.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className="aspect-[3/4] rounded-xl bg-zinc-900/60 border border-white/10 flex flex-col items-center justify-center gap-2 p-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-950/40 to-pink-950/40 flex items-center justify-center text-neutral-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-center text-neutral-300">
                  {p.name}
                </p>
                <p className="text-[10px] text-neutral-500">Preview locked</p>
              </div>
            ))}
          </div>

          {/* What's inside */}
          <div className="mt-12 grid md:grid-cols-2 gap-4">
            {[
              "5 high-resolution printable pages",
              "8.5×11″ ready-to-print format",
              "Thick outlines perfect for kids",
              "No watermark, no attribution required",
              "Bonus: parent coloring tips cheatsheet",
              "Instant email delivery",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 p-4 rounded-xl bg-zinc-900/50 border border-white/10"
              >
                <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-violet-400" />
                <span className="text-sm text-neutral-200">{item}</span>
              </div>
            ))}
          </div>

          {/* Upsell */}
          <div className="mt-16 rounded-2xl p-6 md:p-8 bg-gradient-to-br from-violet-500 via-indigo-400 to-cyan-400 text-white text-center">
            <h3 className="text-2xl md:text-3xl font-bold mb-2">
              Love these? Get the full book.
            </h3>
            <p className="text-white/90 mb-5 max-w-md mx-auto">
              20 pages of {cat.name.toLowerCase()} — available on Amazon KDP as
              paperback or print yourself.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="#"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-white text-violet-700 hover:bg-violet-50 shadow-md"
              >
                <ShoppingCart className="w-4 h-4" />
                Buy on Amazon
              </a>
              <Link
                href="/generate"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-white/10 text-white hover:bg-white/20 border border-white/30 backdrop-blur"
              >
                Or generate your own
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
