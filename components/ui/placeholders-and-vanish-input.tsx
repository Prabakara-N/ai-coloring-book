"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Particle {
  x: number;
  y: number;
  r: number;
  color: string;
}

export interface PlaceholdersAndVanishInputProps {
  placeholders: string[];
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  disabled?: boolean;
  className?: string;
}

export function PlaceholdersAndVanishInput({
  placeholders,
  onChange,
  onSubmit,
  disabled = false,
  className,
}: PlaceholdersAndVanishInputProps) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [value, setValue] = useState("");
  const [animating, setAnimating] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);

  const startAnimation = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 3000);
  }, [placeholders.length]);

  useEffect(() => {
    startAnimation();
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible" && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      } else if (document.visibilityState === "visible") {
        startAnimation();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [startAnimation]);

  const draw = useCallback(() => {
    if (!inputRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 800;
    ctx.clearRect(0, 0, 800, 800);
    const computedStyles = getComputedStyle(inputRef.current);
    const fontSize = parseFloat(computedStyles.getPropertyValue("font-size"));
    ctx.font = `${fontSize * 2}px ${computedStyles.fontFamily}`;
    ctx.fillStyle = "#FFF";
    ctx.fillText(value, 16, 40);

    const imageData = ctx.getImageData(0, 0, 800, 800);
    const pixelData = imageData.data;
    const particles: Particle[] = [];

    for (let row = 0; row < 800; row++) {
      const rowOffset = 4 * row * 800;
      for (let col = 0; col < 800; col++) {
        const idx = rowOffset + 4 * col;
        if (
          pixelData[idx] !== 0 &&
          pixelData[idx + 1] !== 0 &&
          pixelData[idx + 2] !== 0
        ) {
          particles.push({
            x: col,
            y: row,
            r: 1,
            color: `rgba(${pixelData[idx]}, ${pixelData[idx + 1]}, ${pixelData[idx + 2]}, ${pixelData[idx + 3]})`,
          });
        }
      }
    }
    particlesRef.current = particles;
  }, [value]);

  useEffect(() => {
    draw();
  }, [value, draw]);

  const animate = (start: number) => {
    const animateFrame = (pos: number) => {
      requestAnimationFrame(() => {
        const next: Particle[] = [];
        for (let i = 0; i < particlesRef.current.length; i++) {
          const current = particlesRef.current[i];
          if (current.x < pos) {
            next.push(current);
          } else {
            if (current.r <= 0) {
              current.r = 0;
              continue;
            }
            current.x += Math.random() > 0.5 ? 1 : -1;
            current.y += Math.random() > 0.5 ? 1 : -1;
            current.r -= 0.05 * Math.random();
            next.push(current);
          }
        }
        particlesRef.current = next;
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) {
          ctx.clearRect(pos, 0, 800, 800);
          particlesRef.current.forEach((p) => {
            if (p.x > pos) {
              ctx.beginPath();
              ctx.rect(p.x, p.y, p.r, p.r);
              ctx.fillStyle = p.color;
              ctx.strokeStyle = p.color;
              ctx.stroke();
            }
          });
        }
        if (particlesRef.current.length > 0) {
          animateFrame(pos - 8);
        } else {
          setValue("");
          setAnimating(false);
        }
      });
    };
    animateFrame(start);
  };

  const vanishAndSubmit = () => {
    setAnimating(true);
    draw();
    const v = inputRef.current?.value || "";
    if (v && inputRef.current) {
      const maxX = particlesRef.current.reduce(
        (prev, current) => (current.x > prev ? current.x : prev),
        0,
      );
      animate(maxX);
    } else {
      setAnimating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !animating && !disabled) {
      vanishAndSubmit();
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (animating || disabled) return;
    vanishAndSubmit();
    onSubmit?.(e);
  };

  return (
    <form
      className={cn(
        "w-full relative max-w-2xl mx-auto bg-white dark:bg-zinc-900 h-12 rounded-full overflow-hidden border border-white/10 shadow-[0_2px_3px_-1px_rgba(0,0,0,0.4),_0_1px_0_0_rgba(25,28,33,0.3),_0_0_0_1px_rgba(25,28,33,0.2)] transition duration-200",
        value && "bg-gray-50 dark:bg-zinc-900",
        disabled && "opacity-60 cursor-not-allowed",
        className,
      )}
      onSubmit={handleSubmit}
    >
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute pointer-events-none text-base transform scale-50 top-[20%] left-2 sm:left-8 origin-top-left filter invert dark:invert-0 pr-20",
          !animating ? "opacity-0" : "opacity-100",
        )}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        disabled={disabled || animating}
        onChange={(e) => {
          if (animating) return;
          setValue(e.target.value);
          onChange?.(e);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full relative text-sm sm:text-base z-50 border-none bg-transparent text-black dark:text-white h-full rounded-full focus:outline-none focus:ring-0 pl-4 sm:pl-10 pr-20 disabled:cursor-not-allowed",
          animating && "text-transparent dark:text-transparent",
        )}
      />

      <button
        disabled={!value || animating || disabled}
        type="submit"
        aria-label="Send"
        className="absolute right-2 top-1/2 z-50 -translate-y-1/2 h-8 w-8 rounded-full bg-linear-to-r from-violet-500 to-cyan-400 text-white shadow-lg shadow-violet-500/30 disabled:bg-zinc-700 disabled:bg-none disabled:opacity-60 transition duration-200 flex items-center justify-center"
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <motion.path
            d="M5 12l14 0"
            initial={{ strokeDasharray: "50%", strokeDashoffset: "50%" }}
            animate={{ strokeDashoffset: value ? 0 : "50%" }}
            transition={{ duration: 0.3, ease: "linear" }}
          />
          <path d="M13 18l6 -6" />
          <path d="M13 6l6 6" />
        </motion.svg>
      </button>

      <div className="absolute inset-0 flex items-center rounded-full pointer-events-none">
        <AnimatePresence mode="wait">
          {!value && !animating && (
            <motion.p
              key={`placeholder-${currentPlaceholder}`}
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -15, opacity: 0 }}
              transition={{ duration: 0.3, ease: "linear" }}
              className="text-sm sm:text-base font-normal text-neutral-500 dark:text-zinc-500 pl-4 sm:pl-12 text-left w-[calc(100%-2rem)] truncate"
            >
              {placeholders[currentPlaceholder]}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
