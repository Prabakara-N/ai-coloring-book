import type { ColoringCategory, ColoringPrompt } from "./prompts";

export const CUSTOM_SLUG_PREFIX = "custom-";
const STORAGE_KEY = "colorbook.custom-categories.v1";

const DEFAULT_SCENE =
  "a cheerful outdoor setting with rolling hills, a smiling sun and fluffy clouds in the sky, trees and scattered flowers, plus tufts of grass along the ground";

export interface CustomCategoryInput {
  name: string;
  icon?: string;
  description?: string;
  scene?: string;
  coverTitle?: string;
  coverScene?: string;
  prompts: { name?: string; subject: string }[];
}

export interface CustomCategory extends ColoringCategory {
  isCustom: true;
  createdAt: number;
  updatedAt: number;
}

export function isCustomCategory(cat: ColoringCategory): cat is CustomCategory {
  return cat.slug.startsWith(CUSTOM_SLUG_PREFIX);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function parsePromptsInput(
  raw: string
): { name: string; subject: string }[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"))
    .map((line, idx) => {
      // Support "Name: subject" or "Name | subject" or just "subject"
      const delimMatch = /^(.+?)\s*(?:\||:|—)\s*(.+)$/.exec(line);
      if (delimMatch) {
        return { name: delimMatch[1].trim(), subject: delimMatch[2].trim() };
      }
      return { name: `Page ${idx + 1}`, subject: line };
    });
}

function read(): CustomCategory[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CustomCategory[];
  } catch {
    return [];
  }
}

function write(list: CustomCategory[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listCustomCategories(): CustomCategory[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getCustomCategory(slug: string): CustomCategory | undefined {
  return read().find((c) => c.slug === slug);
}

export function createCustomCategoryFromRaw(
  input: Omit<CustomCategoryInput, "prompts"> & { promptsRaw: string }
): CustomCategory {
  const prompts = parsePromptsInput(input.promptsRaw);
  if (prompts.length === 0) {
    throw new Error("Paste at least one prompt (one per line).");
  }
  return createCustomCategory({
    name: input.name,
    icon: input.icon,
    description: input.description,
    scene: input.scene,
    coverTitle: input.coverTitle,
    coverScene: input.coverScene,
    prompts,
  });
}

export function createCustomCategory(input: CustomCategoryInput): CustomCategory {
  const name = input.name.trim();
  if (!name) throw new Error("Book name is required.");
  if (input.prompts.length === 0)
    throw new Error("At least one prompt is required.");

  const baseSlug = slugify(name) || "book";
  const existing = read();
  let slug = `${CUSTOM_SLUG_PREFIX}${baseSlug}`;
  if (existing.some((c) => c.slug === slug)) {
    slug = `${CUSTOM_SLUG_PREFIX}${baseSlug}-${randomId()}`;
  }

  const now = Date.now();
  const coloringPrompts: ColoringPrompt[] = input.prompts.map((p, i) => ({
    id: `${baseSlug}.${String(i + 1).padStart(2, "0")}`,
    name: p.name?.trim() || `Page ${i + 1}`,
    subject: p.subject.trim(),
  }));

  const coverTitle = (input.coverTitle?.trim() || `${name} Coloring Book`).slice(0, 120);
  const coverScene =
    input.coverScene?.trim() ||
    `a cheerful assortment of characters and objects representing ${name.toLowerCase()}, all smiling together on a friendly background`;

  const category: CustomCategory = {
    slug,
    number: 0,
    name,
    icon: input.icon?.trim() || "📚",
    description: input.description?.trim() || `${coloringPrompts.length} custom prompts`,
    scene: input.scene?.trim() || DEFAULT_SCENE,
    coverScene,
    coverTitle,
    kdp: {
      title: coverTitle,
      description: `A custom coloring book with ${coloringPrompts.length} pages.`,
      keywords: [],
      coverPrompt: coverScene,
    },
    prompts: coloringPrompts,
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };

  write([category, ...existing]);
  return category;
}

export function updateCustomCategory(
  slug: string,
  patch: Partial<CustomCategoryInput> & { promptsRaw?: string }
): CustomCategory | undefined {
  const existing = read();
  const idx = existing.findIndex((c) => c.slug === slug);
  if (idx === -1) return undefined;
  const current = existing[idx];

  let prompts = current.prompts;
  if (patch.promptsRaw !== undefined) {
    const parsed = parsePromptsInput(patch.promptsRaw);
    prompts = parsed.map((p, i) => ({
      id: `${slug.replace(CUSTOM_SLUG_PREFIX, "")}.${String(i + 1).padStart(2, "0")}`,
      name: p.name || `Page ${i + 1}`,
      subject: p.subject,
    }));
  }

  const updated: CustomCategory = {
    ...current,
    name: patch.name?.trim() || current.name,
    icon: patch.icon?.trim() || current.icon,
    description: patch.description?.trim() || current.description,
    scene: patch.scene?.trim() || current.scene,
    coverTitle: patch.coverTitle?.trim() || current.coverTitle,
    coverScene: patch.coverScene?.trim() || current.coverScene,
    prompts,
    updatedAt: Date.now(),
  };
  existing[idx] = updated;
  write(existing);
  return updated;
}

export function deleteCustomCategory(slug: string) {
  const existing = read();
  write(existing.filter((c) => c.slug !== slug));
}

export function promptsToRaw(prompts: ColoringPrompt[]): string {
  return prompts
    .map((p) => (p.name && !p.name.startsWith("Page ") ? `${p.name} | ${p.subject}` : p.subject))
    .join("\n");
}
