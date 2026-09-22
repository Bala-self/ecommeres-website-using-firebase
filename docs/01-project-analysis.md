
# PROJECT ANALYSIS — Kadai (working identity)
Document 01 · Updated at full-build completion · Status: CURRENT

This document satisfies Master Prompt §103 (First Execution Instruction).
It is a living document: sections are updated when verified facts change.

---

## 1. PROJECT UNDERSTANDING

Build a complete e-commerce web application:

- **Stack:** HTML5 + CSS3 + vanilla JavaScript (ES modules, no framework, no build step) + Firebase (Auth, Firestore, Storage, Hosting, Security Rules).
- **Explicitly out of scope:** ALL payment processing — no gateway, no keys, no card fields, no UPI collection, no fake "payment successful". The release ends at a truthful order-request flow (cash-on-delivery-style), with a clean architectural seam for future online payment.
- **Quality bar:** the output must feel like a real product team designed it for a specific business — not a template. Priority order per §96: Security → Correctness → Requirements → Data integrity → Accessibility → Usability → Maintainability → Performance → Responsive → Visual → Motion → Decoration.

**Customer input recorded this session:**

| Question | Answer | Consequence |
|---|---|---|
| What is sold? | "No specific — common website" | Concrete demo identity chosen (below); architecture kept product-agnostic |
| Brand name | Propose one | Proposed: **Kadai** |
| Firebase | No project yet — guide me | Placeholder config + demo-mode fallback + `docs/firebase-setup.md` walkthrough |
| Admin | Full admin | Products, categories, orders, reviews, coupons moderation all in roadmap |

**Resolved conflict:** §7/§8 demand non-generic, product-specific design, but no product domain was given. Resolution: adopt a specific, believable retail identity for all content and design decisions, while keeping every technical layer (schema, services, pages) driven by data, so the identity can be replaced by editing data + tokens, not code. This is stated openly rather than pretending the site is universal.

---

## 2. CURRENT STATE (AUDIT)

Workspace inspected (`find` over `/home/user`): contains only `uploads/ecommerce_master_prompt_expert_human_design.txt`.

| Area | Status |
|---|---|
| A. Existing stack | MISSING — greenfield |
| B. Architecture | MISSING |
| C. Pages | MISSING |
| D. Components | MISSING |
| E. Data model | MISSING — designed in this document |
| F. Firebase collections | MISSING — no Firebase project exists [VERIFY: user creates one per setup guide] |
| G. Auth behavior | MISSING |
| H. Storage behavior | MISSING |
| I. Security rules | MISSING |
| J. User journeys | MISSING — specified in §6 below |
| K. Design system | MISSING — DNA specified in §8, tokens locked in Phase 02 |
| L. Responsive behavior | N/A — nothing rendered yet |
| M. Accessibility | N/A |
| N. Performance | N/A |
| O. Bugs | N/A |
| P. Technical debt | None yet |
| Q. Missing requirements | Everything (greenfield) |
| R. Risks | §5 below |
| S. Unknowns | §5 below |

No existing code can be damaged. Preserve-nothing constraints do not apply.

---

## 3. REQUIREMENTS

### 3.1 Functional (customer)
- Discover products (home, categories), search, filter, sort
- Product details: images, price, stock, description, quantity, add to cart / wishlist
- Cart: add/update/remove/clear, persistent for guests (LocalStorage) and users (Firestore), merge on login
- Wishlist: add/remove/view/move-to-cart
- Account: register (email/password), login, logout, password reset, profile, address book
- Checkout WITHOUT payment: customer details → shipping address (6-digit PIN) → review → create order request
- Orders: history + details, truthful statuses, pay-on-delivery framing

### 3.2 Functional (admin — FULL scope per user)
- Products: CRUD, activate/deactivate, inventory, images (Storage upload)
- Categories: CRUD, activate/deactivate
- Orders: list, inspect, advance status (placed → processing → shipped → delivered / cancelled)
- Reviews: moderate (approve/reject)
- Coupons: create/manage

### 3.3 Non-functional
- WCAG 2.2 AA-oriented (no formal conformance claim without audit)
- Mobile-first responsive; no horizontal overflow; ≥44px touch targets
- No framework; no build step; Firebase SDK via official ESM CDN only (§62 dependency policy: 0 npm dependencies)
- Honest states everywhere: loading, empty, error, out-of-stock, demo-mode

