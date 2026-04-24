/* eslint-disable no-console */
import { mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const OUT_ROOT = join(process.cwd(), "public", "visuals");
const MODEL_ID = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
const FORCE = process.argv.includes("--force");

/**
 * PrabaCreates brand aesthetic:
 * - Warm cream / ivory background (#fef7ed → #fff7ed → #fef3c7)
 * - Primary: deep navy indigo (#1e1b4b, #3730a3)
 * - Accent: orange (#f97316, #fb923c)
 * - Secondary: teal (#5eead4, #14b8a6)
 * - Tilted paper-card visual motif with soft drop shadows
 * - Rounded blob decorations with 8-15% opacity
 * - Dot / speckle backgrounds
 * - Clean flat vector, no gradients on characters, gentle cartoon style
 * - Print-ready gift-shop feel
 */
const BRAND_STYLE =
  "Flat vector illustration in the PrabaCreates brand style: warm cream / ivory background (peach and light yellow tones), decorated with soft translucent circular blobs in navy indigo and orange. Deep navy indigo (#1e1b4b) and vivid orange (#f97316) as primary colors, with teal (#14b8a6) accents. Illustration pieces arranged as slightly tilted rounded cards with soft drop shadows, creating a playful paper-cutout collage look. Clean flat shapes, chunky rounded strokes, no photorealism, no gradients on characters, cheerful gift-shop aesthetic. No text, no logos, no watermarks, no faces on humans. Premium editorial composition, generous negative space, slight grain texture.";

interface Target {
  file: string;
  prompt: string;
  aspect: "16:9" | "4:3";
}

const FEATURES: Target[] = [
  {
    file: "features/generation.png",
    prompt:
      "A hand-illustrated scene: a slightly tilted navy indigo card in the center shows a glowing magic wand with small orange sparkles. Around it, three smaller tilted cards — one orange, one teal, one navy — each showing a simple coloring-book-style outline of a cartoon animal being drawn. A soft orange circular blob in the top-right corner.",
    aspect: "16:9",
  },
  {
    file: "features/kdp.png",
    prompt:
      "A slightly tilted navy indigo card in the center shows an open book with pages fanning out, displaying simple coloring-book outline art. Next to it, a tilted teal card with a PDF document icon and a ruler indicating 8.5 × 11 inches. A tilted orange card with a small 300 DPI stamp. Soft cream background with decorative dots.",
    aspect: "16:9",
  },
  {
    file: "features/pinterest.png",
    prompt:
      "A hand-illustrated collage of three slightly tilted pin-shaped cards (navy, orange, teal) pinned to a cream cork-texture surface with small red pushpins. Dotted arrow trails flow from the pins to a small simple shopping-bag icon in the corner. Warm cream background with orange circular blob accents.",
    aspect: "16:9",
  },
  {
    file: "features/marketplace.png",
    prompt:
      "Three slightly tilted rounded cards arranged in a row on a cream background, each labeled with a simple storefront silhouette (one navy, one orange, one teal). A single coloring book icon in the center with small curved orange arrows routing to each card. Decorative dotted and dashed connecting lines.",
    aspect: "16:9",
  },
  {
    file: "features/analytics.png",
    prompt:
      "A slightly tilted navy indigo card in the center shows a simple bar chart and an upward-trending line chart with orange dots as data points. Around it, a tilted teal card with a donut-chart icon, and a tilted orange card with a magnifying glass. Cream background with soft decorative blobs.",
    aspect: "16:9",
  },
];

const BLOG: Target[] = [
  {
    file: "blog/publish-first-kdp-coloring-book-with-ai.png",
    prompt:
      "A slightly tilted navy indigo rounded card in the center showing an open book; to the left a tilted teal card with a simple magic wand, to the right a tilted orange card with a gold-star 'bestseller' badge and a small dollar-sign. Dotted line trail connects the three cards, signifying a workflow. Cream background with orange circular blob in top-right, small decorative dots scattered.",
    aspect: "16:9",
  },
  {
    file: "blog/pinterest-sales-engine-for-kdp-coloring-books.png",
    prompt:
      "Three slightly tilted pin-shaped rounded cards (navy, orange, teal) pinned to a cream cork-textured background with small red pushpins. Small dotted arrows flow from the pins to a simple storefront silhouette in the bottom-right. Warm orange circular blob accent. Editorial collage feel.",
    aspect: "16:9",
  },
  {
    file: "blog/consistent-ai-coloring-book-style.png",
    prompt:
      "A grid of 6 slightly tilted cream cards, each showing a simple line-art coloring-book silhouette (cow, pig, sheep, duck, rabbit, chick) drawn in the same style — emphasizing visual consistency. A subtle decorative 'formula' bracket overlay in navy indigo. Cream background with orange and teal dots.",
    aspect: "16:9",
  },
  {
    file: "blog/best-kdp-niches-2026.png",
    prompt:
      "A slightly tilted arrangement of seven small rounded cards in alternating navy, orange, and teal, each labeled with a tiny simple silhouette (dinosaur, unicorn, truck, cow, fish, princess, letter A). Cards arranged in an upward-rising staircase layout suggesting rising trends. Warm cream background with orange circular blob and decorative dots.",
    aspect: "16:9",
  },
  {
    file: "blog/low-content-vs-no-content-kdp.png",
    prompt:
      "Two slightly tilted rounded cards side by side on a cream background: left card is cream-colored showing a simple blank lined notebook silhouette in navy outline (labeled with a simple grid pattern corner badge), right card is navy indigo showing an open coloring book silhouette with orange accents. A small balance-scale icon tilting slightly in the center between them. Decorative orange and teal dot patterns around the edges.",
    aspect: "16:9",
  },
];

const BENTO: Target[] = [
  {
    file: "bento/themes.png",
    prompt:
      "A playful collage of 14 slightly tilted cream rounded cards arranged in three rows, each card showing a simple silhouette of a different category (farm animal, dinosaur, unicorn, vehicle, sea creature, bird, flower, etc.) in minimalist line art. Soft navy indigo and orange circular blobs in the background. Warm cream canvas.",
    aspect: "4:3",
  },
  {
    file: "bento/nano-banana.png",
    prompt:
      "A slightly tilted navy indigo rounded card in the center showing a stylized banana-shaped microchip icon with simple orange circuit lines flowing out of it. A small sparkle accent. Cream background with orange dots and a soft teal blob.",
    aspect: "4:3",
  },
  {
    file: "bento/kdp-pdf.png",
    prompt:
      "A single slightly tilted cream card in the center showing a simple PDF document icon with pages fanning out, one of which shows a simple coloring-book outline. A tiny navy ruler indicating 8.5 × 11 inches. Cream background with orange and teal dot accents.",
    aspect: "4:3",
  },
  {
    file: "bento/pinterest-engine.png",
    prompt:
      "Three tiny tilted pin-shaped orange cards with red pushpins on a cream surface, connected by small dotted curves to a simple navy storefront silhouette in the corner. Decorative teal speckles.",
    aspect: "4:3",
  },
  {
    file: "bento/marketplace.png",
    prompt:
      "Three tiny slightly tilted rounded cards (navy, orange, teal) in a row, each with a small simple shopping-bag silhouette, and a central coloring-book icon sending small curved orange arrows to each card. Cream background with soft blobs.",
    aspect: "4:3",
  },
  {
    file: "bento/attribution.png",
    prompt:
      "A slightly tilted cream card showing a simple funnel illustration: a pin-shaped orange card at the top, a click-cursor in the middle, a dollar coin at the bottom, connected by navy dotted lines. Decorative teal dots and orange blob. Cream background.",
    aspect: "4:3",
  },
  {
    file: "bento/batch.png",
    prompt:
      "An isometric stack of 8-10 slightly tilted cream rounded cards stacked with offsets, suggesting a book in progress. A small '20 / 20' badge in navy indigo with orange accent on top. Cream background with small teal and orange decorative dots.",
    aspect: "4:3",
  },
];

async function exists(path: string) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function generate(client: GoogleGenAI, target: Target) {
  const out = join(OUT_ROOT, target.file);
  if (!FORCE && (await exists(out))) return { status: "skip" as const };
  await mkdir(join(OUT_ROOT, target.file.split("/").slice(0, -1).join("/")), {
    recursive: true,
  });
  const fullPrompt = `${target.prompt} ${BRAND_STYLE}`;
  try {
    const response = await client.models.generateContent({
      model: MODEL_ID,
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: target.aspect },
      },
    });
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts as { inlineData?: { data?: string } }[]) {
      if (part.inlineData?.data) {
        await writeFile(out, Buffer.from(part.inlineData.data, "base64"));
        return { status: "ok" as const };
      }
    }
    return { status: "fail" as const, error: "no image returned" };
  } catch (e) {
    return {
      status: "fail" as const,
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not set. Add it to .env.local first.");
    process.exit(1);
  }
  const client = new GoogleGenAI({ apiKey });
  await mkdir(OUT_ROOT, { recursive: true });

  const all: Target[] = [...FEATURES, ...BLOG, ...BENTO];
  console.log(`Generating ${all.length} brand visuals${FORCE ? " (forced)" : ""}`);
  console.log(`Style: PrabaCreates cream / navy / orange / teal palette`);
  console.log(`Output: ${OUT_ROOT}\n`);

  let ok = 0;
  let skip = 0;
  let fail = 0;
  for (const t of all) {
    process.stdout.write(`→ ${t.file} … `);
    const result = await generate(client, t);
    if (result.status === "ok") {
      console.log("ok");
      ok++;
    } else if (result.status === "skip") {
      console.log("skip (exists — rerun with --force to regenerate)");
      skip++;
    } else {
      console.log(`fail (${result.error})`);
      fail++;
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`\nDone. ${ok} ok, ${skip} skipped, ${fail} failed.`);
  if (skip > 0 && !FORCE) {
    console.log("\nTo regenerate everything, run: npm run pregen:visuals -- --force");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
