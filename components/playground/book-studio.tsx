"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookPlus,
  BookOpen,
  GalleryHorizontal,
  Sparkles,
  Loader2,
  Play,
  Pause,
  Square,
  RefreshCw,
  Plus,
  Wand2,
  CheckCircle2,
  XCircle,
  FileText,
  Package,
  Pencil,
  Trash2,
  MessageSquare,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReferenceImageField } from "@/components/ui/reference-image-field";
import {
  ImageRefineModal,
  type RefineBookContextProp,
} from "@/components/generate/image-refine-modal";
import type { PageMeta, PageStatus } from "@/lib/refine-chat";
import { MockupGenerator } from "@/components/ui/mockup-generator";
import { MockupGate } from "@/components/ui/mockup-gate";
import {
  Carousel as AppleCarousel,
  Card as AppleCard,
  type CardData,
} from "@/components/ui/apple-cards-carousel";
import { ColoringBorder } from "@/components/ui/coloring-border";
import { readSession, writeSession, clearSession } from "@/lib/book-storage";
import { BookFlip, prefetchBookFlip } from "@/components/playground/book-flip";
import { DownloadMenu } from "@/components/playground/download-menu";
import {
  KdpMetadataPanel,
  type MetadataProvider,
} from "@/components/playground/kdp-metadata-panel";
import { CoverPair } from "@/components/playground/cover-pair";
import { RegenerateCardButton } from "@/components/playground/regenerate-card-button";
import { IdeaSuggestionsPanel } from "@/components/playground/idea-suggestions-panel";
import type { KdpMetadata } from "@/lib/kdp-metadata";

type Aspect = "1:1" | "3:4" | "4:3" | "2:3" | "3:2" | "9:16" | "16:9";
type AgeRange = "toddlers" | "kids" | "tweens" | "adult";
type CoverStyle = "flat" | "illustrated";
type CoverBorder = "framed" | "bleed";

interface QualityScore {
  score: number;
  reason: string;
  pure_bw?: boolean;
  closed_outlines?: boolean;
  on_subject?: boolean;
  subject_size_ok?: boolean;
  anatomy_ok?: boolean;
  no_text?: boolean;
  no_border?: boolean;
}

interface PromptItem {
  id: string;
  name: string;
  subject: string;
  status: "pending" | "queued" | "generating" | "done" | "error";
  dataUrl?: string;
  error?: string;
  quality?: QualityScore | null;
}

export interface Plan {
  title: string;
  coverTitle: string;
  description: string;
  scene: string;
  coverScene: string;
  prompts: { name: string; subject: string }[];
  notes?: string;
}

type Phase = "idea" | "planning" | "review" | "generating" | "paused" | "done";

const ASPECTS: Aspect[] = ["3:4", "1:1", "2:3", "4:3", "3:2"];
const AGE_LABELS: Record<AgeRange, string> = {
  toddlers: "Toddlers 3-6",
  kids: "Kids 6-10",
  tweens: "Tweens 10-14",
  adult: "Adults",
};

// Stopwords stripped before noun-overlap matching. Anything 4+ chars that
// isn't here counts as a candidate "key noun" for the chain decision.
const NOUN_OVERLAP_STOPWORDS = new Set([
  "with", "from", "into", "that", "this", "have", "been", "they", "them",
  "their", "there", "where", "what", "when", "which", "while", "some",
  "page", "scene", "show", "shows", "showing", "draw", "drawn", "drawing",
  "coloring", "color", "colour", "book", "kids", "child", "children",
  "simple", "detailed", "outline", "outlines", "background", "white",
  "black", "happy", "smiling", "cute", "playing", "sitting", "standing",
]);

function extractKeyNouns(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !NOUN_OVERLAP_STOPWORDS.has(w)),
  );
}

function shareKeyNoun(a: string, b: string): boolean {
  const aSet = extractKeyNouns(a);
  if (aSet.size === 0) return false;
  for (const w of extractKeyNouns(b)) if (aSet.has(w)) return true;
  return false;
}

function statusToPageStatus(
  s: "pending" | "queued" | "generating" | "done" | "error",
): PageStatus {
  return s;
}

function buildRefineBookContext(args: {
  plan: Plan;
  items: PromptItem[];
  cover: { status: "pending" | "generating" | "done" | "error"; dataUrl?: string };
  backCover: { status: "pending" | "generating" | "done" | "error"; dataUrl?: string };
  age: AgeRange;
  target: {
    context: "cover" | "back-cover" | "page";
    id: string;
    title?: string;
  };
}): RefineBookContextProp {
  const pages: PageMeta[] = args.items.map((it, i) => ({
    id: it.id,
    index: i + 1,
    name: it.name,
    subject: it.subject,
    status: statusToPageStatus(it.status),
  }));
  const targetSubject =
    args.target.context === "cover"
      ? args.plan.coverScene
      : args.target.context === "back-cover"
        ? args.plan.description
        : args.items.find((it) => it.id === args.target.id)?.subject;
  const targetLabel =
    args.target.context === "cover"
      ? "Front cover"
      : args.target.context === "back-cover"
        ? "Back cover"
        : args.target.title ?? `Page ${pages.findIndex((p) => p.id === args.target.id) + 1}`;
  return {
    bookTitle: args.plan.coverTitle ?? args.plan.title,
    bookScene: args.plan.scene,
    audience: AGE_LABELS[args.age],
    targetId: args.target.id || args.target.context,
    targetLabel,
    targetSubject,
    pages,
    coverStatus: args.cover.status,
    backCoverStatus: args.backCover.status,
  };
}