### 3.4 Security
- Firestore + Storage rules as the ONLY authorization layer; UI hiding is never security
- Admin = `users/{uid}.role == 'admin'`, enforced in rules, first admin set via console
- No client-trusted prices for order financials — see §11 for the explicit gap handling
- No secrets in client (Firebase web config is public-by-design; rules carry the security)

### 3.5 Constraints
- NO payment integration of any kind (§89)
- No fake data presented as real; demo data must be visibly labeled
- No TypeScript, no bundler, no CSS framework, no icon library unless justified later

### 3.6 Assumptions (explicit — correct me if any is wrong)
1. **Market: India** → INR, `en-IN` formatting, 6-digit PIN codes, GST-inclusive display pricing.
2. **Money stored as integer paise** in Firestore and in code (never floats).
3. **Order model:** current release = "order request / pay on delivery" — a real, honest business flow. Online prepayment is the future seam (§89/§90).
4. **English UI** (Tamil flavor allowed in brand voice accents).
5. Single vendor (no multi-seller).
6. Email/password auth only at first (no Google/phone until required).
7. Modern evergreen browsers; no IE.
8. Product catalog has no real source yet → demo-mode uses a clearly labeled seed catalog.

---

## 4. PRODUCT IDENTITY (§6)

> **PRODUCT NAME:** Kadai (கடை — Tamil for "shop")
> **PRODUCT CATEGORY:** General merchandise for the home — kitchenware, storage, cleaning, small home utilities (a "neighbourhood everything store")
> **TARGET AUDIENCE:** Indian households; practical buyers who want dependable everyday goods at fair prices, shopping on phones primarily
> **PRIMARY USER GOAL:** Find a specific everyday item quickly, trust what you get, check out in under a minute
> **BUSINESS OBJECTIVE:** Be the trusted local online store; repeat orders over one-time spectacle
> **BRAND PERSONALITY:** Warm, straight-talking, well-stocked, local. Like a shopkeeper who knows your name — not a startup, not a luxury house.
> **VISUAL CHARACTER:** Market-hall warmth — paper-cream ground, deep bottle-green (awning) as the working color, terracotta accent used sparingly for price/action moments; sturdy type, generous product imagery, visible structure (you can see the shelves)
> **CONTENT CHARACTER:** Plain, specific, useful. "Stainless steel, 1.5 L, dishwasher-safe." No hype adjectives, no exclamation marks, no "Revolutionize your kitchen!"
> **TRUST SIGNALS:** Real stock counts, real specs, clear return window, GST-inclusive prices shown once (no surprise math at checkout), a human contact in Chennai
> **MUST NOT COMMUNICATE:** cheap/fake-market, corporate SaaS, luxury, futuristic, gamified, American-mall generic

**Why this identity:** it is specific enough to force real design decisions (§98 gate: "could another brand use this page unchanged?" → no), while the catalog schema remains generic merchandise — swap the seed catalog and tokens to repurpose the entire codebase for any retail vertical.

---

## 5. ASSUMPTIONS, UNKNOWNS, RISKS

**[UNKNOWN] / [VERIFY] register**
- Real business name/brand assets — user may rename Kadai at any time (tokens centralized for this reason)
- Real product catalog, photos, prices — demo seed used until provided [CONTENT REQUIRED]
- User's Firebase plan tier (Spark vs Blaze) — affects Cloud Functions availability for order validation
- GST invoicing requirements — [INSUFFICIENT INFORMATION], excluded from this release
- Delivery zones and shipping charges — [INSUFFICIENT INFORMATION]; shipping modeled as flat config value, clearly marked replaceable
- Whether email verification is required before first order — assumed NO until stated

**Risks**
| Risk | Severity | Mitigation |
|---|---|---|
| Client-side order totals untrusted (no backend compute without Cloud Functions/Blaze) | HIGH (production) | §11: explicit [SECURITY GAP — BACKEND VALIDATION REQUIRED]; server-side validation becomes a pre-launch gate; for COD-style request flow the blast radius is limited and admin reviews every order before processing |
| User pastes config with rules still open (test mode) | HIGH | Setup guide instructs production mode; Phase 03 ships locked-down rules; rules file lives in repo |
| Demo seed data mistaken for real products | MEDIUM | Visible "Demo catalogue" banner whenever Firebase is not connected; seed isolated in `js/data/` |
| Scope creep (reviews/coupons/admin are large) | MEDIUM | Phase gates with LOCK protocol; each phase independently shippable |
| Single-developer workflow without build step → drift | LOW | Design tokens + service layer + documented conventions enforced at code review |

