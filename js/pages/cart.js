
/**
 * KADAI — cart page (Phase 13)
 * Totals come only from core/pricing.js. Coupon applies client-side
 * (§36 documented limitation). Empty state offers the single next action.
 */

import { qs, escapeHtml } from "../core/dom.js";
import { getLines, setQuantity, removeFromCart, subscribe as onCart } from "../services/cart.js";
import { computeTotals } from "../core/pricing.js";
import { validateCode, storeCoupon, clearStoredCoupon } from "../services/coupons.js";
import { formatINR } from "../core/format.js";
import { emptyState, skeletonGrid } from "../components/states.js";
import { currentUser, authReady, subscribe as onAuth } from "../services/auth.js";

let appliedCoupon = null; // {ok, discountPaise, coupon}

export async function init() {
  // Wait for Firebase Auth before choosing between the guest and user cart.
  await authReady();
  await render();
  onCart(() => render());
  onAuth(() => render());
}

async function render() {
  const root = qs(".js-cart-root");
  if (!root) return;
  root.innerHTML = '<div class="region-loading" role="status"><span class="spinner" aria-hidden="true"></span>Opening your cart…</div>';

  let lines;
  try {
    lines = await getLines();
  } catch {
    root.innerHTML = emptyState({ title: "Your cart couldn’t load", message: "Please refresh the page.", actionLabel: "Refresh", actionHref: "cart.html" });
    return;
  }

  if (!lines.length) {
    appliedCoupon = null;
    root.innerHTML = emptyState({
      title: "Your cart is empty",
      message: "Explore our products and add something you like.",
      actionLabel: "Continue shopping",
      actionHref: "products.html",
    });
    return;
  }

  const totals = computeTotals(lines, appliedCoupon);

  root.innerHTML = `
    <div class="checkout-layout min-w-0">
      <section class="min-w-0" aria-label="Items in your cart">
        <ul class="cart-lines">
          ${lines.map((l) => `
            <li class="cart-line min-w-0" data-product-id="${escapeHtml(l.productId)}">
              <img class="cart-line__img" src="${escapeHtml(l.product.images?.[0]?.url || "")}" alt="${escapeHtml(l.product.images?.[0]?.alt || l.product.name)}" width="96" height="96" />
              <div class="min-w-0">
                <a class="cart-line__name break-words" href="product.html?id=${escapeHtml(l.productId)}">${escapeHtml(l.product.name)}</a>
                <p class="cart-line__price">${formatINR(l.product.pricePaise)} each</p>
              </div>
              <div class="cart-line__controls shrink-0">
                <span class="cart-line__total">${formatINR(l.product.pricePaise * l.qty)}</span>
                <div class="stepper js-line-qty" aria-label="Quantity for ${escapeHtml(l.product.name)}">
                  <button type="button" data-step="-1" aria-label="Decrease quantity">−</button>
                  <output aria-live="polite">${l.qty}</output>
                  <button type="button" data-step="1" aria-label="Increase quantity" ${l.qty >= (l.product.stock || 99) ? "disabled" : ""}>+</button>
                </div>
                <button type="button" class="cart-line__remove js-remove">Remove</button>
              </div>
            </li>`).join("")}
        </ul>
      </section>

      <aside class="summary-card min-w-0" aria-label="Order summary">
        <h2>Summary</h2>
        <div class="summary-rows">
          <div><span class="muted">Items</span><span>${formatINR(totals.subtotalPaise)}</span></div>
          ${totals.discountPaise > 0 ? `<div class="discount"><span>Coupon ${escapeHtml(appliedCoupon.coupon?.code || "")}</span><span>− ${formatINR(totals.discountPaise)}</span></div>` : ""}
          <div><span class="muted">Delivery</span><span>${totals.shippingPaise === 0 ? "Free" : formatINR(totals.shippingPaise)}</span></div>
        </div>
        <div class="summary-total flex-wrap"><span>Total</span><span>${formatINR(totals.totalPaise)}</span></div>

        <div class="coupon-box js-coupon">
          <label class="u-visually-hidden" for="coupon-input">Coupon code</label>
          <div class="coupon-row min-w-0">
            <input class="min-w-0" id="coupon-input" type="text" placeholder="Coupon code" autocomplete="off" ${appliedCoupon ? `value="${escapeHtml(appliedCoupon.coupon?.code || "")}"` : ""} />
            <button type="button" class="btn btn--secondary btn--sm js-apply-coupon">Apply</button>
          </div>
          <p class="coupon-msg js-coupon-msg ${appliedCoupon ? "coupon-msg--ok" : ""}">${appliedCoupon ? `${formatINR(appliedCoupon.discountPaise)} off applied` : ""}</p>
        </div>

        <p class="summary-note">Cash on delivery. You’ll confirm the delivery address next.</p>
        <a class="btn btn--block" style="margin-top:var(--space-4)" href="checkout.html">
          ${currentUser() ? "Check out" : "Sign in & check out"}
        </a>
      </aside>
    </div>`;

  wireLineControls(root);
  wireCoupon(root, lines);
}

function wireLineControls(root) {
  root.querySelectorAll(".cart-line").forEach((lineEl) => {
    const id = lineEl.dataset.productId;
    const out = lineEl.querySelector("output");
    lineEl.querySelectorAll("[data-step]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const next = Math.max(0, Number(out.textContent) + Number(btn.dataset.step));
        btn.disabled = true;
        try {
          await setQuantity(id, next); // re-render happens via subscription
        } catch {
          btn.disabled = false;
          const { toast } = await import("../components/toast.js");
          toast("Couldn’t update your cart — try again.", "error");
        }
      }));
    lineEl.querySelector(".js-remove")?.addEventListener("click", async () => {
      try {
        await removeFromCart(id);
        const { toast } = await import("../components/toast.js");
        toast("Removed from cart.", "ok");
      } catch {
        const { toast } = await import("../components/toast.js");
        toast("Couldn’t remove that item — try again.", "error");
      }
    });
  });
}

async function wireCoupon(root, lines) {
  const btn = root.querySelector(".js-apply-coupon");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const input = root.querySelector("#coupon-input");
    const msg = root.querySelector(".js-coupon-msg");
    const code = input.value.trim();
    if (!code) {
      // empty apply = remove coupon
      appliedCoupon = null;
      clearStoredCoupon();
      msg.textContent = "Coupon removed.";
      msg.className = "coupon-msg";
      btn.removeAttribute("aria-busy");
      await render();
      return;
    }
    btn.setAttribute("aria-busy", "true");
    try {
      const subtotal = computeTotals(lines).subtotalPaise;
      const result = await validateCode(code, subtotal);
      if (result.ok) {
        appliedCoupon = result;
        storeCoupon(result);
        msg.textContent = `${formatINR(result.discountPaise)} off applied — it will be used at checkout.`;
        msg.className = "coupon-msg coupon-msg--ok";
      } else {
        appliedCoupon = null;
        clearStoredCoupon();
        msg.textContent = result.reason;
        msg.className = "coupon-msg coupon-msg--error";
      }
    } catch {
      appliedCoupon = null;
      msg.textContent = "Couldn’t check that code — try again.";
      msg.className = "coupon-msg coupon-msg--error";
    } finally {
      btn.removeAttribute("aria-busy");
      await render(); // recompute totals with/without coupon
    }
  });
}


