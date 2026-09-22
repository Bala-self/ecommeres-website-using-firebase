
# KADAI — Test Report
Build: full application (Phases 01–27 scope) · Date: 2026-09-21
Every claim below maps to a test that was actually executed in this
session. Nothing is marked pass without evidence (§67).

## 1. Static verification — PASS

| Check | Result |
|---|---|
| `node --check` on all **42 JS modules** (as ES modules) | PASS — 0 syntax errors |
| Every local `href`/`src` in all 13 HTML pages resolves to a real file | PASS (1 defect found & fixed: admin favicon path) |
| Every page module referenced by `data-page` exists in `js/pages/` | PASS — 13/13 |
| HTTP 200 for `/` + all 12 pages via static server | PASS |
| No static CDN imports outside `js/firebase/sdk.js` + `init.js` (offline-safe architecture) | PASS |
| Runtime dependencies: Firebase ESM CDN + Google Fonts only — **0 npm packages** | PASS |

## 2. Business logic unit tests — PASS

| Check | Evidence |
|---|---|
| `formatINR` (₹ grouping, paise decimals, null guard) | PASS |
| Pricing pipeline §35: subtotal → coupon → discount cap → shipping threshold → total | PASS (1,896 − 189.60 + free ship = 1,706.40 verified; flat ₹49 below ₹999 verified; empty basket = no shipping) |
| Coupon rules: minimum-order rejection, max-discount cap, inactive/expired/unknown codes | PASS |
| Cart merge §33: max-qty (never summed), unknown lines carried, guest cart cleared; wishlist union | PASS |
| Validators §50: 6-digit PIN (no leading 0), Indian mobile (+91/10-digit), email shape, name/address bounds | PASS |
| Catalog integrity: unique ids, integer paise, compareAt > price, valid category refs, ≥3 keywords, **image files exist on disk**, real spec content | PASS (10 products, 5 categories) |

## 3. End-to-end demo-path simulation (Node, real service layer) — PASS

| Scenario | Result |
|---|---|
| Seed once (idempotent) → browse featured/aisles | PASS |
| Admin deactivates product → disappears from listing AND product page 404 state | PASS |
| Guest cart (2 lines) + wishlist → register → **merge on login** → guest cart cleared | PASS |
| Coupon WELCOME10 validated & totals recomputed; fake code rejected | PASS |
| Order created: `paymentStatus: "NOT_IMPLEMENTED"`, snapshot lines, KD-number | PASS |
| **Cross-user order read blocked** (`forbidden`) | PASS |
| Admin promote → status flow placed→processing→shipped→delivered; **illegal transition rejected** (found missing service-level guard during testing — fixed, re-tested) | PASS |
| Review → pending (not public) → admin approval → published | PASS |
| Logout clears session | PASS |

**Defects found & fixed during testing (honest log):**
1. `admin.html` referenced `assets/favicon.svg` from its own directory — fixed to `../assets/…`.
2. Order status service accepted illegal transitions (e.g. delivered → placed) — service-level transition guard added and re-tested.
3. Earlier build had static Firebase CDN imports in services — refactored to the lazy `js/firebase/sdk.js` gateway so offline/sandboxed use takes the demo path instead of breaking the whole module graph.
4. Two test-script bugs (wrong expectation on removed localStorage key; wrong PIN expectation) — corrected the tests, not the code.

## 4. Accessibility — design-verified, human pass pending

Implemented: semantic landmarks on every page · single `<h1>` · skip link ·
labels + `aria-describedby` error slots · 44px touch targets · visible
`:focus-visible` rings · `aria-current` nav state · `aria-live` toasts and
count badges · `aria-pressed` wishlist/gallery state · `role="alert"` error
banners · `prefers-reduced-motion` honored · autocomplete attributes on all
identity/address inputs · decorative images `alt=""`, meaningful images get
real alt text.

**Computed contrast (WCAG 2.x relative luminance): all 13 token pairs ≥ 4.5:1**
(body 15.64 · muted 6.66 · links/buttons 7.33 · price 6.16 · header 10.94 ·
status pairs 5.1–5.3). Script: `contrast.mjs`, run this session.

Not yet performed: full screen-reader walkthrough and Tab-order audit in a
real browser (no automation available in this environment) — **honestly
pending human verification**, per §74 (manual inspection required).

## 5. Security review (§83 checklist)

- [x] Firestore rules cover every collection; deny-all fallback (`firestore.rules`)
- [x] Admin = `users/{uid}.role == 'admin'` — enforced in rules, never in JS state
- [x] Ownership: carts/wishlists/addresses only by owner; order reads by owner or admin
- [x] Order create constrained server-side: own uid, status `placed`, `paymentStatus: 'NOT_IMPLEMENTED'`, non-empty items, address shape
- [x] Storage: admin-only writes, image types, 2 MB cap (`storage.rules`)
- [x] No secrets in client (web config public-by-design; setup guide says what never to paste)
- [x] All untrusted strings rendered via `escapeHtml`/`textContent` (XSS)
- [x] Open-redirect guard on `?next=` (same-site relative paths only)
- [x] No fake payment success anywhere; confirmation says "Order request received"
- [x] **[SECURITY GAP — BACKEND VALIDATION REQUIRED]**: order totals computed client-side (documented §11/§39; acceptable for COD request flow, launch blocker for online payment)

