"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";
import { BookFlipPage } from "./book-flip-page";

interface PageFlipApi {
  flipNext: () => void;
  flipPrev: () => void;
}
interface FlipBookRef {
  pageFlip: () => PageFlipApi | undefined;
}

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
  /**
   * Optional "This Book Belongs To" nameplate page — slotted in as page 2,
   * right after the front cover (matches the printed PDF order). When
   * omitted, falls back to a blank page after the cover.
   */
  belongsTo?: { imageUrl?: string };
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
  belongsTo,
  pages,
  width = 360,
  height = 480,
  alternateBlankPages = true,
}: BookFlipProps) {
  // Page order — designed so EVERY illustration lands on the RIGHT side
  // (recto) of the open spread, with blanks on the LEFT (verso). Mirrors
  // how a printed coloring book is laid out: when the kid opens the book,
  // the next coloring page is always on the right and the blank verso is
  // on the left so coloring marks don't bleed onto the next illustration.
  //
  // react-pageflip with showCover=true renders the FIRST and LAST pages
  // alone, and all middle pages paired. So array index 0 = front cover
  // alone, index 1 = LEFT of spread 1, index 2 = RIGHT of spread 1, etc.
  // Content pages must therefore sit at EVEN indices.
  //
  // NOTE: this layout is ONLY for the preview UI. The KDP/Etsy PDF flow
  // (lib/pdf.ts) keeps its own alternating-blank layout per print spec.
  const renderedPages = useMemo(() => {
    const out: React.ReactElement[] = [];
    // [0] front cover, alone on right.
    out.push(
      <BookFlipPage
        key="cover-front"
        imageUrl={cover?.imageUrl}
        variant="cover"
        label="Cover"
      />,
    );
    // First spread (indices 1, 2): blank verso + belongs-to recto.
    if (belongsTo?.imageUrl) {
      if (alternateBlankPages) {
        out.push(<BookFlipPage key="belongs-to-verso" variant="blank" />);
      }
      out.push(
        <BookFlipPage
          key="belongs-to"
          imageUrl={belongsTo.imageUrl}
          variant="interior"
          label="This Book Belongs To"
          brandMark
        />,
      );
    }
    // Each art page: blank verso (left) + illustration recto (right).
    pages.forEach((p, i) => {
      if (alternateBlankPages) {
        out.push(<BookFlipPage key={`p-${i}-verso`} variant="blank" />);
      }
      out.push(
        <BookFlipPage
          key={`p-${i}-art`}
          imageUrl={p.imageUrl}
          label={p.label}
          variant="interior"
          pageNumber={i + 1}
        />,
      );
    });
    // Ensure even total length so the back cover lands alone on the right
    // (showCover requires an even page count). If we'd otherwise close on
    // an odd index, slot a blank verso just before the back cover.
    if (out.length % 2 === 0) {
      out.push(<BookFlipPage key="pre-back-cover-blank" variant="blank" />);
    }
    // [last] back cover, alone on right.
    out.push(
      <BookFlipPage
        key="back-cover"
        imageUrl={backCover?.imageUrl}
        variant="cover"
        label="Back cover"
      />,
    );
    return out;
  }, [
    cover?.imageUrl,
    backCover?.imageUrl,
    belongsTo?.imageUrl,
    pages,
    alternateBlankPages,
  ]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const flipBookRef = useRef<FlipBookRef | null>(null);

  // Arrow-key page-flip. Active only while the book is in view, and skipped
  // when the user is typing in an input. preventDefault stops the page from
  // also scrolling horizontally.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let visible = false;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible = entry.isIntersecting;
      },
      { threshold: 0.25 },
    );
    observer.observe(el);

    const onKey = (e: KeyboardEvent) => {
      if (!visible) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      const api = flipBookRef.current?.pageFlip();
      if (!api) return;
      e.preventDefault();
      if (e.key === "ArrowLeft") api.flipPrev();
      else api.flipNext();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <HTMLFlipBook
        ref={flipBookRef}
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
