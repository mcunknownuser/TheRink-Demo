/*
 * accounts.js — the account + credit layer (STRATEGY.md §8).
 *
 * The account is DERIVED, not stored: every booking already carries
 * `contact.email`, so an account's booking history is a filter over the
 * existing `rink.bookings` store. Only two things are genuinely new:
 *
 *   localStorage["rink.credits"]   — an append-only credit ledger
 *   localStorage["rink.accounts"]  — an optional profile overlay (name/phone)
 *   sessionStorage["rink.session"] — { email } for the signed-in customer
 *
 * Balances are never stored. `balanceOf()` sums the ledger, the same way the
 * dashboard derives its stats. A counter could not explain *why* a balance is
 * what it is; the ledger can, which is the whole point of showing it to a
 * manager who is fielding "I was told I had three left" on the phone.
 *
 * Storage is resolved at call time via globalThis so a Node test can stub it.
 */

import { getBookings, bookingAmount, CREDITS_KEY, ACCOUNTS_KEY } from "./store.js";
import { CREDIT_TYPES } from "./catalog.js";

export { CREDITS_KEY, ACCOUNTS_KEY };
export const SESSION_KEY = "rink.session";

function storage() {
  return globalThis.localStorage;
}

function session() {
  return globalThis.sessionStorage;
}

/* Email is the account key, so it has to normalize consistently everywhere. */
export function normalizeEmail(email) {
  return String(email == null ? "" : email).trim().toLowerCase();
}

/* ---- Credit ledger ---- */

/*
 * Ledger entries are immutable facts, never edited or deleted:
 *
 *   { id, email, creditType, qty, kind, at,
 *     unitPrice?, amount?, packageId?, bookingRef?, note? }
 *
 * `qty` is signed: purchases add, redemptions and forfeits subtract. `kind` is
 * narrative only — the balance depends solely on qty, so an unrecognized kind
 * from a future writer can never corrupt the arithmetic.
 */
function isLedgerEntry(e) {
  return Boolean(
    e &&
      typeof e === "object" &&
      typeof e.id === "string" &&
      typeof e.email === "string" &&
      typeof e.creditType === "string" &&
      Number.isFinite(e.qty) &&
      typeof e.at === "string"
  );
}

export function getLedger() {
  try {
    const raw = storage().getItem(CREDITS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isLedgerEntry) : [];
  } catch {
    return [];
  }
}

export function saveLedger(entries) {
  storage().setItem(CREDITS_KEY, JSON.stringify(entries));
}

let entrySeq = 0;
function ledgerId(at) {
  entrySeq += 1;
  return "CR-" + at.replace(/\D/g, "").slice(0, 14) + "-" + String(entrySeq).padStart(3, "0");
}

/* Append one entry and return it. The only writer of the ledger. */
export function appendEntry(entry) {
  const at = entry.at || new Date().toISOString();
  const record = {
    id: entry.id || ledgerId(at),
    email: normalizeEmail(entry.email),
    creditType: entry.creditType,
    qty: Number(entry.qty),
    kind: entry.kind || "adjustment",
    at,
    unitPrice: entry.unitPrice == null ? null : Number(entry.unitPrice),
    amount: entry.amount == null ? null : Number(entry.amount),
    packageId: entry.packageId || null,
    bookingRef: entry.bookingRef || null,
    note: entry.note || ""
  };
  const ledger = getLedger();
  ledger.push(record);
  saveLedger(ledger);
  return record;
}

export function entriesFor(email) {
  const key = normalizeEmail(email);
  return getLedger()
    .filter((e) => e.email === key)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)); // newest first
}

/* Balance for one credit type. Never stored — always summed. */
export function balanceOf(email, creditType) {
  const key = normalizeEmail(email);
  return getLedger()
    .filter((e) => e.email === key && e.creditType === creditType)
    .reduce((sum, e) => sum + e.qty, 0);
}

/* Every credit type this account has ever touched, with its current balance. */
export function balancesFor(email) {
  const key = normalizeEmail(email);
  const totals = new Map();
  for (const e of getLedger()) {
    if (e.email !== key) continue;
    totals.set(e.creditType, (totals.get(e.creditType) || 0) + e.qty);
  }
  return [...totals.entries()].map(([creditType, balance]) => ({
    creditType,
    balance,
    label: (CREDIT_TYPES[creditType] || {}).label || creditType,
    short: (CREDIT_TYPES[creditType] || {}).short || creditType
  }));
}

/* ---- Purchase / redeem / forfeit / comp ---- */

export function purchasePackage(email, creditType, pkg, opts = {}) {
  return appendEntry({
    email,
    creditType,
    qty: pkg.qty,
    kind: "purchase",
    packageId: pkg.id,
    unitPrice: pkg.unit,
    amount: pkg.qty * pkg.unit,
    bookingRef: opts.bookingRef || null,
    note: opts.note || "",
    at: opts.at
  });
}

/*
 * Spend one credit against a booking. Refuses when the balance is zero or
 * less, so the ledger can never go negative through the normal booking path.
 */
export function redeemCredit(email, creditType, bookingRef, opts = {}) {
  if (balanceOf(email, creditType) < 1) return null;
  return appendEntry({
    email,
    creditType,
    qty: -1,
    kind: "redemption",
    bookingRef,
    note: opts.note || "",
    at: opts.at
  });
}

