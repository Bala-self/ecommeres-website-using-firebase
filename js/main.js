
/**
 * KADAI — application entry / boot sequence
 * Order matters: env → auth → guest-cart merge at the login boundary
 * → shell (header/footer) → page module (body[data-page] → js/pages/*).
 */

import { resolveEnvironment } from "./core/env.js";
import { setEnv } from "./core/env-state.js";
import { initToastRegion } from "./components/toast.js";
import { renderHeader, renderFooter, bindHeaderAuth, refreshCounts } from "./components/header.js";
import { initAuth, currentUser, subscribe as onAuth } from "./services/auth.js";
import { mergeGuestCartOnLogin, subscribe as onCart } from "./services/cart.js";
import { mergeGuestWishlistOnLogin } from "./services/wishlist.js";
import { listActive } from "./services/categories.js";

let categoriesPromise;

async function boot() {
  // 1 — environment (never throws; offline → honest empty states).
  // NOTE: no local/demo product data exists by design — the catalog
  // lives ONLY in Firebase (user requirement, audit round 2).
  const env = await resolveEnvironment();
  setEnv(env);

  // 3 — auth session (Firebase listener or local demo session)
  initAuth();

  // 4 — shell + status region
  initToastRegion();
  categoriesPromise = listActive().catch((e) => {
    console.warn("[kadai] categories unavailable:", e?.message || e?.code || e, e);
    return [];
  });
  renderHeader(categoriesPromise);
  renderFooter();
  bindHeaderAuth();
  bindMergeOnAuth();
  onCart(refreshCounts);

  // 5 — merge any guest cart/wishlist now (demo resolves sync; Firebase
  // resolves asynchronously via bindMergeOnAuth below)
  if (currentUser()) {
    await runMerge();
    refreshCounts();
  }

  // 6 — hand off to the page module (body[data-page])
  const pageId = document.body.dataset.page;
  if (pageId) {
    try {
      const mod = await import(`./pages/${pageId}.js`);
      if (typeof mod.init === "function") await mod.init();
    } catch (e) {
      if (String(e?.message || "").includes("Failed to fetch")) {
        console.warn(`[kadai] page module for "${pageId}" unavailable (offline?)`);
      } else {
        console.error(`[kadai] page "${pageId}" failed:`, e);
        const main = document.querySelector("main");
        const pageRegion = main?.querySelector(`.js-${pageId}-root`);
        const errorMarkup =
          '<div class="error-state" role="alert"><p class="error-state__title">This page didn’t load</p><p class="error-state__message">Please refresh. If it keeps failing, the error has been logged.</p></div>';
        if (pageRegion) pageRegion.innerHTML = errorMarkup;
        else if (main) main.insertAdjacentHTML("afterbegin", errorMarkup);
      }
    }
  }

  console.info(`[kadai] boot complete · env=${env.mode} (${env.reason})`);
}

async function runMerge() {
  const user = currentUser();
  if (!user) return;
  try {
    await mergeGuestCartOnLogin(user.uid);
  } catch (e) {
    console.warn("[kadai] cart merge deferred:", e?.code || e?.message);
  }
  try {
    await mergeGuestWishlistOnLogin(user.uid);
  } catch (e) {
    console.warn("[kadai] wishlist merge deferred:", e?.code || e?.message);
  }
}

/** Merge once per login event (not on every auth emit). */
let mergedFor = null;
function bindMergeOnAuth() {
  onAuth(async (user) => {
    if (user && mergedFor !== user.uid) {
      mergedFor = user.uid;
      await runMerge();
      refreshCounts();
    }
    if (!user) mergedFor = null;
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}


