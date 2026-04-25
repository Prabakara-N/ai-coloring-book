"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { BookFlipPage } from "./book-flip-page";

// HTMLFlipBook touches `window` during init — load client-only.
const HTMLFlipBook = dynamic(
  () => import("react-pageflip").then((m) => m.default),
  { ssr: false },
);

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
    <HTMLFlipBook
      width={width}
      height={height}
      size="fixed"
      minWidth={250}
      maxWidth={600}
      minHeight={350}
      maxHeight={800}
      drawShadow
      flippingTime={650}
      usePortrait
      startZIndex={0}
      autoSize={false}
      maxShadowOpacity={0.5}
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
  );
}
