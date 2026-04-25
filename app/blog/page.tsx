import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Spotlight } from "@/components/ui/spotlight";
import { getAllPosts } from "@/lib/blog";
import { BlogCard } from "./blog-card";

export const metadata = {
  title: "Blog — CrayonSparks",
  description:
    "Guides on AI coloring book generation, Amazon KDP publishing, Pinterest marketing, and scaling a self-publishing business.",
};

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <>
      <Navbar />
      <main className="flex-1 pt-28 pb-20 bg-black relative overflow-hidden">
        {/* Hero */}
        <section className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-14">
          <div className="absolute inset-0 -top-28 overflow-hidden pointer-events-none">
            <Spotlight className="-top-20 left-20" fill="#6366f1" />
            <div className="absolute inset-0 grid-pattern opacity-20" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,black_80%)]" />
          </div>
          <div className="relative text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 text-xs font-medium text-violet-300 mb-6 backdrop-blur">
              Guides & how-tos
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">
              The <span className="gradient-text">CrayonSparks</span> blog
            </h1>
            <p className="mt-4 text-neutral-400 max-w-2xl mx-auto">
              Playbooks for shipping coloring books, ranking on Amazon KDP, and
              turning Pinterest into a sales engine.
            </p>
          </div>
        </section>

        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {posts.length === 0 ? (
            <div className="text-center p-12 rounded-2xl border border-white/10 bg-zinc-900/60">
              <p className="text-neutral-400">
                No posts yet. Drop a markdown file in <code>/content/blog</code>.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((p, i) => (
                <BlogCard key={p.slug} post={p} index={i} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
