
/**
 * KADAI — lazy Firebase SDK accessor
 * ------------------------------------
 * The ONLY module allowed to import Firebase SDK chunks, and it does so
 * DYNAMICALLY: if the CDN is unreachable, callers get `null` and take
 * the local demo path instead of the whole app failing to load.
 * Never add static `import ... from "https://..."` anywhere else.
 */

import { getSdk } from "./init.js";

const VERSION = "10.12.2";
const chunks = { fs: undefined, auth: undefined, storage: undefined };

async function loadChunk(kind, url) {
  if (chunks[kind] !== undefined) return chunks[kind];
  try {
    chunks[kind] = await import(url);
  } catch (e) {
    console.warn(`[kadai] Firebase ${kind} module unavailable (${e?.message || "network"}) — using demo path.`);
    chunks[kind] = null;
  }
  return chunks[kind];
}

/** Firestore namespace + db handle, or null in demo mode / offline. */
export async function getFS() {
  const sdk = getSdk();
  if (!sdk) return null;
  const mod = await loadChunk("fs", `https://www.gstatic.com/firebasejs/${VERSION}/firebase-firestore.js`);
  return mod ? { mod, db: sdk.db } : null;
}

/** Auth namespace + auth handle, or null in demo mode / offline. */
export async function getAuthMod() {
  const sdk = getSdk();
  if (!sdk) return null;
  const mod = await loadChunk("auth", `https://www.gstatic.com/firebasejs/${VERSION}/firebase-auth.js`);
  return mod ? { mod, auth: sdk.auth } : null;
}

/** Storage namespace + storage handle, or null in demo mode / offline.
 *  The handle is derived from the app (init.js only ever holds app/auth/db). */
export async function getStorageMod() {
  const sdk = getSdk();
  if (!sdk) return null;
  const mod = await loadChunk("storage", `https://www.gstatic.com/firebasejs/${VERSION}/firebase-storage.js`);
  return mod ? { mod, storage: mod.getStorage(sdk.app) } : null;
}


