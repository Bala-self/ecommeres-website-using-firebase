
/**
 * KADAI — cart service (§33/§34)
 * Guest → LocalStorage. Authenticated → Firestore carts/{uid}
 * (demo: local). Lines store productId + qty only; product data is
 * always joined fresh so prices/stock are never stale client state.
 * Totals come exclusively from core/pricing.js.
 */

import { getFS } from "../firebase/sdk.js";
import { lsGet, lsSet, lsRemove } from "../core/store.js";
import { currentUser } from "./auth.js";
import { byIds } from "./products.js";
import { mergeCarts, clampQty } from "../core/cart-logic.js";

const GUEST_KEY = "cart.guest";
const listeners = new Set();
let writeChain = Promise.resolve(); // serialize async writes

function localKey() {
  const user = currentUser();
  return user ? `cart.user.${user.uid}` : GUEST_KEY;
}

async function readItems() {
  const fs = currentUser() ? await getFS() : null;
  if (!fs) return readLocal(localKey());
  try {
    const snap = await fs.mod.getDoc(fs.mod.doc(fs.db, "carts", currentUser().uid));
    return snap.exists() ? snap.data()?.items || [] : [];
  } catch (e) {
    console.warn("[kadai] cart read failed:", e?.code || e?.message);
    throw e;
  }
}

async function writeItems(items) {
  const clean = items.map((l) => ({ productId: String(l.productId), qty: Math.max(1, Math.min(99, l.qty | 0)) }));
  const fs = currentUser() ? await getFS() : null;
  if (!fs) { writeLocal(localKey(), clean); return; }
  try {
    await fs.mod.setDoc(fs.mod.doc(fs.db, "carts", currentUser().uid), { items: clean, updatedAt: Date.now() });
  } catch (e) {
    console.warn("[kadai] cart write failed:", e?.code || e?.message);
    throw e;
  }
  notify();
}

/** Demo-mode local read/write helpers (also used for guests everywhere). */
function readLocal(key) { return lsGet(key, []); }
function writeLocal(key, items) {
  lsSet(key, items.map((l) => ({ productId: String(l.productId), qty: Math.max(1, Math.min(99, l.qty | 0)) })));
  notify();
}

/** Queue writes so concurrent UI actions stay ordered. */
function enqueue(operation) {
  const run = writeChain.then(operation);
  // Keep the queue usable after a failed operation, while returning the
  // rejection to the caller so the UI cannot report a false success.
  writeChain = run.catch((e) => {
    console.warn("[kadai] cart op failed:", e?.code || e?.message);
  });
  return run;
}

function notify() { for (const fn of listeners) fn(); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function getGuestItems() { return readLocal(GUEST_KEY); }

export async function getLines() {
  const storedItems = await readItems();
  const items = Array.isArray(storedItems) ? storedItems.filter((l) => l?.productId) : [];
  const products = await byIds(items.map((l) => l.productId));
  const map = new Map(products.map((p) => [p.id, p]));
  return items
    .map((l) => ({ ...l, qty: clampQty(l.qty), product: map.get(l.productId) || null }))
    .filter((l) => l.product); // deleted/deactivated products drop out
}

export function addToCart(productId, qty = 1) {
  return enqueue(async () => {
    const storedItems = await readItems();
    const items = Array.isArray(storedItems) ? storedItems : [];
    const existing = items.find((l) => l.productId === productId);
    if (existing) existing.qty = Math.min(99, clampQty(existing.qty) + Math.max(1, qty | 0));
    else items.push({ productId, qty: Math.max(1, qty | 0) });
    await writeItems(items);
  });
}

export function setQuantity(productId, qty) {
  return enqueue(async () => {
    const storedItems = await readItems();
    let items = Array.isArray(storedItems) ? storedItems : [];
    if (qty <= 0) items = items.filter((l) => l.productId !== productId);
    else {
      const line = items.find((l) => l.productId === productId);
      if (line) line.qty = Math.min(99, qty | 0);
    }
    await writeItems(items);
  });
}

export function removeFromCart(productId) { return setQuantity(productId, 0); }
export function clearCart() { return enqueue(async () => writeItems([])); }

export async function cartCount() {
  const storedItems = await readItems();
  const items = Array.isArray(storedItems) ? storedItems.filter((l) => l?.productId) : [];
  return items.reduce((n, l) => n + clampQty(l.qty), 0);
}

/**
 * Login-time merge (§33). Rule set lives in core/cart-logic.js.
 * Returns the number of guest lines carried over.
 */
export async function mergeGuestCartOnLogin(uid) {
  const guest = readLocal(GUEST_KEY);
  if (!guest.length) return 0;
  let userItems = [];
  const fs = await getFS();
  if (fs) {
    const snap = await fs.mod.getDoc(fs.mod.doc(fs.db, "carts", uid));
    userItems = snap.exists() ? snap.data()?.items || [] : [];
  } else {
    userItems = readLocal(`cart.user.${uid}`);
  }
  const merged = mergeCarts(userItems, guest);
  if (fs) {
    await fs.mod.setDoc(fs.mod.doc(fs.db, "carts", uid), { items: merged, updatedAt: Date.now() });
  } else {
    writeLocal(`cart.user.${uid}`, merged);
  }
  lsRemove(GUEST_KEY);
  notify();
  return guest.length;
}


