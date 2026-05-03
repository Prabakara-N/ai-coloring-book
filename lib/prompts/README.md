# Prompt registry

This directory holds every prompt-builder string that ships to a generative
model from inside the application. Public consumers import from
`@/lib/prompts` (the barrel in `index.ts`); the per-concern submodules below
are internal to this folder.

## Files

| File | Purpose | Used by |
| --- | --- | --- |
| `types.ts` | Shared prompt and book types: `AgeRange`, `Detail`, `Background`, `PromptOptions`, `CoverStyle`, `CoverBorder`, `BelongsToStyle`, `ColoringPrompt`, `ColoringCategory`. | every other module in this folder + UI consumers |
| `guardrails.ts` | The 12 shared guardrail strings (`ANCHOR`, `DRAW_BORDER_RULE`, `FILL_CANVAS_RULE`, `COMMON_ELEMENT_STYLE`, `KID_SAFE_CONTENT_RULE`, `ANATOMY_GUARDRAIL`, `ANTHRO_FACE_GUARDRAIL`, `KDP_QUALITY_GUARDRAIL`, `STYLE_CONSISTENCY`, `ARTIFACT_GUARDRAIL`, `PRINT_TRIM_SAFETY_RULE`, `FINAL_BW_OVERRIDE`). Internal — never imported through the barrel. | `master-page`, `belongs-to`, `reference`, `cover` |
| `master-page.ts` | Interior page builders: `MASTER_PROMPT_SYSTEM`, `MASTER_PROMPT_USER`, `MASTER_PROMPT_TEMPLATE`. Plus the variation pickers (pose / position / background-emphasis seeds). Plus `AGE_PRESETS` and `DETAIL_PRESETS`. | `app/api/generate/route.ts`, `reference.ts` |
| `cover.ts` | Front-cover, back-cover, and thumbnail builders: `COLOR_COVER_PROMPT_TEMPLATE`, `BACK_COVER_PROMPT_TEMPLATE`, `THUMBNAIL_PROMPT_TEMPLATE`. | `app/api/generate/route.ts` |
| `belongs-to.ts` | Bookplate page: `BELONGS_TO_PROMPT_TEMPLATE`. | `app/api/generate/route.ts` |
| `reference.ts` | Reference-image flow: `REFERENCE_LED_PROMPT_TEMPLATE`, `STYLE_REFERENCE_PROMPT`, `BACK_COVER_COLOR_ANCHOR_PROMPT`, `BACK_COVER_COLOR_ANCHOR_FALLBACK_PROMPT`, `CONSISTENCY_ANCHOR_PROMPT`, plus the small inline notes. | `app/api/generate/route.ts` |
| `categories.ts` | The `CATEGORIES` array and helpers (`TOTAL_PROMPTS`, `findCategory`). Pure data. | sitemap, gallery, free pages, generator UI |
| `sanitize.ts` | `userInput()` fencing helper + `USER_INPUT_FENCING_NOTE` for prompt-injection defence. Imported via the explicit subpath `@/lib/prompts/sanitize`. | `app/api/refine/route.ts`, `app/api/rewrite-subject/route.ts`, plus indirectly via `rewrite-subject.ts` |
| `single-image-ideas.ts` | `SINGLE_IMAGE_IDEAS_SYSTEM_PROMPT` — system prompt for the "5 prompt ideas per category" flow. | `app/api/single-image-ideas/route.ts` |
| `rewrite-subject.ts` | `REWRITE_SUBJECT_SYSTEM_PROMPT` — IP-aware rewriter that swaps secondary characters / settings while protecting the book's protagonists. | `app/api/rewrite-subject/route.ts` |
| `back-cover-tagline.ts` | `BACK_COVER_TAGLINE_SYSTEM_PROMPT` — parent-first tagline generator for the back cover. | `app/api/back-cover-tagline/route.ts` |
| `safety-substitutions.ts` | `SAFETY_SUBSTITUTIONS_SYSTEM_PROMPT` + `buildSafetySubstitutionsUserPrompt` — short JSON substitutions when Gemini refuses on an IP / safety trigger. | `lib/gemini.ts` (`aiSuggestSubstitutions`) |
| `index.ts` | Public barrel — the only thing external code should import for the main prompt surface. Also re-exports `NO_REAL_BRAND_RULE` for prompt builders that live outside this folder. | everywhere via `@/lib/prompts` |

