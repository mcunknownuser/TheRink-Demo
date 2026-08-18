/*
 * seed.js — 17 seed bookings across both brands (STRATEGY.md §4.4), defined as
 * templates with
 * relative day offsets and materialized to absolute dates at seed time, so the
 * demo looks current whenever it is first run.
 *
 * Distribution: 9 confirmed, 6 pending, 2 cancelled — 12 RINK, 5 Testify.
 * Every location and every booking shape is represented, including three
 * memberships. One contact (s.hartley@mymts.net) deliberately holds bookings
 * on both brands, which is the cross-brand account the pitch turns on.
 */

import { slotEndTime } from "./catalog.js";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toISODate(d) {
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

/* now minus {d days, h hours, m minutes} → ISO timestamp */
function createdAgo(now, d, h, m) {
  const ms = ((d * 24 + h) * 60 + m) * 60000;
  return new Date(now.getTime() - ms).toISOString();
}

/* today + offset days → ISO date (local calendar, no UTC drift) */
function dateFromToday(now, offsetDays) {
  return toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays));
}

const EMPTY_SCHEDULE = {
  date: null,
  startTime: null,
  endTime: null,
  iceOption: null,
  program: null,
  season: null,
  campWeek: null,
  tier: null,
  stream: null,
  startDate: null,
  termMonths: null,
  monthlyRate: null
};

const EMPTY_PARTICIPANT = {
  name: null,
  ageGroup: null,
  groupName: null,
  skaterCount: null,
  notes: ""
};

