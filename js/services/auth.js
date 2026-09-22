
/**
 * KADAI — auth + session service
 * Firebase Auth when connected. DEMO MODE: passwordless device-local
 * sessions — clearly labeled everywhere (no passwords ever stored, in
 * either mode — §23). Auth state is broadcast to subscribers.
 */

import { getFS, getAuthMod } from "../firebase/sdk.js";
import { lsGet, lsSet, lsRemove } from "../core/store.js";
import { localdb } from "./localdb.js";

const SESSION_KEY = "demo.session";

const state = { user: null, role: null, isDemo: false };
const listeners = new Set();

// Auth-hydration barrier: resolves after the first auth-state emission
// so protected pages can await it instead of racing onAuthStateChanged.
let resolveReady;
let readySettled = false;
const readyPromise = new Promise((resolve) => { resolveReady = resolve; });
/** Lift the hydration barrier exactly once (idempotent). */
function settleReady() {
  if (readySettled) return;
  readySettled = true;
  resolveReady();
}
export function authReady() { return readyPromise; }

export function currentUser() { return state.user; }
export function userRole() { return state.role; }
export function isDemoAuth() { return state.isDemo; }
export function isAdmin() { return state.role === "admin"; }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { for (const fn of listeners) fn(state.user); }

/** Ensure users/{uid} profile exists; returns profile doc. */
async function ensureProfile(uid, seed = {}) {
  const fs = await getFS();
  if (!fs) {
    const existing = localdb.get("users", uid) || null;
    return existing || localdb.put("users", uid, {
      name: seed.name || seed.email?.split("@")[0] || "Shopper",
      email: seed.email || "",
      phone: "", role: "customer",
    });
  }
  const { mod, db } = fs;
  const ref = mod.doc(db, "users", uid);
  const snap = await mod.getDoc(ref);
  if (!snap.exists()) {
    await mod.setDoc(ref, {
      name: seed.displayName || seed.email?.split("@")[0] || "Shopper",
      email: seed.email || "",
      phone: "",
      role: "customer", // admins are promoted in the Firebase console (setup guide Step 6)
      createdAt: mod.serverTimestamp(),
    });
  }
  const fresh = await mod.getDoc(ref);
  return { id: uid, ...fresh.data() };
}

async function applyProfile(profile) {
  state.role = profile?.role === "admin" ? "admin" : "customer";
  state.user = {
    uid: profile.id,
    email: profile.email || state.user?.email || "",
    displayName: profile.name || state.user?.displayName || "",
  };
  emit();
}

/** Called once at boot; returns unsubscribe. */
export function initAuth() {
  // Safety net: pages awaiting authReady() must NEVER hang on
  // "Checking permissions…" — if the CDN stalls or Firebase's first
  // event is slow, the barrier lifts after 8s (treated as signed-out;
  // the header still updates live when auth catches up).
  const safety = setTimeout(() => {
    console.warn("[kadai] auth barrier timeout — continuing signed-out; will update when auth responds.");
    settleReady();
  }, 8000);
  getAuthMod()
    .then(async (am) => {
      if (!am) {
        state.isDemo = true;
        const session = lsGet(SESSION_KEY);
        if (session?.uid) {
          state.user = session;
          state.role = localdb.get("users", session.uid)?.role === "admin" ? "admin" : "customer";
        }
        emit();
        clearTimeout(safety);
        settleReady();
        return;
      }
      let first = true;
      const settle = () => {
        if (!first) return;
        first = false;
        clearTimeout(safety);
        settleReady();
      };
      am.mod.onAuthStateChanged(am.auth, async (fbUser) => {
        if (fbUser) {
          state.user = { uid: fbUser.uid, email: fbUser.email, displayName: fbUser.displayName };
          try {
            await applyProfile(await ensureProfile(fbUser.uid, fbUser));
          } catch (e) {
            console.warn("[kadai] profile load failed:", e?.code || e?.message);
            emit();
          } finally {
            settle(); // barrier lifts once the role is known (or known-failed)
          }
          return;
        }
        state.user = null; state.role = null; emit();
        settle();
      });
    })
    .catch((e) => {
      console.warn("[kadai] auth init failed:", e?.code || e?.message);
      clearTimeout(safety);
      settleReady();
    });
  return () => listeners.clear();
}

/** Register. Demo mode: name + email only (passwordless, labeled).
 *  Emails lowercased like Firebase Auth does — case-dupes rejected. */
export async function register({ name, email, password }) {
  const am = await getAuthMod();
  email = String(email || "").trim().toLowerCase();
  if (!am) {
    if (localdb.list("users", (u) => (u.email || "").toLowerCase() === email).length) {
      throw { code: "auth/email-already-in-use", message: "An account with this email already exists on this device." };
    }
    const uid = "demo-" + Math.random().toString(36).slice(2, 10);
    const profile = localdb.put("users", uid, { name, email, phone: "", role: "customer", createdAtMs: Date.now() });
    lsSet(SESSION_KEY, { uid, email, displayName: name });
    await applyProfile(profile);
    return state.user;
  }
  const cred = await am.mod.createUserWithEmailAndPassword(am.auth, email, password);
  await applyProfile(await ensureProfile(cred.user.uid, { email, displayName: name }));
  return state.user;
}

export async function login({ email, password }) {
  const am = await getAuthMod();
  email = String(email || "").trim().toLowerCase();
  if (!am) {
    const found = localdb.list("users", (u) => (u.email || "").toLowerCase() === email)[0];
    if (!found) throw { code: "auth/user-not-found", message: "No demo account with that email on this device. Create one." };
    lsSet(SESSION_KEY, { uid: found.id, email, displayName: found.name });
    await applyProfile(found);
    return state.user;
  }
  const cred = await am.mod.signInWithEmailAndPassword(am.auth, email, password);
  await applyProfile(await ensureProfile(cred.user.uid, cred.user));
  return state.user;
}

export async function logout() {
  const am = await getAuthMod();
  lsRemove(SESSION_KEY); // clear/replace client state on logout (§23)
  state.user = null; state.role = null; emit();
  if (am) await am.mod.signOut(am.auth);
}

export async function resetPassword(email) {
  const am = await getAuthMod();
  if (!am) {
    return "Demo accounts are passwordless on this device — nothing to reset here. On the live store, a reset link would be emailed to you.";
  }
  await am.mod.sendPasswordResetEmail(am.auth, email);
  return "Reset link sent. Check your inbox (and spam).";
}

/** Re-read the signed-in user's profile (role included) — lets a newly
 *  promoted admin unlock the console without signing out and back in. */
export async function refreshRole() {
  if (!state.user) return false;
  const fs = await getFS();
  let profile = null;
  if (!fs) {
    profile = localdb.get("users", state.user.uid);
  } else {
    const snap = await fs.mod.getDoc(fs.mod.doc(fs.db, "users", state.user.uid));
    profile = snap.exists() ? { id: state.user.uid, ...snap.data() } : null;
  }
  if (!profile) return false;
  await applyProfile(profile); // emits → header menu updates live
  return state.role === "admin";
}


