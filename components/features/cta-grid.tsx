import Link from "next/link";
import { ArrowRight } from "lucide-react";

const leftColumn = [
  {
    src: "/visuals/lifestyle/cover-with-pages.jpg",
    alt: "Generated cover with sample interior pages",
  },
  {
    src: "/visuals/covers/farm-animals.png",
    alt: "Farm Animals coloring book cover",
  },
  {
    src: "/visuals/lifestyle/hand-coloring.png",
    alt: "Child coloring a generated page",
  },
];

const rightColumn = [
  {
    src: "/visuals/covers/dinosaurs.png",
    alt: "Dinosaurs coloring book cover",
  },
  {
    src: "/visuals/covers/sea-creatures.png",
    alt: "Sea Creatures coloring book cover",
  },
  {
    src: "/visuals/covers/wild-animals.png",
    alt: "Wild Animals coloring book cover",
  },
];

export function CtaGrid() {
  return (
    <section className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 md:grid-cols-2 md:gap-16 md:px-8">
      <div className="max-w-xl">
        <h2 className="text-3xl font-bold tracking-tight text-balance text-white md:text-4xl">
          Ready to ship your first book?
        </h2>
        <p className="mt-6 max-w-lg text-base text-neutral-300 md:text-base">
          Bring your Gemini API key. Pick a theme. 20 pages in ~3 minutes —
          KDP-ready PDF, cover, and metadata in one click.
        </p>
        <Link
          href="/playground"
          className="group mt-8 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white bg-linear-to-r from-violet-500 via-indigo-400 to-cyan-400 shadow-lg shadow-violet-500/40 hover:shadow-xl hover:shadow-violet-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <span>Start free</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="relative max-h-[35rem] overflow-hidden rounded-2xl bg-neutral-950/50 mask-t-from-50% mask-b-from-50% p-3">
        <div className="grid h-full grid-cols-2 gap-3">
          <div className="flex flex-col gap-3">
            {leftColumn.map((img) => (
              <div
                key={img.src}
                className="overflow-hidden rounded-xl shadow-sm ring-1 shadow-black/40 ring-white/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.alt}
                  width={500}
                  height={320}
                  loading="lazy"
                  className="h-44 w-full object-cover"
                />
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3">
            {rightColumn.map((img) => (
              <div
                key={img.src}
                className="overflow-hidden rounded-xl shadow-sm ring-1 shadow-black/40 ring-white/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.alt}
                  width={500}
                  height={320}
                  loading="lazy"
                  className="h-44 w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
