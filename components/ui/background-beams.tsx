"use client";
import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const PATHS = Array.from({ length: 50 }, (_, i) => {
  // Each path is a smooth curve from upper-left to lower-right, offset by (dx, dy).
  const dx = i * 7;
  const dy = i * -8;
  const p = (x: number, y: number) => `${x + dx} ${y + dy}`;
  return `M${p(-380, -189)}C${p(-380, -189)} ${p(-312, 216)} ${p(152, 343)}C${p(616, 470)} ${p(684, 875)} ${p(684, 875)}`;
});

export const BackgroundBeams = React.memo(function BackgroundBeams({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex h-full w-full items-center justify-center bg-neutral-950 [mask-repeat:no-repeat] [mask-size:40px]",
        className,
      )}
    >
      <svg
        className="pointer-events-none absolute z-0 h-full w-full"
        width="100%"
        height="100%"
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Static composite web — draws every path faintly so the background looks dense */}
        <path
          d={PATHS.join(" ")}
          stroke="url(#paint-static-web)"
          strokeOpacity="0.05"
          strokeWidth="0.5"
        />

        {/* Animated beams flowing along a subset of paths */}
        {PATHS.map((path, index) => (
          <motion.path
            key={`beam-${index}`}
            d={path}
            stroke={`url(#beam-gradient-${index})`}
            strokeOpacity="0.4"
            strokeWidth="0.5"
          />
        ))}

        <defs>
          {PATHS.map((_, index) => (
            <motion.linearGradient
              id={`beam-gradient-${index}`}
              key={`gradient-${index}`}
              initial={{ x1: "0%", x2: "0%", y1: "0%", y2: "0%" }}
              animate={{
                x1: ["0%", "100%"],
                x2: ["0%", "95%"],
                y1: ["0%", "100%"],
                y2: ["0%", `${93 + Math.random() * 8}%`],
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                ease: "easeInOut",
                repeat: Infinity,
                delay: Math.random() * 10,
              }}
            >
              <stop stopColor="#18CCFC" stopOpacity="0" />
              <stop stopColor="#18CCFC" />
              <stop offset="32.5%" stopColor="#6344F5" />
              <stop offset="100%" stopColor="#AE48FF" stopOpacity="0" />
            </motion.linearGradient>
          ))}

          <radialGradient
            id="paint-static-web"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(352 34) rotate(90) scale(555 1560.62)"
          >
            <stop offset="0.0671246" stopColor="#d4d4d4" />
            <stop offset="0.904663" stopColor="#171717" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
});
