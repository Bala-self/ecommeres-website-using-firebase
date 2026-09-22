
/**
 * KADAI — product details page (Phase 10)
 * Hierarchy (§31): image + name/price/stock/buy primary; specs/description
 * secondary; reviews tertiary. Missing product → honest 404 state (§19).
 */

import { qs, escapeHtml } from "../core/dom.js";
import { getActive, related } from "../services/products.js";
import { formatINR } from "../core/format.js";
import { errorState, emptyState } from "../components/states.js";
import { toast } from "../components/toast.js";
import { bindCardActions } from "./home.js";
import { currentUser, authReady } from "../services/auth.js";
import { listPublished, submit as submitReview } from "../services/reviews.js";

let product = null;

export async function init() {
  const root = qs(".js-product-root");
  // Product data is public. Do not block the primary page on Auth hydration;
  // wishlist state and the review form can refresh once Auth is ready.
  const authBarrier = authReady();
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return renderNotFound(root);

  try {
    product = await getActive(id);
  } catch (e) {
    console.warn("[kadai] product load failed:", e?.code || e?.message);
    root.innerHTML = errorState();
    root.querySelector("[data-retry]")?.addEventListener("click", () => location.reload());
    return;
  }
  if (!product) return renderNotFound(root);

  renderProduct(root);
  renderReviews();
  renderRelated();
  wireBuyControls();
  authBarrier.then(() => {
    syncWishlistButton();
    renderReviews();
  }).catch(() => { /* public product content is already rendered */ });
}

function renderNotFound(root) {
  document.title = "Product not found — Kadai";
  root.innerHTML = emptyState({
    title: "We couldn’t find that product",
    message: "It may have been removed or renamed.",
    actionLabel: "Shop all products",
    actionHref: "products.html",
  });
}

function stockLine() {
  const s = product.stock;
  if (!Number.isInteger(s) || s <= 0) {
    return '<p class="pdp__stock pdp__stock--out">Out of stock — check back soon.</p>';
  }
  if (s <= 5) return `<p class="pdp__stock pdp__stock--low">In stock — only ${s} left</p>`;
  return `<p class="pdp__stock pdp__stock--in">In stock</p>`;
}