## 6. Known limitations (truthful)

- Firebase-mode Firestore queries (listing, search scan, reviews) were **not executed against a live project** — the web config isn't created yet. The demo path (identical service contracts) is fully tested; first real-project run may surface rule/index adjustments.
- Product ratings stay `null` by design until a trusted aggregation exists (no fabricated reviews — §42/§45).
- Shipping (₹49 / free ≥ ₹999) and "2–4 days Chennai" are **PLACEHOLDER business rules** marked `[CONTENT REQUIRED]`.
- 2 additional product photos + a home hero image were not generated this session (image tool limit reached) — the catalog ships with 10 of 10 planned products, hero uses a product photo + typography composition instead.
- Image search, offline PWA, i18n (Tamil), and email verification are future work — documented, not built (§2 "only build what's required").

---

## ADDENDUM — Audit round 2 (external connection audit → fixes, same day)

A full code-connection audit was run against this build. Findings were
triaged against the actual source; every verified defect was fixed and
the full test suite re-run. Honest log:

**Verified defects → FIXED**
1. **Storage handle never initialized** — `getStorageMod()` read `sdk.storage`, which `init.js` never stored → admin image uploads would crash in Firebase mode. Now derived from `sdk.app`. *(Verified by source inspection.)*
2. **Public review query violated its own rules** — query lacked `status == "published"`; Firestore rules are not filters → live reads would be rejected. Query now constrains status server-side; composite index added (`productId, status, createdAt DESC` → `firestore.indexes.json`, 11 total).
3. **Admin-created products omitted `createdAt`** — listing queries order by it → new products could be invisible. `adminSave` now stamps `createdAt` on create only (stock/active edits never rewrite it).
4. **Coupon lost between basket and order** — coupon lived in cart-page memory; checkout computed totals without it. Now handed off via sessionStorage, re-validated at checkout, passed into `createOrder`, cleared on placement.
5. **Order-detail permission errors bypassed UI** — cross-user reads now surface as the intended "sign in / not your order" state (service maps `permission-denied`; page adds try/catch).
6. **Inactive products in a basket could hard-fail reads** — `byIds()` now tolerates per-document permission errors (one bad doc can't break a basket).
7. **Wishlist badge had no subscriber** — header now subscribes to wishlist mutations.
8. **Wishlist page had a duplicate, racy click handler** — page now re-renders from the service subscription.
9. **Double merge on login** (login page + main.js both merged) — login page no longer merges; single caller in main.js.
10. **Auth-hydration race on protected pages** — new `authReady()` barrier awaited by checkout / orders / order / account.
11. **Admin-page store links broke under `/admin/`** — header/footer now compute a BASE prefix.
12. **2 MB upload boundary mismatch** (client `>` vs rules `<`) — client now rejects `>=`.

**Re-verified after fixes:** 42/42 modules syntax-clean · all unit tests PASS · all 9 e2e scenarios PASS · all 15 routes 200.

**Findings rejected (evidence-based):**
- "`.env` / `kadai/.env` credential files exist" — **false**; neither file exists in the workspace (`ls` verified). A `.gitignore` was added anyway as a guard.

**Accepted as-is (documented, not defects):**
- Client-computed order totals = the known [SECURITY GAP — BACKEND VALIDATION REQUIRED] for online payment (unchanged scope decision, COD flow).
- Category/coupon queries rely on single-field indexes (auto) — [VERIFY] live.
- Unused exports (`qsa`, `bySlug`, `loadingRows`, …) retained as service API surface; unused CSS classes (`admin-bar`, `filters`) scheduled for Phase-2 cleanup, harmless.

**One finding clarified:** the runtime demo catalog was removed entirely per product-owner instruction (same session) — the catalog now lives only in Firebase; offline preview shows honest empty states, and the admin seed button writes only to Firebase.

---

## ADDENDUM — Scenario sweep round 3 (142 automated scenarios)

A 142-scenario battery was added (`pricing · coupons · cart/merge ·
validators · orders/status · catalog/search · auth/session · XSS ·
HTML-a11y · security-scan`) and run to green. **REAL defects found & fixed:**

1. **Out-of-stock products could still be ordered** — `createOrder` only
   rejected qty > stock when stock > 0; stock 0 slipped through. Now blocks
   with an honest message.
2. **Fully-discounted baskets were charged the flat delivery fee** —
   shipping now applies only when the basket still costs money after
   discounts (₹0 total stays ₹0).
3. **Demo-mode admin product edits wiped sibling fields** — local write
   path replaced the whole document (stock edit would erase name/image/
   createdAt). Now merges; createdAt stamped on create only.
4. **Register duplicate detection was case-sensitive** (login was already
   fixed) — emails now lowercased like Firebase Auth; mixed-case dupes
   rejected.
5. **Home hero strip could emit an empty `<img src="">`** for imageless
   products — imageless items are now skipped.

Also fixed in the sweep harness itself (test bugs, logged honestly):
object-throws need message matching (not bare regex), the sweep needed its
own seeded catalog, and dynamic pages (product/order/admin) get their `<h1>`
from JS, so static h1 checks apply only to static pages.

**Final state: 142/142 sweep · unit suite PASS · 9-scenario e2e PASS ·
13/13 contrast PASS · 42/42 modules syntax-clean · 13/13 routes 200.**
Still honest: no real-browser run in this environment — the browser-side
pass remains with the owner.

---

## ADDENDUM — Admin restructured to a single page (owner request)

The admin console moved from `admin/index.html` (folder) to **one page:
`admin.html`** at the project root — leaving exactly one `index.html` in
the whole site.

Rewired & verified: admin.html (root asset paths) · header/footer links
plain, BASE-prefix helper removed · page-module links (`order.html`,
`index.html`, sign-in return `?next=%2Fadmin.html`) · `firebase.json`
rewrite `/admin → /admin.html` · docs updated · sweep page-contract list
updated. Old folder deleted (route 404s, as expected).

**Re-run to green: 142/142 sweep · unit PASS · e2e PASS · 42/42 modules ·
16/16 routes 200.**

---

## ADDENDUM — "Firebase connection only" round (owner-scoped)

Audit confirmed the app is Firebase-as-single-source-of-truth in Firebase
mode (all 8 services Firebase-first; zero local product data; no Admin-SDK
material client-side). Changes made:

1. `js/data/dev-catalog.js` renamed to `business-config.js` (honest naming;
   shipping rules + admin-only starter seed; not a data source).
2. **REAL BUG (full-loop test):** admin status updates trusted caller-supplied
   history → stale table could overwrite entries. Service now derives history
   from the server document; admin UI no longer sends it.
3. New `loop.mjs`: the exact admin→customer regression cycle — PASS.
4. `docs/firebase-integration-status.md` written (audit table, security
   re-verification, and the explicit list of template features NOT built per
   the "no new features" instruction).

Battery: 142/142 sweep · unit · e2e · loop · contrast · 42/42 syntax · 16/16 routes — ALL PASS.

---

## ADDENDUM — Video deep-scan (screen recording diagnosis)

Recording showed: sign-in attempted → admin page blocks with "Admin access only".

**Root causes found & fixed:**
1. **admin.js and checkout.js were missing the `authReady()` barrier** — the
   guard judged access before Firebase auth resolved, so a signed-in admin
   could be shown "Admin access only" (page-race bug; the barrier existed on
   orders/order/account but these two pages were missed, and one earlier edit
   to checkout was lost in a later batch).
2. **No recovery path after console role promotion** — role was read only at
   sign-in. Added `refreshRole()` (auth service) + a "Re-check my admin role"
   button on the blocked admin screen: promoted admins unlock live, no
   sign-out needed.
3. **Diagnostic UID display** — the blocked screen now shows the account's
   UID so the owner can verify the `users` document ID matches exactly
   (the likely setup mistake: role added to a doc whose ID ≠ Auth UID).

Also noted from the video (expected, not bugs): nav shows only Home/All
products because no categories exist in the fresh project yet — they appear
once aisles are created (or starter seed run) in the admin console.

Verification after fixes: 42/42 modules parse · 142/142 sweep · unit · e2e ·
full-loop · key routes 200. One honest note: an edit-tool race briefly
corrupted admin.js mid-fix (caught by syntax check, repaired by full-file
rewrite — final file verified parsing clean).

### Correction — the REAL root cause of "Checking permissions…"

The screenshot follow-up exposed a deeper bug than the page-level races:
the `authReady()` barrier promise was **never resolved by anyone** — the
wiring back to the auth service was missing. Every protected page
(admin, checkout, orders, order, account) would wait forever once it
awaited the barrier, in demo and live mode alike. Page-init paths are
outside the automated battery (services only), so it slipped through.

Fixed in `js/services/auth.js`: the barrier now lifts (once, idempotently)
- when auth answers — signed-in (after the role is read) or signed-out,
- instantly in demo mode,
- on auth-init failure, and
- after an 8s safety timeout no matter what (slow CDN / blocked network
  can no longer hang a page — it degrades to signed-out and the header
  updates live when auth catches up).

New regression test: `.arena-tests/auth-ready.mjs` (fails with a hang
warning if the barrier ever stops resolving). Battery re-run green.


