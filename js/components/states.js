
/**
 * KADAI — loading / empty / error / demo region renderers (§47–§49)
 * Every data region on every page uses these; no blank waits, no raw
 * Firebase errors in user-facing copy.
 */

import { escapeHtml } from "../core/dom.js";

/** Skeleton grid that preserves the final layout while loading. */
export function skeletonGrid(placeholderCount = 8) {
  return `<ul class="product-grid" aria-hidden="true">${'<li class="product-card product-card--skeleton"><div class="sk sk-img"></div><div class="sk sk-line"></div><div class="sk sk-line sk-line--short"></div><div class="sk sk-line"></div></li>'.repeat(placeholderCount)}</ul>`;
}

/** Generic region-level loading row. */
export function loadingRows(label = "Loading…") {
  return `<div class="region-loading" role="status"><span class="spinner" aria-hidden="true"></span>${escapeHtml(label)}</div>`;
}

/** Empty state: message + ONE sensible next action (§48). */
export function emptyState({ title, message, actionLabel = null, actionHref = null }) {
  const action =
    actionLabel && actionHref
      ? `<a class="btn" href="${escapeHtml(actionHref)}">${escapeHtml(actionLabel)}</a>`
      : "";
  return `<div class="empty-state">
    <p class="empty-state__title">${escapeHtml(title)}</p>
    ${message ? `<p class="empty-state__message">${escapeHtml(message)}</p>` : ""}
    ${action}
  </div>`;
}

/** Error state with recovery action (§49) — human wording, retry affordance. */
export function errorState({ message = "We couldn’t load this right now.", retry = true } = {}) {
  return `<div class="error-state" role="alert">
    <p class="error-state__title">Something went wrong</p>
    <p class="error-state__message">${escapeHtml(message)}</p>
    ${retry ? '<button type="button" class="btn btn--secondary" data-retry>Try again</button>' : ""}
  </div>`;
}

/** Friendly Firebase error → human sentence (internal code to console). */
export function friendlyAuthError(err) {
  const code = err?.code || "";
  const map = {
    "auth/email-already-in-use": "An account with this email already exists. Try signing in instead.",
    "auth/invalid-email": "That email address doesn’t look right.",
    "auth/weak-password": "That password is too weak — use at least 8 characters.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "That password didn’t match. Try again or reset it.",
    "auth/invalid-credential": "That email and password didn’t match.",
    "auth/too-many-requests": "Too many attempts — wait a minute and try again.",
    "auth/network-request-failed": "Network trouble — check your connection and retry.",
  };
  if (map[code]) return map[code];
  if (code.startsWith("kadai/") && err?.message) return err.message;
  return map[code] || "That didn’t work. Please try again.";
}


