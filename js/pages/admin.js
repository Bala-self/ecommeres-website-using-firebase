
/**
 * KADAI — admin console (Phase 20, §44)
 * Order management is the visually dominant job (no vanity KPI cards).
 * Access: role from the user's profile — UI guard here is UX only;
 * Firestore rules are the enforcement (§24). A newly promoted admin can
 * unlock the console live via "Re-check my admin role" (refreshRole).
 */

import { qs, escapeHtml } from "../core/dom.js";
import { currentUser, isAdmin, authReady } from "../services/auth.js";
import { isDemoEnv } from "../core/env-state.js";
import { adminList, adminSetStatus, nextStatuses } from "../services/orders.js";
import { listAllForAdmin, adminSave as saveProduct } from "../services/products.js";
import { listAllForAdmin as listCategories, adminSave as saveCategory } from "../services/categories.js";
import { listPending, moderate } from "../services/reviews.js";
import { listAll as listCoupons, save as saveCoupon } from "../services/coupons.js";
import { formatINR, formatDate } from "../core/format.js";
import { emptyState } from "../components/states.js";
import { toast } from "../components/toast.js";

const TABS = [
  { id: "orders", label: "Orders" },
  { id: "products", label: "Products" },
  { id: "categories", label: "Categories" },
  { id: "reviews", label: "Reviews" },
  { id: "coupons", label: "Coupons" },
];

const STATUS_LABEL = {
  placed: "Order placed",
  processing: "Being packed",
  shipped: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/**
 * Images can be stored as direct HTTPS URLs without Firebase Storage.
 * Bundled paths under /assets/ are also valid and remain same-origin after
 * Firebase Hosting deployment.
 */
function normalizeImageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw, window.location.href);
    const localAsset = url.origin === window.location.origin && url.pathname.startsWith("/assets/");
    return url.protocol === "https:" || localAsset ? raw : null;
  } catch {
    return null;
  }
}

export async function init() {
  const root = qs(".js-admin-root");
  const demo = isDemoEnv();

  // Wait for Firebase auth to resolve — a signed-in admin used to be shown
  // "Admin access only" when this page raced the auth listener (video bug).
  await authReady();
  if (!demo && !isAdmin()) {
    const user = currentUser();
    root.innerHTML = `
      <div class="empty-state">
        <p class="empty-state__title">Admin access only</p>
        <p class="empty-state__message">${
          user
            ? "This account doesn’t have admin rights yet."
            : "Sign in with an admin account to open the console."
        }</p>
        ${
          user
            ? '<button type="button" class="btn btn--secondary" id="js-recheck-role">Re-check my admin role</button>'
            : '<a class="btn" href="login.html?next=%2Fadmin.html">Sign in</a>'
        }
      </div>
      ${
        user
          ? `<p class="admin-note" style="max-width:640px;display:block">Your sign-in UID: <strong>${escapeHtml(user.uid)}</strong><br />
              In Firebase console → Firestore → <strong>users</strong>, there must be a document whose ID is
              EXACTLY this UID, containing a field <strong>role</strong> (string) = <strong>admin</strong>.
              Just added it? Tap “Re-check my admin role” — no sign-out needed.</p>`
          : ""
      }
    `;
    qs("#js-recheck-role")?.addEventListener("click", async (e) => {
      e.target.setAttribute("aria-busy", "true");
      try {
        const { refreshRole } = await import("../services/auth.js");
        const promoted = await refreshRole();
        if (promoted) {
          toast("Admin rights confirmed — opening the console.", "ok");
          await init();
        } else {
          toast("Still not admin — check that the users document ID equals your UID and role = “admin”.", "error", 6000);
        }
      } catch {
        toast("Couldn’t check admin access — try again.", "error");
      } finally {
        e.target.removeAttribute("aria-busy");
      }
    });
    return;
  }

  const tab = new URLSearchParams(location.search).get("tab") || "orders";
  const valid = TABS.some((t) => t.id === tab) ? tab : "orders";

  root.innerHTML = `
    ${demo ? '<p class="admin-note">Offline preview — this console is editing device-local data because the live catalog couldn’t be reached.</p>' : ""}
    <div class="admin-head">
      <h1 style="font-size:var(--text-2xl)">Admin console</h1>
      ${!demo ? '<button type="button" class="btn btn--secondary btn--sm js-seed" hidden>Load sample products</button>' : ""}
    </div>
    <nav class="admin-tabs" aria-label="Admin sections">
      ${TABS.map((t) => `<a href="?tab=${t.id}" ${t.id === valid ? 'aria-current="page"' : ""}>${t.label}</a>`).join("")}
    </nav>
    <div class="js-admin-panel min-w-0"><div class="region-loading" role="status"><span class="spinner" aria-hidden="true"></span>Loading…</div></div>
  `;

  const panel = qs(".js-admin-panel");
  try {
    if (valid === "orders") await renderOrders(panel);
    else if (valid === "products") await renderProducts(panel);
    else if (valid === "categories") await renderCategories(panel);
    else if (valid === "reviews") await renderReviews(panel);
    else if (valid === "coupons") await renderCoupons(panel);
  } catch (e) {
    console.warn("[kadai] admin panel failed:", e?.code || e?.message);
    panel.innerHTML = emptyState({ title: "This panel couldn’t load", message: "Check permissions and try again." });
  }

  if (!demo) {
    const { seedFirebaseCatalog } = await import("../services/seed.js");
    const { listActive } = await import("../services/products.js");
    const probe = await listActive({ pageSize: 1 });
    const seedBtn = qs(".js-seed");
    if (seedBtn) seedBtn.hidden = probe.items.length > 0;
    seedBtn?.addEventListener("click", async () => {
      seedBtn.setAttribute("aria-busy", "true");
      try {
        const result = await seedFirebaseCatalog();
        toast(result.ok ? `Loaded ${result.count} sample products. Check the Products tab.` : result.reason, result.ok ? "ok" : "error", 5000);
      } catch {
        toast("The sample catalog could not be loaded — check Firebase permissions.", "error", 5000);
      } finally {
        seedBtn.removeAttribute("aria-busy");
      }
    });
  }
}

