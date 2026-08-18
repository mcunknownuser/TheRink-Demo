/*
 * Minimal Node smoke test for the data layer: assets/js/store.js (bookings)
 * and assets/js/accounts.js (accounts + the credit ledger).
 * Run: node test/smoke.mjs   (from the project root)
 * Uses localStorage/sessionStorage stubs; no browser required.
 */

import assert from "node:assert/strict";

/* Storage stubs, installed before the modules are imported */
const data = new Map();
globalThis.localStorage = {
  getItem: (k) => (data.has(k) ? data.get(k) : null),
  setItem: (k, v) => data.set(k, String(v)),
  removeItem: (k) => data.delete(k),
  clear: () => data.clear()
};

const sessionData = new Map();
globalThis.sessionStorage = {
  getItem: (k) => (sessionData.has(k) ? sessionData.get(k) : null),
  setItem: (k, v) => sessionData.set(k, String(v)),
  removeItem: (k) => sessionData.delete(k),
  clear: () => sessionData.clear()
};

const store = await import("../assets/js/store.js");
const accounts = await import("../assets/js/accounts.js");
const catalog = await import("../assets/js/catalog.js");
const card = await import("../assets/js/card.js");

let passed = 0;
function ok(name, fn) {
  fn();
  passed += 1;
  console.log("ok - " + name);
}

/* 1. Seeding */
ok("ensureSeed materializes 17 bookings and sets the marker", () => {
  const didSeed = store.ensureSeed();
  assert.equal(didSeed, true);
  assert.equal(store.getBookings().length, 17);
  assert.equal(localStorage.getItem(store.SEED_KEY), store.SEED_VERSION);
  assert.equal(store.ensureSeed(), false, "second call must not reseed");
});

ok("seed status totals are 9 confirmed / 6 pending / 2 cancelled", () => {
  const byStatus = { pending: 0, confirmed: 0, cancelled: 0 };
  for (const b of store.getBookings()) byStatus[b.status] += 1;
  assert.deepEqual(byStatus, { pending: 6, confirmed: 9, cancelled: 2 });
});

/* 1b. The partnership: both brands live in one store */
ok("seed spans both brands and every service is branded", () => {
  const byBrand = {};
  for (const b of store.getBookings()) {
    const k = store.brandOfBooking(b);
    byBrand[k] = (byBrand[k] || 0) + 1;
  }
  assert.deepEqual(byBrand, { rink: 12, testify: 5 });
  for (const svc of catalog.SERVICES) {
    assert.ok(svc.brand === "rink" || svc.brand === "testify", svc.id + " must name a brand");
  }
  assert.equal(catalog.brandOf("testify-membership"), "testify");
  assert.equal(catalog.brandOf("player-1on1"), "rink");
});

ok("memberships are recurring, and only live ones count toward MRR", () => {
  const memberships = store.getBookings().filter(store.isMembership);
  assert.equal(memberships.length, 3);
  const mrr = memberships.reduce((sum, b) => sum + store.monthlyValue(b), 0);
  assert.equal(mrr, 975, "460 gold + 170 bronze + 345 silver");

  /* Assessment fee is what was charged; the monthly rate is not a deposit. */
  for (const m of memberships) {
    assert.equal(m.deposit.amount, catalog.MEMBERSHIP_ASSESSMENT_FEE);
    assert.equal(m.schedule.termMonths, catalog.MEMBERSHIP_MIN_TERM_MONTHS);
    assert.ok(m.schedule.tier && m.schedule.stream && m.schedule.startDate);
  }

  /* Cancelling stops the recurring revenue but keeps the record. */
  const one = memberships.find((m) => m.status === "confirmed");
  const before = store.monthlyValue(one);
  assert.ok(before > 0);
  store.updateStatus(one.ref, "cancelled");
  assert.equal(store.monthlyValue(store.findBooking(one.ref)), 0);
});

