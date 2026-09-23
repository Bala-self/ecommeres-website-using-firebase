/**
 * KADAI — Firestore rules test suite (runs against the local emulator)
 * Usage: node rules-test.mjs   (emulator on 127.0.0.1:8080, project kadai-36aa6)
 *
 * Covers: order-creation re-validation (price/stock/subtotal/shipping/coupon),
 * owner cancellation, read scopes, review moderation, and that every query
 * the storefront issues resolves on the declared indexes.
 */

const BASE = "http://127.0.0.1:8080/v1/projects/kadai-36aa6/databases/(default)";
const ADMIN = "uid-admin";
const CUST = "uid-cust";
const OTHER = "uid-other";

let passed = 0, failed = 0;
const fail = (name, detail) => { failed++; console.log(`  ✗ FAIL  ${name}\n        ${detail}`); };
const pass = (name) => { passed++; console.log(`  ✓ ok    ${name}`); };
function check(name, cond, detail = "") { cond ? pass(name) : fail(name, detail); }

// ---- REST helpers (emulator value encoding) ----
function v(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(v) } };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, val]) => [k, v(val)])) } };
  throw new Error("unsupported value: " + JSON.stringify(value));
}
async function req(method, path, body, uid, bypass = false) {
  const headers = { "Content-Type": "application/json" };
  if (uid) headers["x-fake-user-uid"] = uid;
  if (bypass) headers["x-firebase-rule"] = "__disable__";
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}
const enc = (doc) => ({ fields: Object.fromEntries(Object.entries(doc).map(([k, val]) => [k, v(val)])) });
const docCreate = (path, doc, uid, bypass) => req("POST", path, enc(doc), uid, bypass);
const docCreateAuto = (collectionId, doc, uid) => req("POST", `/documents/${collectionId}`, enc(doc), uid);
const docGet = (path, uid) => req("GET", path, null, uid);
const docUpdate = (path, fields, uid) => req("PATCH", path, { updateMask: { paths: Object.keys(fields) }, fields: Object.fromEntries(Object.entries(fields).map(([k, val]) => [k, v(val)])) }, uid);
async function runQuery(sq, uid) { return req("POST", "/documents:runQuery", { structuredQuery: sq }, uid); }
function queryOk(r) {
  // 200 with no error doc = index + rules resolved
  const err = r.data?.[0]?.error || r.data?.error;
  return r.status === 200 && !err;
}

const ADDR = { receiver: "Test Customer", phone: "9876543210", line1: "12 Test Street", city: "Chennai", state: "Tamil Nadu", pincode: "600001" };

function orderDoc(over = {}) {
  return {
    orderNumber: "KD-TEST-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
    userId: CUST,
    userEmail: "cust@test.local",
    items: [
      { productId: "p1", name: "Bulb", image: null, priceAtPurchasePaise: 20000, qty: 2 },
    ],
    itemsSubtotalPaise: 40000,
    discountPaise: 0,
    couponCode: null,
    shippingPaise: 4900,
    totalPaise: 44900,
    shippingAddress: ADDR,
    status: "placed",
    paymentStatus: "NOT_IMPLEMENTED",
    paymentProvider: null,
    transactionReference: null,
    statusHistory: [{ status: "placed", atIso: new Date().toISOString() }],
    createdAtMs: Date.now(),
    ...over,
  };
}

console.log("═══ KADAI FIRESTORE RULES SUITE ═══\n");

// ---------- public reads ----------
console.log("— public reads —");
check("anon: read active product", (await docGet("/documents/products/p1", null)).status === 200);
check("anon: inactive product denied", (await docGet("/documents/products/p3", null)).status === 403);
check("anon: active coupon readable", (await docGet("/documents/coupons/SAVE10", null)).status === 200);
check("anon: inactive coupon denied", (await docGet("/documents/coupons/DEAD10", null)).status === 403);
check("anon: users list denied", (await runQuery({ from: [{ collectionId: "users" }], limit: 10 }, null)).status === 403);
check("anon: orders list denied", (await runQuery({ from: [{ collectionId: "orders" }], limit: 10 }, null)).status === 403);
console.log("");