/* ================= ORDERS (dominant view) ================= */
async function renderOrders(panel) {
  const orders = await adminList(100);
  if (!orders.length) {
    panel.innerHTML = emptyState({ title: "No orders yet", message: "Orders appear here as soon as customers place them.", actionLabel: "Browse products", actionHref: "products.html" });
    return;
  }
  panel.innerHTML = `
    <div class="admin-table-wrap min-w-0">
      <table class="admin-table">
        <caption class="u-visually-hidden">Orders, newest first</caption>
        <thead><tr>
          <th scope="col">Order</th><th scope="col">Placed</th><th scope="col">Customer</th>
          <th scope="col">Items</th><th scope="col" class="num">Total</th><th scope="col">Status</th><th scope="col">Update status</th>
        </tr></thead>
        <tbody>
          ${orders.map((o) => `
            <tr data-order="${escapeHtml(o.id)}">
              <td><a href="order.html?id=${escapeHtml(o.id)}"><strong>${escapeHtml(o.orderNumber)}</strong></a></td>
              <td>${formatDate(o.createdAt || o.createdAtMs)}</td>
              <td>${escapeHtml(o.shippingAddress?.receiver || o.userEmail || "—")}<br />
                <span style="color:var(--ink-soft);font-size:var(--text-xs)">${escapeHtml(o.shippingAddress?.phone || "")}</span></td>
              <td>${o.items.length}</td>
              <td class="num">${formatINR(o.totalPaise)}</td>
              <td><span class="status-chip status-chip--${escapeHtml(o.status)}">${escapeHtml(STATUS_LABEL[o.status] || o.status)}</span></td>
              <td>${(() => {
                const next = nextStatuses(o.status);
                if (!next.length) return '<span style="color:var(--ink-soft);font-size:var(--text-xs)">Final</span>';
                return `<label class="u-visually-hidden" for="st-${escapeHtml(o.id)}">Set status</label>
                  <select id="st-${escapeHtml(o.id)}" class="js-set-status" data-id="${escapeHtml(o.id)}">
                    <option value="">Select status…</option>
                    ${next.map((s) => `<option value="${s}">${STATUS_LABEL[s] || s}</option>`).join("")}
                  </select>`;
              })()}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;

  panel.querySelectorAll(".js-set-status").forEach((sel) =>
    sel.addEventListener("change", async () => {
      const id = sel.dataset.id;
      const next = sel.value;
      if (!next) return;
      sel.disabled = true;
      try {
        await adminSetStatus(id, next); // service derives history server-side
        toast(`Order updated: ${STATUS_LABEL[next] || next}.`, "ok");
        await renderOrders(panel);
      } catch (err) {
        toast(err?.message || "Status update failed.", "error");
        sel.disabled = false;
      }
    }));
}

