"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, Sparkles, X } from "lucide-react";

const links = [
  { href: "/gallery", label: "Gallery" },
  { href: "/playground", label: "Playground" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-colors duration-300",
        scrolled
          ? "bg-black/60 backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.04)]"
          : "bg-transparent"
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-mark.svg"
            alt="CrayonSparks"
            width={32}
            height={32}
            className="w-8 h-8 rounded-lg shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform"
          />
          <span className="font-bold text-lg tracking-tight">CrayonSparks</span>
        </Link>

        <ul className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white rounded-md hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/generate"
            className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-400 hover:shadow-lg hover:shadow-violet-500/40 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Generate
          </Link>
        </div>

        <button
          className="md:hidden p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-white/5"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden bg-black border-t border-white/10 shadow-2xl"
          >
            <div className="px-4 py-4 space-y-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-neutral-100 dark:hover:bg-white/5"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/generate"
                onClick={() => setOpen(false)}
                className="block mt-2 px-3 py-2 text-sm font-semibold text-center rounded-md text-white bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-400"
              >
                Start Generating
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
