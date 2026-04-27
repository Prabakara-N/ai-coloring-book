"use client";

import { forwardRef } from "react";
import { ColoringBorder } from "@/components/ui/coloring-border";

export interface BookFlipPageProps {
  /** Image data URL or remote URL. Optional — page can be a blank back. */
  imageUrl?: string;
  /** Label text, e.g. "Page 3 / 20". */
  label?: string;
  /** Whether to render the decorative coloring border on the page. */
  showBorder?: boolean;
  /** Variant — controls bg/style. Cover uses object-cover; interior uses object-contain. */
  variant?: "cover" | "interior" | "blank";
  /** When true, shows page number in bottom-center. */
  pageNumber?: number;
}

/**
 * One physical "page" in the page-flip book. forwardRef is required by
 * react-pageflip — it injects a ref into each child to drive the flip.
 */
export const BookFlipPage = forwardRef<HTMLDivElement, BookFlipPageProps>(
  function BookFlipPage(
    { imageUrl, label, showBorder = true, variant = "interior", pageNumber },
    ref,
  ) {
    if (variant === "blank") {
      return (
        <div
          ref={ref}
          className="bg-white flex items-center justify-center text-neutral-300 text-xs italic"
        >
          (blank)
        </div>
      );
    }

    const fit = variant === "cover" ? "object-cover" : "object-contain";

    return (
      <div ref={ref} className="bg-white relative overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={label ?? ""}
            className={`absolute inset-0 w-full h-full ${fit}`}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-400 text-sm">
            Not generated yet
          </div>
        )}
        {variant === "interior" && showBorder && imageUrl && (
          // attribution intentionally hidden for now (per product decision)
          // — re-enable by passing attribution="crayonsparks.com"
          <ColoringBorder />
        )}
        {pageNumber !== undefined && (
          <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-neutral-500 font-mono">
            {pageNumber}
          </div>
        )}
      </div>
    );
  },
);
