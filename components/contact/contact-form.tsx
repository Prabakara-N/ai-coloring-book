"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, CheckCircle2, XCircle, Send } from "lucide-react";

type Status = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, honeypot }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to send");
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <AnimatePresence mode="wait">
      {status === "success" ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="rounded-3xl p-10 bg-zinc-900/70 backdrop-blur-xl border border-white/10 text-center"
        >
          <div className="inline-flex w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="font-display text-2xl font-bold text-white mb-2">
            Message sent
          </h3>
          <p className="text-neutral-400 max-w-md mx-auto">
            Thanks <strong className="text-white">{name.split(" ")[0]}</strong> —
            we&apos;ll get back to you at{" "}
            <strong className="text-white">{email}</strong> within a day or two.
          </p>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onSubmit={onSubmit}
          className="rounded-3xl p-6 md:p-8 bg-zinc-900/70 backdrop-blur-xl border border-white/10 space-y-5"
        >
          {/* Honeypot */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            className="absolute -left-[9999px] w-0 h-0 opacity-0"
            aria-hidden="true"
          />

          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Your name" required>
              <input
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prabakaran"
                className="field"
                disabled={status === "submitting"}
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="field"
                disabled={status === "submitting"}
              />
            </Field>
          </div>

          <Field label="Subject" hint="optional">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. KDP partnership, bug report, feature idea"
              className="field"
              disabled={status === "submitting"}
            />
          </Field>

          <Field label="Message" required>
            <textarea
              required
              minLength={5}
              maxLength={5000}
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what's on your mind…"
              className="field resize-y min-h-[140px]"
              disabled={status === "submitting"}
            />
            <p className="mt-1 text-right text-[11px] text-neutral-500 font-mono">
              {message.length}/5000
            </p>
          </Field>

          {status === "error" && error && (
            <div className="flex items-start gap-2 text-sm text-red-300">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-linear-to-r from-violet-500 via-indigo-400 to-cyan-400 shadow-lg shadow-violet-500/40 hover:shadow-xl hover:shadow-violet-500/60 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {status === "submitting" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {status === "submitting" ? "Sending…" : "Send message"}
          </button>

          <p className="text-[11px] text-center text-neutral-500">
            We aim to reply within 1-2 business days.
          </p>

          <style jsx>{`
            .field {
              width: 100%;
              padding: 0.75rem 1rem;
              background: rgba(0, 0, 0, 0.5);
              color: white;
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 0.75rem;
              font-size: 0.875rem;
              transition: border-color 0.15s, box-shadow 0.15s;
            }
            .field::placeholder {
              color: rgba(160, 160, 170, 0.5);
            }
            .field:focus {
              outline: none;
              border-color: rgba(139, 92, 246, 0.6);
              box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
            }
            .field:disabled {
              opacity: 0.6;
            }
          `}</style>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-neutral-200 mb-2">
        {label}
        {required && <span className="text-violet-400 ml-1">*</span>}
        {hint && (
          <span className="ml-2 text-xs text-neutral-500 font-normal">
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}
