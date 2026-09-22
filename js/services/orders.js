
/**
 * KADAI — order service (§38/§39/§40)
 * Orders use pay-on-delivery. paymentStatus is the
 * literal 'NOT_IMPLEMENTED' (§90) — no fake transactions, ever.
 * Item lines snapshot name/price at purchase. Totals recomputed here
 * from the live catalog at submit time (client-side — the documented
 * [SECURITY GAP] for online payment; acceptable for a COD request flow
 * that an admin reviews before processing).
 */

import { getFS } from "../firebase/sdk.js";
import { localdb } from "./localdb.js";
import { currentUser, isAdmin } from "./auth.js";
import { byIds } from "./products.js";
import { computeTotals } from "../core/pricing.js";
import { clampQty } from "../core/cart-logic.js";

export const ORDER_FLOW = ["placed", "processing", "shipped", "delivered"];
export const VALID_STATUS = [...ORDER_FLOW, "cancelled"];

/** Allowed admin transitions (simple, honest flow — §40, no invented machine). */
export function nextStatuses(current) {
  if (current === "cancelled" || current === "delivered") return [];
  if (current === "placed") return ["processing", "cancelled"];
  if (current === "processing") return ["shipped", "cancelled"];
  if (current === "shipped") return ["delivered"];
  return [];
}

function orderNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KD-${ymd}-${rand}`;
}

/**
 * Create an order from cart lines + address.
 * @returns {{orderId:string, orderNumber:string, totals:object}}
 */
export async function createOrder({ lines, address, appliedCoupon = null, couponCode = null }) {
  const user = currentUser();
  if (!user) throw { code: "kadai/auth-required", message: "Sign in to place an order." };
  if (!Array.isArray(lines) || !lines.length) throw { code: "kadai/empty-cart", message: "Your cart is empty." };
  if (!address) throw { code: "kadai/address-required", message: "A delivery address is required." };

  // Normalize the caller-provided cart snapshot before joining live catalog data.
  // This protects the order document from fractional, string, or oversized quantities
  // coming from stale local storage or a modified browser request.
  const normalizedLines = lines.map((line) => ({
    productId: String(line?.productId || ""),
    qty: clampQty(line?.qty),
  }));
  if (normalizedLines.some((line) => !line.productId)) {
    throw { code: "kadai/invalid-cart", message: "Your cart contains an invalid item." };
  }

  // Recompute from catalog — never trust stale cart prices, even our own (§39)
  const products = await byIds(normalizedLines.map((l) => l.productId));
  const map = new Map(products.map((p) => [p.id, p]));
  const snapLines = [];
  for (const l of normalizedLines) {
    const p = map.get(l.productId);
    if (!p) throw { code: "kadai/product-unavailable", message: "One of the items in your cart is no longer available." };
    if (Number.isInteger(p.stock)) {
      // stock 0 must BLOCK the order (it used to slip through — scenario sweep fix)
      if (p.stock <= 0) {
        throw { code: "kadai/out-of-stock", message: `${p.name} is out of stock. Remove it from your cart to continue.` };
      }
      if (l.qty > p.stock) {
        throw { code: "kadai/insufficient-stock", message: `${p.name} has only ${p.stock} left in stock.` };
      }
    }
    snapLines.push({
      productId: p.id,
      name: p.name,
      image: p.images?.[0]?.url || null,
      priceAtPurchasePaise: p.pricePaise,
      qty: l.qty,
    });
  }

  const totals = computeTotals(
    snapLines.map((l) => ({ product: { pricePaise: l.priceAtPurchasePaise }, qty: l.qty })),
    appliedCoupon
  );

  const now = new Date();
  const order = {
    orderNumber: orderNumber(),
    userId: user.uid,
    userEmail: user.email || "",
    items: snapLines,
    itemsSubtotalPaise: totals.subtotalPaise,
    discountPaise: totals.discountPaise,
    couponCode: totals.discountPaise > 0 ? couponCode : null,
    shippingPaise: totals.shippingPaise,
    totalPaise: totals.totalPaise,
    shippingAddress: { ...address }, // snapshot
    status: "placed",
    paymentStatus: "NOT_IMPLEMENTED", // literal future seam — §90
    paymentProvider: null,
    transactionReference: null,
    statusHistory: [{ status: "placed", atIso: now.toISOString() }],
    createdAtMs: now.getTime(),
  };

  const fs = await getFS();
  if (!fs) {
    const id = "local-" + Math.random().toString(36).slice(2, 12);
    localdb.put("orders", id, order);
    return { orderId: id, ...order };
  }
  const ref = await fs.mod.addDoc(fs.mod.collection(fs.db, "orders"), {
    ...order,
    createdAt: fs.mod.serverTimestamp(),
    updatedAt: fs.mod.serverTimestamp(),
  });
  return { orderId: ref.id, ...order };
}

export async function listForUser(uid) {
  const fs = await getFS();
  if (!fs) return localdb.list("orders", (o) => o.userId === uid);

  // Keep this query to a single equality filter. Combining userId with
  // orderBy(createdAt) requires a composite index, and order history is
  // small enough to sort the limited result set client-side.
  const snap = await fs.mod.getDocs(
    fs.mod.query(
      fs.mod.collection(fs.db, "orders"),
      fs.mod.where("userId", "==", uid),
      fs.mod.limit(50)
    )
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => orderTime(b) - orderTime(a));
}

function orderTime(order) {
  const value = order?.createdAt;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (Number.isFinite(value?.seconds)) return value.seconds * 1000;
  return Number(order?.createdAtMs) || 0;
}

/**
 * Fetch one order for viewing. Enforces ownership for customers here
 * AND in rules — rules are the real enforcement, this is UX.
 * Admins may inspect any order.
 */
export async function getOwned(orderId) {
  const user = currentUser();
  const fs = await getFS();
  let order = null;
  if (!fs) {
    order = localdb.get("orders", orderId);
  } else {
    try {
      const snap = await fs.mod.getDoc(fs.mod.doc(fs.db, "orders", orderId));
      order = snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (e) {
      // Rules deny cross-user reads — surface that as the intended UI
      // state instead of letting it become a generic page error.
      if (e?.code === "permission-denied") return { order: null, reason: "forbidden" };
      throw e;
    }
  }
  if (!order) return { order: null, reason: "not-found" };
  if (!user) return { order: null, reason: "forbidden" };
  if (order.userId !== user.uid && !isAdmin()) return { order: null, reason: "forbidden" };
  return { order, reason: null };
}

/** Admin: recent orders across all users. Rules enforce admin. */
export async function adminList(limitCount = 100) {
  const fs = await getFS();
  if (!fs) return localdb.list("orders").slice(0, limitCount);
  const snap = await fs.mod.getDocs(
    fs.mod.query(fs.mod.collection(fs.db, "orders"), fs.mod.orderBy("createdAt", "desc"), fs.mod.limit(limitCount))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Admin: advance status with a recorded history entry. */
/** Admin: advance status with a recorded history entry.
 *  Enforces the legal transition graph — the UI dropdown alone is not a guard (§24).
 *  History is ALWAYS derived from the server-side document (loop-test fix:
 *  trusting caller-supplied history could overwrite entries from a stale
 *  admin table). The third parameter is accepted for compatibility and ignored. */
export async function adminSetStatus(orderId, next, _ignoredHistory = null) {
  if (!VALID_STATUS.includes(next)) throw new Error(`Unknown status: ${next}`);
  const fs = await getFS();
  let current = null;
  if (!fs) {
    current = localdb.get("orders", orderId);
  } else {
    const curSnap = await fs.mod.getDoc(fs.mod.doc(fs.db, "orders", orderId));
    current = curSnap.exists() ? { id: curSnap.id, ...curSnap.data() } : null;
  }
  if (!current) throw new Error("Order not found");
  if (!nextStatuses(current.status).includes(next)) {
    throw new Error(`Can’t move an order from “${current.status}” to “${next}”.`);
  }
  const history = [...(current.statusHistory || []), { status: next, atIso: new Date().toISOString() }];
  if (!fs) {
    current.status = next;
    current.statusHistory = history;
    localdb.put("orders", orderId, current);
    return current;
  }
  await fs.mod.updateDoc(fs.mod.doc(fs.db, "orders", orderId), {
    status: next,
    updatedAt: fs.mod.serverTimestamp(),
    statusHistory: history,
  });
  const snap = await fs.mod.getDoc(fs.mod.doc(fs.db, "orders", orderId));
  return { id: snap.id, ...snap.data() };
}


