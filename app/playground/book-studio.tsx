"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookPlus,
  Sparkles,
  Loader2,
  Play,
  Pause,
  Square,
  RefreshCw,
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
import { ImageRefineModal } from "@/app/generate/image-refine-modal";
import { MockupGenerator } from "@/components/ui/mockup-generator";
import {
  Carousel as AppleCarousel,
  Card as AppleCard,
  type CardData,
} from "@/components/ui/apple-cards-carousel";

type Aspect = "1:1" | "3:4" | "4:3" | "2:3" | "3:2" | "9:16" | "16:9";
type AgeRange = "toddlers" | "kids" | "tweens" | "adult";

interface PromptItem {
  id: string;
  name: string;
  subject: string;
  status: "pending" | "queued" | "generating" | "done" | "error";
  dataUrl?: string;
  error?: string;
}

interface Plan {
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

const IDEA_SAMPLES = [
  "Space adventures for kids 3-6 — planets, astronauts, rockets, aliens",
  "20 different ocean sea creatures with expressive faces for toddlers",
  "Mythical creatures mega-pack: dragons, unicorns, phoenixes, griffins",
  "Construction vehicles for little boys — trucks, cranes, bulldozers, mixers",
];

export function BookStudio() {
  const [phase, setPhase] = useState<Phase>("idea");
  const [idea, setIdea] = useState("");
  const [pageCount, setPageCount] = useState(20);
  const [age, setAge] = useState<AgeRange>("toddlers");
  const [aspectRatio, setAspectRatio] = useState<Aspect>("3:4");
  const [reference, setReference] = useState<string | null>(null);

  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);

