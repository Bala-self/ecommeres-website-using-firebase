/**
 * KADAI — post-login coupon notice
 * The session flag carries the notice across the login redirect once.
 */

import { demoCoupon } from "../data/business-config.js";
import { formatINR } from "../core/format.js";

const NOTICE_KEY = "kadai.login.coupon-notice";

export function markCouponNoticeForNextPage() {
  try { sessionStorage.setItem(NOTICE_KEY, "1"); } catch { /* private mode */ }
}

function consumeNoticeFlag() {
  try {
    if (sessionStorage.getItem(NOTICE_KEY) !== "1") return false;
    sessionStorage.removeItem(NOTICE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function showPendingCouponNotice() {
  if (!consumeNoticeFlag() || document.querySelector(".coupon-notice")) return;

  const notice = document.createElement("aside");
  notice.className = "coupon-notice";
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "polite");
  notice.innerHTML = `
    <div class="coupon-notice__content">
      <p class="coupon-notice__eyebrow">Welcome back</p>
      <p class="coupon-notice__title">A little saving for your next order</p>
      <p class="coupon-notice__copy">
        Use <strong class="coupon-notice__code">${demoCoupon.code}</strong>
        for ${demoCoupon.value}% off orders ${formatINR(demoCoupon.minOrderPaise)}+
        ${demoCoupon.maxDiscountPaise ? `(max ${formatINR(demoCoupon.maxDiscountPaise)})` : ""}.
      </p>
    </div>
    <button type="button" class="coupon-notice__close" aria-label="Dismiss coupon notice">×</button>
  `;
  document.body.appendChild(notice);

  const close = () => {
    if (notice.classList.contains("is-dismissed")) return;
    notice.classList.add("is-dismissed");
    window.setTimeout(() => notice.remove(), 220);
  };

  notice.querySelector(".coupon-notice__close")?.addEventListener("click", close);
  window.setTimeout(close, 9000);
  requestAnimationFrame(() => notice.classList.add("is-visible"));
}
