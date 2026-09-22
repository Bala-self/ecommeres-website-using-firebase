
/**
 * KADAI — wishlist page (Phase 15)
 * Re-renders from the wishlist service subscription, so add/remove from
 * ANY pathway (shared card handler included) keeps the grid honest —
 * no duplicate click handlers (audit round 2 fix).
 */

import { qs } from "../core/dom.js";
import { getProducts, subscribe as onWishlist } from "../services/wishlist.js";
import { authReady, subscribe as onAuth } from "../services/auth.js";
import { productCard } from "../components/productCard.js";
import { emptyState } from "../components/states.js";
import { bindCardActions } from "./home.js";

let rendering = false;

export async function init() {
  // Do not read the guest wishlist while Firebase is still resolving the
  // signed-in user; that race made a real Firestore wishlist look empty.
  await authReady();
  await render();
  onWishlist(() => { if (!rendering) render(); });
  onAuth(() => { if (!rendering) render(); });
}

async function render() {
  const root = qs(".js-wishlist-root");
  if (!root) return;
  rendering = true;
  try {
    let items;
    try {
      items = await getProducts();
    } catch {
      root.innerHTML = emptyState({
        title: "Your wishlist couldn’t load",
        message: "Please refresh and try again.",
        actionLabel: "Refresh",
        actionHref: "wishlist.html",
      });
      return;
    }

    if (!items.length) {
      root.innerHTML = emptyState({
        title: "Your wishlist is empty",
        message: "Tap the heart on any product to save it here.",
        actionLabel: "Browse products",
        actionHref: "products.html",
      });
      return;
    }

    root.innerHTML = `<ul class="product-grid">${items.map((p) => productCard(p, { inWishlist: true })).join("")}</ul>`;
    bindCardActions(root);
  } finally {
    rendering = false;
  }
}


