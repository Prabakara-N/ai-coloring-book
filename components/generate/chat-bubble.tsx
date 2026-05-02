"use client";

import { useState } from "react";
import { Loader2, Sparkles, GitBranch, Copy, Check, Pencil } from "lucide-react";
import { PageReferenceBadge } from "./page-reference-badge";

export interface UserBubbleProps {
  text: string;
  /** Optional reference image the user attached to this turn. */
  referenceDataUrl?: string;
  /**
   * When provided, an Edit button appears under the bubble that calls
   * this with the original text (so the parent can repopulate the
   * composer for re-send).
   */
  onEdit?: (text: string) => void;
}

export function UserBubble({ text, referenceDataUrl, onEdit }: UserBubbleProps) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }
  return (
    <div className="flex justify-end group">
      <div className="max-w-[88%] flex flex-col items-end gap-1.5">
        {referenceDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={referenceDataUrl}
            alt="Your reference"
            className="max-w-[160px] max-h-[160px] rounded-lg object-cover border border-white/10"
          />
        )}
        <div className="px-4 py-2.5 rounded-2xl rounded-br-md bg-linear-to-br from-violet-500 to-cyan-500 text-white text-[15px] leading-relaxed shadow whitespace-pre-wrap break-words">
          {text}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={copy}
            title="Copy"
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10"
            aria-label="Copy message"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(text)}
              title="Edit and re-send"
              className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10"
              aria-label="Edit message"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Three-dot typing indicator shown while we're WAITING for Sparky's reply.
 * Once we know whether the action will produce an image, we swap to either
 * just text (text-only reply) or text + ImageGeneratingFrame (refine).
 */
function TypingDots() {
  return (
    <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-zinc-800/80 border border-white/10 inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block w-1.5 h-1.5 rounded-full bg-violet-300 animate-bounce"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

/**
 * Animated skeleton shown while the new image is generating. Uses a soft
 * neutral shimmer (not a black box with a spinner) so the chat panel stays
 * visually calm — only the assistant bubble shows activity, not a giant
 * dark slab that visually screams.
 */
function ImageGeneratingFrame({ aspect = "aspect-3/4" }: { aspect?: string }) {
  return (
    <div
      className={`relative rounded-xl overflow-hidden border border-white/10 w-full max-w-[280px] ${aspect} bg-linear-to-br from-zinc-800/80 via-zinc-700/60 to-zinc-800/80 animate-pulse`}
      role="status"
      aria-label="Generating image"
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-neutral-400">
        <Loader2 className="w-4 h-4 animate-spin opacity-70" />
        <span className="text-[10px] font-medium tracking-wide">Drawing…</span>
      </div>
    </div>
  );
}

export interface AssistantBubbleProps {
  /** Sparky's text reply. Empty while still waiting. */
  reply: string;
  /** True between user-send and chat-reply arriving. Shows typing dots. */
  awaitingReply?: boolean;
  /** True between chat-reply (refine action) and image-generation completing. */
  generatingImage?: boolean;
  /** Result image (when the action was a refine). */
  imageDataUrl?: string;
  /** Labels for any references attached (other pages or user upload). */
  referenceLabels?: string[];
  /** Called when the user clicks "Branch from this version". */
  onBranch?: () => void;
}

export function AssistantBubble({
  reply,
  awaitingReply = false,
  generatingImage = false,
  imageDataUrl,
  referenceLabels,
  onBranch,
}: AssistantBubbleProps) {
  return (
    <div className="flex justify-start gap-2.5">
      <div className="w-8 h-8 shrink-0 rounded-full bg-linear-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-500/30">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="max-w-[88%] flex flex-col gap-2">
        {awaitingReply ? (
          <TypingDots />
        ) : (
          reply && (
            <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-zinc-800/80 border border-white/10 text-white text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {reply}
            </div>
          )
        )}
        {generatingImage && <ImageGeneratingFrame />}
        {imageDataUrl && !generatingImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageDataUrl}
            alt="Refined version"
            className="w-full max-w-[280px] h-auto block rounded-xl border border-white/10 bg-white"
          />
        )}
        {referenceLabels && referenceLabels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {referenceLabels.map((l) => (
              <PageReferenceBadge key={l} label={l} />
            ))}
          </div>
        )}
        {imageDataUrl && onBranch && (
          <button
            type="button"
            onClick={onBranch}
            className="self-start inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-neutral-400 hover:text-violet-300 hover:bg-violet-500/10 transition-colors"
          >
            <GitBranch className="w-3 h-3" />
            Use this as the source
          </button>
        )}
      </div>
    </div>
  );
}
