
/**
 * KADAI — category service
 */

import { getFS } from "../firebase/sdk.js";
import { localdb } from "./localdb.js";

let cache = null; // small, rarely changes; one read per session (§58)

export async function listActive() {
  if (cache) return cache;
  const fs = await getFS();
  if (!fs) {
    cache = localdb.list("categories", (c) => c.active).sort((a, b) => a.name.localeCompare(b.name));
    return cache;
  }
  const snap = await fs.mod.getDocs(
    fs.mod.query(fs.mod.collection(fs.db, "categories"), fs.mod.where("active", "==", true), fs.mod.orderBy("name", "asc"))
  );
  cache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return cache;
}

export function clearCache() { cache = null; }

export async function bySlug(slug) {
  const all = await listActive();
  return all.find((c) => c.slug === slug) || null;
}

/** Admin: everything incl. inactive. */
export async function listAllForAdmin() {
  const fs = await getFS();
  if (!fs) return localdb.list("categories");
  const snap = await fs.mod.getDocs(fs.mod.collection(fs.db, "categories"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name));
}

/** Admin write path. */
export async function adminSave(categoryId, data) {
  const fs = await getFS();
  if (!fs) {
    localdb.put("categories", categoryId, { ...data, createdAtMs: Date.now() });
    clearCache();
    return localdb.get("categories", categoryId);
  }
  await fs.mod.setDoc(
    fs.mod.doc(fs.db, "categories", categoryId),
    { ...data, updatedAt: fs.mod.serverTimestamp() },
    { merge: true }
  );
  clearCache();
  return { id: categoryId, ...data };
}


