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
  X,
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
import { useDialog } from "@/components/ui/confirm-dialog";
import { ImagePreviewDialog } from "@/components/ui/image-preview-dialog";
import { useNavigationGuard } from "@/lib/use-navigation-guard";
import {
  Carousel as AppleCarousel,
  Card as AppleCard,
  type CardData,
} from "@/components/ui/apple-cards-carousel";
import { BookFlip, prefetchBookFlip } from "@/components/playground/book-flip";
import { DownloadMenu } from "@/components/playground/download-menu";
import { KdpMetadataPanel } from "@/components/playground/kdp-metadata-panel";
import { CoverPair } from "@/components/playground/cover-pair";
import { RegenerateCardButton } from "@/components/playground/regenerate-card-button";
import { IdeaSuggestionsPanel } from "@/components/playground/idea-suggestions-panel";
import { ModelPicker } from "@/components/playground/model-picker";
import { AspectRatioPicker } from "@/components/playground/aspect-ratio-picker";
import type { KdpMetadata } from "@/lib/kdp-metadata";
import { type StoryType } from "@/lib/story-book-planner";
import { StoryTypePicker } from "@/components/playground/story-type-picker";
import {
  COVER_MODEL_OPTIONS,
  INTERIOR_MODEL_OPTIONS,
  DEFAULT_COVER_MODEL,
  DEFAULT_INTERIOR_MODEL,
  MODEL_LABELS,
  type ImageModel,
} from "@/lib/constants";

type Aspect = "1:1" | "3:4" | "4:3" | "2:3" | "3:2" | "9:16" | "16:9";
type AgeRange = "toddlers" | "kids" | "tweens";
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
  /** True when the AI did NOT draw a rectangular border (post-processing adds the printer's border). */
  no_ai_border?: boolean;
}

/** Story-mode dialogue line carried per page. */
export interface StoryDialogueLine {
  speaker: string;
  text: string;
}

interface PromptItem {
  id: string;
  name: string;
  subject: string;
  status: "pending" | "queued" | "generating" | "done" | "error";
  dataUrl?: string;
  error?: string;
  quality?: QualityScore | null;
  /**
   * Image model that produced this page's current dataUrl. Refines inherit
   * this so the edit stays on the same model — avoids style drift between
   * a Flash-generated page and a Pro-refined version, and keeps costs
   * predictable when the user lowers the dropdown after generation.
   */
  model?: ImageModel;
  /** Story mode only — up to 2 speech bubbles for this page. */
  dialogue?: StoryDialogueLine[];
  /** Story mode only — short narrator caption rendered above/below the art. */
  narration?: string;
  /** Story mode only — soft camera / framing hint forwarded to the renderer. */
  composition?: string;
}

/** True for fetch rejections caused by user-triggered AbortController.abort(). */
function isAbortError(e: unknown): boolean {
  return (
    (e instanceof DOMException && e.name === "AbortError") ||
    (e instanceof Error &&
      (e.name === "AbortError" || /aborted|signal/i.test(e.message)))
  );
}

/** Story-mode locked character — reused across every page in the book. */
export interface StoryCharacter {
  name: string;
  descriptor: string;
}

/** Story-mode locked palette — every page renders within this hue set. */
export interface StoryPalette {
  name: string;
  hexes: string[];
}

export interface Plan {
  title: string;
  coverTitle: string;
  description: string;
  scene: string;
  coverScene: string;
  prompts: {
    name: string;
    subject: string;
    /** Story mode only. */
    dialogue?: StoryDialogueLine[];
    /** Story mode only. */
    narration?: string;
    /** Story mode only. */
    composition?: string;
  }[];
  bottomStripPhrases?: string[];
  sidePlaqueLines?: string[];
  coverBadgeStyle?: string;
  notes?: string;
  /** Story mode only — 1-3 recurring characters. */
  characters?: StoryCharacter[];
  /** Story mode only — locked color palette. */
  palette?: StoryPalette;
  /**
   * Story mode only — clean parent-facing tagline rendered VERBATIM on
   * the back cover. The planner emits this directly so we don't have to
   * derive it from coverScene (which contains locked-character
   * descriptors that leak as visible text on the rendered back cover).
   */
  backCoverTagline?: string;
}

type Phase = "idea" | "planning" | "review" | "generating" | "paused" | "done";