// ---------- storefront queries resolve (indexes) ----------
console.log("— storefront queries (index + rules) —");
check("list: active + createdAt asc", queryOk(await runQuery({ from: [{ collectionId: "products" }], where: { operation: "EQUAL", value: { booleanValue: true } }, orderBy: [{ field: { fieldPath: "createdAt" }, direction: "ASCENDING" }], limit: 12 }, null), "listing query"));
check("list: active + price asc", queryOk(await runQuery({ from: [{ collectionId: "products" }], where: { operation: "EQUAL", value: { booleanValue: true } }, orderBy: [{ field: { fieldPath: "pricePaise" }, direction: "ASCENDING" }], limit: 12 }, null), "price-asc query"));
check("list: active + categoryId + createdAt asc", queryOk(await runQuery({ from: [{ collectionId: "products" }], where: { compositeFilter: { op: "AND", filters: [{ operation: "EQUAL", value: { booleanValue: true } }, { operation: "EQUAL", value: { stringValue: "lights" } }] } }, orderBy: [{ field: { fieldPath: "createdAt" }, direction: "ASCENDING" }], limit: 12 }, null), "category query"));
check("scan: active + categoryId (no order) limit 200", queryOk(await runQuery({ from: [{ collectionId: "products" }], where: { compositeFilter: { op: "AND", filters: [{ operation: "EQUAL", value: { booleanValue: true } }, { operation: "EQUAL", value: { stringValue: "lights" } }] } }, limit: 200 }, null), "filter-scan query"));
check("scan: active limit 200", queryOk(await runQuery({ from: [{ collectionId: "products" }], where: { operation: "EQUAL", value: { booleanValue: true } }, limit: 200 }, null), "search-scan query"));
check("categories: active + name asc", queryOk(await runQuery({ from: [{ collectionId: "categories" }], where: { operation: "EQUAL", value: { booleanValue: true } }, orderBy: [{ field: { fieldPath: "name" }, direction: "ASCENDING" }] }, null), "categories query"));
check("reviews: productId + status + createdAt desc", queryOk(await runQuery({ from: [{ collectionId: "reviews" }], where: { compositeFilter: { op: "AND", filters: [{ operation: "EQUAL", value: { stringValue: "p1" } }, { operation: "EQUAL", value: { stringValue: "published" } }] } }, orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }], limit: 50 }, null), "reviews query"));
console.log("");