export function BookStudio({
  initialPlan,
  initialAge,
  initialReference,
  initialMode,
}: {
  /**
   * If provided, BookStudio skips the "describe your book" idea phase and
   * lands directly in the review phase with this plan loaded. Used by the
   * playground chat → bulk-book inline handoff so users don't lose their
   * AI-generated brief.
   */
  initialPlan?: Plan;
  initialAge?: AgeRange;
  /**
   * Reference image dataUrl forwarded from the chat → bulk handoff. When
   * present, BookStudio pre-loads it as the page-generation reference so
   * Sparky's reference-led prompt path runs out of the box.
   */
  initialReference?: string;
  /**
   * Chat origin — determines whether style-chaining runs by default.
   * Story mode has recurring characters/world → chain ON. Q&A mode has
   * unrelated subjects per page → chain OFF, with a noun-overlap fallback
   * that turns it back ON when two pages share a key noun (e.g. both
   * mention "lion" in a "20 different lions" Q&A book).
   */
  initialMode?: "qa" | "story";
} = {}) {
  const [phase, setPhase] = useState<Phase>(initialPlan ? "review" : "idea");
  const [idea, setIdea] = useState("");
  const [pageCount, setPageCount] = useState(20);
  const [age, setAge] = useState<AgeRange>(initialAge ?? "toddlers");
  const [aspectRatio, setAspectRatio] = useState<Aspect>("3:4");
  const [reference, setReference] = useState<string | null>(
    initialReference ?? null,
  );
  // Default to "qa" when no chat mode is provided (manual idea → plan path).
  // Q&A is the safer default because it suppresses chaining unless a noun
  // overlap proves recurring characters; Story would force chaining on
  // unrelated subjects.
  const [mode] = useState<"qa" | "story">(initialMode ?? "qa");

  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(initialPlan ?? null);

  const [items, setItems] = useState<PromptItem[]>(
    initialPlan
      ? initialPlan.prompts.map((p, i) => ({
          id: `seed.${String(i + 1).padStart(2, "0")}`,
          name: p.name,
          subject: p.subject,
          status: "pending" as const,
        }))
      : [],
  );
  const [cover, setCover] = useState<{
    status: "pending" | "generating" | "done" | "error";
    dataUrl?: string;
    error?: string;
    quality?: QualityScore | null;
  }>({
    status: "pending",
  });
  const [coverStyle, setCoverStyle] = useState<CoverStyle>("flat");
  const [coverBorder, setCoverBorder] = useState<CoverBorder>("framed");
  const [backCover, setBackCover] = useState<{
    status: "pending" | "generating" | "done" | "error";
    dataUrl?: string;
    error?: string;
    quality?: QualityScore | null;
  }>({ status: "pending" });
  // "This Book Belongs To" page — auto-generated right after the front
  // cover succeeds. Style toggle in the IdeaForm picks bw (kid colors it)
  // or color (parent fills the name in pen). Position in the PDF is
  // page 2 (between the cover and the first content page).
  const [belongsTo, setBelongsTo] = useState<{
    status: "pending" | "generating" | "done" | "error";
    dataUrl?: string;
    error?: string;
    quality?: QualityScore | null;
  }>({ status: "pending" });
  const [belongsToStyle, setBelongsToStyle] = useState<"bw" | "color">("bw");
  // Character lock — extracted ONCE from the front cover by GPT-5.5 Vision
  // and injected into every subsequent page-generation prompt so recurring
  // characters stay visually identical across all 20 pages (same body
  // shape, same proportions, same distinguishing features). Without this
  // Gemini drifts (cover: fat tabby cat → page 7: skinny orange cat) and
  // KDP reviewers reject the book.
  const [characterLock, setCharacterLock] = useState<{
    status: "pending" | "extracting" | "done" | "error";
    block?: string;
    error?: string;
  }>({ status: "pending" });
  const [qualityCheck, setQualityCheck] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pdfBuilding, setPdfBuilding] = useState(false);

  const pausedRef = useRef(false);
  const cancelRef = useRef(false);
  const runningRef = useRef(false);

  // ---------- Session-storage persistence ----------
  // Restore a previous in-progress book on mount (only when not seeded by chat).
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (initialPlan) {
      hydratedRef.current = true;
      return;
    }
    const restored = readSession<{
      phase: Phase;
      plan: Plan | null;
      items: PromptItem[];
      cover: typeof cover;
      backCover: typeof backCover;
      age: AgeRange;
      aspectRatio: Aspect;
      coverStyle: CoverStyle;
      coverBorder: CoverBorder;
    }>("book-studio");
    if (restored && restored.plan) {
      setPlan(restored.plan);
      setItems(restored.items ?? []);
      setCover(restored.cover ?? { status: "pending" });
      setBackCover(restored.backCover ?? { status: "pending" });
      setAge(restored.age ?? "toddlers");
      setAspectRatio(restored.aspectRatio ?? "3:4");
      setCoverStyle(restored.coverStyle ?? "flat");
      setCoverBorder(restored.coverBorder ?? "framed");
      // Always land in review (don't auto-resume mid-generation).
      setPhase(restored.phase === "done" ? "done" : "review");
    }
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save a snapshot whenever the working state changes (debounced via timeout).
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!plan) return;
    const t = setTimeout(() => {
      writeSession("book-studio", {
        phase,
        plan,
        items,
        cover,
        backCover,
        age,
        aspectRatio,
        coverStyle,
        coverBorder,
      });
    }, 500);
    return () => clearTimeout(t);
  }, [phase, plan, items, cover, backCover, age, aspectRatio, coverStyle, coverBorder]);

  // Wipe stored snapshot when the user fully resets back to "idea".
  function clearStoredBook() {
    clearSession("book-studio");
  }

  // refine modal
  const [refine, setRefine] = useState<{
    open: boolean;
    context: "cover" | "back-cover" | "page";
    /** Stable id of the thing being refined — "cover" / "back-cover" / item.id. */
    targetId: string;
    dataUrl?: string;
    title?: string;
    subtitle?: string;
    downloadName?: string;
    onRefined?: (dataUrl: string) => void;
    quality?: QualityScore | null;
  }>({ open: false, context: "page", targetId: "" });

  // Toggle: carousel grid vs inline page-flip book preview
  const [viewMode, setViewMode] = useState<"carousel" | "book">("carousel");

  // Pre-fetch the react-pageflip chunk on mount so the first "Book preview"
  // click doesn't trigger a dynamic-import flash + layout shift.
  useEffect(() => {
    prefetchBookFlip();
  }, []);

  // KDP metadata
  const [kdpMetadata, setKdpMetadata] = useState<KdpMetadata | null>(null);
  const [kdpLoading, setKdpLoading] = useState(false);
  const [kdpError, setKdpError] = useState<string | null>(null);
  const [kdpProvider, setKdpProvider] = useState<MetadataProvider>("gemini");

  const generateMetadata = useCallback(async () => {
    if (!plan) return;
    setKdpLoading(true);
    setKdpError(null);
    try {
      const res = await fetch("/api/kdp-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle: plan.coverTitle ?? plan.title,
          scene: plan.scene,
          age,
          pageCount: items.length,
          samplePages: items.slice(0, 8).map((it) => it.subject),
          provider: kdpProvider,
        }),
      });
      const json = (await res.json()) as {
        metadata?: KdpMetadata;
        error?: string;
      };
      if (!res.ok || !json.metadata)
        throw new Error(json.error ?? "Metadata generation failed");
      setKdpMetadata(json.metadata);
    } catch (e) {
      setKdpError(e instanceof Error ? e.message : "Metadata generation failed");
    } finally {
      setKdpLoading(false);
    }
  }, [plan, age, items, kdpProvider]);

  const runPlan = useCallback(async () => {
    const trimmed = idea.trim();
    if (trimmed.length < 10) {
      setPlanError("Describe the book in at least 10 characters.");
      return;
    }
    setPlanError(null);
    setPlanning(true);
    setPhase("planning");
    try {
      const res = await fetch("/api/plan-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: trimmed, pageCount, age }),
      });
      const json = (await res.json()) as { plan?: Plan; error?: string };
      if (!res.ok || !json.plan) throw new Error(json.error || "Planning failed");
      setPlan(json.plan);
      setItems(
        json.plan.prompts.map((p, i) => ({
          id: `p${String(i + 1).padStart(2, "0")}`,
          name: p.name,
          subject: p.subject,
          status: "pending",
        }))
      );
      setCover({ status: "pending" });
      setCurrentIndex(0);
      setPhase("review");
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : "Failed to plan book");
      setPhase("idea");
    } finally {
      setPlanning(false);
    }
  }, [idea, pageCount, age]);

  const updateItem = (id: string, patch: Partial<PromptItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const updatePromptText = (id: string, patch: { name?: string; subject?: string }) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const removeItem = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));

  const reset = () => {
    cancelRef.current = true;
    runningRef.current = false;
    pausedRef.current = false;
    setPhase("idea");
    setPlan(null);
    setItems([]);
    setCover({ status: "pending" });
    setBackCover({ status: "pending" });
    setCurrentIndex(0);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const generateCover = useCallback(async () => {
    if (!plan) return;
    setCover({ status: "generating" });
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "cover",
          coverTitle: plan.coverTitle,
          coverScene: plan.coverScene,
          coverStyle,
          coverBorder,
          // No referenceDataUrl for the FRONT cover — user feedback removed
          // it. Only the back cover uses the front cover as a style ref.
          qualityGate: qualityCheck,
        }),
      });
      const json = (await res.json()) as {
        dataUrl?: string;
        error?: string;
        quality?: QualityScore | null;
      };
      if (!res.ok || !json.dataUrl) throw new Error(json.error || "Cover failed");
      setCover({ status: "done", dataUrl: json.dataUrl, quality: json.quality ?? null });
    } catch (e) {
      setCover({ status: "error", error: e instanceof Error ? e.message : "Cover failed" });
      throw e;
    }
  }, [plan, coverStyle, coverBorder, qualityCheck]);

  const generateBackCover = useCallback(async () => {
    if (!plan) return;
    if (!cover.dataUrl) {
      setBackCover({
        status: "error",
        error: "Generate the front cover first — back cover matches its style.",
      });
      return;
    }
    setBackCover({ status: "generating" });
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "back-cover",
          coverTitle: plan.coverTitle,
          coverScene: plan.coverScene,
          backCoverDescription: plan.description,
          coverStyle,
          coverBorder,
          // Pass front cover as STYLE REFERENCE so back cover matches palette/style.
          referenceDataUrl: cover.dataUrl,
          qualityGate: qualityCheck,
        }),
      });
      const json = (await res.json()) as {
        dataUrl?: string;
        error?: string;
        quality?: QualityScore | null;
      };
      if (!res.ok || !json.dataUrl) throw new Error(json.error || "Back cover failed");
      setBackCover({ status: "done", dataUrl: json.dataUrl, quality: json.quality ?? null });
    } catch (e) {
      setBackCover({
        status: "error",
        error: e instanceof Error ? e.message : "Back cover failed",
      });
    }
  }, [plan, cover.dataUrl, coverStyle, coverBorder, qualityCheck]);

  // Character locker — runs ONCE per book right after the cover succeeds.
  // Reads the cover image with GPT-5.5 Vision and produces a
  // CHARACTER LOCK descriptor block. The block is injected into every
  // subsequent page-generation prompt so recurring characters look
  // identical across all pages. Failures are non-blocking: pages still
  // generate, but without the lock the cat may look different page-to-page.
  const extractCharacterLock = useCallback(async () => {
    if (!plan || !cover.dataUrl) return;
    setCharacterLock({ status: "extracting" });
    try {
      const res = await fetch("/api/extract-characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coverDataUrl: cover.dataUrl,
          bookTitle: plan.coverTitle ?? plan.title,
        }),
      });
      const json = (await res.json()) as {
        lockBlock?: string;
        error?: string;
      };
      if (!res.ok || !json.lockBlock) {
        throw new Error(json.error || "Character extraction failed");
      }
      setCharacterLock({ status: "done", block: json.lockBlock });
    } catch (e) {
      setCharacterLock({
        status: "error",
        error: e instanceof Error ? e.message : "Character extraction failed",
      });
    }
  }, [plan, cover.dataUrl]);

  // "This Book Belongs To" page — corner cameos pull from the first 1-3
  // page subjects so the characters match the actual book contents.
  const generateBelongsToPage = useCallback(async () => {
    if (!plan) return;
    setBelongsTo({ status: "generating" });
    try {
      // Build a compact characters string from the first few page subjects.
      // The prompt template uses this as the cameo subject list.
      const characterSubjects = items
        .slice(0, 3)
        .map((it) => it.subject)
        .filter(Boolean)
        .join("; ");
      const characters =
        characterSubjects ||
        plan.coverScene ||
        "two friendly cartoon characters from the book";
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "belongs-to",
          coverTitle: plan.coverTitle,
          belongsToCharacters: characters,
          belongsToStyle,
          // CHARACTER MATCHING — three reinforcing signals so the corner
          // cameos genuinely match the cover (not a "kind-of-similar cat"):
          //   (1) textual character lock extracted from the cover
          //   (2) cover image itself as visual chain reference — Gemini
          //       sees the actual colors, proportions, and pose of the
          //       characters it must replicate
          //   (3) prompt-side directive (in BELONGS_TO_PROMPT_TEMPLATE)
          //       that prefers the lock over the generic characters list
          characterLock: characterLock.block,
          chainReferenceDataUrl: cover.dataUrl,
          qualityGate: qualityCheck,
        }),
      });
      const json = (await res.json()) as {
        dataUrl?: string;
        error?: string;
        quality?: QualityScore | null;
      };
      if (!res.ok || !json.dataUrl)
        throw new Error(json.error || "Belongs-to page failed");
      setBelongsTo({
        status: "done",
        dataUrl: json.dataUrl,
        quality: json.quality ?? null,
      });
    } catch (e) {
      setBelongsTo({
        status: "error",
        error: e instanceof Error ? e.message : "Belongs-to page failed",
      });
    }
  }, [
    plan,
    items,
    belongsToStyle,
    qualityCheck,
    characterLock.block,
    cover.dataUrl,
  ]);

  const generatePage = useCallback(
    async (
      item: PromptItem,
      improvementHint?: string,
      chainReferenceDataUrl?: string,
    ): Promise<string | undefined> => {
      if (!plan) return undefined;
      updateItem(item.id, { status: "generating", error: undefined });
      try {
        // When regenerating after a low quality score, append the prior
        // failure reason as an explicit "fix this" directive so the new
        // attempt targets the flaw rather than producing a same-or-worse
        // variation. Also bump the variantSeed so we don't get an
        // identical re-render.
        const flawSuffix = improvementHint
          ? ` (PREVIOUS ATTEMPT WAS POOR — vision rater said: "${improvementHint}". The new image MUST fix this specific issue.)`
          : "";
        const seed = improvementHint
          ? `${item.id}#${Date.now().toString(36)}`
          : item.id;
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "subject",
            subject: item.subject + flawSuffix,
            age,
            detail: "simple",
            background: "scene",
            aspectRatio,
            scene: plan.scene,
            variantSeed: seed,
            referenceDataUrl: reference ?? undefined,
            chainReferenceDataUrl,
            characterLock: characterLock.block,
            qualityGate: qualityCheck,
          }),
        });
        const json = (await res.json()) as {
          dataUrl?: string;
          error?: string;
          quality?: QualityScore | null;
        };
        if (!res.ok || !json.dataUrl) throw new Error(json.error || "Page failed");
        updateItem(item.id, {
          status: "done",
          dataUrl: json.dataUrl,
          quality: json.quality ?? null,
        });
        return json.dataUrl;
      } catch (e) {
        updateItem(item.id, {
          status: "error",
          error: e instanceof Error ? e.message : "Failed",
        });
        return undefined;
      }
    },
    [plan, age, aspectRatio, reference, qualityCheck, characterLock.block]
  );

  // Manual regenerations (from refine modal / regen card button) — pick any
  // other already-done page as the chain anchor, but only USE it when the
  // gate allows: Story mode always chains; Q&A only chains when the
  // regenerated page shares a key noun with the anchor (so a "20 different
  // lions" Q&A book still gets character consistency across re-rolls).
  const regeneratePage = useCallback(
    async (item: PromptItem, improvementHint?: string) => {
      const anchorItem = items.find(
        (it) => it.id !== item.id && it.status === "done" && it.dataUrl,
      );
      const useChain =
        anchorItem &&
        (mode === "story" || shareKeyNoun(anchorItem.subject, item.subject));
      await generatePage(
        item,
        improvementHint,
        useChain ? anchorItem.dataUrl : undefined,
      );
    },
    [items, generatePage, mode],
  );

  const startGeneration = useCallback(async () => {
    if (runningRef.current || !plan) return;
    runningRef.current = true;
    cancelRef.current = false;
    pausedRef.current = false;
    setPhase("generating");

    try {
      // Cover first (if not already done)
      if (cover.status !== "done") {
        await generateCover().catch(() => {});
        if (cancelRef.current) {
          runningRef.current = false;
          return;
        }
      }

      // Character locker — runs once right after the cover so every
      // subsequent page injects the same recurring-character descriptors
      // and KDP doesn't see "fat cat on cover, skinny cat on page 7".
      // Non-blocking: pages still generate if extraction fails.
      if (characterLock.status !== "done") {
        await extractCharacterLock().catch(() => {});
        if (cancelRef.current) {
          runningRef.current = false;
          return;
        }
      }

      // "This Book Belongs To" page — auto-generated right after the
      // cover step (the belongs-to prompt doesn't depend on the cover
      // image, so we don't gate on cover.status; cover.status here is
      // stale from the closure anyway). Don't block the run on failure
      // — surfaced as an error in the carousel for manual regen.
      if (belongsTo.status !== "done") {
        await generateBelongsToPage().catch(() => {});
        if (cancelRef.current) {
          runningRef.current = false;
          return;
        }
      }

      // Pages sequentially. CHARACTER ANCHOR PRIORITY:
      //   1. The COVER (when generated) — canonical character reference,
      //      so every page can match the same black cat / fat tabby etc.
      //      that appears on the cover. This is the single biggest fix
      //      for character drift across pages.
      //   2. First successfully generated INTERIOR page — fallback when
      //      the cover isn't available (shouldn't happen since startGeneration
      //      generates cover first).
      // Whether we actually PASS the anchor to a given page depends on
      // the chain gate: Story mode → always; Q&A mode → only when the
      // page shares a key noun with the anchor (so an unrelated subject
      // — e.g. "rocket" page in a "20 different animals" Q&A book — doesn't
      // inherit the anchor's character).
      const seedDone = items.find((it) => it.status === "done" && it.dataUrl);
      let anchor: { dataUrl: string; subject: string } | undefined = cover.dataUrl
        ? {
            dataUrl: cover.dataUrl,
            subject: plan.coverScene ?? plan.title ?? "cover",
          }
        : seedDone?.dataUrl
          ? { dataUrl: seedDone.dataUrl, subject: seedDone.subject }
          : undefined;
      for (let i = 0; i < items.length; i++) {
        if (cancelRef.current) break;
        // wait while paused
        while (pausedRef.current && !cancelRef.current) {
          await new Promise((r) => setTimeout(r, 200));
        }
        if (cancelRef.current) break;
        setCurrentIndex(i);
        const item = items[i];
        if (item.status === "done") {
          continue;
        }
        // When the cover is the anchor, ALWAYS chain (the cover IS the
        // canonical character spec for this book — no noun-overlap
        // guard needed). Otherwise fall back to the per-page Q&A gate.
        const coverIsAnchor =
          !!cover.dataUrl && anchor?.dataUrl === cover.dataUrl;
        const useChain =
          anchor &&
          (coverIsAnchor ||
            mode === "story" ||
            shareKeyNoun(anchor.subject, item.subject));
        const dataUrl = await generatePage(
          item,
          undefined,
          useChain ? anchor!.dataUrl : undefined,
        );
        if (dataUrl && !anchor) {
          anchor = { dataUrl, subject: item.subject };
        }
      }

      setPhase(cancelRef.current ? "review" : "done");
    } finally {
      runningRef.current = false;
    }
  }, [
    plan,
    cover.status,
    cover.dataUrl,
    belongsTo.status,
    characterLock.status,
    items,
    generateCover,
    extractCharacterLock,
    generateBelongsToPage,
    generatePage,
    mode,
  ]);

  const pause = () => {
    pausedRef.current = true;
    setPhase("paused");
  };
  const resume = () => {
    pausedRef.current = false;
    if (!runningRef.current) void startGeneration();
    else setPhase("generating");
  };
  const cancel = () => {
    cancelRef.current = true;
    pausedRef.current = false;
    runningRef.current = false;
    setPhase("review");
  };

  const downloadZip = useCallback(async () => {
    const done = items.filter((i) => i.status === "done" && i.dataUrl);
    if (done.length === 0 && cover.status !== "done") return;
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    if (cover.status === "done" && cover.dataUrl) {
      zip.file("00_cover.png", cover.dataUrl.split(",")[1], { base64: true });
    }
    for (const item of done) {
      const safe = item.name.replace(/[^a-z0-9]+/gi, "_");
      zip.file(`${item.id}_${safe}.png`, item.dataUrl!.split(",")[1], { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(plan?.coverTitle ?? "coloring-book").replace(/[^a-z0-9]+/gi, "_")}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [items, cover, plan]);

  const downloadPdf = useCallback(async () => {
    const done = items.filter((i) => i.status === "done" && i.dataUrl);
    if (done.length === 0 || cover.status !== "done") return;
    setPdfBuilding(true);
    try {
      const res = await fetch("/api/assemble-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: plan?.title,
          category: plan?.coverTitle ?? "book",
          cover: { dataUrl: cover.dataUrl },
          belongsTo:
            belongsTo.status === "done" && belongsTo.dataUrl
              ? { dataUrl: belongsTo.dataUrl, style: belongsToStyle }
              : undefined,
          backCover:
            backCover.status === "done" && backCover.dataUrl
              ? { dataUrl: backCover.dataUrl }
              : undefined,
          pages: done.map((d) => ({ id: d.id, name: d.name, dataUrl: d.dataUrl })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "PDF failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(plan?.coverTitle ?? "book").replace(/[^a-z0-9]+/gi, "_")}_KDP.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "PDF assembly failed");
    } finally {
      setPdfBuilding(false);
    }
  }, [items, cover, backCover, belongsTo, belongsToStyle, plan]);

  const progress = useMemo(() => {
    const total = items.length + 1; // +1 for cover
    const doneCount =
      items.filter((i) => i.status === "done").length + (cover.status === "done" ? 1 : 0);
    return { doneCount, total };
  }, [items, cover]);

  const allDone = progress.doneCount === progress.total && progress.total > 0;

  if (phase === "idea" || phase === "planning") {
    return (
      <IdeaForm
        idea={idea}
        setIdea={setIdea}
        pageCount={pageCount}
        setPageCount={setPageCount}
        age={age}
        setAge={setAge}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        reference={reference}
        setReference={setReference}
        planning={planning}
        onPlan={runPlan}
        error={planError}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan summary + controls */}
      {plan && (
        <div className="rounded-3xl p-6 md:p-8 bg-linear-to-br from-violet-500 via-indigo-400 to-cyan-400 text-white shadow-xl shadow-violet-500/30 relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-20" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white mb-2">
                  <BookPlus className="w-3 h-3" /> AI-planned · {AGE_LABELS[age]}
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-bold leading-tight">
                  {plan.coverTitle}
                </h2>
                <p className="mt-2 text-white/90 text-sm md:text-base max-w-2xl">
                  {plan.description}
                </p>
                {plan.notes && (
                  <p className="mt-2 text-[11px] text-white/70 italic">
                    <Lightbulb className="inline w-3 h-3 mr-1 mb-0.5" />
                    {plan.notes}
                  </p>
                )}
                <p className="mt-3 text-white/80 text-xs font-mono">
                  {progress.doneCount}/{progress.total} generated · cover{" "}
                  {cover.status === "done" ? "✓" : "pending"} · character-lock{" "}
                  {characterLock.status === "done"
                    ? "✓"
                    : characterLock.status === "extracting"
                      ? "…"
                      : characterLock.status === "error"
                        ? "⚠"
                        : "pending"}
                </p>
                {characterLock.status === "error" && (
                  <button
                    type="button"
                    onClick={() => void extractCharacterLock()}
                    className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-white/10 text-white hover:bg-white/20 border border-white/30"
                    title={characterLock.error}
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry character lock
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {phase === "review" && (
                  <>
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={qualityCheck}
                        onChange={(e) => setQualityCheck(e.target.checked)}
                        className="w-3.5 h-3.5 accent-violet-400 cursor-pointer"
                      />
                      AI quality check{" "}
                      <span className="text-white/60 text-[10px]">
                        ({qualityCheck ? "+~2s/page" : "off — faster"})
                      </span>
                    </label>
                    <button
                      onClick={startGeneration}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-white text-violet-700 hover:bg-violet-50 shadow-md"
                    >
                      <Play className="w-4 h-4" /> Start generating
                    </button>
                  </>
                )}
                {phase === "generating" && (
                  <>
                    <button
                      onClick={pause}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-white/10 text-white hover:bg-white/20 backdrop-blur border border-white/30"
                    >
                      <Pause className="w-4 h-4" /> Pause
                    </button>
                    <button
                      onClick={cancel}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-red-500/20 text-red-100 hover:bg-red-500/30 border border-red-500/40"
                    >
                      <Square className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </>
                )}
                {phase === "paused" && (
                  <>
                    <button
                      onClick={resume}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-white text-violet-700 hover:bg-violet-50 shadow-md"
                    >
                      <Play className="w-4 h-4" /> Resume
                    </button>
                    <button
                      onClick={cancel}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-red-500/20 text-red-100 hover:bg-red-500/30 border border-red-500/40"
                    >
                      <Square className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </>
                )}
                {(phase === "done" || phase === "review") && allDone && (
                  <DownloadMenu
                    onPdf={downloadPdf}
                    onZip={downloadZip}
                    pdfBuilding={pdfBuilding}
                  />
                )}
                <button
                  onClick={reset}
                  disabled={pdfBuilding}
                  title={
                    pdfBuilding
                      ? "Wait for the download to finish"
                      : "Start over with a new idea"
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-sm font-medium bg-white/5 text-white hover:bg-white/15 border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Start new book
                </button>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-4 h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
              <motion.div
                className="h-full bg-white"
                animate={{ width: `${(progress.doneCount / Math.max(1, progress.total)) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Cover pair (shared with /generate) — front + back side-by-side */}
      {plan && (
        <CoverPair
          bookSlug={(plan.coverTitle ?? plan.title ?? "book")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")}
          title={plan.coverTitle ?? plan.title ?? "Coloring book"}
          description={plan.description ?? plan.coverScene}
          rightExtras={
            <MockupGate
              frontCoverReady={!!cover.dataUrl}
              pagesReady={progress.doneCount}
              minPages={3}
            >
              <MockupGenerator
                coverDataUrl={cover.dataUrl ?? null}
                interiorDataUrl={
                  items.find((it) => it.status === "done" && it.dataUrl)?.dataUrl
                }
                title={`${plan.coverTitle ?? "Book"} — Amazon mockups`}
                bookName={plan.coverTitle ?? "book"}
              />
            </MockupGate>
          }
          frontCover={cover}
          backCover={backCover}
          coverStyle={coverStyle}
          coverBorder={coverBorder}
          onCoverStyleChange={setCoverStyle}
          onCoverBorderChange={setCoverBorder}
          onRegenerateFront={() => void generateCover()}
          onRegenerateBack={() => void generateBackCover()}
          onRefineFront={(dataUrl) =>
            setRefine({
              open: true,
              context: "cover",
              targetId: "cover",
              dataUrl,
              title: "Cover",
              subtitle:
                "Describe changes. Gemini edits while preserving layout.",
              downloadName: "cover.png",
              onRefined: (d) => setCover({ status: "done", dataUrl: d }),
            })
          }
          onRefineBack={(dataUrl) =>
            setRefine({
              open: true,
              context: "back-cover",
              targetId: "back-cover",
              dataUrl,
              title: "Back cover",
              subtitle:
                "Describe changes. Gemini edits while preserving the tagline box and barcode safe-zone.",
              downloadName: "back-cover.png",
              onRefined: (d) => setBackCover({ status: "done", dataUrl: d }),
            })
          }
          belongsTo={belongsTo}
          belongsToStyle={belongsToStyle}
          onBelongsToStyleChange={setBelongsToStyle}
          onRegenerateBelongsTo={() => void generateBelongsToPage()}
          onRefineBelongsTo={(dataUrl) =>
            setRefine({
              open: true,
              context: "page",
              targetId: "belongs-to",
              dataUrl,
              title: "This Book Belongs To",
              subtitle:
                "Page 2 — auto-generated nameplate. Refine to tweak the banner, characters, or name line.",
              downloadName: "belongs_to.png",
              onRefined: (d) => setBelongsTo({ status: "done", dataUrl: d }),
              quality: belongsTo.quality,
            })
          }
        />
      )}

      {/* Carousel OR inline page-flip book preview — view toggle inline */}
      {plan && allDone && (
        <div className="flex justify-center">
          <div
            role="tablist"
            aria-label="Page view"
            className="inline-flex p-1 rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur"
          >
            <button
              role="tab"
              aria-selected={viewMode === "carousel"}
              onClick={() => setViewMode("carousel")}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                viewMode === "carousel"
                  ? "bg-linear-to-r from-violet-500 to-cyan-400 text-white shadow"
                  : "text-neutral-300 hover:text-white"
              }`}
            >
              <GalleryHorizontal className="w-4 h-4" />
              Carousel
            </button>
            <button
              role="tab"
              aria-selected={viewMode === "book"}
              onClick={() => setViewMode("book")}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                viewMode === "book"
                  ? "bg-linear-to-r from-violet-500 to-cyan-400 text-white shadow"
                  : "text-neutral-300 hover:text-white"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Book preview
            </button>
          </div>
        </div>
      )}
      {plan && (
        <div
          className="rounded-3xl p-4 md:p-6 bg-zinc-900/60 backdrop-blur-xl border border-white/10 relative"
          // Pin a minimum height that fits both the book (≈600px) and the
          // carousel (≈540px). Prevents footer-rises-then-drops flicker
          // when toggling viewMode.
          style={{ minHeight: 620 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {viewMode === "book" && allDone ? (
              <motion.div
                key="book-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex flex-col items-center gap-4 py-4 md:py-6"
              >
                <div className="text-center">
                  <h3 className="font-display text-lg font-bold text-white">
                    {plan.coverTitle ?? plan.title ?? "Coloring book"}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Click a page corner or swipe to flip — opens to a 2-page
                    spread like a real book
                  </p>
                </div>
                <BookFlip
                  cover={{ imageUrl: cover.dataUrl }}
                  backCover={{ imageUrl: backCover.dataUrl }}
                  pages={items.map((it, i) => ({
                    imageUrl: it.dataUrl,
                    label: `${it.name} · Page ${i + 1}`,
                  }))}
                />
              </motion.div>
            ) : viewMode === "carousel" ? (
              <motion.div
                key="carousel-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <Carousel
                  cover={cover}
                  backCover={backCover}
                  items={items}
                  aspectRatio={aspectRatio}
                  coverStyle={coverStyle}
                  coverBorder={coverBorder}
                  onCoverStyleChange={setCoverStyle}
                  onCoverBorderChange={setCoverBorder}
                  onEditPrompt={(id, patch) => updatePromptText(id, patch)}
                  onRemove={removeItem}
                  onRegenerateItem={regeneratePage}
                  onRegenerateCover={generateCover}
                  onRegenerateBackCover={generateBackCover}
                  onOpenRefine={(kind, payload) =>
                    setRefine({ open: true, context: kind, ...payload })
                  }
                  onSetCover={(dataUrl) => setCover({ status: "done", dataUrl })}
                  onSetBackCover={(dataUrl) =>
                    setBackCover({ status: "done", dataUrl })
                  }
                  onSetItem={(id, dataUrl) =>
                    setItems((prev) =>
                      prev.map((it) =>
                        it.id === id
                          ? { ...it, status: "done", dataUrl }
                          : it,
                      ),
                    )
                  }
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      )}

      <ImageRefineModal
        open={refine.open}
        onClose={() => setRefine((r) => ({ ...r, open: false }))}
        context={refine.context}
        sourceDataUrl={refine.dataUrl}
        title={refine.title}
        subtitle={refine.subtitle}
        downloadName={refine.downloadName}
        aspectRatio={aspectRatio}
        onRefined={refine.onRefined}
        quality={refine.quality}
        bookContext={
          plan
            ? buildRefineBookContext({
                plan,
                items,
                cover,
                backCover,
                age,
                target: {
                  context: refine.context,
                  id: refine.targetId,
                  title: refine.title,
                },
              })
            : undefined
        }
        getPageDataUrl={(pageId) => {
          if (pageId === "cover") return cover.dataUrl ?? null;
          if (pageId === "back-cover") return backCover.dataUrl ?? null;
          return items.find((it) => it.id === pageId)?.dataUrl ?? null;
        }}
      />

      {/* Preview-as-book is now inline above (replaces carousel via viewMode toggle). */}

      {plan && allDone && (
        <KdpMetadataPanel
          bookName={plan.coverTitle ?? plan.title ?? "book"}
          pageCount={items.length}
          metadata={kdpMetadata}
          loading={kdpLoading}
          error={kdpError}
          provider={kdpProvider}
          onProviderChange={setKdpProvider}
          onGenerate={() => void generateMetadata()}
        />
      )}
      {plan && !allDone && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-xs text-violet-200">
          🔒 KDP Metadata generator unlocks once all {items.length} pages are
          generated. Currently {progress.doneCount}/{progress.total} done.
        </div>
      )}
    </div>
  );
}

// =============================================================================
// IdeaForm — Phase 1: user describes the book
// =============================================================================

function IdeaForm({
  idea,
  setIdea,
  pageCount,
  setPageCount,
  age,
  setAge,
  aspectRatio,
  setAspectRatio,
  reference,
  setReference,
  planning,
  onPlan,
  error,
}: {
  idea: string;
  setIdea: (v: string) => void;
  pageCount: number;
  setPageCount: (v: number) => void;
  age: AgeRange;
  setAge: (v: AgeRange) => void;
  aspectRatio: Aspect;
  setAspectRatio: (v: Aspect) => void;
  reference: string | null;
  setReference: (v: string | null) => void;
  planning: boolean;
  onPlan: () => void;
  error: string | null;
}) {
  const [showIdeas, setShowIdeas] = useState(false);

  return (
    <div className="rounded-3xl p-6 md:p-8 bg-zinc-900/60 backdrop-blur-xl border border-white/10 space-y-6">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <label className="block text-sm font-semibold text-neutral-200">
            Your book idea <span className="text-violet-400">*</span>
          </label>
          <button
            type="button"
            onClick={() => setShowIdeas((v) => !v)}
            disabled={planning}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-linear-to-r from-violet-500/15 to-cyan-500/15 border border-violet-500/40 text-violet-200 hover:from-violet-500/25 hover:to-cyan-500/25 disabled:opacity-50 transition-colors"
          >
            <Lightbulb className="w-3 h-3" />
            {showIdeas ? "Hide ideas" : "Show me ideas"}
          </button>
        </div>
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="e.g. A coloring book for ages 3-6 about space adventures — astronauts, rockets, planets, friendly aliens. 20 unique pages."
          rows={5}
          className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white text-sm placeholder:text-neutral-500 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 resize-y min-h-[120px]"
          disabled={planning}
        />
        {showIdeas && (
          <div className="mt-3">
            <IdeaSuggestionsPanel
              open={showIdeas}
              onClose={() => setShowIdeas(false)}
              onPick={(text) => setIdea(text)}
            />
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-neutral-200 mb-2">
            Page count <span className="font-mono text-violet-300">{pageCount}</span>
          </label>
          <input
            type="range"
            min={5}
            max={50}
            step={1}
            value={pageCount}
            onChange={(e) => setPageCount(Number(e.target.value))}
            disabled={planning}
            className="w-full accent-violet-500"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-1">
            <span>5</span>
            <span>20 (standard)</span>
            <span>50</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-neutral-200 mb-2">Audience</label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(AGE_LABELS) as [AgeRange, string][]).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setAge(v)}
                disabled={planning}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border",
                  v === age
                    ? "bg-linear-to-r from-violet-500 to-cyan-400 text-white border-transparent shadow"
                    : "bg-black/40 border-white/10 text-neutral-300 hover:border-violet-500/40"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-neutral-200 mb-2">Aspect ratio</label>
          <div className="flex flex-wrap gap-1.5">
            {ASPECTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAspectRatio(a)}
                disabled={planning}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-mono border",
                  a === aspectRatio
                    ? "bg-linear-to-r from-violet-500 to-cyan-400 text-white border-transparent shadow"
                    : "bg-black/40 border-white/10 text-neutral-300 hover:border-violet-500/40"
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ReferenceImageField
        value={reference}
        onChange={setReference}
        helper="Optional: Gemini will borrow style, palette, and composition from this image for both cover and pages."
      />

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-300">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={onPlan}
        disabled={planning || idea.trim().length < 10}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-linear-to-r from-violet-500 via-indigo-400 to-cyan-400 shadow-lg shadow-violet-500/40 hover:shadow-xl hover:shadow-violet-500/60 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {planning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Planning your book…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Plan my book with AI
          </>
        )}
      </button>
      <p className="text-[11px] text-center text-neutral-500">
        Gemini will draft a title, cover scene, and {pageCount} page prompts. You can review + edit before generation starts.
      </p>
    </div>
  );
}

// =============================================================================
// Carousel — live view of cover + pages (Apple cards style)
// =============================================================================

interface CarouselProps {
  cover: {
    status: "pending" | "generating" | "done" | "error";
    dataUrl?: string;
    error?: string;
    quality?: QualityScore | null;
  };
  backCover: {
    status: "pending" | "generating" | "done" | "error";
    dataUrl?: string;
    error?: string;
    quality?: QualityScore | null;
  };
  items: PromptItem[];
  aspectRatio: Aspect;
  coverStyle: CoverStyle;
  coverBorder: CoverBorder;
  onCoverStyleChange: (s: CoverStyle) => void;
  onCoverBorderChange: (b: CoverBorder) => void;
  onEditPrompt: (id: string, patch: { name?: string; subject?: string }) => void;
  onRemove: (id: string) => void;
  onRegenerateItem: (item: PromptItem, improvementHint?: string) => Promise<void>;
  onRegenerateCover: () => Promise<void>;
  onRegenerateBackCover: () => Promise<void>;
  onOpenRefine: (
    kind: "cover" | "back-cover" | "page",
    payload: {
      /** Stable id of the thing being refined (e.g. item.id, "cover", "back-cover"). */
      targetId: string;
      dataUrl: string;
      title: string;
      subtitle?: string;
      downloadName: string;
      onRefined: (d: string) => void;
      quality?: QualityScore | null;
    }
  ) => void;
  onSetCover: (dataUrl: string) => void;
  onSetBackCover: (dataUrl: string) => void;
  onSetItem: (id: string, dataUrl: string) => void;
}

function Carousel({
  cover,
  backCover,
  items,
  aspectRatio,
  coverStyle,
  coverBorder,
  onCoverStyleChange,
  onCoverBorderChange,
  onEditPrompt,
  onRemove,
  onRegenerateItem,
  onRegenerateCover,
  onRegenerateBackCover,
  onOpenRefine,
  onSetCover,
  onSetBackCover,
  onSetItem,
}: CarouselProps) {
  const cards = useMemo<React.ReactNode[]>(() => {
    // Covers are rendered separately above the carousel via <CoverPair>.
    // The apple carousel only holds the interior page cards now.
    return items.map((it, i) => {
      const card: CardData = {
        title: it.name,
        category: `Page ${i + 1} / ${items.length}`,
        cover: (
          <PageCover
            status={it.status}
            dataUrl={it.dataUrl}
            message={it.error ?? it.name}
            aspectClass={aspectRatio.replace(":", " / ")}
            showFrame
          />
        ),
        badge:
          it.status === "done" && it.quality ? (
            <QualityBadge quality={it.quality} />
          ) : (
            <StatusBadge status={it.status} />
          ),
        action:
          it.status === "done" ? (
            <RegenerateCardButton
              quality={it.quality}
              busy={false}
              onClick={(hint) => void onRegenerateItem(it, hint)}
            />
          ) : null,
        // content is unused now (we override onClick to open the existing
        // ImageRefineModal directly), but keep it as a fallback.
        content: null,
      };

      const handleClick = () => {
        if (it.status === "done" && it.dataUrl) {
          onOpenRefine("page", {
            targetId: it.id,
            dataUrl: it.dataUrl,
            title: it.name,
            subtitle: `Page ${i + 1} · ${it.id}`,
            downloadName: `${it.id}_${it.name.replace(/[^a-z0-9]+/gi, "_")}.png`,
            onRefined: (d) => onSetItem(it.id, d),
            quality: it.quality,
          });
        } else {
          // Not yet generated → trigger a generate on click instead
          void onRegenerateItem(it);
        }
      };

      return (
        <AppleCard
          key={`card-${i}-${card.title}`}
          card={card}
          index={i}
          onClick={handleClick}
        />
      );
    });
  }, [items, aspectRatio, onRegenerateItem, onOpenRefine, onSetItem]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-2">
        <p className="text-sm font-semibold text-white">
          {items.length} interior pages
        </p>
        <p className="text-xs text-neutral-500">Tap a card to refine · covers shown above</p>
      </div>
      <AppleCarousel items={cards} />
    </div>
  );
}

// ----- Card cover (small face shown in the carousel scroll) -----
function PageCover({
  status,
  dataUrl,
  message,
  aspectClass,
  showFrame = false,
}: {
  status: PromptItem["status"] | "pending" | "generating" | "done" | "error";
  dataUrl?: string;
  message?: string;
  aspectClass: string;
  showFrame?: boolean;
}) {
  if (status === "done" && dataUrl) {
    return (
      <div className="absolute inset-0 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dataUrl}
          alt={message ?? ""}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ aspectRatio: aspectClass }}
        />
        {showFrame && <ColoringBorder />}
      </div>
    );
  }
  // status === "done" but dataUrl missing — happens after a sessionStorage
  // quota fallback dropped large image bytes on refresh. Show a clear
  // prompt to regenerate (instead of a confusing "Pending" wand state).
  if (status === "done" && !dataUrl) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-amber-950/30 text-amber-200 p-4 text-center">
        <RefreshCw className="w-7 h-7" />
        <p className="text-xs font-semibold">Image cleared from cache</p>
        <p className="text-[10px] opacity-80 max-w-[20ch]">
          Tap the card and click Regenerate to recreate it
        </p>
      </div>
    );
  }
  if (status === "generating" || status === "queued") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-violet-950/40 text-violet-200">
        <Loader2 className="w-7 h-7 animate-spin" />
        <p className="text-xs font-medium px-3 text-center">
          {message ?? "Generating…"}
        </p>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-950/40 text-red-200 p-4 text-center">
        <XCircle className="w-7 h-7" />
        <p className="text-xs">{message ?? "Failed"}</p>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-linear-to-br from-zinc-800 to-zinc-900 text-neutral-400">
      <Wand2 className="w-7 h-7" />
      <p className="text-xs font-medium px-3 text-center max-w-[12ch] truncate">
        {message ?? "Pending"}
      </p>
    </div>
  );
}

// ----- Status badge (top-right of card) -----
function StatusBadge({ status }: { status: PromptItem["status"] }) {
  const map: Record<PromptItem["status"], { cls: string; icon: React.ReactNode; label: string }> = {
    pending: {
      cls: "bg-zinc-800 border border-white/10 text-neutral-400",
      icon: <Wand2 className="w-3 h-3" />,
      label: "Pending",
    },
    queued: {
      cls: "bg-zinc-800 border border-white/10 text-neutral-300",
      icon: <Loader2 className="w-3 h-3" />,
      label: "Queued",
    },
    generating: {
      cls: "bg-violet-500/20 border border-violet-500/40 text-violet-200",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      label: "Generating",
    },
    done: {
      cls: "bg-emerald-500/20 border border-emerald-500/40 text-emerald-200",
      icon: <CheckCircle2 className="w-3 h-3" />,
      label: "Done",
    },
    error: {
      cls: "bg-red-500/20 border border-red-500/40 text-red-200",
      icon: <XCircle className="w-3 h-3" />,
      label: "Error",
    },
  };
  const v = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur",
        v.cls,
      )}
    >
      {v.icon}
      {v.label}
    </span>
  );
}

// ----- Quality badge (overlay on card cover, shows AI vision score) -----
function QualityBadge({ quality }: { quality: QualityScore }) {
  const tier =
    quality.score >= 8
      ? {
          cls: "bg-emerald-500/20 border-emerald-500/40 text-emerald-200",
          label: `${quality.score}/10 ✓`,
        }
      : quality.score >= 6
        ? {
            cls: "bg-amber-500/20 border-amber-500/40 text-amber-200",
            label: `${quality.score}/10 ⚠`,
          }
        : {
            cls: "bg-red-500/20 border-red-500/40 text-red-200",
            label: `${quality.score}/10 ✗`,
          };
  return (
    <span
      title={quality.reason}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border backdrop-blur",
        tier.cls,
      )}
    >
      {tier.label}
    </span>
  );
}

function QualityReason({ quality }: { quality: QualityScore }) {
  const ringCls =
    quality.score >= 8
      ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-200"
      : quality.score >= 6
        ? "border-amber-500/40 bg-amber-500/5 text-amber-200"
        : "border-red-500/40 bg-red-500/5 text-red-200";
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-xs leading-relaxed",
        ringCls,
      )}
    >
      <div className="font-semibold mb-0.5">
        AI quality score: {quality.score}/10
      </div>
      <div className="opacity-90">{quality.reason}</div>
    </div>
  );
}

