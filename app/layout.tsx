import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { buildOrganization, buildWebSite } from "@/lib/seo-schema";
import { DialogProvider } from "@/components/ui/confirm-dialog";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://crayonsparks.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "CrayonSparks — Generate Coloring Books in Minutes",
    template: "%s · CrayonSparks",
  },
  description:
    "AI-powered coloring book generator for Amazon KDP creators. Pick a theme, generate 20 kid-friendly pages, publish & earn. Built for parents, teachers, and KDP sellers.",
  keywords: [
    "AI coloring book generator",
    "Amazon KDP coloring book",
    "kids coloring pages",
    "Gemini Nano Banana",
    "coloring book AI",
    "Prabakaran",
  ],
  authors: [{ name: "Prabakaran" }],
  openGraph: {
    title: "CrayonSparks — Generate Coloring Books in Minutes",
    description:
      "Pick a theme, generate 20 kid-friendly pages, publish & earn on Amazon KDP.",
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "CrayonSparks",
  },
  twitter: {
    card: "summary_large_image",
    title: "CrayonSparks — Generate Coloring Books in Minutes",
    description:
      "Pick a theme, generate 20 kid-friendly pages, publish & earn on Amazon KDP.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${jakarta.variable} ${spaceGrotesk.variable} ${jetbrains.variable} h-full antialiased`}
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full flex flex-col bg-black text-white font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildOrganization()),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildWebSite()),
          }}
        />
        <DialogProvider>{children}</DialogProvider>
      </body>
    </html>
  );
}