  const [items, setItems] = useState<PromptItem[]>([]);
  const [cover, setCover] = useState<{ status: "pending" | "generating" | "done" | "error"; dataUrl?: string; error?: string }>({
    status: "pending",
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pdfBuilding, setPdfBuilding] = useState(false);

  const pausedRef = useRef(false);
  const cancelRef = useRef(false);
  const runningRef = useRef(false);

  // refine modal
  const [refine, setRefine] = useState<{
    open: boolean;
    context: "cover" | "page";
    dataUrl?: string;
    title?: string;
    subtitle?: string;
    downloadName?: string;
    onRefined?: (dataUrl: string) => void;
  }>({ open: false, context: "page" });

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
    setCurrentIndex(0);
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
          referenceDataUrl: reference ?? undefined,
        }),
      });
      const json = (await res.json()) as { dataUrl?: string; error?: string };
      if (!res.ok || !json.dataUrl) throw new Error(json.error || "Cover failed");
      setCover({ status: "done", dataUrl: json.dataUrl });
    } catch (e) {
      setCover({ status: "error", error: e instanceof Error ? e.message : "Cover failed" });
      throw e;
    }
  }, [plan, reference]);

  const generatePage = useCallback(
    async (item: PromptItem) => {
      if (!plan) return;
      updateItem(item.id, { status: "generating", error: undefined });
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "subject",
            subject: item.subject,
            age,
            detail: "simple",
            background: "scene",
            aspectRatio,
            scene: plan.scene,
            variantSeed: item.id,
            referenceDataUrl: reference ?? undefined,
          }),
        });
        const json = (await res.json()) as { dataUrl?: string; error?: string };
        if (!res.ok || !json.dataUrl) throw new Error(json.error || "Page failed");
        updateItem(item.id, { status: "done", dataUrl: json.dataUrl });
      } catch (e) {
        updateItem(item.id, {
          status: "error",
          error: e instanceof Error ? e.message : "Failed",
        });
      }
    },
    [plan, age, aspectRatio, reference]
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

      // Pages sequentially
      for (let i = 0; i < items.length; i++) {
        if (cancelRef.current) break;
        // wait while paused
        while (pausedRef.current && !cancelRef.current) {
          await new Promise((r) => setTimeout(r, 200));
        }
        if (cancelRef.current) break;
        setCurrentIndex(i);
        const item = items[i];
        if (item.status === "done") continue;
        await generatePage(item);
      }

      setPhase(cancelRef.current ? "review" : "done");
    } finally {
      runningRef.current = false;
    }
  }, [plan, cover.status, items, generateCover, generatePage]);

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
  }, [items, cover, plan]);

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
        <div className="rounded-3xl p-6 md:p-8 bg-gradient-to-br from-violet-500 via-indigo-400 to-cyan-400 text-white shadow-xl shadow-violet-500/30 relative overflow-hidden">
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
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {phase === "review" && (
                  <button
                    onClick={startGeneration}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-white text-violet-700 hover:bg-violet-50 shadow-md"
                  >
                    <Play className="w-4 h-4" /> Start generating
                  </button>
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
                  <>
                    <button
                      onClick={downloadPdf}
                      disabled={pdfBuilding}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-black text-white hover:bg-neutral-800 disabled:opacity-60 shadow-md"
                    >
                      {pdfBuilding ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      KDP PDF
                    </button>
                    <button
                      onClick={downloadZip}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-white/10 text-white hover:bg-white/20 backdrop-blur border border-white/30"
                    >
                      <Package className="w-4 h-4" /> ZIP
                    </button>
                    <MockupGenerator
                      coverDataUrl={cover.dataUrl ?? null}
                      title={`${plan?.coverTitle ?? "Book"} — Amazon mockups`}
                      bookName={plan?.coverTitle ?? "book"}
                    />
                  </>
                )}
                <button
                  onClick={reset}
                  title="Start over with a new idea"
                  className="inline-flex items-center gap-2 px-3 py-2.5 rounded-full text-sm font-medium bg-white/5 text-white hover:bg-white/15 border border-white/20"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
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

      {/* Carousel */}
      {plan && (
        <Carousel
          cover={cover}
          items={items}
          aspectRatio={aspectRatio}
          onEditPrompt={(id, patch) => updatePromptText(id, patch)}
          onRemove={removeItem}
          onRegenerateItem={generatePage}
          onRegenerateCover={generateCover}
          onOpenRefine={(kind, payload) => setRefine({ open: true, context: kind, ...payload })}
          onSetCover={(dataUrl) => setCover({ status: "done", dataUrl })}
          onSetItem={(id, dataUrl) =>
            setItems((prev) =>
              prev.map((it) => (it.id === id ? { ...it, status: "done", dataUrl } : it))
            )
          }
        />
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
      />
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
  return (
    <div className="rounded-3xl p-6 md:p-8 bg-zinc-900/60 backdrop-blur-xl border border-white/10 space-y-6">
      <div>
        <label className="block text-sm font-semibold text-neutral-200 mb-2">
          Your book idea <span className="text-violet-400">*</span>
        </label>
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="e.g. A coloring book for ages 3-6 about space adventures — astronauts, rockets, planets, friendly aliens. 20 unique pages."
          rows={5}
          className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white text-sm placeholder:text-neutral-500 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 resize-y min-h-[120px]"
          disabled={planning}
        />
        {!idea && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {IDEA_SAMPLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setIdea(s)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300 hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-white"
              >
                {s.slice(0, 60)}…
              </button>
            ))}
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
                    ? "bg-gradient-to-r from-violet-500 to-cyan-400 text-white border-transparent shadow"
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
                    ? "bg-gradient-to-r from-violet-500 to-cyan-400 text-white border-transparent shadow"
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
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-400 shadow-lg shadow-violet-500/40 hover:shadow-xl hover:shadow-violet-500/60 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
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
  cover: { status: "pending" | "generating" | "done" | "error"; dataUrl?: string; error?: string };
  items: PromptItem[];
  aspectRatio: Aspect;
  onEditPrompt: (id: string, patch: { name?: string; subject?: string }) => void;
  onRemove: (id: string) => void;
  onRegenerateItem: (item: PromptItem) => Promise<void>;
  onRegenerateCover: () => Promise<void>;
  onOpenRefine: (
    kind: "cover" | "page",
    payload: {
      dataUrl: string;
      title: string;
      subtitle?: string;
      downloadName: string;
      onRefined: (d: string) => void;
    }
  ) => void;
  onSetCover: (dataUrl: string) => void;
  onSetItem: (id: string, dataUrl: string) => void;
}

function Carousel({
  cover,
  items,
  aspectRatio,
  onEditPrompt,
  onRemove,
  onRegenerateItem,
  onRegenerateCover,
  onOpenRefine,
  onSetCover,
  onSetItem,
}: CarouselProps) {
  const cards = useMemo<React.ReactNode[]>(() => {
    const coverData: CardData = {
      title: "Cover",
      category: "Front cover",
      cover: <PageCover status={cover.status} dataUrl={cover.dataUrl} message={cover.error} aspectClass="3 / 4" />,
      badge: <StatusBadge status={cover.status as PromptItem["status"]} />,
      content: (
        <CoverDetail
          cover={cover}
          aspectRatio="3:4"
          onRegenerate={onRegenerateCover}
          onOpenRefine={onOpenRefine}
          onSetCover={onSetCover}
        />
      ),
    };

    const pageData: CardData[] = items.map((it, i) => ({
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
      content: (
        <PageDetail
          item={it}
          pageIndex={i + 1}
          aspectRatio={aspectRatio}
          onEditPrompt={onEditPrompt}
          onRemove={onRemove}
          onRegenerate={onRegenerateItem}
          onOpenRefine={onOpenRefine}
          onSetItem={onSetItem}
        />
      ),
    }));

    return [coverData, ...pageData].map((card, index) => (
      <AppleCard key={`card-${index}-${card.title}`} card={card} index={index} />
    ));
  }, [
    cover,
    items,
    aspectRatio,
    onEditPrompt,
    onRemove,
    onRegenerateItem,
    onRegenerateCover,
    onOpenRefine,
    onSetCover,
    onSetItem,
  ]);

  return (
    <div className="rounded-3xl p-4 md:p-6 bg-zinc-900/60 backdrop-blur-xl border border-white/10">
      <div className="flex items-center justify-between mb-2 px-2">
        <p className="text-sm font-semibold text-white">
          {items.length + 1} cards · cover + {items.length} pages
        </p>
        <p className="text-xs text-neutral-500">Tap a card to refine</p>
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
        {showFrame && (
          <div className="absolute inset-[6%] border-[2px] border-black pointer-events-none" />
        )}
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
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-800 to-zinc-900 text-neutral-400">
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
  onRegenerate,
  onOpenRefine,
  onSetCover,
}: {
  cover: { status: "pending" | "generating" | "done" | "error"; dataUrl?: string; error?: string };
  aspectRatio: Aspect;
  onRegenerate: () => Promise<void>;
  onOpenRefine: CarouselProps["onOpenRefine"];
  onSetCover: (dataUrl: string) => void;
}) {
  return (
    <div className="grid md:grid-cols-[1fr_280px] gap-6">
      <div
        className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10"
        style={{ aspectRatio: "3 / 4" }}
      >
        {cover.status === "done" && cover.dataUrl ? (
          <button
            type="button"
            onClick={() =>
              onOpenRefine("cover", {
                dataUrl: cover.dataUrl!,
                title: "Cover",
                subtitle: "Describe changes. Gemini edits while preserving layout.",
                downloadName: "cover.png",
                onRefined: onSetCover,
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
      <div className="flex flex-col gap-3 min-w-0">
        <p className="text-xs uppercase tracking-wider text-neutral-500">
          Aspect {aspectRatio}
        </p>
        <p className="text-xs text-neutral-400 leading-relaxed">
          The cover combines key characters from your prompts on a vibrant
          background. Click the image to refine specific details.
        </p>
        <button
          type="button"
          onClick={() => void onRegenerate()}
          disabled={cover.status === "generating"}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg disabled:opacity-60 transition-all"
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
  const [editing, setEditing] = useState(false);

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-6">
      <div
        className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10"
        style={{ aspectRatio: aspectRatio.replace(":", "/") }}
      >
        {item.status === "done" && item.dataUrl ? (
          <button
            type="button"
            onClick={() =>
              onOpenRefine("page", {
                dataUrl: item.dataUrl!,
                title: item.name,
                subtitle: `Page ${pageIndex} · ${item.id}`,
                downloadName: `${item.id}_${item.name.replace(/[^a-z0-9]+/gi, "_")}.png`,
                onRefined: (d) => onSetItem(item.id, d),
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
            <div className="absolute inset-[5%] border-[2.5px] border-black pointer-events-none" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
              <MessageSquare className="w-5 h-5" />
              <span className="text-xs font-semibold">Click to refine</span>
            </div>
          </button>
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
          <p className="text-sm text-neutral-300 leading-relaxed">
            {item.subject}
          </p>
        )}

        <button
          type="button"
          onClick={() => void onRegenerate(item)}
          disabled={item.status === "generating" || item.status === "queued"}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-500 to-cyan-400 text-white hover:shadow-lg disabled:opacity-60 transition-all"
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
