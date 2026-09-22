
/**
 * KADAI — price calculation (§35)
 * The ONE place totals are computed. Pure functions — no DOM, no Firebase.
 * NOTE (§39): with no Cloud Functions, the client computes order totals.
 * This is a documented [SECURITY GAP — BACKEND VALIDATION REQUIRED] for
 * any future online-prepayment release. For the current pay-on-delivery
 * order-request flow the admin reviews every order before processing.
 */

import { shippingConfig } from "../data/business-config.js";

/**
 * @param {Array<{product: {pricePaise:number}, qty:number}>} lines
 * @returns {{subtotalPaise:number}}
 */
export function subtotalOf(lines) {
  return lines.reduce((sum, l) => {
    const price = Number(l.product?.pricePaise);
    const qty = Math.max(0, Math.min(99, Number(l.qty) || 0));
    return sum + (Number.isFinite(price) ? price : 0) * qty;
  }, 0);
}

/**
 * Validate a coupon against the rules; returns discount in paise.
 * Mirrors the coupon document schema (§36). Client-side only —
 * trusted validation must move server-side with payment (§90).
 * @param {{type:string,value:number,minOrderPaise:number,maxDiscountPaise:number,active:boolean,expiresAt:*}|null} coupon
 * @param {number} subtotalPaise
 * @returns {{ok:boolean, reason?:string, discountPaise?:number}}
 */
export function applyCoupon(coupon, subtotalPaise) {
  if (!coupon || coupon.active !== true) return { ok: false, reason: "This code isn’t valid." };

  if (coupon.expiresAt) {
    const exp = new Date(coupon.expiresAt.seconds ? coupon.expiresAt.seconds * 1000 : coupon.expiresAt);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
      return { ok: false, reason: "This code has expired." };
    }
  }
  const min = Number(coupon.minOrderPaise) || 0;
  if (subtotalPaise < min) {
    return { ok: false, reason: `Add items worth ₹${Math.ceil((min - subtotalPaise) / 100)} more to use this code.` };
  }

  let discount = 0;
  if (coupon.type === "percent") {
    discount = Math.round((subtotalPaise * Math.min(100, Math.max(0, coupon.value))) / 100);
  } else if (coupon.type === "flat") {
    discount = Math.round(Number(coupon.value) || 0);
  } else {
    return { ok: false, reason: "This code isn’t valid." };
  }

  if (Number.isFinite(coupon.maxDiscountPaise) && coupon.maxDiscountPaise > 0) {
    discount = Math.min(discount, coupon.maxDiscountPaise);
  }
  discount = Math.min(discount, subtotalPaise);
  return { ok: true, discountPaise: discount };
}

/**
 * Full totals pipeline: items → subtotal → discount → shipping → total.
 * Shipping never applies to a cart that costs nothing after discounts
 * (scenario sweep fix: a fully-discounted cart used to be charged the
 * flat fee anyway).
 * @param {Array<{product:{pricePaise:number}, qty:number}>} lines
 * @param {{ok:boolean,discountPaise?:number}|null} appliedCoupon
 * @returns {{subtotalPaise:number, discountPaise:number, shippingPaise:number, totalPaise:number}}
 */
export function computeTotals(lines, appliedCoupon = null) {
  const subtotalPaise = subtotalOf(lines);
  const discountPaise = appliedCoupon?.ok ? Math.min(appliedCoupon.discountPaise, subtotalPaise) : 0;
  const afterDiscount = subtotalPaise - discountPaise;
  const shippingPaise =
    afterDiscount <= 0
      ? 0
      : afterDiscount >= shippingConfig.freeThresholdPaise ? 0 : shippingConfig.flatPaise;
  return {
    subtotalPaise,
    discountPaise,
    shippingPaise,
    totalPaise: afterDiscount + shippingPaise,
  };
}