/* ================= PRODUCTS ================= */
async function renderProducts(panel) {
  const products = await listAllForAdmin();
  panel.innerHTML = `
    <div class="form-card w-full max-w-[720px]">
      <h2 id="np-title">${products.length ? "Add / update a product" : "Add your first product"}</h2>
      <form class="js-p-form form-grid" novalidate>
        <div class="form-grid--2 grid gap-0 sm:grid-cols-2">
          <div class="field">
            <label for="pr-name">Name</label>
            <input id="pr-name" name="name" required />
            <p class="field-error" data-error-for="name"></p>
          </div>
          <div class="field">
            <label for="pr-id">Product ID <span style="color:var(--ink-soft);font-weight:400">(slug — e.g. steel-tiffin)</span></label>
            <input id="pr-id" name="id" pattern="[a-z0-9-]+" required />
            <p class="field-error" data-error-for="id"></p>
          </div>
        </div>
        <div class="form-grid--2 grid gap-0 sm:grid-cols-2">
          <div class="field">
            <label for="pr-price">Price (₹)</label>
            <input id="pr-price" name="priceRupees" type="number" min="1" step="1" required />
            <p class="field-error" data-error-for="priceRupees"></p>
          </div>
          <div class="field">
            <label for="pr-stock">Stock</label>
            <input id="pr-stock" name="stock" type="number" min="0" step="1" required />
            <p class="field-error" data-error-for="stock"></p>
          </div>
        </div>
        <div class="form-grid--2 grid gap-0 sm:grid-cols-2">
          <div class="field">
            <label for="pr-cat">Category</label>
            <select id="pr-cat" name="categoryId" required>
              ${(await listCategories()).map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="pr-img-url">Image URL <span style="color:var(--ink-soft);font-weight:400">(direct HTTPS link or assets/ path)</span></label>
            <input id="pr-img-url" name="imageUrl" type="url" inputmode="url"
              placeholder="https://example.com/product.webp or assets/products/item.jpg" />
            <p class="hint">The URL is saved in Firestore. Firebase Storage is not required.</p>
            <p class="field-error" data-error-for="imageUrl"></p>
          </div>
        </div>
        <div class="field">
          <label for="pr-desc">Short description</label>
          <input id="pr-desc" name="descriptionShort" maxlength="140" />
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button type="submit" class="btn js-p-save">Save product</button>
          <img class="row-img-preview js-img-preview" alt="" hidden />
        </div>
      </form>
    </div>

    <div class="admin-table-wrap min-w-0">
      <table class="admin-table">
        <caption class="u-visually-hidden">All products including inactive</caption>
        <thead><tr><th scope="col"></th><th scope="col">Name</th><th scope="col" class="num">Price</th><th scope="col" class="num">Stock</th><th scope="col">Visible</th><th scope="col">Source</th></tr></thead>
        <tbody>
          ${products.map((p) => `
            <tr data-product="${escapeHtml(p.id)}">
              <td><img class="row-thumb" src="${escapeHtml(p.images?.[0]?.url || "")}" alt="" /></td>
              <td><strong>${escapeHtml(p.name)}</strong><br /><span style="color:var(--ink-soft);font-size:var(--text-xs)">${escapeHtml(p.id)} · ${escapeHtml(p.categoryId || "")}</span></td>
              <td class="num">${formatINR(p.pricePaise)}</td>
              <td class="num">
                <label class="u-visually-hidden" for="stk-${escapeHtml(p.id)}">Stock for ${escapeHtml(p.name)}</label>
                <input id="stk-${escapeHtml(p.id)}" class="js-stock" data-id="${escapeHtml(p.id)}" type="number" min="0" step="1" value="${Number(p.stock) || 0}" style="width:76px;min-height:36px;border:1px solid var(--border-strong);border-radius:4px;padding:0 8px" />
              </td>
              <td>
                <label style="display:flex;gap:6px;align-items:center;font-size:var(--text-sm)">
                  <input type="checkbox" class="js-active" data-id="${escapeHtml(p.id)}" data-name="${escapeHtml(p.name)}" ${p.active ? "checked" : ""} /> visible
                </label>
              </td>
              <td>${p.seeded ? '<span class="status-chip status-chip--pending">sample</span>' : '<span class="status-chip status-chip--published">custom</span>'}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;

  // image preview + save
  const form = qs(".js-p-form", panel);
  const preview = qs(".js-img-preview", panel);
  let imageUrl = "";
  form.elements.imageUrl.addEventListener("input", () => {
    const value = normalizeImageUrl(form.elements.imageUrl.value);
    imageUrl = value || "";
    if (!value) {
      preview.hidden = true;
      return;
    }
    preview.src = value;
    preview.hidden = false;
  });
  preview.addEventListener("error", () => {
    preview.hidden = true;
    toast("That image URL could not be loaded. Check that it is a direct image link.", "error", 5000);
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const errors = {};
    if (!data.name?.trim()) errors.name = "Enter a product name.";
    if (!/^[a-z0-9-]{2,60}$/.test(data.id || "")) errors.id = "Use lowercase letters, numbers and dashes (e.g. steel-tiffin).";
    const rupees = Number(data.priceRupees);
    if (!Number.isInteger(rupees) || rupees < 1) errors.priceRupees = "Enter a whole-rupee price of at least ₹1.";
    const stock = Number(data.stock);
    if (!Number.isInteger(stock) || stock < 0) errors.stock = "Stock must be 0 or more.";
    const submittedImageUrl = normalizeImageUrl(data.imageUrl);
    if (data.imageUrl?.trim() && !submittedImageUrl) {
      errors.imageUrl = "Use a direct HTTPS image URL or a path under assets/.";
    }
    if (Object.keys(errors).length) {
      for (const [f, msg] of Object.entries(errors)) {
        const slot = form.querySelector(`[data-error-for="${f}"]`);
        if (slot) slot.textContent = msg;
      }
      return;
    }
    const btn = form.querySelector(".js-p-save");
    btn.setAttribute("aria-busy", "true");
    try {
      const existing = products.find((p) => p.id === data.id.trim());
      await saveProduct(data.id.trim(), {
        name: data.name.trim(),
        slug: data.id.trim(),
        categoryId: data.categoryId,
        descriptionShort: data.descriptionShort?.trim() || "",
        descriptionLong: data.descriptionShort?.trim() || "",
        pricePaise: rupees * 100,
        compareAtPricePaise: null,
        stock,
        images: submittedImageUrl ? [{ url: submittedImageUrl, alt: data.name.trim() }] : (existing?.images || []),
        keywords: data.name.toLowerCase().split(/\s+/),
        featured: false, newArrival: false, active: true,
        ratingAvg: null, ratingCount: 0,
      });
      toast(`Product “${data.name.trim()}” saved.`, "ok");
      renderProducts(panel);
    } catch (err) {
      toast(err?.message || "Save failed — check rules/permissions.", "error", 5000);
    } finally {
      btn.removeAttribute("aria-busy");
    }
  });

  // stock edits (commit on change)
  panel.querySelectorAll(".js-stock").forEach((input) =>
    input.addEventListener("change", async () => {
      const id = input.dataset.id;
      const stock = Number(input.value);
      if (!Number.isInteger(stock) || stock < 0) { toast("Stock must be 0 or more.", "error"); return; }
      try {
        await saveProduct(id, { stock });
        toast("Stock updated.", "ok");
      } catch {
        toast("Stock could not be updated — check permissions and try again.", "error");
      }
    }));

  // activate / deactivate
  panel.querySelectorAll(".js-active").forEach((chk) =>
    chk.addEventListener("change", async () => {
      try {
        await saveProduct(chk.dataset.id, { active: chk.checked });
        toast(`${chk.dataset.name} is now ${chk.checked ? "visible" : "hidden"}.`, "ok");
      } catch {
        chk.checked = !chk.checked;
        toast("Visibility could not be updated — check permissions and try again.", "error");
      }
    }));
}

