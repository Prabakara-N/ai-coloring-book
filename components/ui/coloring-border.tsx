/**
 * Single clean border line for coloring pages — like a real KDP coloring book
 * print border. No corner ornaments, no double lines, no photo-frame look.
 *
 * Sized to fill its parent — the parent must be `relative`. The border is
 * absolutely positioned and pointer-events-none so it overlays cleanly on
 * top of the generated image.
 */

interface ColoringBorderProps {
  /** Optional small attribution rendered centered along the bottom edge. */
  attribution?: string;
}

export function ColoringBorder({ attribution }: ColoringBorderProps = {}) {
  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      <div className="absolute inset-[2%] border border-black/80 rounded-[1px]" />
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
