
/**
 * KADAI — product service (§63)
 * Data access only — zero DOM. Firebase first; local demo fallback.
 * v1 honesty note (§28): Firestore has no full-text search; search does
 * a client-side keyword match over active products (≤200 fetched).
 * Swap to a dedicated search service when the catalog outgrows this (§91).
 */

import { getFS } from "../firebase/sdk.js";
import { localdb } from "./localdb.js";

const PAGE_SIZE = 12;
const SEARCH_SCAN_LIMIT = 200;

function fromDoc(snapshot) {
  const d = snapshot.data();
  return {
    id: snapshot.id,
    ...d,
    // tolerate malformed documents (§19) — rendering layers guard on nulls
    pricePaise: Number.isFinite(d?.pricePaise) ? d.pricePaise : null,
    stock: Number.isInteger(d?.stock) ? d.stock : 0,
    images: Array.isArray(d?.images) && d.images.length ? d.images : [],
  };
}

function timestampValue(value) {
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (Number.isFinite(value)) return value;
  if (Number.isFinite(value?.seconds)) return value.seconds * 1000;
  return 0;
}

/** Active products, optional category, server-side sort + cursor paging. */
export async function listActive({ categoryId = null, sort = "featured", pageSize = PAGE_SIZE, cursor = null } = {}) {
  const fs = await getFS();
  if (!fs) return listActiveLocal({ categoryId, sort, pageSize, cursor });

  const { mod, db } = fs;
  const base = [mod.where("active", "==", true)];
  if (categoryId) base.push(mod.where("categoryId", "==", categoryId));

  const order = {
    "price-asc": [mod.orderBy("pricePaise", "asc")],
    "price-desc": [mod.orderBy("pricePaise", "desc")],
    "newest": [mod.orderBy("createdAt", "desc")],
    "featured": [mod.orderBy("createdAt", "asc")], // stable base; featured re-ranked client-side
    // Homepage ranking is client-side so it does not depend on a composite
    // index or exclude older product documents without createdAt.
    "home": [],
  }[sort] || [mod.orderBy("createdAt", "asc")];

  const args = [...base, ...order];
  const q = cursor
    ? mod.query(mod.collection(db, "products"), ...args, mod.startAfter(cursor), mod.limit(pageSize))
    : mod.query(mod.collection(db, "products"), ...args, mod.limit(pageSize));

  const snap = await mod.getDocs(q);
  let items = snap.docs.map(fromDoc);
  if (sort === "featured") {
    items = items.slice().sort((a, b) => Number(b.featured === true) - Number(a.featured === true));
  } else if (sort === "home") {
    items = items.slice().sort((a, b) =>
      Number(b.featured === true) - Number(a.featured === true) ||
      Number(b.newArrival === true) - Number(a.newArrival === true) ||
      timestampValue(b.createdAt) - timestampValue(a.createdAt)
    );
  }
  return { items, nextCursor: snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null };
}

function listActiveLocal({ categoryId = null, sort = "featured", pageSize = PAGE_SIZE, cursor = 0 }) {
  let items = localdb.list("products", (p) => p.active && (!categoryId || p.categoryId === categoryId));
  if (sort === "price-asc") items.sort((a, b) => a.pricePaise - b.pricePaise);
  else if (sort === "price-desc") items.sort((a, b) => b.pricePaise - a.pricePaise);
  else if (sort === "newest") items.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  else items.sort((a, b) => Number(b.featured === true) - Number(a.featured === true));

  const start = cursor || 0;
  const page = items.slice(start, start + pageSize);
  return Promise.resolve({
    items: page,
    nextCursor: start + pageSize < items.length ? start + pageSize : null,
  });
}

/** Single active product (inactive/missing → null; caller shows 404 state). */
export async function getActive(productId) {
  const fs = await getFS();
  if (!fs) {
    const p = localdb.get("products", productId);
    return p && p.active ? p : null;
  }
  const snap = await fs.mod.getDoc(fs.mod.doc(fs.db, "products", productId));
  if (!snap.exists() || snap.data()?.active !== true) return null;
  return fromDoc(snap);
}

