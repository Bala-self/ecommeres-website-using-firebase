
# How to Add Product Data in Firebase (Kadai)

Two ways: the **Admin console** (recommended — the app does everything
correctly for you) or the **Firebase console** (manual — powerful but you
must type fields exactly, see the traps below).

---

## Way 1 — Through your store's Admin console (RECOMMENDED)

1. Start the store: `python3 -m http.server 8000` in the `kadai` folder → open `http://localhost:8000`
2. Click the **account icon** (top right) → **Admin console**
   (no link? your account needs `role: admin` — see go-live-runbook Step 3)
3. **First time only — create the aisles (categories):**
   → **Categories tab** → form: Name (`Kitchen & Dining`), Category ID (`kitchen`) → **Save category**
   (repeat for as many aisles as you want)
4. **Products tab** → fill the form:
   | Field | Example | Note |
   |---|---|---|
   | Name | `Stainless Steel Idli Steamer · 4 Tier` | |
   | Product ID | `idli-steamer` | lowercase-with-dashes, permanent |
   | Price (₹) | `1299` | **type rupees — the form converts to paise for you** |
   | Stock | `14` | 0 = shows "Out of stock" |
   | Aisle | pick from dropdown | comes from your Categories |
   | Image | choose file | needs the Blaze plan (Storage). Skip it — product still saves |
   | Short description | `Four tiers, twenty idlis at a go.` | |
5. **Save product** → done. The product is LIVE in Firestore and appears on
   the customer site immediately (Products page, aisle chips, search).

**One-click alternative:** while the catalog is still empty, the admin
console shows **"Seed starter catalog"** — one click creates 5 categories +
10 sample products + the WELCOME10 coupon in Firebase. You can then edit or
hide them and add your real ones.

---

## Way 2 — Manually in the Firebase console

Firestore Database → **Data** → **+ Start collection** → Collection ID:
`products` → Document ID: type a slug like `idli-steamer` → add these fields:

| Field | Type | Value / Example |
|---|---|---|
| `name` | string | `Stainless Steel Idli Steamer · 4 Tier` |
| `slug` | string | `idli-steamer` (same as Document ID) |
| `categoryId` | string | `kitchen` (must match a categories doc ID) |
| `descriptionShort` | string | one line for cards |
| `descriptionLong` | string | full paragraph |
| `pricePaise` | **number** | `129900` ← ⚠️ ₹1299 = **129900** (paise = rupees × 100) |
| `compareAtPricePaise` | number or null | strike-through price, or leave out |
| `stock` | number | `14` |
| `images` | **array** of **maps** | array with one map: `url` = string, `alt` = string |
| `keywords` | array (strings) | `["idli","steamer","steel"]` — powers search |
| `specs` | map | e.g. `Material` = `Stainless steel` |
| `featured` | boolean | `true` = shows in home "Steel & brass picks" |
| `newArrival` | boolean | `true` = shows in "New this week" |
| `active` | boolean | **`true` ← invisible without this!** |
| `createdAt` | **timestamp** | ⚠️ click the type dropdown → **timestamp** → use today's date/time |
| `updatedAt` | timestamp | same |

⚠️ **THE 3 TRAPS (manual entry):**
1. **Price is in PAISE** — ₹1,299 must be stored as `129900` (a number, no commas/quotes).
2. **`active` must be `true`** — anything else and customers can't see it.
3. **`createdAt` must exist as a timestamp** — the listing queries sort by
   it, and Firestore silently EXCLUDES documents that lack the sort field.
   (The Admin console adds this automatically — one more reason to prefer it.)

Images without the Blaze plan: set `images[0].url` to any public image URL
on the web — or to a bundled file path like `assets/products/idli-steamer.jpg`.

---

## Verify after adding
Open the store → **Products page** → your item shows under its aisle chip,
in search (try a keyword), and on its own page
(`product.html?id=your-slug`). Empty site? Check trap 2 and 3 first, and
that Firestore Rules were published (runbook Step 1).


