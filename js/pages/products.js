
/**
 * KADAI — product listing / search results (Phases 08–09)
 * URL is the state: ?category=slug&q=text&sort=…&availability=…&max=rupees
 * Filters combine predictably, active filters are visible and removable (§29),
 * sorting never destroys filter state (§30). Server-side paging with
 * "Load more" (§58 — no full-catalog downloads on the Firebase path).
 */

import { qs, escapeHtml } from "../core/dom.js";
import { listActive, search } from "../services/products.js";
import { listActive as listCategories } from "../services/categories.js";
import { productCard } from "../components/productCard.js";
import { skeletonGrid, emptyState, errorState } from "../components/states.js";
import { formatINR } from "../core/format.js";
import { bindCardActions } from "./home.js";

const PRICE_BANDS = [
  { id: "under500", label: "Under ₹500", maxPaise: 50000 },
  { id: "500to1000", label: "₹500 – ₹1,000", minPaise: 50000, maxPaise: 100000 },
  { id: "1000plus", label: "Over ₹1,000", minPaise: 100000 },
];
const SORTS = new Set(["featured", "newest", "price-asc", "price-desc"]);

let params;
let allLoaded = [];
let cachedCategories = [];

export async function init() {
  params = new URLSearchParams(location.search);

  try {
    cachedCategories = await listCategories();
  } catch {
    cachedCategories = [];
  }

  buildFilters();
  updateFiltersCount();

  qs(".js-sort")?.addEventListener("change", (e) => {
    params.set("sort", e.target.value);
    history.replaceState(null, "", `${location.pathname}?${params}`);
    reload();
  });

  const toggleBtn = qs(".js-filters-toggle");
  toggleBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = toggleBtn.getAttribute("aria-expanded") === "true";
    setFiltersOpen(!open);
  });

  document.addEventListener("click", (e) => {
    const panel = qs(".js-filters-panel");
    const toggle = qs(".js-filters-toggle");
    if (!panel || !panel.classList.contains("is-open")) return;
    if (!panel.contains(e.target) && !toggle?.contains(e.target)) {
      setFiltersOpen(false);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setFiltersOpen(false);
    }
  });

  await reload();
}

function setFiltersOpen(isOpen) {
  const panel = qs(".js-filters-panel");
  const toggle = qs(".js-filters-toggle");
  if (!panel || !toggle) return;
  toggle.setAttribute("aria-expanded", String(isOpen));
  panel.classList.toggle("is-open", isOpen);
}

function getActiveFilterCount() {
  const state = readState();
  let count = 0;
  if (state.categorySlug) count++;
  if (state.band) count++;
  if (state.availability === "in") count++;
  return count;
}

function updateFiltersCount() {
  const count = getActiveFilterCount();
  const toggle = qs(".js-filters-toggle");
  const badge = qs(".js-filters-count-badge");
  const panelCount = qs(".js-filters-active-count");

  if (badge) {
    if (count > 0) {
      badge.textContent = String(count);
      badge.hidden = false;
      toggle?.classList.add("is-active");
    } else {
      badge.textContent = "";
      badge.hidden = true;
      toggle?.classList.remove("is-active");
    }
  }

  if (panelCount) {
    panelCount.textContent = count > 0 ? `(${count} active)` : "";
  }
}

function readState() {
  const requestedSort = params.get("sort") || "featured";
  return {
    q: (params.get("q") || "").trim(),
    categorySlug: params.get("category") || "",
    sort: SORTS.has(requestedSort) ? requestedSort : "featured",
    availability: params.get("availability") || "",
    band: params.get("price") || "",
  };
}

function timestampValue(value) {
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (Number.isFinite(value?.seconds)) return value.seconds * 1000;
  if (Number.isFinite(value)) return value;
  return 0;
}

function sortItems(items, sort) {
  return items.slice().sort((a, b) => {
    if (sort === "price-asc") return (a.pricePaise ?? Infinity) - (b.pricePaise ?? Infinity);
    if (sort === "price-desc") return (b.pricePaise ?? -Infinity) - (a.pricePaise ?? -Infinity);
    if (sort === "newest") return timestampValue(b.createdAt) - timestampValue(a.createdAt);
    return Number(b.featured === true) - Number(a.featured === true) ||
      timestampValue(a.createdAt) - timestampValue(b.createdAt);
  });
}

