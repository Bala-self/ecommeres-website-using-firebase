/**
 * KADAI — Firestore rules harness (emulator-based)
 * =================================================
 * Runs against the local Firebase emulators (free, no credentials):
 *
 *   Phase A (seed):  permissive rules — creates test users, products, coupons
 *                    (exported with the emulator data)
 *   Phase B (test):  the REAL firestore.rules — runs the full security matrix
 *
 * See test/README.md for the exact commands.
 */

import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithCredential, connectAuthEmulator } from "firebase/auth";
import {
  getFirestore, connectFirestoreEmulator,
  doc, setDoc, getDoc, addDoc, collection, updateDoc,
  query, where, orderBy, limit, getDocs,
} from "firebase/firestore";

const PROJECT = "kadai-36aa6";
const CONFIG = { projectId: PROJECT, appId: "emulator-test-app", apiKey: "emulator-key" };
const mode = process.argv[2] || "test";

const app = initializeApp(CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8080);
connectAuthEmulator(auth, "http://127.0.0.1:9099");

let passed = 0, failed = 0;
const pass = (n) => { passed++; console.log(`  ✓ ok    ${n}`); };
const fail = (n, d = "") => { failed++; console.log(`  ✗ FAIL  ${n}${d ? `\n        ${String(d).slice(0, 240)}` : ""}`); };
const check = (n, c, d) => (c ? pass(n) : fail(n, d));

const USERS = { admin: "admin@kadai.test", cust: "cust@kadai.test" };
const PWD = "test-password-123";

function switchUser(cred) {
  // fresh auth per user so rules see the right uid
  const a2 = initializeApp(CONFIG, "user-" + Math.random().toString(36).slice(2, 8));
  const au = getAuth(a2);
  connectAuthEmulator(au, "http://127.0.0.1:9099");
  return { app: a2, auth: au, cred };
}

async function readAs(cred, getter) {
  const { app: a2, auth: au } = switchUser(cred);
  const d2 = getFirestore(a2);
  connectFirestoreEmulator(d2, "127.0.0.1", 8080);
  if (cred) await signInWithCredential(au, cred);
  try {
    return { ok: true, value: await getter(d2) };
  } catch (e) {
    return { ok: false, error: e };
  } finally {
    await deleteApp(a2).catch(() => {});
  }
}

// ══════════════════════════════ SEED PHASE ══════════════════════════════
async function seedPhase() {
  console.log("— seed: auth users —");
  for (const [k, email] of Object.entries(USERS)) {
    await createUserWithEmailAndPassword(auth, email, PWD);
    console.log("  created", k, email);
  }
  const adminSnap = await (async () => {
    const { auth: au } = switchUser(null);
    await signInWithEmailAndPassword(au, emailOf("admin"), PWD);
    return au.currentUser;
  })();
  const custSnap = await (async () => {
    const { auth: au } = switchUser(null);
    await signInWithEmailAndPassword(au, emailOf("cust"), PWD);
    return au.currentUser;
  })();
  const UID = { admin: adminSnap.uid, cust: custSnap.uid };

  console.log("— seed: firestore docs —");
  await setDoc(doc(db, "users", UID.admin), { name: "Admin", email: USERS.admin, phone: "", role: "admin", createdAt: new Date() });
  await setDoc(doc(db, "users", UID.cust), { name: "Cust", email: USERS.cust, phone: "", role: "customer", createdAt: new Date() });
  await setDoc(doc(db, "products", "p1"), { active: true, name: "Bulb", pricePaise: 20000, stock: 10, categoryId: "lights", createdAt: new Date("2023-11-14T22:13:20Z") });
  await setDoc(doc(db, "products", "p2"), { active: true, name: "Rice bag", pricePaise: 120000, stock: 5, categoryId: "grocery", createdAt: new Date("2023-11-14T22:13:21Z") });
  await setDoc(doc(db, "products", "p3"), { active: false, name: "Hidden", pricePaise: 5000, stock: 9, categoryId: "lights", createdAt: new Date("2023-11-14T22:13:22Z") });
  await setDoc(doc(db, "coupons", "SAVE10"), { code: "SAVE10", type: "percent", value: 10, minOrderPaise: 100000, maxDiscountPaise: 5000, active: true, expiresAt: null });
  await setDoc(doc(db, "coupons", "FLAT5"), { code: "FLAT5", type: "flat", value: 5000, minOrderPaise: 0, maxDiscountPaise: null, active: true, expiresAt: null });
  await setDoc(doc(db, "coupons", "DEAD10"), { code: "DEAD10", type: "percent", value: 10, minOrderPaise: 0, maxDiscountPaise: null, active: false, expiresAt: null });
  await setDoc(doc(db, "categories", "cats1"), { active: true, name: "Lights", slug: "lights", description: "" });
  console.log("— seed: uid map (for reference) —");
  console.log(JSON.stringify(UID, null, 2));
  await deleteApp(app);
  console.log("SEED COMPLETE");
}
const emailOf = (k) => USERS[k];

