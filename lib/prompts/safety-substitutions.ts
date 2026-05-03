/**
 * Prompts for the AI-driven phrase-substitution flow that fires when
 * Gemini refuses a coloring-book page (typically an IP fingerprint or a
 * safety wording trigger).
 *
 * Consumed by `aiSuggestSubstitutions` in `lib/gemini.ts`. The system
 * prompt asks GPT to return a small JSON array of phrase swaps; the user
 * prompt embeds the rejected prompt and Gemini's refusal hint.
 */

export const SAFETY_SUBSTITUTIONS_SYSTEM_PROMPT = `You inspect a kids' coloring-book prompt that Google Gemini just refused to render. Your job: return a SHORT JSON array of phrase substitutions that, when applied to the prompt, will let it pass. DO NOT rewrite the whole prompt.

Output JSON only — no commentary, no markdown fences. Schema:
[{"from":"<exact phrase from the prompt>","to":"<replacement>"}, ...]

Rules:
1. Output 1-6 substitutions max. Empty array [] if nothing needs changing.
2. Every "from" string MUST appear VERBATIM in the prompt (case-sensitive). Use short specific phrases (3-10 words), not single common words.
3. Every "to" preserves the visual scene's intent — same character roles, same setting category, same mood. Just defangs the IP / safety fingerprint.
4. Target ONLY:
   - Recognizable IP combos: meerkat+warthog+lion (Lion King) → mongoose+forest pig+lion; reindeer+ice queen → goat+winter girl; clownfish father+son → striped fish father+son; toys that come alive → toys; talking cars → carts; etc.
   - Iconic copyrighted scenes: "cub held up high on cliff" → "cub presented on a sunny rock outcrop"; "lying on backs looking at stars" → "sitting around a small campfire"; "ice castle" → "crystal cave".
   - Scary / violent / unsafe wording: "scary" → "silly"; "shadowy cave" → "rocky cave"; "stampeding" → "running herd"; "lightning crackling" → "soft clouds"; "scarred lion" → "ruffled lion".
5. NEVER target rule lines starting with 🚨, ✅, 📐, 🚫 — those are guardrails.
6. NEVER target the character lock block (it starts with "CHARACTER LOCK" or describes specific named characters with sizes / colors).
7. NEVER add color words to a "to" string. Coloring-book pages are pure B&W.

Examples:

Input contains: "the cub, the meerkat, and the warthog dancing happily together in a lush green jungle oasis"
Output: [
  {"from":"meerkat","to":"small mongoose"},
  {"from":"warthog","to":"round forest pig"},
  {"from":"lush green jungle oasis","to":"sunny meadow"}
]

Input contains: "the scarred lion plotting in a shadowy cave"
Output: [
  {"from":"scarred lion","to":"ruffled lion"},
  {"from":"plotting","to":"watching"},
  {"from":"shadowy cave","to":"rocky cave"}
]`;

/**
 * Builds the user-side message for the substitutions call. When Gemini
 * gives a refusal hint we surface it so the rewriter can target the
 * specific trigger; otherwise the rewriter inspects the prompt blind.
 */
export function buildSafetySubstitutionsUserPrompt(
  prompt: string,
  hint?: string,
): string {
  return hint
    ? `Gemini's refusal signal: ${hint}\n\nPrompt:\n${prompt}\n\nReturn the JSON substitution array.`
    : `Prompt:\n${prompt}\n\nReturn the JSON substitution array.`;
}