function buildFilters() {
  const panel = qs(".js-filters-panel");
  if (!panel) return;
  const state = readState();
  const currentCat = cachedCategories.find((c) => c.slug === state.categorySlug);

  panel.innerHTML = `
    <div class="filters-panel__header">
      <div class="filters-panel__title-wrap">
        <h3 class="filters-panel__title">Filter products</h3>
        <span class="filters-panel__count js-filters-active-count"></span>
      </div>
      <div class="filters-panel__header-actions">
        <button type="button" class="addr-link js-panel-clear-all">Clear all</button>
        <button type="button" class="icon-btn js-filters-close" aria-label="Close filters">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
    <div class="filters-panel__grid">
      <fieldset class="filters-group">
        <legend>Category</legend>
        <div class="filters-group__options">
          <label><input type="radio" name="f-cat" value="" ${!currentCat ? "checked" : ""}/> All categories</label>
          ${cachedCategories.map((c) => `
            <label><input type="radio" name="f-cat" value="${escapeHtml(c.slug)}" ${currentCat?.id === c.id ? "checked" : ""}/>
              ${escapeHtml(c.name)}</label>`).join("")}
        </div>
      </fieldset>
      <fieldset class="filters-group">
        <legend>Price</legend>
        <div class="filters-group__options">
          <label><input type="radio" name="f-price" value="" ${!state.band ? "checked" : ""}/> Any price</label>
          ${PRICE_BANDS.map((b) => `
            <label><input type="radio" name="f-price" value="${b.id}" ${state.band === b.id ? "checked" : ""}/>
              ${b.label}</label>`).join("")}
        </div>
      </fieldset>
      <fieldset class="filters-group">
        <legend>Availability</legend>
        <div class="filters-group__options">
          <label><input type="checkbox" name="f-avail" value="in" ${state.availability === "in" ? "checked" : ""}/> In stock only</label>
        </div>
      </fieldset>
    </div>
    <div class="filters-panel__footer">
      <button type="button" class="btn btn--secondary btn--sm js-panel-clear-all">Clear all</button>
      <button type="button" class="btn btn--sm js-filters-done">View results</button>
    </div>`;

  panel.onchange = (e) => {
    if (e.target.matches("input")) {
      const cat = panel.querySelector('input[name="f-cat"]:checked')?.value || "";
      const price = panel.querySelector('input[name="f-price"]:checked')?.value || "";
      const avail = panel.querySelector('input[name="f-avail"]:checked')?.value || "";

      cat ? params.set("category", cat) : params.delete("category");
      price ? params.set("price", price) : params.delete("price");
      avail ? params.set("availability", avail) : params.delete("availability");

      history.replaceState(null, "", `${location.pathname}?${params}`);
      updateFiltersCount();
      reload();
    }
  };

  panel.querySelectorAll(".js-panel-clear-all").forEach((btn) => {
    btn.onclick = () => {
      params.delete("category");
      params.delete("price");
      params.delete("availability");
      history.replaceState(null, "", `${location.pathname}?${params}`);
      buildFilters();
      updateFiltersCount();
      reload();
    };
  });

  const closeBtn = panel.querySelector(".js-filters-close");
  if (closeBtn) closeBtn.onclick = () => setFiltersOpen(false);

  const doneBtn = panel.querySelector(".js-filters-done");
  if (doneBtn) doneBtn.onclick = () => setFiltersOpen(false);

  updateFiltersCount();
}

function clientFilter(items) {
  const state = readState();
  let out = items;
  const band = PRICE_BANDS.find((b) => b.id === state.band);
  if (band) {
    out = out.filter((p) => p.pricePaise != null &&
      (band.minPaise == null || p.pricePaise >= band.minPaise) &&
      (band.maxPaise == null || p.pricePaise <= band.maxPaise));
  }
  if (state.availability === "in") out = out.filter((p) => !Number.isInteger(p.stock) || p.stock > 0);
  return out;
}

function renderHead(cats) {
  const state = readState();
  const head = qs(".js-page-head");
  const crumbs = qs(".breadcrumbs ol");
  if (state.q) {
    head.innerHTML = `<h1>Results for “${escapeHtml(state.q)}”</h1>
      <p class="page-head__lede">Search covers names and keywords. No matches? Try a shorter word.</p>`;
    crumbs.innerHTML = `<li><a href="index.html">Home</a></li><li aria-current="page">Search</li>`;
    document.title = `Search: ${state.q} — Kadai`;
  } else if (state.categorySlug && cats) {
    const cat = cats.find((c) => c.slug === state.categorySlug);
    head.innerHTML = `<h1>${escapeHtml(cat?.name || "Products")}</h1>
      <p class="page-head__lede">${escapeHtml(cat?.description || "")}</p>`;
    crumbs.innerHTML = `<li><a href="index.html">Home</a></li>
      <li><a href="products.html">Products</a></li><li aria-current="page">${escapeHtml(cat?.name || "")}</li>`;
    document.title = `${cat?.name || "Products"} — Kadai`;
  }
}

