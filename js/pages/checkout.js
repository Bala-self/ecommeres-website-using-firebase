
/**
 * KADAI — checkout without payment (Phase 16, §37/§89)
 * Flow: sign-in gate → address (saved or new, validated) → review →
 * create order → truthful confirmation. paymentStatus stays
 * 'NOT_IMPLEMENTED'; the confirmation page never says "payment successful".
 */

import { qs, escapeHtml } from "../core/dom.js";
import { currentUser, authReady } from "../services/auth.js";
import { getLines } from "../services/cart.js";
import { listAddresses, saveAddress } from "../services/users.js";
import { createOrder } from "../services/orders.js";
import { computeTotals } from "../core/pricing.js";
import { formatINR } from "../core/format.js";
import { validateForm, validators, paintFieldErrors, clearFieldErrors } from "../core/validate.js";
import { emptyState } from "../components/states.js";
import { toast } from "../components/toast.js";
import { validateCode, readStoredCoupon, clearStoredCoupon } from "../services/coupons.js";

export async function init() {
  const root = qs(".js-checkout-root");
  await authReady(); // never flash "sign in" to a returning user
  const user = currentUser();

  if (!user) {
    root.innerHTML = `
      ${emptyState({
        title: "Sign in to check out",
        message: "Orders are tied to an account so you can track them — and so we can call you to confirm.",
        actionLabel: "Sign in",
        actionHref: `login.html?next=${encodeURIComponent("/checkout.html")}`,
      })}
      <p class="auth-alt" style="margin-top:var(--space-4)">New here?
        <a href="register.html?next=${encodeURIComponent("/checkout.html")}">Create an account</a> — it takes a minute.</p>`;
    return;
  }

  let lines;
  try {
    lines = await getLines();
  } catch {
    root.innerHTML = emptyState({ title: "We couldn’t load your cart", message: "Please refresh and try again." });
    return;
  }
  if (!lines.length) {
    root.innerHTML = emptyState({
      title: "Your cart is empty",
      message: "Add something before checking out.",
      actionLabel: "Browse products",
      actionHref: "products.html",
    });
    return;
  }

  let addresses = [];
  try { addresses = await listAddresses(); } catch { /* new address path still works */ }

  // Re-validate the coupon carried over from the cart (never trust a
  // stale handoff — §36). Invalid → drop it with a quiet note.
  let appliedCoupon = null;
  let couponNote = "";
  const stored = readStoredCoupon();
  if (stored?.code) {
    const subtotalForCoupon = computeTotals(lines).subtotalPaise;
    const revalidated = await validateCode(stored.code, subtotalForCoupon).catch(() => null);
    if (revalidated?.ok) {
      appliedCoupon = revalidated;
    } else {
      clearStoredCoupon();
      couponNote = "Your saved coupon isn’t valid for this cart, so it was removed.";
    }
  }

  const totals = computeTotals(lines, appliedCoupon);
  renderAddressStep(root, lines, addresses, totals, appliedCoupon, couponNote);
}

