
/**
 * KADAI — Firebase catalog seeder (admin-triggered only)
 * Populates an EMPTY Firestore project with the STARTER catalog from
 * ../data/business-config.js. There is deliberately NO local/demo seeding:
 * the storefront catalog lives only in Firebase (audit round 2).
 * Seeded docs carry seeded:true so their origin stays visible (§19).
 */

import { getFS } from "../firebase/sdk.js";
import { products as seedProducts, categories as seedCategories, demoCoupon } from "../data/business-config.js";

/** Seed a fresh Firebase project (admin-only; refuses when data exists). */
export async function seedFirebaseCatalog() {
  const fs = await getFS();
  if (!fs) return { ok: false, reason: "Firebase is not connected." };

  const existing = await fs.mod.getDocs(fs.mod.query(fs.mod.collection(fs.db, "products"), fs.mod.limit(1)));
  const existingCats = await fs.mod.getDocs(fs.mod.query(fs.mod.collection(fs.db, "categories"), fs.mod.limit(1)));
  if (!existing.empty || !existingCats.empty) {
    return { ok: false, reason: "Catalog is not empty — seeding skipped to protect existing data." };
  }

  for (const c of seedCategories) {
    await fs.mod.setDoc(fs.mod.doc(fs.db, "categories", c.id), {
      name: c.name, slug: c.slug, description: c.description,
      image: null, active: true, seeded: true,
      createdAt: fs.mod.serverTimestamp(), updatedAt: fs.mod.serverTimestamp(),
    });
  }
  let count = 0;
  for (const p of seedProducts) {
    const { id, ...rest } = p;
    await fs.mod.setDoc(fs.mod.doc(fs.db, "products", id), {
      ...rest,
      active: true, seeded: true, ratingAvg: null, ratingCount: 0,
      createdAt: fs.mod.serverTimestamp(), updatedAt: fs.mod.serverTimestamp(),
    });
    count += 1;
  }
  await fs.mod.setDoc(fs.mod.doc(fs.db, "coupons", demoCoupon.code), {
    ...demoCoupon, seeded: true, updatedAt: fs.mod.serverTimestamp(),
  });
  return { ok: true, count };
}


