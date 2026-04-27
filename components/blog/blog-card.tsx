"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import type { BlogPost } from "@/lib/blog";
import { visualForTags } from "@/lib/blog-visuals";
import { cn } from "@/lib/utils";

export function BlogCard({ post, index }: { post: BlogPost; index: number }) {
  const v = visualForTags(post.frontmatter.tags);
  const cover = post.frontmatter.coverImage;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={`/blog/${post.slug}`}
        className="group block h-full rounded-3xl overflow-hidden bg-zinc-900/60 backdrop-blur-xl border border-white/10 hover:border-violet-500/40 hover:shadow-2xl hover:shadow-violet-500/20 transition-all"
      >
        {/* Cover */}
        <div className="relative aspect-[16/9] overflow-hidden">
          {cover ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover}
                alt={post.frontmatter.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
            </>
          ) : (
            <div className={cn("absolute inset-0 bg-linear-to-br", v.gradient)}>
              <div className="absolute inset-0 opacity-25 grid-pattern" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.2),transparent_60%)]" />
              <div className="absolute inset-0 pointer-events-none">
                {v.floaters.map((e, i) => {
                  const x = 20 + (i * 30) % 60;
                  const y = 25 + (i * 23) % 50;
                  return (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -10, 0], rotate: [0, 8, -8, 0] }}
                      transition={{
                        duration: 3 + i * 0.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.4,
                      }}
                      className="absolute text-3xl md:text-4xl opacity-80"
                      style={{ left: `${x}%`, top: `${y}%` }}
                    >
                      {e}
                    </motion.div>
                  );
                })}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/90 backdrop-blur flex items-center justify-center text-5xl md:text-6xl shadow-2xl group-hover:scale-110 transition-transform"
                >
                  {v.emoji}
                </motion.div>
              </div>
            </div>
          )}
          {/* Reading time pill */}
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-white text-[11px] font-medium flex items-center gap-1 z-10">
            <Clock className="w-3 h-3" />
            {post.frontmatter.readingTime ?? "—"}
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(post.frontmatter.tags ?? []).slice(0, 3).map((t) => (
              <span
                key={t}
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                  "bg-white/5 border-white/10",
                  v.accent
                )}
              >
                {t}
              </span>
            ))}
          </div>
          <h3 className="font-display text-lg md:text-xl font-bold leading-tight group-hover:text-violet-200 transition-colors">
            {post.frontmatter.title}
          </h3>
          <p className="mt-2 text-sm text-neutral-400 leading-relaxed line-clamp-3">
            {post.frontmatter.description}
          </p>
          <div className="mt-5 flex items-center justify-between text-xs text-neutral-500">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(post.frontmatter.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 font-semibold group-hover:gap-2 transition-all",
                v.accent
              )}
            >
              Read
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