/* ---------- Step 1: address ---------- */
function renderAddressStep(root, lines, addresses, totals, appliedCoupon = null, couponNote = "") {
  root.innerHTML = `
    <div class="checkout-layout min-w-0">
      <section aria-labelledby="addr-title" class="panel min-w-0">
        <h2 id="addr-title">Delivery address</h2>
        ${addresses.length ? `
          <div class="saved-addresses js-saved" role="radiogroup" aria-label="Saved addresses">
            ${addresses.map((a, i) => `
              <div class="address-card ${i === 0 ? "selected" : ""}">
                <label>
                  <input type="radio" name="addr" value="${escapeHtml(a.id)}" ${i === 0 ? "checked" : ""} />
                  <span class="addr-body">
                    <strong>${escapeHtml(a.label)} — ${escapeHtml(a.receiver)}</strong>
                    <span>${escapeHtml(a.line1)}${a.line2 ? ", " + escapeHtml(a.line2) : ""}</span>
                    <span>${escapeHtml(a.city)}, ${escapeHtml(a.state)} ${escapeHtml(a.pincode)}</span>
                    <span class="muted" style="color:var(--ink-muted)">· ${escapeHtml(a.phone)}</span>
                  </span>
                </label>
              </div>`).join("")}
          </div>` : ""}

        <details ${addresses.length ? "" : "open"} class="js-new-addr">
          <summary style="cursor:pointer;font-weight:600;font-size:var(--text-sm)">${addresses.length ? "Use a new address" : "Add an address"}</summary>
          <form class="js-addr-form form-grid mt-4" novalidate>
            <div class="form-grid--2 grid gap-0 sm:grid-cols-2">
              <div class="field">
                <label for="af-receiver">Full name</label>
                <input id="af-receiver" name="receiver" autocomplete="name" />
                <p class="field-error" data-error-for="receiver"></p>
              </div>
              <div class="field">
                <label for="af-phone">Mobile number</label>
                <input id="af-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="10 digits" />
                <p class="field-error" data-error-for="phone"></p>
              </div>
            </div>
            <div class="field">
              <label for="af-line1">Flat / house no., building, street</label>
              <input id="af-line1" name="line1" autocomplete="address-line1" />
              <p class="field-error" data-error-for="line1"></p>
            </div>
            <div class="field">
              <label for="af-line2">Area, locality <span style="color:var(--ink-soft);font-weight:400">(optional)</span></label>
              <input id="af-line2" name="line2" autocomplete="address-line2" />
              <p class="field-error" data-error-for="line2"></p>
            </div>
            <div class="form-grid--2 grid gap-0 sm:grid-cols-2">
              <div class="field">
                <label for="af-pin">PIN code</label>
                <input id="af-pin" name="pincode" inputmode="numeric" autocomplete="postal-code" maxlength="6" />
                <p class="field-error" data-error-for="pincode"></p>
              </div>
              <div class="field">
                <label for="af-city">City / town</label>
                <input id="af-city" name="city" autocomplete="address-level2" />
                <p class="field-error" data-error-for="city"></p>
              </div>
            </div>
            <div class="form-grid--2 grid gap-0 sm:grid-cols-2">
              <div class="field">
                <label for="af-state">State</label>
                <input id="af-state" name="state" autocomplete="address-level1" value="Tamil Nadu" />
                <p class="field-error" data-error-for="state"></p>
              </div>
              <div class="field">
                <label for="af-landmark">Landmark <span style="color:var(--ink-soft);font-weight:400">(optional)</span></label>
                <input id="af-landmark" name="landmark" />
              </div>
            </div>
            <button type="submit" class="btn js-addr-continue">Save &amp; continue</button>
          </form>
        </details>
      </section>

      <aside class="summary-card min-w-0" aria-label="Order summary">
        <h2>Your order</h2>
        <ul class="order-items" style="margin-bottom:var(--space-4)">
          ${lines.map((l) => `
            <li class="order-item">
              <img src="${escapeHtml(l.product.images?.[0]?.url || "")}" alt="" width="56" height="56" />
              <span class="min-w-0 break-words">${escapeHtml(l.product.name)}<br /><span class="qty">× ${l.qty}</span></span>
              <span>${formatINR(l.product.pricePaise * l.qty)}</span>
            </li>`).join("")}
        </ul>
        <div class="summary-rows">
          <div><span class="muted">Items</span><span>${formatINR(totals.subtotalPaise)}</span></div>
          <div><span class="muted">Delivery</span><span>${totals.shippingPaise === 0 ? "Free" : formatINR(totals.shippingPaise)}</span></div>
        </div>
        <div class="summary-total flex-wrap"><span>Total</span><span>${formatINR(totals.totalPaise)}</span></div>
        <p class="summary-note">Cash on delivery — pay when the order arrives.</p>
        ${couponNote ? `<p class="coupon-msg coupon-msg--error">${escapeHtml(couponNote)}</p>` : ""}
      </aside>
    </div>`;

  // saved address selection
  root.querySelectorAll('input[name="addr"]').forEach((radio) =>
    radio.addEventListener("change", () => {
      root.querySelectorAll(".address-card").forEach((c) => c.classList.remove("selected"));
      radio.closest(".address-card").classList.add("selected");
    }));

  const form = qs(".js-addr-form", root);
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    const { ok, errors } = validateForm(form, {
      receiver: validators.name,
      phone: validators.phone,
      line1: validators.addressLine,
      pincode: validators.pincode,
      city: validators.city,
      state: validators.state,
    });
    if (!ok) { paintFieldErrors(form, errors); return; }

    const btn = form.querySelector(".js-addr-continue");
    btn.setAttribute("aria-busy", "true");
    try {
      const saved = await saveAddress(null, Object.fromEntries(new FormData(form)));
      toast("Address saved.", "ok");
      renderReviewStep(root, lines, saved, totals, appliedCoupon);
    } catch (err) {
      toast(err?.message || "Couldn’t save that address — check the fields.", "error");
    } finally {
      btn.removeAttribute("aria-busy");
    }
  });

  // selecting a saved address + pressing continue (details closed case)
  if (addresses.length) {
    const continueBtn = document.createElement("button");
    continueBtn.type = "button";
    continueBtn.className = "btn btn--secondary";
    continueBtn.textContent = "Deliver here";
    continueBtn.style.marginTop = "var(--space-4)";
    continueBtn.addEventListener("click", () => {
      const chosen = root.querySelector('input[name="addr"]:checked')?.value;
      const addr = addresses.find((a) => a.id === chosen) || addresses[0];
      renderReviewStep(root, lines, addr, totals, appliedCoupon);
    });
    qs(".js-saved", root)?.after(continueBtn);
  }
}

