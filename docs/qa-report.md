
# Kadai E-commerce — QA / Testing / Validation Report

Date: 2026-09-22  
Scope: current workspace source, Firebase configuration/rules/index definitions, static checks, service-layer checks, and limited browser smoke checks.

## 1. PROJECT DISCOVERY

The application is a static, vanilla JavaScript e-commerce frontend. It uses HTML, CSS, ES modules, Firebase Web SDK modules loaded from the CDN, Firestore, Firebase Authentication, and Firebase Storage rules. It is not a MERN application and has no Node/Express API or MongoDB backend.

Inventory found:

| Area | Result |
|---|---:|
| HTML pages | 13 |
| JavaScript modules | 42 |
| CSS files | 5 |
| Local product image files | 10 |
| `package.json` / npm build | Not present |
| Firebase project configured in client | `kadai-36aa6` |
| Firebase Hosting public root | Repository root (`.`) |

The client contains a public Firebase web configuration. No service-account key, private key, or server credential was found. The web API key is not a secret, but Firebase Authentication, Firestore, Storage rules, API restrictions, and deployment IAM still protect the project.

Important evidence limitation: the repository contains historical documents claiming a `loop.mjs`, `.arena-tests`, `contrast.mjs`, and a 142-scenario battery. Those files are not present in the current workspace. Their historical PASS statements were not accepted as current test evidence.

## 2. ARCHITECTURE MAP

```text
HTML shell
  -> js/main.js page boot and auth/category header boot
  -> js/pages/<page>.js page controller
  -> js/components/* shared header, footer, state, toast, cards
  -> js/services/* Firebase-first data services
  -> js/firebase/sdk.js lazy Firebase SDK gateway
  -> Firestore / Auth / Storage
  -> localStorage/localdb fallback only when Firebase is unavailable
```

Primary data paths:

| Feature | Frontend service | Firebase data |
|---|---|---|
| Catalog/categories | `products.js`, `categories.js` | `products`, `categories` |
| Cart | `cart.js` | `carts/{uid}` for signed-in users; guest local storage |
| Wishlist | `wishlist.js` | `wishlists/{uid}` |
| Auth/profile | `auth.js`, `users.js` | Firebase Auth and `users/{uid}` |
| Addresses | `addresses.js` | `users/{uid}/addresses` |
| Orders | `orders.js` | `orders` |
| Reviews | `reviews.js` | `reviews` |
| Coupons | `coupons.js` | `coupons` |
| Product images | URL/path field in current admin form | Storage rules exist, but current admin UI does not use the upload service |

## 3. FEATURE INVENTORY

Implemented in the current source:

- Home page with categories, featured products, trust content, and product cards.
- Product listing, search, category filtering, price/availability filtering, sorting, and load-more behavior.
- Product detail page, image display, stock state, quantity control, cart action, wishlist action, reviews, and related products.
- Guest cart and signed-in Firestore cart, cart merge on login, quantity normalization, removal, coupon display, and totals.
- Guest wishlist and signed-in wishlist, wishlist merge, and header count.
- Registration, login, logout, forgot-password flow, protected-page redirects, and role-aware admin guard.
- Address/profile management and cash-on-delivery checkout flow.
- Order creation, order history/detail pages, status history, and admin status transitions.
- Admin product/category/coupon/review/order management and direct product image URL/path entry.
- Firebase rules and local composite index definitions.
- Responsive CSS, semantic landmarks, labels, skip link, focus styles, and reduced-motion handling.

Not implemented or intentionally outside the current scope:

- Online payment gateway, payment verification, refunds, and payment webhooks.
- Trusted server-side order pricing, stock reservation, and idempotent order creation.
- Product variants/SKU/size/color, brand filters, rating aggregation, search suggestions, and popularity ranking.
- Product deletion, customer management, dashboard KPIs, banner/content management, and settings UI.
- Firebase Storage upload from the current admin form. The form stores an image URL/path; the Storage service/rules are present but not wired to the form.
- PWA/offline caching, i18n/Tamil translation, email verification, and transactional email.

These are feature gaps, not automatically defects, but they must not be represented as available production features.

## 4. TEST PLAN

