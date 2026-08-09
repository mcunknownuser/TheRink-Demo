/*
 * catalog.js — the services/locations/schedule catalog (STRATEGY.md §3).
 * Single source of truth for domain data; every page reads from it.
 * Data only + pure helpers: no DOM, no storage.
 */

export const LOCATIONS = [
  {
    id: "trc",
    name: "RINK Training Centre",
    city: "Winnipeg, MB",
    full: "RINK Training Centre — Winnipeg, MB",
    short: "Training Centre",
    address: "660 Century St, Winnipeg, MB",
    phone: "(204) 560-4233",
    tel: "+12045604233"
  },
  {
    id: "north",
    name: "RINK North — Gateway Arena",
    city: "Winnipeg, MB",
    full: "RINK North — Gateway Arena — Winnipeg, MB",
    short: "RINK North",
    address: "1717 Gateway Rd, Winnipeg, MB",
    phone: "(204) 334-2210",
    tel: "+12043342210"
  },
  {
    id: "kelowna",
    name: "RINK Kelowna — Rutland Arena",
    city: "Kelowna, BC",
    full: "RINK Kelowna — Rutland Arena — Kelowna, BC",
    short: "Kelowna",
    address: "605 Rutland Rd N, Kelowna, BC",
    phone: "(250) 765-4188",
    tel: "+12507654188"
  }
];

export const STANDARD_SEASONS = [
  "Fall 2026 (Sep 14 – Dec 18)",
  "Winter 2027 (Jan 11 – Mar 26)"
];

export const R1_SEASONS = [
  "Spring Block 2027 (Apr 6 – May 29)",
  "Summer Block 2027 (Jun 1 – Aug 20)"
];

/* Season label → season start date (ISO), for chronological dashboard sorting. */
export const SEASON_STARTS = {
  "Fall 2026 (Sep 14 – Dec 18)": "2026-09-14",
  "Winter 2027 (Jan 11 – Mar 26)": "2027-01-11",
  "Spring Block 2027 (Apr 6 – May 29)": "2027-04-06",
  "Summer Block 2027 (Jun 1 – Aug 20)": "2027-06-01"
};

export const CAMP_WEEKS = [
  { label: "Aug 10–14, 2026", monday: "2026-08-10", locations: ["trc", "kelowna"] },
  { label: "Aug 17–21, 2026", monday: "2026-08-17", locations: ["trc", "north", "kelowna"] },
  { label: "Aug 24–28, 2026", monday: "2026-08-24", locations: ["trc", "north", "kelowna"] },
  { label: "March Break — Mar 29 – Apr 2, 2027", monday: "2027-03-29", locations: ["trc", "kelowna"] }
];

export const HOURLY_AGE_GROUPS = ["U7", "U9", "U11", "U13", "U15", "U18", "Junior", "Adult"];
export const CAMP_AGE_GROUPS = ["U7", "U9", "U11", "U13", "U15"];

