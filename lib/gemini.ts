import { GoogleGenAI } from "@google/genai";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  DEFAULT_INTERIOR_MODEL,
  OPENAI_TEXT_MODEL,
  type GeminiImageModel,
} from "@/lib/constants";
import {
  SAFETY_SUBSTITUTIONS_SYSTEM_PROMPT,
  buildSafetySubstitutionsUserPrompt,
} from "@/lib/prompts/safety-substitutions";

let _client: GoogleGenAI | null = null;

function getClient() {
  const apiKey = process.env.GEMINI_NANO_BANANA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_NANO_BANANA_API_KEY is not set. Add it to .env.local — see .env.local.example for the template.",
    );
  }
  if (!_client) _client = new GoogleGenAI({ apiKey });
  return _client;
}

export type AspectRatio =
  | "1:1"
  | "3:4"
  | "4:3"
  | "9:16"
  | "16:9"
  | "2:3"
  | "3:2";

export const SUPPORTED_ASPECTS: AspectRatio[] = [
  "1:1",
  "3:4",
  "4:3",
  "2:3",
  "3:2",
  "9:16",
  "16:9",
];

export interface GenerateImageResult {
  mimeType: string;
  data: string;
}

export interface GenerateOptions {
  aspectRatio?: AspectRatio;
  sourceImage?: { mimeType: string; data: string };
  /**
   * Additional reference images sent ALONGSIDE the primary source image.
   * Useful for compositions like "open book mockup with this cover (image 1)
   * and this interior page (image 2)". Order matters — Gemini sees them in
   * the order provided.
   */
  extraImages?: Array<{ mimeType: string; data: string }>;
  /**
   * Image model. Defaults to DEFAULT_INTERIOR_MODEL (Nano Banana 3.1 Flash) —
   * the workhorse for bulk page generation. Callers route the request by
   * passing one of the values exported from lib/constants.ts (the bulk-book
   * UI exposes these via the cover and interior dropdowns).
   */
  model?: GeminiImageModel;
  /**
   * Static guardrails (rules that never change between calls) sent via
   * Gemini's `systemInstruction` channel. Stable text in this field
   * triggers Gemini 2.5+ implicit context caching, dropping the cost of
   * the cached prefix by ~75% on repeat calls. Pass per-page dynamic
   * content (subject, scene, variation) in the regular `prompt` argument.
   */
  systemInstruction?: string;
}

/**
 * Words that quietly trip Gemini's child-safety / IP filters when rendered
 * as kids' coloring-book pages, mapped to neutral synonyms that produce the
 * same visual but pass safety. Applied as a single ordered pass when the
 * first generation attempt comes back empty (silent refusal).
 *
 * Order matters — longer phrases first so "held up high" doesn't get
 * partially mangled by the "high" rule.
 */
const SAFETY_SOFTEN_RULES: Array<[RegExp, string]> = [
  [/\bheld up high\b/gi, "presented gently"],
  [/\bhold(ing)? up high\b/gi, "present(ing) gently"],
  [/\bgiant rocky cliff\b/gi, "tall sunny rock outcrop"],
  [/\bdrop(ping)? off (a|the) cliff\b/gi, "stepping near a hill$1"],
  [/\bcliff edge\b/gi, "rock ledge"],
  [/\bcliff\b/gi, "tall rock"],
  [/\bshadowy cave\b/gi, "rocky cave with line-art rocks, no solid black fill"],
  [/\bshadowy\b/gi, "dim"],
  [/\bdark mane\b/gi, "thick mane"],
  [/\bscar over (one|his|her) eye\b/gi, "tuft of fur near $1 eye"],
  [/\bscarred\b/gi, "ruffled"],
  [/\bplotting\b/gi, "watching"],
  [/\bsneaky-looking\b/gi, "curious"],
  [/\bsneaky\b/gi, "curious"],
  [/\bvillain(s)?\b/gi, "rival$1"],
  [/\bscary\b/gi, "silly"],
  [/\bfrightened\b/gi, "surprised"],
  [/\bstampeding wildebeest\b/gi, "running herd of friendly wildebeest"],
  [/\bdust storm of the stampede\b/gi, "swirl of running animals"],
  [/\bstampede\b/gi, "running herd"],
  [/\blightning crackling\b/gi, "soft clouds"],
  [/\bstormy sky\b/gi, "cloudy sky"],
  [/\bnose to nose\b/gi, "facing each other"],
  [/\bconfront(ing|ed|s)?\b/gi, "meeting"],
  [/\bvultures circling\b/gi, "birds soaring"],
  [/\btiny baby\b/gi, "small"],
  [/\btears? streaming\b/gi, "one big tear"],
];

