
/**
 * KADAI — cart line + merge logic (pure; §33 merge rules defined here)
 *
 * MERGE RULE (guest → user, on login):
 *   For each guest line: if the user's cart already has the product,
 *   keep the LARGER quantity (never sum — avoids accidental bulk orders);
 *   otherwise carry the guest line over. Then clear the guest cart.
 *   Wishlist merges by union. Nothing is silently destroyed.
 */

/**
 * @param {Array<{productId:string, qty:number}>} userCart
 * @param {Array<{productId:string, qty:number}>} guestCart
 * @returns {Array<{productId:string, qty:number}>} merged lines
 */
export function mergeCarts(userCart, guestCart) {
  const map = new Map();
  for (const l of Array.isArray(userCart) ? userCart : []) {
    if (l?.productId) map.set(l.productId, clampQty(l.qty));
  }
  for (const l of Array.isArray(guestCart) ? guestCart : []) {
    if (!l?.productId) continue;
    const g = clampQty(l.qty);
    map.set(l.productId, map.has(l.productId) ? Math.max(map.get(l.productId), g) : g);
  }
  return Array.from(map, ([productId, qty]) => ({ productId, qty }));
}

/** Wishlist merge = union of product ids, user cart order first. */
export function mergeWishlists(userList, guestList) {
  const set = new Set();
  for (const id of Array.isArray(userList) ? userList : []) if (id) set.add(id);
  for (const id of Array.isArray(guestList) ? guestList : []) if (id) set.add(id);
  return Array.from(set);
}

export function clampQty(qty) {
  return Math.max(1, Math.min(99, Math.round(Number(qty) || 1)));
}