export const SERVICES = [
  {
    id: "player-1on1",
    name: "Player 1-on-1 Session",
    type: "hourly",
    group: "sessions",
    deposit: 50,
    locations: ["trc", "north", "kelowna"],
    desc: "One skater, one coach, one hour of ice. Every session is planned around the skater's position and stage of development.",
    locationsLine: "Training Centre · RINK North · Kelowna",
    depositLine: "$50 deposit per session"
  },
  {
    id: "goalie-1on1",
    name: "Goalie 1-on-1 Session",
    type: "hourly",
    group: "sessions",
    deposit: 50,
    locations: ["trc", "kelowna"],
    desc: "Individual crease work with a RINK goaltending coach. Movement, tracking, and save selection, built for the goaltender in front of them.",
    locationsLine: "Training Centre · Kelowna",
    depositLine: "$50 deposit per session"
  },
  {
    id: "ice-rental",
    name: "Ice Rental",
    type: "hourly",
    group: "sessions",
    deposit: { full: 150, half: 75 },
    locations: ["trc", "north", "kelowna"],
    desc: "Full or half ice by the hour for teams and groups. Run your own practice, skate, or scrimmage.",
    locationsLine: "Training Centre · RINK North · Kelowna",
    depositLine: "$150 deposit full ice · $75 half ice"
  },
  {
    id: "dev-program",
    name: "Development Programs",
    type: "seasonal",
    group: "programs",
    deposit: 150,
    locations: ["trc", "north", "kelowna"],
    desc: "Seasonal on-ice development from U7 to U15. Each age division follows the RINK development model, from introductory skills to high-performance work.",
    locationsLine: "Training Centre · RINK North · Kelowna",
    depositLine: "$150 deposit to register",
    programs: ["U7 Introductory", "U9 Development", "U11 Advanced", "U13 High-Performance", "U15 Elite"],
    seasons: STANDARD_SEASONS
  },
  {
    id: "goalie-dev-program",
    name: "Goalie Development Programs",
    type: "seasonal",
    group: "programs",
    deposit: 150,
    locations: ["trc"],
    desc: "Season-long goaltending development for U9 to U15. Small groups, position-specific instruction, weekly ice.",
    locationsLine: "Training Centre",
    depositLine: "$150 deposit to register",
    programs: ["U9", "U11", "U13", "U15"],
    seasons: STANDARD_SEASONS
  },
  {
    id: "r1-offseason",
    name: "R1 Off-Season Program",
    type: "seasonal",
    group: "programs",
    deposit: 200,
    locations: ["trc", "kelowna"],
    desc: "A structured off-season training block for U13 to U18 skaters. Spring and summer ice that sets up the fall season.",
    locationsLine: "Training Centre · Kelowna",
    depositLine: "$200 deposit to register",
    programs: ["U13", "U15", "U18"],
    seasons: R1_SEASONS
  },
  {
    id: "learn-to-skate",
    name: "Learn to Skate",
    type: "seasonal",
    group: "programs",
    deposit: 75,
    locations: ["trc", "north"],
    desc: "First strides to confident skating. Pre-CanSkate for ages 3–5, CanSkate Stages 1–6 for ages 5–12, and an Adult/Teen stream for 13 and up.",
    locationsLine: "Training Centre · RINK North",
    depositLine: "$75 deposit to register",
    programs: ["Pre-CanSkate (ages 3–5)", "CanSkate Stages 1–6 (ages 5–12)", "Adult/Teen (13+)"],
    seasons: STANDARD_SEASONS
  },
  {
    id: "figure-skating",
    name: "Figure Skating",
    type: "seasonal",
    group: "programs",
    deposit: 75,
    locations: ["north"],
    desc: "Intro, CanSkate, and Junior Development & Performance streams at RINK North. Edge work, jumps, and program instruction with dedicated coaches.",
    locationsLine: "RINK North",
    depositLine: "$75 deposit to register",
    programs: ["Intro", "CanSkate", "Junior Development & Performance"],
    seasons: STANDARD_SEASONS
  },
  {
    id: "hockey-camp",
    name: "Hockey Camps",
    type: "camp",
    group: "camps",
    deposit: 125,
    locations: ["trc", "north", "kelowna"],
    desc: "Week-long summer and March Break camps, Monday to Friday. Full training days, grouped by age division.",
    locationsLine: "Training Centre · RINK North · Kelowna",
    depositLine: "$125 deposit per week"
  },
  {
    id: "player-clinic",
    name: "Player Clinics",
    type: "info",
    group: "clinics",
    deposit: null,
    locations: ["trc", "kelowna"],
    desc: "Short-format group clinics on specific skills: shooting, skating, small-area play. Scheduled in blocks through the year.",
    locationsLine: "Training Centre · Kelowna",
    depositLine: null
  },
  {
    id: "goalie-clinic",
    name: "Goalie Clinics",
    type: "info",
    group: "clinics",
    deposit: null,
    locations: ["trc", "kelowna"],
    desc: "Group clinics for skaters who play the position, run by RINK goaltending staff. Scheduled in blocks through the year.",
    locationsLine: "Training Centre · Kelowna",
    depositLine: null
  }
];

/* ---- Hourly slot rules (STRATEGY 3.4) ---- */

export const BOOKING_WINDOW_DAYS = 45;

/* 60-minute slots starting on the hour, 07:00–20:00 start times. */
export const SLOT_TIMES = (() => {
  const out = [];
  for (let h = 7; h <= 20; h += 1) out.push(String(h).padStart(2, "0") + ":00");
  return out;
})();

export function slotEndTime(startTime) {
  const h = parseInt(startTime.slice(0, 2), 10) + 1;
  return String(h).padStart(2, "0") + ":00";
}

/*
 * Deterministic pseudo-availability (STRATEGY 3.4): hash location + date +
 * startTime and "hold" roughly 25% of slots. FNV-1a keeps it stable across
 * page loads — the same slot is always held.
 */
export function isSlotHeld(locationId, date, startTime) {
  const key = locationId + "|" + date + "|" + startTime;
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 4 === 0;
}

/* ---- Lookups ---- */

export function getService(id) {
  return SERVICES.find((s) => s.id === id) || null;
}

export function getLocation(id) {
  return LOCATIONS.find((l) => l.id === id) || null;
}

export function bookableServices() {
  return SERVICES.filter((s) => s.type !== "info");
}

export function servicesInGroup(group) {
  return SERVICES.filter((s) => s.group === group);
}

export function depositFor(serviceId, iceOption) {
  const s = getService(serviceId);
  if (!s || s.deposit == null) return null;
  if (typeof s.deposit === "object") {
    return iceOption ? s.deposit[iceOption] || null : null;
  }
  return s.deposit;
}

/*
 * Age group derived from the program tier (STRATEGY 4.2): "U11 Advanced" → "U11";
 * learn-to-skate / figure-skating tiers keep the full label.
 */
export function ageGroupFromProgram(program) {
  if (!program) return null;
  const m = program.match(/^U\d+/);
  return m ? m[0] : program;
}

/* Camp weeks offered at a location, in catalog order. */
export function campWeeksAt(locationId) {
  return CAMP_WEEKS.filter((w) => w.locations.includes(locationId));
}

/* Chronological sort value for a booking's schedule (dashboard Schedule sort). */
export function scheduleSortValue(booking) {
  const s = booking.schedule || {};
  if (s.date) return s.date + "T" + (s.startTime || "00:00");
  if (s.season && SEASON_STARTS[s.season]) return SEASON_STARTS[s.season] + "T00:00";
  if (s.campWeek) {
    const week = CAMP_WEEKS.find((w) => w.label === s.campWeek);
    if (week) return week.monday + "T00:00";
  }
  return "9999-12-31T23:59";
}
