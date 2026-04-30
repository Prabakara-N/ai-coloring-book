"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Download,
  Loader2,
  Sparkles,
  Wand2,
  CheckCircle2,
  XCircle,
  Package,
  Image as ImageIcon,
  RefreshCw,
  FileText,
  Settings2,
  BookMarked,
  Lock,
  Pencil,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ColoringCategory,
  ColoringPrompt,
  AgeRange,
  Detail,
  Background,
} from "@/lib/prompts";
import {
  isCustomCategory,
  listCustomCategories,
  type CustomCategory,
} from "@/lib/custom-categories";
import { CreateBookModal } from "@/components/generate/create-book-modal";
import { ImageRefineModal, type RefineContext } from "@/components/generate/image-refine-modal";
import { ReferenceImageField } from "@/components/ui/reference-image-field";
import { MockupGenerator } from "@/components/ui/mockup-generator";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { KdpMetadataPanel } from "@/components/playground/kdp-metadata-panel";
import { CoverPair } from "@/components/playground/cover-pair";
import { MockupGate } from "@/components/ui/mockup-gate";
import type { KdpMetadata } from "@/lib/kdp-metadata";
import { ModelPicker } from "@/components/playground/model-picker";
import {
  COVER_MODEL_OPTIONS,
  INTERIOR_MODEL_OPTIONS,
  DEFAULT_COVER_MODEL,
  DEFAULT_INTERIOR_MODEL,
  type GeminiImageModel,
} from "@/lib/constants";

type AspectRatio = "1:1" | "3:4" | "4:3" | "2:3" | "3:2" | "9:16" | "16:9";
type GenStatus = "idle" | "queued" | "generating" | "done" | "error";

interface GenItem {
  key: string;
  prompt: ColoringPrompt;
  status: GenStatus;
  dataUrl?: string;
  error?: string;
}

interface GenOptions {
  age: AgeRange;
  detail: Detail;
  background: Background;
  aspectRatio: AspectRatio;
  categorySlug: string;
  scene?: string;
  referenceDataUrl?: string;
  /** Image model used for interior pages. Forwarded to /api/generate. */
  model?: GeminiImageModel;
}

async function generateOne(
  subject: string,
  opts: GenOptions,
  variantSeed?: string
): Promise<{ dataUrl: string }> {
  // For custom categories, pass scene explicitly (server can't look them up)
  const { categorySlug, scene, referenceDataUrl, model, ...rest } = opts;
  const isCustom = categorySlug.startsWith("custom-");
  const base = isCustom
    ? { mode: "subject", subject, ...rest, scene }
    : { mode: "subject", subject, ...rest, categorySlug };
  const payload = {
    ...base,
    ...(variantSeed ? { variantSeed } : {}),
    ...(referenceDataUrl ? { referenceDataUrl } : {}),
    ...(model ? { model } : {}),
  };
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as { dataUrl?: string; error?: string };
  if (!res.ok || !json.dataUrl) {
    throw new Error(json.error || "Generation failed");
  }
  return { dataUrl: json.dataUrl };
}

type CoverStyle = "flat" | "illustrated";
type CoverBorder = "framed" | "bleed";

async function generateCover(
  category: ColoringCategory,
  coverOpts: {
    style: CoverStyle;
    border: CoverBorder;
    model?: GeminiImageModel;
  },
): Promise<{ dataUrl: string }> {
  const isCustom = category.slug.startsWith("custom-");
  const base = isCustom
    ? {
        mode: "cover",
        coverTitle: category.coverTitle,
        coverScene: category.coverScene,
      }
    : { mode: "cover", categorySlug: category.slug };
  const payload = {
    ...base,
    coverStyle: coverOpts.style,
    coverBorder: coverOpts.border,
    ...(coverOpts.model ? { model: coverOpts.model } : {}),
  };
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as { dataUrl?: string; error?: string };
  if (!res.ok || !json.dataUrl) {
    throw new Error(json.error || "Cover generation failed");
  }
  return { dataUrl: json.dataUrl };
}

