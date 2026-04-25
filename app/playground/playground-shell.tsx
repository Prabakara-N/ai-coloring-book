"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Wand2, MessageSquare, BookPlus } from "lucide-react";
import { PlaygroundStudio } from "./playground-studio";
import { BookStudio } from "./book-studio";
import { GuidedChat } from "../generate/guided-chat";
import type { BookBrief } from "@/lib/book-chat";
import { createCustomCategory } from "@/lib/custom-categories";

const TABS = [
  {
    slug: "single-image",
    label: "Single image",
    icon: Wand2,
  },
  {
    slug: "chat-book",
    label: "Chat a book",
    icon: MessageSquare,
  },
  {
    slug: "bulk-book",
    label: "Bulk book",
    icon: BookPlus,
  },
] as const;

type TabSlug = (typeof TABS)[number]["slug"];

const DEFAULT_TAB: TabSlug = "single-image";

function isTabSlug(value: string | null): value is TabSlug {
  return TABS.some((t) => t.slug === value);
}

export function PlaygroundShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

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
    },
    [router, pathname, searchParams],
  );

  const handleBrief = useCallback(
    (brief: BookBrief) => {
      setError(null);
      try {
        const created = createCustomCategory({
          name: brief.name,
          icon: brief.icon || "📚",
          coverScene: brief.coverScene,
          scene: brief.pageScene,
          prompts: brief.prompts,
        });
        router.push(`/generate?category=${encodeURIComponent(created.slug)}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save book.");
      }
    },
    [router],
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
                className={`inline-flex items-center gap-2.5 px-5 md:px-7 py-3 rounded-xl text-base font-semibold transition-colors ${
                  active
                    ? "bg-gradient-to-r from-violet-500 to-cyan-400 text-white shadow-lg shadow-violet-500/30"
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

      {activeTab === "bulk-book" && <BookStudio />}
    </div>
  );
}
