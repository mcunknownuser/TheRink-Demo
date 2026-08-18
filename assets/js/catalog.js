/*
 * catalog.js — the services/locations/schedule catalog (STRATEGY.md §3).
 * Single source of truth for domain data; every page reads from it.
 * Data only + pure helpers: no DOM, no storage.
 */

/*
 * The two facilities RINK actually operates (therink.ca/contact-us). Arenas
 * like Gateway Recreation Centre and Rutland Arena are rented for camps — they
 * are venues, not RINK locations, and are deliberately not listed here.
 */
export const LOCATIONS = [
  {
    id: "trc",
    name: "RINK Training Centre",
    city: "Oak Bluff, MB",
    full: "RINK Training Centre — Oak Bluff, MB",
    short: "Training Centre",
    street: "57 South Landing Drive",
    /* Oak Bluff is a village outside the city, so a Winnipeg customer may not
       recognise it. therink.ca titles this facility "Winnipeg South"; carrying
       that through keeps the address accurate and the place recognisable. */
    area: "Winnipeg South",
    address: "57 South Landing Drive, Oak Bluff, MB R4G 0C4",
    phone: "(204) 489-7465",
    tel: "+12044897465"
  },
  {
    id: "kelowna",
    name: "RINK Kelowna",
    city: "Kelowna, BC",
    full: "RINK Kelowna — Kelowna, BC",
    short: "Kelowna",
    street: "103-716 Adams Ct",
    area: null,
    address: "103-716 Adams Ct, Kelowna, BC V1X 7S2",
    phone: "(250) 491-4160",
    tel: "+12504914160"
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
  { label: "Aug 17–21, 2026", monday: "2026-08-17", locations: ["trc", "kelowna"] },
  { label: "Aug 24–28, 2026", monday: "2026-08-24", locations: ["trc", "kelowna"] },
  { label: "March Break — Mar 29 – Apr 2, 2027", monday: "2027-03-29", locations: ["trc", "kelowna"] }
];

/* ---- Ice sheets (therink.ca/ice-rentals) ----
 *
 * RINK rents three distinct surfaces, not "full or half ice". Naming them is
 * the point: a general-purpose marketplace can only sell a slab of ice by the
 * hour, whereas the goalie sheet is a specific room for a specific job.
 *
 * Dimensions are theirs. The deposit figures are NOT published anywhere and
 * are demo placeholders — confirm before showing them as real pricing.
 */
export const ICE_SHEETS = [
  {
    id: "standard",
    label: "Standard Sheet",
    dims: "200 × 85 ft",
    desc: "NHL regulation. Games, tournaments and full-team practice.",
    deposit: 150
  },
  {
    id: "training",
    label: "Training Sheet",
    dims: "120 × 60 ft",
    desc: "Two-thirds size. Skill development and small groups.",
    deposit: 100
  },
  {
    id: "goalie",
    label: "Goalie Sheet",
    dims: "60 × 35 ft",
    desc: "Crease-sized. Goaltending work and one-on-one skills.",
    deposit: 75
  }
];

export function getSheet(id) {
  return ICE_SHEETS.find((x) => x.id === id) || null;
}

/* Label for a stored sheet id. Falls back to the raw value so a record written
   before the sheets existed still renders something truthful. */
export function sheetLabel(id) {
  const sheet = getSheet(id);
  return sheet ? sheet.label : id || "";
}

/* ---- Brands (STRATEGY 3.7) ----
 *
 * RINK and Testify Performance are partners operating out of the same two
 * facilities: RINK runs the ice, Testify runs off-ice training and therapy.
 * therink.ca and testifyperformance.ca link to each other, and their sites are
 * built from one design system with a colour swap — same Geom typeface, same
 * neutrals, red vs gold. That is exactly how this platform treats them: one
 * catalog, one account, one dashboard, with the accent following the brand.
 */

export const BRANDS = {
  rink: {
    id: "rink",
    name: "RINK",
    tagline: "The Home of Hockey Development",
    site: "https://therink.ca/home/"
  },
  testify: {
    id: "testify",
    name: "Testify Performance",
    tagline: "Off-Ice Training, Therapy & Performance",
    site: "https://testifyperformance.ca/"
  }
};

export function getBrand(id) {
  return BRANDS[id] || BRANDS.rink;
}

/* ---- Testify membership tiers (testifyperformance.ca/memberships) ----
 *
 * A membership is neither a deposit nor a credit: it is a recurring monthly
 * commitment with a minimum term, entered through a paid assessment. The
 * assessment fee is what is charged at checkout; the monthly rate starts after
 * it. Two streams at every tier — Athlete and Lifestyle.
 */

export const MEMBERSHIP_ASSESSMENT_FEE = 99.99;
export const MEMBERSHIP_MIN_TERM_MONTHS = 3;

export const MEMBERSHIP_STREAMS = [
  { id: "athlete", label: "Athlete", desc: "Sport-specific training built around a competitive season." },
  { id: "lifestyle", label: "Lifestyle", desc: "General strength and conditioning, no sport calendar." }
];

export const MEMBERSHIP_TIERS = [
  { id: "bronze", label: "Bronze", sessions: 2, athlete: 230, lifestyle: 170, perks: [] },
  { id: "silver", label: "Silver", sessions: 3, athlete: 345, lifestyle: 255, perks: [] },
  { id: "gold", label: "Gold", sessions: 4, athlete: 460, lifestyle: 340, perks: ["Unlimited program revisions"] },
  { id: "platinum", label: "Platinum", sessions: 5, athlete: 550, lifestyle: 420, perks: ["Unlimited program revisions"] }
];

/* Included with every tier, per their memberships page. */
export const MEMBERSHIP_INCLUDED = [
  "Initial assessment",
  "Customized program",
  "Performance testing",
  "Indoor track access",
  "Recovery room access",
  "Rapid clinic access",
  "Towel service"
];

export function getTier(id) {
  return MEMBERSHIP_TIERS.find((t) => t.id === id) || null;
}

export function monthlyRate(tierId, streamId) {
  const tier = getTier(tierId);
  if (!tier) return null;
  return streamId === "lifestyle" ? tier.lifestyle : tier.athlete;
}

export function streamLabel(streamId) {
  const s = MEMBERSHIP_STREAMS.find((x) => x.id === streamId);
  return s ? s.label : "";
}

export const HOURLY_AGE_GROUPS = ["U7", "U9", "U11", "U13", "U15", "U18", "Junior", "Adult"];
export const CAMP_AGE_GROUPS = ["U7", "U9", "U11", "U13", "U15"];

/* ---- Pricing models (STRATEGY 3.6) ----
 *
 * RINK sells two different ways, and the catalog is where that split lives:
 *
 *   "credit"  — 1-on-1 instruction. The customer buys a package of sessions up
 *               front and redeems one per booking. Cheaper per session the more
 *               they buy. This is what the real EZFacility account does.
 *   "deposit" — rentals, camps, seasonal registration. Pay per reservation to
 *               hold the spot; the balance is settled at the front desk.
 *
 * Credits are NOT fungible across services: a goalie session credit can't be
 * spent on a player session, so each credit service names its own creditType.
 */

export const CREDIT_TYPES = {
  "player-1on1": { label: "Player 1-on-1 sessions", short: "Player 1-on-1" },
  "goalie-1on1": { label: "Goalie 1-on-1 sessions", short: "Goalie 1-on-1" }
};

/* Package tiers: buy more, pay less per session. `unit` is the per-session
   price at that tier; the first tier is the reference price for savings. */
const ONE_ON_ONE_PACKAGES = [
  { id: "single", qty: 1, unit: 199, label: "Single session" },
  { id: "five", qty: 5, unit: 179, label: "5-session package" },
  { id: "ten", qty: 10, unit: 169, label: "10-session package" }
];

export const SERVICES = [
  {
    id: "player-1on1",
    name: "Player 1-on-1 Session",
    brand: "rink",
    type: "hourly",
    group: "sessions",
    deposit: null,
    pricing: { model: "credit", creditType: "player-1on1", packages: ONE_ON_ONE_PACKAGES },
    minAgeGroup: "U9",
    locations: ["trc", "kelowna"],
    desc: "One skater, one coach, one hour of ice. Every session is planned around the skater's position and stage of development.",
    locationsLine: "Training Centre · Kelowna",
    depositLine: "From $169 per session · sold in packages"
  },
  {
    id: "goalie-1on1",
    name: "Goalie 1-on-1 Session",
    brand: "rink",
    type: "hourly",
    group: "sessions",
    deposit: null,
    pricing: { model: "credit", creditType: "goalie-1on1", packages: ONE_ON_ONE_PACKAGES },
    minAgeGroup: "U9",
    locations: ["trc", "kelowna"],
    desc: "Individual crease work with a RINK goaltending coach. Movement, tracking, and save selection, built for the goaltender in front of them.",
    locationsLine: "Training Centre · Kelowna",
    depositLine: "From $169 per session · sold in packages"
  },
  {
    id: "ice-rental",
    name: "Ice Rental",
    brand: "rink",
    type: "hourly",
    group: "sessions",
    deposit: { standard: 150, training: 100, goalie: 75 },
    pricing: { model: "deposit" },
    locations: ["trc", "kelowna"],
    desc: "Three surfaces by the hour: NHL-regulation, two-thirds training, and a crease-sized goalie sheet. Book the one that fits the session.",
    locationsLine: "Training Centre · Kelowna",
    depositLine: "From $75 · three sheets"
  },
  {
    id: "dev-program",
    name: "Development Programs",
    brand: "rink",
    type: "seasonal",
    group: "programs",
    deposit: 150,
    pricing: { model: "deposit" },
    locations: ["trc", "kelowna"],
    desc: "Seasonal on-ice development from U7 to U15. Each age division follows the RINK development model, from introductory skills to high-performance work.",
    locationsLine: "Training Centre · Kelowna",
    depositLine: "$150 deposit to register",
    programs: ["U7 Introductory", "U9 Development", "U11 Advanced", "U13 High-Performance", "U15 Elite"],
    seasons: STANDARD_SEASONS
  },
  {
    id: "goalie-dev-program",
    name: "Goalie Development Programs",
    brand: "rink",
    type: "seasonal",
    group: "programs",
    deposit: 150,
    pricing: { model: "deposit" },
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
    brand: "rink",
    type: "seasonal",
    group: "programs",
    deposit: 200,
    pricing: { model: "deposit" },
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
    brand: "rink",
    type: "seasonal",
    group: "programs",
    deposit: 75,
    pricing: { model: "deposit" },
    locations: ["trc", "kelowna"],
    desc: "First strides to confident skating. Pre-CanSkate for ages 3–5, CanSkate Stages 1–6 for ages 5–12, and an Adult/Teen stream for 13 and up.",
    locationsLine: "Training Centre · Kelowna",
    depositLine: "$75 deposit to register",
    programs: ["Pre-CanSkate (ages 3–5)", "CanSkate Stages 1–6 (ages 5–12)", "Adult/Teen (13+)"],
    seasons: STANDARD_SEASONS
  },
  {
    id: "figure-skating",
    name: "Figure Skating",
    brand: "rink",
    type: "seasonal",
    group: "programs",
    deposit: 75,
    pricing: { model: "deposit" },
    locations: ["trc", "kelowna"],
    desc: "Intro, CanSkate, and Junior Development & Performance streams. Edge work, jumps, and program instruction with dedicated coaches.",
    locationsLine: "Training Centre · Kelowna",
    depositLine: "$75 deposit to register",
    programs: ["Intro", "CanSkate", "Junior Development & Performance"],
    seasons: STANDARD_SEASONS
  },
  {
    id: "hockey-camp",
    name: "Hockey Camps",
    brand: "rink",
    type: "camp",
    group: "camps",
    deposit: 125,
    pricing: { model: "deposit" },
    locations: ["trc", "kelowna"],
    desc: "Week-long summer and March Break camps, Monday to Friday. Full training days, grouped by age division.",
    locationsLine: "Training Centre · Kelowna",
    depositLine: "$125 deposit per week"
  },
  {
    id: "player-clinic",
    name: "Player Clinics",
    brand: "rink",
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
    brand: "rink",
    type: "info",
    group: "clinics",
    deposit: null,
    locations: ["trc", "kelowna"],
    desc: "Group clinics for skaters who play the position, run by RINK goaltending staff. Scheduled in blocks through the year.",
    locationsLine: "Training Centre · Kelowna",
    depositLine: null
  }
,
  /* ---- Testify Performance (testifyperformance.ca) ----
   *
   * Off-ice half of the partnership, running out of the same two facilities.
   * Membership rates and the assessment fee are published on their site.
   * Program deposits are NOT published anywhere public — the two figures below
   * are demo placeholders and should be confirmed with Testify before this is
   * shown as real pricing.
   */
  {
    id: "testify-membership",
    name: "Testify Membership",
    brand: "testify",
    type: "membership",
    group: "training",
    deposit: null,
    pricing: { model: "membership" },
    locations: ["trc", "kelowna"],
    desc: "Semi-private strength and conditioning on a monthly membership. Four tiers by weekly session count, in an Athlete or Lifestyle stream. Includes assessment, a custom program, performance testing, and recovery room access.",
    locationsLine: "Training Centre · Kelowna",
    depositLine: "From $170/month · $99.99 assessment"
  },
  {
    id: "testify-assessment",
    name: "Performance Assessment",
    brand: "testify",
    type: "hourly",
    group: "training",
    deposit: 99.99,
    pricing: { model: "deposit" },
    locations: ["trc", "kelowna"],
    desc: "The one-hour movement and performance screen that opens a membership. Testing, a movement profile, and the plan built from it.",
    locationsLine: "Training Centre · Kelowna",
    depositLine: "$99.99 per assessment"
  },
  {
    id: "r1-training",
    name: "R1 Off-Season Training",
    brand: "testify",
    type: "seasonal",
    group: "training",
    deposit: 150,
    pricing: { model: "deposit" },
    locations: ["trc", "kelowna"],
    desc: "The off-ice half of R1. Strength, speed and conditioning blocks that run alongside RINK's on-ice R1 program through the spring and summer.",
    locationsLine: "Training Centre · Kelowna",
    depositLine: "$150 deposit to register",
    programs: ["R1 Hockey — Winnipeg", "R1 Hockey — Kelowna", "R1 Hockey — Female U15"],
    seasons: R1_SEASONS
  },
  {
    id: "acl-program",
    name: "High Performance ACL Program",
    brand: "testify",
    type: "seasonal",
    group: "training",
    deposit: 150,
    pricing: { model: "deposit" },
    locations: ["trc"],
    desc: "A structured return-to-sport and re-injury prevention block, run jointly by the training and therapy teams for athletes coming back from an ACL reconstruction.",
    locationsLine: "Training Centre",
    depositLine: "$150 deposit to register",
    programs: ["Return to Sport", "Re-Injury Prevention"],
    seasons: STANDARD_SEASONS
  },
  {
    id: "testify-clinic",
    name: "Therapy & Clinic Services",
    brand: "testify",
    type: "info",
    group: "clinics",
    deposit: null,
    pricing: { model: "deposit" },
    locations: ["trc", "kelowna"],
    desc: "Physiotherapy, athletic therapy, massage therapy, naturopathic medicine, clinical counselling and mental performance — booked by appointment with a practitioner.",
    locationsLine: "Training Centre · Kelowna",
    depositLine: null,
    /* Therapy runs on Jane App today. Listed here rather than booked, the same
       way RINK's front-desk-only clinics are. */
    externalBooking: { label: "Book on Jane App", url: "https://testifyperformance.janeapp.com/" }
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

/* One line placing a facility concretely, for the point where the customer
   picks it: street, town, and the wider area when the town alone isn't
   recognisable. */
export function locationLine(location) {
  if (!location) return "";
  const base = location.street + ", " + location.city;
  return location.area ? base + " · " + location.area : base;
}

export function bookableServices() {
  return SERVICES.filter((s) => s.type !== "info");
}

export function servicesInGroup(group) {
  return SERVICES.filter((s) => s.group === group);
}

/* ---- Brand + membership lookups ---- */

export function brandOf(serviceId) {
  const s = getService(serviceId);
  return (s && s.brand) || "rink";
}

export function servicesByBrand(brandId) {
  return SERVICES.filter((s) => (s.brand || "rink") === brandId);
}

export function isMembershipService(serviceId) {
  const p = pricingFor(serviceId);
  return Boolean(p && p.model === "membership");
}

/* A membership's monthly commitment, from a booking's stored schedule. */
export function membershipMonthly(schedule) {
  if (!schedule) return null;
  if (schedule.monthlyRate != null) return schedule.monthlyRate;
  return monthlyRate(schedule.tier, schedule.stream);
}

/* ---- Pricing lookups ---- */

export function pricingFor(serviceId) {
  const s = getService(serviceId);
  return (s && s.pricing) || null;
}

export function isCreditService(serviceId) {
  const p = pricingFor(serviceId);
  return Boolean(p && p.model === "credit");
}

export function creditTypeFor(serviceId) {
  const p = pricingFor(serviceId);
  return p && p.model === "credit" ? p.creditType : null;
}

/* The service a credit type belongs to — lets the account page sell a package
   without the customer starting a booking first. */
export function serviceForCreditType(creditType) {
  return SERVICES.find((s) => s.pricing && s.pricing.creditType === creditType) || null;
}

export function packagesFor(serviceId) {
  const p = pricingFor(serviceId);
  return p && p.model === "credit" ? p.packages : [];
}

export function findPackage(serviceId, packageId) {
  return packagesFor(serviceId).find((p) => p.id === packageId) || null;
}

export function packageTotal(pkg) {
  return pkg.qty * pkg.unit;
}

/* Savings vs. buying the same number of sessions one at a time. */
export function packageSavings(serviceId, pkg) {
  const single = packagesFor(serviceId)[0];
  if (!single || pkg.qty <= 1) return 0;
  return single.unit * pkg.qty - packageTotal(pkg);
}

/* Age divisions a service actually accepts. 1-on-1 instruction is U9 and up
   (therink.ca), so the youngest tiers are filtered out rather than offered
   and rejected later. */
export function ageGroupsFor(service) {
  const base = service.type === "camp" ? CAMP_AGE_GROUPS : HOURLY_AGE_GROUPS;
  if (!service.minAgeGroup) return base;
  const from = base.indexOf(service.minAgeGroup);
  return from <= 0 ? base : base.slice(from);
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
  if (s.startDate) return s.startDate + "T00:00";
  if (s.season && SEASON_STARTS[s.season]) return SEASON_STARTS[s.season] + "T00:00";
  if (s.campWeek) {
    const week = CAMP_WEEKS.find((w) => w.label === s.campWeek);
    if (week) return week.monday + "T00:00";
  }
  return "9999-12-31T23:59";
}