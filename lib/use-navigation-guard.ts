"use client";

import { useEffect, useRef } from "react";

/**
 * Block navigation while a long-running task is in progress (e.g. bulk-book
 * generation). Three exits are guarded:
 *   1. Tab close / refresh / external URL — `beforeunload` triggers the
 *      browser's native confirmation dialog. We can opt-in but cannot
 *      customize the message text (browser security policy).
 *   2. Browser Back / Forward — we push a sentinel history state on enable
 *      and intercept `popstate`; the user-supplied confirmer decides
 *      whether to actually go back.
 *   3. In-app link clicks (`<a href>` inside the same origin) — a
 *      capture-phase click handler intercepts and routes the decision
 *      through the same confirmer.
 *
 * @param active        when true, the guard is armed.
 * @param confirm       async fn returning true to proceed, false to cancel.
 *                      typically wired to the app's `useDialog().confirm`.
 */
export function useNavigationGuard(
  active: boolean,
  confirm: () => Promise<boolean>,
): void {
  // Keep the latest confirm in a ref so listeners always see the freshest
  // closure without re-binding when the parent re-renders.
  const confirmRef = useRef(confirm);
  confirmRef.current = confirm;

  useEffect(() => {
    if (!active) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore the message but require returnValue to be set.
      e.returnValue = "";
      return "";
    };

    // Push a sentinel state so the first Back press lands here, giving us
    // a chance to ask before the actual navigation. If the user confirms
    // we call history.back() ourselves.
    const sentinel = { __navGuard: true };
    window.history.pushState(sentinel, "");

    const onPopState = async () => {
      // Re-push immediately so a confirm-cancel doesn't accidentally
      // leave the user on the wrong history entry.
      window.history.pushState(sentinel, "");
      const ok = await confirmRef.current();
      if (ok) {
        // Pop the sentinel and the previous entry so the user actually
        // leaves the page.
        window.removeEventListener("popstate", onPopState);
        window.history.go(-2);
      }
    };

    const onLinkClick = async (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (anchor.target === "_blank") return;
      if (href.startsWith("#")) return;
      // Skip download links — these trigger a file save, not a navigation,
      // and intercepting them would silently break PNG / PDF / ZIP exports.
      if (anchor.hasAttribute("download")) return;
      // Skip non-http(s) schemes — data:, blob:, mailto:, tel:, etc. These
      // are file actions or external app handoffs, never page leaves.
      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.protocol !== "http:" && url.protocol !== "https:") return;
        // Same pathname = staying on this page (query string / hash changes
        // are within-page state changes like tab toggles, card switches,
        // sort orders — not real navigation away from the work).
        const isSamePath =
          url.origin === window.location.origin &&
          url.pathname === window.location.pathname;
        if (isSamePath) return;
      } catch {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const ok = await confirmRef.current();
      if (ok) {
        window.removeEventListener("click", onLinkClick, true);
        window.location.href = anchor.href;
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("click", onLinkClick, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("click", onLinkClick, true);
    };
  }, [active]);
}
