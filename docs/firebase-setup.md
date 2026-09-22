
# Firebase Setup — COMPLETE Step-by-Step Guide
Everything needed to take the Kadai store from demo mode to a live,
secured, deployed online store. No prior Firebase experience assumed.

> **📍 LIVE PROGRESS for project `kadai-36aa6`:** Parts A–D and F are DONE
> (project, config, Firestore in asia-south1, Email/Password enabled).
> Follow **`docs/go-live-runbook.md`** for the exact remaining steps.

---

## 0. BEFORE YOU START — what you need and what it costs

| You need | Why |
|---|---|
| A Google (Gmail) account | Firebase signs in with Google |
| A computer with internet | The console is browser-based |
| ~20 minutes for Parts A–F | Store runs connected right after |
| Node.js installed (Part K only) | Only needed to put the store online |

**The honest cost picture (verified Sep 2026):**

| Feature | Plan needed | Cost |
|---|---|---|
| Catalog, accounts, orders, wishlist, cart sync | Spark | **Free — no credit card** |
| Putting the store online (Hosting) | Spark | **Free** (10 GB space, ~360 MB/day traffic) |
| Free daily limits | Spark | 50,000 product reads/day, 20,000 writes/day — a small shop never hits this |
| Uploading product images in the admin console | **Blaze** | Needs a billing account (card). Tiny shops stay inside the free allowance, so the bill stays ₹0 |

> **No card? Skip Part G.** The store still works fully — the catalog ships
> with images bundled in the website itself. Blaze is only needed when *you*
> want to upload new images through the admin console later.

---

## PART A — Create the Firebase project (≈4 min)

1. Open <https://console.firebase.google.com/> in your browser.
2. Sign in with your Google account.
3. Click **“Create a Firebase project”** (or “Add project”).
4. **Project name:** type `kadai-store` (any lowercase name is fine) → **Continue**.
5. **Google Analytics** prompt: switch it **OFF** (not needed) → **Create project**.
6. Wait for the “Your new project is ready” screen → **Continue**.
   You are now on the project overview page.

---

## PART B — Register the web app & copy the config (≈2 min)

1. On the project overview page, open **Settings (⚙️ gear in the left sidebar) → Project Settings**
   → scroll down to the **“Your apps”** card → click the **`</>`** (Web) icon.
   *(Older console: a `</>` icon sits directly on the overview page — same thing.)*
2. **App nickname:** `kadai-web` → click **Register app**
   (do NOT tick “Also set up Firebase Hosting” — our repo already has the config).
3. Firebase now shows a code block titled **`firebaseConfig`** that looks like:

```js
const firebaseConfig = {
  apiKey: "AIzaSy…",
  authDomain: "kadai-store.firebaseapp.com",
  projectId: "kadai-store",
  storageBucket: "kadai-store.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

4. **Keep this screen open** — you need these six values in Part C.
5. Click **Continue to console** when done.

> 🔒 **Safety note:** these six values are the *public web config* — it is
> designed to be visible in browser code and is NOT a secret. What protects
> your data is the **security rules** in Part E. The only thing you must
> NEVER paste into the website or share is anything called a *service
> account key* / `PRIVATE KEY` — you will never be asked for one.

---

## PART C — Connect the config to the store (≈2 min)

**Option 1 — do it yourself:**
1. Open the project folder `kadai/` in any text editor (Notepad works).
2. Open the file `js/firebase/config.js`.
3. Replace the six `YOUR-…` placeholder values with your real values, so it
   looks exactly like the block Firebase showed you:

```js
export const firebaseConfig = {
  apiKey:            "AIzaSy…(your real value)",
  authDomain:        "kadai-store.firebaseapp.com",
  projectId:         "kadai-store",
  storageBucket:     "kadai-store.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId:             "1:123456789012:web:abc123def456",
};
```

4. Save the file. **Keep the quotes around every value.**

**Option 2 — let me do it:** paste the `firebaseConfig` block into the chat
and I’ll wire it into the file for you.

**✅ Verify:** start the site (`python3 -m http.server 8000` inside `kadai/`,
then open `http://localhost:8000`). The yellow “Demo mode” banner under the
header is **gone**. That’s the connection proof.

---

## PART D — Create the Firestore database (≈3 min)

1. Firebase console → left sidebar → **Databases & Storage → Firestore Database** (or search “Firestore”).
2. Click **Create database**.
3. **Location:** choose **`asia-south1` (Mumbai)** — closest to Chennai.
   ⚠️ This cannot be changed later.
4. Security rules prompt: choose **Start in production mode** (locked — we
   add our own rules in Part E).
5. Click **Create**. You’ll land on an empty Firestore page — that’s correct.

---

## PART E — Add the security rules (≈4 min) — MOST IMPORTANT PART

These rules are the real security of the store. **Never skip this part.**

