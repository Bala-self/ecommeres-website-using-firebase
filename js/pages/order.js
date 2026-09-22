
/**
 * KADAI — order detail + truthful confirmation (Phases 16/17)
 * ?placed=1 shows the confirmation voice: "Order placed" —
 * NEVER "payment successful" (§37/§89).
 */

import { qs, escapeHtml } from "../core/dom.js";
import { currentUser, authReady } from "../services/auth.js";
import { getOwned } from "../services/orders.js";
import { formatINR, formatDateTime } from "../core/format.js";
import { emptyState } from "../components/states.js";

const FLOW = ["placed", "processing", "shipped", "delivered"];
const STATUS_LABEL = {
  placed: "Order placed",
  processing: "Being packed",
  shipped: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export async function init() {
  const root = qs(".js-order-root");
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const justPlaced = params.get("placed") === "1";

  if (!id) {
    root.innerHTML = emptyState({ title: "Order not found", actionLabel: "Your orders", actionHref: "orders.html" });
    return;
  }

  await authReady(); // auth-hydration barrier (audit round 2 fix)
  let outcome;
  try {
    outcome = await getOwned(id);
  } catch (e) {
    console.warn("[kadai] order load failed:", e?.code || e?.message);
    root.innerHTML = emptyState({
      title: "This order couldn’t load",
      message: "Please try again in a moment.",
      actionLabel: "Retry",
      actionHref: location.pathname + location.search,
    });
    return;
  }
  const { order, reason } = outcome;
  if (!order) {
    root.innerHTML = reason === "forbidden" && !currentUser()
      ? emptyState({ title: "Sign in to view this order", actionLabel: "Sign in", actionHref: `login.html?next=${encodeURIComponent(location.pathname + location.search)}` })
      : emptyState({
          title: reason === "forbidden" ? "This isn’t your order" : "Order not found",
          message: reason === "forbidden" ? "You can only view your own orders." : "Check the link, or see all your orders.",
          actionLabel: "Your orders",
          actionHref: "orders.html",
        });
    return;
  }

  renderOrder(root, order, justPlaced);
}

function renderOrder(root, order, justPlaced) {
  document.title = `Order ${order.orderNumber} — Kadai`;
  const a = order.shippingAddress || {};
  const cancelled = order.status === "cancelled";
  const historyDates = new Map(
    (order.statusHistory || []).map((h) => [h.status, h.atIso])
  );

  root.innerHTML = `
    ${justPlaced ? `
      <div class="confirm-hero" style="margin-bottom:var(--space-6)">
        <h1>Order placed ✓</h1>
        <p class="order-ref">${escapeHtml(order.orderNumber)}</p>
        <p style="color:var(--ink-muted);margin-top:var(--space-2)">
          We’ll call <strong>${escapeHtml(a.phone || "you")}</strong> to confirm before packing.
        </p>
        <div class="payment-note">
          <strong>Payment:</strong> cash on delivery — you pay ${formatINR(order.totalPaise)} when the
          order reaches your door. Online payment isn’t set up yet, so nothing has been charged.
        </div>
        <a class="btn" style="margin-top:var(--space-5)" href="products.html">Continue shopping</a>
      </div>` : `
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <ol><li><a href="orders.html">Your orders</a></li><li aria-current="page">${escapeHtml(order.orderNumber)}</li></ol>
      </nav>`}

    <div class="page-head">
      <h1 style="${justPlaced ? "position:absolute;width:1px;height:1px;overflow:hidden;clip:inset(50%)" : ""}">Order ${escapeHtml(order.orderNumber)}</h1>
      ${justPlaced ? "" : `<span class="status-chip status-chip--${escapeHtml(order.status)}">${escapeHtml(STATUS_LABEL[order.status] || order.status)}</span>`}
      <p class="page-head__lede">Placed ${formatDateTime(order.createdAt || order.createdAtMs)}</p>
    </div>

    <div class="detail-panels">
      <section class="panel" aria-labelledby="oi-title">
        <h2 id="oi-title">Items</h2>
        <ul class="order-items">
          ${order.items.map((it) => `
            <li class="order-item">
              <img src="${escapeHtml(it.image || "")}" alt="" width="56" height="56" />
              <span><a href="product.html?id=${escapeHtml(it.productId)}" style="color:inherit">${escapeHtml(it.name)}</a><br />
                <span class="qty">× ${it.qty} · ${formatINR(it.priceAtPurchasePaise)} at purchase</span></span>
              <span>${formatINR(it.priceAtPurchasePaise * it.qty)}</span>
            </li>`).join("")}
        </ul>
        <div class="summary-rows" style="margin-top:var(--space-4)">
          <div><span class="muted">Items</span><span>${formatINR(order.itemsSubtotalPaise)}</span></div>
          ${order.discountPaise > 0 ? `<div class="discount"><span>Coupon ${escapeHtml(order.couponCode || "")}</span><span>− ${formatINR(order.discountPaise)}</span></div>` : ""}
          <div><span class="muted">Delivery</span><span>${order.shippingPaise === 0 ? "Free" : formatINR(order.shippingPaise)}</span></div>
        </div>
        <div class="summary-total"><span>Total (pay on delivery)</span><span>${formatINR(order.totalPaise)}</span></div>
      </section>

      <section class="panel" aria-labelledby="da-title">
        <h2 id="da-title">Delivery address</h2>
        <p>
          <strong>${escapeHtml(a.receiver || "")}</strong><br />
          ${escapeHtml(a.line1 || "")}${a.line2 ? `, ${escapeHtml(a.line2)}` : ""}<br />
          ${a.landmark ? `${escapeHtml(a.landmark)}<br />` : ""}
          ${escapeHtml(a.city || "")}, ${escapeHtml(a.state || "")} — ${escapeHtml(a.pincode || "")}<br />
          ${escapeHtml(a.phone || "")}
        </p>
      </section>

      <section class="panel" aria-labelledby="st-title">
        <h2 id="st-title">Status</h2>
        ${cancelled ? `<p><span class="status-chip status-chip--cancelled">Cancelled</span></p>` : `
          <ul class="timeline">
            ${FLOW.map((s) => `
              <li class="${order.status === s ? "current" : ""}">
                <span>${STATUS_LABEL[s]}</span>
                ${historyDates.get(s) ? `<span class="t-date">${formatDateTime(historyDates.get(s))}</span>` : ""}
              </li>`).join("")}
          </ul>`}
        <p class="summary-note">Payment status: ${escapeHtml(order.paymentStatus || "NOT_IMPLEMENTED")} —
          this marketplace currently accepts payment on delivery.</p>
      </section>
    </div>`;
}


