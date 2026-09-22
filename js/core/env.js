
/**
 * KADAI — Environment resolution
 * -------------------------------
 * Answers one boot question: which data world are we in?
 *   "demo"     — no Firebase configured/available; clearly-labeled local data only
 *   "firebase" — real project connected; production data path
 *
 * Pure decision logic (no DOM) so it is testable from Node.
 */

import { firebaseConfig, isConfigPlaceholder } from "../firebase/config.js";
import { initFirebase } from "../firebase/init.js";

/**
 * @typedef {Object} Environment
 * @property {"demo"|"firebase"} mode
 * @property {string} reason      machine-readable why
 * @property {boolean} placeholder true if config file is untouched
 */

/**
 * Resolve the runtime environment. Safe to call once at boot.
 * @returns {Promise<Environment>}
 */
export async function resolveEnvironment() {
  const placeholder = isConfigPlaceholder();
  const { status, reason } = await initFirebase(firebaseConfig, placeholder);

  return {
    mode: status,
    reason: reason,
    placeholder,
  };
}


