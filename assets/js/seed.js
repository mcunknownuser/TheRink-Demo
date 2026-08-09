/*
 * seed.js — 12 seed bookings (STRATEGY.md §4.4), defined as templates with
 * relative day offsets and materialized to absolute dates at seed time, so the
 * demo looks current whenever it is first run.
 *
 * Distribution: 6 confirmed, 4 pending, 2 cancelled. Every location and all
 * three booking shapes are represented; createdAt spreads from 13 days ago to
 * a few hours ago with 6 records inside the trailing 7 days.
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
  campWeek: null
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
    locationId: "trc",
    locationName: "RINK Training Centre — Winnipeg, MB",
    eventOffsetDays: -2,
    startTime: "18:00",
    participant: { name: "Nolan Hartley", ageGroup: "U13", notes: "Working on edge work and quick release." },
    contact: { name: "Sarah Hartley", email: "s.hartley@mymts.net", phone: "(204) 452-8067" },
    amount: 50,
    cardLast4: "4412",
    status: "confirmed",
    created: [13, 4, 36]
  },
  {
    ref: "RNK-28054",
    serviceId: "player-1on1",
    serviceName: "Player 1-on-1 Session",
    serviceType: "hourly",
    locationId: "north",
    locationName: "RINK North — Gateway Arena — Winnipeg, MB",
    eventOffsetDays: 3,
    startTime: "07:00",
    participant: { name: "Emma Desjardins", ageGroup: "U11", notes: "First 1-on-1 session. Skating mechanics." },
    contact: { name: "Renee Desjardins", email: "renee.desjardins@gmail.com", phone: "(204) 967-3312" },
    amount: 50,
    cardLast4: "0071",
    status: "pending",
    created: [1, 6, 12]
  },
  {
    ref: "RNK-91230",
    serviceId: "goalie-1on1",
    serviceName: "Goalie 1-on-1 Session",
    serviceType: "hourly",
    locationId: "kelowna",
    locationName: "RINK Kelowna — Rutland Arena — Kelowna, BC",
    eventOffsetDays: 5,
    startTime: "16:00",
    participant: { name: "Lucas Braun", ageGroup: "U15", notes: "Post integration and rebound control." },
    contact: { name: "Dan Braun", email: "dbraun@telus.net", phone: "(250) 862-4179" },
    amount: 50,
    cardLast4: "9936",
    status: "confirmed",
    created: [6, 2, 48]
  },
  {
    ref: "RNK-46711",
    serviceId: "ice-rental",
    serviceName: "Ice Rental",
    serviceType: "hourly",
    locationId: "trc",
    locationName: "RINK Training Centre — Winnipeg, MB",
    eventOffsetDays: 7,
    startTime: "20:00",
    iceOption: "full",
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
    locationId: "kelowna",
    locationName: "RINK Kelowna — Rutland Arena — Kelowna, BC",
    eventOffsetDays: 10,
    startTime: "08:00",
    iceOption: "half",
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
    locationId: "trc",
    locationName: "RINK Training Centre — Winnipeg, MB",
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
    locationId: "north",
    locationName: "RINK North — Gateway Arena — Winnipeg, MB",
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
    locationId: "kelowna",
    locationName: "RINK Kelowna — Rutland Arena — Kelowna, BC",
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
    locationId: "trc",
    locationName: "RINK Training Centre — Winnipeg, MB",
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
    locationId: "north",
    locationName: "RINK North — Gateway Arena — Winnipeg, MB",
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
    locationId: "north",
    locationName: "RINK North — Gateway Arena — Winnipeg, MB",
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
    locationId: "kelowna",
    locationName: "RINK Kelowna — Rutland Arena — Kelowna, BC",
    campWeek: "Aug 17–21, 2026",
    participant: { name: "Ethan Caldwell", ageGroup: "U11", notes: "Allergic to peanuts." },
    contact: { name: "Andrea Caldwell", email: "andrea.caldwell@gmail.com", phone: "(250) 878-3361" },
    amount: 125,
    cardLast4: "5057",
    status: "cancelled",
    created: [11, 2, 40]
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
    }
    return {
      ref: t.ref,
      serviceId: t.serviceId,
      serviceName: t.serviceName,
      serviceType: t.serviceType,
      locationId: t.locationId,
      locationName: t.locationName,
      schedule,
      participant: { ...EMPTY_PARTICIPANT, ...t.participant },
      contact: { ...t.contact },
      deposit: { amount: t.amount, currency: "CAD", cardLast4: t.cardLast4 },
      status: t.status,
      createdAt: createdAgo(now, t.created[0], t.created[1], t.created[2])
    };
  });
}
