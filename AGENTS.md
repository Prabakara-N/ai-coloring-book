<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Component organization

**ALWAYS prefer many small reusable components over large single files.**

Specifically:
- **Hard cap: 400 lines per file.** If a file passes 400 lines, split it. Anything over 600 is a bug — refactor before adding more.
- **Extract subcomponents** the moment a JSX block exceeds ~80 lines or appears more than once. Don't define `Foo`, `FooDetail`, `FooBadge`, `FooHeader` all inside `app/foo/page.tsx` — split each into its own file under `app/foo/_components/` or `components/ui/`.
- **One component per file** is the default. Co-locate small helper components in the same file ONLY if they are tiny (<30 lines), trivially private, and only used by the parent in the same file.
- **Reuse before duplicate.** If a UI pattern (badge, card, modal, picker) appears in two places, extract it to `components/ui/` even if the two usages need slight prop variation. Add the variation as a prop, don't duplicate.
- **Folder convention:** route-specific components go in `app/<route>/_components/<name>.tsx` (the `_` prefix prevents Next from treating it as a route). Reusable components across routes go in `components/ui/`.
- **Naming:** export ONE named function per file, file name is kebab-case matching the component name (`page-detail.tsx` exports `PageDetail`).

When refactoring an existing large file, split it in this order: (1) data types into `_types.ts`, (2) pure utility functions into `_utils.ts`, (3) leaf components first (badges, status pills), (4) then larger composite components.
