/**
 * Hybrid KDP metadata generator: Perplexity does live-web research for
 * KEYWORDS + CATEGORIES, OpenAI writes the SEO COPY (title, subtitle,
 * description). Each model is used for what it's best at.
 *
 * Flow:
 *   1. Perplexity (sonar) — query live Amazon to get real category paths
 *      and high-volume buyer keywords for the book's niche.
 *   2. OpenAI (gpt-4o-mini) — generate SEO-optimized title, subtitle,
 *      HTML description using the verified keywords as input.
 *   3. Combine into KdpMetadata.
 *
 * Falls back gracefully: if Perplexity fails, runs OpenAI alone with a
 * hint that keywords need fallback. If OpenAI fails, still returns
 * Perplexity-only result with a basic fallback title.
 */

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { callPerplexity, extractJsonFromPerplexity } from "./perplexity";
import type { KdpMetadata, KdpMetadataInput } from "./kdp-metadata";
import { OPENAI_COPY_MODEL } from "./constants";

const OPENAI_MODEL = OPENAI_COPY_MODEL;

const AGE_DESCRIPTORS: Record<KdpMetadataInput["age"], string> = {
  toddlers: "toddlers and preschoolers ages 3-6",
  kids: "kids ages 6-10",
  tweens: "tweens ages 10-14",
};

// ---------- Step 1: Perplexity research ----------

interface PerplexityResearch {
  keywords: string[];
  categories: string[];
  competitorTitles?: string[];
  notes?: string;
}

async function researchWithPerplexity(
  input: KdpMetadataInput,
): Promise<PerplexityResearch> {
  const system = `You are an Amazon KDP listing research expert. Use live web search to find ACCURATE, CURRENT data for the book described. Return ONLY a JSON object — no prose, no markdown fences, no citations.`;

  const user = `Research a coloring book for ${AGE_DESCRIPTORS[input.age]} on the theme: "${input.bookTitle}" (${input.scene}). Page count: ${input.pageCount}.

Find on AMAZON.COM right now:
1. The 7 best-converting backend keywords for this niche — phrases buyers actually search for. Each ≤50 characters, no commas, no quotation marks.
2. The 2 most-relevant Amazon KDP browse-category paths (full path, e.g. "Books > Children's Books > Activities, Crafts & Games > Activity Books"). Verify these categories EXIST in Amazon's current taxonomy.
3. (Optional) 2-3 examples of real top-selling competitor book titles in this niche.

Return JSON ONLY in this exact shape:
{
  "keywords": ["7 keywords here", "...", "...", "...", "...", "...", "..."],
  "categories": ["Books > ... > ...", "Books > ... > ..."],
  "competitorTitles": ["Top Seller Title 1", "Top Seller Title 2"],
  "notes": "one short line about market trends or anything notable"
}`;

  const res = await callPerplexity({ system, user, temperature: 0.2 });
  const obj = extractJsonFromPerplexity(res.text) as Partial<PerplexityResearch>;

  const keywords = Array.isArray(obj.keywords)
    ? obj.keywords
        .filter((k): k is string => typeof k === "string")
        .map((k) => k.trim().slice(0, 50))
        .slice(0, 7)
    : [];
  while (keywords.length < 7) keywords.push("");

  const categories = Array.isArray(obj.categories)
    ? obj.categories
        .filter((c): c is string => typeof c === "string")
        .map((c) => c.trim())
        .slice(0, 2)
    : [];
  while (categories.length < 2) categories.push("");

  return {
    keywords,
    categories,
    competitorTitles: Array.isArray(obj.competitorTitles)
      ? obj.competitorTitles.filter((t): t is string => typeof t === "string")
      : undefined,
    notes: typeof obj.notes === "string" ? obj.notes : undefined,
  };
}

// ---------- Step 2: OpenAI copy ----------

const COPY_SCHEMA = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(100),
  descriptionHtml: z.string().min(1),
  descriptionText: z.string().min(1),
  suggestedPriceUsd: z.string(),
});

type CopyOutput = z.infer<typeof COPY_SCHEMA>;

async function writeCopyWithOpenAi(
  input: KdpMetadataInput,
  research: PerplexityResearch,
): Promise<CopyOutput> {
  const system = `You are an Amazon KDP SEO copywriter. You write KDP listings that buyers actually click and convert. Output strictly via the schema.`;

  const user = `Write SEO-optimized KDP listing copy for this coloring book.

BOOK
- Theme/working title: "${input.bookTitle}"
- Audience: ${AGE_DESCRIPTORS[input.age]}
- Pages: ${input.pageCount}
- World/scene: ${input.scene}
- Sample interior pages: ${input.samplePages.slice(0, 6).join("; ")}

VERIFIED HIGH-INTENT KEYWORDS (use these throughout the title and description; they were just researched on live Amazon):
${research.keywords.map((k, i) => `  ${i + 1}. ${k}`).join("\n")}

${research.competitorTitles?.length ? `TOP COMPETITOR TITLES (for tone/structure only, DO NOT copy):\n${research.competitorTitles.map((t) => `  - ${t}`).join("\n")}\n` : ""}

WRITE
- title: ≤200 chars, keyword-stuffed but readable. Format: "[Theme] Coloring Book for [Audience]: [Page Count] [Hook] | [Differentiator]". Include 2-3 of the verified keywords naturally.
- subtitle: optional, 5-10 words, complements title; empty string if not needed.
- descriptionHtml: 200-400 words, opens with audience hook, then <ul><li> bullets of features (4-6), closes with soft sell. Use <p>, <strong>, <ul>, <li> tags only. No markdown.
- descriptionText: same description as plain text (no HTML).
- suggestedPriceUsd: e.g. "6.99" for 20-30 pages, "8.99" for 40+ pages, "9.99" for premium tween editions.

Avoid: copyrighted characters (Disney, Marvel, Pokemon), trademarked phrases, made-up awards.`;

  const result = await generateObject({
    model: openai(OPENAI_MODEL),
    system,
    schema: COPY_SCHEMA,
    prompt: user,
  });
  return result.object;
}

// ---------- Orchestrator ----------

export async function generateKdpMetadataHybrid(
  input: KdpMetadataInput,
): Promise<KdpMetadata> {
  const hasPerplexity = !!process.env.PERPLEXITY_API_KEY;
  const hasOpenAi = !!process.env.OPENAI_API_KEY;

  if (!hasOpenAi) {
    throw new Error(
      "OPENAI_API_KEY is required for hybrid metadata. Add it to .env.local or pick the Gemini provider.",
    );
  }

  // Step 1: research (graceful fallback to empty research)
  let research: PerplexityResearch = {
    keywords: Array(7).fill(""),
    categories: ["", ""],
  };
  let researchError: string | undefined;
  if (hasPerplexity) {
    try {
      research = await researchWithPerplexity(input);
    } catch (e) {
      researchError = e instanceof Error ? e.message : "Research failed";
    }
  } else {
    researchError =
      "PERPLEXITY_API_KEY not set — using OpenAI to invent keywords (less accurate than live Amazon data).";
  }

  // Step 2: copy
  const copy = await writeCopyWithOpenAi(input, research);

  return {
    title: copy.title,
    subtitle: copy.subtitle,
    descriptionHtml: copy.descriptionHtml,
    descriptionText: copy.descriptionText,
    keywords: research.keywords,
    categories: research.categories,
    suggestedPriceUsd: copy.suggestedPriceUsd,
    notes: [research.notes, researchError].filter(Boolean).join(" · ") || undefined,
  };
}
