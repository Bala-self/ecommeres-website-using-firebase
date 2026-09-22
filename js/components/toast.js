
/**
 * KADAI — toast (status messaging; aria-live so AT announces it)
 */

import { qs } from "../core/dom.js";

const LIVE_REGION_HTML =
  '<div class="toast-region" role="status" aria-live="polite"></div>';

export function initToastRegion() {
  if (!qs(".toast-region")) {
    document.body.insertAdjacentHTML("beforeend", LIVE_REGION_HTML);
  }
}

/**
 * @param {string} message
 * @param {"ok"|"error"|"info"} tone
 * @param {number} ms auto-dismiss
 */
export function toast(message, tone = "ok", ms = 3600) {
  const region = qs(".toast-region");
  if (!region) { console.info(`[kadai] ${tone}: ${message}`); return; }
  const el = document.createElement("p");
  el.className = `toast toast--${tone}`;
  el.textContent = message;
  region.appendChild(el);
  requestAnimationFrame(() => el.classList.add("toast--in"));
  setTimeout(() => {
    el.classList.remove("toast--in");
    setTimeout(() => el.remove(), 250);
  }, ms);
}


