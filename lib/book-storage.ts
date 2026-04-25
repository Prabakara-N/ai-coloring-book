"use client";

/**
 * Tiny sessionStorage-backed persistence for in-progress books.
 *
 * Saves plan + page items + cover so a refresh doesn't lose generated work.
 * Browser sessionStorage caps at ~5MB per origin — for a 20-page book of
 * ~500KB-1MB PNGs we may exceed that. Strategy: try full save first; on
 * QuotaExceededError, fall back to a metadata-only save (drop dataUrls so
 * at least the plan + which-pages-were-done state survives).
 *
 * Use `useBookSession(key)` to wire any state shape into the lifecycle.
 */

import { useEffect, useRef, useState } from "react";

const PREFIX = "crayonsparks.book-session.v1.";

interface SessionState<T> {
  state: T;
  savedAt: number;
}

function safeStringify<T>(value: T): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.name === "QuotaExceededError" ||
    err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    /quota/i.test(err.message)
  );
}

/** Strip large dataUrl strings from a state shape so we can still save metadata. */
function stripDataUrls<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => {
      if (typeof v === "string" && v.startsWith("data:") && v.length > 1024) {
        return undefined;
      }
      return v;
    }),
  );
}

export function readSession<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionState<T>;
    return parsed.state;
  } catch {
    return null;
  }
}

export function writeSession<T>(key: string, state: T): "ok" | "metadata-only" | "failed" {
  if (typeof window === "undefined") return "failed";
  const fullPayload = safeStringify({ state, savedAt: Date.now() });
  if (!fullPayload) return "failed";

  try {
    window.sessionStorage.setItem(PREFIX + key, fullPayload);
    return "ok";
  } catch (err) {
    if (!isQuotaError(err)) return "failed";
    // Fallback: drop dataUrls and try again
    const slim = stripDataUrls(state);
    const slimPayload = safeStringify({ state: slim, savedAt: Date.now() });
    if (!slimPayload) return "failed";
    try {
      window.sessionStorage.setItem(PREFIX + key, slimPayload);
      return "metadata-only";
    } catch {
      return "failed";
    }
  }
}

export function clearSession(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

/**
 * State + persistence in one hook. Reads from sessionStorage on mount;
 * debounces writes.
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
  debounceMs = 400,
): [T, (next: T | ((prev: T) => T)) => void, "ok" | "metadata-only" | "failed" | "idle"] {
  const [value, setValue] = useState<T>(initial);
  const [status, setStatus] = useState<
    "ok" | "metadata-only" | "failed" | "idle"
  >("idle");
  const hydratedRef = useRef(false);

  // Hydrate once from session
  useEffect(() => {
    const restored = readSession<T>(key);
    if (restored !== null) setValue(restored);
    hydratedRef.current = true;
  }, [key]);

  // Debounced save
  useEffect(() => {
    if (!hydratedRef.current) return;
    const t = setTimeout(() => {
      const result = writeSession(key, value);
      setStatus(result);
    }, debounceMs);
    return () => clearTimeout(t);
  }, [key, value, debounceMs]);

  return [value, setValue, status];
}
