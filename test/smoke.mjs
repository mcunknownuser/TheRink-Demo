/*
 * Minimal Node smoke test for the data layer (assets/js/store.js).
 * Run: node test/smoke.mjs   (from the project root)
 * Uses a localStorage stub; no browser required.
 */

import assert from "node:assert/strict";

/* localStorage stub, installed before the store is imported */
const data = new Map();
globalThis.localStorage = {
  getItem: (k) => (data.has(k) ? data.get(k) : null),
  setItem: (k, v) => data.set(k, String(v)),
  removeItem: (k) => data.delete(k),
  clear: () => data.clear()
};

const store = await import("../assets/js/store.js");

let passed = 0;
function ok(name, fn) {
  fn();
  passed += 1;
  console.log("ok - " + name);
}

/* 1. Seeding */
ok("ensureSeed materializes 12 bookings and sets the marker", () => {
  const didSeed = store.ensureSeed();
  assert.equal(didSeed, true);
  assert.equal(store.getBookings().length, 12);
  assert.equal(localStorage.getItem(store.SEED_KEY), store.SEED_VERSION);
  assert.equal(store.ensureSeed(), false, "second call must not reseed");
});

ok("seed status totals are 6 confirmed / 4 pending / 2 cancelled", () => {
  const byStatus = { pending: 0, confirmed: 0, cancelled: 0 };
  for (const b of store.getBookings()) byStatus[b.status] += 1;
  assert.deepEqual(byStatus, { pending: 4, confirmed: 6, cancelled: 2 });
});

/* 2. Booking creation */
const newBooking = store.createBooking({
  serviceId: "player-1on1",
  serviceName: "Player 1-on-1 Session",
  serviceType: "hourly",
  locationId: "trc",
  locationName: "RINK Training Centre — Winnipeg, MB",
  schedule: { date: "2026-08-20", startTime: "09:00", endTime: "10:00" },
  participant: { name: "Test Skater", ageGroup: "U11", notes: "" },
  contact: { name: "Test Parent", email: "parent@example.com", phone: "(204) 555-0134" },
  deposit: { amount: 50, cardLast4: "4242" }
});

ok("createBooking generates a valid, unique ref and stores it as pending", () => {
  assert.match(newBooking.ref, /^RNK-\d{5}$/);
  const all = store.getBookings();
  assert.equal(all.length, 13);
  assert.equal(all.filter((b) => b.ref === newBooking.ref).length, 1);
  assert.equal(store.findBooking(newBooking.ref).status, "pending");
  assert.equal(newBooking.deposit.cardLast4, "4242");
  assert.equal(JSON.stringify(store.findBooking(newBooking.ref)).includes("4242 4242"), false);
});

ok("generateRef avoids collisions with existing refs", () => {
  const refs = store.getBookings().map((b) => b.ref);
  const fresh = store.generateRef(refs);
  assert.match(fresh, /^RNK-\d{5}$/);
  assert.equal(refs.includes(fresh), false);
});

/* 3. Status transitions */
ok("pending → confirmed works and persists", () => {
  const updated = store.updateStatus(newBooking.ref, "confirmed");
  assert.equal(updated.status, "confirmed");
  assert.equal(store.findBooking(newBooking.ref).status, "confirmed");
});

ok("confirmed → cancelled works; cancelled is terminal", () => {
  assert.equal(store.updateStatus(newBooking.ref, "cancelled").status, "cancelled");
  assert.equal(store.updateStatus(newBooking.ref, "confirmed"), null, "cancelled must not reactivate");
  assert.equal(store.findBooking(newBooking.ref).status, "cancelled");
});

ok("illegal transitions are rejected", () => {
  const confirmed = store.getBookings().find((b) => b.status === "confirmed");
  assert.equal(store.updateStatus(confirmed.ref, "confirmed"), null, "confirmed → confirmed rejected");
  assert.equal(store.updateStatus("RNK-00000", "confirmed"), null, "unknown ref rejected");
});

/* 4. CSV export */
ok("CSV export includes expected columns and all rows", () => {
  const csv = store.bookingsToCsv(store.getBookings());
  const lines = csv.split("\r\n");
  assert.equal(
    lines[0],
    "Ref,Created,Service,Location,Schedule,Participant,Deposit,Status,Email,Phone"
  );
  assert.equal(lines.length, store.getBookings().length + 1);
  assert.equal(csv.includes(newBooking.ref), true);
});

/* 5. Hardening (REVIEW.md MINOR-3 / MINOR-4) */
ok("CSV neutralizes formula-leading fields", () => {
  const evil = store.createBooking({
    serviceId: "player-1on1",
    serviceName: "Player 1-on-1 Session",
    serviceType: "hourly",
    locationId: "trc",
    locationName: "RINK Training Centre — Winnipeg, MB",
    schedule: { date: "2026-08-21", startTime: "10:00", endTime: "11:00" },
    participant: { name: "=2+2", ageGroup: "U11", notes: "" },
    contact: { name: "Test Parent", email: "parent@example.com", phone: "+1 (204) 555-0134" },
    deposit: { amount: 50, cardLast4: "4242" }
  });
  const csv = store.bookingsToCsv([store.findBooking(evil.ref)]);
  assert.equal(csv.includes("'=2+2"), true, "leading = must be prefixed with an apostrophe");
  assert.equal(csv.includes("'+1 (204) 555-0134"), true, "leading + must be prefixed too");
});

ok("malformed records are dropped on read, and CSV/consumers survive", () => {
  const before = store.getBookings().length;
  const raw = JSON.parse(localStorage.getItem(store.BOOKINGS_KEY));
  raw.push({}, null, 42, { ref: "RNK-99999" }); // valid JSON, wrong shapes
  localStorage.setItem(store.BOOKINGS_KEY, JSON.stringify(raw));
  assert.equal(store.getBookings().length, before, "junk records must be filtered out");
  assert.doesNotThrow(() => store.bookingsToCsv(store.getBookings()));
  assert.equal(store.findBooking("RNK-99999"), null);
});

console.log("\nAll " + passed + " smoke tests passed.");