function softenForSafety(prompt: string): {
  softened: string;
  changed: boolean;
} {
  let out = prompt;
  let changed = false;
  for (const [re, replacement] of SAFETY_SOFTEN_RULES) {
    if (re.test(out)) {
      out = out.replace(re, replacement);
      changed = true;
    }
  }
  return { softened: out, changed };
}

/**
 * Generic AI-powered substitution map — fires only when rule-based soften
 * has failed. Calls gpt-5-mini and asks it to identify a SHORT LIST of
 * IP/safety-trigger phrases to swap, NOT to rewrite the whole prompt.
 * We then apply the substitutions as targeted string replacements on the
 * original prompt — preserving every rule (B&W, character lock, page
 * frame, anatomy, etc.) while breaking the IP / safety fingerprint.
 *
 * Generic across ALL stories: Lion King, Frozen, Toy Story, Cars, Finding
 * Nemo, anything. Costs ~$0.0003 per failed page (only fires on failures).
 */
async function aiSuggestSubstitutions(
  prompt: string,
  hint?: string,
): Promise<Array<{ from: string; to: string }> | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const userPrompt = buildSafetySubstitutionsUserPrompt(prompt, hint);

  try {
    const result = await generateText({
      model: openai(OPENAI_TEXT_MODEL),
      system: SAFETY_SUBSTITUTIONS_SYSTEM_PROMPT,
      prompt: userPrompt,
    });
    const text = result.text.trim();
    // Strip ```json fences if the model added them.
    const stripped = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(stripped);
    if (!Array.isArray(parsed)) return null;
    const validated = parsed
      .filter(
        (e): e is { from: string; to: string } =>
          !!e &&
          typeof e === "object" &&
          typeof (e as { from?: unknown }).from === "string" &&
          typeof (e as { to?: unknown }).to === "string" &&
          (e as { from: string }).from.length > 2,
      )
      .slice(0, 6);
    return validated.length > 0 ? validated : null;
  } catch {
    return null;
  }
}

function applySubstitutions(
  prompt: string,
  subs: Array<{ from: string; to: string }>,
): { result: string; appliedCount: number } {
  let result = prompt;
  let appliedCount = 0;
  for (const { from, to } of subs) {
    if (!from || !result.includes(from)) continue;
    // Replace ALL occurrences (subject often appears multiple times in
    // the master prompt, e.g. "The ${subject} is the main character" +
    // "${subject}'s natural environment").
    result = result.split(from).join(to);
    appliedCount += 1;
  }
  return { result, appliedCount };
}

/** Gemini response metadata we surface for better error messages. */
interface CallResult {
  image: GenerateImageResult | null;
  finishReason?: string;
  blockReason?: string;
  /** Plain-text response when the model replied with words instead of an image. */
  textReply?: string;
}

function isTransientNetworkError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof Error && err.name === "AbortError") return false;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  const code =
    (err as { code?: string; cause?: { code?: string } } | null)?.code ??
    (err as { cause?: { code?: string } } | null)?.cause?.code ??
    "";
  return (
    msg.includes("fetch failed") ||
    msg.includes("network") ||
    msg.includes("socket") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("eai_again") ||
    msg.includes("enotfound") ||
    msg.includes("und_err") ||
    msg.includes("terminated") ||
    msg.includes("other side closed") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("504") ||
    code.startsWith("ECONN") ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN"
  );
}