/* ================= CATEGORIES ================= */
async function renderCategories(panel) {
  const cats = await listCategories();
  panel.innerHTML = `
    <div class="form-card w-full max-w-[720px]">
      <h2>Add a category</h2>
      <form class="js-c-form form-grid form-grid--2" novalidate>
        <div class="field">
          <label for="ct-name">Name</label>
          <input id="ct-name" name="name" required />
        </div>
        <div class="field">
          <label for="ct-id">Category ID (slug)</label>
          <input id="ct-id" name="id" pattern="[a-z0-9-]+" required placeholder="e.g. lighting" />
        </div>
        <div class="field col-span-full">
          <label for="ct-desc">Description</label>
          <input id="ct-desc" name="description" maxlength="140" />
        </div>
        <div class="flex items-end">
          <button type="submit" class="btn js-c-save">Save category</button>
        </div>
      </form>
    </div>
    <div class="admin-table-wrap min-w-0">
      <table class="admin-table">
        <thead><tr><th scope="col">Name</th><th scope="col">ID</th><th scope="col">Active</th></tr></thead>
        <tbody>
          ${cats.map((c) => `
            <tr>
              <td><strong>${escapeHtml(c.name)}</strong><br /><span style="color:var(--ink-soft);font-size:var(--text-xs)">${escapeHtml(c.description || "")}</span></td>
              <td>${escapeHtml(c.id)}</td>
              <td><label style="display:flex;gap:6px;align-items:center;font-size:var(--text-sm)">
                <input type="checkbox" class="js-cat-active" data-id="${escapeHtml(c.id)}" ${c.active ? "checked" : ""} /> visible</label></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;

  qs(".js-c-form", panel).addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (!data.name?.trim() || !/^[a-z0-9-]{2,40}$/.test(data.id || "")) {
      toast("Enter a name and a slug ID (lowercase, dashes).", "error");
      return;
    }
    try {
      await saveCategory(data.id.trim(), {
        name: data.name.trim(), slug: data.id.trim(),
        description: data.description?.trim() || "", active: true,
      });
      toast("Category saved.", "ok");
      await renderCategories(panel);
    } catch {
      toast("Category could not be saved — check permissions and try again.", "error");
    }
  });

  panel.querySelectorAll(".js-cat-active").forEach((chk) =>
    chk.addEventListener("change", async () => {
      try {
        const cat = (await listCategories()).find((c) => c.id === chk.dataset.id);
        await saveCategory(chk.dataset.id, { ...cat, active: chk.checked });
        toast("Category updated.", "ok");
      } catch {
        chk.checked = !chk.checked;
        toast("Category visibility could not be updated.", "error");
      }
    }));
}