const ASPECTS: Aspect[] = ["3:4", "1:1", "2:3", "4:3", "3:2"];
const AGE_LABELS: Record<AgeRange, string> = {
  toddlers: "Toddlers 3-6",
  kids: "Kids 6-10",
  tweens: "Tweens 10-14",
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

// Story back covers print ONE tagline (parent-facing prose, hard cap 22
// words). The story-book planner now emits `plan.backCoverTagline`
// directly — clean human-readable copy with no character descriptor
// parentheticals. We trust it when present.
//
// Fallbacks (legacy chat-handoff and edge cases):
//   - plan.description: usually fine for chat-mode stories, but briefToPlan
//     fills it with a placeholder ("20-page picture book.") so we filter
//     that out.
//   - plan.title: short but at least it's clean prose.
//   - DELIBERATELY do NOT fall back to plan.coverScene — that field carries
//     locked-character descriptors with parentheticals like "(small)" that
//     get rendered as visible text on the back cover (the bug we just fixed).
function deriveStoryBackCoverTagline(plan: Plan): string {
  const direct = plan.backCoverTagline?.trim();
  if (direct) return clipWords(direct, 22);
  const desc = plan.description?.trim() ?? "";
  if (desc && !/^\d+\s*-?\s*page picture book/i.test(desc)) {
    return clipWords(desc, 22);
  }
  const title = plan.title?.trim();
  if (title) return clipWords(title, 22);
  return "An illustrated story for quiet afternoons together.";
}

function clipWords(text: string, maxWords: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const firstSentence = cleaned.split(/[.!?](\s|$)/)[0]?.trim() || cleaned;
  const words = firstSentence.split(/\s+/);
  if (words.length <= maxWords) return firstSentence;
  return `${words.slice(0, maxWords - 2).join(" ")}…`;
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
  onSwitchToChat,
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
  /**
   * Hands the typed idea text up to the playground shell so it can switch
   * to the Sparky AI tab pre-set to the matching chat mode with the idea
   * pre-filled. Used by the IdeaForm "Plan with Sparky AI" link in BOTH
   * Coloring book mode (mode="qa") and Story book mode (mode="story") so
   * users who prefer chat-based planning can switch from either flow.
   */
  onSwitchToChat?: (idea: string, mode: "qa" | "story") => void;
} = {}) {
  const dialog = useDialog();
  const [phase, setPhase] = useState<Phase>(initialPlan ? "review" : "idea");
  // Block in-app link clicks, browser back, and tab close while a bulk
  // run is mid-flight — losing it would forfeit ~3 minutes of generation
  // and any partially-generated pages.
  useNavigationGuard(phase === "generating", () =>
    dialog.confirm({
      title: "Leave while generating?",
      message:
        "Pages are still being generated. Leaving now will stop the run and any unfinished pages will be lost. Generated pages so far will be kept if you come back.",
      confirmText: "Leave anyway",
      cancelText: "Keep generating",
      variant: "danger",
    }),
  );
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
  // unrelated subjects. The manual story-book planner flips this to
  // "story" inside runPlan() so the downstream fetch sites all use the
  // story endpoints.
  const [mode, setMode] = useState<"qa" | "story">(initialMode ?? "qa");

  // Toggle on the IdeaForm — only matters for the manual idea-form path
  // (mode is already set when arriving from the chat). When story is
  // picked, the form shows two extra inputs (story type + character
  // names) and runPlan() branches to /api/plan-story-book. Sparky AI
  // chat remains available as a secondary "advanced multi-turn planning"
  // link for users who want it.
  const [bookKind, setBookKind] = useState<"coloring" | "story">("coloring");

  // Story-mode IdeaForm fields. Coloring mode ignores both. Both default
  // to empty — story type is OPTIONAL and the planner falls back to the
  // canonical plot (for known fables) or the most natural shape (for
  // original ideas) when the user doesn't pick a type.
  const [storyType, setStoryType] = useState<StoryType | null>(null);
  const [storyCharacterNames, setStoryCharacterNames] = useState<string>("");

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
        dialogue: p.dialogue,
        narration: p.narration,
        composition: p.composition,
      }))
      : [],
  );
  const [cover, setCover] = useState<{
    status: "pending" | "generating" | "done" | "error";
    dataUrl?: string;
    error?: string;
    quality?: QualityScore | null;
    /** Model that produced the current dataUrl. Refines inherit this. */
    model?: ImageModel;
  }>({
    status: "pending",
  });
  const [coverStyle, setCoverStyle] = useState<CoverStyle>("illustrated");
  const [coverBorder, setCoverBorder] = useState<CoverBorder>("bleed");
  const [coverBadgeStyle, setCoverBadgeStyle] = useState<string>(
    initialPlan?.coverBadgeStyle ?? "",
  );
  const seededBadgeStyleForPlanRef = useRef<Plan | null>(initialPlan ?? null);

  useEffect(() => {
    if (!plan) return;
    if (seededBadgeStyleForPlanRef.current === plan) return;
    seededBadgeStyleForPlanRef.current = plan;
    setCoverBadgeStyle(plan.coverBadgeStyle ?? "");
  }, [plan]);
  // Image model used for the FRONT + BACK cover. Defaults to Nano Banana Pro
  // because the Amazon thumbnail is the highest-leverage pixel we ship.
  const [coverModel, setCoverModel] =
    useState<ImageModel>(DEFAULT_COVER_MODEL);
  // Image model used for INTERIOR pages + the "this book belongs to"
  // page. Defaults to the cheaper Nano Banana 3.1 Flash because a single
  // book can render dozens of pages and Pro pricing would dominate cost.
  const [interiorModel, setInteriorModel] =
    useState<ImageModel>(DEFAULT_INTERIOR_MODEL);
  const [backCover, setBackCover] = useState<{
    status: "pending" | "generating" | "done" | "error";
    dataUrl?: string;
    error?: string;
    quality?: QualityScore | null;
    model?: ImageModel;
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
    model?: ImageModel;
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
  // Bulk-flow quality check is OFF by default and hidden from the UI.
  // The vision rater is still wired into the API route — kept available for
  // the refine flow where the user explicitly opts in. We never trigger
  // regeneration based on the score, so a low rating just surfaces a hint
  // on the regenerate button; it does NOT auto-rerun anything.
  const [qualityCheck] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pdfBuilding, setPdfBuilding] = useState(false);

  const pausedRef = useRef(false);
  const cancelRef = useRef(false);
  const runningRef = useRef(false);
  // AbortController fed into every /api/generate fetch — pause() and
  // cancel() trigger .abort() so the in-flight request stops mid-flight
  // (without this, pause only kicks in BETWEEN pages, which is what the
  // user was hitting on Page 13/17).
  const abortRef = useRef<AbortController | null>(null);


  // Story-mode image preview — when a user clicks "refine" on any story
  // image (cover, back cover, or interior page), we open this lightbox
  // instead of the coloring-book refine chat. Refine-as-edit is a follow-up;
  // for now we let users see the image at full resolution with a tiny
  // "refine coming soon" caption.
  const [storyPreview, setStoryPreview] = useState<{
    open: boolean;
    src: string;
    label: string;
  }>({ open: false, src: "", label: "" });

  const openStoryPreview = useCallback((src: string, label: string) => {
    if (!src) return;
    setStoryPreview({ open: true, src, label });
  }, []);

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
    /**
     * Model the source image was produced with — forwarded to the modal so
     * /api/refine stays on the same model. Falls back to the live dropdown
     * for legacy items that pre-date model tagging.
     */
    model?: ImageModel;
  }>({ open: false, context: "page", targetId: "" });

  // Toggle: carousel grid vs inline page-flip book preview
  const [viewMode, setViewMode] = useState<"carousel" | "book">("carousel");

  // Pre-fetch the react-pageflip chunk on mount so the first "Book preview"
  // click doesn't trigger a dynamic-import flash + layout shift.
  useEffect(() => {
    prefetchBookFlip();
  }, []);

  // Auto-extract the character lock as soon as the cover finishes —
  // regardless of whether the cover was generated standalone (clicking the
  // cover-pair button) or as part of bulk startGeneration. Without this,
  // covers generated outside the bulk flow leave the lock stuck on
  // "pending" forever and interior pages never get the lock injection.
  // Story mode skips this — the brief already carries locked character
  // descriptors and the story-page endpoint forwards them directly to the
  // image model. Running a coloring-book vision extractor on a full-color
  // picture-book cover would produce a B&W-shaped lock that doesn't apply.
  useEffect(() => {
    if (mode === "story") return;
    if (cover.status !== "done" || !cover.dataUrl) return;
    if (characterLock.status !== "pending") return;
    void extractCharacterLock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cover.status, cover.dataUrl, characterLock.status, mode]);

  // KDP metadata
  const [kdpMetadata, setKdpMetadata] = useState<KdpMetadata | null>(null);
  const [kdpLoading, setKdpLoading] = useState(false);
  const [kdpError, setKdpError] = useState<string | null>(null);
  const generateMetadata = useCallback(async () => {
    if (!plan) return;
    setKdpLoading(true);
    setKdpError(null);
    try {
      // Story-mode books send `kind: "story"` so the route picks the
      // picture-book SEO branch (different keywords, categories, price
      // bands, and copy structure than the default coloring-book branch).
      // For story mode we also use the cover scene as the scene/plot
      // signal because plan.scene is the per-page backdrop, not the story.
      const isStory = mode === "story";
      const res = await fetch("/api/kdp-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle: plan.coverTitle ?? plan.title,
          scene: isStory
            ? plan.coverScene || plan.scene
            : plan.scene,
          age,
          pageCount: items.length,
          samplePages: items.slice(0, 8).map((it) => it.subject),
          kind: isStory ? "story" : "coloring",
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
  }, [plan, mode, age, items]);

  const runPlan = useCallback(async () => {
    const trimmed = idea.trim();
    if (trimmed.length < 10) {
      setPlanError(
        bookKind === "story"
          ? "Describe the story in at least 10 characters."
          : "Describe the book in at least 10 characters.",
      );
      return;
    }
    setPlanError(null);
    setPlanning(true);
    setPhase("planning");
    try {
      const isStoryPlan = bookKind === "story";
      const endpoint = isStoryPlan
        ? "/api/plan-story-book"
        : "/api/plan-book";
      const body = isStoryPlan
        ? {
            idea: trimmed,
            pageCount,
            age,
            storyType: storyType ?? undefined,
            characterNames: storyCharacterNames.trim() || undefined,
          }
        : { idea: trimmed, pageCount, age };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { plan?: Plan; error?: string };
      if (!res.ok || !json.plan) throw new Error(json.error || "Planning failed");
      // Flip the runtime mode so the downstream cover/back-cover/page/PDF
      // fetches route to the story endpoints.
      setMode(isStoryPlan ? "story" : "qa");
      setPlan(json.plan);
      setItems(
        json.plan.prompts.map((p, i) => ({
          id: `p${String(i + 1).padStart(2, "0")}`,
          name: p.name,
          subject: p.subject,
          status: "pending",
          dialogue: p.dialogue,
          narration: p.narration,
          composition: p.composition,
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
      if (mode === "story") {
        if (!plan.characters?.length) {
          throw new Error(
            "Story brief is missing locked characters. Re-run the chat to regenerate the brief.",
          );
        }
        if (!plan.palette || plan.palette.hexes.length < 3) {
          throw new Error(
            "Story brief is missing a locked palette. Re-run the chat to regenerate the brief.",
          );
        }
        const res = await fetch("/api/generate-story-cover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortRef.current?.signal,
          body: JSON.stringify({
            title: plan.coverTitle,
            coverScene: plan.coverScene,
            characters: plan.characters,
            palette: plan.palette,
            audienceLabel: AGE_LABELS[age],
            pageCount,
            bottomStripPhrases: plan.bottomStripPhrases,
            sidePlaqueLines: plan.sidePlaqueLines,
            coverBadgeStyle: coverBadgeStyle.trim() || plan.coverBadgeStyle,
            model: coverModel,
          }),
        });
        const json = (await res.json()) as { dataUrl?: string; error?: string };
        if (!res.ok || !json.dataUrl) {
          throw new Error(json.error || "Story cover failed");
        }
        setCover({
          status: "done",
          dataUrl: json.dataUrl,
          quality: null,
          model: coverModel,
        });
        return;
      }
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current?.signal,
        body: JSON.stringify({
          mode: "cover",
          coverTitle: plan.coverTitle,
          coverScene: plan.coverScene,
          coverStyle,
          coverBorder,
          pageCount,
          bottomStripPhrases: plan.bottomStripPhrases,
          sidePlaqueLines: plan.sidePlaqueLines,
          coverBadgeStyle: coverBadgeStyle.trim() || plan.coverBadgeStyle,
          // No referenceDataUrl for the FRONT cover — user feedback removed
          // it. Only the back cover uses the front cover as a style ref.
          qualityGate: qualityCheck,
          model: coverModel,
        }),
      });
      const json = (await res.json()) as {
        dataUrl?: string;
        error?: string;
        quality?: QualityScore | null;
      };
      if (!res.ok || !json.dataUrl) throw new Error(json.error || "Cover failed");
      setCover({
        status: "done",
        dataUrl: json.dataUrl,
        quality: json.quality ?? null,
        model: coverModel,
      });
    } catch (e) {
      if (isAbortError(e)) {
        setCover({ status: "pending" });
        return;
      }
      setCover({ status: "error", error: e instanceof Error ? e.message : "Cover failed" });
      throw e;
    }
  }, [
    plan,
    mode,
    age,
    coverStyle,
    coverBorder,
    coverBadgeStyle,
    pageCount,
    qualityCheck,
    coverModel,
  ]);

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
      if (mode === "story") {
        if (!plan.palette || plan.palette.hexes.length < 3) {
          throw new Error(
            "Story brief is missing a locked palette. Re-run the chat to regenerate the brief.",
          );
        }
        const res = await fetch("/api/generate-story-back-cover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortRef.current?.signal,
          body: JSON.stringify({
            title: plan.coverTitle,
            palette: plan.palette,
            tagline: deriveStoryBackCoverTagline(plan),
            coverReferenceDataUrl: cover.dataUrl,
            model: coverModel,
          }),
        });
        const json = (await res.json()) as { dataUrl?: string; error?: string };
        if (!res.ok || !json.dataUrl) {
          throw new Error(json.error || "Story back cover failed");
        }
        setBackCover({
          status: "done",
          dataUrl: json.dataUrl,
          quality: null,
          model: coverModel,
        });
        return;
      }
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current?.signal,
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
          model: coverModel,
        }),
      });
      const json = (await res.json()) as {
        dataUrl?: string;
        error?: string;
        quality?: QualityScore | null;
      };
      if (!res.ok || !json.dataUrl) throw new Error(json.error || "Back cover failed");
      setBackCover({
        status: "done",
        dataUrl: json.dataUrl,
        quality: json.quality ?? null,
        model: coverModel,
      });
    } catch (e) {
      if (isAbortError(e)) {
        setBackCover({ status: "pending" });
        return;
      }
      setBackCover({
        status: "error",
        error: e instanceof Error ? e.message : "Back cover failed",
      });
    }
  }, [plan, mode, cover.dataUrl, coverStyle, coverBorder, qualityCheck, coverModel]);

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
        signal: abortRef.current?.signal,
        body: JSON.stringify({
          mode: "belongs-to",
          coverTitle: plan.coverTitle,
          belongsToCharacters: characters,
          belongsToStyle,
          // Belongs-to is technically interior content, so it follows the
          // interior dropdown — keeps cost predictable on bulk runs.
          model: interiorModel,
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
        model: interiorModel,
      });
    } catch (e) {
      if (isAbortError(e)) {
        setBelongsTo({ status: "pending" });
        return;
      }
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
    interiorModel,
  ]);

  const generatePage = useCallback(
    async (
      item: PromptItem,
      improvementHint?: string,
      chainReferenceDataUrl?: string,
    ): Promise<string | undefined> => {
      if (!plan) return undefined;
      // Hard gate: interior pages can ONLY be generated after the front
      // cover exists. The cover is the chain anchor + character-lock
      // source, and pages reference it for cross-page consistency. Without
      // this guard, pages generated before the cover would have characters
      // that drift across the book. Show a friendly info dialog instead
      // of marking the card with a red error — the page state stays
      // pending so the user can retry once the cover is done.
      if (cover.status !== "done" || !cover.dataUrl) {
        void dialog.alert({
          title: "Generate the front cover first",
          message:
            "Interior pages reference the front cover for character consistency — characters, palette, and overall style are anchored to the cover. Generate the front cover first, then come back to render this page.",
          variant: "info",
        });
        return undefined;
      }
      updateItem(item.id, { status: "generating", error: undefined });

      const flawSuffix = improvementHint
        ? ` (PREVIOUS ATTEMPT WAS POOR — vision rater said: "${improvementHint}". The new image MUST fix this specific issue.)`
        : "";
      const seed = improvementHint
        ? `${item.id}#${Date.now().toString(36)}`
        : item.id;

      try {
        if (mode === "story") {
          if (!plan.characters?.length || !plan.palette) {
            throw new Error(
              "Story brief is missing characters or palette — open the chat and re-finalize the brief.",
            );
          }
          const res = await fetch("/api/generate-story-page", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: abortRef.current?.signal,
            body: JSON.stringify({
              characters: plan.characters,
              palette: plan.palette,
              scene: item.subject + flawSuffix,
              dialogue: item.dialogue,
              narration: item.narration,
              composition: item.composition,
              coverReferenceDataUrl:
                cover.dataUrl && cover.dataUrl !== chainReferenceDataUrl
                  ? cover.dataUrl
                  : undefined,
              chainReferenceDataUrl,
              model: interiorModel,
            }),
          });
          const json = (await res.json()) as {
            dataUrl?: string;
            error?: string;
          };
          if (!res.ok || !json.dataUrl) {
            throw new Error(json.error || "Story page failed");
          }
          updateItem(item.id, {
            status: "done",
            dataUrl: json.dataUrl,
            quality: null,
            model: interiorModel,
          });
          return json.dataUrl;
        }
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortRef.current?.signal,
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
            // Pass cover as a SECOND visual reference (when present and
            // different from the chain ref). Locks character design to the
            // cover for every interior page, fixing the drift that creeps
            // in once the chain ref is promoted from cover → first page.
            coverReferenceDataUrl:
              cover.dataUrl && cover.dataUrl !== chainReferenceDataUrl
                ? cover.dataUrl
                : undefined,
            characterLock: characterLock.block,
            qualityGate: qualityCheck,
            model: interiorModel,
          }),
        });
        const json = (await res.json()) as {
          dataUrl?: string;
          error?: string;
          quality?: QualityScore | null;
        };
        if (!res.ok || !json.dataUrl) {
          throw new Error(json.error || "Page failed");
        }

        updateItem(item.id, {
          status: "done",
          dataUrl: json.dataUrl,
          quality: json.quality ?? null,
          model: interiorModel,
        });
        return json.dataUrl;
      } catch (e) {
        // User-triggered pause/cancel aborts the in-flight fetch — don't
        // mark this as a "real" failure. Roll the page back to pending so
        // the user can resume / retry without an angry red error card.
        if (isAbortError(e)) {
          updateItem(item.id, { status: "pending", error: undefined });
          return undefined;
        }
        updateItem(item.id, {
          status: "error",
          error: e instanceof Error ? e.message : "Failed",
        });
        return undefined;
      }
    },
    [
      plan,
      mode,
      age,
      aspectRatio,
      reference,
      qualityCheck,
      characterLock.block,
      interiorModel,
      cover.status,
      cover.dataUrl,
      dialog,
    ]
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
    if (cover.status !== "done") return;
    runningRef.current = true;
    cancelRef.current = false;
    pausedRef.current = false;
    abortRef.current = new AbortController();
    setPhase("generating");

    try {
      // Character locker — kick off in background if not done; the
      // bulk loop does NOT await it. Pages that start before the lock
      // arrives will use whatever lock state is current; pages after
      // get the freshly-extracted descriptors. Without this the loop
      // could appear stuck for 5-15s on a slow vision call before
      // any page started rendering.
      // Story mode skips this — the brief already locks characters.
      if (mode !== "story" && characterLock.status !== "done") {
        void extractCharacterLock().catch(() => { });
      }

      // Pages sequentially. CHAIN ANCHOR strategy (two-tier):
      //   - INITIAL anchor: the COVER (character spec — the canonical
      //     "this is what the cat looks like" reference). Cover has no
      //     internal border (full-bleed) so it can't anchor border style.
      //   - SWITCH to FIRST DONE INTERIOR PAGE once one exists. The
      //     first interior page contains BOTH the character AND the
      //     printable border, so subsequent pages can match border
      //     position + thickness as well as character look. This is the
      //     fix for "horse has clean border, hen has different border"
      //     drift across pages.
      // Chain gate: when cover/interior anchor exists, ALWAYS chain
      // (Story mode or Q&A noun-overlap is overridden because the
      // anchor IS the canonical reference for this book).
      const seedDone = items.find((it) => it.status === "done" && it.dataUrl);
      let anchor: { dataUrl: string; subject: string } | undefined = seedDone?.dataUrl
        ? { dataUrl: seedDone.dataUrl, subject: seedDone.subject }
        : cover.dataUrl
          ? {
            dataUrl: cover.dataUrl,
            subject: plan.coverScene ?? plan.title ?? "cover",
          }
          : undefined;
      for (let i = 0; i < items.length; i++) {
        if (cancelRef.current) break;
        while (pausedRef.current && !cancelRef.current) {
          await new Promise((r) => setTimeout(r, 200));
        }
        if (cancelRef.current) break;
        setCurrentIndex(i);
        const item = items[i];
        if (item.status === "done") {
          // Promote first done interior to anchor (for border consistency).
          if (
            item.dataUrl &&
            (!anchor ||
              (cover.dataUrl && anchor.dataUrl === cover.dataUrl))
          ) {
            anchor = { dataUrl: item.dataUrl, subject: item.subject };
          }
          continue;
        }
        const coverOrInteriorAnchor = !!anchor;
        const useChain =
          anchor &&
          (coverOrInteriorAnchor ||
            mode === "story" ||
            shareKeyNoun(anchor.subject, item.subject));
        const dataUrl = await generatePage(
          item,
          undefined,
          useChain ? anchor!.dataUrl : undefined,
        );
        if (dataUrl) {
          // Once we have a successful interior page, switch the anchor
          // to it so pages 2..N also lock the border style, not just
          // the character. Don't downgrade an interior anchor.
          const isFirstInteriorAnchor =
            !anchor || (cover.dataUrl && anchor.dataUrl === cover.dataUrl);
          if (isFirstInteriorAnchor) {
            anchor = { dataUrl, subject: item.subject };
          }
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
    characterLock.status,
    items,
    extractCharacterLock,
    generatePage,
    mode,
  ]);

  const pause = () => {
    pausedRef.current = true;
    setPhase("paused");
    // Abort any in-flight /api/generate so the current page stops
    // immediately. Then prep a fresh controller for resume.
    abortRef.current?.abort();
    abortRef.current = new AbortController();
  };
  const resume = () => {
    pausedRef.current = false;
    // Make sure the controller is fresh in case it was aborted by pause.
    if (abortRef.current?.signal.aborted) {
      abortRef.current = new AbortController();
    }
    if (!runningRef.current) void startGeneration();
    else setPhase("generating");
  };
  const cancel = () => {
    cancelRef.current = true;
    pausedRef.current = false;
    runningRef.current = false;
    abortRef.current?.abort();
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
    if (
      done.length === 0 ||
      cover.status !== "done" ||
      !cover.dataUrl ||
      backCover.status !== "done" ||
      !backCover.dataUrl
    ) {
      void dialog.alert({
        title: "Print package not ready",
        message:
          "Front cover, back cover, and at least one interior page are required for the KDP download.",
        variant: "info",
      });
      return;
    }
    setPdfBuilding(true);
    try {
      // Story-book path: ONE full-color picture-book PDF (6×9 trim, no
      // alternating blanks, no KDP cover-wrap math). Story books also skip
      // the "this book belongs to" page — that's a coloring-book ritual.
      if (mode === "story") {
        const res = await fetch("/api/assemble-story-book-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: plan?.coverTitle ?? plan?.title,
            cover: { dataUrl: cover.dataUrl },
            backCover: { dataUrl: backCover.dataUrl },
            pages: done.map((d) => ({
              id: d.id,
              name: d.name,
              dataUrl: d.dataUrl,
            })),
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Story-book PDF failed");
        }
        const blob = await res.blob();
        const safeName = (plan?.coverTitle ?? "story-book").replace(
          /[^a-z0-9]+/gi,
          "_",
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${safeName}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setPdfBuilding(false);
        return;
      }
      const baseBody = {
        title: plan?.title,
        category: plan?.coverTitle ?? "book",
        cover: { dataUrl: cover.dataUrl },
        backCover: { dataUrl: backCover.dataUrl },
        belongsTo:
          belongsTo.status === "done" && belongsTo.dataUrl
            ? { dataUrl: belongsTo.dataUrl, style: belongsToStyle }
            : undefined,
        pages: done.map((d) => ({
          id: d.id,
          name: d.name,
          dataUrl: d.dataUrl,
        })),
      };

      // Fetch FOUR PDFs in parallel:
      //   1. KDP cover wrap (back + spine + front, KDP-spec dimensions)
      //   2. KDP interior (alternating blanks per KDP convention)
      //   3. Etsy/Gumroad single PDF — US Letter (8.5×11)
      //   4. Etsy/Gumroad single PDF — A4 (210×297mm) for international buyers
      const [coverRes, interiorRes, etsyLetterRes, etsyA4Res] = await Promise.all([
        fetch("/api/assemble-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...baseBody,
            mode: "cover-wrap",
            // Interior page count drives spine width math.
            // Actual interior PDF layout per assembleColoringBookPdf:
            //   1 belongs-to page + 1 blank after + N × (page + blank)
            //   = N*2 + 2  (NOT N*2 + 4 — that over-counts by 2)
            // If belongs-to is missing for some reason, subtract 2.
            interiorPageCount:
              done.length * 2 +
              (belongsTo.status === "done" && belongsTo.dataUrl ? 2 : 0),
            paper: "bw",
            trimWidthInches: 8.5,
            trimHeightInches: 11,
          }),
        }),
        fetch("/api/assemble-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...baseBody,
            mode: "interior",
          }),
        }),
        fetch("/api/assemble-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...baseBody,
            mode: "combined",
            includeBlankPages: false,
            // US Letter (default — explicit for clarity)
            trimWidthInches: 8.5,
            trimHeightInches: 11,
          }),
        }),
        fetch("/api/assemble-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...baseBody,
            mode: "combined",
            includeBlankPages: false,
            // A4: 210 × 297 mm = 8.2677 × 11.6929 inches
            trimWidthInches: 8.27,
            trimHeightInches: 11.69,
          }),
        }),
      ]);

      if (!coverRes.ok) {
        const j = await coverRes.json().catch(() => ({}));
        throw new Error(j.error || "Cover-wrap PDF failed");
      }
      if (!interiorRes.ok) {
        const j = await interiorRes.json().catch(() => ({}));
        throw new Error(j.error || "Interior PDF failed");
      }
      if (!etsyLetterRes.ok) {
        const j = await etsyLetterRes.json().catch(() => ({}));
        throw new Error(j.error || "Etsy Letter PDF failed");
      }
      if (!etsyA4Res.ok) {
        const j = await etsyA4Res.json().catch(() => ({}));
        throw new Error(j.error || "Etsy A4 PDF failed");
      }

      const [coverBlob, interiorBlob, etsyLetterBlob, etsyA4Blob] = await Promise.all([
        coverRes.blob(),
        interiorRes.blob(),
        etsyLetterRes.blob(),
        etsyA4Res.blob(),
      ]);

      const { default: JSZip } = await import("jszip");
      const safeName = (plan?.coverTitle ?? "book").replace(
        /[^a-z0-9]+/gi,
        "_",
      );
      const zip = new JSZip();
      zip.file(`${safeName}_cover_KDP.pdf`, await coverBlob.arrayBuffer());
      zip.file(`${safeName}_interior_KDP.pdf`, await interiorBlob.arrayBuffer());
      zip.file(`${safeName}_etsy_letter.pdf`, await etsyLetterBlob.arrayBuffer());
      zip.file(`${safeName}_etsy_a4.pdf`, await etsyA4Blob.arrayBuffer());
      zip.file(
        "README.txt",
        [
          "CrayonSparks → Print package",
          "",
          "This zip contains 4 PDFs — pick the ones that match where you're",
          "publishing.",
          "",
          "── AMAZON KDP (paperback) ────────────────────────────────────",
          `  1. ${safeName}_cover_KDP.pdf`,
          "     Upload to the COVER section of KDP. Sized to KDP's exact",
          "     cover-wrap dimensions (back + spine + front + 0.125\" bleed).",
          "",
          `  2. ${safeName}_interior_KDP.pdf`,
          "     Upload to the INTERIOR / MANUSCRIPT section. Contains the",
          "     'This Book Belongs To' page followed by every coloring page",
          "     with KDP's required alternating blank pages.",
          "",
          "  Help: https://kdp.amazon.com/en_US/help/topic/G201834260",
          "",
          "── ETSY / GUMROAD (digital download) ─────────────────────────",
          "  Single PDFs in this order:",
          "    • Page 1     — Front cover (full color)",
          "    • Page 2     — 'This Book Belongs To' nameplate",
          "    • Pages 3..N — Coloring pages, back-to-back (no blanks)",
          "    • Last page  — Back cover",
          "  Upload BOTH files to your listing so buyers worldwide can print:",
          "",
          `  3. ${safeName}_etsy_letter.pdf  — US Letter (8.5×11\")`,
          "     For US, Canada, Mexico, Philippines.",
          "",
          `  4. ${safeName}_etsy_a4.pdf      — A4 (210×297 mm)`,
          "     For UK, EU, India, Australia, NZ, Asia, and the rest.",
          "",
          "  Listing tip: mention 'Includes US Letter AND A4 versions' in",
          "  your description — international buyers actively search for it.",
        ].join("\n"),
      );

      const zipBytes = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBytes);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}_print_package.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      void dialog.alert({
        title: "PDF assembly failed",
        message: e instanceof Error ? e.message : "PDF assembly failed",
        variant: "danger",
      });
    } finally {
      setPdfBuilding(false);
    }
  }, [items, cover, backCover, belongsTo, belongsToStyle, plan, mode, dialog]);

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
        bookKind={bookKind}
        setBookKind={setBookKind}
        storyType={storyType}
        setStoryType={setStoryType}
        storyCharacterNames={storyCharacterNames}
        setStoryCharacterNames={setStoryCharacterNames}
        onSwitchToChat={onSwitchToChat}
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
                  {cover.status === "done" ? "✓" : "pending"}
                  {mode !== "story" && (
                    <>
                      {" "}
                      · character-lock{" "}
                      {characterLock.status === "done"
                        ? "✓"
                        : characterLock.status === "extracting"
                          ? "…"
                          : characterLock.status === "error"
                            ? "⚠"
                            : "pending"}
                    </>
                  )}
                </p>
                {mode !== "story" && characterLock.status === "error" && (
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

      {/* Image-model selectors — sit just above the cover/back-cover/belongs-to
          cards so the user can swap models per side without hunting in the header. */}
      {plan && phase === "review" && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500">
            Image models
          </span>
          <ModelPicker
            label="Cover"
            value={coverModel}
            options={COVER_MODEL_OPTIONS}
            onChange={setCoverModel}
            title="Image model used for the front and back cover. Pro is the default — Amazon thumbnails reward fidelity."
          />
          <ModelPicker
            label="Pages"
            value={interiorModel}
            options={INTERIOR_MODEL_OPTIONS}
            onChange={setInteriorModel}
            title="Image model used for interior pages and the 'this book belongs to' page. 3.1 Flash is the workhorse default — keeps cost predictable on bulk runs."
          />
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
          // Story books print at 6×9 (2:3); coloring books at 8.5×11
          // (~3:4). The tile aspect mirrors the actual print trim so the
          // full cover is visible — title at the top, tagline at the
          // bottom, no cropping.
          coverAspect={mode === "story" ? "2 / 3" : "3 / 4"}
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
          frontLocked={
            phase === "generating" ||
            phase === "paused" ||
            items.some((it) => it.status === "done")
          }
          frontLockedReason={
            phase === "generating" || phase === "paused"
              ? "Front cover is locked while interior pages are generating. Pages reference it for character consistency."
              : "Front cover is locked — interior pages already reference it. Click Start new book to begin a new project."
          }
          onRefineFront={(dataUrl) => {
            if (mode === "story") {
              openStoryPreview(dataUrl, "Front cover");
              return;
            }
            setRefine({
              open: true,
              context: "cover",
              targetId: "cover",
              dataUrl,
              title: "Cover",
              subtitle:
                "Describe changes. Gemini edits while preserving layout.",
              downloadName: "cover.png",
              // Refine inherits the model that produced the cover. Fall
              // back to the live dropdown for pre-tagging sessions.
              model: cover.model ?? coverModel,
              onRefined: (d) =>
                setCover({
                  status: "done",
                  dataUrl: d,
                  model: cover.model ?? coverModel,
                }),
            });
          }}
          onRefineBack={(dataUrl) => {
            if (mode === "story") {
              openStoryPreview(dataUrl, "Back cover");
              return;
            }
            setRefine({
              open: true,
              context: "back-cover",
              targetId: "back-cover",
              dataUrl,
              title: "Back cover",
              subtitle:
                "Describe changes. Gemini edits while preserving the tagline box and barcode safe-zone.",
              downloadName: "back-cover.png",
              model: backCover.model ?? coverModel,
              onRefined: (d) =>
                setBackCover({
                  status: "done",
                  dataUrl: d,
                  model: backCover.model ?? coverModel,
                }),
            });
          }}
          // View-only handlers — open the existing preview lightbox so
          // the cover/back-cover stay clickable for "view at full size"
          // even when refine is locked (e.g. front cover after interior
          // pages have started, back cover before front exists).
          onViewFront={(dataUrl) => openStoryPreview(dataUrl, "Front cover")}
          onViewBack={(dataUrl) => openStoryPreview(dataUrl, "Back cover")}
          belongsTo={mode === "story" ? undefined : belongsTo}
          belongsToStyle={mode === "story" ? undefined : belongsToStyle}
          onBelongsToStyleChange={mode === "story" ? undefined : setBelongsToStyle}
          onRegenerateBelongsTo={
            mode === "story" ? undefined : () => void generateBelongsToPage()
          }
          onRefineBelongsTo={
            mode === "story"
              ? undefined
              : (dataUrl) =>
                setRefine({
                  open: true,
                  context: "page",
                  targetId: "belongs-to",
                  dataUrl,
                  title: "This Book Belongs To",
                  subtitle:
                    "Page 2 — auto-generated nameplate. Refine to tweak the banner, characters, or name line.",
                  downloadName: "belongs_to.png",
                  model: belongsTo.model ?? interiorModel,
                  onRefined: (d) =>
                    setBelongsTo({
                      status: "done",
                      dataUrl: d,
                      model: belongsTo.model ?? interiorModel,
                    }),
                  quality: belongsTo.quality,
                })
          }
        />
      )}

      {plan && cover.status === "done" && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="text-xs text-neutral-400 font-mono">
            {progress.doneCount}/{progress.total} pages
            {phase === "generating" && " · generating one by one…"}
            {phase === "paused" && " · paused"}
            {phase === "review" && progress.doneCount === 0 && " · ready"}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(phase === "review" || phase === "done") && !allDone && (
              <button
                onClick={startGeneration}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-linear-to-r from-violet-500 to-cyan-400 text-white hover:opacity-95 shadow-md"
              >
                <Play className="w-4 h-4" /> Start generating
              </button>
            )}
            {phase === "generating" && (
              <>
                <button
                  onClick={pause}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-white/10 text-white hover:bg-white/20 backdrop-blur border border-white/20"
                >
                  <Pause className="w-4 h-4" /> Pause
                </button>
                <button
                  onClick={cancel}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-red-500/15 text-red-200 hover:bg-red-500/25 border border-red-500/30"
                >
                  <Square className="w-3.5 h-3.5" /> Cancel
                </button>
              </>
            )}
            {phase === "paused" && (
              <>
                <button
                  onClick={resume}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-linear-to-r from-violet-500 to-cyan-400 text-white hover:opacity-95 shadow-md"
                >
                  <Play className="w-4 h-4" /> Resume
                </button>
                <button
                  onClick={cancel}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-red-500/15 text-red-200 hover:bg-red-500/25 border border-red-500/30"
                >
                  <Square className="w-3.5 h-3.5" /> Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Carousel OR inline page-flip book preview — view toggle inline.
          Toggle unlocks only when the entire book is done (cover + all
          interior pages + back cover) so the page-flip view shows a
          complete, cohesive book rather than a half-empty placeholder. */}
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
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${viewMode === "carousel"
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
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${viewMode === "book"
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
                  belongsTo={
                    mode === "story"
                      ? undefined
                      : belongsTo.status === "done" && belongsTo.dataUrl
                        ? { imageUrl: belongsTo.dataUrl }
                        : undefined
                  }
                  pages={items.map((it, i) => ({
                    imageUrl: it.dataUrl,
                    label: `${it.name} · Page ${i + 1}`,
                  }))}
                  // Coloring books print one-sided (alternating blank versos
                  // so crayon doesn't bleed onto the next page); picture
                  // books print both sides full-bleed. The story PDF
                  // assembler already does the right thing — these props
                  // mirror that in the preview UI: no blanks AND full-bleed
                  // tiles (no white letterboxing, no page-number overlay).
                  alternateBlankPages={mode !== "story"}
                  fullBleedInterior={mode === "story"}
                  // Page-tile aspect ratio MUST match the actual book trim
                  // size or the cover/pages get cropped. Story books are
                  // 6×9 portrait (2:3 ratio); coloring books are 8.5×11
                  // (~3:4 ratio).
                  width={mode === "story" ? 320 : 360}
                  height={480}
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
                  onOpenRefine={(kind, payload) => {
                    if (mode === "story") {
                      const label =
                        kind === "cover"
                          ? "Front cover"
                          : kind === "back-cover"
                            ? "Back cover"
                            : payload.title ?? "Page";
                      openStoryPreview(payload.dataUrl ?? "", label);
                      return;
                    }
                    // Resolve which model produced the source so the modal
                    // can inherit it. Looks at the right state slice based
                    // on the surface kind; falls back to the live dropdown
                    // for legacy items that pre-date model tagging.
                    const sourceModel: ImageModel | undefined =
                      kind === "cover"
                        ? cover.model ?? coverModel
                        : kind === "back-cover"
                          ? backCover.model ?? coverModel
                          : (items.find((it) => it.id === payload.targetId)
                            ?.model ?? interiorModel);
                    setRefine({
                      open: true,
                      context: kind,
                      ...payload,
                      model: sourceModel,
                    });
                  }}
                  onSetCover={(dataUrl) =>
                    // Preserve the existing model — refine output stays on
                    // the lineage of the source that produced it.
                    setCover((c) => ({
                      status: "done",
                      dataUrl,
                      model: c.model ?? coverModel,
                    }))
                  }
                  onSetBackCover={(dataUrl) =>
                    setBackCover((c) => ({
                      status: "done",
                      dataUrl,
                      model: c.model ?? coverModel,
                    }))
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
                  bookTitle={plan?.coverTitle ?? plan?.title}
                  coverScene={plan?.coverScene}
                  characterLockBlock={characterLock.block}
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
        model={refine.model}
        // Back-cover refine panel pulls its color palette from the front
        // cover and uses the book title/scene to seed tagline candidates.
        // These props are no-ops on other surfaces.
        frontCoverDataUrl={cover.dataUrl}
        bookTitle={plan?.coverTitle ?? plan?.title}
        coverScene={plan?.coverScene}
        bookDescription={plan?.description}
        pageSubjects={items.map((it) => it.subject).filter(Boolean).slice(0, 12)}
        pageCount={items.length}
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

      {/* Story-mode lightbox — opened when the user clicks "refine" on any
          story image. Story refine-as-edit is a follow-up; for now we let
          users see the image at full resolution. */}
      <ImagePreviewDialog
        open={storyPreview.open}
        onClose={() => setStoryPreview((p) => ({ ...p, open: false }))}
        src={storyPreview.src}
        alt={storyPreview.label}
        caption={`${storyPreview.label} — full preview. Story-book refine is coming soon. To change this image, use the regenerate button on the card.`}
      />

      {/* Preview-as-book is now inline above (replaces carousel via viewMode toggle). */}

      {/* KDP metadata generator. The route branches on `kind` — "coloring"
          targets coloring-book SEO; "story" targets picture-book SEO
          (different keywords, categories, copy structure, and price bands). */}
      {plan && allDone && (
        <KdpMetadataPanel
          bookName={plan.coverTitle ?? plan.title ?? "book"}
          pageCount={items.length}
          metadata={kdpMetadata}
          loading={kdpLoading}
          error={kdpError}
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
  bookKind,
  setBookKind,
  storyType,
  setStoryType,
  storyCharacterNames,
  setStoryCharacterNames,
  onSwitchToChat,
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
  bookKind: "coloring" | "story";
  setBookKind: (v: "coloring" | "story") => void;
  storyType: StoryType | null;
  setStoryType: (v: StoryType | null) => void;
  storyCharacterNames: string;
  setStoryCharacterNames: (v: string) => void;
  onSwitchToChat?: (idea: string, mode: "qa" | "story") => void;
}) {
  const [showIdeas, setShowIdeas] = useState(false);
  const isStory = bookKind === "story";

  return (
    <div className="rounded-3xl p-6 md:p-8 bg-zinc-900/60 backdrop-blur-xl border border-white/10 space-y-6">
      {/* Book-kind toggle — coloring vs story. Story redirects to Sparky AI
          chat because story books need multi-turn planning (characters,
          palette, dialogue) that this one-shot form can't capture cleanly. */}
      <div>
        <label className="block text-base font-semibold text-neutral-100 mb-2.5">
          What are you making?
        </label>
        <div
          role="radiogroup"
          aria-label="Book type"
          className="inline-flex p-1.5 rounded-xl border border-white/10 bg-black/40"
        >
          <button
            type="button"
            role="radio"
            aria-checked={!isStory}
            onClick={() => setBookKind("coloring")}
            disabled={planning}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors",
              !isStory
                ? "bg-linear-to-r from-violet-500 to-cyan-400 text-white shadow"
                : "text-neutral-400 hover:text-white",
            )}
          >
            <BookPlus className="w-4 h-4" />
            Coloring book
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={isStory}
            onClick={() => setBookKind("story")}
            disabled={planning}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors",
              isStory
                ? "bg-linear-to-r from-cyan-500 to-emerald-400 text-white shadow"
                : "text-neutral-400 hover:text-white",
            )}
          >
            <BookOpen className="w-4 h-4" />
            Story book
          </button>
        </div>
        {/* Mode-specific helper banner — same visual treatment in both
            modes so the form reads consistently. Larger type and clearer
            copy for non-technical users. */}
        {isStory ? (
          <div className="mt-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 px-5 py-4 text-cyan-100/95 leading-relaxed">
            <p className="font-semibold text-cyan-200 text-base mb-1.5">
              Story book · full-color picture book with dialogue
            </p>
            <p className="text-sm">
              You&apos;ll get a 6×9 picture book where the same characters
              appear across every page, the colors stay consistent, and
              speech bubbles render the dialogue. Type your story idea below
              — a fable name, a character, or your own plot — pick a story
              type if you want a specific tone, and we&apos;ll draft the whole
              book in one shot.{" "}
              {onSwitchToChat ? (
                <>
                  Prefer a back-and-forth chat?{" "}
                  <button
                    type="button"
                    onClick={() => onSwitchToChat(idea, "story")}
                    className="underline underline-offset-2 hover:text-cyan-100 font-semibold"
                  >
                    Plan with Sparky AI →
                  </button>
                </>
              ) : null}
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-violet-500/30 bg-violet-500/5 px-5 py-4 text-violet-100/95 leading-relaxed">
            <p className="font-semibold text-violet-200 text-base mb-1.5">
              Coloring book · black-and-white line art
            </p>
            <p className="text-sm">
              You&apos;ll get an 8.5×11 KDP-ready coloring book with bold
              outlines kids can color in. Type either a{" "}
              <strong className="text-violet-100">theme</strong> (e.g.{" "}
              &ldquo;20 farm animals&rdquo;, &ldquo;ocean creatures&rdquo;) for
              independent subjects on each page, OR a{" "}
              <strong className="text-violet-100">story</strong> (e.g.{" "}
              &ldquo;The Tortoise and the Hare&rdquo;, &ldquo;a panda&apos;s
              first day&rdquo;) for a narrative coloring book where each page
              is a scene from the story. We&apos;ll detect which one you want
              and structure the pages accordingly.{" "}
              {onSwitchToChat ? (
                <>
                  Prefer a back-and-forth chat?{" "}
                  <button
                    type="button"
                    onClick={() => onSwitchToChat(idea, "qa")}
                    className="underline underline-offset-2 hover:text-violet-100 font-semibold"
                  >
                    Plan with Sparky AI →
                  </button>
                </>
              ) : null}
            </p>
          </div>
        )}
      </div>

      {isStory && (
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label
              htmlFor="story-type"
              className="block text-sm font-semibold text-neutral-200 mb-2"
            >
              Story type
            </label>
            <StoryTypePicker
              id="story-type"
              value={storyType}
              onChange={setStoryType}
              disabled={planning}
            />
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Shapes the planner&apos;s tone — moral fables build to a lesson,
              bedtime stories wind down to rest, mysteries follow a small
              puzzle. Optional — leave on &ldquo;No preference&rdquo; and
              we&apos;ll match the natural shape of your idea.
            </p>
          </div>
          <div>
            <label
              htmlFor="story-character-names"
              className="block text-sm font-semibold text-neutral-200 mb-2"
            >
              Character names{" "}
              <span className="text-neutral-500 font-normal">(optional)</span>
            </label>
            <input
              id="story-character-names"
              type="text"
              value={storyCharacterNames}
              onChange={(e) => setStoryCharacterNames(e.target.value)}
              placeholder="e.g. Pip, Daisy, Miss Honey"
              disabled={planning}
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white text-sm placeholder:text-neutral-500 focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60"
            />
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Comma-separated. Leave blank and we&apos;ll invent kid-safe
              names that fit your story (and use canonical names for known
              fables).
            </p>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <label className="block text-sm font-semibold text-neutral-200">
            Your {isStory ? "story" : "book"} idea{" "}
            <span className="text-violet-400">*</span>
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
          placeholder={
            isStory
              ? "e.g. The Tortoise and the Hare for ages 3-6, or a story I made up about a tiny dragon learning to fly. 8-12 scenes."
              : "e.g. A coloring book for ages 3-6 about space adventures — astronauts, rockets, planets, friendly aliens. 20 unique pages."
          }
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
              kind={isStory ? "story" : "coloring"}
            />
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-10 lg:gap-14">
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
      </div>

      <div>
        <label className="block text-sm font-semibold text-neutral-200 mb-2">Aspect ratio</label>
        <AspectRatioPicker
          value={aspectRatio}
          onChange={setAspectRatio}
          options={ASPECTS.map((a) => ({
            value: a,
            label:
              a === "1:1"
                ? "Square"
                : a === "3:4"
                  ? "KDP"
                  : a === "2:3"
                    ? "Tall"
                    : a === "4:3"
                      ? "Landscape"
                      : "Wide",
          }))}
          disabled={planning}
        />
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
        className={cn(
          "w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all",
          isStory
            ? "bg-linear-to-r from-cyan-500 via-teal-400 to-emerald-400 shadow-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/60"
            : "bg-linear-to-r from-violet-500 via-indigo-400 to-cyan-400 shadow-violet-500/40 hover:shadow-xl hover:shadow-violet-500/60",
        )}
      >
        {planning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Planning your {isStory ? "story book" : "book"}…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            {isStory ? "Plan my story book" : "Plan my book with AI"}
          </>
        )}
      </button>
      <p className="text-[11px] text-center text-neutral-500">
        {isStory
          ? `We'll draft characters, a palette, ${pageCount} scenes, and dialogue from your idea. You can review + edit before generation starts.`
          : `Gemini will draft a title, cover scene, and ${pageCount} page prompts. You can review + edit before generation starts.`}
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
  /** Book context — passed to /api/rewrite-subject so the AI rewriter
   * preserves the protagonist instead of swapping a "lion cub" for a
   * "fox kit" when fixing IP-trigger pages. */
  bookTitle?: string;
  coverScene?: string;
  characterLockBlock?: string;
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
  bookTitle,
  coverScene,
  characterLockBlock,
}: CarouselProps) {
  // When a failed page is clicked, open a small modal that lets the user
  // edit the page's subject text and regenerate. Refine isn't useful for
  // failed pages (no image to edit), and Apple-card carousel doesn't expose
  // any inline form on the card itself.
  const [editingError, setEditingError] = useState<PromptItem | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [altLoading, setAltLoading] = useState(false);
  const [altError, setAltError] = useState<string | null>(null);
  const [altCount, setAltCount] = useState(0);

  // Fetch an AI-suggested alternative subject. Used both on modal open
  // (auto-fill the textarea) and when the user clicks "Suggest another".
  const fetchAlternative = useCallback(
    async (item: PromptItem, variantSeed: number) => {
      setAltLoading(true);
      setAltError(null);
      try {
        const res = await fetch("/api/rewrite-subject", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: item.subject,
            errorHint: item.error,
            variantSeed,
            // Pass book context so the rewriter knows WHO the protagonist
            // is and doesn't swap a "lion cub" for a "fox kit". Without
            // this, the rewriter sees one page in isolation.
            bookTitle,
            coverScene,
            characterLock: characterLockBlock,
          }),
        });
        const data = (await res.json()) as {
          alternative?: string;
          error?: string;
        };
        if (!res.ok || !data.alternative) {
          throw new Error(data.error || "Couldn't get an alternative.");
        }
        setEditDraft(data.alternative);
        setAltCount(variantSeed);
      } catch (e) {
        setAltError(
          e instanceof Error ? e.message : "Couldn't get an alternative.",
        );
      } finally {
        setAltLoading(false);
      }
    },
    [bookTitle, coverScene, characterLockBlock],
  );

  // Reset state when modal closes / opens. Don't auto-fetch — user opts in
  // via the "Suggest alternative" button. Saves an OpenAI call on the
  // common case where the user just wants to tweak the original by hand.
  useEffect(() => {
    if (!editingError) {
      setEditDraft("");
      setAltError(null);
      setAltCount(0);
      return;
    }
    setEditDraft(editingError.subject);
    setAltError(null);
    setAltCount(0);
  }, [editingError]);

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
        badge: <StatusBadge status={it.status} />,
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
        } else if (it.status === "error") {
          setEditingError(it);
        } else if (it.status === "generating") {
          // Don't fire a parallel regen on an in-flight page — that races
          // the bulk loop and replaces the live result with a different
          // image after the fact, which the user reads as auto-regen.
          return;
        } else {
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

      {/* Edit-prompt-and-regenerate modal for failed pages */}
      {editingError && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingError(null);
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-zinc-950 border border-white/15 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-violet-300 font-semibold">
                  {editingError.name}
                </p>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Regenerate with a new prompt
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingError(null)}
                className="p-1.5 rounded-md hover:bg-white/10 text-neutral-400 hover:text-white"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editingError.error && (
              <div className="mb-4 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-[12px] text-red-200 leading-relaxed whitespace-pre-wrap">
                {editingError.error}
              </div>
            )}

            {/* Original prompt — read-only, for reference */}
            <div className="mb-4">
              <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
                Original prompt (read-only)
              </span>
              <div className="mt-2 px-3 py-2.5 rounded-lg bg-black/40 border border-white/5 text-[13px] text-neutral-400 leading-relaxed max-h-32 overflow-y-auto">
                {editingError.subject}
              </div>
            </div>

            {/* Editable subject — starts as the original. User edits by
                hand OR clicks "Suggest alternative" to have AI rewrite it. */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] uppercase tracking-wider text-violet-300 font-semibold">
                  {altCount > 0
                    ? `AI-suggested alternative${altCount > 1 ? ` (#${altCount})` : ""}`
                    : "Edit prompt"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    editingError &&
                    void fetchAlternative(editingError, altCount + 1)
                  }
                  disabled={altLoading}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border border-violet-500/30 bg-violet-500/10 text-violet-200 hover:text-white hover:bg-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Have AI rewrite the prompt to defang IP or safety triggers"
                >
                  {altLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {altCount === 0 ? "Suggest alternative" : "Suggest another"}
                </button>
              </div>
              <textarea
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                rows={6}
                disabled={altLoading}
                placeholder={
                  altLoading ? "Generating an alternative…" : "Edit the prompt"
                }
                className="w-full px-3 py-2.5 rounded-lg bg-black/60 border border-violet-500/30 text-white text-sm focus:outline-none focus:border-violet-500/60 resize-y leading-relaxed disabled:opacity-60"
              />
              {altError && (
                <p className="mt-1.5 text-[11px] text-red-300">
                  {altError} — you can still edit the textarea manually.
                </p>
              )}
              {altCount > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    editingError && setEditDraft(editingError.subject)
                  }
                  className="mt-1.5 text-[11px] text-neutral-500 hover:text-neutral-300 underline-offset-2 hover:underline"
                >
                  Reset to original
                </button>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingError(null)}
                className="px-4 py-2 rounded-lg text-sm text-neutral-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const trimmed = editDraft.trim();
                  if (!trimmed) return;
                  const target = editingError;
                  setEditingError(null);
                  // Persist the edited subject in the items state, then
                  // kick off regeneration. regeneratePage will read the
                  // latest subject from items.
                  onEditPrompt(target.id, { subject: trimmed });
                  // The state update is async — call regenerate with the
                  // updated subject inline so it doesn't race the render.
                  void onRegenerateItem({ ...target, subject: trimmed });
                }}
                disabled={!editDraft.trim() || altLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-linear-to-r from-violet-500 to-cyan-400 text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
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
        {/* Border is in the image itself (Gemini draws it). No CSS overlay. */}
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
  // Auto-open the prompt editor when a page errors so the user sees the
  // editable subject + a Regenerate button as one flow — no need to hunt
  // for the pencil icon. Refine isn't useful here (no image to refine);
  // the only fix is to tweak the prompt and try again.
  const [editing, setEditing] = useState(item.status === "error");
  useEffect(() => {
    if (item.status === "error") setEditing(true);
  }, [item.status]);

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
            {/* Border is drawn into the image by Gemini (per master prompt
                DRAW_BORDER_RULE) — no CSS overlay needed. */}
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
            {item.status === "error" && (
              <p className="text-[11px] text-amber-300 leading-relaxed bg-amber-500/10 border border-amber-500/30 rounded-md px-2.5 py-1.5">
                ✏️ Tweak the subject below to avoid the Gemini refusal, then click <strong>Regenerate</strong>.
              </p>
            )}
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
            {item.status !== "error" && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-xs text-violet-300 font-semibold"
              >
                Done
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-neutral-300 leading-relaxed">
            {item.subject}
          </p>
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
          ) : item.status === "error" ? (
            <RefreshCw className="w-4 h-4" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          {item.status === "done"
            ? "Regenerate page"
            : item.status === "error"
              ? "Regenerate with new prompt"
              : "Generate page"}
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