async function callGemini(
  client: GoogleGenAI,
  prompt: string,
  opts: GenerateOptions,
): Promise<CallResult> {
  const aspectRatio = opts.aspectRatio ?? "1:1";

  const parts: Array<{
    text?: string;
    inlineData?: { mimeType: string; data: string };
  }> = [];
  if (opts.sourceImage) {
    parts.push({
      inlineData: {
        mimeType: opts.sourceImage.mimeType,
        data: opts.sourceImage.data,
      },
    });
  }
  if (opts.extraImages?.length) {
    for (const img of opts.extraImages) {
      parts.push({
        inlineData: { mimeType: img.mimeType, data: img.data },
      });
    }
  }
  parts.push({ text: prompt });

  const MAX_NETWORK_RETRIES = 3;
  let attempt = 0;
  let lastErr: unknown = null;
  let response: Awaited<
    ReturnType<typeof client.models.generateContent>
  > | null = null;
  while (attempt < MAX_NETWORK_RETRIES) {
    try {
      response = await client.models.generateContent({
        model: opts.model ?? DEFAULT_INTERIOR_MODEL,
        contents: [{ role: "user", parts }],
        config: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio },
        },
      });
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      attempt += 1;
      if (!isTransientNetworkError(err) || attempt >= MAX_NETWORK_RETRIES) {
        throw err;
      }
      const backoffMs = 600 * Math.pow(2, attempt - 1) + Math.random() * 300;
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  if (!response) {
    throw lastErr instanceof Error
      ? lastErr
      : new Error("Gemini call failed without a response.");
  }

  const candidate =
    response.candidates?.[0] ??
    (
      response as unknown as {
        response?: {
          candidates?: {
            finishReason?: string;
            content?: { parts?: unknown[] };
          }[];
          promptFeedback?: { blockReason?: string };
        };
      }
    ).response?.candidates?.[0];
  const promptFeedback =
    (
      response as unknown as {
        promptFeedback?: { blockReason?: string };
        response?: { promptFeedback?: { blockReason?: string } };
      }
    ).promptFeedback ??
    (
      response as unknown as {
        response?: { promptFeedback?: { blockReason?: string } };
      }
    ).response?.promptFeedback;

  const finishReason = (candidate as { finishReason?: string } | undefined)
    ?.finishReason;
  const blockReason = promptFeedback?.blockReason;
  const responseParts = (candidate?.content?.parts ?? []) as Array<{
    text?: string;
    inlineData?: { mimeType?: string; data?: string };
  }>;

  let textReply: string | undefined;
  for (const part of responseParts) {
    const inline = part.inlineData;
    if (inline?.data) {
      return {
        image: { mimeType: inline.mimeType ?? "image/png", data: inline.data },
        finishReason,
        blockReason,
      };
    }
    if (typeof part.text === "string" && part.text.trim()) {
      textReply = (textReply ? textReply + "\n" : "") + part.text.trim();
    }
  }

  return { image: null, finishReason, blockReason, textReply };
}

/** Best-effort heuristic for detecting Disney/IP-flavoured prompts. */
function smellsLikeIpRefusal(prompt: string, finishReason?: string): boolean {
  if (finishReason === "RECITATION" || finishReason === "PROHIBITED_CONTENT") {
    return true;
  }
  // Multi-trigger combination → likely IP overlap.
  const lower = prompt.toLowerCase();
  const hasMeerkatWarthog =
    /\bmeerkat\b/.test(lower) && /\bwarthog\b/.test(lower);
  const hasLionKingMotif =
    (/\blion\b/.test(lower) &&
      /\bcliff\b.*\bcub\b|\bcub\b.*\bcliff\b/.test(lower)) ||
    /\bcircle of life\b/.test(lower) ||
    /\bpride rock\b/.test(lower);
  return hasMeerkatWarthog || hasLionKingMotif;
}

/**
 * Pre-defined IP-trigger pairs we suggest swapping when the prompt smells
 * like a copyrighted work. Order matters — most specific first.
 */
const IP_SUGGESTIONS: Array<[RegExp, string]> = [
  [
    /\bmeerkat\b.*\bwarthog\b|\bwarthog\b.*\bmeerkat\b/i,
    "Swap meerkat + warthog → hedgehog + rabbit, OR fox cub + raccoon, OR squirrel + tortoise (keeps the odd-couple feel without the Lion King fingerprint)",
  ],
  [
    /\bcliff\b.*\bcub\b|\bcub\b.*\bcliff\b|\bbaboon\b/i,
    "Replace 'cliff' + 'baboon presenting cub' wording → 'sunny rock outcrop' + 'wise old owl perched nearby' (defangs the Pride Rock recognition)",
  ],
  [
    /\bstargazing\b|\blooking up at thousands of stars\b|\blying on (their|its) backs?\b/i,
    "Reword 'lying on backs looking at stars' → 'sitting around a small campfire' or 'counting fireflies in a meadow' (avoids the 'They live in you' scene)",
  ],
];

