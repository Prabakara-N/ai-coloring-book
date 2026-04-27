"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { BookFlipPage } from "./book-flip-page";

// HTMLFlipBook touches `window` during init — load client-only.
// Reserve the same footprint as the loaded book so toggling Carousel→Book
// doesn't cause a layout flash (empty content → footer rises → book pops in).
const HTMLFlipBook = dynamic(
  () => import("react-pageflip").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-md bg-zinc-900/40 border border-white/5 flex items-center justify-center text-neutral-500 text-xs animate-pulse"
        // Match the default open-book footprint: 2 × 360px wide, 480px tall
        style={{ width: 720, height: 480, maxWidth: "100%" }}
      >
        Loading book preview…
      </div>
    ),
  },
);

/**
 * Pre-fetch the react-pageflip module on first BookStudio mount so by the
 * time the user clicks "Book preview" the chunk is already in memory and
 * HTMLFlipBook renders instantly (no skeleton flicker, no layout shift).
 * Call this from BookStudio.tsx (or any component that may eventually open
 * the book preview) inside a useEffect.
 */
export function prefetchBookFlip(): void {
  void import("react-pageflip");
}

export interface BookFlipPageInput {
  imageUrl?: string;
  label?: string;
}

interface BookFlipProps {
  cover?: { imageUrl?: string };
  backCover?: { imageUrl?: string };
  pages: BookFlipPageInput[];
  /** Single page width in px. Book renders 2 pages side-by-side at 2× this. */
  width?: number;
  height?: number;
  /** When true, every interior art page is followed by a blank page (KDP layout). */
  alternateBlankPages?: boolean;
}

export function BookFlip({
  cover,
  backCover,
  pages,
  width = 360,
  height = 480,
  alternateBlankPages = true,
}: BookFlipProps) {
  // Flatten pages: cover-front, [page1, blank?, page2, blank?, ...], back-cover
  const renderedPages = useMemo(() => {
    const out: React.ReactElement[] = [];
    out.push(
      <BookFlipPage
        key="cover-front"
        imageUrl={cover?.imageUrl}
        variant="cover"
        label="Cover"
      />,
    );
    out.push(<BookFlipPage key="cover-inner-blank" variant="blank" />);
    pages.forEach((p, i) => {
      out.push(
        <BookFlipPage
          key={`p-${i}-art`}
          imageUrl={p.imageUrl}
          label={p.label}
          variant="interior"
          pageNumber={i + 1}
        />,
      );
      if (alternateBlankPages) {
        out.push(<BookFlipPage key={`p-${i}-blank`} variant="blank" />);
      }
    });
    out.push(<BookFlipPage key="back-cover-inner-blank" variant="blank" />);
    out.push(
      <BookFlipPage
        key="back-cover"
        imageUrl={backCover?.imageUrl}
        variant="cover"
        label="Back cover"
      />,
    );
    return out;
  }, [cover?.imageUrl, backCover?.imageUrl, pages, alternateBlankPages]);

  return (
    <div className="relative">
      <HTMLFlipBook
        width={width}
        height={height}
        size="fixed"
        minWidth={280}
        maxWidth={520}
        minHeight={380}
        maxHeight={720}
        drawShadow
        flippingTime={650}
        usePortrait={false}
        startZIndex={0}
        autoSize={false}
        maxShadowOpacity={0.55}
        showCover
        mobileScrollSupport
        clickEventForward
        useMouseEvents
        swipeDistance={30}
        showPageCorners
        disableFlipByClick={false}
        className="shadow-2xl shadow-black/60 rounded-md"
        style={{}}
        startPage={0}
      >
        {renderedPages}
      </HTMLFlipBook>
      {/* Center spine — visible vertical line down the middle of the open
          spread, like a real book's binding. Pointer-events-none so it doesn't
          block page flipping. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center"
      >
        <div className="w-[3px] h-full bg-linear-to-b from-black/40 via-black/80 to-black/40 shadow-[0_0_8px_rgba(0,0,0,0.6)]" />
      </div>
    </div>
  );
}
