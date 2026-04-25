/**
 * KDP metadata generator — produces SEO-optimized title, subtitle, HTML
 * description, 7 backend keywords, and 2 suggested browse categories from
 * a coloring book's plan + page subjects.
 *
 * Uses Gemini text model with strict JSON output (we parse + validate).
 */

import { GoogleGenAI } from "@google/genai";

const MODEL_ID = process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash";

let _client: GoogleGenAI | null = null;
function getClient() {
  const apiKey = process.env.GEMINI_NANO_BANANA_API_KEY;
  if (!apiKey) throw new Error("GEMINI_NANO_BANANA_API_KEY is not set.");
  if (!_client) _client = new GoogleGenAI({ apiKey });
  return _client;
}

export type AgeBand = "toddlers" | "kids" | "tweens" | "adult";

export interface KdpMetadataInput {
  bookTitle: string;
  scene: string;
  age: AgeBand;
  pageCount: number;
  /** A few sample page subjects to give the model a sense of the content. */
  samplePages: string[];
}

export interface KdpMetadata {
  /** SEO-optimized KDP title — under 200 chars. */
  title: string;
  /** Optional shorter subtitle. */
  subtitle: string;
  /** HTML-formatted description for KDP — bullets, bold allowed. */
  descriptionHtml: string;
  /** Plain-text fallback of the description. */
  descriptionText: string;
  /** Exactly 7 backend keywords, each ≤50 chars. */
  keywords: string[];
  /** 2 suggested KDP browse categories. */
  categories: string[];
  /** Suggested retail price (USD). */
  suggestedPriceUsd: string;
  /** Notes — anything the AI flagged. */
  notes?: string;
}

const AGE_DESCRIPTORS: Record<AgeBand, string> = {
  toddlers: "toddlers and preschoolers ages 3-6",
  kids: "kids ages 6-10",
  tweens: "tweens ages 10-14",
  adult: "adults (mindful mandala-style)",
};

function buildPrompt(input: KdpMetadataInput): string {
  const samples = input.samplePages
    .slice(0, 8)
    .map((s, i) => `  ${i + 1}. ${s}`)
    .join("\n");

  return `You are an Amazon KDP listing optimization expert. Generate KDP metadata for a coloring book.

BOOK
- Working title: "${input.bookTitle}"
- Target audience: ${AGE_DESCRIPTORS[input.age]}
- Page count: ${input.pageCount}
- Theme/world: ${input.scene}
- Sample page subjects:
${samples}

OUTPUT a JSON object with these exact keys (no other prose, no markdown fences):

{
  "title": "SEO-optimized title under 200 chars. Stuff with high-intent keywords. Format example: 'Farm Animals Coloring Book for Kids Ages 3-6: 20 Big & Simple Drawings | Single-Sided Pages | Cute Animals'",
  "subtitle": "Optional 5-10 word subtitle that complements the title. Empty string if not needed.",
  "descriptionHtml": "Compelling HTML book description, 200-400 words. Use <p>, <strong>, <ul><li> tags only. Open with a hook, then bulletpoint what's inside, end with a CTA. NO escaped quotes, NO markdown.",
  "descriptionText": "Same description as plain text (no HTML), for fallback.",
  "keywords": ["exactly 7 backend keywords", "each ≤50 chars", "long-tail buyer intent", "no brand names", "no quotation marks", "no commas inside a single keyword", "high search volume"],
  "categories": ["KDP browse category 1 (full path, e.g. 'Books > Children's Books > Activities, Crafts & Games > Activity Books')", "KDP browse category 2 (different category, e.g. 'Books > Crafts, Hobbies & Home > Crafts & Hobbies > Drawing')"],
  "suggestedPriceUsd": "X.XX (e.g. '6.99' for kids 20-page, '9.99' for adult 40-page)",
  "notes": "One short line: anything you want to flag (optional)."
}

KDP SEO RULES
- Title: keyword-stuffed but readable, include "Coloring Book", age range, page count, and 1-2 hooks
- Description: open with audience hook, list 4-6 features as bullets, close with a soft sell
- Keywords: target buyer search phrases like "toddler coloring book ages 3-6", "big simple drawings kids", "activity book preschool"
- Categories: pick from real Amazon KDP taxonomy paths
- Price: $5.99-$7.99 for kids 20-30 pages, $8.99-$12.99 for adult mandala
- NEVER mention copyrighted characters (Disney, Pokemon, Marvel)

Output ONLY the JSON object.`;
}

function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]+?)\s*```/i.exec(text);
  const raw = fenced ? fenced[1] : text;
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace < 0)
    throw new Error("No JSON object in model response.");
  return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
}

function validate(obj: unknown): KdpMetadata {
  if (!obj || typeof obj !== "object")
    throw new Error("Metadata is not an object.");
  const o = obj as Record<string, unknown>;
  const str = (k: string, fallback = ""): string => {
    const v = o[k];
    return typeof v === "string" ? v.trim() : fallback;
  };
  const arr = (k: string): string[] => {
    const v = o[k];
    return Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim())
      : [];
  };

  const title = str("title");
  if (!title) throw new Error("Missing title in generated metadata.");

  const keywords = arr("keywords").slice(0, 7);
  while (keywords.length < 7) keywords.push("");

  const categories = arr("categories").slice(0, 2);
  while (categories.length < 2) categories.push("");

  return {
    title: title.slice(0, 200),
    subtitle: str("subtitle").slice(0, 100),
    descriptionHtml:
      str("descriptionHtml") || `<p>${str("descriptionText")}</p>`,
    descriptionText:
      str("descriptionText") ||
      str("descriptionHtml").replace(/<[^>]+>/g, "").trim(),
    keywords: keywords.map((k) => k.slice(0, 50)),
    categories,
    suggestedPriceUsd: str("suggestedPriceUsd", "6.99"),
    notes: str("notes") || undefined,
  };
}

export async function generateKdpMetadata(
  input: KdpMetadataInput,
): Promise<KdpMetadata> {
  const client = getClient();
  const prompt = buildPrompt(input);
  const response = await client.models.generateContent({
    model: MODEL_ID,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  const text =
    response.candidates?.[0]?.content?.parts
      ?.map((p) =>
        typeof (p as { text?: string }).text === "string"
          ? (p as { text: string }).text
          : "",
      )
      .join("") ?? "";
  if (!text) throw new Error("Empty response from model.");
  return validate(extractJson(text));
}