Checks were performed in this order:

1. Discover pages, modules, assets, configuration, Firebase rules, indexes, and docs.
2. Parse every JavaScript module and JSON configuration file.
3. Inspect HTML references, page boot mapping, imports, service boundaries, and error paths.
4. Exercise pure cart, wishlist, pricing, coupon, and validation logic.
5. Inspect Firestore and Storage rules for ownership, role checks, public reads, and deny-all fallback.
6. Inspect index dependencies and attempt the Firebase CLI read against the configured project.
7. Run limited browser/static-server smoke checks where possible.
8. Apply safe code fixes and repeat syntax, JSON, and pure-logic checks.
9. Classify remaining items as PASS, PARTIAL, FAIL, BLOCKED, NOT TESTED, or NOT IMPLEMENTED.

The test was not called a full release certification because authenticated Firebase journeys, real rule enforcement, responsive viewport coverage, and performance measurements could not all be executed in this environment.

## 5. TEST EXECUTION

Verified in the current workspace:

| Check | Result | Evidence |
|---|---|---|
| JavaScript syntax | PASS | `node --check` on all 42 modules; 0 failures after fixes |
| JSON syntax | PASS | `firebase.json` and `firestore.indexes.json` parsed successfully |
| Pure business logic | PASS | Cart merge/max quantity, wishlist union, quantity clamp, pricing invariant, coupon acceptance, and validators executed |
| Static page/module inventory | PASS | 13 HTML pages and 42 modules found; all `data-page` modules exist |
| Local asset inventory | PASS | 10 product images found; static references inspected |
| Browser signed-out smoke | PARTIAL PASS | Home/catalog rendering, product search, signed-out checkout gate, and signed-out orders gate observed previously in Chrome |
| Firebase CLI live project access | BLOCKED | CLI account lacks required project permissions |
| Full authenticated browser flow | NOT TESTED | Requires a usable test account and reliable browser session |
| Responsive viewport matrix | NOT TESTED | No complete 320–1920px browser matrix was run |
| Lighthouse/Web Vitals | NOT TESTED | No performance run was available |

The pure-logic command emitted only a Node module-type warning because this no-build project has no `package.json`; the assertions passed. Adding a package file solely to silence that warning would change project packaging and was not necessary for browser execution.

## 6. BUG REPORT

### Fixed during this audit

| ID | Severity | Problem | Root cause | Status |
|---|---|---|---|---|
| QA-001 | High | Orders page could fail when its composite query index was unavailable | `userId` equality plus `createdAt` ordering required a composite index | Fixed by using a single equality query with a bounded result set and client-side sort; syntax rechecked |
| QA-002 | High | Checkout could fail while handing a coupon from cart to checkout | Coupon helper functions/state were missing or not shared between pages | Fixed with session handoff, checkout revalidation, order propagation, and clear-on-success |
| QA-003 | Medium | Search results did not honor the selected sort | Search rendering bypassed the common sort path | Fixed with a whitelist and client-side sorting for search and appended pages |
| QA-004 | Medium | Header count refresh could create rejected promises after a cart/wishlist read error | One failed count aborted the other count and was not isolated | Fixed with independent guarded count reads and badge hiding |
| QA-005 | Medium | Public product detail could remain on “Loading product…” while Auth was hydrating | Product fetch waited for the authentication barrier even though catalog reads are public | Fixed by fetching/rendering the product immediately and refreshing auth-dependent controls later |
| QA-006 | Medium | Malformed local cart data could break cart rendering or produce unsafe quantities | Stored cart values were assumed to be arrays and valid numbers | Fixed with array guards and `clampQty` normalization |
| QA-007 | Medium | Several admin async actions could leave unhandled failures | Event handlers did not consistently catch and surface service errors | Fixed with guarded role refresh, seed, status, stock, category, and review operations |
| QA-008 | Medium | Very narrow mobile header could overflow | The first-row controls had insufficient compact-width rules | Added a `max-width: 380px` safeguard for 320px-class screens |
| QA-009 | Medium | Raw Firebase error text could leak implementation details into user-facing UI | Generic error state could expose arbitrary backend messages | Fixed error mapping to known `kadai/*` messages and safe generic fallbacks |
| QA-010 | Medium | Generated Firebase debug log could be served by Hosting | Hosting public root is the repository root and the log was not ignored | Deleted the generated log and added it to Hosting ignore and `.gitignore` |
| QA-011 | Medium | Service-level order snapshot accepted unnormalized caller quantities | Order creation trusted the page’s line objects | Fixed by normalizing product IDs and quantities before live catalog joining |

