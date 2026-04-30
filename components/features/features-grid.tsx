import { cn } from "@/lib/utils";
import {
  IconWand,
  IconBook,
  IconBrandPinterest,
  IconShoppingCart,
  IconRouteAltLeft,
  IconCurrencyDollar,
  IconBolt,
  IconHeart,
} from "@tabler/icons-react";

const features = [
  {
    title: "280 curated prompts",
    description:
      "Battle-tested prompts across 14 categories — from farm animals to unicorns. Pick a niche, ship a book.",
    icon: <IconWand />,
  },
  {
    title: "KDP-ready output",
    description:
      "8.5×11″ interior PDF at 300 DPI, single-sided, proper margins & gutter. Cover + metadata bundled.",
    icon: <IconBook />,
  },
  {
    title: "Pinterest auto-pilot",
    description:
      "10 pin variants per book, auto-scheduled across 30 days, UTM-tagged links to KDP / Etsy / Gumroad.",
    icon: <IconBrandPinterest />,
  },
  {
    title: "Multi-marketplace",
    description:
      "One source, three revenue streams. Auto-create listings on Amazon KDP, Etsy Digital, and Gumroad.",
    icon: <IconShoppingCart />,
  },
  {
    title: "AI consistency formula",
    description:
      "Master prompt template keeps every page on-style. No more page-7 Studio-Ghibli surprises.",
    icon: <IconRouteAltLeft />,
  },
  {
    title: "Bring your own API key",
    description:
      "Free tier runs on your Gemini key. Pay only for the pixels you generate. No hidden margin.",
    icon: <IconCurrencyDollar />,
  },
  {
    title: "20 pages in ~3 minutes",
    description:
      "3× parallel generation with Nano Banana. Niche pick to KDP-ready folder in under five minutes.",
    icon: <IconBolt />,
  },
  {
    title: "Built for creators, free forever",
    description:
      "Free tier covers your first book every month. Upgrade when you&apos;re ready to scale.",
    icon: <IconHeart />,
  },
];

export function FeaturesGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10 py-10 max-w-7xl mx-auto">
      {features.map((feature, index) => (
        <Feature key={feature.title} {...feature} index={index} />
      ))}
    </div>
  );
}

function Feature({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r py-10 relative group/feature border-neutral-800",
        (index === 0 || index === 4) && "lg:border-l border-neutral-800",
        index < 4 && "lg:border-b border-neutral-800"
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-linear-to-t from-neutral-800 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-linear-to-b from-neutral-800 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-neutral-400">{icon}</div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-700 group-hover/feature:bg-violet-500 transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-neutral-100">
          {title}
        </span>
      </div>
      <p className="text-sm text-neutral-300 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
}