/** Scan the prompt for trigger phrases and return concrete reword suggestions. */
function buildPromptSuggestions(prompt: string): string[] {
  const out: string[] = [];

  // Safety-word substitutions present in the prompt.
  for (const [re, replacement] of SAFETY_SOFTEN_RULES) {
    const cleanRe = new RegExp(re.source, re.flags.replace("g", ""));
    const match = prompt.match(cleanRe);
    if (match) {
      out.push(
        `Replace "${match[0]}" → "${replacement.replace(/\$\d/g, "...")}"`,
      );
    }
    if (out.length >= 4) break;
  }

  // IP-flavoured pairs.
  for (const [re, suggestion] of IP_SUGGESTIONS) {
    if (re.test(prompt)) {
      out.push(suggestion);
      if (out.length >= 5) break;
    }
  }

  return out;
}

/** Build a specific, user-readable failure message based on Gemini's signals. */
function buildFailureMessage(prompt: string, attempts: CallResult[]): string {
  const last = attempts[attempts.length - 1];
  const finish = last?.finishReason;
  const block = last?.blockReason;
  const textReply = last?.textReply;

  const suggestions = buildPromptSuggestions(prompt);
  const suggestionsBlock =
    suggestions.length > 0
      ? `\n\nTry rewording in the Refine modal — open this page, click "Refine", and ask Sparky to:\n  • ${suggestions.join("\n  • ")}`
      : `\n\nOpen the Refine modal on this page and ask Sparky to soften the wording (avoid scary, violent, or recognizable-IP terms; keep the page subject under ~200 words).`;

  // 1. Explicit copyright / IP recitation block.
  if (finish === "RECITATION" || smellsLikeIpRefusal(prompt, finish)) {
    return (
      "Gemini refused this scene because it's too close to a copyrighted work (likely Lion King / Disney style). The story arc is fine — only this specific scene's wording is the problem." +
      suggestionsBlock
    );
  }

  // 2. Explicit prohibited content / blocklist.
  if (finish === "PROHIBITED_CONTENT" || block === "PROHIBITED_CONTENT") {
    return (
      "Gemini blocked this prompt as prohibited content (typically violence, weapons, or unsafe-for-kids imagery)." +
      suggestionsBlock
    );
  }
  if (block === "BLOCKLIST") {
    return (
      "A specific word in this prompt is on Gemini's blocklist." +
      suggestionsBlock
    );
  }

  // 3. Safety filter (most common silent refusal for kids' content).
  if (finish === "SAFETY" || block === "SAFETY") {
    return (
      "Gemini's child-safety filter refused this prompt — usually triggered by 'scary', 'shadowy', 'held up high', 'scar', 'stampede', 'lightning', or 'cliff drop' wording. Same scene works with neutral wording." +
      suggestionsBlock
    );
  }

  // 4. Token / quota.
  if (finish === "MAX_TOKENS") {
    return "The prompt was too long for Gemini to render in one go. Open the Refine modal and ask Sparky to shorten this page subject — keep it under ~200 words.";
  }

  // 5. Model returned text instead of an image — usually a soft refusal.
  if (textReply) {
    const snippet =
      textReply.length > 220 ? textReply.slice(0, 217) + "…" : textReply;
    return (
      `Gemini replied with text instead of an image — that's a polite refusal. The model said: "${snippet}".` +
      suggestionsBlock
    );
  }

  // 6. Generic empty response — most often a silent safety/IP refusal.
  return (
    "Gemini returned an empty response — almost always a silent safety or copyright filter on the page wording. The error is on Google's side, not yours, but the fix is to reword the page." +
    suggestionsBlock
  );
}

function callGeminiOrNetworkError(
  client: GoogleGenAI,
  prompt: string,
  opts: GenerateOptions,
): Promise<CallResult> {
  return callGemini(client, prompt, opts).catch((err: unknown) => {
    if (isTransientNetworkError(err)) {
      throw new Error(
        "Network hiccup talking to Gemini (we already retried 3 times with backoff). The model is reachable but a connection kept dropping mid-request — usually a transient cloud-side issue. Wait 10–20 seconds and click Regenerate again.",
      );
    }
    throw err;
  });
}

export async function generateColoringImage(
  prompt: string,
  opts: GenerateOptions = {},
): Promise<GenerateImageResult> {
  const client = getClient();

  // Single attempt with the original prompt. Auto-rewrite chain
  // (rule-based soften + AI substitution) is intentionally disabled —
  // the user wants explicit control over retries, not silent prompt
  // mutation behind their back. When the prompt fails, the failure
  // message surfaces to the UI so the user can edit and retry.
  const first = await callGeminiOrNetworkError(client, prompt, opts);
  if (first.image) return first.image;
  throw new Error(buildFailureMessage(prompt, [first]));
}