/*
 * Cancellation, per RINK's real 24-hour policy:
 *
 *   outside the window → `refund`, qty +1, the credit comes back
 *   inside the window  → `forfeit`, qty 0, the credit stays spent
 *
 * A forfeit moves nothing because the redemption already debited the credit —
 * it is written purely so the balance has a visible explanation. Undated
 * bookings (seasonal, camp) have no window and are always refundable.
 */
export const CANCELLATION_NOTICE_HOURS = 24;

export function hoursUntil(isoDateTime, now = new Date()) {
  return (new Date(isoDateTime).getTime() - now.getTime()) / 3600000;
}

/* The scheduled start of a booking, as a Date — null for non-dated shapes. */
export function bookingStart(booking) {
  const s = booking.schedule || {};
  if (!s.date) return null;
  const [y, m, d] = s.date.split("-").map(Number);
  const [hh, mm] = (s.startTime || "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

export function refundCredit(email, creditType, bookingRef, opts = {}) {
  return appendEntry({
    email,
    creditType,
    qty: 1,
    kind: "refund",
    bookingRef,
    note: opts.note || "Cancelled outside the 24-hour window",
    at: opts.at
  });
}

export function forfeitCredit(email, creditType, bookingRef, opts = {}) {
  return appendEntry({
    email,
    creditType,
    qty: 0,
    kind: "forfeit",
    bookingRef,
    note: opts.note || "Cancelled inside the 24-hour window — session used",
    at: opts.at
  });
}

/*
 * Apply the cancellation policy to a credit-paid booking. Returns the ledger
 * entry written, or null when the booking wasn't paid with a credit. The
 * caller is responsible for the status change itself.
 */
export function applyCancellationPolicy(booking, now = new Date()) {
  if (!booking.payment || booking.payment.method !== "credit") return null;
  const { creditType } = booking.payment;
  const email = booking.contact.email;
  const start = bookingStart(booking);
  const outsideWindow = !start || hoursUntil(start, now) >= CANCELLATION_NOTICE_HOURS;
  return outsideWindow
    ? refundCredit(email, creditType, booking.ref, { at: now.toISOString() })
    : forfeitCredit(email, creditType, booking.ref, { at: now.toISOString() });
}

/* Manager goodwill: hand a credit back regardless of policy, with a reason. */
export function compCredit(email, creditType, note, opts = {}) {
  return appendEntry({
    email,
    creditType,
    qty: 1,
    kind: "comp",
    note: note || "Credit added by front desk",
    at: opts.at
  });
}

/* ---- Profile overlay ---- */

function getProfiles() {
  try {
    const raw = storage().getItem(ACCOUNTS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveProfile(email, profile) {
  const key = normalizeEmail(email);
  const all = getProfiles();
  all[key] = { ...(all[key] || {}), ...profile };
  storage().setItem(ACCOUNTS_KEY, JSON.stringify(all));
  return all[key];
}

/* ---- The derived account ---- */

/*
 * Everything the customer and the front desk see about one email, assembled
 * from data that mostly already exists. Bookings come straight out of the
 * booking store, so the 12 seeded bookings produce 12 populated accounts with
 * no migration and no duplicated source of truth.
 */
export function accountFor(email) {
  const key = normalizeEmail(email);
  if (!key) return null;

  const bookings = getBookings()
    .filter((b) => normalizeEmail(b.contact.email) === key)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  /* Profile: explicit overlay wins, else the most recent booking's contact. */
  const latest = bookings[0];
  const overlay = getProfiles()[key] || {};
  const profile = {
    email: key,
    name: overlay.name || (latest ? latest.contact.name : ""),
    phone: overlay.phone || (latest ? latest.contact.phone : "")
  };

  const entries = entriesFor(key);
  const balances = balancesFor(key);

  /* Lifetime spend = deposits paid on bookings + credit packages purchased.
     Cancelled bookings keep their deposit in the total: it was still paid. */
  const depositSpend = bookings.reduce((sum, b) => sum + bookingAmount(b), 0);
  const creditSpend = entries.reduce((sum, e) => sum + (e.amount || 0), 0);

  return {
    email: key,
    profile,
    bookings,
    entries,
    balances,
    totalCredits: balances.reduce((sum, x) => sum + x.balance, 0),
    lifetimeSpend: depositSpend + creditSpend,
    exists: bookings.length > 0 || entries.length > 0
  };
}

/* Every account known to the browser, newest activity first. */
export function allAccounts() {
  const emails = new Set();
  for (const b of getBookings()) emails.add(normalizeEmail(b.contact.email));
  for (const e of getLedger()) emails.add(e.email);
  for (const key of Object.keys(getProfiles())) emails.add(key);
  return [...emails]
    .map(accountFor)
    .filter(Boolean)
    .sort((a, b) => {
      const la = a.bookings[0] ? a.bookings[0].createdAt : "";
      const lb = b.bookings[0] ? b.bookings[0].createdAt : "";
      return la < lb ? 1 : la > lb ? -1 : 0;
    });
}

/* ---- Session (no password — demo) ---- */

export function signIn(email) {
  const key = normalizeEmail(email);
  if (!key) return null;
  session().setItem(SESSION_KEY, JSON.stringify({ email: key }));
  return key;
}

export function signOut() {
  session().removeItem(SESSION_KEY);
}

export function currentEmail() {
  try {
    const raw = session().getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.email ? normalizeEmail(parsed.email) : null;
  } catch {
    return null;
  }
}

export function currentAccount() {
  const email = currentEmail();
  return email ? accountFor(email) : null;
}
