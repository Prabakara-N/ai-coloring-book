"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { LinkPreview } from "@/components/ui/link-preview";

export function FeaturesBento() {
  const features = [
    {
      title: "Generate 20 consistent pages",
      description:
        "Master prompt formula keeps every page on-style. Gemini Nano Banana renders ~8s per page with 3× parallelism.",
      skeleton: <SkeletonOne />,
      className:
        "col-span-1 lg:col-span-4 border-b lg:border-r border-white/10",
    },
    {
      title: "14 ready-to-publish themes",
      description:
        "Farm animals to unicorns — each pack ships with 20 prompts, KDP title, 7 keywords, and cover art direction.",
      skeleton: <SkeletonTwo />,
      className: "border-b col-span-1 lg:col-span-2 border-white/10",
    },
    {
      title: "CrayonSparks in action",
      description:
        "Every cover is real — generated end-to-end from theme pick to KDP-ready PDF in under five minutes.",
      skeleton: <SkeletonThree />,
      className:
        "col-span-1 lg:col-span-3 lg:border-r border-white/10",
    },
    {
      title: "Publish anywhere coloring books sell",
      description:
        "One source, four revenue streams. Auto-generate listings with consistent pricing and lead-magnet pages.",
      skeleton: <SkeletonFour />,
      className: "col-span-1 lg:col-span-3 border-b lg:border-none",
    },
  ];

  return (
    <div className="relative z-20 mx-auto max-w-7xl py-10 lg:py-16">
      <div className="relative">
        <div className="grid grid-cols-1 rounded-md lg:grid-cols-6 xl:border border-white/10">
          {features.map((feature) => (
            <FeatureCard key={feature.title} className={feature.className}>
              <FeatureTitle>{feature.title}</FeatureTitle>
              <FeatureDescription>{feature.description}</FeatureDescription>
              <div className="h-full w-full">{feature.skeleton}</div>
            </FeatureCard>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden p-4 sm:p-8", className)}>
      {children}
    </div>
  );
}

function FeatureTitle({ children }: { children?: React.ReactNode }) {
  return (
    <p className="mx-auto max-w-5xl text-left text-xl tracking-tight text-white md:text-2xl md:leading-snug">
      {children}
    </p>
  );
}

function FeatureDescription({ children }: { children?: React.ReactNode }) {
  return (
    <p className="mx-0 my-2 max-w-sm text-left text-sm md:text-sm font-normal text-neutral-300">
      {children}
    </p>
  );
}

function SkeletonOne() {
  return (
    <div className="relative flex h-full gap-10 px-2 py-8">
      <div className="mx-auto h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/visuals/features/generate-20-pages.png"
          alt="Generate 20 consistent pages — pipeline summary"
          width={1600}
          height={2000}
          className="h-full w-full rounded-md object-cover object-top"
        />
      </div>
    </div>
  );
}

function SkeletonTwo() {
  const rows: { key: string; offset: string; covers: string[] }[] = [
    {
      key: "row-one",
      offset: "-ml-20",
      covers: [
        "/visuals/covers/farm-animals.png",
        "/visuals/covers/playful-dinosaurs.png",
        "/visuals/covers/woodland-baby-animals.png",
        "/visuals/covers/wild-animals.png",
        "/visuals/covers/sea-creatures.png",
      ],
    },
    {
      key: "row-two",
      offset: "",
      covers: [
        "/visuals/covers/birds.png",
        "/visuals/covers/insects-bugs.png",
        "/visuals/covers/mighty-heroes.png",
        "/visuals/covers/halloween.png",
        "/visuals/covers/alphabet.png",
      ],
    },
    {
      key: "row-three",
      offset: "-ml-12",
      covers: [
        "/visuals/covers/toybox-favorites.png",
        "/visuals/covers/fruits.png",
        "/visuals/covers/vehicles.png",
        "/visuals/covers/happy-farm-animals.jpg",
      ],
    },
    {
      key: "row-four",
      offset: "-ml-8",
      covers: [
        "/visuals/covers/toys-coloring-book.png",
        "/visuals/covers/sea-creatures.png",
      ],
    },
  ];

  const imageVariants = {
    whileHover: { scale: 1.1, rotate: 0, zIndex: 100 },
    whileTap: { scale: 1.1, rotate: 0, zIndex: 100 },
  };

  return (
    <div className="relative flex h-full flex-col items-start gap-6 overflow-hidden p-8">
      {rows.map((row) => (
        <div key={row.key} className={cn("flex flex-row", row.offset)}>
          {row.covers.map((image, idx) => (
            <motion.div
              variants={imageVariants}
              key={`${row.key}-${idx}`}
              style={{ rotate: Math.random() * 20 - 10 }}
              whileHover="whileHover"
              whileTap="whileTap"
              className="mt-4 -mr-4 shrink-0 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-800 p-1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt="Coloring book cover"
                width="500"
                height="500"
                className="h-20 w-20 shrink-0 rounded-lg object-cover md:h-40 md:w-40"
              />
            </motion.div>
          ))}
        </div>
      ))}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-100 h-full w-20 bg-linear-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-100 h-full w-20 bg-linear-to-l from-black to-transparent" />
    </div>
  );
}

function SkeletonThree() {
  return (
    <div className="group/image relative flex h-full gap-10">
      <div className="mx-auto h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/visuals/features/in-action.png"
          alt="CrayonSparks in action — every cover is real, end-to-end"
          width={1280}
          height={1600}
          className="h-full w-full rounded-md object-cover object-top transition-transform duration-300 group-hover/image:scale-[1.02]"
        />
      </div>
    </div>
  );
}

function SkeletonFour() {
  const platforms = [
    {
      name: "Amazon KDP",
      url: "https://kdp.amazon.com",
      gradient: "from-violet-400 via-indigo-300 to-cyan-300",
      detail:
        "Paperback interior + cover + metadata ZIP. SEO title under 200 chars, 7 backend keywords, KDP-taxonomy categories.",
    },
    {
      name: "Etsy",
      url: "https://www.etsy.com/market/coloring_book",
      gradient: "from-rose-400 to-orange-300",
      detail:
        "Digital download listing via Etsy Open API v3 — SEO-tuned title, 13 tags, instant delivery.",
    },
    {
      name: "Gumroad",
      url: "https://gumroad.com",
      gradient: "from-pink-400 to-fuchsia-300",
      detail:
        "One-click digital product. Instant payouts, built-in email capture, your own /free/[slug] lead-magnet page.",
    },
    {
      name: "Pinterest",
      url: "https://pinterest.com",
      gradient: "from-red-400 to-rose-400",
      detail:
        "10 pin variants per book auto-scheduled across 30 days. UTM-tagged links route back to KDP / Etsy / Gumroad.",
    },
  ];

  return (
    <div className="relative flex h-full flex-col items-start justify-start gap-5 px-2 py-6">
      <p className="text-base md:text-lg leading-relaxed text-neutral-300 max-w-md">
        Same source, four revenue streams.{" "}
        <LinkPreview
          url="https://kdp.amazon.com"
          className="font-semibold bg-clip-text text-transparent bg-linear-to-r from-violet-400 via-indigo-300 to-cyan-300"
        >
          Amazon KDP
        </LinkPreview>{" "}
        for paperbacks,{" "}
        <LinkPreview
          url="https://www.etsy.com/market/coloring_book"
          className="font-semibold bg-clip-text text-transparent bg-linear-to-r from-rose-400 to-orange-300"
        >
          Etsy
        </LinkPreview>{" "}
        for printables,{" "}
        <LinkPreview
          url="https://gumroad.com"
          className="font-semibold bg-clip-text text-transparent bg-linear-to-r from-pink-400 to-fuchsia-300"
        >
          Gumroad
        </LinkPreview>{" "}
        for direct sales, and{" "}
        <LinkPreview
          url="https://pinterest.com"
          className="font-semibold bg-clip-text text-transparent bg-linear-to-r from-red-400 to-rose-400"
        >
          Pinterest
        </LinkPreview>{" "}
        as the always-on traffic engine.
      </p>

      <ul className="space-y-3 w-full max-w-md">
        {platforms.map((p) => (
          <li
            key={p.name}
            className="flex flex-col gap-1 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
          >
            <LinkPreview
              url={p.url}
              className={cn(
                "text-sm font-semibold bg-clip-text text-transparent bg-linear-to-r",
                p.gradient
              )}
            >
              {p.name}
            </LinkPreview>
            <span className="text-xs text-neutral-400 leading-relaxed">
              {p.detail}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-neutral-500">
        Hover any platform to peek the live page.
      </p>
    </div>
  );
}
