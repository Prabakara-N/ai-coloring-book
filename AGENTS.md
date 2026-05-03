<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Component organization

**ALWAYS prefer many small reusable components over large single files.**

Specifically:
- **Hard cap: 400 lines per file.** If a file passes 400 lines, split it. Anything over 600 is a bug — refactor before adding more.
- **Extract subcomponents** the moment a JSX block exceeds ~80 lines or appears more than once. Don't define `Foo`, `FooDetail`, `FooBadge`, `FooHeader` all inside `app/foo/page.tsx` — split each into its own file under `components/foo/` (route-specific) or `components/ui/` (reusable).
- **One component per file** is the default. Co-locate small helper components in the same file ONLY if they are tiny (<30 lines), trivially private, and only used by the parent in the same file.
- **Reuse before duplicate.** If a UI pattern (badge, card, modal, picker) appears in two places, extract it to `components/ui/` even if the two usages need slight prop variation. Add the variation as a prop, don't duplicate.
- **Folder convention:**
  - **Route-specific components** go in `components/<route>/<name>.tsx` (e.g. `components/playground/cover-pair.tsx`, `components/generate/multi-select-chips.tsx`). Do NOT put components inside `app/<route>/_components/`.
  - **Reusable cross-route UI primitives** go in `components/ui/<name>.tsx` (e.g. `components/ui/image-preview-dialog.tsx`).
  - **Types** stay co-located with the code that defines them (e.g. `app/playground/types.ts`, types inline in `lib/<feature>.ts`). Only extract a type to a shared file if it's duplicated across 3+ files OR will become a database row shape later.
- **Naming:** export ONE named function per file, file name is kebab-case matching the component name (`page-detail.tsx` exports `PageDetail`).

When refactoring an existing large file, split it in this order: (1) data types into a co-located `types.ts` next to the consumer, (2) pure utility functions into `lib/<feature>-utils.ts`, (3) leaf components first (badges, status pills) into `components/<route>/`, (4) then larger composite components.

# Prompts

These rules apply to every string sent to an LLM (Gemini image gen, OpenAI text, Perplexity research, etc.).

**No hardcoded theme examples.** Image models read example text as instructions. If you write "e.g. a cow in a meadow with barn + grass + sky" as flavor in a generic rule, Gemini will draw cows / barns / meadows in books that have nothing to do with farms. The savanna / acacia / coral / jungle examples that used to live in `lib/prompts.ts` were the cause of "every book had trees" — they primed the model. Strip example sub-clauses from any rule that runs on every page. Replace with abstract guidance ("derive elements from the subject's natural habitat") that the model fills in per book.

**If an example is genuinely necessary, label it.** Prefix with the literal word `EXAMPLE` (uppercase) and the qualifier *"illustrative only, do not literally use these elements unless they match this book"*. The label tells the model the words are meta, not content. Inline `e.g.` and parenthetical examples without that label are read as instructions.

**Never include "good tagline" / "good prompt" sample text inside the prompt itself unless it's clearly fenced as EXAMPLE.** A sample like *"From mane to whisker, a savanna for small hands"* will leak as suggested phrasing for unrelated books. Either fence it or omit it.

**Categorical lists are different from theme examples.** "Vehicles, fruits, suns, household items" is a category list (it tells the model what *kind* of subject this rule applies to). That's safe — the model isn't going to render "vehicles + fruits + suns" because the list is grammatically a parenthetical type marker. The danger is *scene-specific* concrete-noun examples like "barn, grass, palm tree, coral reef".

**No emoji in prompts.** Emoji (pictograph, warning sign, lock, palette, target, etc.) inside any LLM-bound string — system, user, schema description, fallback. Words alone carry the weight. Em-dashes and standard punctuation are fine.

**Static system, dynamic user.** When using Gemini, put stable rules in `config.systemInstruction` and per-page changing content in the user `parts`. When using OpenAI via Vercel AI SDK, put stable rules in the `system` parameter. Stable prefixes get cached automatically (OpenAI: 50% off ≥1024 tokens, Gemini: 75% off ≥1024 tokens, ~5min TTL).

**Don't say each rule twice.** Repeating "draw exactly one border" three times made the model draw two. State each rule once in the section it logically belongs.

# Prompt module organization

Prompt-builder modules live under `lib/prompts/`. Conventions:

- **One concern per file.** `master-page.ts`, `cover.ts`, `belongs-to.ts`, `reference.ts`, `guardrails.ts`, `categories.ts`, `types.ts`. New prompt families get their own file — do not append to an existing one because it's "kind of related."
- **Every prompt category is its own file.** When adding a new coloring-book category (e.g. `space`, `holidays`, `ocean-deep`), create `lib/prompts/categories/<slug>.ts` exporting a single `ColoringCategory` object. The aggregator in `lib/prompts/categories.ts` (or `categories/index.ts`) imports each per-slug file and assembles the `CATEGORIES` array. Do NOT keep growing a single multi-thousand-line array literal.
- **Barrel-only public API.** External code imports from `@/lib/prompts` (which resolves to `lib/prompts/index.ts`). The submodules (`./guardrails`, `./master-page`, etc.) are internal — only other files inside `lib/prompts/` import from them directly.
- **Guardrail constants are exported from `guardrails.ts` and imported by every template that needs them.** Do not duplicate a guardrail string into a template file. Tuning a kid-safe / anatomy / KDP-quality rule once should propagate to every prompt that uses it.
