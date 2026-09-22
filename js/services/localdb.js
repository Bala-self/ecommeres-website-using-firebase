
/**
 * KADAI — local demo database (DEMO MODE ONLY)
 * A tiny localStorage-backed collection store that mirrors the shape of
 * the Firestore paths the app uses. Everything written here is
 * device-local and clearly labeled demo data. It is never a security
 * boundary — that role belongs to Firestore/Storage rules (§21).
 */

import { lsGet, lsSet, lsRemove } from "../core/store.js";

const DB_KEY = "demo.db";
const META_KEY = "demo.meta";

function db() {
  return lsGet(DB_KEY, { products: {}, categories: {}, orders: {}, reviews: {}, coupons: {} });
}
function save(next) { lsSet(DB_KEY, next); }

export const localdb = {
  seeded() { return lsGet(META_KEY + ".seeded", false); },
  markSeeded() { lsSet(META_KEY + ".seeded", true); },

  /** @returns {Array} documents with id */
  list(collection, filterFn = null) {
    const docs = Object.entries(db()[collection] || {}).map(([id, d]) => ({ id, ...d }));
    const sorted = docs.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
    return filterFn ? sorted.filter(filterFn) : sorted;
  },
  get(collection, id) {
    const d = (db()[collection] || {})[id];
    return d ? { id, ...d } : null;
  },
  put(collection, id, doc) {
    const next = db();
    next[collection] = next[collection] || {};
    next[collection][id] = { ...doc };
    save(next);
    return { id, ...doc };
  },
  update(collection, id, patch) {
    const next = db();
    next[collection] = next[collection] || {};
    if (!next[collection][id]) return null;
    next[collection][id] = { ...next[collection][id], ...patch };
    save(next);
    return { id, ...next[collection][id] };
  },
  delete(collection, id) {
    const next = db();
    if (next[collection]) { delete next[collection][id]; save(next); }
  },

  /** Per-user sub-collections (addresses) */
  userList(userPath, filterFn = null) {
    const items = Object.entries(lsGet(userPath, {})).map(([id, d]) => ({ id, ...d }));
    return filterFn ? items.filter(filterFn) : items;
  },
  userGet(userPath, id) {
    const d = lsGet(userPath, {})[id];
    return d ? { id, ...d } : null;
  },
  userPut(userPath, id, doc) {
    const all = lsGet(userPath, {});
    all[id] = { ...doc };
    lsSet(userPath, all);
    return { id, ...doc };
  },
  userDelete(userPath, id) {
    const all = lsGet(userPath, {});
    delete all[id];
    lsSet(userPath, all);
  },
};