/** Products by id list (cart/wishlist detail).
 *  Per-doc read failures are swallowed to null and dropped: a deactivated
 *  product denies reads to customers at the rules level (active == true),
 *  and one bad document must never break the whole cart. */
export async function byIds(ids) {
  const wanted = Array.from(new Set(ids)).filter(Boolean);
  if (!wanted.length) return [];
  const fs = await getFS();
  if (!fs) {
    return wanted.map((id) => localdb.get("products", id)).filter((p) => p && p.active !== false);
  }
  const results = await Promise.all(
    wanted.map((id) => fs.mod.getDoc(fs.mod.doc(fs.db, "products", id)).catch(() => null))
  );
  return results.filter((s) => s && s.exists()).map(fromDoc);
}

/** v1 search: client-side match on name + keywords (honest limitation). */
export async function search(term) {
  const q = String(term).trim().toLowerCase();
  if (!q) return [];
  const fs = await getFS();
  let items;
  if (!fs) {
    items = localdb.list("products", (p) => p.active);
  } else {
    const snap = await fs.mod.getDocs(
      fs.mod.query(fs.mod.collection(fs.db, "products"), fs.mod.where("active", "==", true), fs.mod.limit(SEARCH_SCAN_LIMIT))
    );
    items = snap.docs.map(fromDoc);
  }
  const tokens = q.split(/\s+/);
  return items.filter((p) => {
    const hay = [p.name, p.categoryId, ...(Array.isArray(p.keywords) ? p.keywords : [])]
      .join(" ").toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });
}

/** Same-category companions for the product page. */
export async function related(productId, categoryId, count = 4) {
  const { items } = await listActive({ categoryId, pageSize: count + 1 });
  return items.filter((p) => p.id !== productId).slice(0, count);
}

/** Home page collections (small catalog: single fetch, client rank). */
export async function homePicks() {
  const { items } = await listActive({ pageSize: 48, sort: "home" });
  const newest = items.slice().sort((a, b) => timestampValue(b.createdAt) - timestampValue(a.createdAt));
  const featured = items.filter((p) => p.featured === true).slice(0, 4);
  return {
    // Admin-created products may not have merchandising flags yet. Keep the
    // homepage useful by falling back to active catalog products.
    featured: featured.length ? featured : newest.slice(0, 4),
  };
}

/** Admin: full listing incl. inactive (rules enforce admin). */
export async function listAllForAdmin() {
  const fs = await getFS();
  if (!fs) return localdb.list("products");
  const snap = await fs.mod.getDocs(
    fs.mod.query(fs.mod.collection(fs.db, "products"), fs.mod.orderBy("createdAt", "desc"), fs.mod.limit(200))
  );
  return snap.docs.map(fromDoc);
}

/** Admin write path (create/update). Firestore rules enforce admin.
 *  createdAt is stamped ONLY on document creation; local writes MERGE
 *  (put replaces — without merging, stock edits would wipe other fields,
 *  found by the scenario sweep). */
export async function adminSave(productId, data) {
  const fs = await getFS();
  if (!fs) {
    const existing = localdb.get("products", productId);
    const merged = { ...(existing || {}), ...data };
    if (!existing) merged.createdAtMs = Date.now();
    localdb.put("products", productId, merged);
    return localdb.get("products", productId);
  }
  const ref = fs.mod.doc(fs.db, "products", productId);
  const existing = await fs.mod.getDoc(ref);
  const payload = { ...data, updatedAt: fs.mod.serverTimestamp() };
  if (!existing.exists()) payload.createdAt = fs.mod.serverTimestamp();
  await fs.mod.setDoc(ref, payload, { merge: true });
  return { id: productId, ...data };
}