---

## 6. UX ARCHITECTURE (§13/§14)

**Journeys (all require happy + failure paths before LOCK):**
- A Discovery: Home → Category → List → Product
- B Search: Query → Results → Filter/Sort → Product
- C Cart: Product → Add → Cart → Qty/Remove → Recalculate
- D Account: Register → Session → Profile → Orders
- E Checkout (no payment): Cart → Address → Review → Create order request → Truthful confirmation
- F Order history: Login → Orders → Order detail
- G Wishlist: Product → Wishlist → Move to cart
- H Admin: Admin login → Products/Orders/Reviews/Coupons management

**Standing user questions the UI must answer at all times:** Where am I? What am I looking at? What can I do? What happened? What next?

**State policy:** every data region implements loading (skeleton, preserving layout), empty (with the one sensible next action), error (human wording + retry), and demo-mode (visible banner). No blank waits. No raw Firebase errors in user-facing text.

---

## 7. FEATURE ROADMAP (§88, adapted — full admin confirmed)

| Phase | Deliverable | Status |
|---|---|---|
| 01 | Project foundation: structure, HTML shell, CSS architecture, JS skeleton, Firebase config pattern + demo-mode fallback | **DONE** |
| 02 | Design system: tokens locked (contrast-verified — 13/13 pairs ≥ 4.5:1), type scale, controls, states | **DONE** |
| 03 | Firebase foundation: lazy SDK gateway, rules v1 shipped in-repo (live run awaits project creation) | **DONE*** |
| 04 | Product data: schema, productService, seed strategy, all states | **DONE** |
| 05 | Category system | **DONE** |
| 06 | Header/navigation/search entry (desktop + mobile) | **DONE** |
| 07 | Homepage from product identity (no generic hero) | **DONE** |
| 08 | Product listing: filters, sort, load-more paging | **DONE** |
| 09 | Search results + states (honest v1 keyword search) | **DONE** |
| 10 | Product details + gallery + related | **DONE** |
| 11 | Authentication (register/login/logout/reset; demo = labeled passwordless) | **DONE** |
| 12 | Profile + address book | **DONE** |
| 13 | Cart (guest + user, persistence, totals in paise) | **DONE** |
| 14 | Cart merge on login (max-qty rule, verified by e2e) | **DONE** |
| 15 | Wishlist | **DONE** |
| 16 | Checkout WITHOUT payment → COD order request (PIN validation, truthful confirmation) | **DONE** |
| 17 | Order history + details + status timeline | **DONE** |
| 18 | Reviews + moderation | **DONE** |
| 19 | Coupons | **DONE** |
| 20 | Admin: products, categories, orders (dominant), reviews, coupons, seed, uploads | **DONE** |
| 21 | Security audit — checklist in docs/test-report.md §5 (client-totals gap documented) | **DONE*** |
| 22 | Accessibility audit — contrast computed (13/13); manual SR walkthrough pending | **DONE*** |
| 23 | Performance audit — lazy SDK, single catalog reads, skeleton layouts, HTTP cache headers | **DONE*** |
| 24 | Responsive audit — mobile-first CSS, 480/768/900 breakpoints; device pass pending | **DONE*** |
| 25 | Visual QA — human render pass pending (no browser automation in this environment) | **PENDING HUMAN** |
| 26 | Full regression — demo-path e2e re-run after every fix (4 defects found & fixed, logged) | **DONE** |
| 27 | Deployment — firebase.json + rules ready; `firebase deploy` awaits project | **DONE*** |

`DONE*` = implemented and verified as far as this environment allows; the
remaining step needs the user's Firebase project or a human browser pass.
`docs/test-report.md` holds the honest line between tested and claimed.

---

## 8. DESIGN DNA (§9–§12) — v0 draft, LOCKED in Phase 02

**Signature device:** the **market awning** — a scalloped green/cream stripe used ONLY as a structural accent (top edge of the header, one rule per page). Ownable, category-true, absent from AI-slop patterns. Everything else stays quiet so products carry the page.

