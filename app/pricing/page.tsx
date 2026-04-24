import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Check, Sparkles, Zap, Crown, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { FaqAccordion } from "./faq-accordion";

export const metadata = {
  title: "Pricing — ColorBook AI",
  description:
    "Simple pricing for AI coloring book generation. Free tier available. Paid plans from $9.99/mo.",
};

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    icon: <Sparkles className="w-5 h-5" />,
    desc: "Try the studio with your own Gemini API key.",
    features: [
      "Bring-your-own Gemini API key",
      "All 280 curated prompts",
      "1 book / month (20 pages)",
      "Watermarked PDF export",
      "PNG downloads",
    ],
    cta: { label: "Start free", href: "/generate" },
    highlight: false,
  },
  {
    name: "Starter",
    price: "$9.99",
    period: "/month",
    icon: <Zap className="w-5 h-5" />,
    desc: "Hobby sellers publishing their first books.",
    features: [
      "Our managed Gemini quota",
      "5 books / month",
      "Up to 50 pages per book",
      "No watermark",
      "KDP-ready PDF (8.5×11, 300 DPI)",
      "Email support",
    ],
    cta: { label: "Start Starter", href: "#" },
    highlight: false,
  },
  {
    name: "Pro",
    price: "$24.99",
    period: "/month",
    icon: <Rocket className="w-5 h-5" />,
    desc: "Serious KDP creators scaling portfolios.",
    features: [
      "20 books / month",
      "Unlimited pages per book",
      "Pinterest auto-posting",
      "Auto pin scheduling (30-day)",
      "UTM-tagged tracking links",
      "Sales attribution analytics",
      "Priority support",
    ],
    cta: { label: "Start Pro", href: "#" },
    highlight: true,
  },
  {
    name: "Studio",
    price: "$49.99",
    period: "/month",
    icon: <Crown className="w-5 h-5" />,
    desc: "Agencies, teams, and high-volume publishers.",
    features: [
      "Unlimited books",
      "Etsy + Gumroad auto-publish",
      "Team seats (3 included)",
      "Custom branding on exports",
      "API access",
      "Dedicated onboarding",
    ],
    cta: { label: "Talk to us", href: "#" },
    highlight: false,
  },
];

const faqs = [
  {
    q: "Can I use my own Gemini API key?",
    a: "Yes — the Free tier is BYO-key. You only pay Google for the tokens you use. Paid tiers include our managed quota so you don't need your own key.",
  },
  {
    q: "Why no Stripe? I see Lemon Squeezy.",
    a: "Lemon Squeezy is the Merchant of Record — they handle global VAT, GST, and sales tax automatically. For an India-based founder serving global customers, it eliminates a massive compliance headache.",
  },
  {
    q: "Do I own the coloring pages I generate?",
    a: "Yes. Under Google's current terms for Gemini image generation, you own what you create. You're free to publish on KDP, Etsy, Gumroad, or print at home.",
  },
  {
    q: "How consistent is the art style across 20 pages?",
    a: "The master prompt formula is tuned specifically for coloring-book line art — thick outlines, flat 2D, no shading. Consistency is ~90% out of the box. Regenerate any outlier in one click.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No contracts. Cancel from the Lemon Squeezy customer portal and you keep access until the end of your billing period.",
  },
  {
    q: "Is there a refund policy?",
    a: "30-day no-questions-asked refund on monthly plans. Email us and we'll refund your last payment.",
  },
];

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-28 pb-20 bg-gradient-to-b from-white via-purple-50/30 to-white dark:from-black dark:via-violet-950/20 dark:to-black">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/10 to-cyan-500/10 dark:from-violet-950/50 dark:to-pink-950/50 text-xs font-medium text-violet-700 dark:text-violet-300 mb-4">
              Transparent pricing · Cancel anytime
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Pick the plan that <span className="gradient-text">ships your book</span>
            </h1>
            <p className="mt-4 text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              Start free with your own Gemini API key. Upgrade when you&apos;re
              ready to scale.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={cn(
                  "relative rounded-2xl p-6 flex flex-col border",
                  t.highlight
                    ? "bg-gradient-to-br from-violet-500 via-indigo-400 to-cyan-400 border-transparent shadow-2xl shadow-violet-500/30 text-white scale-105"
                    : "bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border-neutral-200/60 dark:border-white/10"
                )}
              >
                {t.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white text-violet-700 text-xs font-bold uppercase tracking-wide shadow">
                    Most Popular
                  </div>
                )}

                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                    t.highlight
                      ? "bg-white/20 text-white"
                      : "bg-gradient-to-br from-violet-500/10 to-cyan-500/10 text-violet-500 dark:text-violet-300"
                  )}
                >
                  {t.icon}
                </div>

                <h3 className="text-xl font-bold">{t.name}</h3>
                <p
                  className={cn(
                    "text-sm mb-4",
                    t.highlight ? "text-white/80" : "text-neutral-600 dark:text-neutral-400"
                  )}
                >
                  {t.desc}
                </p>

                <div className="mb-6">
                  <span className="text-4xl font-bold tracking-tight">{t.price}</span>
                  <span
                    className={cn(
                      "text-sm ml-1",
                      t.highlight ? "text-white/80" : "text-neutral-500"
                    )}
                  >
                    {t.period}
                  </span>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check
                        className={cn(
                          "w-4 h-4 mt-0.5 shrink-0",
                          t.highlight ? "text-white" : "text-violet-400"
                        )}
                      />
                      <span
                        className={cn(
                          t.highlight
                            ? "text-white/90"
                            : "text-neutral-700 dark:text-neutral-300"
                        )}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={t.cta.href}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all",
                    t.highlight
                      ? "bg-white text-violet-700 hover:bg-violet-50 shadow-md"
                      : "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black"
                  )}
                >
                  {t.cta.label}
                </Link>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <section className="mt-24 max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
              Frequently asked questions
            </h2>
            <FaqAccordion faqs={faqs} />
          </section>
        </section>
      </main>
      <Footer />
    </>
  );
}
