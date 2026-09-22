
/**
 * KADAI — DOM utilities
 * -----------------------
 * Tiny, dependency-free helpers. Rendering/behavior code lives in
 * components and pages; this module only provides safe primitives.
 */

/**
 * querySelector shorthand.
 * @template {Element} T
 * @param {string} selector
 * @param {ParentNode} [scope]
 * @returns {T|null}
 */
export function qs(selector, scope = document) {
  return /** @type {T|null} */ (scope.querySelector(selector));
}

/**
 * querySelectorAll shorthand → real Array.
 * @param {string} selector
 * @param {ParentNode} [scope]
 * @returns {Element[]}
 */
export function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

/**
 * Escape untrusted text before inserting via innerHTML.
 * Security note: this is output encoding for display contexts ONLY.
 * It is never a substitute for authorization or input policy (§60).
 * @param {string} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