- **Typography:** Fraunces (display/brand — warm, slightly old-shop serif) + Archivo (UI/body — sturdy grotesque). Fallbacks: Georgia / system-ui. Loaded via Google Fonts CDN with graceful fallback (preview sandbox shows fallbacks).
- **Color v0 (contrast verified in Phase 02):**
  - `--paper` #FAF7F0 (bg) · `--ink` #221D15 (text) · `--ink-muted` #6B6357
  - `--green-900` #173F32 (primary deep) · `--green-700` #1F5C46 (buttons/links — AA on paper)
  - `--terracotta` #B4472B (accent: price emphasis, alerts-adjacent moments — never decoration)
  - `--mustard` #D9A03F (highlight, large surfaces only) · borders `#E3DCCD`
  - success/warning/error greens/ambers/reds defined in Phase 02 with ratio checks
- **Shape:** radii 4 (inputs) / 8 (buttons, cards) / 14 (dialogs). No pill-spam. Awning scallop is the only curve flourish.
- **Depth:** borders first, single soft shadow reserved for floating layers (menus, dialogs). No shadow-everything.
- **Spacing scale:** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96.
- **Layout:** max content 1200px (listing/product may use 1280px); page padding 16→32px responsive; breakpoints 480 / 768 / 1024 / 1280. Grid follows content: listing uses responsive auto-fill minmax(220px); product page uses asymmetric 55/45 split on desktop, stacked on mobile.
- **Hierarchy rule (§12):** every page defines PRIMARY / SECONDARY / TERTIARY information + ONE primary action before build.

---

## 9. TECHNICAL ARCHITECTURE

```
kadai/
├── index.html                  ← Phase 01: baseline shell (becomes homepage in Phase 07)
├── products.html  product.html  cart.html  checkout.html
├── order.html     orders.html   wishlist.html
├── login.html     register.html account.html        (created with their phases)
├── admin/                                            (Phase 20)
├── css/
│   ├── tokens.css     design tokens (Phase 01 scaffold → Phase 02 lock)
│   ├── base.css       reset + element defaults + utilities
│   └── layout.css     shell: container, header/main/footer regions
├── js/
│   ├── main.js                app entry / boot sequence
│   ├── core/       env.js (environment resolution) · dom.js (helpers) · format.js (₹ paise, dates — Phase 04)
│   ├── firebase/   config.js (placeholder + docs pointer) · init.js (SDK loader w/ demo fallback)
│   ├── services/   productService, cartService, orderService, … (Phase 04+; pure logic, zero DOM)
│   ├── data/       dev-catalog.js (DEVELOPMENT ONLY seed, demo mode)
│   ├── components/ header.js, productCard.js, … (Phase 06+)
│   └── pages/      one module per page (Phase 04+)
├── assets/            favicon.svg, product imagery (later)
├── docs/              01-project-analysis.md · firebase-setup.md · (per-phase additions)
├── firestore.rules    (Phase 03)     ├── storage.rules (Phase 03)
└── firebase.json      (Phase 27, Hosting)
```

**Responsibility model (§16):** Firebase access lives only in `js/firebase/` + `js/services/`. Pages/components render; services compute; core formats. No price math in DOM code. No CSS in JS.

**Serving:** any static server (dev: `python3 -m http.server`). ES modules require http — never open via `file://`.

---

## 10. FIREBASE DATA MODEL (§18/§38 — authoritative field lists)

Money: **integer paise**. Times: Firestore Timestamp. All lists paginated (limit + cursor), no full-catalog downloads.

- **products/{id}** — name, slug, categoryId, description(short+long), pricePaise, compareAtPricePaise?, stock, images[]{url,alt}, keywords[] (lowercase, for v1 prefix search — honest about not being full-text), ratingAvg?, ratingCount?, featured, newArrival, active, createdAt, updatedAt
- **categories/{id}** — name, slug, description, image?, active, createdAt, updatedAt
- **users/{uid}** — profile only (name, phone?, defaultAddressId?, role: 'customer'|'admin', createdAt). NEVER passwords; auth identity stays in Firebase Auth.
- **users/{uid}/addresses/{id}** — label, receiver, phone, line1, line2?, landmark?, city, state, pincode (6-digit)
- **carts/{uid}** — items[]{productId, qty, addedAt}, updatedAt (created on first authenticated write; guests use LocalStorage)
- **wishlists/{uid}** — productIds[]
- **orders/{id}** — orderNumber (human-readable), userId, items[]{productId, name, priceAtPurchasePaise, qty, image?} (SNAPSHOT — survives later product edits), itemsSubtotalPaise, discountPaise?, couponCode?, shippingPaise, totalPaise, shippingAddress (snapshot), status: draft|placed|processing|shipped|delivered|cancelled, paymentStatus: **'NOT_IMPLEMENTED'** (literal, per §90), paymentProvider: null, transactionReference: null, createdAt, updatedAt, statusHistory[]{status, at}
- **reviews/{id}** — productId, userId, userDisplayName, rating 1–5, text, status: pending|published|rejected, createdAt (product ratingAvg/ratingCount updated only from trusted path — Phase 18 decision)
- **coupons/{code}** — type: percent|flat, value, minOrderPaise, maxDiscountPaise?, expiresAt?, usageLimit?, usedCount, active

