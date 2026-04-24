"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Save, Trash2, BookPlus, Loader2 } from "lucide-react";
import {
  createCustomCategoryFromRaw,
  updateCustomCategory,
  deleteCustomCategory,
  promptsToRaw,
  type CustomCategory,
} from "@/lib/custom-categories";

const EMOJI_CHOICES = [
  "📚",
  "🎨",
  "🚀",
  "🧸",
  "🦄",
  "🦖",
  "🐶",
  "🐱",
  "🦋",
  "🌸",
  "🚗",
  "🏰",
  "🌈",
  "🎃",
  "🎄",
  "🎂",
  "🍎",
  "⭐",
  "🏝️",
  "🐠",
];

export function CreateBookModal({
  open,
  onClose,
  editing,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  editing?: CustomCategory;
  onSaved: (slug: string) => void;
  onDeleted?: (slug: string) => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📚");
  const [coverScene, setCoverScene] = useState("");
  const [pageScene, setPageScene] = useState("");
  const [promptsRaw, setPromptsRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setIcon(editing.icon);
      setCoverScene(editing.coverScene);
      setPageScene(editing.scene);
      setPromptsRaw(promptsToRaw(editing.prompts));
    } else {
      setName("");
      setIcon("📚");
      setCoverScene("");
      setPageScene("");
      setPromptsRaw("");
    }
    setError(null);
  }, [open, editing]);

  const promptCount = promptsRaw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#")).length;

  const handleSave = () => {
    setError(null);
    setSaving(true);
    try {
      if (editing) {
        const updated = updateCustomCategory(editing.slug, {
          name,
          icon,
          coverScene,
          scene: pageScene,
          promptsRaw,
        });
        if (updated) onSaved(updated.slug);
      } else {
        const created = createCustomCategoryFromRaw({
          name,
          icon,
          coverScene,
          scene: pageScene,
          promptsRaw,
        });
        onSaved(created.slug);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editing) return;
    if (!confirm(`Delete "${editing.name}"? This cannot be undone.`)) return;
    deleteCustomCategory(editing.slug);
    onDeleted?.(editing.slug);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl shadow-violet-500/20"
          >
            <div className="p-6 md:p-8 border-b border-white/10 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-violet-500/15 to-cyan-500/15 border border-violet-500/30 text-[11px] font-medium text-violet-300 mb-2">
                  <BookPlus className="w-3 h-3" />
                  {editing ? "Edit book" : "Create your own book"}
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight">
                  {editing ? editing.name : "New custom book"}
                </h2>
                <p className="text-sm text-neutral-400 mt-1">
                  Paste your own list of prompts. We&apos;ll wrap each one in the
                  coloring-book formula and generate.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-5">
              <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
                <label className="block">
                  <span className="block text-sm font-medium text-neutral-200 mb-2">
                    Book name <span className="text-violet-400">*</span>
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Space Adventures"
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-black/50 text-white text-sm focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-neutral-200 mb-2">
                    Icon
                  </span>
                  <div className="relative">
                    <button
                      type="button"
                      className="w-14 h-11 rounded-xl border border-white/10 bg-black/50 text-2xl flex items-center justify-center"
                      title="Icon"
                    >
                      {icon}
                    </button>
                  </div>
                </label>
              </div>
              <div className="flex flex-wrap gap-1">
                {EMOJI_CHOICES.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setIcon(e)}
                    className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-colors ${
                      icon === e
                        ? "bg-violet-500/20 border border-violet-500/50"
                        : "hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>

              <label className="block">
                <span className="block text-sm font-medium text-neutral-200 mb-2">
                  Cover scene{" "}
                  <span className="text-xs font-normal text-neutral-500">
                    (what the cover shows)
                  </span>
                </span>
                <textarea
                  value={coverScene}
                  onChange={(e) => setCoverScene(e.target.value)}
                  placeholder="e.g. a happy astronaut, a smiling rocket, and a friendly alien waving together on a colorful planet"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-black/50 text-white text-sm focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 resize-y"
                />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-neutral-200 mb-2">
                  Page scene backdrop{" "}
                  <span className="text-xs font-normal text-neutral-500">
                    (optional — the background every page shares)
                  </span>
                </span>
                <textarea
                  value={pageScene}
                  onChange={(e) => setPageScene(e.target.value)}
                  placeholder="e.g. outer space with stars, planets, and swirling galaxies"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-black/50 text-white text-sm focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 resize-y"
                />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-neutral-200 mb-2 flex items-center justify-between">
                  <span>
                    Your prompts <span className="text-violet-400">*</span>
                    <span className="ml-2 text-xs font-normal text-neutral-500">
                      one per line · supports <code className="font-mono">Name: subject</code>
                    </span>
                  </span>
                  <span className="text-xs text-violet-300 font-mono">
                    {promptCount} detected
                  </span>
                </span>
                <textarea
                  value={promptsRaw}
                  onChange={(e) => setPromptsRaw(e.target.value)}
                  placeholder={`Astronaut: happy astronaut floating in space
Rocket: cartoon rocket blasting off
Alien: friendly alien waving
Planet: smiling planet with rings
...`}
                  rows={10}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/50 text-white text-sm font-mono focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 resize-y min-h-[180px]"
                />
                <p className="mt-2 text-[11px] text-neutral-500">
                  Tip: start lines with <code>#</code> to leave comments. The 280
                  curated prompts from{" "}
                  <code className="font-mono text-violet-300">
                    Coloring_Book_Prompts_Kids.pdf
                  </code>{" "}
                  paste directly.
                </p>
              </label>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-300">
                  <X className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="p-6 md:p-8 border-t border-white/10 flex flex-wrap items-center gap-3">
              {editing && (
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
              <div className="ml-auto flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim() || promptCount === 0}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-400 shadow-lg shadow-violet-500/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editing ? "Save changes" : "Create book"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
