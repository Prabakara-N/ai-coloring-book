/**
 * Test-only API helpers for the story-book test page. Centralized so the
 * shell stays UI-focused. Delete with the rest of the test scaffolding
 * when the production studio ships.
 */

import type { StoryPageInput } from "@/lib/story-book-pdf";

export interface TestApiResult {
  dataUrl?: string;
  elapsedMs?: number;
  error?: string;
  anchored?: { cover: boolean; chain?: boolean };
}

export async function postTestApi(
  body: unknown,
  signal: AbortSignal,
): Promise<TestApiResult> {
  const res = await fetch("/api/generate-story-book-test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const json = (await res.json()) as TestApiResult;
  if (!res.ok || !json.dataUrl) {
    throw new Error(json.error ?? "Generation failed");
  }
  return json;
}

export function isAbortError(e: unknown): boolean {
  return (
    (e instanceof DOMException && e.name === "AbortError") ||
    (e instanceof Error && e.name === "AbortError")
  );
}

interface AssemblePdfArgs {
  title: string;
  slug: string;
  cover: { dataUrl: string };
  backCover?: { dataUrl: string };
  pages: StoryPageInput[];
}

export async function assembleAndDownloadPdf({
  title,
  slug,
  cover,
  backCover,
  pages,
}: AssemblePdfArgs): Promise<void> {
  const res = await fetch("/api/assemble-story-book-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, cover, backCover, pages }),
  });
  if (!res.ok) {
    const json = (await res
      .json()
      .catch(() => ({ error: "PDF build failed" }))) as { error?: string };
    throw new Error(json.error ?? "PDF build failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