const TEMPLATES = [
  {
    ref: "RNK-73418",
    serviceId: "player-1on1",
    serviceName: "Player 1-on-1 Session",
    serviceType: "hourly",
    brand: "rink",
    locationId: "trc",
    locationName: "RINK Training Centre — Oak Bluff, MB",
    eventOffsetDays: -2,
    startTime: "18:00",
    participant: { name: "Nolan Hartley", ageGroup: "U13", notes: "Working on edge work and quick release." },
    contact: { name: "Sarah Hartley", email: "s.hartley@mymts.net", phone: "(204) 452-8067" },
    amount: 0,
    cardLast4: null,
    payment: { method: "credit", creditType: "player-1on1", used: 1, ledgerId: "SEED-CR-002" },
    status: "confirmed",
    created: [13, 4, 36]
  },
  {
    ref: "RNK-28054",
    serviceId: "player-1on1",
    serviceName: "Player 1-on-1 Session",
    serviceType: "hourly",
    brand: "rink",
    locationId: "trc",
    locationName: "RINK Training Centre — Oak Bluff, MB",
    eventOffsetDays: 3,
    startTime: "07:00",
    participant: { name: "Emma Desjardins", ageGroup: "U11", notes: "First 1-on-1 session. Skating mechanics." },
    contact: { name: "Renee Desjardins", email: "renee.desjardins@gmail.com", phone: "(204) 967-3312" },
    amount: 0,
    cardLast4: null,
    payment: { method: "credit", creditType: "player-1on1", used: 1, ledgerId: "SEED-CR-102" },
    status: "pending",
    created: [1, 6, 12]
  },
  {
    ref: "RNK-91230",
    serviceId: "goalie-1on1",
    serviceName: "Goalie 1-on-1 Session",
    serviceType: "hourly",
    brand: "rink",
    locationId: "kelowna",
    locationName: "RINK Kelowna — Kelowna, BC",
    eventOffsetDays: 5,
    startTime: "16:00",
    participant: { name: "Lucas Braun", ageGroup: "U15", notes: "Post integration and rebound control." },
    contact: { name: "Dan Braun", email: "dbraun@telus.net", phone: "(250) 862-4179" },
    amount: 0,
    cardLast4: null,
    payment: { method: "credit", creditType: "goalie-1on1", used: 1, ledgerId: "SEED-CR-202" },
    status: "confirmed",
    created: [6, 2, 48]
  },
  {
    ref: "RNK-46711",
    serviceId: "ice-rental",
    serviceName: "Ice Rental",
    serviceType: "hourly",
    brand: "rink",
    locationId: "trc",
    locationName: "RINK Training Centre — Oak Bluff, MB",
    eventOffsetDays: 7,
    startTime: "20:00",
    iceOption: "standard",
    participant: { groupName: "Winnipeg Selects U13", skaterCount: 17 },
    contact: { name: "Mike Reimer", email: "mike.reimer@outlook.com", phone: "(204) 331-7845" },
    amount: 150,
    cardLast4: "2280",
    status: "confirmed",
    created: [9, 7, 20]
  },
  {
    ref: "RNK-58329",
    serviceId: "ice-rental",
    serviceName: "Ice Rental",
    serviceType: "hourly",
    brand: "rink",
    locationId: "kelowna",
    locationName: "RINK Kelowna — Kelowna, BC",
    eventOffsetDays: 10,
    startTime: "08:00",
    iceOption: "goalie",
    participant: { groupName: "Okanagan Old-Timers", skaterCount: 12 },
    contact: { name: "Joanne Kereluk", email: "jkereluk@shaw.ca", phone: "(250) 717-2934" },
    amount: 75,
    cardLast4: "5544",
    status: "pending",
    created: [0, 3, 10]
  },
  {
    ref: "RNK-30476",
    serviceId: "dev-program",
    serviceName: "Development Programs",
    serviceType: "seasonal",
    brand: "rink",
    locationId: "trc",
    locationName: "RINK Training Centre — Oak Bluff, MB",
    program: "U9 Development",
    season: "Fall 2026 (Sep 14 – Dec 18)",
    participant: { name: "Jack Sawatzky", ageGroup: "U9", notes: "" },
    contact: { name: "Kevin Sawatzky", email: "ksawatzky@mymts.net", phone: "(204) 296-1583" },
    amount: 150,
    cardLast4: "1189",
    status: "confirmed",
    created: [12, 9, 5]
  },
  {
    ref: "RNK-62185",
    serviceId: "dev-program",
    serviceName: "Development Programs",
    serviceType: "seasonal",
    brand: "rink",
    locationId: "trc",
    locationName: "RINK Training Centre — Oak Bluff, MB",
    program: "U11 Advanced",
    season: "Fall 2026 (Sep 14 – Dec 18)",
    participant: { name: "Liam Fontaine", ageGroup: "U11", notes: "Played U11 A2 last season." },
    contact: { name: "Danielle Fontaine", email: "danielle.fontaine@hotmail.com", phone: "(431) 774-2209" },
    amount: 150,
    cardLast4: "7302",
    status: "confirmed",
    created: [4, 5, 44]
  },
  {
    ref: "RNK-17840",
    serviceId: "dev-program",
    serviceName: "Development Programs",
    serviceType: "seasonal",
    brand: "rink",
    locationId: "kelowna",
    locationName: "RINK Kelowna — Kelowna, BC",
    program: "U13 High-Performance",
    season: "Winter 2027 (Jan 11 – Mar 26)",
    participant: { name: "Carter Mackenzie", ageGroup: "U13", notes: "" },
    contact: { name: "Rob Mackenzie", email: "rob.mackenzie@gmail.com", phone: "(250) 469-8851" },
    amount: 150,
    cardLast4: "6645",
    status: "pending",
    created: [2, 1, 30]
  },
  {
    ref: "RNK-84962",
    serviceId: "goalie-dev-program",
    serviceName: "Goalie Development Programs",
    serviceType: "seasonal",
    brand: "rink",
    locationId: "trc",
    locationName: "RINK Training Centre — Oak Bluff, MB",
    program: "U13",
    season: "Fall 2026 (Sep 14 – Dec 18)",
    participant: { name: "Owen Klassen", ageGroup: "U13", notes: "Second year in the program." },
    contact: { name: "Paul Klassen", email: "pklassen@icloud.com", phone: "(204) 897-6402" },
    amount: 150,
    cardLast4: "0918",
    status: "confirmed",
    created: [8, 3, 15]
  },
  {
    ref: "RNK-25603",
    serviceId: "learn-to-skate",
    serviceName: "Learn to Skate",
    serviceType: "seasonal",
    brand: "rink",
    locationId: "trc",
    locationName: "RINK Training Centre — Oak Bluff, MB",
    program: "CanSkate Stages 1–6 (ages 5–12)",
    season: "Fall 2026 (Sep 14 – Dec 18)",
    participant: { name: "Maya Singh", ageGroup: "CanSkate Stages 1–6 (ages 5–12)", notes: "Has skated twice before." },
    contact: { name: "Priya Singh", email: "priya.singh@outlook.com", phone: "(431) 338-9174" },
    amount: 75,
    cardLast4: "3376",
    status: "pending",
    created: [3, 8, 25]
  },
  {
    ref: "RNK-49317",
    serviceId: "figure-skating",
    serviceName: "Figure Skating",
    serviceType: "seasonal",
    brand: "rink",
    locationId: "trc",
    locationName: "RINK Training Centre — Oak Bluff, MB",
    program: "Junior Development & Performance",
    season: "Winter 2027 (Jan 11 – Mar 26)",
    participant: { name: "Sophie Tremblay", ageGroup: "Junior Development & Performance", notes: "" },
    contact: { name: "Claire Tremblay", email: "ctremblay@shaw.ca", phone: "(204) 415-7726" },
    amount: 75,
    cardLast4: "8821",
    status: "cancelled",
    created: [10, 6, 55]
  },
  {
    ref: "RNK-70158",
    serviceId: "hockey-camp",
    serviceName: "Hockey Camps",
    serviceType: "camp",
    brand: "rink",
    locationId: "kelowna",
    locationName: "RINK Kelowna — Kelowna, BC",
    campWeek: "Aug 17–21, 2026",
    participant: { name: "Ethan Caldwell", ageGroup: "U11", notes: "Allergic to peanuts." },
    contact: { name: "Andrea Caldwell", email: "andrea.caldwell@gmail.com", phone: "(250) 878-3361" },
    amount: 125,
    cardLast4: "5057",
    status: "cancelled",
    created: [11, 2, 40]
  },
  /* ---- Testify Performance (the off-ice half of the partnership) ---- */
  {
    ref: "RNK-51204",
    serviceId: "testify-membership",
    serviceName: "Testify Membership",
    serviceType: "membership",
    brand: "testify",
    locationId: "trc",
    locationName: "RINK Training Centre — Oak Bluff, MB",
    tier: "gold",
    stream: "athlete",
    startOffsetDays: -21,
    termMonths: 3,
    monthlyRate: 460,
    participant: { name: "Nolan Hartley", ageGroup: "U13", notes: "Off-ice to pair with his on-ice sessions." },
    contact: { name: "Sarah Hartley", email: "s.hartley@mymts.net", phone: "(204) 452-8067" },
    amount: 99.99,
    cardLast4: "4412",
    status: "confirmed",
    created: [21, 5, 12]
  },
  {
    ref: "RNK-63870",
    serviceId: "testify-membership",
    serviceName: "Testify Membership",
    serviceType: "membership",
    brand: "testify",
    locationId: "kelowna",
    locationName: "RINK Kelowna — Kelowna, BC",
    tier: "bronze",
    stream: "lifestyle",
    startOffsetDays: -6,
    termMonths: 3,
    monthlyRate: 170,
    participant: { name: "Joanne Kereluk", ageGroup: "Adult", notes: "" },
    contact: { name: "Joanne Kereluk", email: "jkereluk@shaw.ca", phone: "(250) 717-2934" },
    amount: 99.99,
    cardLast4: "5544",
    status: "confirmed",
    created: [6, 4, 5]
  },
  {
    ref: "RNK-39642",
    serviceId: "testify-membership",
    serviceName: "Testify Membership",
    serviceType: "membership",
    brand: "testify",
    locationId: "trc",
    locationName: "RINK Training Centre — Oak Bluff, MB",
    tier: "silver",
    stream: "athlete",
    startOffsetDays: 4,
    termMonths: 3,
    monthlyRate: 345,
    participant: { name: "Liam Fontaine", ageGroup: "U11", notes: "Starting after the current block." },
    contact: { name: "Danielle Fontaine", email: "danielle.fontaine@hotmail.com", phone: "(431) 774-2209" },
    amount: 99.99,
    cardLast4: "7302",
    status: "pending",
    created: [1, 2, 35]
  },
  {
    ref: "RNK-80517",
    serviceId: "testify-assessment",
    serviceName: "Performance Assessment",
    serviceType: "hourly",
    brand: "testify",
    locationId: "trc",
    locationName: "RINK Training Centre — Oak Bluff, MB",
    eventOffsetDays: 2,
    startTime: "11:00",
    participant: { name: "Owen Klassen", ageGroup: "U13", notes: "Pre-season screen." },
    contact: { name: "Paul Klassen", email: "pklassen@icloud.com", phone: "(204) 897-6402" },
    amount: 99.99,
    cardLast4: "0918",
    status: "pending",
    created: [0, 5, 40]
  },
  {
    ref: "RNK-24196",
    serviceId: "r1-training",
    serviceName: "R1 Off-Season Training",
    serviceType: "seasonal",
    brand: "testify",
    locationId: "kelowna",
    locationName: "RINK Kelowna — Kelowna, BC",
    program: "R1 Hockey — Kelowna",
    season: "Spring Block 2027 (Apr 6 – May 29)",
    participant: { name: "Lucas Braun", ageGroup: "U15", notes: "Pairs with his goalie sessions." },
    contact: { name: "Dan Braun", email: "dbraun@telus.net", phone: "(250) 862-4179" },
    amount: 150,
    cardLast4: "9936",
    status: "confirmed",
    created: [5, 3, 22]
  }
];