---

## 11. SECURITY MODEL (§21–§24, §39)

- **Rules are the app's authorization.** UI restrictions are UX only.
- Public read: `categories` + `products` where `active == true`. Everything else authenticated.
- Ownership: carts/wishlists/addresses/orders readable & written only by `request.auth.uid == uid` (orders: create constrained to own uid + validated shape; financial totals flagged below).
- Admin: `get(/users/$(request.auth.uid)).data.role == 'admin'` for all product/category/coupon/review-moderation/order-status writes.
- Storage: admin-only writes to `products/`, images public-read (URLs are not secrets; rules still cap type/size/ownership).
- **Declared gap:** without Cloud Functions, the client computes order totals. For the COD-style order-request flow this is survivable (admin reviews before processing; nothing is charged), and it is recorded as **[SECURITY GAP — BACKEND VALIDATION REQUIRED]** — a launch blocker for any online-prepayment release, with Cloud Functions price recomputation as the planned fix (requires Blaze — [VERIFY] user's plan).
- Rules file ships in-repo (Phase 03) and is pasted to the console; hosting deploys them (`firebase deploy --only firestore:rules`).

---

## 12. PAGE ARCHITECTURE (§15)

Flat HTML per page (crawlable, zero-JS-framework), shared shell: header (brand, search, cart, account) + footer (policies, contact) — markup generated by `components/` so it stays consistent; `main` per page. Admin lives under `/admin/` with its own denser shell — it is a workbench, not a marketing page (§44: order management visually dominant, no vanity KPI cards).

---

## 13. PHASE 01 SCOPE (this implementation)

**What changes:** create the repository skeleton and a truthful baseline shell that proves structure, styles, scripts, and environment detection work — before any feature exists.

**Files created:**
- `README.md` — project overview, how to run
- `docs/01-project-analysis.md` — this document
- `docs/firebase-setup.md` — step-by-step Firebase console walkthrough (user requested guidance)
- `index.html` — semantic shell + foundation self-check (replaced by real homepage in Phase 07)
- `css/tokens.css` — Design DNA v0 as custom properties
- `css/base.css`, `css/layout.css` — reset, element defaults, shell layout
- `js/main.js` — boot: verify DOM/CSS/modules/environment, render status
- `js/core/env.js`, `js/core/dom.js`
- `js/firebase/config.js` (clearly marked placeholder), `js/firebase/init.js` (SDK loader, demo-mode fallback, no console errors offline)
- `assets/favicon.svg` — awning-stripe mark

**Out of scope for Phase 01:** all features, real design polish (Phase 02), rules (03), seed data (04), all pages beyond the baseline.

---

## 14. PHASE 01 RISKS

| Risk | Handling |
|---|---|
| Firebase CDN import fails in offline preview → console error | `init.js` short-circuits on placeholder config (never imports) and wraps `import()` in try/catch with timeout → demo mode, zero console errors |
| ES modules broken if opened via `file://` | README + page `<noscript>`-style guidance; dev server is the documented run path |
| Placeholder config accidentally "works" and misleads | Hard-coded sentinel values, boot page displays **DEMO MODE** loudly until real config present |
| Tokens drift before Phase 02 lock | tokens.css marked v0-draft; single source of truth established now |

---

## 15. PHASE 01 TEST PLAN

1. `node --check` every JS file (syntax)
2. Static server up on 0.0.0.0; HTTP 200 for `/` and every referenced asset (curl)
3. HTML sanity: single `<h1>`, valid nesting, lang, viewport, landmarks present
4. No unnecessary dependencies: grep for external script/link beyond documented Google Fonts + (deferred) Firebase CDN
5. Environment logic: placeholder config → DEMO MODE (unit-verifiable via node by importing config/env pure logic)
6. **Honest limitation:** no browser automation in this environment — real-render console check deferred to first human preview; code is written defensive (no top-level throw paths) to make errors impossible-by-construction in the happy path


