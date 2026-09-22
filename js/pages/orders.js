
/**
 * KADAI — order history (Phase 17)
 */

import { qs, escapeHtml } from "../core/dom.js";
import { currentUser, authReady } from "../services/auth.js";
import { listForUser } from "../services/orders.js";
import { formatINR, formatDate } from "../core/format.js";
import { emptyState } from "../components/states.js";

const STATUS_LABEL = {
  placed: "Order placed",
  processing: "Being packed",
  shipped: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export async function init() {
  const root = qs(".js-orders-root");
  await authReady(); // auth-hydration barrier (audit round 2 fix)
  const user = currentUser();
  if (!user) {
    const next = encodeURIComponent("/orders.html");
    root.innerHTML = emptyState({
      title: "Sign in to see your orders",
      actionLabel: "Sign in",
      actionHref: `login.html?next=${next}`,
    });
    return;
  }

  let orders;
  try {
    orders = await listForUser(user.uid);
  } catch (e) {
    console.warn("[kadai] orders load failed:", e?.code || e?.message);
    root.innerHTML = emptyState({
      title: "Your orders couldn’t load",
      message: "Please try again in a moment.",
      actionLabel: "Retry",
      actionHref: "orders.html",
    });
    return;
  }

  if (!orders.length) {
    root.innerHTML = emptyState({
      title: "No orders yet",
      message: "When you place an order it will show up here.",
      actionLabel: "Start shopping",
      actionHref: "products.html",
    });
    return;
  }

  root.innerHTML = `
    <ul class="cart-lines">
      ${orders.map((o) => `
        <li class="cart-line min-w-0 grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div class="min-w-0">
            <a class="cart-line__name break-words" href="order.html?id=${escapeHtml(o.id)}">${escapeHtml(o.orderNumber)}</a>
            <p class="cart-line__price">${formatDate(o.createdAt?.seconds ? o.createdAt : o.createdAtMs || o.createdAt)} · ${o.items.length} item${o.items.length === 1 ? "" : "s"}</p>
          </div>
          <span class="status-chip status-chip--${escapeHtml(o.status)}">${escapeHtml(STATUS_LABEL[o.status] || o.status)}</span>
          <span class="font-bold shrink-0">${formatINR(o.totalPaise)}</span>
        </li>`).join("")}
    </ul>`;
}


