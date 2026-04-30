"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, Hand, Repeat } from "lucide-react";
import {
  DraggableCardBody,
  DraggableCardContainer,
} from "@/components/ui/draggable-card";
import { DirectionAwareHover } from "@/components/ui/direction-aware-hover";

interface BookCover {
  src: string;
  title: string;
}

const carouselBooks: BookCover[] = [
  { src: "/visuals/covers/farm-animals.png", title: "Farm Animals" },
  { src: "/visuals/covers/dinosaurs.png", title: "Dinosaurs" },
  { src: "/visuals/covers/woodland-baby-animals.png", title: "Woodland Baby Animals" },
  { src: "/visuals/covers/happy-farm-animals.jpg", title: "Happy Farm Animals" },
  { src: "/visuals/covers/wild-animals.png", title: "Wild Animals" },
  { src: "/visuals/covers/sea-creatures.png", title: "Sea Creatures" },
  { src: "/visuals/covers/birds.png", title: "Birds" },
  { src: "/visuals/covers/insects-bugs.png", title: "Insects & Bugs" },
  { src: "/visuals/covers/vehicles.png", title: "Vehicles" },
  { src: "/visuals/covers/fruits.png", title: "Fruits" },
  { src: "/visuals/covers/alphabet.png", title: "Alphabet (A–Z)" },
  { src: "/visuals/covers/toys.png", title: "Toys" },
  { src: "/visuals/covers/fantasy-magic.png", title: "Fantasy & Magic" },
  { src: "/visuals/covers/halloween.png", title: "Halloween" },
];

const draggableItems = [
  {
    title: "Farm Animals",
    image: "/visuals/covers/farm-animals.png",
    className: "absolute top-12 left-[8%] rotate-[-6deg]",
  },
  {
    title: "Dinosaurs",
    image: "/visuals/covers/dinosaurs.png",
    className: "absolute top-32 left-[22%] rotate-[4deg]",
  },
  {
    title: "Woodland Baby Animals",
    image: "/visuals/covers/woodland-baby-animals.png",
    className: "absolute top-8 left-[40%] rotate-[8deg]",
  },
  {
    title: "Wild Animals",
    image: "/visuals/covers/wild-animals.png",
    className: "absolute top-36 left-[55%] rotate-[-4deg]",
  },
  {
    title: "Sea Creatures",
    image: "/visuals/covers/sea-creatures.png",
    className: "absolute top-16 right-[8%] rotate-[6deg]",
  },
  {
    title: "Fantasy & Magic",
    image: "/visuals/covers/fantasy-magic.png",
    className: "absolute top-52 right-[22%] rotate-[-8deg]",
  },
  {
    title: "Halloween",
    image: "/visuals/covers/halloween.png",
    className: "absolute top-44 left-[36%] rotate-[3deg]",
  },
  {
    title: "Birds",
    image: "/visuals/covers/birds.png",
    className: "absolute top-60 left-[18%] rotate-[5deg]",
  },
];

type View = "draggable" | "carousel";

export function BooksShowcase() {
  const [view, setView] = useState<View>("draggable");

  return (
    <section className="relative bg-black overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        {/* Toggle — top right of section */}
        <div className="absolute top-6 right-4 sm:right-6 lg:right-8 z-30 flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur">
          <ToggleButton
            active={view === "draggable"}
            onClick={() => setView("draggable")}
            icon={<Hand className="w-3.5 h-3.5" />}
            label="Drag"
          />
          <ToggleButton
            active={view === "carousel"}
            onClick={() => setView("carousel")}
            icon={<Repeat className="w-3.5 h-3.5" />}
            label="Carousel"
          />
        </div>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-xs font-medium text-violet-200 backdrop-blur mb-4">
            <Sparkles className="w-3 h-3" />
            Real books, made with CrayonSparks
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
            Live on <span className="gradient-text">Amazon KDP</span> right now
          </h2>
          <p className="mt-4 text-neutral-400 max-w-2xl mx-auto">
            These covers and interiors were generated with CrayonSparks — same
            tool you&apos;re about to use.
          </p>
        </div>
      </div>

      {view === "draggable" ? <DraggableView /> : <CarouselView />}
    </section>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
        active
          ? "bg-linear-to-r from-violet-500 to-cyan-400 text-white shadow-lg shadow-violet-500/30"
          : "text-neutral-300 hover:text-white"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function DraggableView() {
  return (
    <DraggableCardContainer className="relative flex min-h-[110vh] w-full items-center justify-center overflow-clip pb-12">
      <p className="absolute top-1/2 mx-auto max-w-md -translate-y-1/2 text-center text-2xl font-black md:text-4xl text-neutral-800 px-4">
        Drag the books around. Every one was made with{" "}
        <span className="gradient-text">CrayonSparks</span>.
      </p>
      {draggableItems.map((item) => (
        <DraggableCardBody
          key={item.title}
          className={`${item.className} bg-neutral-900 border border-white/10`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image}
            alt={item.title}
            className="pointer-events-none relative z-10 h-80 w-60 object-cover rounded-md mx-auto"
          />
          <h3 className="mt-4 text-center text-lg font-bold text-neutral-200">
            {item.title}
          </h3>
        </DraggableCardBody>
      ))}
    </DraggableCardContainer>
  );
}

function CarouselView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !scrollerRef.current) return;
    const children = Array.from(scrollerRef.current.children);
    children.forEach((node) => {
      const clone = node.cloneNode(true) as HTMLElement;
      clone.setAttribute("aria-hidden", "true");
      scrollerRef.current!.appendChild(clone);
    });
    containerRef.current.style.setProperty("--animation-direction", "forwards");
    containerRef.current.style.setProperty("--animation-duration", "120s");
    setStart(true);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <div
        ref={containerRef}
        className="scroller relative z-20 overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_6%,white_94%,transparent)]"
      >
        <ul
          ref={scrollerRef}
          className={cn(
            "flex min-w-full shrink-0 gap-5 md:gap-6 py-2 w-max flex-nowrap",
            start && "animate-scroll",
            "hover:[animation-play-state:paused]"
          )}
        >
          {carouselBooks.map((b) => (
            <li
              key={b.src}
              className="relative shrink-0 w-[160px] md:w-[200px] aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-neutral-900"
            >
              <DirectionAwareHover
                imageUrl={b.src}
                className="h-full w-full md:h-full md:w-full rounded-2xl"
                imageClassName="object-cover"
                childrenClassName="bottom-3 left-3"
              >
                <p className="font-semibold text-sm leading-tight">{b.title}</p>
              </DirectionAwareHover>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
