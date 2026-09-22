
/**
 * KADAI — Firebase web configuration
 * -----------------------------------
 * ✅ CONNECTED — project "kadai-36aa6" (Spark plan).
 *
 * These values are the PUBLIC web config (safe to expose by design);
 * authorization is enforced by firestore.rules / storage.rules, never
 * by this file. NEVER place service-account keys or admin SDK
 * credentials here.
 */

export const firebaseConfig = {
  apiKey:            "AIzaSyBhiUu8zCCccA9jg8vHqeT8IwCOFhr3GZ4",
  authDomain:        "kadai-36aa6.firebaseapp.com",
  projectId:         "kadai-36aa6",
  storageBucket:     "kadai-36aa6.firebasestorage.app",
  messagingSenderId: "126163395612",
  appId:             "1:126163395612:web:1d10ede74b5a3bd336ebd9",
  // measurementId present in the console config; Analytics is not used by this app
  measurementId:     "G-3ZXQQF9WDW",
};

/** Sentinel prefix used to detect that this file is still untouched. */
const PLACEHOLDER_PREFIX = "YOUR-";

/**
 * True while any config value is still a placeholder.
 * env.js uses this to short-circuit SDK loading (no network calls,
 * no console errors) and report DEMO MODE.
 * @returns {boolean}
 */
export function isConfigPlaceholder() {
  return (
    !firebaseConfig ||
    typeof firebaseConfig.apiKey !== "string" ||
    firebaseConfig.apiKey.startsWith(PLACEHOLDER_PREFIX) ||
    firebaseConfig.projectId.startsWith(PLACEHOLDER_PREFIX)
  );
}


