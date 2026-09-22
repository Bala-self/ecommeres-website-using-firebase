
/**
 * KADAI — product image upload (admin)
 * Firebase mode: Storage under products/ (rules: admin-only write).
 * Demo mode: inline data URL, device-local only. Max 2 MB, jpg/png/webp.
 */

import { getStorageMod } from "../firebase/sdk.js";
import { isDemoEnv } from "../core/env-state.js";

const MAX_BYTES = 2 * 1024 * 1024;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadProductImage(file) {
  if (!file) throw { message: "Choose an image file." };
  if (!OK_TYPES.includes(file.type)) throw { message: "Use a JPG, PNG or WebP image." };
  // >= so the client matches the rules' strict `< 2MB` (no boundary mismatch)
  if (file.size >= MAX_BYTES) throw { message: "Keep images under 2 MB." };

  const sm = await getStorageMod();
  if (!sm) {
    if (isDemoEnv()) return await fileToDataUrl(file);
    throw {
      code: "kadai/storage-unavailable",
      message: "Firebase Storage is unavailable. Create the Storage bucket and publish storage.rules, then try again.",
    };
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const snap = await sm.mod.uploadBytes(sm.mod.ref(sm.storage, path), file, {
    contentType: file.type,
    cacheControl: "public,max-age=31536000",
  });
  return sm.mod.getDownloadURL(snap.ref);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(/** @type {string} */ (reader.result));
    reader.onerror = () => reject({ message: "Could not read that file." });
    reader.readAsDataURL(file);
  });
}