// ══════════════════════════════ TEST PHASE ══════════════════════════════
async function testPhase() {
  console.log("— login: cust + admin —");
  let credCust, credAdmin;
  {
    const { auth: au } = switchUser(null);
    const res = await signInWithEmailAndPassword(au, USERS.cust, PWD);
    credCust = res.credential || res;
    await deleteApp(au.app);
  }
  {
    const { auth: au } = switchUser(null);
    const res = await signInWithEmailAndPassword(au, USERS.admin, PWD);
    credAdmin = res.credential || res;
    await deleteApp(au.app);
  }
  const uidCust = credCust.uid;
  const uidAdmin = credAdmin.uid;

  // anonymous baseline (no user)
  const anon = { ok: true, value: null, error: null };
  const get = (d2, path) => getDoc(doc(d2, ...path));
  const anonRead = (path) => readAs(null, (d2) => get(d2, path).then((s) => s.exists()));

  console.log("\n— public reads —");
  let r = await anonRead(["products", "p1"]);
  check("anon: read active product", r.ok && r.value === true, r.error?.message);
  r = await anonRead(["products", "p3"]);
  check("anon: inactive product denied", !r.ok && r.error?.code === "permission-denied", r.error?.message || "read succeeded?");
  r = await anonRead(["coupons", "SAVE10"]);
  check("anon: active coupon readable", r.ok && r.value === true, r.error?.message);
  r = await anonRead(["coupons", "DEAD10"]);
  check("anon: inactive coupon denied", !r.ok, r.error?.message || "read succeeded?");
  r = await readAs(null, (d2) => getDocs(query(collection(d2, "users"), limit(10))));
  check("anon: users list denied", !r.ok, r.error?.message || "list succeeded?");
  r = await readAs(null, (d2) => getDocs(query(collection(d2, "orders"), limit(10))));
  check("anon: orders list denied", !r.ok, r.error?.message || "list succeeded?");

  console.log("\n— storefront queries (index + rules) —");
  const qtest = (name, build) => {
    const rr = readAs(null, (d2) => getDocs(build(d2)).then((s) => s.docs.length));
    return rr.then((x) => check(name, x.ok, x.error?.message));
  };
  await qtest("list: active + createdAt asc", (d) => query(collection(d, "products"), where("active", "==", true), orderBy("createdAt", "asc"), limit(12)));
  await qtest("list: active + price asc", (d) => query(collection(d, "products"), where("active", "==", true), orderBy("pricePaise", "asc"), limit(12)));
  await qtest("list: active + categoryId + createdAt asc", (d) => query(collection(d, "products"), where("active", "==", true), where("categoryId", "==", "lights"), orderBy("createdAt", "asc"), limit(12)));
  await qtest("scan: active + categoryId (no order) limit 200", (d) => query(collection(d, "products"), where("active", "==", true), where("categoryId", "==", "lights"), limit(200)));
  await qtest("scan: active limit 200", (d) => query(collection(d, "products"), where("active", "==", true), limit(200)));
  await qtest("categories: active + name asc", (d) => query(collection(d, "categories"), where("active", "==", true), orderBy("name", "asc")));
  await qtest("reviews: productId + status + createdAt desc", (d) => query(collection(d, "reviews"), where("productId", "==", "p1"), where("status", "==", "published"), orderBy("createdAt", "desc"), limit(50)));

  console.log("\n— order creation (customer) —");
  const ADDR = { receiver: "Test Customer", phone: "9876543210", line1: "12 Test Street", city: "Chennai", state: "Tamil Nadu", pincode: "600001" };
  function orderDoc(over = {}) {
    return {
      orderNumber: "KD-TEST-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
      userId: uidCust,
      userEmail: USERS.cust,
      items: [{ productId: "p1", name: "Bulb", image: null, priceAtPurchasePaise: 20000, qty: 2 }],
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
  const createOrder = (d, cred) => readAs(cred, (d2) => addDoc(collection(d2, "orders"), d).then((ref) => ref.id).catch((e) => { throw e; }));

  r = await createOrder(orderDoc(), credCust);
  check("valid order accepted", r.ok, r.error?.message);
  const order1 = r.ok ? r.value : null;

  r = await createOrder(orderDoc({ items: [{ productId: "p1", name: "Bulb", image: null, priceAtPurchasePaise: 100, qty: 2 }], itemsSubtotalPaise: 200, totalPaise: 5100 }), credCust);
  check("tampered price rejected", !r.ok, r.error?.message || "accepted?");
  r = await createOrder(orderDoc({ items: [{ productId: "p1", name: "Bulb", image: null, priceAtPurchasePaise: 20000, qty: 99 }], itemsSubtotalPaise: 1980000, totalPaise: 1980000 }), credCust);
  check("qty > stock rejected", !r.ok, r.error?.message || "accepted?");
  r = await createOrder(orderDoc({ items: [{ productId: "p3", name: "Hidden", image: null, priceAtPurchasePaise: 5000, qty: 1 }], itemsSubtotalPaise: 5000, totalPaise: 9900 }), credCust);
  check("inactive product rejected", !r.ok, r.error?.message || "accepted?");
  r = await createOrder(orderDoc({ items: [{ productId: "ghost", name: "G", image: null, priceAtPurchasePaise: 5000, qty: 1 }], itemsSubtotalPaise: 5000, totalPaise: 9900 }), credCust);
  check("missing product rejected", !r.ok, r.error?.message || "accepted?");
  r = await createOrder(orderDoc({ itemsSubtotalPaise: 30000, totalPaise: 34900 }), credCust);
  check("under-claimed subtotal rejected", !r.ok, r.error?.message || "accepted?");
  r = await createOrder(orderDoc({ itemsSubtotalPaise: 50000, totalPaise: 54900 }), credCust);
  check("over-claimed subtotal accepted (harmless)", r.ok, r.error?.message);
  r = await createOrder(orderDoc({ shippingPaise: 0 }), credCust);
  check("free-ship-claim under threshold rejected", !r.ok, r.error?.message || "accepted?");
  r = await createOrder(orderDoc({ totalPaise: 44901 }), credCust);
  check("total mismatch rejected", !r.ok, r.error?.message || "accepted?");
  r = await createOrder(orderDoc({ userId: uidAdmin }), credCust);
  check("order for another user rejected", !r.ok, r.error?.message || "accepted?");
  r = await createOrder(orderDoc({ status: "processing" }), credCust);
  check("non-placed status rejected", !r.ok, r.error?.message || "accepted?");
  r = await createOrder(orderDoc({ paymentStatus: "PAID" }), credCust);
  check("fake payment status rejected", !r.ok, r.error?.message || "accepted?");
  r = await createOrder(orderDoc(), null);
  check("anon order rejected", !r.ok, r.error?.message || "accepted?");

  // coupon math
  r = await createOrder(orderDoc({
    items: [
      { productId: "p2", name: "Rice bag", image: null, priceAtPurchasePaise: 120000, qty: 1 },
      { productId: "p1", name: "Bulb", image: null, priceAtPurchasePaise: 20000, qty: 1 },
    ],
    itemsSubtotalPaise: 140000, discountPaise: 5000, couponCode: "SAVE10", shippingPaise: 0, totalPaise: 135000,
  }), credCust);
  check("valid percent coupon (capped, free ship) accepted", r.ok, r.error?.message);
  r = await createOrder(orderDoc({
    items: [
      { productId: "p2", name: "Rice bag", image: null, priceAtPurchasePaise: 120000, qty: 1 },
      { productId: "p1", name: "Bulb", image: null, priceAtPurchasePaise: 20000, qty: 1 },
    ],
    itemsSubtotalPaise: 140000, discountPaise: 9999, couponCode: "SAVE10", shippingPaise: 0, totalPaise: 130001,
  }), credCust);
  check("inflated coupon discount rejected", !r.ok, r.error?.message || "accepted?");
  r = await createOrder(orderDoc({ discountPaise: 4000, couponCode: "DEAD10", totalPaise: 40900 }), credCust);
  check("inactive coupon rejected", !r.ok, r.error?.message || "accepted?");
  r = await createOrder(orderDoc({ discountPaise: 4000, couponCode: "SAVE10", totalPaise: 40900 }), credCust);
  check("coupon below min-order rejected", !r.ok, r.error?.message || "accepted?");
  r = await createOrder(orderDoc({ discountPaise: 5000, couponCode: "FLAT5", totalPaise: 39900 }), credCust);
  check("valid flat coupon accepted", r.ok, r.error?.message);

  console.log("\n— order updates (cancellation) —");
  if (order1) {
    const hist = [{ status: "placed", atIso: "2026-09-22T00:00:00Z" }, { status: "cancelled", atIso: new Date().toISOString() }];
    r = await readAs(credCust, (d2) => updateDoc(doc(d2, "orders", order1), { status: "cancelled", statusHistory: hist }).then(() => true));
    check("owner cancels own placed order", r.ok, r.error?.message);
  } else {
    fail("owner cancels own placed order", "no valid order created");
  }
  const o2r = await createOrder(orderDoc(), credCust);
  const o2 = o2r.ok ? o2r.value : null;
  if (o2) {
    r = await readAs(credCust, (d2) => updateDoc(doc(d2, "orders", o2), { status: "processing" }).then(() => true));
    check("owner cannot advance status", !r.ok, r.error?.message || "accepted?");
    r = await readAs(credCust, (d2) => updateDoc(doc(d2, "orders", o2), { status: "cancelled", totalPaise: 100 }).then(() => true));
    check("owner cancel with re-priced total rejected", !r.ok, r.error?.message || "accepted?");
    r = await readAs(credCust, (d2) => updateDoc(doc(d2, "orders", o2), { status: "cancelled", statusHistory: [{ status: "placed", atIso: "x" }, { status: "cancelled", atIso: "y" }, { status: "placed", atIso: "z" }] }).then(() => true));
    check("owner cancel with grown history rejected", !r.ok, r.error?.message || "accepted?");
    r = await readAs(credAdmin, (d2) => updateDoc(doc(d2, "orders", o2), { status: "cancelled", statusHistory: [{ status: "placed", atIso: "x" }, { status: "cancelled", atIso: "y" }] }).then(() => true));
    check("admin can update any order", r.ok, r.error?.message);
    r = await readAs(credCust, (d2) => updateDoc(doc(d2, "orders", o2), { status: "shipped" }).then(() => true));
    check("customer cannot update post-cancel order", !r.ok, r.error?.message || "accepted?");
  }

  console.log("\n— ownership & writes —");
  const o3r = await createOrder(orderDoc(), credCust);
  const o3 = o3r.ok ? o3r.value : null;
  if (o3) {
    r = await readAs(credCust, (d2) => get(d2, ["orders", o3]).then((s) => s.exists()));
    check("owner reads own order", r.ok && r.value === true, r.error?.message);
    r = await readAs(credAdmin, (d2) => get(d2, ["orders", o3]).then((s) => s.exists()));
    check("admin reads any order", r.ok && r.value === true, r.error?.message);
  }
  r = await readAs(credCust, (d2) => addDoc(collection(d2, "products"), { active: true, name: "X", pricePaise: 100, stock: 1, createdAt: new Date() }));
  check("customer product write denied", !r.ok, r.error?.message || "accepted?");
  r = await readAs(credAdmin, (d2) => addDoc(collection(d2, "products"), { active: true, name: "X", pricePaise: 100, stock: 1, createdAt: new Date() }));
  check("admin product write allowed", r.ok, r.error?.message);
  r = await readAs(credCust, (d2) => addDoc(collection(d2, "reviews"), { productId: "p1", userId: uidCust, userDisplayName: "C", rating: 5, text: "Great product quality wise.", status: "published", createdAt: new Date() }));
  check("customer self-publish review denied", !r.ok, r.error?.message || "accepted?");
  const revR = await readAs(credCust, (d2) => addDoc(collection(d2, "reviews"), { productId: "p1", userId: uidCust, userDisplayName: "C", rating: 5, text: "Great product quality wise.", status: "pending", createdAt: new Date() }).then((x) => x.id));
  check("customer pending review allowed", revR.ok, revR.error?.message);
  if (revR.ok) {
    r = await readAs(credCust, (d2) => updateDoc(doc(d2, "reviews", revR.value), { status: "published" }).then(() => true));
    check("customer review self-update denied", !r.ok, r.error?.message || "accepted?");
    r = await readAs(credAdmin, (d2) => updateDoc(doc(d2, "reviews", revR.value), { status: "published" }).then(() => true));
    check("admin review moderate allowed", r.ok, r.error?.message);
  }
  await deleteApp(app);
}

try {
  if (mode === "seed") await seedPhase();
  else await testPhase();
} catch (e) {
  console.error("HARNESS ERROR:", e);
  process.exitCode = 2;
}
console.log(`\n═══ RESULT: ${passed} passed, ${failed} failed ═══`);
process.exit(failed ? 1 : process.exitCode || 0);
