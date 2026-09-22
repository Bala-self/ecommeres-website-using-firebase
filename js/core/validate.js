
/**
 * KADAI — form validation (§50)
 * Returns per-field errors; the caller associates them with controls
 * and moves focus. Messages are specific and human ("Enter a valid
 * 6-digit PIN code", never "Invalid").
 */

export const validators = {
  required: (v) => (String(v).trim() ? null : "This field is required."),
  name: (v) => {
    const s = String(v).trim();
    if (!s) return "Enter a name.";
    if (s.length < 2) return "Name looks too short.";
    if (s.length > 80) return "Name must be under 80 characters.";
    return null;
  },
  email: (v) => {
    const s = String(v).trim();
    if (!s) return "Enter an email address.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return "Enter a valid email, e.g. you@example.com.";
    return null;
  },
  password: (v) => {
    const s = String(v);
    if (!s) return "Enter a password.";
    if (s.length < 8) return "Use at least 8 characters.";
    if (s.length > 72) return "Password must be under 72 characters.";
    return null;
  },
  phone: (v) => {
    const s = String(v).replace(/[\s-]/g, "");
    if (!s) return "Enter a phone number.";
    if (!/^(\+91)?[6-9]\d{9}$/.test(s)) return "Enter a valid 10-digit Indian mobile number.";
    return null;
  },
  pincode: (v) => {
    const s = String(v).trim();
    if (!s) return "Enter a PIN code.";
    if (!/^[1-9]\d{5}$/.test(s)) return "Enter a valid 6-digit PIN code.";
    return null;
  },
  addressLine: (v) => {
    const s = String(v).trim();
    if (!s) return "Enter the address.";
    if (s.length < 6) return "Address looks too short — add house/flat and street.";
    if (s.length > 160) return "Keep this line under 160 characters.";
    return null;
  },
  city: (v) => (String(v).trim() ? null : "Enter the city or town."),
  state: (v) => (String(v).trim() ? null : "Enter the state."),
  rating: (v) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 5) return "Pick a rating from 1 to 5 stars.";
    return null;
  },
  reviewText: (v) => {
    const s = String(v).trim();
    if (!s) return "Write a short review.";
    if (s.length < 10) return "Tell us a little more — at least 10 characters.";
    if (s.length > 1000) return "Keep reviews under 1000 characters.";
    return null;
  },
};

/**
 * Validate a form definition.
 * @param {HTMLFormElement} form
 * @param {Record<string, (v:any)=>string|null>} rules  field name → validator
 * @returns {{ok:boolean, errors:Record<string,string>}}
 */
export function validateForm(form, rules) {
  const errors = {};
  for (const [field, check] of Object.entries(rules)) {
    const control = form.elements[field];
    if (!control) continue;
    const message = check(control.value);
    if (message) errors[field] = message;
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

/**
 * Paint field errors into a form and return the first invalid control.
 * Expects each field to have an adjacent <p class="field-error" data-error-for="name">.
 */
export function paintFieldErrors(form, errors) {
  form.querySelectorAll(".field-error").forEach((p) => (p.textContent = ""));
  for (const [field, message] of Object.entries(errors)) {
    const control = form.elements[field];
    if (control) control.setAttribute("aria-invalid", "true");
    const slot = form.querySelector(`[data-error-for="${field}"]`);
    if (slot) slot.textContent = message;
  }
  const first = Object.keys(errors)[0];
  const focusTarget = first && form.elements[first];
  if (focusTarget?.focus) focusTarget.focus();
  return focusTarget || null;
}

export function clearFieldErrors(form) {
  form.querySelectorAll(".field-error").forEach((p) => (p.textContent = ""));
  form.querySelectorAll("[aria-invalid]").forEach((c) => c.removeAttribute("aria-invalid"));
}


