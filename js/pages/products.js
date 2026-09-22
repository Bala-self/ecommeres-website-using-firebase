
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

export async function init() {
  params = new URLSearchParams(location.search);
  buildFilters();
  qs(".js-sort")?.addEventListener("change", (e) => {
    params.set("sort", e.target.value);
    history.replaceState(null, "", `${location.pathname}?${params}`);
    reload();
  });
  qs(".js-filters-toggle")?.addEventListener("click", (e) => {
    const panel = qs(".js-filters-panel");
    const open = e.currentTarget.getAttribute("aria-expanded") === "true";
    e.currentTarget.setAttribute("aria-expanded", String(!open));
    panel.classList.toggle("is-open", !open);
  });
  await reload();
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

/** Quick category option row (① user request): one tap to browse categories.
 *  Preserves the search query; links drive the URL so state stays shareable. */
function renderCategoryChips(cats) {
  const wrap = qs(".js-chip-row");
  if (!wrap) return;
  const state = readState();
  const keep = state.q ? `?q=${encodeURIComponent(state.q)}` : "";
  wrap.innerHTML = `
    <a class="chip ${!state.categorySlug ? "chip--on" : ""}" href="products.html${keep}">All</a>
    ${cats.map((c) => `
      <a class="chip ${state.categorySlug === c.slug ? "chip--on" : ""}"
         href="products.html?category=${escapeHtml(c.slug)}${state.q ? `&q=${encodeURIComponent(state.q)}` : ""}"
         ${state.categorySlug === c.slug ? 'aria-current="true"' : ""}>${escapeHtml(c.name)}</a>`).join("")}`;
}

async function buildFilters() {
  const panel = qs(".js-filters-panel");
  if (!panel) return;
  const state = readState();
  let cats = [];
  try { cats = await listCategories(); } catch { /* filters degrade */ }

  renderCategoryChips(cats);

  const currentCat = cats.find((c) => c.slug === state.categorySlug);
  panel.innerHTML = `
    <fieldset>
      <legend>Category</legend>
      <label><input type="radio" name="f-cat" value="" ${!currentCat ? "checked" : ""}/> All categories</label>
      ${cats.map((c) => `
        <label><input type="radio" name="f-cat" value="${escapeHtml(c.slug)}" ${currentCat?.id === c.id ? "checked" : ""}/>
          ${escapeHtml(c.name)}</label>`).join("")}
    </fieldset>
    <fieldset>
      <legend>Price</legend>
      <label><input type="radio" name="f-price" value="" ${!state.band ? "checked" : ""}/> Any price</label>
      ${PRICE_BANDS.map((b) => `
        <label><input type="radio" name="f-price" value="${b.id}" ${state.band === b.id ? "checked" : ""}/>
          ${b.label}</label>`).join("")}
    </fieldset>
    <fieldset>
      <legend>Availability</legend>
      <label><input type="checkbox" name="f-avail" value="in" ${state.availability === "in" ? "checked" : ""}/> In stock only</label>
    </fieldset>`;

  panel.addEventListener("change", () => {
    const cat = panel.querySelector('input[name="f-cat"]:checked')?.value || "";
    const price = panel.querySelector('input[name="f-price"]:checked')?.value || "";
    const avail = panel.querySelector('input[name="f-avail"]:checked')?.value || "";
    cat ? params.set("category", cat) : params.delete("category");
    price ? params.set("price", price) : params.delete("price");
    avail ? params.set("availability", avail) : params.delete("availability");
    history.replaceState(null, "", `${location.pathname}?${params}`);
    reload();
  });
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
  if (state.categorySlug) chips.push({ label: `Category: ${state.categorySlug}`, clear: "category" });
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
      reload();
    }));
  wrap.querySelector(".js-clear-all")?.addEventListener("click", () => {
    history.replaceState(null, "", location.pathname);
    params = new URLSearchParams();
    buildFilters();
    reload();
  });
}