export function materializeSeed(now = new Date()) {
  return TEMPLATES.map((t) => {
    const schedule = { ...EMPTY_SCHEDULE };
    if (t.serviceType === "hourly") {
      schedule.date = dateFromToday(now, t.eventOffsetDays);
      schedule.startTime = t.startTime;
      schedule.endTime = slotEndTime(t.startTime);
      schedule.iceOption = t.iceOption || null;
    } else if (t.serviceType === "seasonal") {
      schedule.program = t.program;
      schedule.season = t.season;
    } else if (t.serviceType === "camp") {
      schedule.campWeek = t.campWeek;
    } else if (t.serviceType === "membership") {
      schedule.tier = t.tier;
      schedule.stream = t.stream;
      schedule.startDate = dateFromToday(now, t.startOffsetDays);
      schedule.termMonths = t.termMonths;
      schedule.monthlyRate = t.monthlyRate;
    }
    return {
      ref: t.ref,
      serviceId: t.serviceId,
      serviceName: t.serviceName,
      serviceType: t.serviceType,
      brand: t.brand || "rink",
      locationId: t.locationId,
      locationName: t.locationName,
      schedule,
      participant: { ...EMPTY_PARTICIPANT, ...t.participant },
      contact: { ...t.contact },
      deposit: { amount: t.amount, currency: "CAD", cardLast4: t.cardLast4 },
      payment: t.payment
        ? { ...t.payment }
        : { method: "card", creditType: null, used: null, ledgerId: null },
      status: t.status,
      createdAt: createdAgo(now, t.created[0], t.created[1], t.created[2])
    };
  });
}

