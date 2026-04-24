"use client";

import React from "react";
import { motion } from "motion/react";
import {
  Wand2,
  BookOpen,
  Pin,
  ShoppingCart,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "live" | "coming-soon";

export interface FeatureSection {
  key: string;
  iconName: "wand" | "book" | "pin" | "cart" | "chart";
  gradient: string;
  accent: string;
  title: string;
  subtitle: string;
  status: Status;
  bullets: string[];
  image?: string | null;
}

const ICONS = {
  wand: <Wand2 className="w-6 h-6" />,
  book: <BookOpen className="w-6 h-6" />,
  pin: <Pin className="w-6 h-6" />,
  cart: <ShoppingCart className="w-6 h-6" />,
  chart: <BarChart3 className="w-6 h-6" />,
};

export function FeatureSections({ sections }: { sections: FeatureSection[] }) {
  return (
    <div className="space-y-20 md:space-y-28">
      {sections.map((s, i) => (
        <FeatureRow key={s.key} section={s} reverse={i % 2 === 1} index={i} />
      ))}
    </div>
  );
}

function FeatureRow({
  section,
  reverse,
  index,
}: {
  section: FeatureSection;
  reverse: boolean;
  index: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative grid gap-8 md:gap-12 items-center md:grid-cols-2"
    >
      {/* Illustration */}
      <div className={cn("relative", reverse ? "md:order-2" : "md:order-1")}>
        <div
          className={cn(
            "relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl shadow-black/40",
            section.image ? "" : "bg-gradient-to-br " + section.gradient
          )}
        >
          {section.image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={section.image}
                alt={section.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 opacity-25 grid-pattern" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.3),transparent_60%)]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-28 h-28 md:w-36 md:h-36 rounded-3xl bg-white/15 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white text-neutral-900 flex items-center justify-center shadow-lg">
                    {ICONS[section.iconName]}
                  </div>
                </motion.div>
              </div>
            </>
          )}
          {/* Status chip */}
          <div className="absolute top-4 left-4 z-10">
            {section.status === "live" ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white shadow-lg flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Live
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-amber-950 shadow-lg">
                Coming Soon
              </span>
            )}
          </div>
        </div>

        {/* Soft glow */}
        <div
          className={cn(
            "absolute -inset-4 -z-10 blur-3xl opacity-30 bg-gradient-to-br rounded-3xl",
            section.gradient
          )}
        />
      </div>

      {/* Text column */}
      <div className={cn("relative", reverse ? "md:order-1" : "md:order-2")}>
        <motion.div
          initial={{ opacity: 0, x: reverse ? -30 : 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <p className={cn("text-xs font-mono uppercase tracking-widest mb-3", section.accent)}>
            {String(index + 1).padStart(2, "0")} · {section.subtitle}
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-6 text-white">
            {section.title}
          </h2>
          <ul className="space-y-2.5">
            {section.bullets.map((b, idx) => (
              <motion.li
                key={b}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.35, delay: 0.2 + idx * 0.04 }}
                className="flex items-start gap-3 text-sm text-neutral-300"
              >
                <CheckCircle2 className={cn("w-4 h-4 mt-0.5 shrink-0", section.accent)} />
                <span>{b}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
    </motion.section>
  );
}
