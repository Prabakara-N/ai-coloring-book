/* eslint-disable no-console */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs").promises;

const ROOT = __dirname;
const OUT_ROOT = path.join(ROOT, "..", "..", "public", "visuals");

const BLOGS = [
  { html: "blog-publish-first-kdp.html", out: "blog/publish-first-kdp-coloring-book-with-ai.png" },
  { html: "blog-pinterest-sales.html",   out: "blog/pinterest-sales-engine-for-kdp-coloring-books.png" },
  { html: "blog-consistent-style.html",  out: "blog/consistent-ai-coloring-book-style.png" },
  { html: "blog-best-niches.html",       out: "blog/best-kdp-niches-2026.png" },
  { html: "blog-low-vs-no-content.html", out: "blog/low-content-vs-no-content-kdp.png" },
];

const BENTO = [
  { html: "bento-themes.html",            out: "bento/themes.png" },
  { html: "bento-nano-banana.html",       out: "bento/nano-banana.png" },
  { html: "bento-kdp-pdf.html",           out: "bento/kdp-pdf.png" },
  { html: "bento-pinterest-engine.html",  out: "bento/pinterest-engine.png" },
  { html: "bento-marketplace.html",       out: "bento/marketplace.png" },
  { html: "bento-attribution.html",       out: "bento/attribution.png" },
  { html: "bento-batch.html",             out: "bento/batch.png" },
];

const FEATURES = [
  { html: "feature-generation.html",      out: "features/generation.png" },
  { html: "feature-kdp.html",             out: "features/kdp.png" },
  { html: "feature-pinterest.html",       out: "features/pinterest.png" },
  { html: "feature-marketplace.html",     out: "features/marketplace.png" },
  { html: "feature-analytics.html",       out: "features/analytics.png" },
];

// Blog banners: 16:9 at 1600x900 logical, 2x retina = 3200x1800 output
const BLOG_VIEWPORT = { width: 1600, height: 900 };
// Bento tiles: 4:3 at 800x600 logical, 2x retina = 1600x1200 output
const BENTO_VIEWPORT = { width: 800, height: 600 };
// Feature cards: 4:3 at 1200x900 logical, 2x retina = 2400x1800 output
const FEATURE_VIEWPORT = { width: 1200, height: 900 };

async function renderOne(browser, htmlFile, outFile, viewport) {
  const outPath = path.join(OUT_ROOT, outFile);
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const fileUrl = "file://" + path.join(ROOT, htmlFile);
  await page.goto(fileUrl, { waitUntil: "networkidle" });
  // Let webfonts paint
  await page.waitForTimeout(700);
  await page.screenshot({
    path: outPath,
    clip: { x: 0, y: 0, width: viewport.width, height: viewport.height },
  });
  await context.close();
  console.log("✓", outFile);
}

(async () => {
  const browser = await chromium.launch();
  console.log(`Rendering to: ${OUT_ROOT}\n`);

  console.log(`--- Blog banners (${BLOG_VIEWPORT.width}×${BLOG_VIEWPORT.height} @2x) ---`);
  for (const t of BLOGS) {
    await renderOne(browser, t.html, t.out, BLOG_VIEWPORT);
  }

  console.log(`\n--- Bento tiles (${BENTO_VIEWPORT.width}×${BENTO_VIEWPORT.height} @2x) ---`);
  for (const t of BENTO) {
    await renderOne(browser, t.html, t.out, BENTO_VIEWPORT);
  }

  console.log(`\n--- Feature cards (${FEATURE_VIEWPORT.width}×${FEATURE_VIEWPORT.height} @2x) ---`);
  for (const t of FEATURES) {
    await renderOne(browser, t.html, t.out, FEATURE_VIEWPORT);
  }

  await browser.close();
  console.log(
    `\nDone. Rendered ${BLOGS.length} blog banners + ${BENTO.length} bento tiles + ${FEATURES.length} feature cards.`
  );
})().catch((e) => { console.error(e); process.exit(1); });
