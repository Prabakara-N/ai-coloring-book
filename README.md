# CrayonSparks

AI-powered coloring book generator for Amazon KDP creators. Built with Next.js 16, React 19, Tailwind v4, and Gemini Nano Banana (Gemini 2.5 Flash Image).

> Phase 1 scope: marketing site + AI generator (no auth, no database). Built from the plan in `ColorBook_AI_Website_Plan_For_Claude_Code.txt` and 280 prompts from `Coloring_Book_Prompts_Kids.pdf`.

## Features shipped

- **Marketing site** — hero, features bento, how-it-works, testimonials, pricing, FAQ
- **14 category pages** (`/gallery`) covering 280 curated prompts
- **AI Generator** (`/generate`) — single prompt, full 20-page batch, custom subjects
- **Lead magnet pages** (`/free/[slug]`) for every category
- **Mobile responsive** with Aceternity-style animations (spotlight, bento grid, moving border, infinite cards, meteors, typewriter)
- **Gemini 2.5 Flash Image** integration via `@google/genai`
- **Batch ZIP download** for all generated pages in a category

## Setup

1. Copy env template:

   ```bash
   cp .env.local.example .env.local
   ```

2. Add your Gemini API key (get one at <https://aistudio.google.com/apikey>):

   ```
   GEMINI_NANO_BANANA_API_KEY=your-key-here
   ```

3. Install & run:

   ```bash
   npm install
   npm run dev
   ```

4. Open <http://localhost:3000>. Go to `/generate` and generate your first page.

## Routes

| Path                 | Purpose                                  |
| -------------------- | ---------------------------------------- |
| `/`                  | Marketing landing                        |
| `/features`          | Feature deep-dive                        |
| `/gallery`           | 14 categories × prompt previews          |
| `/pricing`           | 4 tiers (Free, Starter, Pro, Studio)     |
| `/generate`          | AI generator studio                      |
| `/free/[slug]`       | Per-category lead magnet + email capture |
| `/api/generate` POST | Gemini image generation endpoint         |

## Tech

- Next.js 16 (App Router, Turbopack, Server Components)
- React 19
- TypeScript (strict)
- Tailwind CSS v4
- motion (formerly framer-motion)
- @google/genai (Gemini SDK)
- lucide-react, @tabler/icons-react
- jszip (batch PNG bundling on the client)

## Not yet built (Phase 2+)

- Firebase Auth + Firestore
- Lemon Squeezy checkout + webhooks
- Pinterest OAuth + auto-scheduler
- KDP PDF assembler (PDFKit/pdf-lib)
- Etsy + Gumroad publishing APIs
- Analytics dashboard

See `ColorBook_AI_Website_Plan_For_Claude_Code.txt` for the full 8-sprint roadmap.
