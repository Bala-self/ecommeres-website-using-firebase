
/**
 * KADAI — review service (§42)
 * Published reviews are public. Submissions start as 'pending' and are
 * shown publicly only after admin approval. No fabricated counts —
 * product ratings stay null until a trusted aggregation exists.
 */

import { getFS } from "../firebase/sdk.js";
import { localdb } from "./localdb.js";
import { currentUser } from "./auth.js";

/** Published reviews for a product (newest first).
 *  The status constraint lives IN THE QUERY, not just client-side: rules
 *  allow public reads only for published reviews, and Firestore rules are
 *  not filters — an unconstrained query would be rejected outright. */
export async function listPublished(productId) {
  const fs = await getFS();
  if (!fs) {
    return localdb.list("reviews", (r) => r.productId === productId && r.status === "published")
      .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  }
  const snap = await fs.mod.getDocs(
    fs.mod.query(
      fs.mod.collection(fs.db, "reviews"),
      fs.mod.where("productId", "==", productId),
      fs.mod.where("status", "==", "published"),
      fs.mod.orderBy("createdAt", "desc"),
      fs.mod.limit(50)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Submit for moderation. Returns the moderation message. */
export async function submit({ productId, rating, text }) {
  const user = currentUser();
  if (!user) throw { code: "kadai/auth-required", message: "Sign in to write a review." };
  const review = {
    productId: String(productId),
    userId: user.uid,
    userDisplayName: user.displayName || (user.email ? user.email.split("@")[0] : "Customer"),
    rating: Number(rating),
    text: String(text).trim(),
    status: "pending",
    createdAtMs: Date.now(),
  };
  const fs = await getFS();
  if (!fs) {
    localdb.put("reviews", "rev-" + Math.random().toString(36).slice(2, 10), review);
  } else {
    await fs.mod.addDoc(fs.mod.collection(fs.db, "reviews"), {
      ...review,
      createdAt: fs.mod.serverTimestamp(),
      updatedAt: fs.mod.serverTimestamp(),
    });
  }
  return "Thanks — your review was received and will appear once a moderator approves it.";
}

export async function listPending() {
  const fs = await getFS();
  if (!fs) return localdb.list("reviews", (r) => r.status === "pending");
  const snap = await fs.mod.getDocs(
    fs.mod.query(fs.mod.collection(fs.db, "reviews"), fs.mod.orderBy("createdAt", "desc"), fs.mod.limit(100))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => r.status === "pending");
}

/** Admin moderation. status: 'published' | 'rejected'. */
export async function moderate(reviewId, status) {
  if (!["published", "rejected"].includes(status)) throw new Error("Bad moderation status");
  const fs = await getFS();
  if (!fs) {
    localdb.update("reviews", reviewId, { status, moderatedAtMs: Date.now() });
    return;
  }
  await fs.mod.updateDoc(fs.mod.doc(fs.db, "reviews", reviewId), {
    status,
    updatedAt: fs.mod.serverTimestamp(),
  });
}


