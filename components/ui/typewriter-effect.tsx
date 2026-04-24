"use client";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export function TypewriterEffect({
  words,
  className,
  cursorClassName,
}: {
  words: { text: string; className?: string }[];
  className?: string;
  cursorClassName?: string;
}) {
  const wordsArray = words.map((word) => ({ ...word, text: word.text.split("") }));

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-x-2 gap-y-1", className)}>
      {wordsArray.map((word, idx) => (
        <motion.div
          key={`word-${idx}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: idx * 0.2 }}
          className="inline-block"
        >
          {word.text.map((char, i) => (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1, delay: idx * 0.2 + i * 0.03 }}
              key={`char-${i}`}
              className={cn("dark:text-white text-black", word.className)}
            >
              {char}
            </motion.span>
          ))}
        </motion.div>
      ))}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className={cn(
          "inline-block rounded-sm w-[4px] h-10 md:h-12 lg:h-14 bg-violet-500",
          cursorClassName
        )}
      />
    </div>
  );
}