### Remaining defects / release blockers

| ID | Severity | Finding | Required resolution |
|---|---|---|---|
| QA-012 | Critical for production commerce | Client calculates order totals and sends the resulting order document. Firestore rules check shape/status/ownership but do not independently compare price, discount, shipping, stock, or catalog version. | Move order creation to a trusted Cloud Function/Cloud Run/Express backend. Re-read prices and stock server-side, use a transaction/reservation, and write an idempotency key. Tighten rules so clients cannot create arbitrary financial totals. |
| QA-013 | High / blocked | Firebase CLI account cannot inspect or deploy the project. | Grant the deploying principal `roles/serviceusage.serviceUsageConsumer` plus the required Firebase/Firestore IAM roles, wait for propagation, then verify rules/indexes with the CLI. |
| QA-014 | Medium | Storage upload is not wired to the current admin product form; the old CORS/upload path is therefore not a verified supported flow. | Keep using validated HTTPS image URLs, or wire the form to Firebase Storage with a verified bucket name, CORS configuration, auth, and post-upload URL persistence. |
| QA-015 | Medium | Many dynamic form fields have error slots but do not consistently connect them with `aria-describedby`. | Add explicit input-to-error associations and complete a keyboard/screen-reader audit. |
| QA-016 | Medium | No CSP or other explicit security headers are configured in Hosting. | Add CSP, `X-Content-Type-Options`, `Referrer-Policy`, HSTS in production, and review Firebase Authorized Domains/API restrictions. |

## 7. SECURITY AUDIT

Static security review results:

- Firestore rules use a deny-all fallback and distinguish public active catalog reads, owner reads/writes, and admin operations.
- Admin authorization is based on the Firestore user role in rules, not merely on a hidden button or client variable.
- Cart, wishlist, address, profile, and order reads are owner-scoped in the rules.
- Product/category public reads are limited to active records.
- Storage rules restrict writes/deletes to admins and restrict content type and size.
- Dynamic product, address, order, review, and category content is generally passed through `escapeHtml` or `textContent` before insertion.
- `next` navigation handling is intended to accept same-site relative paths rather than arbitrary external URLs.
- No fake payment success or secret server credential was found.

The most important security/data-integrity failure is QA-012. A malicious authenticated client can potentially submit an order with manipulated totals or stale stock while still satisfying the current rule shape. Cash on delivery and manual review reduce immediate payment exposure, but they do not make the data model trustworthy for production commerce. This is a release blocker for online payment and a high-priority integrity issue even for COD.

Live rules testing with an emulator or project account was not completed. Static rule review is not a substitute for deployed-rule tests.

## 8. FIREBASE AUDIT

Local configuration and rules:

- `firebase.json` is valid and points Hosting at the repository root.
- Firestore and Storage rules exist with a deny-all fallback.
- `firestore.indexes.json` is valid and contains the catalog/category/review/order composite definitions used by the source.
- Products/categories still depend on their declared composite indexes for filtered/order queries.
- Reviews use a product/status/createdAt query and therefore depend on the corresponding index.
- The customer order-history query was changed so it no longer depends on the `userId + createdAt` composite index; it reads up to 50 owner records and sorts locally.

Live access result:

```text
firebase firestore:indexes --project kadai-36aa6
HTTP 403: caller lacks datastore.indexes.list / required project access
```

The same project reported the missing `serviceusage.services.use` permission during the earlier deployment attempt. Therefore the index list, deployed rules, deployed Storage CORS, and actual deployed data could not be verified from this account. The Firebase Console screenshots showing “Enabled” prove that two indexes exist in the Console, but they do not prove every current query/index/rules deployment is correct.

## 9. RESPONSIVE AUDIT

Static CSS review found responsive rules for:

- Header/nav/search wrapping and mobile navigation.
- Two-column product cards on narrow screens, with compact action controls.
- Cart line wrapping at small widths.
- Checkout/account/admin layouts and intentionally scrollable admin tables.
- Reduced spacing and compact header controls at widths below 380px.

The supplied mobile screenshots exposed real layout pressure in product cards and the header. The product action wrapping and narrow-header safeguards were addressed in source.

Full browser validation at 320, 360, 375, 390, 414, 480, 600, 768, 820, 1024, 1280, 1440, and 1920px was not completed. Status: PARTIAL / NOT TESTED for release certification.

## 10. ACCESSIBILITY AUDIT

Static positives:

- Skip link and semantic page landmarks exist.
- Page headings and navigation structure are present.
- Form controls generally have labels and useful autocomplete/input types.
- Focus-visible styles and minimum-size controls are present.
- Toasts, loading regions, and important errors use live/alert semantics in key flows.
- Product images use meaningful alt text; decorative images are generally empty-alt.
- Wishlist and gallery controls expose pressed state or labels.

Open accessibility work:

- Complete `aria-describedby` links for every dynamically reported field error.
- Verify focus movement after route changes, modal-like states, and form errors.
- Run a real keyboard-only and screen-reader pass.
- Measure contrast and automated WCAG checks with a tool that is actually present in the repository; the historical `contrast.mjs` referenced by old documentation is absent.

Status: static review PARTIAL PASS; human accessibility validation NOT TESTED.

## 11. PERFORMANCE AUDIT

No Lighthouse, WebPageTest, Chrome trace, or Web Vitals measurement was run. Therefore LCP, CLS, INP, TTFB, JavaScript transfer, image transfer, and cache performance are NOT TESTED.

Static observations:

- The home page limits featured reads and product listing supports bounded/load-more reads.
- Product images use dimensions and lazy loading in relevant secondary locations.
- There are no evident realtime listeners in the main catalog flow.
- Search appears to scan a bounded product result set client-side, which is acceptable for a small catalog but will not scale indefinitely.
- Firebase SDK modules and Google Fonts are external runtime dependencies.
- A production build/minification/bundling pipeline is not present.

Performance status: NOT TESTED; scaling risk is MEDIUM once the catalog grows materially.

## 12. DATA CONSISTENCY AUDIT

Good current behavior:

- Cart lines store product IDs/quantities and join fresh catalog records instead of trusting stale prices.
- Quantity values are clamped to 1–99 before rendering and order snapshot creation.
- Product stock 0 blocks the current client order path; requested quantity above known stock is also blocked.
- Order items snapshot product name, image, and price-at-purchase.
- Guest cart/wishlist merge logic preserves the larger cart quantity and unions wishlist IDs.
- Coupon state now survives cart-to-checkout navigation and is revalidated.
- Order status transitions are restricted by the service transition graph.

Critical remaining consistency risks:

- No atomic stock decrement/reservation exists. Two customers can pass a client-side stock check concurrently.
- No server-side price/discount/total verification exists.
- No idempotency key prevents duplicate order creation after a retry or network ambiguity.
- Firestore server timestamps may be pending briefly; the list service has a client timestamp fallback, but this should be covered by deployed-data tests.

## 13. END-TO-END VALIDATION

Observed signed-out/browser smoke coverage:

- Home loaded and displayed Firebase-backed category/featured product content in the available browser run.
- Product search rendered a matching product card.
- Checkout correctly required sign-in when unauthenticated.
- Orders correctly required sign-in when unauthenticated.

Not completed:

- Authenticated register/login/logout with a real Firebase account.
- Guest cart to login merge against deployed Firestore.
- Authenticated checkout and order write.
- Customer order history/detail after an actual order.
- Admin create/update product and customer fetch in the same live project.
- Review submit/approve/public display against deployed rules.
- Storage upload and CORS verification.

End-to-end status: signed-out smoke PASS/PARTIAL; authenticated Firebase loop BLOCKED by access/account/environment limits; full E2E NOT CERTIFIED.

## 14. REGRESSION VALIDATION

After the code fixes:

