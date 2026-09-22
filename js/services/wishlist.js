
/**
 * KADAI — wishlist service (§41)
 * Same split as cart: guest LocalStorage, user wishlists/{uid}.
 */

import { getFS } from "../firebase/sdk.js";
import { lsGet, lsSet, lsRemove } from "../core/store.js";
import { currentUser } from "./auth.js";
import { byIds } from "./products.js";
import { mergeWishlists } from "../core/cart-logic.js";

const GUEST_KEY = "wishlist.guest";
const listeners = new Set();

function localKey() {
  const user = currentUser();
  return user ? `wishlist.user.${user.uid}` : GUEST_KEY;
}

async function readIds() {
  const fs = currentUser() ? await getFS() : null;
  if (!fs) return lsGet(localKey(), []);
  try {
    const snap = await fs.mod.getDoc(fs.mod.doc(fs.db, "wishlists", currentUser().uid));
    return snap.exists() ? snap.data()?.productIds || [] : [];
  } catch (e) {
    console.warn("[kadai] wishlist read failed:", e?.code || e?.message);
    throw e;
  }
}

async function writeIds(ids) {
  const clean = Array.from(new Set(ids.map(String)));
  const fs = currentUser() ? await getFS() : null;
  if (!fs) { lsSet(localKey(), clean); notify(); return; }
  try {
    await fs.mod.setDoc(fs.mod.doc(fs.db, "wishlists", currentUser().uid), { productIds: clean });
  } catch (e) {
    console.warn("[kadai] wishlist write failed:", e?.code || e?.message);
    throw e;
  }
  notify();
}

function notify() { for (const fn of listeners) fn(); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export async function getProducts() { return byIds(await readIds()); }
export async function has(productId) { return (await readIds()).includes(String(productId)); }

export async function toggle(productId) {
  const ids = await readIds();
  const id = String(productId);
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  await writeIds(next);
  return next.includes(id);
}

export async function count() { return (await readIds()).length; }
export function getGuestIds() { return lsGet(GUEST_KEY, []); }

export async function mergeGuestWishlistOnLogin(uid) {
  const guest = getGuestIds();
  if (!guest.length) return 0;
  let userIds = [];
  const fs = await getFS();
  if (fs) {
    const snap = await fs.mod.getDoc(fs.mod.doc(fs.db, "wishlists", uid));
    userIds = snap.exists() ? snap.data()?.productIds || [] : [];
  } else {
    userIds = lsGet(`wishlist.user.${uid}`, []);
  }
  const merged = mergeWishlists(userIds, guest);
  if (fs) await fs.mod.setDoc(fs.mod.doc(fs.db, "wishlists", uid), { productIds: merged });
  else lsSet(`wishlist.user.${uid}`, merged);
  lsRemove(GUEST_KEY);
  notify();
  return guest.length;
}


