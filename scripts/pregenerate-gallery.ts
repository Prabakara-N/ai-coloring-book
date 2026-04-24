/* eslint-disable no-console */
import { mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import { CATEGORIES, MASTER_PROMPT_TEMPLATE } from "../lib/prompts";

const OUT_ROOT = join(process.cwd(), "public", "gallery");
const MODEL_ID = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
const PER_CATEGORY = Number(process.env.PREGEN_PER_CATEGORY ?? 5);
const FORCE = process.argv.includes("--force");

async function exists(path: string) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
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
  let generated = 0;
  let skipped = 0;

  for (const cat of CATEGORIES) {
    const dir = join(OUT_ROOT, cat.slug);
    await mkdir(dir, { recursive: true });
    const picks = cat.prompts.slice(0, PER_CATEGORY);

    for (const p of picks) {
      const safeName = p.name.replace(/[^a-z0-9]+/gi, "_");
      const filename = `${p.id}_${safeName}.png`;
      const out = join(dir, filename);
      if (!FORCE && (await exists(out))) {
        skipped++;
        continue;
      }

      const prompt = MASTER_PROMPT_TEMPLATE(p.subject);
      process.stdout.write(`→ ${cat.slug}/${filename} … `);
      try {
        const response = await client.models.generateContent({
          model: MODEL_ID,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        const parts = response.candidates?.[0]?.content?.parts ?? [];
        let saved = false;
        for (const part of parts as { inlineData?: { mimeType?: string; data?: string } }[]) {
          const inline = part.inlineData;
          if (inline?.data) {
            await writeFile(out, Buffer.from(inline.data, "base64"));
            generated++;
            saved = true;
            console.log("ok");
            break;
          }
        }
        if (!saved) console.log("no image returned");
        await new Promise((r) => setTimeout(r, 400));
      } catch (e) {
        console.log(`fail (${e instanceof Error ? e.message : "unknown"})`);
      }
    }
  }

  console.log(`\nDone. Generated ${generated}, skipped ${skipped}.`);
  console.log(`Output: ${OUT_ROOT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
