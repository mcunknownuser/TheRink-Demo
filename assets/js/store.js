/*
 * store.js — the data layer (STRATEGY.md §4): localStorage read/write, seeding,
 * booking-ref generation, status transitions, shared formatters, CSV export.
 * Storage is resolved at call time via globalThis so a Node test can stub it.
 */

import { materializeSeed, materializeCreditSeed } from "./seed.js";

export const BOOKINGS_KEY = "rink.bookings";
export const SEED_KEY = "rink.seedVersion";

/* Storage keys for the account layer live here too — store.js owns every key
   the demo writes, so accounts.js has no constants of its own to drift. */
export const CREDITS_KEY = "rink.credits";
export const ACCOUNTS_KEY = "rink.accounts";

/* Bumped to 2 when the credit ledger was introduced: a browser holding v1 data
   has bookings but no ledger, so it must reseed to get a coherent demo. */
export const SEED_VERSION = "2";

function storage() {
  return globalThis.localStorage;
}

/* ---- Booking store ---- */

/* A record must carry the fields every consumer dereferences; anything else
   (devtools tampering, a future writer bug) is dropped on read. */
function isBookingRecord(b) {
  return Boolean(
    b &&
      typeof b === "object" &&
      typeof b.ref === "string" &&
      b.schedule && typeof b.schedule === "object" &&
      b.participant && typeof b.participant === "object" &&
      b.contact && typeof b.contact === "object" &&
      b.deposit && typeof b.deposit === "object"
  );
}

export function getBookings() {
  try {
    const raw = storage().getItem(BOOKINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isBookingRecord) : [];
  } catch {
    return [];
  }
}

export function saveBookings(list) {
  storage().setItem(BOOKINGS_KEY, JSON.stringify(list));
}

/* Seed on any page load if the marker is absent or outdated (STRATEGY 4.4).
   Bookings and the credit ledger are seeded together: the ledger references
   booking refs, so a half-seeded browser would show redemptions against
   bookings that don't exist. */
export function ensureSeed(now = new Date()) {
  if (storage().getItem(SEED_KEY) === SEED_VERSION) return false;
  saveBookings(materializeSeed(now));
  storage().setItem(CREDITS_KEY, JSON.stringify(materializeCreditSeed(now)));
  storage().removeItem(ACCOUNTS_KEY);
  storage().setItem(SEED_KEY, SEED_VERSION);
  return true;
}

/* Dashboard "Reset demo data": clear every key, reseed on the spot. */
export function resetDemoData(now = new Date()) {
  storage().removeItem(BOOKINGS_KEY);
  storage().removeItem(CREDITS_KEY);
  storage().removeItem(ACCOUNTS_KEY);
  storage().removeItem(SEED_KEY);
  ensureSeed(now);
}

/* ---- Booking reference: RNK- + 5 digits, unique in the store (STRATEGY 4.3) ---- */

export function generateRef(existingRefs) {
  const taken = new Set(existingRefs || getBookings().map((b) => b.ref));
  let ref;
  do {
    ref = "RNK-" + String(10000 + Math.floor(Math.random() * 90000));
  } while (taken.has(ref));
  return ref;
}

/*
 * Append a new booking. `data` carries everything except ref/status/createdAt,
 * which the store owns. Returns the stored record.
 */
export function createBooking(data) {
  const bookings = getBookings();
  const record = {
    ref: generateRef(bookings.map((b) => b.ref)),
    serviceId: data.serviceId,
    serviceName: data.serviceName,
    serviceType: data.serviceType,
    locationId: data.locationId,
    locationName: data.locationName,
    schedule: {
      date: null,
      startTime: null,
      endTime: null,
      iceOption: null,
      program: null,
      season: null,
      campWeek: null,
      ...data.schedule
    },
    participant: {
      name: null,
      ageGroup: null,
      groupName: null,
      skaterCount: null,
      notes: "",
      ...data.participant
    },
    contact: { ...data.contact },
    deposit: {
      amount: data.deposit.amount,
      currency: "CAD",
      cardLast4: data.deposit.cardLast4
    },
    /* How the booking was actually paid for. Absent on pre-credit records,
       which is why `deposit` above stays the required field and this one is
       optional — see paymentLine(). */
    payment: data.payment
      ? {
          method: data.payment.method,
          creditType: data.payment.creditType || null,
          used: data.payment.used == null ? null : Number(data.payment.used),
          ledgerId: data.payment.ledgerId || null,
          purchaseId: data.payment.purchaseId || null
        }
      : { method: "card", creditType: null, used: null, ledgerId: null, purchaseId: null },
    status: "pending",
    createdAt: new Date().toISOString()
  };
  bookings.push(record);
  saveBookings(bookings);
  return record;
}

export function findBooking(ref) {
  return getBookings().find((b) => b.ref === ref) || null;
}

/*
 * Patch a booking's payment block. Used to point a credit-paid booking at the
 * ledger entry that paid for it: the redemption needs the booking ref and the
 * booking needs the entry id, so one of the two links is written second.
 */
