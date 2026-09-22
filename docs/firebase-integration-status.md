
# KADAI — FIREBASE INTEGRATION STATUS
Scope note (owner instruction): **no new features — Firebase connection only.**
The two integration prompt-templates were treated as requirements *sources*;
only what serves "Firebase as the single source of truth for the EXISTING
features" was implemented. Feature requests from the templates (dashboard
KPIs, banners, customer management, inventory section, variants/SKU/sizes/
colors, extra order statuses) are recorded below as NOT BUILT by explicit
instruction.

## AUDIT RESULT — every data path, verified

| Data | Source in Firebase mode | Local anything? |
|---|---|---|
| Products (list/detail/search/filter/sort/related/home) | Firestore `products` | none |
| Categories (nav/chips/filters/admin) | Firestore `categories` | none |
| Orders (create/history/detail/status) | Firestore `orders` | none |
| Reviews (submit/moderate/publish) | Firestore `reviews` | none |
| Coupons (validate/admin) | Firestore `coupons` | none |
| User profiles + addresses | Firestore `users`, `users/{uid}/addresses` | none |
| Carts & wishlists (signed-in) | Firestore `carts`, `wishlists` | guest carts = LocalStorage convenience only (standard pattern; checkout requires sign-in so every order is Firestore-bound) |
| Product images (admin upload) | Storage `products/` | demo/offline transport only |

**Verified by grep + code-read:** all 8 services attempt Firebase first
(`getFS()`/`getAuthMod()`); no page or component embeds product data; no
local product seeding exists; no Admin-SDK/service-account material anywhere
in the client (only the public-by-design web config); `.gitignore` guards
`.env`.

## RENAMED (honest naming, zero behavior change)
`js/data/dev-catalog.js` → **`js/data/business-config.js`** — it holds the
shipping-fee business rules (pricing.js) + the admin-only one-click starter
seed for an EMPTY Firebase project. It is a config/tool file, not a data
source.

## REAL BUG FIXED (caught by the required full-loop regression)
**Order status history could be overwritten by a stale admin table** —
`adminSetStatus` trusted caller-supplied history. It now ALWAYS derives
history from the server-side document; the admin UI no longer sends history
from the DOM. Loop test: placed→processing→shipped keeps all entries.

## FULL-LOOP REGRESSION (the exact required cycle) — PASS
admin creates product → stored → customer fetches catalog & sees it →
views detail → adds to cart → order created (`paymentStatus:
'NOT_IMPLEMENTED'`) → admin sees the order → advances placed→processing→
shipped → customer sees the updated status + timeline. Executed against the
real service layer (`loop.mjs`); Firebase mode runs the identical code with
the Firestore transport.

## SECURITY MODEL (already enforced, re-verified)
- Admin = `users/{uid}.role == 'admin'` — Firestore/Storage **rules** are the
  enforcement; the admin page check is UX only; hiding buttons is never security.
- Public: read active products/categories only. Users: own cart/wishlist/
  addresses/orders only. Order creation constrained (own uid, `placed`,
  `NOT_IMPLEMENTED`, shape-checked). Reviews: public reads = published only
  (constraint lives in the query). Storage: admin-only writes, type+size capped.
- Known documented gap (unchanged scope): order totals computed client-side —
  acceptable for the COD order-request flow; server-side validation is the
  pre-condition for any future online payment ([SECURITY GAP] in test-report §5).

## TEMPLATE ITEMS NOT BUILT (per "don't create anything new feature")
Dashboard KPI page · customer-management section · inventory section ·
banners/homepage-content system · product variants/sizes/colors/SKU/brand ·
extra order statuses (pending/confirmed/returned) · settings page ·
environment-variable config (a no-build static site has no env vars; the
public web-config file is the correct pattern — secrets never belong client-side
regardless). Any of these can be added later on the existing service layer.

## VERIFICATION BATTERY (all actually run this session)
142/142 scenario sweep · unit suite · 9-scenario e2e · **full-loop regression
PASS** · 13/13 contrast · 42/42 modules syntax · 16/16 routes 200.