/* ---------- Step 2: review & place order ---------- */
function renderReviewStep(root, lines, address, totals, appliedCoupon = null) {
  document.querySelector('ol.steps li[aria-current="step"]')?.removeAttribute("aria-current");
  document.querySelectorAll("ol.steps li")[1]?.setAttribute("aria-current", "step");

  root.innerHTML = `
    <div class="checkout-layout min-w-0">
      <section class="panel min-w-0" aria-labelledby="review-title">
        <h2 id="review-title">Review &amp; place your order</h2>
        <div class="kv-grid" style="margin-bottom:var(--space-5)">
          <dt>Deliver to</dt>
          <dd>
            <strong>${escapeHtml(address.receiver)}</strong><br />
            ${escapeHtml(address.line1)}${address.line2 ? `, ${escapeHtml(address.line2)}` : ""}<br />
            ${address.landmark ? `${escapeHtml(address.landmark)}<br />` : ""}
            ${escapeHtml(address.city)}, ${escapeHtml(address.state)} — ${escapeHtml(address.pincode)}<br />
            ${escapeHtml(address.phone)}
            <div style="margin-top:var(--space-2)"><button type="button" class="addr-link js-change-addr">Change address</button></div>
          </dd>
          <dt>Payment</dt>
          <dd><strong>Cash on delivery</strong> — pay ${formatINR(totals.totalPaise)} when your order arrives.</dd>
          <dt>Estimated delivery</dt>
          <dd>Delivery timing will be confirmed after your order is placed.</dd>
        </div>

        <h3 style="font-size:var(--text-md);margin-bottom:var(--space-3)">Items</h3>
        <ul class="order-items">
          ${lines.map((l) => `
            <li class="order-item">
              <img src="${escapeHtml(l.product.images?.[0]?.url || "")}" alt="" width="56" height="56" />
              <span class="min-w-0 break-words">${escapeHtml(l.product.name)}<br /><span class="qty">× ${l.qty} · ${formatINR(l.product.pricePaise)} each</span></span>
              <span>${formatINR(l.product.pricePaise * l.qty)}</span>
            </li>`).join("")}
        </ul>

        <div class="summary-rows" style="margin-top:var(--space-5)">
          <div><span class="muted">Items</span><span>${formatINR(totals.subtotalPaise)}</span></div>
          ${totals.discountPaise > 0 ? `<div class="discount"><span>Coupon ${escapeHtml(appliedCoupon?.coupon?.code || "")}</span><span>− ${formatINR(totals.discountPaise)}</span></div>` : ""}
          <div><span class="muted">Delivery</span><span>${totals.shippingPaise === 0 ? "Free" : formatINR(totals.shippingPaise)}</span></div>
        </div>
        <div class="summary-total flex-wrap"><span>Total (pay on delivery)</span><span>${formatINR(totals.totalPaise)}</span></div>

        <button type="button" class="btn btn--block js-place-order" style="margin-top:var(--space-5)">
          Place order
        </button>
        <p class="summary-note" style="text-align:center">No payment now. We’ll call to confirm before packing.</p>
      </section>
    </div>`;

  qs(".js-change-addr").addEventListener("click", () => init()); // back to step 1

  qs(".js-place-order").addEventListener("click", async (e) => {
    const btn = e.target;
    btn.setAttribute("aria-busy", "true");
    btn.disabled = true;
    try {
      const result = await createOrder({
        lines,
        address,
        appliedCoupon,
        couponCode: appliedCoupon?.coupon?.code || null,
      });
      const { clearCart } = await import("../services/cart.js");
      await clearCart();
      clearStoredCoupon();
      window.location.href = `order.html?id=${encodeURIComponent(result.orderId)}&placed=1`;
    } catch (err) {
      console.warn("[kadai] order failed:", err?.code || err?.message);
      btn.removeAttribute("aria-busy");
      btn.disabled = false;
      toast(err?.message || "Your order couldn’t be placed — please try again.", "error", 5000);
    }
  });
}


