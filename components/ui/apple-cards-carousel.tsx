"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  IconArrowNarrowLeft,
  IconArrowNarrowRight,
  IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface CardData {
  src?: string;
  title: string;
  category: string;
  content: ReactNode;
  /**
   * Optional custom cover ReactNode that overrides `src`. Use this for live
   * status states (pending, generating, error) where you don't have an image.
   */
  cover?: ReactNode;
  /** Optional badge rendered in the top-right corner of the card front. */
  badge?: ReactNode;
  /**
   * Optional small action rendered in the top-LEFT corner of the card front
   * (e.g. a Regenerate button). Click events are stopped from propagating so
   * pressing the action doesn't also open the card.
   */
  action?: ReactNode;
}

interface CarouselContextValue {
  onCardClose: (index: number) => void;
  currentIndex: number;
}

const CarouselContext = createContext<CarouselContextValue>({
  onCardClose: () => {},
  currentIndex: 0,
});

export interface CarouselProps {
  items: ReactNode[];
  initialScroll?: number;
  className?: string;
}

export function Carousel({
  items,
  initialScroll = 0,
  className,
}: CarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const checkScrollability = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      const maxScroll = scrollWidth - clientWidth;
      setCanScrollLeft(scrollLeft > 4);
      // Disable right arrow when we're within 4px of max scroll. With the
      // trailing padding now reduced to a fixed 16px (was last:pr-[20%]),
      // a tight tolerance is correct — anything else lets the carousel
      // drift into empty space past the final card.
      setCanScrollRight(scrollLeft < maxScroll - 4);
    }
  };

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = initialScroll;
      checkScrollability();
    }
    // Re-check whenever the items prop changes — new cards added/removed
    // can shift the scroll boundaries.
    const id = window.setTimeout(checkScrollability, 200);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScroll, items.length]);

  const scrollLeft = () => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollTo({
      left: Math.max(0, el.scrollLeft - 300),
      behavior: "smooth",
    });
  };
  const scrollRight = () => {
    const el = carouselRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    el.scrollTo({
      left: Math.min(maxScroll, el.scrollLeft + 300),
      behavior: "smooth",
    });
  };

  const isMobile = () =>
    typeof window !== "undefined" && window.innerWidth < 768;

  const handleCardClose = (index: number) => {
    if (carouselRef.current) {
      const cardWidth = isMobile() ? 230 : 384;
      const gap = isMobile() ? 4 : 8;
      const scrollPosition = (cardWidth + gap) * (index + 1);
      carouselRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
      setCurrentIndex(index);
    }
  };

  return (
    <CarouselContext.Provider
      value={{ onCardClose: handleCardClose, currentIndex }}
    >
      <div className={cn("relative w-full", className)}>
        <div
          ref={carouselRef}
          onScroll={checkScrollability}
          className="flex w-full overflow-x-scroll overscroll-x-auto scroll-smooth py-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex flex-row justify-start gap-4 pl-4 pr-4 mx-auto">
            {items.map((item, index) => (
              <motion.div
                key={`carousel-card-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.4,
                    delay: 0.05 * index,
                    ease: "easeOut",
                  },
                }}
                className="rounded-3xl"
              >
                {item}
              </motion.div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2 mr-4">
          <button
            type="button"
            aria-label="Scroll left"
            disabled={!canScrollLeft}
            onClick={scrollLeft}
            className="relative z-30 h-10 w-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-neutral-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          >
            <IconArrowNarrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            disabled={!canScrollRight}
            onClick={scrollRight}
            className="relative z-30 h-10 w-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-neutral-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          >
            <IconArrowNarrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </CarouselContext.Provider>
  );
}

export interface CardProps {
  card: CardData;
  index: number;
  /** Card width preset. */
  size?: "sm" | "md" | "lg";
  /**
   * If provided, clicking the card calls this instead of expanding the
   * built-in fullscreen detail. Use this when a parent wants to open its
   * own modal (e.g. an existing image-refine dialog) rather than the
   * generic apple-style card expansion.
   */
  onClick?: () => void;
}

const SIZE_CLASSES: Record<NonNullable<CardProps["size"]>, string> = {
  sm: "h-72 w-48 md:h-96 md:w-72",
  md: "h-80 w-56 md:h-[28rem] md:w-80",
  lg: "h-80 w-56 md:h-[40rem] md:w-96",
};

export function Card({ card, index, size = "md", onClick }: CardProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { onCardClose } = useContext(CarouselContext);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleClose();
    }
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useOutsideClick(containerRef, () => {
    if (open) handleClose();
  });

  const handleOpen = () => {
    if (onClick) {
      onClick();
      return;
    }
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
    onCardClose(index);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 h-screen z-60 overflow-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-black/85 backdrop-blur-md h-full w-full fixed inset-0"
            />
            <motion.div
              ref={containerRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-5xl mx-auto bg-neutral-950 border border-white/10 h-fit z-70 my-10 p-4 md:p-8 rounded-3xl font-sans relative shadow-2xl shadow-violet-500/10"
            >
              <button
                type="button"
                aria-label="Close"
                onClick={handleClose}
                className="sticky top-4 h-9 w-9 right-0 ml-auto bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform z-10"
              >
                <IconX className="h-5 w-5 text-neutral-900" />
              </button>
              <p className="text-sm font-medium text-violet-300 -mt-6">
                {card.category}
              </p>
              <p className="text-2xl md:text-4xl font-semibold text-white mt-2">
                {card.title}
              </p>
              <div className="py-6">{card.content}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={handleOpen}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "rounded-3xl bg-neutral-900 border border-white/10 overflow-hidden flex flex-col items-start justify-start relative z-10 shrink-0 text-left",
          SIZE_CLASSES[size],
        )}
      >
        <div className="absolute h-full top-0 inset-x-0 bg-linear-to-b from-black/60 via-transparent to-black/40 z-30 pointer-events-none" />
        <div className="relative z-40 p-5 md:p-6 w-full flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-white/80 text-xs md:text-sm font-medium font-sans">
              {card.category}
            </p>
            <p className="text-white text-lg md:text-2xl font-semibold max-w-[14ch] md:max-w-[16ch] text-left [text-wrap:balance] font-sans mt-1 truncate">
              {card.title}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0 z-50">
            {card.badge && <div>{card.badge}</div>}
            {card.action && (
              <div
                onClick={(e) => {
                  // Prevent the card's own click handler from firing —
                  // action buttons (e.g. Regenerate) act independently.
                  e.stopPropagation();
                }}
              >
                {card.action}
              </div>
            )}
          </div>
        </div>
        <div className="absolute inset-0 z-10">
          {card.cover ? (
            card.cover
          ) : card.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.src}
              alt={card.title}
              className="object-cover absolute inset-0 w-full h-full"
            />
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-zinc-800 to-zinc-900" />
          )}
        </div>
      </motion.button>
    </>
  );
}

function useOutsideClick(
  ref: React.RefObject<HTMLDivElement | null>,
  callback: (event: MouseEvent | TouchEvent) => void,
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!ref.current || (target && ref.current.contains(target))) return;
      callback(event);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, callback]);
}
