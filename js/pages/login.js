
/**
 * KADAI — sign in (Phase 11)
 * Demo mode hides the password field entirely (passwordless local
 * accounts) — the form tells the truth about the backend behind it.
 */

import { qs } from "../core/dom.js";
import { isDemoEnv } from "../core/env-state.js";
import { login, isDemoAuth } from "../services/auth.js";
import { validateForm, validators, paintFieldErrors, clearFieldErrors } from "../core/validate.js";
import { friendlyAuthError } from "../components/states.js";
import { toast } from "../components/toast.js";
import { cartCount } from "../services/cart.js";

function nextHref() {
  const next = new URLSearchParams(location.search).get("next");
  // only allow same-site relative paths (open-redirect guard)
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "index.html";
}

export async function init() {
  const form = qs(".js-login");
  const demo = isDemoEnv();

  if (demo) {
    qs(".js-demo-note").hidden = false;
    qs(".js-password-field").style.display = "none";
    form.elements.password.value = "demo";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    const rules = { email: validators.email };
    if (!demo) rules.password = validators.required;
    const { ok, errors } = validateForm(form, rules);
    if (!ok) { paintFieldErrors(form, errors); return; }

    const btn = qs(".js-submit");
    btn.setAttribute("aria-busy", "true");
    try {
      await login({
        email: form.elements.email.value,
        password: form.elements.password.value,
      });
      // Guest cart/wishlist merge is handled centrally in main.js on the
      // auth event (single merge caller — audit round 2 fix); the
      // destination page's boot also re-checks it.
      toast("Signed in.", "ok");
      window.location.href = nextHref();
    } catch (err) {
      btn.removeAttribute("aria-busy");
      const banner = qs(".js-form-error");
      banner.hidden = false;
      banner.textContent = friendlyAuthError(err);
    }
  });
}


