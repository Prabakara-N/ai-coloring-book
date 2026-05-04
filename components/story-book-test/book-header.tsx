"use client";

import type {
  StoryCharacter,
  StoryPalette,
} from "@/lib/prompts";

interface BookHeaderProps {
  title: string;
  characters: StoryCharacter[];
  palette: StoryPalette;
  totalScenes: number;
}

export function BookHeader({
  title,
  characters,
  palette,
  totalScenes,
}: BookHeaderProps) {
  return (
    <header className="rounded-3xl bg-zinc-900/60 border border-white/10 p-5 md:p-6 space-y-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          {title}
        </h1>
        <span className="text-xs font-mono uppercase tracking-wider text-violet-300 bg-violet-500/10 px-2 py-1 rounded-md">
          Story book · Toddlers 3-6 · {totalScenes} pages
        </span>
      </div>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
          Locked characters
        </h2>
        <ul className="space-y-2">
          {characters.map((c) => (
            <li
              key={c.name}
              className="rounded-xl bg-black/30 border border-white/5 px-3 py-2"
            >
              <p className="text-sm font-semibold text-white">{c.name}</p>
              <p className="text-xs text-neutral-400 leading-relaxed mt-0.5">
                {c.descriptor}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
          Palette · <span className="text-neutral-300">{palette.name}</span>
        </h2>
        <div className="flex gap-2 flex-wrap">
          {palette.hexes.map((hex) => (
            <div
              key={hex}
              className="flex items-center gap-2 rounded-lg bg-black/30 border border-white/5 px-2 py-1.5"
            >
              <span
                className="w-5 h-5 rounded-md border border-white/10 shrink-0"
                style={{ backgroundColor: hex }}
                aria-hidden
              />
              <code className="text-[10px] font-mono text-neutral-300">
                {hex}
              </code>
            </div>
          ))}
        </div>
      </section>
    </header>
  );
}
