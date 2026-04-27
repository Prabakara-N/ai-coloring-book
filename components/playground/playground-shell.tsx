"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Wand2, Sparkles, BookPlus } from "lucide-react";
import { PlaygroundStudio } from "@/components/playground/playground-studio";
import { BookStudio, type Plan } from "@/components/playground/book-studio";
import { GuidedChat } from "@/components/generate/guided-chat";
import type { BookBrief } from "@/lib/book-chat";
import { createCustomCategory } from "@/lib/custom-categories";

const TABS = [
  {
    slug: "single-image",
    label: "Single image",
    icon: Wand2,
    description:
      "Generate one freeform image — fast. Best for testing prompts, making thumbnails, or one-off art.",
    bestFor: "Testing prompts · Quick thumbnails",
  },
  {
    slug: "chat-book",
    label: "Sparky AI",
    icon: Sparkles,
    description:
      "Chat with Sparky AI ✨. Answer a few quick questions and get a complete book plan. Story-aware — Sparky knows hundreds of classic fables (Aesop, Panchatantra, Grimm).",
    bestFor: "Idea-shaping · Story books · Beginners",
  },
  {
    slug: "bulk-book",
    label: "Bulk book",
    icon: BookPlus,
    description:
      "Describe your book idea once and generate the full 20-page interior + cover + back cover in one flow, ready for Amazon KDP.",
    bestFor: "Power users · End-to-end KDP package",
  },
] as const;

type TabSlug = (typeof TABS)[number]["slug"];

const DEFAULT_TAB: TabSlug = "single-image";

function isTabSlug(value: string | null): value is TabSlug {
  return TABS.some((t) => t.slug === value);
}

function briefToPlan(brief: BookBrief): Plan {
  return {
    title: brief.name,
    coverTitle: brief.name,
    description: `${brief.prompts.length}-page coloring book.`,
    scene: brief.pageScene,
    coverScene: brief.coverScene,
    prompts: brief.prompts,
  };
}

export function PlaygroundShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  // When the chat finalizes a brief and we hand off to bulk-book inline,
  // we stash the plan here so BookStudio mounts with it pre-loaded.
  const [seedPlan, setSeedPlan] = useState<Plan | null>(null);

  const activeTab: TabSlug = useMemo(() => {
    const raw = searchParams.get("tab");
    return isTabSlug(raw) ? raw : DEFAULT_TAB;
  }, [searchParams]);

  const setTab = useCallback(
    (slug: TabSlug) => {
      const params = new URLSearchParams(searchParams.toString());
      if (slug === DEFAULT_TAB) {
        params.delete("tab");
      } else {
        params.set("tab", slug);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      // Always scroll to top so the user lands at the start of the new tab.
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [router, pathname, searchParams],
  );

  const [seedReference, setSeedReference] = useState<string | null>(null);
  const [seedMode, setSeedMode] = useState<"qa" | "story" | null>(null);

  const handleBrief = useCallback(
    (
      brief: BookBrief,
      mode: "qa" | "story",
      referenceDataUrl?: string | null,
    ) => {
      setError(null);
      try {
        // Save the brief as a custom category in localStorage so the user
        // can also access it from /generate later.
        createCustomCategory({
          name: brief.name,
          icon: brief.icon || "📚",
          coverScene: brief.coverScene,
          scene: brief.pageScene,
          prompts: brief.prompts,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save book.");
        return;
      }
      // Hand off to inline bulk-book carousel — no redirect.
      setSeedPlan(briefToPlan(brief));
      setSeedReference(referenceDataUrl ?? null);
      setSeedMode(mode);
      setTab("bulk-book");
    },
    [setTab],
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div
          role="tablist"
          aria-label="Playground mode"
          className="inline-flex p-1.5 rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur shadow-lg shadow-black/40"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.slug;
            return (
              <button
                key={t.slug}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.slug)}
                className={`inline-flex items-center gap-2.5 px-5 md:px-7 py-3 rounded-xl text-base font-semibold transition-colors ${active
                  ? "bg-linear-to-r from-violet-500 to-cyan-400 text-white shadow-lg shadow-violet-500/30"
                  : "text-neutral-300 hover:text-white"
                  }`}
              >
                <Icon className="w-5 h-5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <ActiveTabDescription tab={TABS.find((t) => t.slug === activeTab)!} />

      {activeTab === "single-image" && <PlaygroundStudio />}

      {activeTab === "chat-book" && (
        <div className="rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl shadow-violet-500/10 overflow-hidden">
          {error && (
            <div className="px-6 md:px-8 pt-4 -mb-2 text-sm text-red-300 bg-red-500/5 border-b border-red-500/20">
              {error}
            </div>
          )}
          <GuidedChat
            onBrief={handleBrief}
            onBack={() => setTab("single-image")}
          />
        </div>
      )}

      {activeTab === "bulk-book" && (
        <BookStudio
          key={seedPlan?.title ?? "blank"}
          initialPlan={seedPlan ?? undefined}
          initialReference={seedReference ?? undefined}
          initialMode={seedMode ?? undefined}
        />
      )}
    </div>
  );
}

interface TabMeta {
  slug: string;
  label: string;
  description: string;
  bestFor: string;
  icon: typeof Wand2;
}

function ActiveTabDescription({ tab }: { tab: TabMeta }) {
  const Icon = tab.icon;
  return (
    <div className="max-w-6xl mx-auto rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur px-5 py-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-linear-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center text-violet-200 shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-200 leading-relaxed">
          {tab.description}
        </p>
        <p className="text-[11px] mt-1 uppercase tracking-wider font-mono text-violet-300">
          Best for: {tab.bestFor}
        </p>
      </div>
    </div>
  );
}
