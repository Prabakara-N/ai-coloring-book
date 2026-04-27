import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import {
  CheckCircle2,
  Key,
  ShieldCheck,
  CreditCard,
  FileWarning,
  Mail,
  FileText,
  Ban,
} from "lucide-react";

export const metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of CrayonSparks.",
};

const SECTIONS = [
  {
    icon: <CheckCircle2 className="w-5 h-5" />,
    title: "Acceptance",
    body: "By accessing CrayonSparks (the “Service”) you agree to these terms. If you do not agree, do not use the Service.",
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: "What we do",
    body: "The Service lets you generate coloring-book line art using third-party AI models (currently Google Gemini). We also provide curated prompt libraries, KDP-ready file assembly, and related tooling.",
  },
  {
    icon: <Key className="w-5 h-5" />,
    title: "Your account & API keys",
    body: "The free tier requires you to bring your own Google Gemini API key. You are responsible for keeping your key secure and for all usage charges Google bills you.",
  },
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: "Ownership of generated content",
    body: "Subject to Google's Gemini terms of service, you own the images you generate through the Service and may use them commercially — including publishing on Amazon KDP, Etsy, Gumroad, or printing at home. We claim no copyright over your output.",
  },
  {
    icon: <Ban className="w-5 h-5" />,
    title: "Acceptable use",
    body: "You may not use the Service to generate content that is sexual, violent, hateful, or that depicts real people without consent. We reserve the right to suspend accounts that violate this policy.",
  },
  {
    icon: <CreditCard className="w-5 h-5" />,
    title: "Payments & refunds",
    body: "Paid plans are billed monthly via Lemon Squeezy, who acts as the merchant of record. We offer a 30-day refund on monthly plans — email us and we'll process it.",
  },
  {
    icon: <FileWarning className="w-5 h-5" />,
    title: "Disclaimer",
    body: "The Service is provided “as is”. AI output can be unpredictable — always review generated pages before publishing. We are not liable for any business losses arising from use of the Service.",
  },
  {
    icon: <Mail className="w-5 h-5" />,
    title: "Contact",
    body: "Questions? Email hello@crayonsparks.com.",
  },
];

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-28 pb-20 bg-black">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-linear-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 text-xs font-medium text-violet-300 mb-5 backdrop-blur">
              Legal
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-white">
              Terms of <span className="gradient-text">Service</span>
            </h1>
            <p className="mt-4 text-neutral-400">
              Last updated:{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="mb-10 p-5 md:p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-100 leading-relaxed">
            <p>
              <strong className="text-amber-300">Draft notice:</strong> These
              terms are a placeholder intended to clarify the spirit of use.
              Before commercial launch, have a lawyer review and replace this
              text with a final version tailored to your jurisdiction (India)
              and payment processor (Lemon Squeezy).
            </p>
          </div>

          <div className="space-y-4">
            {SECTIONS.map((s, i) => (
              <section
                key={s.title}
                className="group relative rounded-2xl p-6 md:p-7 bg-zinc-900/60 backdrop-blur-xl border border-white/10 hover:border-violet-500/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-linear-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
                    {s.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[11px] font-mono text-neutral-500">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h2 className="font-display text-xl md:text-2xl font-semibold text-white tracking-tight">
                        {s.title}
                      </h2>
                    </div>
                    <p className="text-neutral-300 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 text-center text-sm text-neutral-500">
            Have a question?{" "}
            <a href="/contact" className="text-violet-300 hover:text-violet-200 font-medium">
              Contact us
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
