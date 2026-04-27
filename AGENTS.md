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