// ----- Cover detail (fullscreen content for the cover card) -----
function CoverDetail({
  cover,
  aspectRatio,
  coverStyle,
  coverBorder,
  onCoverStyleChange,
  onCoverBorderChange,
  onRegenerate,
  onOpenRefine,
  onSetCover,
}: {
  cover: {
    status: "pending" | "generating" | "done" | "error";
    dataUrl?: string;
    error?: string;
    quality?: QualityScore | null;
  };
  aspectRatio: Aspect;
  coverStyle: CoverStyle;
  coverBorder: CoverBorder;
  onCoverStyleChange: (s: CoverStyle) => void;
  onCoverBorderChange: (b: CoverBorder) => void;
  onRegenerate: () => Promise<void>;
  onOpenRefine: CarouselProps["onOpenRefine"];
  onSetCover: (dataUrl: string) => void;
}) {
  return (
    <div className="grid md:grid-cols-[1fr_280px] gap-6">
      <div
        className="relative rounded-2xl overflow-hidden bg-linear-to-br from-zinc-800 to-zinc-900 border border-white/10"
        style={{ aspectRatio: "3 / 4" }}
      >
        {cover.status === "done" && cover.dataUrl ? (
          <button
            type="button"
            onClick={() =>
              onOpenRefine("cover", {
                targetId: "cover",
                dataUrl: cover.dataUrl!,
                title: "Cover",
                subtitle: "Describe changes. Gemini edits while preserving layout.",
                downloadName: "cover.png",
                onRefined: onSetCover,
                quality: cover.quality,
              })
            }
            className="absolute inset-0 w-full h-full group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover.dataUrl}
              alt="Cover"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
              <MessageSquare className="w-5 h-5" />
              <span className="text-xs font-semibold">Click to refine</span>
            </div>
          </button>
        ) : cover.status === "generating" ? (
          <Pending label="Generating cover…" />
        ) : cover.status === "error" ? (
          <ErrorState message={cover.error ?? "Cover failed"} />
        ) : (
          <Pending label="Cover pending" icon={<BookPlus className="w-7 h-7" />} />
        )}
      </div>
      <div className="flex flex-col gap-4 min-w-0">
        <p className="text-xs uppercase tracking-wider text-neutral-500">
          Aspect {aspectRatio}
        </p>

        {/* Cover STYLE toggle */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
            Style
          </label>
          <div className="flex gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
            {(
              [
                { value: "flat", label: "Flat cartoon", sub: "Bold & simple" },
                {
                  value: "illustrated",
                  label: "Illustrated",
                  sub: "Premium picture-book",
                },
              ] as const
            ).map((opt) => {
              const active = coverStyle === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onCoverStyleChange(opt.value)}
                  className={cn(
                    "flex-1 px-2.5 py-2 rounded-lg text-xs font-semibold text-left transition-colors",
                    active
                      ? "bg-linear-to-r from-violet-500 to-cyan-400 text-white shadow"
                      : "text-neutral-300 hover:bg-white/5",
                  )}
                >
                  <div>{opt.label}</div>
                  <div
                    className={cn(
                      "text-[10px] font-normal mt-0.5",
                      active ? "text-white/80" : "text-neutral-500",
                    )}
                  >
                    {opt.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cover BORDER toggle */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
            Border
          </label>
          <div className="flex gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
            {(
              [
                { value: "framed", label: "Framed", sub: "Cream beige edge" },
                { value: "bleed", label: "Full bleed", sub: "Edge to edge" },
              ] as const
            ).map((opt) => {
              const active = coverBorder === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onCoverBorderChange(opt.value)}
                  className={cn(
                    "flex-1 px-2.5 py-2 rounded-lg text-xs font-semibold text-left transition-colors",
                    active
                      ? "bg-linear-to-r from-violet-500 to-cyan-400 text-white shadow"
                      : "text-neutral-300 hover:bg-white/5",
                  )}
                >
                  <div>{opt.label}</div>
                  <div
                    className={cn(
                      "text-[10px] font-normal mt-0.5",
                      active ? "text-white/80" : "text-neutral-500",
                    )}
                  >
                    {opt.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-neutral-400 leading-relaxed">
          The cover combines key characters from your book on a themed
          background. Click the image to refine specific details.
        </p>
        <button
          type="button"
          onClick={() => void onRegenerate()}
          disabled={cover.status === "generating"}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-linear-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg disabled:opacity-60 transition-all"
        >
          {cover.status === "generating" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {cover.status === "done" ? "Regenerate cover" : "Generate cover"}
        </button>
        {cover.quality && <QualityReason quality={cover.quality} />}
      </div>
    </div>
  );
}

// ----- Page detail (fullscreen content for a page card) -----
function PageDetail({
  item,
  pageIndex,
  aspectRatio,
  onEditPrompt,
  onRemove,
  onRegenerate,
  onOpenRefine,
  onSetItem,
}: {
  item: PromptItem;
  pageIndex: number;
  aspectRatio: Aspect;
  onEditPrompt: CarouselProps["onEditPrompt"];
  onRemove: CarouselProps["onRemove"];
  onRegenerate: CarouselProps["onRegenerateItem"];
  onOpenRefine: CarouselProps["onOpenRefine"];
  onSetItem: CarouselProps["onSetItem"];
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-6">
      <div
        className="relative rounded-2xl overflow-hidden bg-linear-to-br from-zinc-800 to-zinc-900 border border-white/10"
        style={{ aspectRatio: aspectRatio.replace(":", "/") }}
      >
        {item.status === "done" && item.dataUrl ? (
          <button
            type="button"
            onClick={() =>
              onOpenRefine("page", {
                targetId: item.id,
                dataUrl: item.dataUrl!,
                title: item.name,
                subtitle: `Page ${pageIndex} · ${item.id}`,
                downloadName: `${item.id}_${item.name.replace(/[^a-z0-9]+/gi, "_")}.png`,
                onRefined: (d) => onSetItem(item.id, d),
                quality: item.quality,
              })
            }
            className="absolute inset-0 w-full h-full group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.dataUrl}
              alt={item.name}
              className="absolute inset-0 w-full h-full object-contain bg-white"
            />
            {/* attribution intentionally hidden for now — re-enable later */}
            <ColoringBorder />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
              <MessageSquare className="w-5 h-5" />
              <span className="text-xs font-semibold">Click to refine</span>
            </div>
          </button>
        ) : item.status === "done" && !item.dataUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-amber-950/20 text-amber-200 p-6 text-center">
            <RefreshCw className="w-9 h-9" />
            <div>
              <p className="text-sm font-semibold">Image cleared from cache</p>
              <p className="text-xs opacity-80 mt-1 max-w-xs">
                The image bytes were dropped on browser refresh
                (sessionStorage size limit). Click <strong>Regenerate page</strong>{" "}
                below to recreate it from the same prompt.
              </p>
            </div>
          </div>
        ) : item.status === "generating" ? (
          <Pending label={`Generating ${item.name}…`} />
        ) : item.status === "error" ? (
          <ErrorState message={item.error ?? "Failed"} />
        ) : (
          <Pending label={item.name} icon={<Wand2 className="w-7 h-7" />} />
        )}
      </div>

      <div className="flex flex-col gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs uppercase tracking-wider text-neutral-500 flex-1">
            #{item.id}
          </p>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            title="Edit prompt"
            className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            title="Remove page from book"
            className="p-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {editing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={item.name}
              onChange={(e) => onEditPrompt(item.id, { name: e.target.value })}
              placeholder="Name"
              className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/60"
            />
            <textarea
              value={item.subject}
              onChange={(e) => onEditPrompt(item.id, { subject: e.target.value })}
              rows={4}
              placeholder="Subject (what to draw)"
              className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/60 resize-y"
            />
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs text-violet-300 font-semibold"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-neutral-300 leading-relaxed">
              {item.subject}
            </p>
            {item.quality && <QualityReason quality={item.quality} />}
          </>
        )}

        <button
          type="button"
          onClick={() => void onRegenerate(item)}
          disabled={item.status === "generating" || item.status === "queued"}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-linear-to-r from-violet-500 to-cyan-400 text-white hover:shadow-lg disabled:opacity-60 transition-all"
        >
          {item.status === "generating" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : item.status === "done" ? (
            <RefreshCw className="w-4 h-4" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          {item.status === "done" ? "Regenerate page" : "Generate page"}
        </button>
      </div>
    </div>
  );
}

function Pending({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-400">
      {icon ?? <Loader2 className="w-6 h-6 animate-spin text-violet-400" />}
      <p className="text-sm">{label}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-950/30 p-4 text-center">
      <XCircle className="w-7 h-7 text-red-400" />
      <p className="text-xs text-red-200 max-w-xs">{message}</p>
    </div>
  );
}