ok("membership rates match testifyperformance.ca", () => {
  assert.equal(catalog.monthlyRate("bronze", "athlete"), 230);
  assert.equal(catalog.monthlyRate("bronze", "lifestyle"), 170);
  assert.equal(catalog.monthlyRate("platinum", "athlete"), 550);
  assert.equal(catalog.monthlyRate("platinum", "lifestyle"), 420);
  assert.equal(catalog.MEMBERSHIP_ASSESSMENT_FEE, 99.99);
  assert.equal(catalog.getTier("gold").sessions, 4);
  assert.equal(catalog.monthlyRate("nope", "athlete"), null);
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
  deposit: { amount: 150, cardLast4: "4242" }
});

ok("createBooking generates a valid, unique ref and stores it as pending", () => {
  assert.match(newBooking.ref, /^RNK-\d{5}$/);
  const all = store.getBookings();
  assert.equal(all.length, 18);
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
    "Ref,Created,Service,Location,Schedule,Participant,Paid with,Deposit,Status,Email,Phone"
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

/* 6. Accounts + credit ledger */

ok("seeded ledger produces the intended balances", () => {
  assert.equal(accounts.balanceOf("s.hartley@mymts.net", "player-1on1"), 6);
  assert.equal(accounts.balanceOf("renee.desjardins@gmail.com", "player-1on1"), 0);
  assert.equal(accounts.balanceOf("dbraun@telus.net", "goalie-1on1"), 4);
  /* Credit types are not fungible across services. */
  assert.equal(accounts.balanceOf("dbraun@telus.net", "player-1on1"), 0);
});

ok("accounts are derived from bookings, so seeded customers already exist", () => {
  const a = accounts.accountFor("S.Hartley@MyMTS.net "); // messy input must normalize
  assert.equal(a.email, "s.hartley@mymts.net");
  assert.equal(a.profile.name, "Sarah Hartley");
  assert.equal(a.bookings.length >= 1, true);
  assert.equal(a.totalCredits, 6);

  /* The point of the merge: one account spans both brands. Sarah has RINK
     1-on-1 credits and a Testify membership, and her lifetime figure is the
     10-pack plus the membership assessment fee. */
  const brands = new Set(a.bookings.map(store.brandOfBooking));
  assert.deepEqual([...brands].sort(), ["rink", "testify"]);
  assert.equal(a.lifetimeSpend, 1690 + catalog.MEMBERSHIP_ASSESSMENT_FEE);

  /* An account with bookings but no ledger is still a real account. */
  const deposits = accounts.accountFor("mike.reimer@outlook.com");
  assert.equal(deposits.exists, true);
  assert.deepEqual(deposits.balances, []);
  assert.equal(deposits.lifetimeSpend, 150);

  assert.equal(accounts.accountFor("nobody@example.com").exists, false);
});

ok("purchase adds credits and redemption spends exactly one", () => {
  const pkg = catalog.findPackage("player-1on1", "five");
  assert.equal(catalog.packageTotal(pkg), 895);
  assert.equal(catalog.packageSavings("player-1on1", pkg), 100);

  const email = "buyer@example.com";
  accounts.purchasePackage(email, "player-1on1", pkg);
  assert.equal(accounts.balanceOf(email, "player-1on1"), 5);
  accounts.redeemCredit(email, "player-1on1", "RNK-11111");
  assert.equal(accounts.balanceOf(email, "player-1on1"), 4);
});

ok("redemption is refused when the balance is zero", () => {
  const email = "empty@example.com";
  assert.equal(accounts.redeemCredit(email, "player-1on1", "RNK-22222"), null);
  assert.equal(accounts.balanceOf(email, "player-1on1"), 0, "balance must never go negative");
});

ok("cancellation policy: outside 24h refunds, inside 24h forfeits", () => {
  const email = "policy@example.com";
  accounts.purchasePackage(email, "player-1on1", catalog.findPackage("player-1on1", "ten"));

  const mk = (hoursAhead) => {
    const when = new Date(Date.now() + hoursAhead * 3600000);
    const iso = when.getFullYear() + "-" +
      String(when.getMonth() + 1).padStart(2, "0") + "-" +
      String(when.getDate()).padStart(2, "0");
    const b = store.createBooking({
      serviceId: "player-1on1",
      serviceName: "Player 1-on-1 Session",
      serviceType: "hourly",
      locationId: "trc",
      locationName: "RINK Training Centre — Winnipeg, MB",
      schedule: { date: iso, startTime: String(when.getHours()).padStart(2, "0") + ":00", endTime: "23:00" },
      participant: { name: "Policy Test", ageGroup: "U13", notes: "" },
      contact: { name: "Policy Parent", email, phone: "(204) 555-0100" },
      deposit: { amount: 0, cardLast4: null },
      payment: { method: "credit", creditType: "player-1on1", used: 1, ledgerId: null }
    });
    accounts.redeemCredit(email, "player-1on1", b.ref);
    return b;
  };

  const far = mk(72);
  const before = accounts.balanceOf(email, "player-1on1");
  accounts.applyCancellationPolicy(far);
  assert.equal(accounts.balanceOf(email, "player-1on1"), before + 1, "outside the window returns the credit");

  const soon = mk(3);
  const before2 = accounts.balanceOf(email, "player-1on1");
  const entry = accounts.applyCancellationPolicy(soon);
  assert.equal(entry.kind, "forfeit");
  assert.equal(entry.qty, 0, "a forfeit records the fact but moves no credits");
  assert.equal(accounts.balanceOf(email, "player-1on1"), before2, "inside the window the credit stays spent");
});

ok("a comp is recorded with its reason and raises the balance", () => {
  const email = "comped@example.com";
  accounts.compCredit(email, "goalie-1on1", "Coach illness");
  assert.equal(accounts.balanceOf(email, "goalie-1on1"), 1);
  const entry = accounts.entriesFor(email)[0];
  assert.equal(entry.kind, "comp");
  assert.equal(entry.note, "Coach illness");
});

ok("credit-paid bookings report a credit, not a dollar amount", () => {
  const credit = store.findBooking("RNK-73418");
  assert.equal(store.isCreditPaid(credit), true);
  assert.equal(store.paymentLine(credit), "1 session credit");
  assert.equal(store.bookingAmount(credit), 0, "credit bookings must not double-count revenue");

  const deposit = store.findBooking("RNK-46711");
  assert.equal(store.isCreditPaid(deposit), false);
  assert.equal(store.paymentLine(deposit), "$150 CAD · card ending 2280");
  assert.equal(store.bookingAmount(deposit), 150);
});

ok("malformed ledger entries are dropped on read", () => {
  const before = accounts.getLedger().length;
  const raw = JSON.parse(localStorage.getItem(store.CREDITS_KEY));
  raw.push({}, null, 7, { id: "x", email: "a@b.c" }, { id: "y", email: "a@b.c", creditType: "t", qty: "many", at: "z" });
  localStorage.setItem(store.CREDITS_KEY, JSON.stringify(raw));
  assert.equal(accounts.getLedger().length, before, "junk entries must not reach the balance arithmetic");
  assert.doesNotThrow(() => accounts.allAccounts());
});

ok("1-on-1 age divisions start at U9 and card validation is shared", () => {
  const groups = catalog.ageGroupsFor(catalog.getService("player-1on1"));
  assert.equal(groups.includes("U7"), false, "1-on-1 instruction is U9 and up");
  assert.equal(groups[0], "U9");
  assert.deepEqual(catalog.ageGroupsFor(catalog.getService("hockey-camp")), catalog.CAMP_AGE_GROUPS);

  const at = new Date(2026, 7, 9); // 2026-08-09
  assert.deepEqual(card.validateCard({ name: "A B", number: "4242424242424242", expiry: "08/26", cvc: "123" }, at), {});
  assert.equal("cardExpiry" in card.validateCard({ name: "A B", number: "4242424242424242", expiry: "07/26", cvc: "123" }, at), true);
  assert.equal(card.cardLast4("4242 4242 4242 1234"), "1234");
});

ok("sign-in round-trips through sessionStorage", () => {
  accounts.signIn("  Dbraun@Telus.net ");
  assert.equal(accounts.currentEmail(), "dbraun@telus.net");
  assert.equal(accounts.currentAccount().totalCredits, 4);
  accounts.signOut();
  assert.equal(accounts.currentEmail(), null);
  assert.equal(accounts.currentAccount(), null);
});

console.log("\nAll " + passed + " smoke tests passed.");
