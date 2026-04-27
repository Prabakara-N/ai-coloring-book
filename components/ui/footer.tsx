import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-black/50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-mark.svg"
                alt="CrayonSparks"
                width={32}
                height={32}
                className="w-8 h-8 rounded-lg shadow-lg shadow-violet-500/30"
              />
              <span className="font-bold text-lg tracking-tight">CrayonSparks</span>
            </Link>
            <p className="text-sm text-neutral-400 max-w-md leading-relaxed">
              The all-in-one AI coloring book studio for Amazon KDP creators. Pick
              a theme, generate kid-friendly pages with Gemini Nano Banana, publish
              and earn.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3 text-white">Product</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>
                <Link href="/generate" className="hover:text-violet-400">
                  Generator
                </Link>
              </li>
              <li>
                <Link href="/playground" className="hover:text-violet-400">
                  Playground
                </Link>
              </li>
              <li>
                <Link href="/playground?tab=chat-book" className="hover:text-violet-400">
                  Sparky AI
                </Link>
              </li>
              <li>
                <Link href="/playground?tab=bulk-book" className="hover:text-violet-400">
                  Bulk Book
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-violet-400">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-violet-400">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3 text-white">Resources</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>
                <Link href="/gallery" className="hover:text-violet-400">
                  Gallery
                </Link>
              </li>
              <li>
                <Link href="/free/farm-animals" className="hover:text-violet-400">
                  Free Pages
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-violet-400">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/blog/best-kdp-niches-2026" className="hover:text-violet-400">
                  Best KDP Niches 2026
                </Link>
              </li>
              <li>
                <Link href="/blog/publish-first-kdp-coloring-book-with-ai" className="hover:text-violet-400">
                  KDP Publishing Guide
                </Link>
              </li>
              <li>
                <Link href="/blog/pinterest-sales-engine-for-kdp-coloring-books" className="hover:text-violet-400">
                  Pinterest Sales Guide
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} CrayonSparks. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-violet-400">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-violet-400">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-violet-400">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
