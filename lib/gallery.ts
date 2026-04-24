import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { CATEGORIES } from "./prompts";

export interface GallerySample {
  categorySlug: string;
  categoryName: string;
  categoryIcon: string;
  file: string;
  src: string;
  alt: string;
}

export function loadGallerySamples(limitPerCategory = 5): Record<string, GallerySample[]> {
  const root = join(process.cwd(), "public", "gallery");
  const out: Record<string, GallerySample[]> = {};
  if (!existsSync(root)) return out;
  for (const cat of CATEGORIES) {
    const dir = join(root, cat.slug);
    if (!existsSync(dir)) continue;
    try {
      const files = readdirSync(dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();
      out[cat.slug] = files.slice(0, limitPerCategory).map((file) => ({
        categorySlug: cat.slug,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        file,
        src: `/gallery/${cat.slug}/${file}`,
        alt: `${cat.name} · ${file.replace(/\.(png|jpe?g|webp)$/i, "").replace(/[_-]/g, " ")}`,
      }));
    } catch {
      // ignore
    }
  }
  return out;
}

export function flattenSamples(bySlug: Record<string, GallerySample[]>, take = 12): GallerySample[] {
  const flat: GallerySample[] = [];
  const keys = Object.keys(bySlug);
  let i = 0;
  while (flat.length < take && keys.some((k) => (bySlug[k]?.[i] ? true : false))) {
    for (const k of keys) {
      const item = bySlug[k]?.[i];
      if (item && flat.length < take) flat.push(item);
    }
    i++;
  }
  return flat;
}
