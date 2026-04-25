/**
 * JSON-LD schema builders for SEO, GEO (AI search), and AEO (answer engines).
 *
 * Embed via:
 *   <script type="application/ld+json"
 *     dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganization()) }} />
 *
 * Or use the <JsonLd> helper component from this file.
 */

export const SITE = {
  name: "CrayonSparks",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://crayonsparks.com",
  description:
    "AI coloring book generator for Amazon KDP creators. Pick a theme, generate 20 kid-friendly pages with Gemini Nano Banana, publish and earn.",
  tagline: "AI coloring book studio for KDP creators",
  founder: "Prabakaran",
  inceptionYear: 2026,
} as const;

const logoUrl = `${SITE.url}/logo-mark.svg`;
const ogImage = `${SITE.url}/opengraph-image`;

// ---------- Organization (sitewide) ----------
export function buildOrganization() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    url: SITE.url,
    logo: {
      "@type": "ImageObject",
      url: logoUrl,
      width: 64,
      height: 64,
    },
    description: SITE.description,
    foundingDate: `${SITE.inceptionYear}`,
    founder: {
      "@type": "Person",
      name: SITE.founder,
    },
    sameAs: [] as string[],
  };
}

// ---------- WebSite (sitewide, with optional SearchAction) ----------
export function buildWebSite() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    publisher: { "@id": `${SITE.url}/#organization` },
    inLanguage: "en",
  };
}

// ---------- SoftwareApplication (homepage) ----------
export interface SoftwareOffer {
  name: string;
  price: string; // numeric string e.g. "9.99" or "0"
  priceCurrency?: string;
  description?: string;
}

export function buildSoftwareApplication(offers: SoftwareOffer[]) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE.url}/#software`,
    name: SITE.name,
    description: SITE.description,
    applicationCategory: "DesignApplication",
    applicationSubCategory: "AI Coloring Book Generator",
    operatingSystem: "Web",
    url: SITE.url,
    image: ogImage,
    publisher: { "@id": `${SITE.url}/#organization` },
    offers: offers.map((o) => ({
      "@type": "Offer",
      name: o.name,
      price: o.price,
      priceCurrency: o.priceCurrency ?? "USD",
      description: o.description,
      availability: "https://schema.org/InStock",
    })),
    featureList: [
      "AI coloring page generation",
      "KDP-ready PDF export (8.5x11, 300 DPI)",
      "Pinterest auto-publishing",
      "280 curated prompts across 14 themes",
      "Multi-marketplace publishing (Amazon KDP, Etsy, Gumroad)",
    ],
  };
}

// ---------- Article (blog post) ----------
export interface ArticleInput {
  title: string;
  description: string;
  slug: string;
  datePublished: string; // ISO
  dateModified?: string; // ISO
  author?: string;
  imageUrl?: string;
  tags?: string[];
}

export function buildArticle(a: ArticleInput) {
  const url = `${SITE.url}/blog/${a.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: a.title,
    description: a.description,
    url,
    datePublished: a.datePublished,
    dateModified: a.dateModified ?? a.datePublished,
    inLanguage: "en",
    image: a.imageUrl
      ? a.imageUrl.startsWith("http")
        ? a.imageUrl
        : `${SITE.url}${a.imageUrl}`
      : ogImage,
    author: {
      "@type": "Person",
      name: a.author ?? SITE.founder,
    },
    publisher: { "@id": `${SITE.url}/#organization` },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    keywords: a.tags?.join(", "),
  };
}

// ---------- BreadcrumbList ----------
export function buildBreadcrumb(
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE.url}${it.path}`,
    })),
  };
}

// ---------- FAQPage ----------
export interface FaqEntry {
  q: string;
  a: string;
}

export function buildFaqPage(faqs: FaqEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
}

// ---------- HowTo ----------
export interface HowToStep {
  name: string;
  text: string;
  url?: string; // anchor link to that section
}

export interface HowToInput {
  name: string;
  description: string;
  totalTime?: string; // ISO 8601 duration, e.g. "PT24H"
  estimatedCost?: { value: string; currency?: string };
  tools?: string[];
  steps: HowToStep[];
  imageUrl?: string;
}

export function buildHowTo(h: HowToInput) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: h.name,
    description: h.description,
    totalTime: h.totalTime,
    estimatedCost: h.estimatedCost
      ? {
          "@type": "MonetaryAmount",
          value: h.estimatedCost.value,
          currency: h.estimatedCost.currency ?? "USD",
        }
      : undefined,
    tool: h.tools?.map((t) => ({
      "@type": "HowToTool",
      name: t,
    })),
    step: h.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
      url: s.url,
    })),
    image: h.imageUrl
      ? h.imageUrl.startsWith("http")
        ? h.imageUrl
        : `${SITE.url}${h.imageUrl}`
      : ogImage,
  };
}
