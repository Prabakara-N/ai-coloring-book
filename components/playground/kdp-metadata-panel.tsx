"use client";

import { useState } from "react";
import {
  Sparkles,
  RefreshCw,
  Loader2,
  Copy,
  Check,
  FileDown,
  Tag,
  ListTree,
  DollarSign,
} from "lucide-react";
import type { KdpMetadata } from "@/lib/kdp-metadata";
import { buildKdpPackagePdf } from "@/lib/kdp-package-pdf";
import { DescriptionWithToggle } from "./description-with-toggle";

export type MetadataProvider = "gemini" | "hybrid";

interface KdpMetadataPanelProps {
  bookName: string;
  pageCount: number;
  metadata: KdpMetadata | null;
  loading: boolean;
  error: string | null;
  provider: MetadataProvider;
  onProviderChange: (p: MetadataProvider) => void;
  onGenerate: () => void;
}

export function KdpMetadataPanel({
  bookName,
  pageCount,
  metadata,
  loading,
  error,
  provider,
  onProviderChange,
  onGenerate,
}: KdpMetadataPanelProps) {
  return (
    <div className="rounded-3xl p-5 md:p-6 bg-zinc-900/60 backdrop-blur-xl border border-white/10 space-y-4">
      <div className="flex items-center gap-2.5 mb-2 flex-wrap">
        <Sparkles className="w-4 h-4 text-violet-400" />
        <h3 className="font-semibold text-sm">KDP Metadata & SEO</h3>
        <span className="text-[11px] text-neutral-500">
          AI-generated · ready to paste into Amazon KDP
        </span>
        <div className="ml-auto flex items-center gap-2">
          <ProviderToggle value={provider} onChange={onProviderChange} />
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-violet-500 to-cyan-400 text-white shadow disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : metadata ? (
              <RefreshCw className="w-3.5 h-3.5" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {metadata ? "Regenerate" : "Generate metadata"}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-300 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {!metadata && !loading && !error && (
        <p className="text-xs text-neutral-500 leading-relaxed">
          Click <strong>Generate KDP metadata</strong> to produce an
          SEO-optimized title, subtitle, description, 7 backend keywords, and 2
          suggested categories — ready to paste into the Amazon KDP submission
          form.
        </p>
      )}

      {metadata && (
        <>
          <MetadataField label="SEO Title (≤200 chars)" value={metadata.title} mono />
          {metadata.subtitle && (
            <MetadataField label="Subtitle" value={metadata.subtitle} />
          )}
          <DescriptionWithToggle
            title={metadata.title || bookName}
            plain={metadata.descriptionText}
            html={metadata.descriptionHtml}
          />

          <div>
            <FieldLabel
              icon={<Tag className="w-3 h-3" />}
              text="7 Backend Keywords"
            />
            <div className="grid sm:grid-cols-2 gap-1.5">
              {metadata.keywords.map((kw, i) => (
                <KeywordChip key={i} index={i + 1} value={kw} />
              ))}
            </div>
          </div>

          <div>
            <FieldLabel
              icon={<ListTree className="w-3 h-3" />}
              text="Suggested KDP Categories"
            />
            <div className="space-y-1.5">
              {metadata.categories.map((cat, i) => (
                <KeywordChip key={i} index={i + 1} value={cat} />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-neutral-300">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">
              Suggested price: ${metadata.suggestedPriceUsd}
            </span>
            <span className="text-neutral-500">· {pageCount} pages</span>
          </div>

          {metadata.notes && (
            <p className="text-[11px] text-amber-200/80 italic">
              ✦ {metadata.notes}
            </p>
          )}

          <div className="pt-3 border-t border-white/10 flex gap-2 flex-wrap">
            <DownloadPackageButton
              bookName={bookName}
              pageCount={pageCount}
              metadata={metadata}
            />
            <CopyAllButton metadata={metadata} />
          </div>
        </>
      )}
    </div>
  );
}

function ProviderToggle({
  value,
  onChange,
}: {
  value: MetadataProvider;
  onChange: (p: MetadataProvider) => void;
}) {
  return (
    <div
      role="tablist"
      className="inline-flex p-0.5 rounded-lg bg-black/40 border border-white/10 text-[11px]"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "gemini"}
        onClick={() => onChange("gemini")}
        title="Gemini 2.5 Flash — fast and cheap (~2s, $0.0005)"
        className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
          value === "gemini"
            ? "bg-gradient-to-r from-violet-500 to-cyan-400 text-white"
            : "text-neutral-300 hover:bg-white/5"
        }`}
      >
        ⚡ Fast (Gemini)
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "hybrid"}
        onClick={() => onChange("hybrid")}
        title="Perplexity (live Amazon) + OpenAI — best accuracy (~10s, ~$0.012)"
        className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
          value === "hybrid"
            ? "bg-gradient-to-r from-violet-500 to-cyan-400 text-white"
            : "text-neutral-300 hover:bg-white/5"
        }`}
      >
        🎯 Best (Perplexity + OpenAI)
      </button>
    </div>
  );
}

function FieldLabel({
  icon,
  text,
}: {
  icon?: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      {icon}
      <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
        {text}
      </span>
    </div>
  );
}

function MetadataField({
  label,
  value,
  multiline = false,
  mono = false,
  collapsible = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  mono?: boolean;
  collapsible?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(!collapsible);
  const onCopy = () => {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
          {label}
        </span>
        {collapsible && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-[10px] text-neutral-500 hover:text-neutral-300"
          >
            {open ? "hide" : "show"}
          </button>
        )}
        <button
          type="button"
          onClick={onCopy}
          className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-neutral-400 hover:text-white hover:bg-white/5"
        >
          {copied ? (
            <Check className="w-3 h-3 text-emerald-400" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {open &&
        (multiline ? (
          <textarea
            readOnly
            value={value}
            // Plain-text description: bigger so the marketing copy is
            // actually readable. HTML description gets fewer rows since
            // tags add visual noise that doesn't need full reading height.
            rows={mono ? 8 : 12}
            className={`w-full px-3 py-2.5 rounded-lg bg-black/50 border border-white/10 text-sm leading-relaxed ${
              mono ? "font-mono text-xs" : ""
            } text-neutral-200 resize-y focus:outline-none min-h-[200px]`}
          />
        ) : (
          <input
            readOnly
            value={value}
            className={`w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-xs ${
              mono ? "font-mono" : ""
            } text-neutral-200 focus:outline-none`}
          />
        ))}
    </div>
  );
}

function KeywordChip({ index, value }: { index: number; value: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-neutral-300 hover:bg-violet-500/10 hover:border-violet-500/30 transition-colors text-left"
    >
      <span className="text-violet-400 font-mono shrink-0">{index}.</span>
      <span className="flex-1 truncate">{value}</span>
      {copied ? (
        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
      ) : (
        <Copy className="w-3 h-3 text-neutral-500 shrink-0" />
      )}
    </button>
  );
}

function DownloadPackageButton({
  bookName,
  pageCount,
  metadata,
}: {
  bookName: string;
  pageCount: number;
  metadata: KdpMetadata;
}) {
  const [building, setBuilding] = useState(false);
  const onClick = async () => {
    setBuilding(true);
    try {
      const bytes = await buildKdpPackagePdf({
        bookName,
        pageCount,
        metadata,
      });
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${bookName.replace(/[^a-z0-9]+/gi, "_")}_KDP_package.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setBuilding(false);
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={building}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-black text-white hover:bg-neutral-800 disabled:opacity-60 shadow"
    >
      {building ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <FileDown className="w-3.5 h-3.5" />
      )}
      Download KDP package PDF
    </button>
  );
}

function CopyAllButton({ metadata }: { metadata: KdpMetadata }) {
  const [copied, setCopied] = useState(false);
  const onClick = () => {
    const text = [
      `TITLE\n${metadata.title}`,
      metadata.subtitle ? `\nSUBTITLE\n${metadata.subtitle}` : "",
      `\nDESCRIPTION\n${metadata.descriptionText}`,
      `\nKEYWORDS\n${metadata.keywords.map((k, i) => `${i + 1}. ${k}`).join("\n")}`,
      `\nCATEGORIES\n${metadata.categories.map((c, i) => `${i + 1}. ${c}`).join("\n")}`,
      `\nSUGGESTED PRICE\n$${metadata.suggestedPriceUsd}`,
    ]
      .filter(Boolean)
      .join("\n");
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-white/5 text-white border border-white/15 hover:bg-white/10"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? "Copied all" : "Copy all as text"}
    </button>
  );
}
