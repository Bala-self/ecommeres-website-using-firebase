
/**
 * KADAI — user profile + address book (§43)
 * Profile is application data, separate from auth identity.
 * Passwords/credentials never touch this layer.
 */

import { getFS } from "../firebase/sdk.js";
import { localdb } from "./localdb.js";
import { currentUser } from "./auth.js";

const ADDRESSES = "users/addresses"; // logical name; backend picks the real path

export async function getProfile() {
  const user = currentUser();
  if (!user) return null;
  const fs = await getFS();
  if (!fs) return localdb.get("users", user.uid);
  const snap = await fs.mod.getDoc(fs.mod.doc(fs.db, "users", user.uid));
  return snap.exists() ? { id: user.uid, ...snap.data() } : null;
}

export async function updateProfile(patch) {
  const user = currentUser();
  if (!user) throw { code: "kadai/auth-required", message: "Sign in first." };
  const clean = {
    name: String(patch.name || "").trim().slice(0, 80),
    phone: String(patch.phone || "").trim().slice(0, 15),
  };
  const fs = await getFS();
  if (!fs) {
    localdb.update("users", user.uid, clean);
    return localdb.get("users", user.uid);
  }
  await fs.mod.setDoc(fs.mod.doc(fs.db, "users", user.uid), clean, { merge: true });
  const snap = await fs.mod.getDoc(fs.mod.doc(fs.db, "users", user.uid));
  return { id: user.uid, ...snap.data() };
}

export async function listAddresses() {
  const user = currentUser();
  if (!user) return [];
  const fs = await getFS();
  if (!fs) return localdb.userList(`${ADDRESSES}.${user.uid}`);
  const snap = await fs.mod.getDocs(fs.mod.collection(fs.db, "users", user.uid, "addresses"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveAddress(id, data) {
  const user = currentUser();
  if (!user) throw { code: "kadai/auth-required", message: "Sign in first." };
  const clean = {
    label: String(data.label || "Home").slice(0, 30),
    receiver: String(data.receiver).trim().slice(0, 80),
    phone: String(data.phone).trim(),
    line1: String(data.line1).trim().slice(0, 160),
    line2: String(data.line2 || "").trim().slice(0, 160),
    landmark: String(data.landmark || "").trim().slice(0, 80),
    city: String(data.city).trim().slice(0, 60),
    state: String(data.state).trim().slice(0, 60),
    pincode: String(data.pincode).trim(),
  };
  const fs = await getFS();
  if (!fs) {
    const addrId = id || "addr-" + Math.random().toString(36).slice(2, 10);
    localdb.userPut(`${ADDRESSES}.${user.uid}`, addrId, clean);
    return { id: addrId, ...clean };
  }
  if (id) {
    await fs.mod.setDoc(fs.mod.doc(fs.db, "users", user.uid, "addresses", id), clean);
    return { id, ...clean };
  }
  const ref = await fs.mod.addDoc(fs.mod.collection(fs.db, "users", user.uid, "addresses"), {
    ...clean, createdAt: fs.mod.serverTimestamp(),
  });
  return { id: ref.id, ...clean };
}

export async function deleteAddress(id) {
  const user = currentUser();
  if (!user) return;
  const fs = await getFS();
  if (!fs) return localdb.userDelete(`${ADDRESSES}.${user.uid}`, id);
  await fs.mod.deleteDoc(fs.mod.doc(fs.db, "users", user.uid, "addresses", id));
}


