
/**
 * KADAI — environment state mirror
 * main.js resolves the environment once at boot and records it here so
 * components (e.g. the demo banner) can check it synchronously.
 */

let current = { mode: "demo", reason: "unresolved", placeholder: true };

export function setEnv(env) { current = env; }

/** @returns {boolean} true when running on local demo data */
export function isDemoEnv() { return current.mode !== "firebase"; }
export function getEnv() { return current; }