1. Still inside **Firestore Database**, open the **Rules** tab (top of the page).
2. **Delete everything** in the editor box.
3. Open the file `firestore.rules` from the project folder, **copy ALL of it**,
   and **paste** it into the console editor.
   (The full content is also kept at the bottom of this guide for easy copying.)
4. Click **Publish**.

5. If you enabled Storage (Part G): go to **Build → Storage → Rules** tab,
   delete everything, paste the full content of `storage.rules`, **Publish**.

**✅ Verify:** the Rules tab shows your pasted rules with a “Published” toast.
With these rules: strangers can only *see* active products; customers can
only touch their **own** cart/wishlist/orders; only **admin** accounts can
change products or advance orders.

---

## PART F — Turn on sign-in (≈2 min)

1. Firebase console → **Security → Authentication** → **Get started** (or search “Authentication”).
2. Tab **Sign-in method** → click **Email/Password**.
3. Toggle **Enable** (leave “Email link” off) → **Save**.
4. Done — `localhost` and your future `*.web.app` domain are already allowed
   to sign users in.

**✅ Verify:** Sign-in method list shows **Email/Password — Enabled**.

---

## PART G — Storage for image uploads (OPTIONAL — needs Blaze)

> Skip this whole part if you don’t want to add a card. Everything else works.

1. Firebase console → **Databases & Storage → Cloud Storage** → **Get started** (or search “Storage”).
2. Firebase will say the project must be on the **Blaze (pay-as-you-go) plan**
   — this is Firebase policy for all Storage since Feb 2026. Click **Upgrade**
   and follow the billing prompts (you set a budget alert; small shops stay in
   the free allowance).
3. Choose location **asia-south1** → create the default bucket.
4. Open the **Rules** tab → replace everything with the contents of the
   project’s `storage.rules` file → **Publish**.

**✅ Verify:** Storage → Files shows an empty bucket; Rules show your pasted rules.

---

## PART H — First connected run (≈3 min)

1. In a terminal on your computer:
   ```bash
   cd kadai
   python3 -m http.server 8000
   ```
2. Open `http://localhost:8000`.
3. Run through this smoke test:
   - Homepage loads with **no** demo banner.
   - Products page: empty shelf states show cleanly (catalog not seeded yet).
   - **Create account** → register with your name + email.
     (Check **Authentication → Users** in the console — you’re listed.)
4. Leave the site open and the account signed in for Part I.

---

## PART I — Make yourself the admin (≈3 min)

1. Firebase console → **Firestore Database**.
2. Click the **`users`** collection → click the document whose ID is your
   (it’s the long UID; only one exists if you just registered).
3. Click **+ Add field**:
   - Field name: `role`
   - Type: `string`
   - Value: `admin`
4. Press **Update** (top right).

**✅ Verify:** back on the site — click the account icon (top right) → the
menu now shows **“Admin console”**. (If not, sign out, sign in again — the
role is refreshed at sign-in.)

---

## PART J — Fill the shelves (≈2 min)

Two choices:

- **Seed the starter catalog (recommended first):** open the **Admin console**
  → a **“Seed starter catalog”** button appears while the catalog is empty →
  click it. 5 categories + 10 sample products + the WELCOME10 coupon are
  created. Replace/retire them with real products whenever ready (the
  Products tab lists each item’s origin: `seed` or `admin`).
- **Add your own products:** Admin console → **Products** → fill the form
  (name, ID-slug, price in ₹, stock, aisle, optional image) → **Save product**.

**✅ Verify:** the storefront Products page shows your items; the aisle
counts on the homepage match.

---

## PART K — Put the store online (≈10 min, one time)

1. Install Node.js on your computer: <https://nodejs.org> → download the
   **LTS** version → install with defaults.
2. Open a terminal **inside the `kadai` folder**, then run these one at a time:

   ```bash
   npx firebase-tools login
   ```
   (a browser opens → sign in with the same Google account → allow)

   ```bash
   npx firebase-tools use --add
   ```
   (choose `kadai-store`)

   ```bash
   npx firebase-tools deploy --only firestore:rules,firestore:indexes,hosting
   ```
   (add `,storage:rules` too if you did Part G:
   `--only firestore:rules,firestore:indexes,storage:rules,hosting`)

3. When it finishes it prints your live address, e.g.
   **`https://kadai-store.web.app`** — your store is online.

**What this deploy does:** uploads the website (Hosting), publishes the
security rules, and creates the search/sort indexes the catalog needs.

**✅ Verify:** open the `web.app` address in your phone’s browser — the store
loads, sign-in works, and the demo banner is absent.

---

## PART L — Everyday use from here

