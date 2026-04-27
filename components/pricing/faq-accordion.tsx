"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";

export interface FaqItem {
  q: string;
  a: string;
}

export function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {faqs.map((f, i) => {
        const isOpen = openIndex === i;
        return (
          <motion.div
            key={f.q}
            layout
            transition={{ layout: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
            className="rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-white/10 overflow-hidden hover:border-violet-500/30 transition-colors"
          >
            <motion.button
              layout
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-4 p-5 text-left font-semibold text-white"
            >
              <motion.span layout="position">{f.q}</motion.span>
              <motion.span
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="shrink-0 w-7 h-7 flex items-center justify-center text-violet-300"
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </motion.span>
            </motion.button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    height: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
                    opacity: { duration: 0.2, delay: isOpen ? 0.1 : 0 },
                  }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 text-sm text-neutral-400 leading-relaxed">
                    {f.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
