import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import {
  Database,
  ShieldCheck,
  ExternalLink,
  UserCheck,
  Cookie,
  Mail,
} from "lucide-react";

export const metadata = {
  title: "Privacy Policy",
  description: "How ColorBook AI handles your data.",
};

interface Section {
  icon: React.ReactNode;
  title: string;
  body?: string;
  list?: string[];
  kind?: "collects" | "not-collects" | "info";
}

const SECTIONS: Section[] = [
  {
    icon: <Database className="w-5 h-5" />,
    title: "What we collect",
    kind: "collects",
    list: [
      "**Email address** — only if you sign up for the free pages PDF or a paid plan.",
      "**Generation prompts** — sent to Google Gemini to produce your images. We do not persistently store your prompts on our servers unless required for abuse prevention.",
      "**Anonymous usage analytics** — page views, feature usage (via Plausible). No personal data, no cookies.",
    ],
  },
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: "What we don't collect",
    kind: "not-collects",
    list: [
      "We do not sell your data, ever.",
      "We do not train any AI model on your prompts or images.",
      "We do not use third-party ad trackers or fingerprinters.",
    ],
  },
  {
    icon: <ExternalLink className="w-5 h-5" />,
    title: "Third parties",
    body: "Your data may transit through these services:",
    list: [
      "**Google Gemini** — processes your prompts to generate images. Governed by Google's API terms.",
      "**Resend** — sends transactional emails (welcome, free PDF, receipts).",
      "**Lemon Squeezy** — processes payments. Merchant of record; handles tax compliance.",
      "**Vercel** — hosts the site.",
    ],
  },
  {
    icon: <UserCheck className="w-5 h-5" />,
    title: "Your rights",
    body: "You can request deletion of your data at any time by emailing hello@colorbook.ai. Under GDPR and India's DPDP Act you also have the right to access and correct your data.",
  },
  {
    icon: <Cookie className="w-5 h-5" />,
    title: "Cookies",
    body: "We use no tracking cookies. A single authentication cookie is set if you sign in to a paid plan (once that feature ships).",
  },
  {
    icon: <Mail className="w-5 h-5" />,
    title: "Contact",
    body: "Privacy questions? Email privacy@colorbook.ai.",
  },
];

function renderInline(text: string) {
  // Simple **bold** support
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="text-white font-semibold">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-28 pb-20 bg-black">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 text-xs font-medium text-violet-300 mb-5 backdrop-blur">
              Legal
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-white">
              Privacy <span className="gradient-text">Policy</span>
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
              <strong className="text-amber-300">Draft notice:</strong> This
              policy is a placeholder describing our data practices. Before
              commercial launch, have a lawyer review and ensure compliance with
              GDPR, India's DPDP Act 2023, and any other relevant regulations.
            </p>
          </div>

          <div className="space-y-4">
            {SECTIONS.map((s, i) => (
              <section
                key={s.title}
                className="rounded-2xl p-6 md:p-7 bg-zinc-900/60 backdrop-blur-xl border border-white/10 hover:border-violet-500/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${
                      s.kind === "not-collects"
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                        : "bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border-violet-500/30 text-violet-300"
                    }`}
                  >
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
                    {s.body && (
                      <p className="text-neutral-300 leading-relaxed mb-3">{s.body}</p>
                    )}
                    {s.list && (
                      <ul className="space-y-2">
                        {s.list.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 text-neutral-300 leading-relaxed"
                          >
                            <span
                              className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${
                                s.kind === "not-collects"
                                  ? "bg-emerald-400"
                                  : "bg-violet-400"
                              }`}
                            />
                            <span>{renderInline(item)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 text-center text-sm text-neutral-500">
            Have a question?{" "}
            <a
              href="/contact"
              className="text-violet-300 hover:text-violet-200 font-medium"
            >
              Contact us
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
