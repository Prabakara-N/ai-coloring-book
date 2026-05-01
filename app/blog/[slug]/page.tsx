import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { getAllPosts, getPost, markdownToHtml } from "@/lib/blog";
import { visualForTags } from "@/lib/blog-visuals";
import { ArrowLeft, Calendar, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildArticle,
  buildBreadcrumb,
  buildHowTo,
} from "@/lib/seo-schema";

const HOW_TO_BY_SLUG: Record<
  string,
  Parameters<typeof buildHowTo>[0]
> = {
  "publish-first-kdp-coloring-book-with-ai": {
    name: "How to publish your first Amazon KDP coloring book with AI",
    description:
      "Step-by-step playbook to go from niche pick to a live Amazon KDP listing in 24 hours, using CrayonSparks + Gemini Nano Banana.",
    totalTime: "PT24H",
    estimatedCost: { value: "5", currency: "USD" },
    tools: [
      "CrayonSparks generator",
      "Gemini API key",
      "Amazon KDP account",
      "Canva (or KDP Cover Creator)",
    ],
    steps: [
      {
        name: "Pick a niche that already sells",
        text: "Search 'coloring book kids ages 3-6' on Amazon. Note the top 10 themes (farm animals, unicorns, dinosaurs, vehicles). Cross-check Pinterest pin saves >1,000.",
      },
      {
        name: "Generate 20 pages",
        text: "Open /playground, pick your category, click Generate All 20. Three parallel workers hit Gemini Nano Banana. Watch for stray shading, off-subject drift, weird anatomy — regenerate any outliers.",
      },
      {
        name: "Assemble the KDP-ready PDF",
        text: "Click KDP PDF in the generator. CrayonSparks builds an 8.5x11 inch interior PDF at 300 DPI with alternating blank pages and KDP-spec margins (0.25 inch outer, 0.375 inch gutter for books under 150 pages).",
      },
      {
        name: "Design a cover",
        text: "Use Canva or KDP Cover Creator. Title format: '[Theme] Coloring Book for Kids Ages 3-6: 20 Big & Simple Drawings | Single-Sided Pages'. Bright flat colors, large title, 2-3 cartoon characters.",
      },
      {
        name: "Upload and publish on Amazon KDP",
        text: "In KDP: paste SEO title, use the description template from /gallery, tick 'Not Low Content'. Upload interior.pdf and cover.pdf, preview, set price ($6.99 US start), enable expanded distribution. Approval takes 24-72 hours.",
      },
      {
        name: "Seed traffic on day 1",
        text: "Don't wait for Amazon's algorithm. Post to 3-5 Pinterest boards, send to your email list, share in 1-2 relevant Facebook groups (homeschool, Montessori), ask 3 friends to review after buying. This first burst signals demand.",
      },
    ],
  },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.frontmatter.title,
    description: post.frontmatter.description,
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      type: "article",
      publishedTime: post.frontmatter.date,
      images: post.frontmatter.coverImage ? [post.frontmatter.coverImage] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const html = markdownToHtml(post.content);
  const v = visualForTags(post.frontmatter.tags);
  const cover = post.frontmatter.coverImage;

  const articleSchema = buildArticle({
    title: post.frontmatter.title,
    description: post.frontmatter.description,
    slug: post.slug,
    datePublished: post.frontmatter.date,
    author: post.frontmatter.author,
    imageUrl: post.frontmatter.coverImage,
    tags: post.frontmatter.tags,
  });

  const breadcrumbSchema = buildBreadcrumb([
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: post.frontmatter.title, path: `/blog/${post.slug}` },
  ]);

  const howToInput = HOW_TO_BY_SLUG[slug];
  const howToSchema = howToInput
    ? buildHowTo({
        ...howToInput,
        imageUrl: post.frontmatter.coverImage ?? howToInput.imageUrl,
      })
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {howToSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
        />
      )}
      <Navbar />
      <main className="flex-1 pt-20 pb-16 bg-black">
        {/* Banner hero */}
        <section className="relative overflow-hidden mb-12">
          <div className="relative aspect-[21/9] md:aspect-[21/8] w-full overflow-hidden">
            {cover ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cover}
                  alt={post.frontmatter.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-black/30" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.25),transparent_60%)]" />
              </>
            ) : (
              <div className={cn("absolute inset-0 bg-linear-to-br", v.gradient)}>
                <div className="absolute inset-0 opacity-25 grid-pattern" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(0,0,0,0.6),transparent_60%)]" />
                <div className="absolute inset-0 pointer-events-none">
                  {v.floaters.map((e, i) => {
                    const positions = [
                      { left: "8%", top: "25%" },
                      { left: "88%", top: "30%" },
                      { left: "20%", top: "70%" },
                      { left: "82%", top: "65%" },
                      { left: "52%", top: "15%" },
                    ];
                    const pos = positions[i % positions.length];
                    return (
                      <div
                        key={i}
                        className="absolute text-4xl md:text-6xl opacity-50"
                        style={pos}
                      >
                        {e}
                      </div>
                    );
                  })}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white/90 flex items-center justify-center text-6xl md:text-7xl shadow-2xl">
                    {v.emoji}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Header content below banner */}
        <section className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 md:-mt-24 mb-12">
          <div className="rounded-3xl p-6 md:p-10 bg-zinc-900/80 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-violet-300 mb-5 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to blog
            </Link>

            <div className="flex flex-wrap gap-2 mb-4">
              {(post.frontmatter.tags ?? []).map((t) => (
                <span
                  key={t}
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10",
                    v.accent
                  )}
                >
                  {t}
                </span>
              ))}
            </div>

            <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight leading-tight text-white">
              {post.frontmatter.title}
            </h1>
            <p className="mt-4 text-base md:text-lg text-neutral-300 leading-relaxed">
              {post.frontmatter.description}
            </p>
            <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-5 text-sm text-neutral-400">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(post.frontmatter.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              {post.frontmatter.readingTime && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {post.frontmatter.readingTime}
                </span>
              )}
              {post.frontmatter.author && (
                <span className="ml-auto text-neutral-300 font-medium">
                  by {post.frontmatter.author}
                </span>
              )}
            </div>
          </div>
        </section>

        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="blog-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <div className="mt-16 rounded-3xl p-6 md:p-8 bg-linear-to-br from-violet-500 via-indigo-400 to-cyan-400 text-white text-center overflow-hidden relative shadow-2xl shadow-violet-500/40">
            <div className="absolute inset-0 opacity-20 grid-pattern" />
            <div className="relative">
              <h3 className="font-display text-xl md:text-2xl font-bold mb-2">
                Ready to ship your own book?
              </h3>
              <p className="text-white/90 mb-4 text-sm max-w-md mx-auto">
                Try the AI generator free — bring your Gemini API key, pick a theme,
                get 20 pages in minutes.
              </p>
              <Link
                href="/playground"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-white text-violet-700 hover:bg-violet-50 shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                Open the playground
              </Link>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
