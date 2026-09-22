
/**
 * KADAI — coupon service (§36)
 * Frontend validation for immediate feedback only; totals come from
 * core/pricing.js. Trusted validation moves server-side with payment.
 */

import { getFS } from "../firebase/sdk.js";
import { localdb } from "./localdb.js";
import { applyCoupon } from "../core/pricing.js";

const CHECKOUT_COUPON_KEY = "kadai.checkout.coupon";

/**
 * Carry only the coupon code between cart and checkout. The coupon is always
 * fetched and validated again at checkout; sessionStorage is only a UX handoff.
 */
export function storeCoupon(result) {
  const code = String(result?.coupon?.code || "").trim().toUpperCase();
  if (!code) return false;
  try {
    sessionStorage.setItem(CHECKOUT_COUPON_KEY, JSON.stringify({ code }));
    return true;
  } catch {
    return false;
  }
}

export function readStoredCoupon() {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_COUPON_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return value?.code ? { code: String(value.code).trim().toUpperCase() } : null;
  } catch {
    return null;
  }
}

export function clearStoredCoupon() {
  try { sessionStorage.removeItem(CHECKOUT_COUPON_KEY); } catch { /* private mode */ }
}

export async function validateCode(code, subtotalPaise) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return { ok: false, reason: "Enter a coupon code." };

  const fs = await getFS();
  let coupon = null;
  if (!fs) {
    coupon = localdb.list("coupons", (c) => c.code?.toUpperCase() === normalized && c.active)[0] || null;
  } else {
    // Coupon documents are keyed by their normalized code. A direct read
    // avoids a compound (code + active) index and still remains safe because
    // Firestore rules allow public reads only for active coupon documents.
    try {
      const snap = await fs.mod.getDoc(fs.mod.doc(fs.db, "coupons", normalized));
      coupon = snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (e) {
      // Inactive coupon documents are intentionally denied by the rules;
      // present that the same as an invalid code instead of a raw failure.
      if (e?.code === "permission-denied") coupon = null;
      else throw e;
    }
  }
  if (!coupon) return { ok: false, reason: "That code isn’t valid." };

  const result = applyCoupon(coupon, subtotalPaise);
  if (!result.ok) return result;
  return { ok: true, discountPaise: result.discountPaise, coupon };
}

export async function listAll() {
  const fs = await getFS();
  if (!fs) return localdb.list("coupons");
  const snap = await fs.mod.getDocs(fs.mod.collection(fs.db, "coupons"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function save(code, data) {
  const id = String(code).trim().toUpperCase();
  const fs = await getFS();
  if (!fs) {
    localdb.put("coupons", id, data);
    return;
  }
  await fs.mod.setDoc(
    fs.mod.doc(fs.db, "coupons", id),
    { ...data, updatedAt: fs.mod.serverTimestamp() },
    { merge: true }
  );
}


