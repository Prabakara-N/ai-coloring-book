/**
 * Client-side palette extractor — pulls ~6 dominant colors out of a
 * front-cover image via canvas pixel sampling. Used by the back-cover
 * refine panel so the user can pick which front-cover hue should drive
 * the back cover's body color.
 *
 * Algorithm: load the image into an offscreen canvas, downsample to a
 * fixed grid, quantize each pixel into a coarse color bucket, count
 * frequencies, then pick the top-K most common buckets that are
 * sufficiently saturated (skip near-white and near-black).
 *
 * Zero API cost. ~50-100ms on a typical 1024x1024 cover.
 */

export interface PaletteSwatch {
  /** "rgb(...)"-style CSS color the swatch button can use directly. */
  cssColor: string;
  /** Same color in hex (#rrggbb). */
  hex: string;
  /** Plain-language hue name (e.g. "soft pastel pink") suitable for the
   * Gemini prompt. The image model interprets named hues more reliably
   * than hex codes — we pass this string into the back-cover prompt. */
  hueName: string;
  /** Population count from the source image — useful for sorting. */
  population: number;
}

/** Light/saturation thresholds used to skip near-white and near-black. */
const MIN_SATURATION = 0.18;
const MIN_LIGHTNESS = 0.18;
const MAX_LIGHTNESS = 0.92;

/** Number of colors returned. Tuned for a single chip-row UI. */
const TOP_K = 6;

/** Downsample the source to this many pixels max (square root). */
const SAMPLE_GRID = 64;

/** Bucket width per RGB channel — coarser = fewer buckets, faster, more
 * likely to merge similar colors into one swatch. 32 = 8×8×8 = 512 buckets. */
const BUCKET = 32;

function rgbToHsl(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) {
      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    } else if (max === gn) {
      h = ((bn - rn) / d + 2) / 6;
    } else {
      h = ((rn - gn) / d + 4) / 6;
    }
  }
  return { h: h * 360, s, l };
}

function toHex(r: number, g: number, b: number): string {
  const c = (n: number) => n.toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/**
 * Convert HSL into a human-readable hue name that Gemini can interpret
 * reliably ("soft pastel pink", "warm tan", "deep teal"). We pick a hue
 * family by H, then a tone descriptor by S+L.
 */
function hueName(h: number, s: number, l: number): string {
  if (s < 0.12) {
    if (l > 0.7) return "off-white";
    if (l < 0.3) return "charcoal";
    return "grey";
  }

  // Darker tones get more specific paint-name labels so the swatch's
  // visible color matches the words sent to Gemini. (Without these, a
  // dark olive swatch was labeled "rich yellow" because the yellow band
  // h ∈ [45, 70) plus low lightness fell into the generic "rich" tone.)
  if (l < 0.45) {
    if (h < 15 || h >= 345) return l < 0.32 ? "burgundy" : "deep red";
    if (h < 45) return l < 0.32 ? "rust" : "burnt orange";
    if (h < 70) return "mustard yellow";
    if (h < 95) return "olive";
    if (h < 165) return l < 0.32 ? "forest green" : "deep green";
    if (h < 195) return "deep teal";
    if (h < 225) return l < 0.32 ? "navy" : "deep blue";
    if (h < 270) return "deep indigo";
    if (h < 300) return l < 0.32 ? "deep purple" : "plum";
    if (h < 330) return "wine";
    return "deep rose";
  }

  const family = (() => {
    if (h < 15 || h >= 345) return "red";
    if (h < 45) return "orange";
    if (h < 70) return "yellow";
    if (h < 95) return "yellow-green";
    if (h < 165) return "green";
    if (h < 195) return "teal";
    if (h < 225) return "blue";
    if (h < 270) return "indigo";
    if (h < 300) return "purple";
    if (h < 330) return "pink";
    return "rose";
  })();

  const tone = (() => {
    if (l > 0.78) return "soft pastel";
    if (l > 0.62) return "light";
    if (s > 0.7) return "vivid";
    return "warm";
  })();

  return `${tone} ${family}`;
}

/**
 * Loads the cover image and extracts the top-K dominant swatches.
 * Returns an empty array if the image fails to load (caller should
 * gracefully hide the swatch row).
 */
export async function extractCoverPalette(
  imageDataUrl: string,
): Promise<PaletteSwatch[]> {
  if (typeof window === "undefined") return [];
  const img = await loadImage(imageDataUrl);
  if (!img) return [];

  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_GRID;
  canvas.height = SAMPLE_GRID;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, SAMPLE_GRID, SAMPLE_GRID);

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, SAMPLE_GRID, SAMPLE_GRID).data;
  } catch {
    // Canvas tainted — happens if the image is from a cross-origin URL
    // without CORS. Data URLs (our usual case) are fine.
    return [];
  }

  // Bucket → { count, sumR, sumG, sumB } so we can return the AVERAGE
  // color of each bucket rather than the bucket midpoint (more accurate).
  const buckets = new Map<
    string,
    { count: number; sumR: number; sumG: number; sumB: number }
  >();

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];
    if (a < 200) continue; // skip transparent
    // Skip extremely white or extremely black pixels (background / line art).
    const { s, l } = rgbToHsl(r, g, b);
    if (s < MIN_SATURATION) continue;
    if (l < MIN_LIGHTNESS || l > MAX_LIGHTNESS) continue;

    const br = Math.floor(r / BUCKET);
    const bg = Math.floor(g / BUCKET);
    const bb = Math.floor(b / BUCKET);
    const key = `${br},${bg},${bb}`;
    const cur = buckets.get(key);
    if (cur) {
      cur.count += 1;
      cur.sumR += r;
      cur.sumG += g;
      cur.sumB += b;
    } else {
      buckets.set(key, { count: 1, sumR: r, sumG: g, sumB: b });
    }
  }

  // Sort by count desc, average each bucket, dedupe near-duplicates.
  const entries = Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_K * 3);

  const swatches: PaletteSwatch[] = [];
  for (const e of entries) {
    const r = Math.round(e.sumR / e.count);
    const g = Math.round(e.sumG / e.count);
    const b = Math.round(e.sumB / e.count);
    // Dedupe: skip any swatch that's within 30 RGB units of an already-kept one.
    const isDup = swatches.some(
      (s) =>
        Math.abs(parseInt(s.hex.slice(1, 3), 16) - r) +
          Math.abs(parseInt(s.hex.slice(3, 5), 16) - g) +
          Math.abs(parseInt(s.hex.slice(5, 7), 16) - b) <
        45,
    );
    if (isDup) continue;
    const { h, s, l } = rgbToHsl(r, g, b);
    swatches.push({
      cssColor: `rgb(${r}, ${g}, ${b})`,
      hex: toHex(r, g, b),
      hueName: hueName(h, s, l),
      population: e.count,
    });
    if (swatches.length >= TOP_K) break;
  }

  return swatches;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
