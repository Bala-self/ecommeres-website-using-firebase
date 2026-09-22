
/**
 * KADAI — site header + footer (shared shell)
 * Rendered once per page into <header>/<footer> placeholders by main.js.
 * Header answers §13's five standing questions: where am I (aria-current),
 * what can I do (nav + search + cart/account), what happened (count badges).
 * Admin console is a single root page (admin.html) — all links are plain.
 */

import { escapeHtml } from "../core/dom.js";
import { currentUser, isAdmin, subscribe as onAuth } from "../services/auth.js";
import { subscribe as onCart, cartCount } from "../services/cart.js";
import { listActive } from "../services/categories.js";
import { isDemoEnv } from "../core/env-state.js";

const ACCOUNT_LINKS = () => {
  const user = currentUser();
  if (!user) {
    return `
      <a href="login.html">Sign in</a>
      <a href="register.html">Create account</a>`;
  }
  return `
    <p class="menu__label">Hi, ${escapeHtml(user.displayName || (user.email || "shopper").split("@")[0])}</p>
    <a href="account.html">Your account</a>
    <a href="orders.html">Your orders</a>
    <a href="wishlist.html">Wishlist</a>
    ${isAdmin() ? `<a href="admin.html">Admin console</a>` : ""}
    <button type="button" class="menu__signout js-signout">Sign out</button>`;
};

export function renderHeader(categoriesPromise) {
  const header = document.querySelector(".site-header");
  if (!header) return;

  header.innerHTML = `
    <div class="awning-edge" role="presentation"></div>
    ${isDemoEnv() ? `<p class="demo-banner">Offline preview — the live catalog couldn’t be reached. <span>Products load from Firebase once the connection is available.</span></p>` : ""}
    <div class="header-main container min-w-0">
      <button type="button" class="nav-toggle js-nav-toggle shrink-0" aria-expanded="false" aria-controls="primary-nav">
        <span class="u-visually-hidden">Menu</span>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" stroke="currentColor" stroke-width="2" fill="none"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>

      <a class="brand shrink-0" href="index.html" aria-label="Kadai — home">
        <span class="brand__name">Kadai</span>
        <span class="brand__tag" lang="ta">கடை</span>
      </a>

      <form class="search js-search min-w-0 w-full md:w-auto" action="products.html" role="search">
        <label class="u-visually-hidden" for="site-search">Search products</label>
        <input id="site-search" name="q" type="search" placeholder="Search products, brands and more…" autocomplete="off" />
        <button type="submit" aria-label="Search">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" stroke="currentColor" stroke-width="2" fill="none"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        </button>
      </form>

      <nav class="header-actions shrink-0" aria-label="Account and cart">
        <a class="header-action" href="wishlist.html" aria-label="Wishlist">
          <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7.5-4.9-9.7-9.2C.8 8.6 2.6 5 6.1 5c2 0 3.4 1 4.1 2.4h1.6C12.5 6 13.9 5 15.9 5c3.5 0 5.3 3.6 3.8 6.8C17.5 16.1 12 21 12 21z"/></svg>
          <span class="header-action__count js-wishlist-count" hidden></span>
        </a>
        <a class="header-action" href="cart.html" aria-label="Cart">
          <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>
          <span class="header-action__count js-cart-count" hidden></span>
        </a>
        <details class="account-menu js-account">
          <summary aria-label="Account menu">
            <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="3.4"/><path d="M5 20c.8-3.6 3.6-5.4 7-5.4s6.2 1.8 7 5.4"/></svg>
          </summary>
          <div class="menu__panel">${ACCOUNT_LINKS()}</div>
        </details>
      </nav>
    </div>

    <nav id="primary-nav" class="primary-nav" aria-label="Products">
      <ul class="container js-nav-list min-w-0"><!-- filled when categories resolve --></ul>
    </nav>
  `;

  // Wire interactions
  const toggle = header.querySelector(".js-nav-toggle");
  const nav = header.querySelector("#primary-nav");
  toggle?.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    nav.classList.toggle("is-open", !open);
  });

  header.querySelector(".js-signout")?.addEventListener("click", async () => {
    const { logout } = await import("../services/auth.js");
    const { toast } = await import("./toast.js");
    await logout();
    toast("Signed out.", "ok");
    window.location.href = `index.html`;
  });

  // close the account menu on outside click / Escape (§52)
  const details = header.querySelector(".js-account");
  document.addEventListener("click", (e) => {
    if (details?.open && !details.contains(e.target)) details.open = false;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && details?.open) {
      details.open = false;
      header.querySelector(".js-account summary")?.focus();
    }
  });

  // categories row (Firebase-driven; empty when catalog not reachable)
  categoriesPromise.then((cats) => {
    const list = header.querySelector(".js-nav-list");
    if (!list) return;
    const here = new URLSearchParams(location.search);
    const currentCategory = here.get("category");
    const currentPath = location.pathname.split("/").pop() || "index.html";
    list.innerHTML = `
      <li><a href="index.html" ${currentPath === "index.html" ? 'aria-current="page"' : ""}>Home</a></li>
      <li><a href="products.html" ${currentPath === "products.html" && !currentCategory && !here.get("q") ? 'aria-current="page"' : ""}>All products</a></li>
      ${cats.map((c) => `
        <li><a href="products.html?category=${escapeHtml(c.slug)}" ${
          currentPath === "products.html" && currentCategory === c.slug ? 'aria-current="page"' : ""
        }>${escapeHtml(c.name)}</a></li>`).join("")}
    `;
  });

  refreshCounts();
}

