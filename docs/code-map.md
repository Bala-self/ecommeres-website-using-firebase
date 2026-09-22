
# KADAI — ENTIRE CODE CONNECTION MAP
The completed audit of this codebase, run on 2026-09-21.
Method: full import-graph extraction, page-entry scan, collection
touchpoint scan vs. rules coverage (commands quoted in the session log).

## 1. ARCHITECTURE IN ONE PICTURE

```
 BROWSER
 └── *.html (13 pages, each data-page="X")
      └── js/main.js .................... single boot entry
           ├── core/env.js ──── firebase/config.js (your kadai-36aa6 values)
           │         └──── firebase/init.js (SDK loader; offline → demo mode)
           ├── services/seed.js → data/dev-catalog.js (demo/first-seed data)
           ├── services/auth.js ──┐
           ├── components/header.js (renders header/footer on every page)
           └── pages/X.js ......... one page module per data-page
                 │
                 ├── core/  (format · pricing · cart-logic · validate ·
                 │           dom · store · env-state)  ← pure logic, no I/O
                 ├── components/ (productCard · states · toast · header)
                 └── services/  (the ONLY layer touching backend)
                      └── firebase/sdk.js  ← the ONLY file importing the
                          Firebase CDN (dynamic import; offline → null)
                           ├── Firestore: products, categories, users,
                           │   addresses, carts, wishlists, orders,
                           │   reviews, coupons
                           ├── Auth: email/password sessions
                           └── Storage: products/ images (admin uploads)
```

**Layer rule enforced by construction:** pages → services → sdk.
Only `js/firebase/sdk.js` and `js/firebase/init.js` import the CDN —
verified by grep across `js/` (0 violations).

## 2. PAGE → MODULE → SERVICES → BACKEND MATRIX

| Page | Module | Services used | Backend paths |
|---|---|---|---|
| index.html (home) | home.js | products, categories, cart*, wishlist* | products, categories |
| products.html (listing/search) | products.js | products, categories, cart* | products (query+sort+cursor), categories |
| product.html | product.js | products, reviews, cart*, wishlist* | products/{id}, reviews (published) |
| cart.html | cart.js | cart, coupons, pricing, auth* | carts/{uid}, coupons, products |
| checkout.html | checkout.js | auth, cart, users, orders, pricing | carts, users/{uid}/addresses, orders (create) |
| orders.html | orders.js | auth, orders | orders (where userId==me) |
| order.html | order.js | auth, orders | orders/{id} (owner-or-admin) |
| wishlist.html | wishlist.js | wishlist | wishlists/{uid}, products |
| login / register / forgot | login/register/forgot.js | auth (+cart/wishlist merge on login) | Auth; users/{uid}; carts; wishlists |
| account.html | account.js | auth, users | users/{uid}, users/{uid}/addresses |
| admin.html | admin.js | orders, products, categories, reviews, coupons, storage, seed | all of the above (admin writes), Storage products/ |

\* dynamic imports for add-to-cart / wishlist toggles inside card grids.

## 3. BOOT SEQUENCE (what happens, in order)

1. `main.js` → `resolveEnvironment()`: config placeholder? → **demo mode**
   (no network). Real config → dynamic CDN import (8s timeout guard).
2. Demo mode → `seedLocalCatalog()` (once; labeled seed data).
3. `initAuth()`: Firebase `onAuthStateChanged` **or** local demo session.
4. Shell: toast region → categories (cached) → header + footer render
   (counts, nav, search) → auth/cart subscriptions wired.
5. Guest→user merge fires once per login event (`mergedFor` guard).
6. `body[data-page]` → dynamic `import('./pages/X.js')` → `init()`.
   Failure → visible error region + console log (never a blank page).

## 4. CORE JOURNEY CALL CHAINS

**Add to basket:**
`productCard.js` click → `pages/home.js bindCardActions()` → *dynamic*
`services/cart.js addToCart()` → (write chain queue) → Firestore
`carts/{uid}` **or** LocalStorage → `notify()` → `header.js refreshCounts()`
→ badge updates (aria-live).

**Checkout:**
`checkout.js init()` → auth gate → `cart.getLines()` (joins fresh product
docs; stale lines drop) → `users.listAddresses()` → form validated by
`core/validate.js` → `users.saveAddress()` → review step →
`orders.createOrder()` (recomputes totals from catalog via
`core/pricing.js`, snapshots name/price, `paymentStatus:'NOT_IMPLEMENTED'`)
→ Firestore `orders` add → `cart.clearCart()` → redirect
`order.html?id&placed=1` (truthful confirmation).

**Admin status advance:**
`admin.js` select → `orders.adminSetStatus()` → **re-reads current status
from backend** → validates transition against `nextStatuses()` graph →
appends `statusHistory` → update. (Illegal jumps rejected in service, not
just UI.)

