export interface BlogVisual {
  gradient: string;
  accent: string;
  emoji: string;
  floaters: string[];
}

const DEFAULT: BlogVisual = {
  gradient: "from-violet-600 via-indigo-500 to-cyan-500",
  accent: "text-violet-300",
  emoji: "📖",
  floaters: ["✨", "📘", "🎨"],
};

const TAG_MAP: Record<string, BlogVisual> = {
  "amazon kdp": {
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    accent: "text-amber-200",
    emoji: "📚",
    floaters: ["📚", "🏷️", "💰"],
  },
  kdp: {
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    accent: "text-amber-200",
    emoji: "📚",
    floaters: ["📚", "🏷️", "💰"],
  },
  pinterest: {
    gradient: "from-rose-600 via-fuchsia-600 to-violet-600",
    accent: "text-rose-200",
    emoji: "📌",
    floaters: ["📌", "📍", "🧲"],
  },
  marketing: {
    gradient: "from-rose-600 via-fuchsia-600 to-violet-600",
    accent: "text-rose-200",
    emoji: "📣",
    floaters: ["📣", "📈", "🎯"],
  },
  ai: {
    gradient: "from-violet-600 via-indigo-500 to-cyan-500",
    accent: "text-violet-200",
    emoji: "🤖",
    floaters: ["🤖", "✨", "🪄"],
  },
  "prompt engineering": {
    gradient: "from-cyan-600 via-sky-500 to-indigo-500",
    accent: "text-cyan-200",
    emoji: "🧩",
    floaters: ["🧩", "🔤", "💡"],
  },
  "how-to": {
    gradient: "from-emerald-600 via-teal-500 to-cyan-500",
    accent: "text-emerald-200",
    emoji: "📝",
    floaters: ["📝", "✅", "🎯"],
  },
  beginner: {
    gradient: "from-emerald-600 via-teal-500 to-cyan-500",
    accent: "text-emerald-200",
    emoji: "🌱",
    floaters: ["🌱", "📝", "✅"],
  },
};

export function visualForTags(tags: string[] = []): BlogVisual {
  for (const tag of tags) {
    const v = TAG_MAP[tag.toLowerCase()];
    if (v) return v;
  }
  return DEFAULT;
}
