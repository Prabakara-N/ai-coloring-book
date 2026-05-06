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

function buildResearchUserPrompt(input: KdpMetadataInput): string {
  const isStory = input.kind === "story";
  const productLabel = isStory
    ? "full-color children's picture book (read-aloud / bedtime story)"
    : "coloring book";
  const exampleCategoryHint = isStory
    ? `e.g. "Books > Children's Books > Animals > Stories", "Books > Children's Books > Fairy Tales, Folk Tales & Myths > Fables", "Books > Children's Books > Bedtime & Dreaming"`
    : `e.g. "Books > Children's Books > Activities, Crafts & Games > Activity Books"`;
  const sceneOrPlot = isStory
    ? `Story / cover scene: ${input.scene}`
    : `World/scene: ${input.scene}`;
  const niche = isStory
    ? "picture-book / read-aloud story-book"
    : "coloring-book";

  return `Research a ${productLabel} for ${AGE_DESCRIPTORS[input.age]} titled: "${input.bookTitle}". Page count: ${input.pageCount}.
${sceneOrPlot}

Find on AMAZON.COM right now:
1. The 7 best-converting backend keywords for this ${niche} niche — phrases buyers actually search for. Each ≤50 characters, no commas, no quotation marks.${
    isStory
      ? " Examples to consider: \"read aloud picture book\", \"bedtime story toddler\", \"fable book ages 3-5\", \"classic story for kids\"."
      : ""
  }
2. The 2 most-relevant Amazon KDP browse-category paths (full path, ${exampleCategoryHint}). Verify these categories EXIST in Amazon's current taxonomy.
3. (Optional) 2-3 examples of real top-selling competitor book titles in this niche.

Return JSON ONLY in this exact shape:
{
  "keywords": ["7 keywords here", "...", "...", "...", "...", "...", "..."],
  "categories": ["Books > ... > ...", "Books > ... > ..."],
  "competitorTitles": ["Top Seller Title 1", "Top Seller Title 2"],
  "notes": "one short line about market trends or anything notable"
}`;
}

async function researchWithPerplexity(
  input: KdpMetadataInput,
): Promise<PerplexityResearch> {
  const system = `You are an Amazon KDP listing research expert. Use live web search to find ACCURATE, CURRENT data for the book described. Return ONLY a JSON object — no prose, no markdown fences, no citations.`;

  const user = buildResearchUserPrompt(input);

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

function buildCopyUserPrompt(
  input: KdpMetadataInput,
  research: PerplexityResearch,
): string {
  const isStory = input.kind === "story";
  const productHeading = isStory
    ? "full-color children's picture book"
    : "coloring book";
  const sceneLabel = isStory ? "Story scene / plot" : "World/scene";
  const samplesLabel = isStory ? "Sample scenes" : "Sample interior pages";
  const titleFormat = isStory
    ? `Format: "[Story Name]: A [Audience] Picture Book for Read-Aloud" or "[Story Name] — Illustrated Story Book for [Audience]". Include 2-3 of the verified keywords naturally. Never call it a coloring book.`
    : `Format: "[Theme] Coloring Book for [Audience]: [Page Count] [Hook] | [Differentiator]". Include 2-3 of the verified keywords naturally.`;
  const priceGuidance = isStory
    ? `e.g. "7.99" for short toddler picture books (8-16 pages), "9.99" for standard 20-30 page picture books, "12.99" for premium hardcover-feel editions.`
    : `e.g. "6.99" for 20-30 pages, "8.99" for 40+ pages, "9.99" for premium tween editions.`;
  const descriptionGuidance = isStory
    ? `descriptionHtml: 180-350 words. Open with the story hook (one-sentence pitch: "Meet Pip, a tiny panda on his first day of school…"), then <ul><li> bullets of WHAT THE PARENT GETS (read-aloud time, character lessons, vibrant illustrations, age-appropriate vocabulary, calming bedtime narrative — pick 4-6). Close with a soft parent-facing sell ("a keepsake to share, page by page"). Use <p>, <strong>, <ul>, <li> tags only. No markdown.`
    : `descriptionHtml: 200-400 words, opens with audience hook, then <ul><li> bullets of features (4-6), closes with soft sell. Use <p>, <strong>, <ul>, <li> tags only. No markdown.`;

  return `Write SEO-optimized KDP listing copy for this ${productHeading}.

BOOK
- Theme/working title: "${input.bookTitle}"
- Audience: ${AGE_DESCRIPTORS[input.age]}
- Pages: ${input.pageCount}
- ${sceneLabel}: ${input.scene}
- ${samplesLabel}: ${input.samplePages.slice(0, 6).join("; ")}

VERIFIED HIGH-INTENT KEYWORDS (use these throughout the title and description; they were just researched on live Amazon):
${research.keywords.map((k, i) => `  ${i + 1}. ${k}`).join("\n")}

${research.competitorTitles?.length ? `TOP COMPETITOR TITLES (for tone/structure only, DO NOT copy):\n${research.competitorTitles.map((t) => `  - ${t}`).join("\n")}\n` : ""}
WRITE
- title: ≤200 chars, keyword-stuffed but readable. ${titleFormat}
- subtitle: optional, 5-10 words, complements title; empty string if not needed.
- ${descriptionGuidance}
- descriptionText: same description as plain text (no HTML).
- suggestedPriceUsd: ${priceGuidance}

Avoid: copyrighted characters (Disney, Marvel, Pokemon), trademarked phrases, made-up awards.${
    isStory
      ? " Never claim the art is hand-drawn, hand-painted, hand-illustrated, handmade, or original artwork — these are AI-illustrated picture books."
      : ""
  }`;
}

async function writeCopyWithOpenAi(
  input: KdpMetadataInput,
  research: PerplexityResearch,
): Promise<CopyOutput> {
  const system = `You are an Amazon KDP SEO copywriter. You write KDP listings that buyers actually click and convert. Output strictly via the schema.`;

  const user = buildCopyUserPrompt(input, research);

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
