"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Download, Loader2, CheckCircle2, XCircle } from "lucide-react";

type Status = "idle" | "submitting" | "success" | "error";

export function LeadCaptureForm({ categorySlug }: { categorySlug: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/leads/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), categorySlug, source: "free-page" }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Subscription failed");
      setStatus("success");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <div className="rounded-2xl p-6 md:p-8 bg-zinc-900/70 backdrop-blur-xl border border-white/10 shadow-xl">
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-2"
          >
            <div className="inline-flex w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 items-center justify-center mb-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="font-bold text-xl mb-1">Check your inbox</h3>
            <p className="text-sm text-neutral-400 max-w-md mx-auto">
              We sent your free pages to <strong className="text-neutral-200">{email}</strong>.
              If it doesn&apos;t arrive in 2 minutes, check your spam folder.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col sm:flex-row gap-3"
            onSubmit={onSubmit}
          >
            <div className="flex-1 relative">
              <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@example.com"
                disabled={status === "submitting"}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-black/50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              disabled={status === "submitting" || !email.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-400 hover:shadow-lg hover:shadow-violet-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {status === "submitting" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Get Free PDF
            </button>
          </motion.form>
        )}
      </AnimatePresence>
      {status === "error" && error && (
        <div className="mt-3 flex items-start gap-2 text-sm text-red-300">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {status !== "success" && (
        <p className="mt-3 text-[11px] text-neutral-500 text-center">
          No spam. One email with the PDF, plus tips for coloring with kids.
          Unsubscribe anytime.
        </p>
      )}
    </div>
  );
}
