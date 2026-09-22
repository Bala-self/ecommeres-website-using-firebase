
/**
 * KADAI — account: profile + address book (Phase 12)
 */

import { qs, escapeHtml } from "../core/dom.js";
import { currentUser, authReady } from "../services/auth.js";
import { getProfile, updateProfile, listAddresses, saveAddress, deleteAddress } from "../services/users.js";
import { validateForm, validators, paintFieldErrors, clearFieldErrors } from "../core/validate.js";
import { emptyState } from "../components/states.js";
import { toast } from "../components/toast.js";

export async function init() {
  const root = qs(".js-account-root");
  await authReady();
  const user = currentUser();
  if (!user) {
    root.innerHTML = emptyState({
      title: "Sign in to manage your account",
      actionLabel: "Sign in",
      actionHref: `login.html?next=${encodeURIComponent("/account.html")}`,
    });
    return;
  }

  let profile = null;
  let addresses = [];
  try {
    [profile, addresses] = await Promise.all([getProfile(), listAddresses()]);
  } catch (e) {
    console.warn("[kadai] account load failed:", e?.code || e?.message);
  }

  root.innerHTML = `
    <div class="detail-panels min-w-0 max-w-[860px]">
      <section class="panel min-w-0" aria-labelledby="prof-title">
        <h2 id="prof-title">Profile</h2>
        <form class="js-profile form-grid form-grid--2" novalidate>
          <div class="field">
            <label for="pf-name">Name</label>
            <input id="pf-name" name="name" value="${escapeHtml(profile?.name || "")}" autocomplete="name" />
            <p class="field-error" data-error-for="name"></p>
          </div>
          <div class="field">
            <label for="pf-phone">Mobile number</label>
            <input id="pf-phone" name="phone" type="tel" inputmode="numeric" value="${escapeHtml(profile?.phone || "")}" autocomplete="tel" placeholder="10 digits" />
            <p class="field-error" data-error-for="phone"></p>
          </div>
          <div class="field">
            <label for="pf-email">Email <span style="color:var(--ink-soft);font-weight:400">(sign-in identity — not editable here)</span></label>
            <input id="pf-email" value="${escapeHtml(profile?.email || user.email)}" disabled />
          </div>
          <div class="flex items-end">
            <button type="submit" class="btn js-profile-save">Save profile</button>
          </div>
        </form>
      </section>

      <section class="panel min-w-0" aria-labelledby="addr-title">
        <h2 id="addr-title">Delivery addresses</h2>
        <div class="address-grid js-addr-grid">
          ${addresses.length ? addresses.map((a) => `
            <div class="address-card" data-id="${escapeHtml(a.id)}">
              <h3>${escapeHtml(a.label)}</h3>
              <p>${escapeHtml(a.receiver)}<br />
                ${escapeHtml(a.line1)}${a.line2 ? `, ${escapeHtml(a.line2)}` : ""}<br />
                ${escapeHtml(a.city)}, ${escapeHtml(a.state)} — ${escapeHtml(a.pincode)}<br />
                ${escapeHtml(a.phone)}</p>
              <div class="addr-actions">
                <button type="button" class="addr-link js-addr-del">Remove</button>
              </div>
            </div>`).join("") : `<p style="color:var(--ink-muted);font-size:var(--text-sm)">No saved addresses yet.</p>`}
        </div>

        <form class="js-addr-add form-grid form-grid--2 mt-6" novalidate>
          <h3 class="text-base col-span-full mb-0">Add an address</h3>
          <div class="field">
            <label for="na-label">Label</label>
            <input id="na-label" name="label" placeholder="Home / Office" value="Home" />
          </div>
          <div class="field">
            <label for="na-receiver">Full name</label>
            <input id="na-receiver" name="receiver" autocomplete="name" />
            <p class="field-error" data-error-for="receiver"></p>
          </div>
          <div class="field">
            <label for="na-phone">Mobile number</label>
            <input id="na-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" />
            <p class="field-error" data-error-for="phone"></p>
          </div>
          <div class="field">
            <label for="na-pin">PIN code</label>
            <input id="na-pin" name="pincode" inputmode="numeric" maxlength="6" autocomplete="postal-code" />
            <p class="field-error" data-error-for="pincode"></p>
          </div>
          <div class="field col-span-full">
            <label for="na-line1">Flat / house no., building, street</label>
            <input id="na-line1" name="line1" autocomplete="address-line1" />
            <p class="field-error" data-error-for="line1"></p>
          </div>
          <div class="field">
            <label for="na-city">City / town</label>
            <input id="na-city" name="city" autocomplete="address-level2" />
            <p class="field-error" data-error-for="city"></p>
          </div>
          <div class="field">
            <label for="na-state">State</label>
            <input id="na-state" name="state" autocomplete="address-level1" value="Tamil Nadu" />
            <p class="field-error" data-error-for="state"></p>
          </div>
          <div class="flex items-end">
            <button type="submit" class="btn btn--secondary js-addr-save">Save address</button>
          </div>
        </form>
      </section>
    </div>`;

  // profile save
  const pf = qs(".js-profile");
  pf.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(pf);
    const { ok, errors } = validateForm(pf, { name: validators.name, phone: validators.phone });
    if (!ok) { paintFieldErrors(pf, errors); return; }
    const btn = pf.querySelector(".js-profile-save");
    btn.setAttribute("aria-busy", "true");
    try {
      await updateProfile({ name: pf.elements.name.value, phone: pf.elements.phone.value });
      toast("Profile saved.", "ok");
    } catch {
      toast("Couldn’t save your profile — try again.", "error");
    } finally {
      btn.removeAttribute("aria-busy");
    }
  });

  // address add
  const af = qs(".js-addr-add");
  af.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(af);
    const { ok, errors } = validateForm(af, {
      receiver: validators.name, phone: validators.phone,
      line1: validators.addressLine, pincode: validators.pincode,
      city: validators.city, state: validators.state,
    });
    if (!ok) { paintFieldErrors(af, errors); return; }
    const btn = af.querySelector(".js-addr-save");
    btn.setAttribute("aria-busy", "true");
    try {
      await saveAddress(null, Object.fromEntries(new FormData(af)));
      toast("Address saved.", "ok");
      init(); // re-render with the new card
    } catch {
      toast("Couldn’t save that address — check the fields.", "error");
    } finally {
      btn.removeAttribute("aria-busy");
    }
  });

  // address remove
  root.querySelectorAll(".js-addr-del").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      const card = e.target.closest("[data-id]");
      await deleteAddress(card.dataset.id);
      toast("Address removed.", "ok");
      init();
    }));
}


