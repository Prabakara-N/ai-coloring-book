/**
 * Decorative double-line border with corner flourishes for coloring pages.
 *
 * Sized to fill its parent — the parent must be `relative`. The border is
 * absolutely positioned and pointer-events-none so it overlays cleanly on
 * top of the generated image.
 */

interface ColoringBorderProps {
  /** Optional small attribution rendered centered along the bottom edge. */
  attribution?: string;
}

function CornerOrnament({
  className,
  flipX = false,
  flipY = false,
}: {
  className?: string;
  flipX?: boolean;
  flipY?: boolean;
}) {
  const sx = flipX ? -1 : 1;
  const sy = flipY ? -1 : 1;
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      width="22"
      height="22"
      style={{ transform: `scale(${sx}, ${sy})` }}
      aria-hidden
    >
      {/* a small "curl" — quarter swoop ending in a leaf-like dot */}
      <path
        d="M2 2 C 2 10, 6 16, 14 18 M14 18 C 12 17, 11 19, 13 20 C 15 21, 16 18, 14 18 Z"
        stroke="black"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="black"
        fillOpacity="0.85"
      />
    </svg>
  );
}

export function ColoringBorder({ attribution }: ColoringBorderProps = {}) {
  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* Outer rectangle */}
      <div className="absolute inset-[3.2%] border border-black rounded-[2px]" />
      {/* Inner rectangle (the double-line look) */}
      <div className="absolute inset-[5%] border border-black rounded-[2px]" />

      {/* Corner ornaments sitting between the two lines */}
      <div className="absolute top-[3.2%] left-[3.2%] -translate-x-[3px] -translate-y-[3px]">
        <CornerOrnament />
      </div>
      <div className="absolute top-[3.2%] right-[3.2%] translate-x-[3px] -translate-y-[3px]">
        <CornerOrnament flipX />
      </div>
      <div className="absolute bottom-[3.2%] right-[3.2%] translate-x-[3px] translate-y-[3px]">
        <CornerOrnament flipX flipY />
      </div>
      <div className="absolute bottom-[3.2%] left-[3.2%] -translate-x-[3px] translate-y-[3px]">
        <CornerOrnament flipY />
      </div>

      {attribution && (
        <div className="absolute bottom-[1.5%] left-0 right-0 text-center">
          <span className="text-[8px] text-neutral-500 font-mono tracking-wide">
            {attribution}
          </span>
        </div>
      )}
    </div>
  );
}
