/**
 * KADAI — emulator seed (runs inside `emulators:exec` with permissive rules)
 */
const BASE = "http://127.0.0.1:8080/v1/projects/kadai-36aa6/databases/(default)";

function v(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(v) } };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, val]) => [k, v(val)])) } };
  throw new Error("unsupported: " + JSON.stringify(value));
}
async function put(coll, id, doc) {
  const r = await fetch(`${BASE}/documents/${coll}/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(doc).map(([k, val]) => [k, v(val)])) }),
  });
  if (r.status !== 200) throw new Error(`seed ${coll}/${id} failed: ${r.status} ${await r.text()}`);
  console.log("  seeded", `${coll}/${id}`);
}

console.log("Seeding emulator…");
await put("products", "p1", { active: true, name: "Bulb", pricePaise: 20000, stock: 10, categoryId: "lights", createdAt: new Date("2023-11-14T22:13:20Z") });
await put("products", "p2", { active: true, name: "Rice bag", pricePaise: 120000, stock: 5, categoryId: "grocery", createdAt: new Date("2023-11-14T22:13:21Z") });
await put("products", "p3", { active: false, name: "Hidden", pricePaise: 5000, stock: 9, categoryId: "lights", createdAt: new Date("2023-11-14T22:13:22Z") });
await put("users", "uid-admin", { name: "Admin", email: "admin@test.local", phone: "", role: "admin", createdAt: new Date() });
await put("users", "uid-cust", { name: "Cust", email: "cust@test.local", phone: "", role: "customer", createdAt: new Date() });
await put("coupons", "SAVE10", { code: "SAVE10", type: "percent", value: 10, minOrderPaise: 100000, maxDiscountPaise: 5000, active: true, expiresAt: null });
await put("coupons", "FLAT5", { code: "FLAT5", type: "flat", value: 5000, minOrderPaise: 0, maxDiscountPaise: null, active: true, expiresAt: null });
await put("coupons", "DEAD10", { code: "DEAD10", type: "percent", value: 10, minOrderPaise: 0, maxDiscountPaise: null, active: false, expiresAt: null });
await put("categories", "cats1", { active: true, name: "Lights", slug: "lights", description: "" });
console.log("Seed complete.");
