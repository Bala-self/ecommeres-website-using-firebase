
# Kadai — e-commerce foundation

A deliberately engineered, human-designed e-commerce web application.
HTML5 + Tailwind CSS + vanilla JavaScript (ES modules) + Firebase.
There is no JavaScript bundler or payment integration in this release.

> **Working identity:** "Kadai" (கடை — Tamil for *shop*) is the demo brand.
> The architecture is product-agnostic: rename or re-catalog by editing
> `css/tokens.css` + data, not code.

## Run it

ES modules require HTTP — don't open `index.html` via `file://`.

```bash
cd kadai
python3 -m http.server 8000
# → http://localhost:8000
```

Any static file server works. Firebase Hosting config arrives in Phase 27.

### CSS build

Tailwind utilities are compiled into the checked-in `css/tailwind.css` file
for static hosting. Rebuild after changing responsive utility classes:

```bash
npm install
npm run build:css
```

## Firebase

No project yet? The app boots in clearly-labeled **DEMO MODE**.
Follow **`docs/firebase-setup.md`**, then paste your web config into
`js/firebase/config.js`. Authorization comes from Security Rules
(`firestore.rules`, `storage.rules` — Phase 03), never from this config.

## Structure

```
css/      tokens.css · base.css · layout.css · components.css · pages.css · tailwind.css
js/
  main.js           app entry / boot
  core/             env, dom helpers (pure logic)
  firebase/         config + SDK loader (only runtime dependency: Firebase CDN)
  services/         data services (Phase 04+) — no DOM allowed here
  data/             development-only seed data (demo mode)
  components/       shared UI (Phase 06+)
  pages/            one module per page (Phase 04+)
docs/                project analysis · firebase setup
```

## Documents

- `docs/01-project-analysis.md` — audit, requirements, identity, design DNA,
  data model, security model, roadmap (Master Prompt §103 output)
- `docs/firebase-setup.md` — console walkthrough

## Current status

**All phases implemented (Phases 01–27 scope):** design system, demo-mode
data layer, storefront (home / listing / search / product), auth + cart
merge + wishlist, checkout-without-payment (cash on delivery order
requests), order history, reviews + moderation, coupons, full admin
console, Firestore/Storage security rules, Hosting config.

Verification evidence lives in **`docs/test-report.md`** — including what
is *not* yet verified (live Firebase run, browser a11y walkthrough).
Features are marked LOCKED only after verification (§86).

### Go-live checklist
1. `docs/firebase-setup.md` Steps 1–5 (project, Firestore, Storage, Auth)
2. Paste web config → `js/firebase/config.js`
3. Rules: paste `firestore.rules` + `storage.rules` into the console (or `firebase deploy`)
4. Register your account → console → `users/{uid}` → `role: "admin"`
5. Admin console → **Seed starter catalog** → replace demo products with real ones


