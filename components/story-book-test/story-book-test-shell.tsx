"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ActionBar } from "./action-bar";
import { BookHeader } from "./book-header";
import { CoverPanel, type CoverPanelState } from "./cover-panel";
import { SceneCard } from "./scene-card";
import {
  assembleAndDownloadPdf,
  isAbortError,
  postTestApi,
} from "./test-api";
import {
  DEFAULT_FIXTURE_SLUG,
  getFixture,
} from "@/lib/story-book-fixtures";

type ImageState = CoverPanelState;

const FIXTURE = getFixture(DEFAULT_FIXTURE_SLUG);
const PENDING_SCENES: ImageState[] = FIXTURE.scenes.map(() => ({
  status: "pending",
}));

export function StoryBookTestShell() {
  const [cover, setCover] = useState<ImageState>({ status: "pending" });
  const [backCover, setBackCover] = useState<ImageState>({ status: "pending" });
  const [scenes, setScenes] = useState<ImageState[]>(() => [...PENDING_SCENES]);
  const [running, setRunning] = useState(false);
  const [pdfBuilding, setPdfBuilding] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastDoneIndexRef = useRef<number>(-1);

  const doneCount = useMemo(
    () => scenes.filter((s) => s.status === "done").length,
    [scenes],
  );
  const allPagesDone = doneCount === FIXTURE.scenes.length;
  const coverDone = cover.status === "done" && !!cover.dataUrl;
  const backCoverDone = backCover.status === "done" && !!backCover.dataUrl;

  const updateScene = useCallback(
    (index: number, patch: Partial<ImageState>) => {
      setScenes((prev) =>
        prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
      );
    },
    [],
  );

  const runCover = useCallback(
    async (signal: AbortSignal): Promise<string | null> => {
      setCover({ status: "generating" });
      try {
        const result = await postTestApi({ mode: "cover" }, signal);
        setCover({
          status: "done",
          dataUrl: result.dataUrl,
          elapsedMs: result.elapsedMs,
        });
        return result.dataUrl ?? null;
      } catch (e) {
        if (isAbortError(e)) {
          setCover({ status: "pending" });
          throw e;
        }
        setCover({
          status: "error",
          errorMessage: e instanceof Error ? e.message : "Cover failed",
        });
        return null;
      }
    },
    [],
  );

  const runBackCover = useCallback(
    async (
      coverDataUrl: string | null,
      signal: AbortSignal,
    ): Promise<string | null> => {
      setBackCover({ status: "generating" });
      try {
        const result = await postTestApi(
          {
            mode: "back-cover",
            coverReferenceDataUrl: coverDataUrl ?? undefined,
          },
          signal,
        );
        setBackCover({
          status: "done",
          dataUrl: result.dataUrl,
          elapsedMs: result.elapsedMs,
        });
        return result.dataUrl ?? null;
      } catch (e) {
        if (isAbortError(e)) {
          setBackCover({ status: "pending" });
          throw e;
        }
        setBackCover({
          status: "error",
          errorMessage: e instanceof Error ? e.message : "Back cover failed",
        });
        return null;
      }
    },
    [],
  );

  const runPage = useCallback(
    async (
      index: number,
      coverDataUrl: string | null,
      chainDataUrl: string | null,
      signal: AbortSignal,
    ) => {
      updateScene(index, {
        status: "generating",
        errorMessage: undefined,
      });
      try {
        const result = await postTestApi(
          {
            mode: "page",
            sceneIndex: index,
            coverReferenceDataUrl: coverDataUrl ?? undefined,
            chainReferenceDataUrl: chainDataUrl ?? undefined,
          },
          signal,
        );
        updateScene(index, {
          status: "done",
          dataUrl: result.dataUrl,
          elapsedMs: result.elapsedMs,
        });
        if (result.dataUrl) lastDoneIndexRef.current = index;
      } catch (e) {
        if (isAbortError(e)) {
          updateScene(index, { status: "pending" });
          throw e;
        }
        updateScene(index, {
          status: "error",
          errorMessage: e instanceof Error ? e.message : "Failed",
        });
      }
    },
    [updateScene],
  );

  const handleGenerateCover = useCallback(async () => {
    if (running) return;
    setGlobalError(null);
    setRunning(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await runCover(controller.signal);
    } catch (e) {
      if (!isAbortError(e)) {
        setGlobalError(e instanceof Error ? e.message : "Cover failed");
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [running, runCover]);

  const handleGenerateAll = useCallback(async () => {
    if (running) return;
    setGlobalError(null);
    setRunning(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      let coverDataUrl = cover.dataUrl ?? null;
      if (!coverDataUrl) {
        coverDataUrl = await runCover(controller.signal);
        if (!coverDataUrl) return;
      }

      setScenes((prev) =>
        prev.map((s) =>
          s.status === "done" ? s : { ...s, status: "queued" },
        ),
      );

      let prevPageDataUrl: string | null = null;
      for (let i = 0; i < FIXTURE.scenes.length; i++) {
        if (controller.signal.aborted) break;
        const current = scenes[i];
        if (current?.status === "done" && current.dataUrl) {
          prevPageDataUrl = current.dataUrl;
          continue;
        }
        try {
          await runPage(i, coverDataUrl, prevPageDataUrl, controller.signal);
        } catch (e) {
          if (isAbortError(e)) break;
        }
        // Read the freshly-written page from the ref so the next loop pass
        // chains against the actual rendered image (state updates are async
        // and we can't read setScenes synchronously).
        if (lastDoneIndexRef.current === i) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          prevPageDataUrl = (scenesRef.current[i] ?? null) as string | null;
        }
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [running, runCover, runPage, scenes, cover.dataUrl]);

  // Mirror scenes into a ref so the generation loop can read the latest
  // dataUrl for chaining without waiting on a re-render.
  const scenesRef = useRef<Array<string | null>>(PENDING_SCENES.map(() => null));
  scenesRef.current = scenes.map((s) => s.dataUrl ?? null);

  const handleAbort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleRegenerateOne = useCallback(
    async (index: number) => {
      if (running) return;
      setGlobalError(null);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const coverDataUrl = cover.dataUrl ?? null;
        // Chain reference is the most recently completed page BEFORE this one.
        let chain: string | null = null;
        for (let i = index - 1; i >= 0; i--) {
          if (scenes[i]?.status === "done" && scenes[i]?.dataUrl) {
            chain = scenes[i]!.dataUrl!;
            break;
          }
        }
        await runPage(index, coverDataUrl, chain, controller.signal);
      } catch (e) {
        if (!isAbortError(e)) {
          setGlobalError(e instanceof Error ? e.message : "Page failed");
        }
      } finally {
        abortRef.current = null;
      }
    },
    [running, runPage, scenes, cover.dataUrl],
  );

  const handleRegenerateCover = useCallback(async () => {
    if (running) return;
    setGlobalError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await runCover(controller.signal);
    } catch (e) {
      if (!isAbortError(e)) {
        setGlobalError(e instanceof Error ? e.message : "Cover failed");
      }
    } finally {
      abortRef.current = null;
    }
  }, [running, runCover]);

  const handleGenerateBackCover = useCallback(async () => {
    if (running) return;
    setGlobalError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await runBackCover(cover.dataUrl ?? null, controller.signal);
    } catch (e) {
      if (!isAbortError(e)) {
        setGlobalError(e instanceof Error ? e.message : "Back cover failed");
      }
    } finally {
      abortRef.current = null;
    }
  }, [running, runBackCover, cover.dataUrl]);

  const handleDownloadPdf = useCallback(async () => {
    if (!coverDone || !allPagesDone || pdfBuilding) return;
    setGlobalError(null);
    setPdfBuilding(true);
    try {
      await assembleAndDownloadPdf({
        title: FIXTURE.title,
        slug: FIXTURE.slug,
        cover: { dataUrl: cover.dataUrl! },
        backCover: backCoverDone
          ? { dataUrl: backCover.dataUrl! }
          : undefined,
        pages: scenes.map((s, i) => ({
          id: FIXTURE.scenes[i].id,
          name: FIXTURE.scenes[i].name,
          dataUrl: s.dataUrl!,
        })),
      });
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : "PDF build failed");
    } finally {
      setPdfBuilding(false);
    }
  }, [
    coverDone,
    allPagesDone,
    pdfBuilding,
    scenes,
    cover.dataUrl,
    backCoverDone,
    backCover.dataUrl,
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 md:px-8 md:py-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <BookHeader
          title={FIXTURE.title}
          characters={FIXTURE.characters}
          palette={FIXTURE.palette}
          totalScenes={FIXTURE.scenes.length}
        />

        <CoverPanel
          label="Front cover"
          description={FIXTURE.coverScene}
          hint="Generate the cover first. Every page reuses it as a visual anchor so character look and style stay consistent across the book."
          state={cover}
          running={running}
          onGenerate={handleGenerateCover}
          onRegenerate={handleRegenerateCover}
        />

        <CoverPanel
          label="Back cover"
          description={FIXTURE.backCoverScene}
          tagline={FIXTURE.backCoverTagline}
          hint="Uses the front cover as a visual anchor. The bottom-right corner is reserved as a blank rectangle for the KDP barcode."
          state={backCover}
          running={running}
          disabledReason={
            !coverDone
              ? "Generate the front cover first — the back cover anchors on it for character + palette consistency."
              : undefined
          }
          onGenerate={handleGenerateBackCover}
          onRegenerate={handleGenerateBackCover}
        />

        <ActionBar
          totalScenes={FIXTURE.scenes.length}
          doneCount={doneCount}
          coverDone={coverDone}
          backCoverDone={backCoverDone}
          allPagesDone={allPagesDone}
          running={running}
          pdfBuilding={pdfBuilding}
          pdfReady={coverDone && allPagesDone}
          onGenerateAll={handleGenerateAll}
          onAbort={handleAbort}
          onDownloadPdf={handleDownloadPdf}
        />

        {globalError && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-sm text-rose-200">
            {globalError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FIXTURE.scenes.map((scene, i) => {
            const state = scenes[i];
            return (
              <SceneCard
                key={scene.id}
                index={i}
                name={scene.name}
                scene={scene.scene}
                dialogue={scene.dialogue}
                narration={scene.narration}
                status={state.status}
                dataUrl={state.dataUrl}
                errorMessage={state.errorMessage}
                elapsedMs={state.elapsedMs}
                onRegenerate={() => void handleRegenerateOne(i)}
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}