function renderProduct(root) {
  const name = product.name || "Unnamed product";
  document.title = `${name} — Kadai`;
  const img = product.images?.[0];
  const catSlug = product.categoryId;

  root.innerHTML = `
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li><a href="index.html">Home</a></li>
        <li><a href="products.html?category=${escapeHtml(catSlug)}">${escapeHtml(product.categoryName || "Products")}</a></li>
        <li aria-current="page">${escapeHtml(name)}</li>
      </ol>
    </nav>

    <div class="pdp min-w-0">
      <div class="gallery min-w-0">
        <div class="gallery__main js-gallery-main">
          ${img
            ? `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.alt || name)}" width="640" height="640" />`
            : '<span class="product-card__noimg" style="display:block;aspect-ratio:1"></span>'}
        </div>
        ${product.images?.length > 1 ? `
          <ul class="gallery__thumbs js-thumbs" aria-label="Product images">
            ${product.images.map((im, i) => `
              <li><button type="button" aria-pressed="${i === 0}" aria-label="Show image ${i + 1} of ${product.images.length}" data-url="${escapeHtml(im.url)}" data-alt="${escapeHtml(im.alt || name)}">
                <img src="${escapeHtml(im.url)}" alt="" loading="lazy" width="64" height="64" />
              </button></li>`).join("")}
          </ul>` : ""}
      </div>

      <div class="pdp__info min-w-0">
        <h1>${escapeHtml(name)}</h1>
        <p class="pdp__price">
          ${formatINR(product.pricePaise)}
          ${product.compareAtPricePaise > product.pricePaise ? `<s>${formatINR(product.compareAtPricePaise)}</s>` : ""}
        </p>
        ${stockLine()}

        <div class="pdp__buy">
          <div class="stepper js-qty" aria-label="Quantity">
            <button type="button" data-step="-1" aria-label="Decrease quantity">−</button>
            <output id="qty-out" aria-live="polite">1</output>
            <button type="button" data-step="1" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="btn js-pdp-add" ${Number.isInteger(product.stock) && product.stock <= 0 ? "disabled" : ""}>
            ${Number.isInteger(product.stock) && product.stock <= 0 ? "Out of stock" : "Add to cart"}
          </button>
        </div>
        <button type="button" class="icon-btn js-pdp-wish" aria-pressed="false" aria-label="Add to wishlist">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7.5-4.9-9.7-9.2C.8 8.6 2.6 5 6.1 5c2 0 3.4 1 4.1 2.4h1.6C12.5 6 13.9 5 15.9 5c3.5 0 5.3 3.6 3.8 6.8C17.5 16.1 12 21 12 21z"/></svg>
          <span style="font-size:var(--text-xs);margin-left:var(--space-2)">Wishlist</span>
        </button>

        <ul class="pdp__assurances">
          <li>✓ Cash on delivery — pay at your door</li>
          <li>✓ 7-day returns, no interrogation</li>
          <li>✓ Price includes GST</li>
        </ul>
      </div>
    </div>

    <section class="pdp-section" aria-labelledby="desc-title">
      <h2 id="desc-title">About this item</h2>
      <p style="max-width:64ch">${escapeHtml(product.descriptionLong || product.descriptionShort || "")}</p>
      ${product.specs && Object.keys(product.specs).length ? `
        <table class="spec-table" style="max-width:520px;margin-top:var(--space-4)">
          <caption class="u-visually-hidden">Specifications</caption>
          <tbody>
            ${Object.entries(product.specs).map(([k, v]) => `
              <tr><th scope="row">${escapeHtml(k)}</th><td>${escapeHtml(String(v))}</td></tr>`).join("")}
          </tbody>
        </table>` : ""}
    </section>

    <section class="pdp-section js-reviews" aria-labelledby="rev-title">
      <h2 id="rev-title">Reviews</h2>
      <div class="js-review-region"><div class="region-loading" role="status"><span class="spinner" aria-hidden="true"></span>Loading reviews…</div></div>
    </section>

    <section class="pdp-section js-related" aria-labelledby="rel-title">
      <h2 id="rel-title">More from this category</h2>
      <div class="js-related-region"></div>
    </section>
  `;

}

function wireBuyControls() {
  let qty = 1;
  const out = qs("#qty-out");
  const max = Number.isInteger(product.stock) && product.stock > 0 ? product.stock : 99;
  qs(".js-qty")?.querySelectorAll("button").forEach((btn) =>
    btn.addEventListener("click", () => {
      qty = Math.max(1, Math.min(max, qty + Number(btn.dataset.step)));
      out.textContent = String(qty);
    }));

  qs(".js-pdp-add")?.addEventListener("click", async (e) => {
    e.target.setAttribute("aria-busy", "true");
    try {
      const cart = await import("../services/cart.js");
      await cart.addToCart(product.id, qty);
      toast(`Added ${qty} to your cart.`, "ok");
    } catch {
      toast("Couldn’t add that — try again.", "error");
    } finally {
      e.target.removeAttribute("aria-busy");
    }
  });

  qs(".js-pdp-wish")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    try {
      const wl = await import("../services/wishlist.js");
      const added = await wl.toggle(product.id);
      btn.setAttribute("aria-pressed", String(added));
      btn.setAttribute("aria-label", added ? "Remove from wishlist" : "Add to wishlist");
      toast(added ? "Saved to your wishlist." : "Removed from wishlist.", "ok");
    } catch {
      toast("Couldn’t update the wishlist.", "error");
    }
  });

  // gallery thumbnails
  qs(".js-thumbs")?.querySelectorAll("button").forEach((btn) =>
    btn.addEventListener("click", () => {
      qs(".js-thumbs button[aria-pressed='true']")?.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-pressed", "true");
      const main = qs(".js-gallery-main");
      main.innerHTML = `<img src="${escapeHtml(btn.dataset.url)}" alt="${escapeHtml(btn.dataset.alt)}" width="640" height="640" />`;
    }));
}

async function syncWishlistButton() {
  try {
    const wl = await import("../services/wishlist.js");
    const inList = await wl.has(product.id);
    qs(".js-pdp-wish")?.setAttribute("aria-pressed", String(inList));
  } catch { /* non-blocking */ }
}

async function renderReviews() {
  const region = qs(".js-review-region");
  if (!region) return;
  try {
    const reviews = await listPublished(product.id);
    region.innerHTML = `
      ${reviews.length ? `
        <ul class="review-list">
          ${reviews.map((r) => `
            <li class="review">
              <div class="review__head">
                <span class="review__name">${escapeHtml(r.userDisplayName || "Customer")}</span>
                <span><span class="stars" aria-hidden="true">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span>
                <span class="u-visually-hidden">${r.rating} out of 5 stars</span></span>
              </div>
              <p class="review__text">${escapeHtml(r.text)}</p>
            </li>`).join("")}
        </ul>`
      : `<p class="muted" style="color:var(--ink-muted)">No reviews yet.</p>`}
      ${reviewFormHtml()}
    `;
    wireReviewForm();
  } catch {
    region.innerHTML = '<p class="muted" style="color:var(--ink-muted)">Reviews couldn’t load this time.</p>';
  }
}

function reviewFormHtml() {
  if (!currentUser()) {
    return `<div class="review-form">
      <p class="muted" style="color:var(--ink-muted);font-size:var(--text-sm)">
        <a href="login.html?next=${encodeURIComponent(location.pathname + location.search)}">Sign in</a> to write a review.
      </p>
    </div>`;
  }
  return `
    <form class="review-form js-review-form" novalidate>
      <h3 style="font-size:var(--text-lg)">Write a review</h3>
      <div class="field">
        <div class="rating-group js-rating" role="radiogroup" aria-label="Your rating">
          ${[1, 2, 3, 4, 5].map((n) => `
            <input type="radio" name="rating" id="rate-${n}" value="${n}" />
            <label for="rate-${n}" data-star="${n}" title="${n} star${n > 1 ? "s" : ""}">★</label>`).join("")}
        </div>
        <p class="field-error" data-error-for="rating"></p>
      </div>
      <div class="field">
        <label for="review-text">Your review</label>
        <textarea id="review-text" name="text" maxlength="1000" required
          placeholder="What did you use it for? How is it holding up?"></textarea>
        <p class="field-error" data-error-for="text"></p>
      </div>
      <button type="submit" class="btn js-review-submit">Submit review</button>
      <p class="hint">Reviews appear after a moderator approves them.</p>
    </form>`;
}

function wireReviewForm() {
  const form = qs(".js-review-form");
  if (!form) return;

  // star coloring (keyboard + pointer)
  form.querySelectorAll("input[name='rating']").forEach((input) =>
    input.addEventListener("change", () => {
      const n = Number(input.value);
      form.querySelectorAll("[data-star]").forEach((label) =>
        label.classList.toggle("star-on", Number(label.dataset.star) <= n));
      form.querySelector(".js-rating").setAttribute("aria-valuetext", `${n} of 5`);
    }));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const rating = form.querySelector("input[name='rating']:checked")?.value;
    const text = form.elements.text.value;
    let hasError = false;
    form.querySelector("[data-error-for='rating']").textContent =
      rating ? "" : "Pick a rating from 1 to 5 stars.";
    if (!rating) { hasError = true; }
    if (text.trim().length < 10) {
      form.querySelector("[data-error-for='text']").textContent =
        "Tell us a little more — at least 10 characters.";
      hasError = true;
      form.elements.text.setAttribute("aria-invalid", "true");
    } else {
      form.elements.text.removeAttribute("aria-invalid");
    }
    if (hasError) return;

    const btn = form.querySelector(".js-review-submit");
    btn.setAttribute("aria-busy", "true");
    try {
      const message = await submitReview({ productId: product.id, rating, text });
      form.reset();
      form.querySelectorAll("[data-star]").forEach((l) => l.classList.remove("star-on"));
      toast(message, "ok", 5000);
    } catch (err) {
      toast(err?.message || "Couldn’t submit — try again.", "error");
    } finally {
      btn.removeAttribute("aria-busy");
    }
  });
}

async function renderRelated() {
  const region = qs(".js-related-region");
  if (!region) return;
  try {
    const items = await related(product.id, product.categoryId, 4);
    if (!items.length) { region.closest(".pdp-section").hidden = true; return; }
    region.innerHTML = `<ul class="product-grid">${items.map((p) => productCard(p)).join("")}</ul>`;
    bindCardActions(region);
  } catch {
    region.closest(".pdp-section").hidden = true;
  }
}


