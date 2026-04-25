import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Spotlight } from "@/components/ui/spotlight";
import { ContactForm } from "./contact-form";
import { Mail, MessageCircle, BookOpen, AtSign } from "lucide-react";

export const metadata = {
  title: "Contact — CrayonSparks",
  description:
    "Get in touch with the CrayonSparks team. Questions, bug reports, partnerships, or just to say hi.",
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-28 pb-20 bg-black relative overflow-hidden">
        <div className="absolute inset-0 -top-28 overflow-hidden pointer-events-none">
          <Spotlight className="-top-20 left-20" fill="#8b5cf6" />
          <div className="absolute inset-0 grid-pattern opacity-25" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,black_80%)]" />
        </div>

        <section className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 text-xs font-medium text-violet-300 mb-5 backdrop-blur">
              <MessageCircle className="w-3 h-3" />
              We usually reply within 24 hours
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-white">
              Let&apos;s <span className="gradient-text">talk</span>
            </h1>
            <p className="mt-4 text-neutral-400 max-w-2xl mx-auto text-base md:text-lg">
              Questions about the product, partnership ideas, bug reports, or
              just feedback — we read every message.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-6 items-start">
            <div className="lg:col-span-2 space-y-3">
              {[
                {
                  icon: <Mail className="w-5 h-5" />,
                  label: "Email us direct",
                  value: "hello@crayonsparks.com",
                  href: "mailto:hello@crayonsparks.com",
                },
                {
                  icon: <AtSign className="w-5 h-5" />,
                  label: "Twitter / X",
                  value: "@prabakaran",
                  href: "https://twitter.com",
                },
                {
                  icon: <BookOpen className="w-5 h-5" />,
                  label: "Docs & guides",
                  value: "Read the blog",
                  href: "/blog",
                },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/60 backdrop-blur border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all group"
                >
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
                      {item.label}
                    </p>
                    <p className="text-sm text-neutral-200 group-hover:text-white">
                      {item.value}
                    </p>
                  </div>
                </a>
              ))}
              <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20">
                <p className="text-xs uppercase tracking-wider text-violet-300 font-semibold mb-2">
                  Based in
                </p>
                <p className="font-display text-lg font-semibold text-white">
                  Tiruppur, Tamil Nadu
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  India · IST (UTC+5:30)
                </p>
              </div>
            </div>

            <div className="lg:col-span-3">
              <ContactForm />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