/* ================= REVIEWS ================= */
async function renderReviews(panel) {
  const pending = await listPending();
  if (!pending.length) {
    panel.innerHTML = emptyState({ title: "Moderation queue is empty", message: "New reviews land here for approval before they appear publicly." });
    return;
  }
  panel.innerHTML = `
    <ul class="review-list">
      ${pending.map((r) => `
        <li class="review" data-review="${escapeHtml(r.id)}">
          <div class="review__head flex-wrap">
            <span class="review__name">${escapeHtml(r.userDisplayName)}</span>
            <span><span class="stars" aria-hidden="true">${"★".repeat(r.rating)}</span> ${formatDate(r.createdAtMs || r.createdAt)}</span>
          </div>
          <p class="review__text">${escapeHtml(r.text)}</p>
          <p style="color:var(--ink-soft);font-size:var(--text-xs);margin-top:var(--space-2)">on product ${escapeHtml(r.productId)}</p>
          <div class="flex flex-wrap gap-3 mt-3">
            <button type="button" class="btn btn--sm js-approve" data-id="${escapeHtml(r.id)}">Approve</button>
            <button type="button" class="btn btn--sm btn--danger js-reject" data-id="${escapeHtml(r.id)}">Reject</button>
          </div>
        </li>`).join("")}
    </ul>`;

  panel.querySelectorAll(".js-approve").forEach((b) =>
    b.addEventListener("click", async () => {
      try {
        await moderate(b.dataset.id, "published");
        toast("Review published.", "ok");
        await renderReviews(panel);
      } catch {
        toast("Review could not be published.", "error");
      }
    }));
  panel.querySelectorAll(".js-reject").forEach((b) =>
    b.addEventListener("click", async () => {
      try {
        await moderate(b.dataset.id, "rejected");
        toast("Review rejected.", "ok");
        await renderReviews(panel);
      } catch {
        toast("Review could not be rejected.", "error");
      }
    }));
}

