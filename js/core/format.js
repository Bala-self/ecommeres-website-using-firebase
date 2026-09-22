
/**
 * KADAI — formatting helpers
 * Money is integer paise everywhere (§ data model); formatting is the
 * only place rupees exist. Dates render in en-IN.
 */

const inr0 = new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
});
const inr2 = new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2,
});

/** @param {number} paise @returns {string} e.g. ₹1,299 or ₹1,299.50 */
export function formatINR(paise) {
  if (typeof paise !== "number" || !Number.isFinite(paise)) return "—";
  const rupees = paise / 100;
  return paise % 100 === 0 ? inr0.format(rupees) : inr2.format(rupees);
}

/** @param {Date|{seconds:number}|null} value */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** @param {Date|{seconds:number}|null} value @returns {string} e.g. 21 Sep 2026 */
export function formatDate(value) {
  const d = toDate(value);
  return d
    ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";
}

export function formatDateTime(value) {
  const d = toDate(value);
  return d
    ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
        ", " + d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
    : "—";
}