- 42/42 JavaScript modules pass `node --check`.
- `firebase.json` and `firestore.indexes.json` parse.
- Pure cart/wishlist/pricing/coupon/validation smoke assertions pass.
- Generated `firebase-debug.log` is absent and ignored.
- The new order quantity normalization parses and is covered by the same syntax pass.

The historical “142/142” and “full-loop” claims are not counted as current regression evidence because their referenced scripts are absent. They should be rerun from a committed test harness before release.

## 15. FIX PLAN

Priority order:

1. Restore Firebase project access for the deployment account. Run `firebase deploy --only firestore:rules,firestore:indexes` and verify the deployed rules/indexes in the correct project.
2. Create a trusted order endpoint/function. Re-read catalog prices and stock, calculate totals server-side, use a transaction/reservation, and enforce an idempotency key.
3. Test an authenticated customer/admin loop against the deployed project, including cross-user reads and unauthorized writes.
4. Decide the image strategy: validated external URL only, or a complete Storage upload flow with CORS and rules verification.
5. Add the missing security headers/CSP and review Firebase Authorized Domains/API-key restrictions.
6. Add `aria-describedby` wiring and perform a keyboard/screen-reader audit.
7. Run the viewport matrix and Lighthouse/Web Vitals measurements.
8. Commit a real automated test harness so future PASS claims are reproducible.

## 16. FINAL QA MATRIX

| System | Result | Release interpretation |
|---|---|---|
| HTML/module structure | PASS | No syntax/module inventory defect found |
| JavaScript syntax | PASS | 42/42 parse |
| JSON configuration | PASS | Firebase config/index JSON parse |
| Cart/wishlist pure logic | PASS | Core merge/quantity behavior verified |
| Pricing/coupon pure logic | PASS | Core arithmetic invariants verified |
| Catalog signed-out browser smoke | PARTIAL PASS | Rendering observed; full browser matrix pending |
| Product detail public loading | FIXED / PARTIAL | Auth barrier defect fixed; full browser retest pending |
| Order history query | FIXED / PARTIAL | Composite dependency removed; live signed-in read pending |
| Firestore deployed rules/indexes | BLOCKED | Firebase IAM prevents verification |
| Storage upload/CORS | NOT TESTED / NOT IMPLEMENTED in current UI | URL entry is the supported current path |
| Authenticated checkout | BLOCKED | Requires test account and live project access |
| Security model | PARTIAL PASS | Rules look scoped; trusted order calculation missing |
| Responsive layout | PARTIAL | CSS safeguards present; viewport matrix pending |
| Accessibility | PARTIAL | Static semantics good; human audit pending |
| Performance | NOT TESTED | No measurements |
| Production readiness | FAIL / HOLD | QA-012 and QA-013 block release |

## 17. PRODUCTION READINESS CHECKLIST

| Requirement | Status |
|---|---|
| All application modules parse | PASS |
| No private credentials committed | PASS from static scan |
| Public catalog read path | PARTIAL PASS; live project verification pending |
| Correct Firebase indexes deployed | BLOCKED |
| Firestore rules deployed and tested | BLOCKED |
| Storage upload/CORS verified | NOT IMPLEMENTED / NOT TESTED |
| Authenticated checkout verified | BLOCKED |
| Server-side totals and stock integrity | FAIL — not present |
| Duplicate-order protection | FAIL — no idempotency key |
| Mobile viewport QA | NOT TESTED |
| Accessibility manual QA | NOT TESTED |
| Performance budget | NOT TESTED |
| CSP/security headers | FAIL — not configured |
| Honest error/loading/empty states | PARTIAL PASS |

## 18. FINAL FINDINGS

The codebase is structurally healthy enough for continued development: the current JavaScript and JSON checks pass, the primary catalog/cart/order service boundaries are understandable, and several user-reported failures were fixed in source.

It is not certified as production-ready or “100% bug-free.” The release gate is HOLD because live Firebase access is blocked and the order write path is not trusted for price, discount, stock, or duplicate-order integrity. The next concrete action is to fix the deploying account’s IAM permissions, run the deployed Firebase tests with real customer/admin accounts, and implement trusted server-side order creation before accepting real commerce traffic.



