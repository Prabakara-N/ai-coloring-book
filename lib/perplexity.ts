/**
 * Tiny Perplexity Sonar API client.
 *
 * Uses the chat-completions endpoint with a search-enabled model so the
 * response is grounded in live web results (current Amazon KDP categories,
 * trending keywords, etc.).
 *
 * Auth: PERPLEXITY_API_KEY env var.
 * Model: PERPLEXITY_MODEL env var (default "sonar"; "sonar-pro" for higher
 * quality at ~3× cost).
 */

const ENDPOINT = "https://api.perplexity.ai/chat/completions";

export interface PerplexityCallInput {
  system: string;
  user: string;
  /** Override the default model. */
  model?: string;
  temperature?: number;
}

export interface PerplexityCallResult {
  text: string;
  /** Live web sources Perplexity cited. */
  citations?: string[];
}

export async function callPerplexity(
  input: PerplexityCallInput,
): Promise<PerplexityCallResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "PERPLEXITY_API_KEY is not set. Add it to .env.local to use the hybrid metadata source.",
    );
  }

  const model = input.model ?? process.env.PERPLEXITY_MODEL ?? "sonar";

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
      temperature: input.temperature ?? 0.3,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Perplexity ${res.status}: ${body.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    citations?: string[];
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("Empty Perplexity response.");

  return {
    text,
    citations: Array.isArray(data.citations) ? data.citations : undefined,
  };
}

/** Try to extract a JSON object from a Perplexity response (often wraps in fences). */
export function extractJsonFromPerplexity(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]+?)\s*```/i.exec(text);
  const raw = fenced ? fenced[1] : text;
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace < 0)
    throw new Error("No JSON object in Perplexity response.");
  return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
}
