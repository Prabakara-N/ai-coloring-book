import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Spotlight } from "@/components/ui/spotlight";
import { FeatureSections, type FeatureSection } from "@/components/features/feature-sections";
import { visualUrl } from "@/lib/visuals";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export const metadata = {
  title: "Features — CrayonSparks",
  description:
    "Complete feature breakdown: AI generation, KDP-ready output, Pinterest engine, multi-marketplace publishing, and analytics.",
};

const sections: FeatureSection[] = [
  {
    key: "generation",
    iconName: "wand",
    gradient: "from-violet-500 via-indigo-400 to-cyan-400",
    accent: "text-violet-300",
    title: "Generation Pipeline",
    subtitle: "From prompt to line art",
    status: "live",
    bullets: [
      "280 curated, battle-tested prompts across 14 categories",
      "Master prompt formula ensures consistency across a book",
      "Gemini Nano Banana (2.5 Flash Image) — cheapest & fastest",
      "Batch generation with 3× parallelism — 20 pages in ~3 min",
      "Regenerate any outlier with one click",
      "Custom subjects wrapped in proven coloring-book formula",
    ],
  },
  {
    key: "kdp",
    iconName: "book",
    gradient: "from-cyan-500 via-sky-400 to-indigo-400",
    accent: "text-cyan-300",
    title: "KDP Output",
    subtitle: "Ship-ready files, zero formatting headaches",
    status: "live",
    bullets: [
      "8.5×11″ interior PDF at 300 DPI (KDP standard)",
      "One-sided layout: alternate illustration + blank page",
      "Proper margins & gutter (0.375″ inner for 40-page books)",
      "Cover generator: front + spine + back with auto-sized spine",
      "SEO title generator (under 200 chars, KDP keyword rules)",
      "7 backend keywords auto-generated",
      "Category picker from the KDP taxonomy",
      "HTML-formatted book description with bold + bullets",
    ],
  },
  {
    key: "pinterest",
    iconName: "pin",
    gradient: "from-rose-500 via-fuchsia-500 to-violet-500",
    accent: "text-rose-300",
    title: "Pinterest Engine",
    subtitle: "The sales driver — automated",
    status: "coming-soon",
    bullets: [
      "Pinterest API v5 OAuth — one-time connect",
      "10 pin variants auto-generated per book (teaser, before/after, carousel, video)",
      "Pin templates rendered server-side via Puppeteer",
      "Spread 100 pins across 30 days across 5-10 boards",
      "UTM-tagged outbound links to Amazon/Etsy/Gumroad",
      "Auto re-pin of top 20% performers",
      "Pinterest Trends API → next book niche suggestions",
      "Seasonal variants (Halloween, Christmas, Valentine&apos;s)",
    ],
  },
  {
    key: "marketplace",
    iconName: "cart",
    gradient: "from-emerald-500 via-teal-400 to-cyan-400",
    accent: "text-emerald-300",
    title: "Multi-Marketplace",
    subtitle: "One source, three revenue streams",
    status: "coming-soon",
    bullets: [
      "Amazon KDP: generate interior + cover + metadata ZIP",
      "Etsy Open API v3 — auto-create digital listing",
      "Gumroad API — auto-create digital product",
      "Shopify (optional) for your own store",
      "Consistent pricing across channels ($4.99–9.99 suggested)",
      "Lead-magnet landing page per book (/free/[slug])",
      "Email capture → 5 free pages → welcome sequence",
    ],
  },
  {
    key: "analytics",
    iconName: "chart",
    gradient: "from-indigo-500 via-violet-500 to-fuchsia-500",
    accent: "text-indigo-300",
    title: "Analytics Dashboard",
    subtitle: "Know what's working, double down",
    status: "coming-soon",
    bullets: [
      "Books published (total, this month)",
      "Pinterest: impressions, saves, outbound clicks per book",
      "Top-performing pins — scale winners, cut losers",
      "Revenue: KDP royalty + Etsy + Gumroad",
      "Funnel view: pin → click → purchase conversion",
      "ROI per book: time invested vs earnings",
      "Weekly email digest with highlights",
    ],
  },
];

function attachImages(list: FeatureSection[]): FeatureSection[] {
  return list.map((s) => ({ ...s, image: visualUrl(`visuals/features/${s.key}.png`) }));
}

export default function FeaturesPage() {
  const withImages = attachImages(sections);

  return (
    <>
      <Navbar />
      <main className="flex-1 pt-28 pb-20 bg-black relative overflow-hidden">
        <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="absolute inset-0 -top-28 overflow-hidden pointer-events-none">
            <Spotlight className="-top-20 left-20" fill="#8b5cf6" />
            <div className="absolute inset-0 grid-pattern opacity-25" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,black_80%)]" />
          </div>
          <div className="relative text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 text-xs font-medium text-violet-300 mb-6 backdrop-blur">
              <Sparkles className="w-3 h-3" />
              Complete feature breakdown
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-white">
              From idea to <span className="gradient-text">Amazon bestseller</span>
            </h1>
            <p className="mt-5 text-neutral-400 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
              Five modules tuned for one outcome: ship more books, make more
              sales, spend less time. Two are live now, three shipping next.
            </p>
          </div>
        </section>

        <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <FeatureSections sections={withImages} />
        </section>

        <section className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-28">
          <div className="rounded-3xl p-8 md:p-12 bg-gradient-to-br from-violet-500 via-indigo-400 to-cyan-400 text-white text-center overflow-hidden relative shadow-2xl shadow-violet-500/40">
            <div className="absolute inset-0 opacity-20 grid-pattern" />
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-300/30 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
                Ready to ship your first book?
              </h2>
              <p className="text-white/90 mb-6 max-w-lg mx-auto">
                Bring your Gemini API key. Pick a theme. 20 pages in ~3 minutes.
              </p>
              <Link
                href="/generate"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-base font-semibold bg-white text-violet-700 hover:bg-violet-50 transition-colors shadow-xl"
              >
                <Sparkles className="w-5 h-5" />
                Start Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