export function setBookingPayment(ref, patch) {
  const bookings = getBookings();
  const record = bookings.find((b) => b.ref === ref);
  if (!record) return null;
  record.payment = { ...record.payment, ...patch };
  saveBookings(bookings);
  return record;
}

/*
 * Status transitions (STRATEGY 6.5): pending → confirmed; pending/confirmed →
 * cancelled. Cancelled is terminal. Returns the updated record, or null when
 * the transition is not allowed or the ref is unknown.
 */
export function updateStatus(ref, next) {
  const bookings = getBookings();
  const record = bookings.find((b) => b.ref === ref);
  if (!record) return null;
  const ok =
    (next === "confirmed" && record.status === "pending") ||
    (next === "cancelled" && (record.status === "pending" || record.status === "confirmed"));
  if (!ok) return null;
  record.status = next;
  saveBookings(bookings);
  return record;
}

/* A non-cancelled booking already occupies this exact slot (STRATEGY 3.4a). */
export function isSlotBooked(serviceId, locationId, date, startTime) {
  return getBookings().some(
    (b) =>
      b.status !== "cancelled" &&
      b.serviceId === serviceId &&
      b.locationId === locationId &&
      b.schedule.date === date &&
      b.schedule.startTime === startTime
  );
}

/* ---- Formatters (shared by wizard, confirmation, dashboard, CSV) ---- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* Parse "YYYY-MM-DD" as a local date (avoids UTC off-by-one in Date parsing). */
export function parseISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(iso) {
  const d = parseISODate(iso);
  return MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
}

/* "Aug 9, 2026, 2:32 PM" per COPY 4.5 */
export function formatDateTime(isoTimestamp) {
  const d = new Date(isoTimestamp);
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const min = String(d.getMinutes()).padStart(2, "0");
  return (
    MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear() + ", " + h + ":" + min + " " + ampm
  );
}

export function formatMoney(amount) {
  return "$" + Number(amount).toLocaleString("en-CA");
}

export function formatMoneyCAD(amount) {
  return formatMoney(amount) + " CAD";
}

/* "$150 CAD · card ending 4242" per COPY 4.5 */
export function depositLine(booking) {
  return formatMoneyCAD(booking.deposit.amount) + " · card ending " + booking.deposit.cardLast4;
}

/* Was this booking paid with a session credit rather than a deposit? */
export function isCreditPaid(booking) {
  return Boolean(booking.payment && booking.payment.method === "credit");
}

/*
 * One line describing how a booking was paid, for the dashboard, confirmation
 * page and CSV. Handles both shapes: credit redemptions and card deposits.
 * Records written before the credit layer have no `payment` field at all and
 * fall through to the deposit line unchanged.
 */
export function paymentLine(booking) {
  if (isCreditPaid(booking)) {
    const n = booking.payment.used || 1;
    return n === 1 ? "1 session credit" : n + " session credits";
  }
  return depositLine(booking);
}

/* The money value of a booking for totals and sorting. Credit-paid bookings
   contribute nothing here — the revenue was recognized when the package was
   bought, and counting it twice would inflate every dashboard number. */
export function bookingAmount(booking) {
  return isCreditPaid(booking) ? 0 : booking.deposit.amount || 0;
}

/* One-line schedule per booking type (dashboard table, rail, CSV). */
export function formatScheduleLine(booking) {
  const s = booking.schedule || {};
  if (s.date) {
    let line = formatDate(s.date) + " · " + s.startTime + "–" + s.endTime;
    if (s.iceOption) line += s.iceOption === "full" ? " · Full ice" : " · Half ice";
    return line;
  }
  if (s.program) return s.program + " · " + s.season;
  if (s.campWeek) return s.campWeek;
  return "";
}

export function participantLabel(booking) {
  return booking.participant.groupName || booking.participant.name || "";
}

/* ---- CSV export (STRATEGY 6.6): table columns + contact email/phone ---- */

export const CSV_COLUMNS = [
  "Ref",
  "Created",
  "Service",
  "Location",
  "Schedule",
  "Participant",
  "Paid with",
  "Deposit",
  "Status",
  "Email",
  "Phone"
];

function csvEscape(value) {
  let str = value == null ? "" : String(value);
  /* Formula-injection hygiene: neutralize leading = + - @ for spreadsheets. */
  if (/^[=+\-@]/.test(str)) str = "'" + str;
  if (/[",\n\r]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

export function bookingsToCsv(bookings) {
  const rows = [CSV_COLUMNS.join(",")];
  for (const b of bookings) {
    rows.push(
      [
        b.ref,
        formatDateTime(b.createdAt),
        b.serviceName,
        b.locationName,
        formatScheduleLine(b),
        participantLabel(b),
        paymentLine(b),
        formatMoney(bookingAmount(b)),
        b.status,
        b.contact.email,
        b.contact.phone
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return rows.join("\r\n");
}