/* ================= COUPONS ================= */
async function renderCoupons(panel) {
  const coupons = await listCoupons();
  panel.innerHTML = `
    <div class="form-card w-full max-w-[720px]">
      <h2>Add a coupon</h2>
      <form class="js-cp-form form-grid form-grid--2" novalidate>
        <div class="field">
          <label for="cp-code">Code</label>
          <input id="cp-code" name="code" style="text-transform:uppercase" required placeholder="FESTIVE10" />
        </div>
        <div class="field">
          <label for="cp-type">Type</label>
          <select id="cp-type" name="type"><option value="percent">Percent off</option><option value="flat">Flat ₹ off</option></select>
        </div>
        <div class="field">
          <label for="cp-value">Value (percent or ₹)</label>
          <input id="cp-value" name="value" type="number" min="1" required />
        </div>
        <div class="field">
          <label for="cp-min">Minimum order (₹)</label>
          <input id="cp-min" name="minRupees" type="number" min="0" value="0" />
        </div>
        <div class="field">
          <label for="cp-max">Max discount (₹, for percent type)</label>
          <input id="cp-max" name="maxRupees" type="number" min="0" value="0" />
        </div>
        <div class="flex items-end">
          <button type="submit" class="btn js-cp-save">Save coupon</button>
        </div>
      </form>
    </div>
    <div class="admin-table-wrap min-w-0">
      <table class="admin-table">
        <thead><tr><th scope="col">Code</th><th scope="col">Discount</th><th scope="col">Min order</th><th scope="col">Active</th></tr></thead>
        <tbody>
          ${coupons.map((c) => `
            <tr>
              <td><strong>${escapeHtml(c.code)}</strong></td>
              <td>${c.type === "percent" ? `${c.value}%` : formatINR(c.value)}${c.maxDiscountPaise ? ` <span style="color:var(--ink-soft);font-size:var(--text-xs)">(max ${formatINR(c.maxDiscountPaise)})</span>` : ""}</td>
              <td>${c.minOrderPaise ? formatINR(c.minOrderPaise) : "—"}</td>
              <td><span class="status-chip ${c.active ? "status-chip--published" : "status-chip--rejected"}">${c.active ? "active" : "off"}</span></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;

  qs(".js-cp-form", panel).addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const code = (data.code || "").trim().toUpperCase();
    const value = Number(data.value);
    if (!/^[A-Z0-9-]{3,24}$/.test(code) || !Number.isInteger(value) || value < 1) {
      toast("Enter a code (letters/numbers, 3–24 chars) and a value of at least 1.", "error", 5000);
      return;
    }
    await saveCoupon(code, {
      code,
      type: data.type,
      value,
      minOrderPaise: Math.max(0, Math.round(Number(data.minRupees) || 0)) * 100,
      maxDiscountPaise: Math.max(0, Math.round(Number(data.maxRupees) || 0)) * 100 || null,
      active: true,
      expiresAt: null,
    });
    toast(`Coupon ${code} saved.`, "ok");
    renderCoupons(panel);
  });
}