/*
 * Credit-ledger seed (STRATEGY §8.4). Three accounts, chosen to show the three
 * states a front desk actually fields:
 *
 *   Sarah Hartley  — 10-pack part-used, including a session forfeited inside
 *                    the 24-hour window. The "why is my balance 6?" case.
 *   Renee Desjardins — bought a single session and spent it. Balance zero, so
 *                    the account page shows the buy-again path.
 *   Dan Braun      — a second, non-fungible credit type (goalie), part-used.
 *
 * Entries carry explicit ids so the seeded bookings can point at the exact
 * redemption that paid for them.
 */
const CREDIT_TEMPLATES = [
  {
    id: "SEED-CR-001",
    email: "s.hartley@mymts.net",
    creditType: "player-1on1",
    qty: 10,
    kind: "purchase",
    packageId: "ten",
    unitPrice: 169,
    amount: 1690,
    note: "10-session package",
    created: [13, 4, 40]
  },
  {
    id: "SEED-CR-002",
    email: "s.hartley@mymts.net",
    creditType: "player-1on1",
    qty: -1,
    kind: "redemption",
    bookingRef: "RNK-73418",
    created: [13, 4, 36]
  },
  {
    id: "SEED-CR-003",
    email: "s.hartley@mymts.net",
    creditType: "player-1on1",
    qty: -1,
    kind: "redemption",
    note: "Session at RINK Training Centre",
    created: [9, 5, 15]
  },
  {
    id: "SEED-CR-004",
    email: "s.hartley@mymts.net",
    creditType: "player-1on1",
    qty: -1,
    kind: "redemption",
    note: "Session at RINK Training Centre",
    created: [6, 3, 5]
  },
  {
    id: "SEED-CR-005",
    email: "s.hartley@mymts.net",
    creditType: "player-1on1",
    qty: -1,
    kind: "redemption",
    note: "Session at RINK Training Centre",
    created: [5, 1, 20]
  },
  /* A forfeit moves no credits: the redemption above already spent it. The
     entry exists so the balance has a visible explanation. */
  {
    id: "SEED-CR-006",
    email: "s.hartley@mymts.net",
    creditType: "player-1on1",
    qty: 0,
    kind: "forfeit",
    note: "Cancelled inside the 24-hour window — session used",
    created: [4, 2, 50]
  },
  {
    id: "SEED-CR-101",
    email: "renee.desjardins@gmail.com",
    creditType: "player-1on1",
    qty: 1,
    kind: "purchase",
    packageId: "single",
    unitPrice: 199,
    amount: 199,
    note: "Single session",
    created: [1, 6, 20]
  },
  {
    id: "SEED-CR-102",
    email: "renee.desjardins@gmail.com",
    creditType: "player-1on1",
    qty: -1,
    kind: "redemption",
    bookingRef: "RNK-28054",
    created: [1, 6, 12]
  },
  {
    id: "SEED-CR-201",
    email: "dbraun@telus.net",
    creditType: "goalie-1on1",
    qty: 5,
    kind: "purchase",
    packageId: "five",
    unitPrice: 179,
    amount: 895,
    note: "5-session package",
    created: [6, 2, 55]
  },
  {
    id: "SEED-CR-202",
    email: "dbraun@telus.net",
    creditType: "goalie-1on1",
    qty: -1,
    kind: "redemption",
    bookingRef: "RNK-91230",
    created: [6, 2, 48]
  }
];

export function materializeCreditSeed(now = new Date()) {
  return CREDIT_TEMPLATES.map((t) => ({
    id: t.id,
    email: t.email,
    creditType: t.creditType,
    qty: t.qty,
    kind: t.kind,
    at: createdAgo(now, t.created[0], t.created[1], t.created[2]),
    unitPrice: t.unitPrice == null ? null : t.unitPrice,
    amount: t.amount == null ? null : t.amount,
    packageId: t.packageId || null,
    bookingRef: t.bookingRef || null,
    note: t.note || ""
  }));
}
