
/**
 * KADAI — home page (Phase 07)
 * Composition follows the product identity: real categories with real counts,
 * featured products. Nothing fabricated (§7).
 */

import { qs } from "../core/dom.js";
import { homePicks, listActive } from "../services/products.js";
import { listActive as listCategories } from "../services/categories.js";
import { productCard } from "../components/productCard.js";
import { skeletonGrid, errorState } from "../components/states.js";
import { escapeHtml } from "../core/dom.js";
import { pulse } from "../core/motion.js";

export async function init() {
  renderCategories();
  renderFeatured();
}

async function renderCategories() {
  const el = qs(".js-categories");
  if (!el) return;
  try {
    const [cats, { items: all }] = await Promise.all([
      listCategories(),
      listActive({ pageSize: 200, sort: "home" }),
    ]);
    el.innerHTML = cats.map((c) => {
      const n = all.filter((p) => p.categoryId === c.id).length;
      return `<a class="category-card" href="products.html?category=${escapeHtml(c.slug)}">
        <strong>${escapeHtml(c.name)}</strong>
        <span class="category-count">${n} product${n === 1 ? "" : "s"}</span>
      </a>`;
    }).join("");
  } catch {
    el.innerHTML = ""; // categories are secondary; never block the page on them
  }
}

async function renderFeatured() {
  const el = qs(".js-featured");
  if (!el) return;
  el.innerHTML = skeletonGrid(4);
  try {
    const { featured } = await homePicks();
    el.innerHTML = featured.length
      ? `<ul class="product-grid">${featured.map((p) => productCard(p)).join("")}</ul>`
      : skeletonGrid(0) && `<p class="muted">Products are being added — check back soon.</p>`;
    bindCardActions(el);
  } catch (e) {
    console.warn("[kadai] featured products failed:", e?.code || e?.message);
    el.innerHTML = errorState({ retry: false });
  }
}

/** Wire add-to-cart + wishlist on any product grid container. */
export function bindCardActions(scope) {
  scope.querySelectorAll(".product-card .js-add:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const card = e.target.closest("[data-product-id]");
      const id = card?.dataset.productId;
      if (!id) return;
      btn.setAttribute("aria-busy", "true");
      try {
        const cart = await import("../services/cart.js");
        await cart.addToCart(id, 1);
        pulse(btn);
        const { toast } = await import("../components/toast.js");
        toast("Added to your cart.", "ok");
      } catch {
        const { toast } = await import("../components/toast.js");
        toast("Couldn’t add that — try again.", "error");
      } finally {
        btn.removeAttribute("aria-busy");
      }
    });
  });

  scope.querySelectorAll(".product-card .js-wishlist").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const card = e.target.closest("[data-product-id]");
      const id = card?.dataset.productId;
      if (!id) return;
      try {
        const wl = await import("../services/wishlist.js");
        const added = await wl.toggle(id);
        btn.setAttribute("aria-pressed", String(added));
        btn.setAttribute("aria-label", added ? "Remove from wishlist" : "Add to wishlist");
        pulse(btn);
        const { toast } = await import("../components/toast.js");
        toast(added ? "Saved to your wishlist." : "Removed from wishlist.", "ok");
      } catch {
        const { toast } = await import("../components/toast.js");
        toast("Couldn’t update the wishlist — try again.", "error");
      }
    });
  });
}

