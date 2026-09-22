
/**
 * KADAI — Firebase SDK loader
 * ----------------------------
 * Single place where the Firebase SDK is imported (official ESM CDN —
 * the only runtime dependency of this project, per §62 dependency policy).
 *
 * Behavior contract:
 *  - Placeholder config  → never touches the network. Returns "demo".
 *  - Real config + online→ initializes app + Auth + Firestore. Returns "firebase".
 *  - Real config + offline/CDN failure → caught, logged once, returns "demo".
 *    No unhandled rejections, no raw errors thrown at boot.
 */

const SDK_BASE = "https://www.gstatic.com/firebasejs/10.12.2";

/** @type {{status: "demo"|"firebase", reason?: string, app?: object, auth?: object, db?: object}} */
let sdkState = { status: "demo", reason: "not-loaded" };

/** Race a promise against a timeout so a dead CDN cannot hang boot. */
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("sdk-load-timeout")), ms)),
  ]);
}

/**
 * Attempt to initialize Firebase.
 * @param {object} config        Firebase web config object
 * @param {boolean} isPlaceholder whether config is still placeholder
 * @returns {Promise<{status: "demo"|"firebase", reason?: string}>}
 */
export async function initFirebase(config, isPlaceholder) {
  if (isPlaceholder) {
    sdkState = { status: "demo", reason: "placeholder-config" };
    return { status: sdkState.status, reason: sdkState.reason };
  }

  try {
    const [{ initializeApp, getApps, getApp }, { getAuth }, { getFirestore }] =
      await withTimeout(
        Promise.all([
          import(`${SDK_BASE}/firebase-app.js`),
          import(`${SDK_BASE}/firebase-auth.js`),
          import(`${SDK_BASE}/firebase-firestore.js`),
        ]),
        8000
      );

    const app = getApps().length ? getApp() : initializeApp(config);

    sdkState = {
      status: "firebase",
      reason: "connected",
      app,
      auth: getAuth(app),
      db: getFirestore(app),
    };
  } catch (err) {
    // Deliberate swallow-with-record: boot must never die because the
    // CDN is unreachable. Downstream features check state via getSdk().
    console.warn(
      `[kadai] Firebase SDK unavailable (${err && err.message ? err.message : "unknown"}). ` +
      "Running in demo mode."
    );
    sdkState = { status: "demo", reason: "sdk-unavailable" };
  }

  return { status: sdkState.status, reason: sdkState.reason };
}

/**
 * Access initialized SDK handles. Null unless status === "firebase".
 * Services (Phase 04+) guard on this instead of importing SDK modules
 * directly, so demo mode stays a first-class path.
 */
export function getSdk() {
  return sdkState.status === "firebase"
    ? { app: sdkState.app, auth: sdkState.auth, db: sdkState.db }
    : null;
}

/** @returns {"demo"|"firebase"} */
export function getMode() {
  return sdkState.status;
}