export async function refreshCounts() {
  const cartEl = document.querySelector(".js-cart-count");
  const wishEl = document.querySelector(".js-wishlist-count");
  if (cartEl) {
    try {
      const n = await cartCount();
      cartEl.hidden = n === 0;
      cartEl.textContent = String(n);
    } catch (e) {
      cartEl.hidden = true;
      console.warn("[kadai] cart badge unavailable:", e?.code || e?.message);
    }
  }
  if (wishEl) {
    try {
      const { count } = await import("../services/wishlist.js");
      const n = await count();
      wishEl.hidden = n === 0;
      wishEl.textContent = String(n);
    } catch (e) {
      wishEl.hidden = true;
      console.warn("[kadai] wishlist badge unavailable:", e?.code || e?.message);
    }
  }
}

export function renderFooter() {
  const footer = document.querySelector(".site-footer");
  if (!footer) return;
  footer.innerHTML = `
    <div class="container footer-grid">
      <div class="footer-brand">
        <p class="brand__name">Kadai</p>
        <p>Discover products across categories and order online with convenient delivery.</p>
        <p class="footer-muted">Serving customers in Chennai, Tamil Nadu</p>
      </div>
      <div>
        <h2 class="footer-heading">Explore</h2>
        <ul class="footer-links">
          <li><a href="products.html">All products</a></li>
          <li><a href="cart.html">Cart</a></li>
          <li><a href="wishlist.html">Wishlist</a></li>
          <li><a href="orders.html">Track orders</a></li>
        </ul>
      </div>
      <div>
        <h2 class="footer-heading">Shopping information</h2>
        <ul class="footer-links">
          <li>Cash on delivery</li>
          <li>Returns accepted within 7 days</li>
          <li>Prices include GST</li>
        </ul>
        <p class="footer-muted">Cash on delivery is currently available. Online payment is coming soon.</p>
      </div>
    </div>
  `;
}

/** Re-render the account menu on auth changes; keep badges live for both
 *  cart AND wishlist mutations (audit round 2 fix: wishlist had no subscriber). */
export function bindHeaderAuth() {
  onAuth(() => {
    const panel = document.querySelector(".js-account .menu__panel");
    if (panel) panel.innerHTML = ACCOUNT_LINKS();
    document.querySelector(".js-signout")?.addEventListener("click", async () => {
      const { logout } = await import("../services/auth.js");
      await logout();
      window.location.href = `index.html`;
    });
  });
  onCart(refreshCounts);
  import("../services/wishlist.js").then(({ subscribe }) => subscribe(refreshCounts));
}