const AGE_OPTIONS: { value: AgeRange; label: string; sub: string }[] = [
  { value: "toddlers", label: "Toddlers", sub: "3-6" },
  { value: "kids", label: "Kids", sub: "6-10" },
  { value: "tweens", label: "Tweens", sub: "10-14" },
  { value: "adult", label: "Adults", sub: "Mandala" },
];
const DETAIL_OPTIONS: { value: Detail; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "detailed", label: "Detailed" },
  { value: "intricate", label: "Intricate" },
];
const BG_OPTIONS: { value: Background; label: string }[] = [
  { value: "scene", label: "Full Scene" },
  { value: "framed", label: "Decor Border" },
  { value: "minimal", label: "Minimal" },
];
const ASPECT_OPTIONS: { value: AspectRatio; label: string; sub: string }[] = [
  { value: "3:4", label: "KDP", sub: "3:4" },
  { value: "1:1", label: "Square", sub: "1:1" },
  { value: "2:3", label: "Tall", sub: "2:3" },
  { value: "4:3", label: "Landscape", sub: "4:3" },
  { value: "3:2", label: "Wide", sub: "3:2" },
  { value: "9:16", label: "Pin", sub: "9:16" },
  { value: "16:9", label: "Banner", sub: "16:9" },
];

export function GeneratorStudio({ categories }: { categories: ColoringCategory[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSlug = searchParams.get("category");
  const initialSlug =
    urlSlug && categories.some((c) => c.slug === urlSlug) ? urlSlug : categories[0].slug;
  const [selectedSlug, setSelectedSlugState] = useState(initialSlug);

  // Wraps the state setter so URL stays in sync with the active category.
  const setSelectedSlug = useCallback(
    (slug: string) => {
      setSelectedSlugState(slug);
      const params = new URLSearchParams(searchParams.toString());
      params.set("category", slug);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );
  const [items, setItems] = useState<Record<string, GenItem>>({});
  const [customSubject, setCustomSubject] = useState("");
  const [customStatus, setCustomStatus] = useState<GenStatus>("idle");
  const [customResult, setCustomResult] = useState<{ dataUrl?: string; error?: string }>({});

  const [age, setAge] = useState<AgeRange>("toddlers");
  const [detail, setDetail] = useState<Detail>("simple");
  const [background, setBackground] = useState<Background>("scene");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("3:4");
  const [coverStyle, setCoverStyle] = useState<CoverStyle>("flat");
  const [coverBorder, setCoverBorder] = useState<CoverBorder>("framed");
  // Per-surface image model selection. Mirrors the bulk-book book-studio
  // convention so the dropdowns stay consistent across both bulk flows.
  const [coverModel, setCoverModel] = useState<GeminiImageModel>(
    DEFAULT_COVER_MODEL,
  );
  const [interiorModel, setInteriorModel] = useState<GeminiImageModel>(
    DEFAULT_INTERIOR_MODEL,
  );
  const [backCovers, setBackCovers] = useState<Record<string, string>>({});
  const [backCoverBuilding, setBackCoverBuilding] = useState(false);
  const [backCoverError, setBackCoverError] = useState<string | null>(null);

  const [kdpMetadataMap, setKdpMetadataMap] = useState<
    Record<string, KdpMetadata>
  >({});
  const [kdpLoading, setKdpLoading] = useState(false);
  const [kdpError, setKdpError] = useState<string | null>(null);

  const [pdfBuilding, setPdfBuilding] = useState(false);
  const [pdfStep, setPdfStep] = useState<string>("");
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [reference, setReference] = useState<string | null>(null);

  const [customCats, setCustomCats] = useState<CustomCategory[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustom, setEditingCustom] = useState<CustomCategory | undefined>(
    undefined
  );

  useEffect(() => {
    setCustomCats(listCustomCategories());
  }, []);

  // Refine modal state
  const [refine, setRefine] = useState<{
    open: boolean;
    context: RefineContext;
    dataUrl?: string;
    title?: string;
    subtitle?: string;
    downloadName?: string;
    onRefined?: (dataUrl: string) => void;
  }>({ open: false, context: "page" });

  // Sync URL → state only when they differ. Without the equality guard
  // this fires every render → router.replace → re-render → fires again →
  // infinite GET loop on /generate?category=<slug> (terminal floods,
  // browser tab freezes).
  useEffect(() => {
    if (!urlSlug) return;
    if (urlSlug === selectedSlug) return;
    if (
      categories.some((c) => c.slug === urlSlug) ||
      customCats.some((c) => c.slug === urlSlug)
    ) {
      setSelectedSlugState(urlSlug);
    }
  }, [urlSlug, selectedSlug, categories, customCats]);

  const allCategories: ColoringCategory[] = useMemo(
    () => [...categories, ...customCats],
    [categories, customCats]
  );

  const category = useMemo(
    () => allCategories.find((c) => c.slug === selectedSlug) ?? allCategories[0],
    [allCategories, selectedSlug]
  );
  const opts: GenOptions = {
    age,
    detail,
    background,
    aspectRatio,
    categorySlug: category.slug,
    scene: isCustomCategory(category) ? category.scene : undefined,
    referenceDataUrl: reference ?? undefined,
    model: interiorModel,
  };

  const runOne = useCallback(
    async (prompt: ColoringPrompt) => {
      const key = `${prompt.id}`;
      setItems((prev) => ({
        ...prev,
        [key]: { key, prompt, status: "generating" },
      }));
      try {
        const { dataUrl } = await generateOne(
          prompt.subject,
          opts,
          `${category.slug}:${prompt.id}`
        );
        setItems((prev) => ({
          ...prev,
          [key]: { key, prompt, status: "done", dataUrl },
        }));
      } catch (e) {
        setItems((prev) => ({
          ...prev,
          [key]: {
            key,
            prompt,
            status: "error",
            error: e instanceof Error ? e.message : "Failed",
          },
        }));
      }
    },
    [opts, category.slug]
  );

  const runAll = useCallback(async () => {
    const pending = category.prompts;
    setItems((prev) => {
      const next = { ...prev };
      for (const p of pending) {
        if (!next[p.id] || next[p.id].status === "error" || next[p.id].status === "idle") {
          next[p.id] = { key: p.id, prompt: p, status: "queued" };
        }
      }
      return next;
    });

    const concurrency = 3;
    const queue = [...pending];
    const workers = Array.from({ length: concurrency }, async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) break;
        if (items[next.id]?.status === "done") continue;
        await runOne(next);
      }
    });
    await Promise.all(workers);
  }, [category.prompts, runOne, items]);

  const runCustom = useCallback(async () => {
    const subject = customSubject.trim();
    if (!subject) return;
    setCustomStatus("generating");
    setCustomResult({});
    try {
      const { dataUrl } = await generateOne(subject, opts);
      setCustomStatus("done");
      setCustomResult({ dataUrl });
    } catch (e) {
      setCustomStatus("error");
      setCustomResult({ error: e instanceof Error ? e.message : "Failed" });
    }
  }, [customSubject, opts]);

  const regenerateCover = useCallback(async () => {
    setPdfBuilding(true);
    setPdfStep("Generating fresh cover…");
    try {
      const { dataUrl } = await generateCover(category, {
        style: coverStyle,
        border: coverBorder,
        model: coverModel,
      });
      setCovers((prev) => ({ ...prev, [category.slug]: dataUrl }));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Cover generation failed");
    } finally {
      setPdfBuilding(false);
      setPdfStep("");
    }
  }, [category, coverStyle, coverBorder, coverModel]);

  const regenerateBackCover = useCallback(async () => {
    const frontCover = covers[category.slug];
    if (!frontCover) {
      setBackCoverError(
        "Generate the front cover first — back cover matches its style.",
      );
      return;
    }
    setBackCoverBuilding(true);
    setBackCoverError(null);
    try {
      const description =
        category.kdp?.description ||
        `A fun coloring book about ${category.name.toLowerCase()}.`;
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "back-cover",
          coverTitle: category.coverTitle,
          coverScene: category.coverScene,
          backCoverDescription: description,
          coverStyle,
          coverBorder,
          // Pass front cover as STYLE REFERENCE to lock palette/style.
          referenceDataUrl: frontCover,
          // Back cover stays on the same model as the front cover so the
          // user's dropdown choice applies uniformly to both surfaces.
          model: coverModel,
        }),
      });
      const json = (await res.json()) as { dataUrl?: string; error?: string };
      if (!res.ok || !json.dataUrl)
        throw new Error(json.error ?? "Back cover failed");
      setBackCovers((prev) => ({ ...prev, [category.slug]: json.dataUrl! }));
    } catch (e) {
      setBackCoverError(
        e instanceof Error ? e.message : "Back cover failed",
      );
    } finally {
      setBackCoverBuilding(false);
    }
  }, [category, coverStyle, coverBorder, covers, coverModel]);

  const generateMetadataForCategory = useCallback(async () => {
    setKdpLoading(true);
    setKdpError(null);
    try {
      const samplePages = category.prompts.slice(0, 8).map((p) => p.subject);
      const res = await fetch("/api/kdp-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle: category.coverTitle ?? category.name,
          scene: category.scene,
          age,
          pageCount: category.prompts.length,
          samplePages,
        }),
      });
      const json = (await res.json()) as {
        metadata?: KdpMetadata;
        error?: string;
      };
      if (!res.ok || !json.metadata)
        throw new Error(json.error ?? "Metadata generation failed");
      setKdpMetadataMap((prev) => ({
        ...prev,
        [category.slug]: json.metadata!,
      }));
    } catch (e) {
      setKdpError(
        e instanceof Error ? e.message : "Metadata generation failed",
      );
    } finally {
      setKdpLoading(false);
    }
  }, [category, age]);

  const activeBackCover = backCovers[category.slug];
  const activeMetadata: KdpMetadata | null =
    kdpMetadataMap[category.slug] ?? null;

  const downloadZip = useCallback(async () => {
    const done = Object.values(items).filter((i) => i.status === "done" && i.dataUrl);
    if (done.length === 0) return;
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (const item of done) {
      const base64 = item.dataUrl!.split(",")[1];
      const safeName = item.prompt.name.replace(/[^a-z0-9]+/gi, "_");
      zip.file(`${item.prompt.id}_${safeName}.png`, base64, { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crayonsparks_${category.slug}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [items, category.slug]);

  const downloadPdf = useCallback(async () => {
    const done = category.prompts
      .map((p) => items[p.id])
      .filter((i): i is GenItem => !!i && i.status === "done" && !!i.dataUrl);
    if (done.length !== category.prompts.length) return;
    setPdfBuilding(true);
    try {
      let coverDataUrl = covers[category.slug];
      if (!coverDataUrl) {
        setPdfStep("Generating cover illustration…");
        const { dataUrl } = await generateCover(category, {
          style: coverStyle,
          border: coverBorder,
          model: coverModel,
        });
        coverDataUrl = dataUrl;
        setCovers((prev) => ({ ...prev, [category.slug]: dataUrl }));
      }
      setPdfStep("Assembling KDP PDF…");
      const res = await fetch("/api/assemble-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: category.kdp.title,
          category: category.slug,
          cover: { dataUrl: coverDataUrl },
          backCover: activeBackCover ? { dataUrl: activeBackCover } : undefined,
          pages: done.map((d) => ({ id: d.prompt.id, name: d.prompt.name, dataUrl: d.dataUrl })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "PDF failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `crayonsparks_${category.slug}_KDP.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "PDF assembly failed");
    } finally {
      setPdfBuilding(false);
      setPdfStep("");
    }
  }, [items, category, covers, backCovers, coverStyle, coverBorder, coverModel]);

  const categoryDone = category.prompts.filter((p) => items[p.id]?.status === "done").length;
  const allDone = categoryDone === category.prompts.length;
  const activeCover = covers[category.slug];

  return (
    <div className="space-y-8">
      {/* Category tabs */}
      <CategoryScroller>
        <button
          onClick={() => {
            setEditingCustom(undefined);
            setModalOpen(true);
          }}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold border-2 border-dashed border-violet-500/40 text-violet-300 hover:border-violet-400 hover:bg-violet-500/10 transition-all"
        >
          <span className="relative inline-flex items-center justify-center w-4 h-4">
            <Wand2 className="w-4 h-4" />
          </span>
          Create my own book
        </button>
        <span className="shrink-0 w-px h-7 bg-white/10 mx-1" aria-hidden />
        {allCategories.map((cat) => {
          const active = cat.slug === selectedSlug;
          const custom = isCustomCategory(cat);
          return (
            <button
              key={cat.slug}
              onClick={() => setSelectedSlug(cat.slug)}
              className={cn(
                "shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-all",
                active
                  ? "bg-linear-to-r from-violet-500 to-cyan-400 text-white border-transparent shadow-lg shadow-violet-500/30"
                  : "bg-zinc-900/60 backdrop-blur border-white/10 hover:border-violet-300 hover:bg-violet-950/30"
              )}
            >
              <span className="text-lg">{cat.icon}</span>
              <span>{cat.name}</span>
              {custom && (
                <span
                  className={cn(
                    "ml-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider",
                    active ? "bg-white/25 text-white" : "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  )}
                >
                  Mine
                </span>
              )}
            </button>
          );
        })}
      </CategoryScroller>

      <CreateBookModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editingCustom}
        onSaved={(slug) => {
          setCustomCats(listCustomCategories());
          setSelectedSlug(slug);
        }}
        onDeleted={() => {
          setCustomCats(listCustomCategories());
          setSelectedSlug(categories[0].slug);
        }}
      />

      {/* Category header — moved ABOVE Style controls so the user sees the
          book they picked + the action buttons first, then dials in the
          generation knobs underneath. */}
      <div className="rounded-2xl p-6 md:p-8 bg-linear-to-br from-violet-500 via-indigo-400 to-cyan-400 text-white shadow-xl shadow-violet-500/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%3E%3Cpath%20d%3D%22M30%2030m-20%200a20%2020%200%201%201%2040%200a20%2020%200%201%201%20-40%200%22%20stroke%3D%22white%22%20stroke-opacity%3D%220.07%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E')] opacity-30" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{category.icon}</span>
              <h2 className="font-display text-2xl md:text-3xl font-bold">{category.name}</h2>
              {isCustomCategory(category) && (
                <button
                  onClick={() => {
                    setEditingCustom(category as CustomCategory);
                    setModalOpen(true);
                  }}
                  title="Edit this book"
                  className="ml-1 p-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-white/90 text-sm md:text-base max-w-xl">
              {category.description}
            </p>
            <p className="text-white/70 text-xs mt-1">
              {categoryDone}/{category.prompts.length} generated
              {allDone && " · ready to export"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={runAll}
              disabled={pdfBuilding}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-white text-violet-700 hover:bg-violet-50 disabled:opacity-50 transition-colors shadow-md"
            >
              <Wand2 className="w-4 h-4" />
              Generate All {category.prompts.length}
            </button>
            <button
              onClick={downloadPdf}
              disabled={!allDone || pdfBuilding}
              title={
                !allDone
                  ? `Generate all ${category.prompts.length} pages first (${categoryDone}/${category.prompts.length} done)`
                  : pdfStep || "Download KDP-ready PDF"
              }
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-colors shadow-md",
                !allDone
                  ? "bg-white/5 text-white/40 cursor-not-allowed border border-white/10"
                  : "bg-black text-white hover:bg-neutral-800"
              )}
            >
              {pdfBuilding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : !allDone ? (
                <Lock className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {pdfBuilding ? pdfStep.replace(/…$/, "") : !allDone ? `KDP PDF (${categoryDone}/${category.prompts.length})` : "KDP PDF"}
            </button>
            {categoryDone > 0 && (
              <button
                onClick={downloadZip}
                disabled={pdfBuilding}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 backdrop-blur transition-colors border border-white/30"
              >
                <Package className="w-4 h-4" />
                ZIP
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Customization — sits below the action card so settings are a
          secondary concern after the user has decided what to make. */}
      <div className="rounded-2xl p-5 bg-zinc-900/60 backdrop-blur-xl border border-white/10">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Settings2 className="w-4 h-4 text-violet-400" />
          <h3 className="font-semibold text-sm">Style controls</h3>
          <span className="text-[11px] text-neutral-500">applies to every generation</span>
          {/* Per-surface model pickers, parked in the header so they read
              alongside the existing pill toggles in the bulk-book toolbar. */}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ModelPicker
              label="Cover"
              value={coverModel}
              options={COVER_MODEL_OPTIONS}
              onChange={setCoverModel}
              title="Image model used for the front and back cover. Pro is the default — Amazon thumbnail click-through rewards fidelity."
            />
            <ModelPicker
              label="Pages"
              value={interiorModel}
              options={INTERIOR_MODEL_OPTIONS}
              onChange={setInteriorModel}
              title="Image model used for interior pages. 3.1 Flash is the workhorse default — Pro is hidden because pure B&W line art doesn't reward photorealism."
            />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <OptionGroup
            label="Audience"
            options={AGE_OPTIONS}
            value={age}
            onChange={(v) => setAge(v as AgeRange)}
          />
          <OptionGroup
            label="Detail"
            options={DETAIL_OPTIONS}
            value={detail}
            onChange={(v) => setDetail(v as Detail)}
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <OptionGroup
            label={
              <span className="inline-flex items-center gap-1.5">
                Composition
                {background === "scene" && (
                  <span className="text-[10px] font-semibold text-emerald-400 normal-case">
                    ← richer scene
                  </span>
                )}
              </span>
            }
            options={BG_OPTIONS}
            value={background}
            onChange={(v) => setBackground(v as Background)}
          />
          <OptionGroup
            label={
              <span className="inline-flex items-center gap-1.5">
                Aspect ratio
                {aspectRatio === "3:4" && (
                  <span className="text-[10px] font-mono text-neutral-500 normal-case">
                    ↓ KDP 8.5×11 closest
                  </span>
                )}
              </span>
            }
            options={ASPECT_OPTIONS}
            value={aspectRatio}
            onChange={(v) => setAspectRatio(v as AspectRatio)}
          />
        </div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <ReferenceImageField
            value={reference}
            onChange={setReference}
            helper="Every page in this book will borrow style, palette, and composition from this reference. Remove to clear."
          />
        </div>
      </div>

      {/* Cover pair (shared with /playground) — front + back side-by-side */}
      <CoverPair
        bookSlug={category.slug}
        title={category.coverTitle ?? category.name}
        description={category.coverScene}
        frontCover={{
          // "generating" wins over "done" — otherwise the previous cover
          // image stays visible during regenerate with no spinner, making
          // the click feel like nothing happened until the new image
          // suddenly swaps in. Check the build signal first.
          status:
            pdfBuilding && pdfStep.toLowerCase().includes("cover")
              ? "generating"
              : activeCover
                ? "done"
                : "pending",
          dataUrl: activeCover,
        }}
        backCover={{
          // Same priority as the front cover — show the spinner during a
          // regenerate even when the old image is still in state.
          status: backCoverBuilding
            ? "generating"
            : activeBackCover
              ? "done"
              : backCoverError
                ? "error"
                : "pending",
          dataUrl: activeBackCover,
          error: backCoverError ?? undefined,
        }}
        coverStyle={coverStyle}
        coverBorder={coverBorder}
        onCoverStyleChange={setCoverStyle}
        onCoverBorderChange={setCoverBorder}
        onRegenerateFront={() => void regenerateCover()}
        onRegenerateBack={() => void regenerateBackCover()}
        onRefineFront={(dataUrl) =>
          setRefine({
            open: true,
            context: "cover",
            dataUrl,
            title: `${category.name} — cover`,
            subtitle:
              "Describe what to change. Gemini edits the current cover while keeping the layout.",
            downloadName: `cover_${category.slug}.png`,
            onRefined: (d) =>
              setCovers((prev) => ({ ...prev, [category.slug]: d })),
          })
        }
        onRefineBack={(dataUrl) =>
          setRefine({
            open: true,
            context: "back-cover",
            dataUrl,
            title: `${category.name} — back cover`,
            subtitle:
              "Describe what to change. Gemini edits while preserving the tagline box and barcode safe-zone.",
            downloadName: `back_cover_${category.slug}.png`,
            onRefined: (d) =>
              setBackCovers((prev) => ({ ...prev, [category.slug]: d })),
          })
        }
        rightExtras={
          <MockupGate
            frontCoverReady={!!activeCover}
            pagesReady={categoryDone}
            minPages={3}
          >
            <MockupGenerator
              coverDataUrl={activeCover ?? null}
              interiorDataUrl={
                Object.values(items).find(
                  (i) => i.status === "done" && i.dataUrl,
                )?.dataUrl
              }
              title={`${category.name} — Amazon mockups`}
              bookName={category.slug}
            />
          </MockupGate>
        }
      />

      {/* KDP metadata panel — only after all pages of this category are done */}
      {categoryDone === category.prompts.length ? (
        <KdpMetadataPanel
          bookName={category.coverTitle ?? category.name}
          pageCount={category.prompts.length}
          metadata={activeMetadata}
          loading={kdpLoading}
          error={kdpError}
          onGenerate={() => void generateMetadataForCategory()}
        />
      ) : (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-xs text-violet-200">
          🔒 KDP Metadata generator unlocks once all{" "}
          {category.prompts.length} pages of this category are generated.
          Currently {categoryDone}/{category.prompts.length} done.
        </div>
      )}

      {/* Custom prompt */}
      <div className="rounded-2xl p-6 bg-zinc-900/60 backdrop-blur-xl border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <h3 className="font-semibold">Custom Subject</h3>
        </div>
        <p className="text-xs text-neutral-500 mb-3">
          Enter a subject (e.g. &quot;happy robot building a sandcastle&quot;) — we
          wrap it in the proven coloring-book formula using your style controls above.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customSubject}
            onChange={(e) => setCustomSubject(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runCustom()}
            placeholder="e.g. happy astronaut floating in space"
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-black/50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={runCustom}
            disabled={!customSubject.trim() || customStatus === "generating"}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-linear-to-r from-violet-500 to-cyan-400 text-white hover:shadow-lg hover:shadow-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {customStatus === "generating" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            Generate
          </button>
        </div>

        <AnimatePresence>
          {customStatus === "done" && customResult.dataUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 relative"
            >
              <div className="rounded-xl overflow-hidden border border-white/10 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={customResult.dataUrl} alt={customSubject} className="w-full" />
              </div>
              <a
                href={customResult.dataUrl}
                download={`custom_${customSubject.replace(/[^a-z0-9]+/gi, "_")}.png`}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white text-black"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </a>
            </motion.div>
          )}
          {customStatus === "error" && customResult.error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 p-3 rounded-xl bg-red-950/30 border border-red-900/50 text-sm text-red-300 flex items-start gap-2"
            >
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{customResult.error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Prompts grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {category.prompts.map((p) => {
          const it = items[p.id];
          return (
            <motion.div
              key={p.id}
              layout
              className="group rounded-2xl overflow-hidden bg-zinc-900/60 backdrop-blur-xl border border-white/10 hover:border-violet-700 transition-all"
            >
              <div
                className="bg-linear-to-br from-zinc-800 to-zinc-900 relative overflow-hidden"
                style={{ aspectRatio: aspectRatio.replace(":", "/") }}
              >
                {it?.status === "done" && it.dataUrl ? (
                  <button
                    type="button"
                    onClick={() =>
                      setRefine({
                        open: true,
                        context: "page",
                        dataUrl: it.dataUrl,
                        title: `${p.name}`,
                        subtitle: `${category.name} · #${p.id}`,
                        downloadName: `${p.id}_${p.name.replace(/[^a-z0-9]+/gi, "_")}.png`,
                        onRefined: (dataUrl) =>
                          setItems((prev) => ({
                            ...prev,
                            [p.id]: { ...prev[p.id], status: "done", dataUrl },
                          })),
                      })
                    }
                    className="absolute inset-0 w-full h-full group/img"
                    title="Click to refine"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={it.dataUrl}
                      alt={p.name}
                      className="absolute inset-0 w-full h-full object-contain bg-white"
                    />
                    {background !== "framed" && (
                      <div
                        className="absolute inset-[5%] border-[2.5px] border-black pointer-events-none"
                        aria-hidden="true"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
                      <MessageSquare className="w-5 h-5" />
                      <span className="text-xs font-semibold">Refine</span>
                    </div>
                  </button>
                ) : it?.status === "generating" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-linear-to-br from-violet-950/30 to-pink-950/30">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                    <p className="text-xs font-medium text-violet-300">Generating…</p>
                  </div>
                ) : it?.status === "error" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-3 bg-red-950/30">
                    <XCircle className="w-6 h-6 text-red-500" />
                    <p className="text-[10px] text-center text-red-300 line-clamp-3">
                      {it.error}
                    </p>
                  </div>
                ) : it?.status === "queued" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                    <p className="text-xs text-neutral-500">Queued</p>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-40">
                    <ImageIcon className="w-8 h-8" />
                    <p className="text-xs">Not generated</p>
                  </div>
                )}
                {it?.status === "done" && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-emerald-500 text-white rounded-full p-1 shadow-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2">
                <div>
                  <p className="font-semibold text-sm truncate">{p.name}</p>
                  <p className="text-[11px] text-neutral-500 font-mono">#{p.id}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => runOne(p)}
                    disabled={it?.status === "generating" || it?.status === "queued"}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium bg-linear-to-r from-violet-500 to-cyan-400 text-white hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {it?.status === "done" ? (
                      <>
                        <RefreshCw className="w-3 h-3" /> Regen
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3 h-3" /> Generate
                      </>
                    )}
                  </button>
                  {it?.status === "done" && it.dataUrl && (
                    <a
                      href={it.dataUrl}
                      download={`${p.id}_${p.name.replace(/[^a-z0-9]+/gi, "_")}.png`}
                      className="inline-flex items-center justify-center p-1.5 rounded-md bg-white/10 hover:bg-white/20"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

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

function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: React.ReactNode;
  options: { value: T; label: string; sub?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-neutral-400 mb-2">{label}</p>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                active
                  ? "bg-linear-to-r from-violet-500 to-cyan-400 text-white border-transparent shadow"
                  : "bg-black/40 border-white/10 text-neutral-300 hover:border-violet-500/40"
              )}
            >
              {o.label}
              {o.sub && (
                <span
                  className={cn(
                    "ml-1.5 text-[10px]",
                    active ? "text-white/70" : "text-neutral-500"
                  )}
                >
                  {o.sub}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Horizontally scrollable category bar with left/right arrow buttons.
 * Arrows fade out when at the corresponding scroll boundary so the user
 * always knows whether more content lies in that direction. Mirrors the
 * apple-cards-carousel boundary logic but tighter (categories are short).
 */
function CategoryScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const recompute = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    recompute();
    const onResize = () => recompute();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [recompute]);

  function scrollBy(amount: number) {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollTo({
      left: Math.max(0, Math.min(max, el.scrollLeft + amount)),
      behavior: "smooth",
    });
  }

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={recompute}
        className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide items-center scroll-smooth"
      >
        {children}
      </div>
      <button
        type="button"
        aria-label="Scroll categories left"
        onClick={() => scrollBy(-300)}
        disabled={!canLeft}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-9 w-9 rounded-full bg-zinc-900 border border-white/15 flex items-center justify-center text-neutral-200 hover:bg-zinc-800 disabled:opacity-0 disabled:pointer-events-none transition-opacity shadow-lg"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label="Scroll categories right"
        onClick={() => scrollBy(300)}
        disabled={!canRight}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-9 w-9 rounded-full bg-zinc-900 border border-white/15 flex items-center justify-center text-neutral-200 hover:bg-zinc-800 disabled:opacity-0 disabled:pointer-events-none transition-opacity shadow-lg"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
