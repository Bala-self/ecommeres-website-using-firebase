
/**
 * KADAI — create account (Phase 11)
 */

import { qs } from "../core/dom.js";
import { isDemoEnv } from "../core/env-state.js";
import { register } from "../services/auth.js";
import { validateForm, validators, paintFieldErrors, clearFieldErrors } from "../core/validate.js";
import { friendlyAuthError } from "../components/states.js";
import { toast } from "../components/toast.js";

function nextHref() {
  const next = new URLSearchParams(location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "index.html";
}

export async function init() {
  const form = qs(".js-register");
  const demo = isDemoEnv();

  if (demo) {
    qs(".js-demo-note").hidden = false;
    qs(".js-password-field").style.display = "none";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    const rules = { name: validators.name, email: validators.email };
    if (!demo) rules.password = validators.password;
    const { ok, errors } = validateForm(form, rules);
    if (!ok) { paintFieldErrors(form, errors); return; }

    const btn = qs(".js-submit");
    btn.setAttribute("aria-busy", "true");
    try {
      await register({
        name: form.elements.name.value,
        email: form.elements.email.value,
        password: form.elements.password?.value || "demo",
      });
      toast("Account created — welcome in.", "ok");
      window.location.href = nextHref();
    } catch (err) {
      btn.removeAttribute("aria-busy");
      const banner = qs(".js-form-error");
      banner.hidden = false;
      banner.textContent = friendlyAuthError(err);
    }
  });
}


