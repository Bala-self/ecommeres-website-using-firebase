
# KADAI — GO-LIVE RUNBOOK (project kadai-36aa6)
Your exact remaining steps, in order. Check each ✅ before moving on.

**Already done:**
- [x] Project `kadai-36aa6` created (Spark, asia-south1)
- [x] Web app registered, config connected → `js/firebase/config.js`
- [x] Firestore database created
- [x] Email/Password sign-in enabled

---

## STEP 1 — Publish the security rules  *(if not done yet)*
Firestore → **Rules** tab → delete everything → paste the full contents of
`firestore.rules` (or the copy block at the bottom of `docs/firebase-setup.md`)
→ **Publish**.

**Verify:** green "Rules published" toast; the editor shows the `rules_version = '2'` block.
*Skip-ahead check: if you already did this, move on.*

## STEP 2 — Register YOUR account on the store
```bash
cd kadai
python3 -m http.server 8000     # open http://localhost:8000
```
- Homepage: the yellow demo banner must be **gone**.
- Click **account icon → Create account** → register with your name + email.

**Verify:** Firebase console → **Authentication → Users** shows your account.
Firestore → **Data** → a `users` collection now exists with a document whose
ID **equals your User UID** (visible in Authentication → Users).

> If you manually created a `users` document earlier: open Firestore → users
> → confirm one document ID **exactly matches** your Auth UID and contains
> `role: admin`. If the ID doesn't match your real UID, delete that document
> (the site re-creates the correct one at registration), then re-add `role`.

## STEP 3 — Make yourself admin
Firestore → **Data** → `users` → click your UID document → **+ Add field**:
`role` · string · `admin` → **Update**.

**Verify:** on the store, **sign out → sign in** → account menu shows
**Admin console**.

## STEP 4 — Seed the catalog
Admin console → **Seed starter catalog** button → click once.

**Verify:** Products page shows 10 products; homepage aisles show counts.
(All items are tagged `seed` in the admin Products table — replace with real
products whenever ready.)

## STEP 5 — Full smoke test (10 min)
Do this once on localhost before deploying:
1. Browse → open a product → add to basket → basket shows correct total
2. Apply coupon `WELCOME10` → discount appears
3. Add a second item → remove it → totals recalculate
4. Checkout → enter address (any valid 6-digit PIN) → **Place order request**
5. Confirmation shows "Order request received — cash on delivery" (never "payment successful")
6. Admin console → **Orders** → your order is listed → advance it
   placed → processing → shipped → delivered
7. Product page → write a review → Admin → **Reviews** → Approve → it appears
8. Sign out → sign in → basket/wishlist/orders still there (Firebase-backed)

**Verify:** all 8 pass. Any failure → note the step + F12 console message.

## STEP 6 — Put it online
1. Install Node.js LTS: https://nodejs.org
2. In the `kadai` folder terminal:
```bash
npx firebase-tools login          # browser opens → sign in
npx firebase-tools use --add      # choose kadai-36aa6
npx firebase-tools deploy --only firestore:rules,firestore:indexes,hosting
```
3. Output prints your live URL: **https://kadai-36aa6.web.app**

**Verify:** open the URL (also on your phone) → no demo banner → sign-in works
→ products load. (If sign-in complains at first, wait 2 min — new domains
register as authorized automatically.)

## STEP 7 — Replace placeholder business content
- [ ] Footer contact: `hello@kadai.example [CONTENT REQUIRED]` → real email/phone
      (edit `js/components/header.js` → `renderFooter`)
- [ ] Shipping rules: `js/data/dev-catalog.js` → `shippingConfig`
      (₹49 flat / free ≥ ₹999 are placeholders)
- [ ] Delivery promise: checkout review page "2–4 days within Chennai [PLACEHOLDER]"
      (edit `js/pages/checkout.js`)
- [ ] Real product names/prices/photos replace seeded items (admin Products tab)
- [ ] Optional: rename "Kadai" → your brand (`js/components/header.js`,
      page `<title>`s, `css/tokens.css` if colors change)

## STEP 8 — Handover knowledge (no action, just know)
- Orders arrive → **Admin → Orders** (status flow is enforced: no skipping)
- Reviews await approval in **Admin → Reviews**
- Coupons in **Admin → Coupons**; stock edits save instantly
- Payment integration is deliberately NOT in this release — orders are
  cash-on-delivery requests. `orders.paymentStatus` is the documented seam
  (`NOT_IMPLEMENTED`) for a future gateway.
- Image *uploads* need the Blaze plan (guide Part G) — everything else runs free

## TROUBLESHOOTING (quick)
| Problem | Fix |
|---|---|
| Demo banner still shows | Hard refresh (Ctrl+Shift+R); check config.js saved |
| "Missing or insufficient permissions" | Rules not published → redo STEP 1 |
| Console error mentions "index" | Click the blue link in the F12 console → Create index (one per error), or they deploy with STEP 6 |
| Admin console says no access | `role` value must be exactly `admin`; sign out/in after adding |
| Seed button missing | Catalog already has products — use the Products tab instead |