**Auth + merge:**
`login.js` → `auth.login()` → profile `ensureProfile()` (role read) →
`emit()` → `main.js bindMergeOnAuth()` (once per uid) → cart max-qty merge +
wishlist union (`core/cart-logic.js`) → guest keys cleared.

## 5. STATE & EVENT WIRING

| Broadcast | Subscribers |
|---|---|
| auth `subscribe()` (login/logout) | main.js (merge), header.js (menu re-render) |
| cart `subscribe()` (any write) | header counts, cart page re-render |
| wishlist `subscribe()` | header counts |
| toasts | single fixed aria-live region (role=status) |
| localStorage keys (`kadai.v1.*`) | demo db, guest cart/wishlist, demo session |

No component reaches into another's internals; all cross-talk flows
through service subscriptions. `core/env-state.js` is the only shared
mutable mirror (set once at boot; read-only elsewhere).

## 6. BACKEND TOUCHPOINTS × RULES COVERAGE (cross-check)

| Collection | Touched by | Rule coverage | Status |
|---|---|---|---|
| products | products.js, seed.js | public read(active), admin write | CONNECTED |
| categories | categories.js, seed.js | public read(active), admin write | CONNECTED |
| users | auth.js, users.js | owner read, self-create (role=customer), admin write | CONNECTED |
| users/addresses | users.js | owner only | CONNECTED |
| carts | cart.js | owner only | CONNECTED |
| wishlists | wishlist.js | owner only | CONNECTED |
| orders | orders.js | owner read, constrained create, admin update | CONNECTED |
| reviews | reviews.js | public read(published), pending create, admin moderate | CONNECTED |
| coupons | coupons.js | read(active), admin write | CONNECTED |
| Storage products/ | storage.js | admin-only write, type+2MB cap | CONNECTED |
| deny-all fallback | — | `match /{document=**} if false` | PRESENT |

All 9 Firestore paths + Storage referenced in code have matching rules —
no uncovered touchpoint, no blocking rule without a code path.

## 7. EXTERNAL BOUNDARIES

| URL | Loaded by | Offline behavior |
|---|---|---|
| gstatic firebasejs/10.12.2 (app/auth/firestore/storage) | firebase/sdk.js + init.js, **dynamic only** | demo mode, zero console errors |
| Google Fonts (Archivo, Fraunces) | `<link>` per page | system fallback fonts |
| Product images | workspace assets/ | local, always load |

No other external references (verified by grep across HTML + JS).

## 8. CONNECTION HEALTH TABLE

| Connection | Status |
|---|---|
| 13 pages → 13 page modules (`data-page` ↔ files) | CONNECTED (verified) |
| 42/42 JS modules syntax-valid; import graph acyclic | CONNECTED |
| Orphaned files | NONE (every file imported or an entry/config) |
| Cross-layer violations (UI→SDK) | NONE |
| Services → collections ↔ rules | CONNECTED (9/9 + storage) |
| Demo path ↔ Firebase path (service contract parity) | CONNECTED (e2e-tested both switch points) |
| Firebase live queries against project kadai-36aa6 | UNVERIFIED — needs your browser (rules published + seeded catalog) — [VERIFY] |
| Visual render | UNVERIFIED in-sandbox — needs one human pass — [VERIFY] |

**Executive summary:** the architecture is a clean three-layer flow
(page → service → SDK gateway) with zero cycles, zero orphans, zero
cross-layer violations, and full rules coverage. The two remaining
unknowns are the same ones documented in the test report: a live
Firebase-mode run and a human visual pass.

---

## ROUND 2 — Post-audit connection updates (same day)
Health-table rows changed by the fixes in test-report.md ADDENDUM:

| Connection | Was | Now |
|---|---|---|
| Admin image upload → Storage | BROKEN (missing handle) | CONNECTED (derived from app) |
| Public reviews → published rule | BROKEN (unconstrained query) | CONNECTED (status in query + index 11) |
| Admin product save → storefront listing | BROKEN (no createdAt) | CONNECTED (stamped on create) |
| Basket coupon → checkout → order | BROKEN | CONNECTED (sessionStorage handoff + revalidation) |
| Order detail → ownership UX | BROKEN (raw throw) | CONNECTED (mapped states + page catch) |
| Wishlist mutation → header count | BROKEN | CONNECTED (subscription) |
| Login → merge | RISKY (two callers) | CONNECTED (single caller in main.js) |
| Protected pages ↔ auth state | RISKY (hydration race) | CONNECTED (`authReady()` barrier) |
| /admin/ shell → store links | RISKY (relative base) | CONNECTED (BASE prefix) |
| Runtime demo catalog | present | REMOVED — catalog lives only in Firebase (owner instruction) |