## Models and where each prompt lands

| Constant | Model used at runtime | Notes |
| --- | --- | --- |
| `MASTER_PROMPT_SYSTEM` | Gemini image (system instruction) | Static prefix — ~1.5K tokens; triggers Gemini implicit caching at 1024+ tokens (75% discount, 5-min TTL). |
| `MASTER_PROMPT_USER` | Gemini image (user parts) | Per-page dynamic content. Goes through Gemini alongside the cached system prefix. |
| `MASTER_PROMPT_TEMPLATE` | Gemini image (single string) | Backwards-compat concatenated form. Prefer the SYSTEM/USER split for caching. |
| `COLOR_COVER_PROMPT_TEMPLATE` | Gemini image | Single string, sent every cover request — no caching gain since the template body changes per book. |
| `BACK_COVER_PROMPT_TEMPLATE` | Gemini image | Single string per back cover. |
| `BELONGS_TO_PROMPT_TEMPLATE` | Gemini image | Single string per bookplate. |
| `THUMBNAIL_PROMPT_TEMPLATE` | Gemini image | Tiny single string per thumbnail. |
| `REFERENCE_LED_PROMPT_TEMPLATE` | Gemini image | Used when a user-uploaded reference image is attached. |
| `STYLE_REFERENCE_PROMPT` / `BACK_COVER_COLOR_ANCHOR_PROMPT` / `CONSISTENCY_ANCHOR_PROMPT` | Gemini image (prefix prepended in route) | Inline glue prepended to the main template by `app/api/generate/route.ts`. |
| `SINGLE_IMAGE_IDEAS_SYSTEM_PROMPT` | OpenAI text (`OPENAI_TEXT_MODEL`) | System prompt for the "5 prompt ideas" object-generation call. |
| `REWRITE_SUBJECT_SYSTEM_PROMPT` | OpenAI text | System prompt for IP/safety subject rewriter. |
| `BACK_COVER_TAGLINE_SYSTEM_PROMPT` | OpenAI text | System prompt for the back-cover tagline `generateObject` call. |
| `SAFETY_SUBSTITUTIONS_SYSTEM_PROMPT` | OpenAI text | System prompt for the small JSON substitution flow that fires when Gemini refuses a page. |
| `NO_REAL_BRAND_RULE` | (interpolated) | Shared brand-avoidance rule pulled into `lib/book-chat.ts` (QA + story system prompts) and `lib/book-planner.ts`. Tune in one place. |

## Editing rules

Read `AGENTS.md` (`# Prompts` and `# Prompt module organization`) before
editing anything in this folder. Key reminders:

- **No hardcoded theme examples** in any rule that runs on every page —
  example sub-clauses like "barn, grass, palm tree" leak as instructions.
- **Static system, dynamic user** — keep stable text in
  `MASTER_PROMPT_SYSTEM` so Gemini's implicit prefix cache fires.
- **Don't repeat a rule** twice in the same prompt; the model reads
  duplication as emphasis and starts producing two of whatever was
  emphasized (the "draw two borders" failure pattern).
- **No emoji in prompt text.** A small number of legacy emoji still live in
  `guardrails.ts` and are tracked for cleanup; do not add new ones.

## Known follow-ups

- **`categories.ts` exceeds 400 lines** because it holds all 14 categories
  in one array literal. Per the new rule in `AGENTS.md`, every category
  should live in its own file at `lib/prompts/categories/<slug>.ts`. Plan
  to split the next time a category is added or edited.
- **`lib/book-chat.ts` and `lib/book-planner.ts` still hold large inline
  system prompts.** Phase 2 stopped at the API routes + `lib/gemini.ts`;
  these two files are the next candidates. They should each move into a
  sibling here (`book-chat-qa.ts`, `book-chat-story.ts`, `book-planner.ts`).

See `docs/PROMPTS_RESTRUCTURE_PLAN.txt` for historical context on Phases
1–3 and the planned Phase 4 follow-up.