| Task | Where |
|---|---|
| New order arrives | Admin console → **Orders** (top of page, always first) → set status: placed → processing → shipped → delivered |
| Add/retire a product | Admin console → **Products** → save form / untick “live” |
| Moderate a review | Admin console → **Reviews** → approve/reject |
| Create a coupon | Admin console → **Coupons** |
| See error logs | Browser F12 console, or Firebase console pages for each service |
| Change delivery fee / free-delivery threshold | `js/data/dev-catalog.js` → `shippingConfig` (currently ₹49 flat, free ≥ ₹999 — placeholder values marked in the file) |

---

## TROUBLESHOOTING

| Symptom | Cause → Fix |
|---|---|
| Yellow “Demo mode” banner still shows | `js/firebase/config.js` still has `YOUR-…` values, or the file wasn’t saved. Recheck Part C. |
| Site works but data disappears on refresh | You’re still in demo mode (data is device-local). Complete Parts A–D. |
| “Missing or insufficient permissions” when browsing | Rules not published, or published partially. Redo Part E — copy the WHOLE file. |
| Products page: “We couldn’t load these products” + console says *index* | Indexes missing. Easiest fix: the browser console error contains a blue link — click it, then click **Create index** in Firebase. (Or deploy `firestore.indexes.json` per Part K.) |
| Sign-in says “operation not allowed” | Email/Password not enabled → Part F. |
| Admin console says “Admin access only” | Part I not done for the signed-in account, or role value isn’t exactly `admin` (lowercase), or you haven’t re-signed-in since. |
| “Seed starter catalog” button missing | Catalog already has products — that button only shows on an empty catalog (protects real data). Manage items in the Products tab instead. |
| Image upload in admin fails without Blaze | Expected: Storage needs the Blaze plan (Part G). Products without new images still save fine. |
| Deploy says “Not authorized” | Run `npx firebase-tools login` again, then `use --add`. |
| Sign-in works locally but not on the live site | Wait 2 minutes and retry — new `web.app` domains need a moment to register as authorized. |

---

## APPENDIX — the full Firestore rules (copy from here if easier)

Always prefer the repo file `firestore.rules` (it is the source of truth),
but this block is identical — copy everything between the lines:

```text
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null;
    }
    function isOwner(uid) {
      return signedIn() && request.auth.uid == uid;
    }
    function isAdmin() {
      return signedIn() &&
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /products/{productId} {
      allow read: if resource.data.active == true || isAdmin();
      allow create, update, delete: if isAdmin();
    }

    match /categories/{categoryId} {
      allow read: if resource.data.active == true || isAdmin();
      allow create, update, delete: if isAdmin();
    }

    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isOwner(userId)
                    && request.resource.data.role == 'customer'
                    && request.resource.data.keys().hasOnly(['name','email','phone','role','createdAt']);
      allow update: if (isOwner(userId)
                    && request.resource.data.role == resource.data.role)
                    || isAdmin();
      allow delete: if isAdmin();

      match /addresses/{addressId} {
        allow read, write: if isOwner(userId);
      }
    }

    match /carts/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /wishlists/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /orders/{orderId} {
      allow read: if isOwner(resource.data.userId) || isAdmin();
      allow create: if signedIn()
                    && request.resource.data.userId == request.auth.uid
                    && request.resource.data.status == 'placed'
                    && request.resource.data.paymentStatus == 'NOT_IMPLEMENTED'
                    && request.resource.data.items.size() > 0
                    && request.resource.data.totalPaise is number
                    && request.resource.data.totalPaise >= 0
                    && request.resource.data.shippingAddress.keys().hasAll(['receiver','phone','line1','city','state','pincode']);
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    match /reviews/{reviewId} {
      allow read: if resource.data.status == 'published' || isAdmin() || (signedIn() && resource.data.userId == request.auth.uid);
      allow create: if signedIn()
                    && request.resource.data.userId == request.auth.uid
                    && request.resource.data.status == 'pending'
                    && request.resource.data.rating is number
                    && request.resource.data.rating >= 1
                    && request.resource.data.rating <= 5
                    && request.resource.data.text is string
                    && request.resource.data.text.size() <= 1000;
      allow update, delete: if isAdmin();
    }

    match /coupons/{code} {
      allow read: if resource.data.active == true || isAdmin();
      allow write: if isAdmin();
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## FINAL CHECKLIST — store is LIVE when all boxes tick

- [ ] Project created (A) · web app registered (B)
- [ ] `js/firebase/config.js` holds real values (C) — demo banner gone
- [ ] Firestore created in `asia-south1`, production mode (D)
- [ ] Firestore rules published (E)
- [ ] Email/Password sign-in enabled (F)
- [ ] (Optional) Storage + its rules on Blaze (G)
- [ ] Registered your own account (H)
- [ ] `role = admin` set on your user (I)
- [ ] Catalog seeded / real products added (J)
- [ ] Deployed — store opens at `https://…web.app` (K)
- [ ] Placed a test order on the live site and processed it in the admin console


