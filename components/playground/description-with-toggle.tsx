"use client";

import { useMemo, useState } from "react";
import { Copy, Check, FileText, Code } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildKdpHtmlDocument } from "@/lib/kdp-html-export";

interface DescriptionWithToggleProps {
  /** Book title — used as the &lt;h1&gt; in the full HTML document view. */
  title: string;
  /** Plain-text version of the description (for emails, copy paste). */
  plain: string;
  /** HTML body fragment (with &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;&lt;li&gt; tags). */
  html: string;
}

type Mode = "plain" | "html";

/**
 * Single textarea showing the KDP description with a [Plain | HTML] toggle.
 * In HTML mode, the textarea shows the FULL standalone HTML document
 * (DOCTYPE + head + body + styling) so the user can copy the entire code,
 * paste it into a .html file, and open it in any browser for preview.
 */
export function DescriptionWithToggle({
  title,
  plain,
  html,
}: DescriptionWithToggleProps) {
  const [mode, setMode] = useState<Mode>("plain");
  const [copied, setCopied] = useState(false);

  // The HTML mode shows the COMPLETE standalone HTML document, not just
  // the body fragment. User can copy-paste into a .html file and open
  // directly in any browser to preview the formatted listing.
  const fullHtmlDocument = useMemo(
    () => buildKdpHtmlDocument({ title, descriptionHtml: html }),
    [title, html],
  );

  const value = mode === "plain" ? plain : fullHtmlDocument;

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
          Description
        </p>

        <div className="flex items-center gap-2">
          <div
            role="tablist"
            aria-label="Description format"
            className="inline-flex p-0.5 rounded-md border border-white/10 bg-black/40"
          >
            <ToggleButton
              icon={<FileText className="w-3 h-3" />}
              label="Plain"
              active={mode === "plain"}
              onClick={() => setMode("plain")}
            />
            <ToggleButton
              icon={<Code className="w-3 h-3" />}
              label="HTML"
              active={mode === "html"}
              onClick={() => setMode("html")}
            />
          </div>

          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-300" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <textarea
        readOnly
        value={value}
        rows={mode === "html" ? 18 : 12}
        className={cn(
          "w-full px-3 py-2.5 rounded-lg bg-black/50 border border-white/10 text-sm leading-relaxed text-neutral-200 resize-y focus:outline-none min-h-[200px]",
          mode === "html" && "font-mono text-xs leading-snug",
        )}
      />

      <p className="mt-1 text-[10px] text-neutral-500">
        {mode === "plain"
          ? "Plain text — best for emails, social posts, and quick copy-paste."
          : "Full standalone HTML document (DOCTYPE + head + body + styles). Copy and paste into a .html file, then open in any browser to preview the formatted listing."}
      </p>
    </div>
  );
}

function ToggleButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors",
        active
          ? "bg-linear-to-r from-violet-500 to-cyan-400 text-white shadow"
          : "text-neutral-300 hover:text-white",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