async function reload() {
  const state = readState();
  const results = qs(".js-results");
  const sortSel = qs(".js-sort");
  if (sortSel) sortSel.value = state.sort;
  results.innerHTML = skeletonGrid(8);
  qs(".js-load-more").innerHTML = "";
  renderActiveFilters();

  try {
    const cats = await listCategories().catch(() => []);
    renderHead(cats);

    let items, nextCursor;
    if (state.q) {
      items = await search(state.q);
      nextCursor = null;
    } else {
      let catId = null;
      if (state.categorySlug) {
        const cat = cats.find((c) => c.slug === state.categorySlug);
        if (!cat) {
          results.innerHTML = emptyState({
            title: "That category doesn’t exist",
            message: "It may have been renamed.",
            actionLabel: "Browse all products",
            actionHref: "products.html",
          });
          qs(".js-count").textContent = "";
          return;
        }
        catId = cat.id;
      }
      const page = await listActive({ categoryId: catId, sort: state.sort, pageSize: 12 });
      items = page.items;
      nextCursor = page.nextCursor;
    }

    allLoaded = clientFilter(sortItems(items, state.sort));
    renderPage(nextCursor);
  } catch (e) {
    console.warn("[kadai] listing failed:", e?.message || e?.code || e, e);
    results.innerHTML = errorState();
    results.querySelector("[data-retry]")?.addEventListener("click", reload);
  }
}

function renderPage(nextCursor) {
  const results = qs(".js-results");
  const countEl = qs(".js-count");
  countEl.textContent = allLoaded.length
    ? `${allLoaded.length} product${allLoaded.length === 1 ? "" : "s"}`
    : "";

  if (!allLoaded.length) {
    results.innerHTML = emptyState({
      title: "Nothing matched",
      message: "No products matched this combination. Remove a filter or try another word.",
      actionLabel: "Clear all filters",
      actionHref: "products.html",
    });
    return;
  }

  results.innerHTML = `<ul class="product-grid">
    ${allLoaded.map((p) => productCard(p)).join("")}
  </ul>`;
  bindCardActions(results);

  qs(".js-load-more").innerHTML = nextCursor
    ? '<button type="button" class="btn btn--secondary js-more">Load more</button>'
    : "";
  qs(".js-load-more .js-more")?.addEventListener("click", async (e) => {
    e.target.setAttribute("aria-busy", "true");
    try {
      const state = readState();
      const catId = state.categorySlug
        ? (await listCategories()).find((c) => c.slug === state.categorySlug)?.id
        : null;
      const page = await listActive({ categoryId: catId, sort: state.sort, pageSize: 12, cursor: nextCursor });
      const filtered = clientFilter(page.items);
      allLoaded = sortItems(allLoaded.concat(filtered), state.sort);
      renderPage(page.nextCursor);
    } finally {
      e.target.removeAttribute("aria-busy");
    }
  });
}

function renderActiveFilters() {
  const state = readState();
  const wrap = qs(".js-active-filters");
  const chips = [];
  if (state.q) chips.push({ label: `Search: ${state.q}`, clear: "q" });
  if (state.categorySlug) {
    const cat = cachedCategories.find((c) => c.slug === state.categorySlug);
    chips.push({ label: `Category: ${cat?.name || state.categorySlug}`, clear: "category" });
  }
  if (state.band) {
    chips.push({ label: `Price: ${PRICE_BANDS.find((b) => b.id === state.band)?.label}`, clear: "price" });
  }
  if (state.availability === "in") chips.push({ label: "In stock only", clear: "availability" });
  if (state.sort && state.sort !== "featured") chips.push({ label: `Sort: ${state.sort}`, clear: "sort" });

  wrap.innerHTML = chips.length
    ? chips.map((c) => `<span class="chip">${escapeHtml(c.label)}
        <button type="button" data-clear="${c.clear}" aria-label="Remove filter ${escapeHtml(c.label)}">×</button></span>`).join("") +
      `<button type="button" class="addr-link js-clear-all">Clear all</button>`
    : "";
  wrap.querySelectorAll("[data-clear]").forEach((btn) =>
    btn.addEventListener("click", () => {
      params.delete(btn.dataset.clear);
      history.replaceState(null, "", `${location.pathname}?${params}`);
      buildFilters();
      updateFiltersCount();
      reload();
    }));
  wrap.querySelector(".js-clear-all")?.addEventListener("click", () => {
    history.replaceState(null, "", location.pathname);
    params = new URLSearchParams();
    buildFilters();
    updateFiltersCount();
    reload();
  });
}

