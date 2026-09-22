
/**
 * KADAI — password reset request (Phase 11)
 */

import { qs } from "../core/dom.js";
import { resetPassword } from "../services/auth.js";
import { validateForm, validators, paintFieldErrors, clearFieldErrors } from "../core/validate.js";

export async function init() {
  const form = qs(".js-forgot");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    const { ok, errors } = validateForm(form, { email: validators.email });
    if (!ok) { paintFieldErrors(form, errors); return; }

    const btn = qs(".js-submit");
    btn.setAttribute("aria-busy", "true");
    try {
      const message = await resetPassword(form.elements.email.value.trim());
      const result = qs(".js-form-result");
      result.hidden = false;
      result.textContent = message;
      result.style.color = "var(--success)";
      btn.disabled = true;
    } catch {
      const result = qs(".js-form-result");
      result.hidden = false;
      result.textContent = "Couldn’t send the reset link — check the address and try again.";
      result.style.color = "var(--error)";
    } finally {
      btn.removeAttribute("aria-busy");
    }
  });
}