// ---------- order creation ----------
console.log("— order creation (customer) —");
let r = (await docCreateAuto("orders", orderDoc(), CUST));
check("valid order accepted", r.status === 200, JSON.stringify(r.data?.error || "").slice(0, 300));
const orderPath = r.status === 200 ? r.data.name.replace(/^.*documents\//, "/documents/") : null;

r = await docCreateAuto("orders", orderDoc({ items: [{ productId: "p1", name: "Bulb", image: null, priceAtPurchasePaise: 100, qty: 2 }], itemsSubtotalPaise: 200, totalPaise: 5100 }), CUST);
check("tampered price rejected", r.status === 403);

r = await docCreateAuto("orders", orderDoc({ items: [{ productId: "p1", name: "Bulb", image: null, priceAtPurchasePaise: 20000, qty: 99 }], itemsSubtotalPaise: 1980000, totalPaise: 1980000 }), CUST);
check("qty > stock rejected", r.status === 403);

r = await docCreateAuto("orders", orderDoc({ items: [{ productId: "p3", name: "Hidden", image: null, priceAtPurchasePaise: 5000, qty: 1 }], itemsSubtotalPaise: 5000, totalPaise: 9900 }), CUST);
check("inactive product rejected", r.status === 403);

r = await docCreateAuto("orders", orderDoc({ items: [{ productId: "ghost", name: "G", image: null, priceAtPurchasePaise: 5000, qty: 1 }], itemsSubtotalPaise: 5000, totalPaise: 9900 }), CUST);
check("missing product rejected", r.status === 403);

r = await docCreateAuto("orders", orderDoc({ itemsSubtotalPaise: 30000, totalPaise: 34900 }), CUST);
check("under-claimed subtotal rejected", r.status === 403);

r = await docCreateAuto("orders", orderDoc({ itemsSubtotalPaise: 50000, totalPaise: 54900 }), CUST);
check("over-claimed subtotal accepted (customer overpays — harmless)", r.status === 200, JSON.stringify(r.data?.error || "").slice(0, 200));

r = await docCreateAuto("orders", orderDoc({ shippingPaise: 0 }), CUST);
check("free-ship-claim under threshold rejected", r.status === 403);

r = await docCreateAuto("orders", orderDoc({ totalPaise: 44901 }), CUST);
check("total mismatch rejected", r.status === 403);

r = await docCreateAuto("orders", orderDoc({ userId: OTHER }), CUST);
check("order for another user rejected", r.status === 403);

r = await docCreateAuto("orders", orderDoc({ status: "processing" }), CUST);
check("non-placed status rejected", r.status === 403);

r = await docCreateAuto("orders", orderDoc({ paymentStatus: "PAID" }), CUST);
check("fake payment status rejected", r.status === 403);

r = await docCreateAuto("orders", orderDoc(), null);
check("anon order rejected", r.status === 403);

// coupon math
r = await docCreateAuto("orders", orderDoc({
  items: [
    { productId: "p2", name: "Rice bag", image: null, priceAtPurchasePaise: 120000, qty: 1 },
    { productId: "p1", name: "Bulb", image: null, priceAtPurchasePaise: 20000, qty: 1 },
  ],
  itemsSubtotalPaise: 140000, discountPaise: 5000, couponCode: "SAVE10", shippingPaise: 0, totalPaise: 135000,
}), CUST);
check("valid percent coupon (capped, free ship) accepted", r.status === 200, JSON.stringify(r.data?.error || "").slice(0, 300));

r = await docCreateAuto("orders", orderDoc({
  items: [
    { productId: "p2", name: "Rice bag", image: null, priceAtPurchasePaise: 120000, qty: 1 },
    { productId: "p1", name: "Bulb", image: null, priceAtPurchasePaise: 20000, qty: 1 },
  ],
  itemsSubtotalPaise: 140000, discountPaise: 9999, couponCode: "SAVE10", shippingPaise: 0, totalPaise: 130001,
}), CUST);
check("inflated coupon discount rejected", r.status === 403);

r = await docCreateAuto("orders", orderDoc({ discountPaise: 4000, couponCode: "DEAD10", totalPaise: 40900 }), CUST);
check("inactive coupon rejected", r.status === 403);

r = await docCreateAuto("orders", orderDoc({ discountPaise: 4000, couponCode: "SAVE10", totalPaise: 40900 }), CUST);
check("coupon below min-order rejected", r.status === 403);

r = await docCreateAuto("orders", orderDoc({ discountPaise: 5000, couponCode: "FLAT5", totalPaise: 39900 }), CUST);
check("valid flat coupon accepted", r.status === 200, JSON.stringify(r.data?.error || "").slice(0, 300));

console.log("");

// ---------- cancellation + owner updates ----------
console.log("— order updates (cancellation) —");
if (orderPath) {
  const hist = [{ status: "placed", atIso: new Date().toISOString() }, { status: "cancelled", atIso: new Date().toISOString() }];
  r = await docUpdate(orderPath, { status: "cancelled", updatedAt: new Date(), statusHistory: hist }, CUST);
  check("owner cancels own placed order", r.status === 200, JSON.stringify(r.data?.error || "").slice(0, 300));
} else {
  fail("owner cancels own placed order", "no order created in earlier step");
}
// create a fresh one for further update tests
const o2 = await docCreateAuto("orders", orderDoc(), CUST);
const o2Path = o2.data.name.replace(/^.*documents\//, "/documents/");
r = await docUpdate(o2Path, { status: "processing", updatedAt: new Date() }, CUST);
check("owner cannot advance status", r.status === 403);
r = await docUpdate(o2Path, { status: "cancelled", updatedAt: new Date(), totalPaise: 100 }, CUST);
check("owner cancel with re-priced total rejected", r.status === 403);
r = await docUpdate(o2Path, { status: "cancelled", updatedAt: new Date(), statusHistory: [{ status: "placed", atIso: "x" }, { status: "cancelled", atIso: "y" }, { status: "placed", atIso: "z" }] }, CUST);
check("owner cancel with grown history rejected", r.status === 403);
r = await docUpdate(o2Path, { status: "cancelled", updatedAt: new Date(), statusHistory: [{ status: "placed", atIso: "x" }, { status: "cancelled", atIso: "y" }] }, ADMIN);
check("admin can update any order", r.status === 200, JSON.stringify(r.data?.error || "").slice(0, 300));
r = await docUpdate(o2Path, { status: "shipped", updatedAt: new Date() }, CUST);
check("customer cannot update admin-only transition", r.status === 403);

console.log("");

// ---------- ownership reads / writes ----------
console.log("— ownership & writes —");
const o3 = await docCreateAuto("orders", orderDoc(), CUST);
const o3Path = o3.data.name.replace(/^.*documents\//, "/documents/");
check("owner reads own order", (await docGet(o3Path, CUST)).status === 200);
check("stranger reads denied", (await docGet(o3Path, OTHER)).status === 403);
check("customer product write denied", (await docCreate("/documents/products/p4", { active: true, name: "X", pricePaise: 100, stock: 1 }, CUST)).status === 403);
check("admin product write allowed", (await docCreate("/documents/products/p4", { active: true, name: "X", pricePaise: 100, stock: 1, createdAt: new Date() }, ADMIN)).status === 200);
check("customer self-publish review denied", (await docCreate("/documents/reviews/r1", { productId: "p1", userId: CUST, userDisplayName: "C", rating: 5, text: "Great product quality wise.", status: "published" }, CUST)).status === 403);
check("customer pending review allowed", (await docCreate("/documents/reviews/r1", { productId: "p1", userId: CUST, userDisplayName: "C", rating: 5, text: "Great product quality wise.", status: "pending", createdAt: new Date() }, CUST)).status === 200);
check("customer review self-update denied", (await docUpdate("/documents/reviews/r1", { status: "published" }, CUST)).status === 403);
check("admin review moderate allowed", (await docUpdate("/documents/reviews/r1", { status: "published" }, ADMIN)).status === 200);
console.log("");

console.log(`═══ RESULT: ${passed} passed, ${failed} failed ═══`);
process.exit(failed ? 1 : 0);
