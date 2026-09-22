
/**
 * KADAI — product card (§27)
 * Scanning-optimized: image, name, price, availability. Only real
 * signals — a discount badge appears only with compareAtPrice data,
 * ratings appear only when a trusted average exists (§45).
 * Whole card is one link; wishlist + cart are separate labelled controls.
 */

import { escapeHtml } from "../core/dom.js";
import { formatINR } from "../core/format.js";

/**
 * @param {object} p product document
 * @param {{inWishlist?:boolean}} [opts]
 */
export function productCard(p, opts = {}) {
  const id = escapeHtml(p.id);
  const name = p.name || "Unnamed product";
  const img = p.images?.[0];
  const outOfStock = Number.isInteger(p.stock) && p.stock <= 0;
  const price = p.pricePaise != null ? formatINR(p.pricePaise) : "Price on request";
  const compare =
    p.compareAtPricePaise && p.pricePaise && p.compareAtPricePaise > p.pricePaise
      ? `<s class="product-card__compare">${formatINR(p.compareAtPricePaise)}</s>`
      : "";
  const badge =
    p.compareAtPricePaise && p.pricePaise && p.compareAtPricePaise > p.pricePaise
      ? `<span class="badge badge--save">Save ${formatINR(p.compareAtPricePaise - p.pricePaise)}</span>`
      : p.newArrival ? '<span class="badge badge--new">New</span>' : "";

  return `<li class="product-card min-w-0${outOfStock ? " product-card--oos" : ""}" data-product-id="${id}">
    <a class="product-card__link min-w-0" href="product.html?id=${id}">
      <figure class="product-card__media">
        ${
          img
            ? `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.alt || name)}" loading="lazy" width="400" height="400" />`
            : '<span class="product-card__noimg" aria-hidden="true"></span>'
        }
        ${badge}
        ${outOfStock ? '<span class="badge badge--oos">Out of stock</span>' : ""}
      </figure>
      <h3 class="product-card__name break-words">${escapeHtml(name)}</h3>
      <p class="product-card__price">${price} ${compare}</p>
      <p class="product-card__stock">${
        outOfStock ? "Currently unavailable" : Number.isInteger(p.stock) && p.stock <= 5 ? `Only ${p.stock} left` : "In stock"
      }</p>
    </a>
    <div class="product-card__actions min-w-0">
      <button type="button" class="icon-btn js-wishlist" aria-pressed="${opts.inWishlist ? "true" : "false"}"
        aria-label="${opts.inWishlist ? "Remove from wishlist" : "Add to wishlist"}">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="${opts.inWishlist ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8">
          <path d="M12 21s-7.5-4.9-9.7-9.2C.8 8.6 2.6 5 6.1 5c2 0 3.4 1 4.1 2.4h1.6C12.5 6 13.9 5 15.9 5c3.5 0 5.3 3.6 3.8 6.8C17.5 16.1 12 21 12 21z" transform="scale(0.95)"/>
        </svg>
      </button>
      <button type="button" class="btn btn--sm js-add ${outOfStock ? "" : ""}" ${outOfStock ? "disabled" : ""}>
        ${outOfStock ? "Out of stock" : "Add to cart"}
      </button>
    </div>
  </li>`;
}


