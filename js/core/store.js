
/**
 * KADAI — namespaced LocalStorage store
 * Demo mode persistence + guest carts/wishlists live here.
 * This is convenience state, NEVER a security layer (§34).
 */

const PREFIX = "kadai.v1.";

/** @param {string} key @returns {*} parsed value or null */
export function lsGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** @param {string} key @param {*} value */
export function lsSet(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false; // private mode / quota — features must degrade gracefully
  }
}

export function lsRemove(key) {
  try { localStorage.removeItem(PREFIX + key); } catch { /* noop */ }
}


