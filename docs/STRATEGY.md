# RINK Booking Platform — Strategy

**Author: Strategist. Audience: copywriter, visual designer, builder.**
Everything here is a decision, not a suggestion. If you need to deviate, flag it in `docs/REVIEW.md` — do not silently change structure, field names, or flow logic. This doc contains no copy and no code: copy comes from `docs/COPY.md`, visual treatment from `docs/DESIGN.md`.

---

## 1. Sitemap

Four HTML pages. No more.

| File | Page | Audience |
|---|---|---|
| `index.html` | Home / services catalog | Customer |
| `book.html` | Booking wizard (all 5 steps + demo deposit checkout on one page, JS-driven) | Customer |
| `confirmation.html` | Booking confirmation | Customer |
| `dashboard.html` | Manager dashboard (list + detail panel on one page) | Manager |

Decisions behind the shape:

- **The booking flow is ONE page** (`book.html`), a step wizard driven by vanilla JS. Multi-page flows multiply state-passing problems in a static site; a single page with a `sessionStorage` draft is simpler and survives refresh.
- **Checkout is the last step of the wizard**, not a separate page. It is one form; a dedicated page adds nothing.
- **Confirmation is its own page** (`confirmation.html?ref=RNK-XXXXX`) so the "you're done" state has a clean URL, can be reloaded, and the wizard's draft state can be fully discarded before it renders.
- **The dashboard detail view is a panel inside `dashboard.html`**, not a separate page. One page keeps filter state alive while the manager works through bookings.
- No standalone services page (home *is* the catalog), no contact page, no about page. This is a booking platform, not a marketing site.

Supporting file map (for the builder — final structure is builder's call, but keep shared logic shared):

- `css/` — one shared stylesheet (+ optional dashboard stylesheet).
- `js/catalog.js` — the services/locations/schedule catalog data (Section 3.1–3.4). Single source of truth; every page reads from it.
- `js/store.js` — localStorage read/write, booking-ref generation, seeding (Section 5).
- `js/book.js`, `js/dashboard.js`, `js/confirmation.js` — page logic.
- `assets/fonts/`, `assets/img/` — already provided per the brief; self-hosted only.

Global chrome (applies to `index.html`, `book.html`, `confirmation.html`):

- **Header:** RINK logo (links to `index.html`), tagline treatment per designer, one primary CTA to `book.html`. No other nav items.
- **Footer:** three locations block, contact block, demo disclaimer line, and a **"Manager Dashboard" text link → `dashboard.html`**. The dashboard link lives in the footer utility row on every customer page — present and findable, but not competing with customer CTAs. This is the only entry point to the dashboard from the customer side.
- `dashboard.html` has its **own chrome**: dark header with inverse logo, "Manager Dashboard" label, and a "Back to booking site" link → `index.html`. No customer footer on the dashboard.

---

## 2. Page-by-page spec

### 2.1 `index.html` — Home / Services

**Purpose:** let a customer understand what RINK offers, pick a service, and enter the booking flow in one click. Doubles as the demo's front door, so it must establish the brand instantly.

**Sections, in order:**

1. **Header** (global chrome, above).
2. **Hero** — short. Facility positioning + tagline + one primary CTA scrolling/linking to the services catalog. No carousel, no video.
3. **Services catalog** — all 11 services (9 bookable + 2 clinics), grouped under three headings that mirror the booking shapes so the flow feels inevitable:
   - *Sessions & Ice* (hourly): Player 1-on-1, Goalie 1-on-1, Ice Rentals
   - *Programs* (seasonal): Development Programs, Goalie Development Programs, R1 Off-Season, Learn to Skate, Figure Skating
   - *Camps*: Hockey Camps
   - *Clinics* (front desk only): Player Clinics, Goalie Clinics
   Each bookable service tile shows: name, one-line descriptor, locations offered (from the matrix in 3.2), deposit amount, and a **Book CTA → `book.html?service=<serviceId>`**.
   **Clinics tiles:** identical layout and visual weight to bookable tiles, but the CTA slot carries a "front-desk only" tag plus a contact line (copywriter supplies wording; phone as a `tel:` link is acceptable). **No link into `book.html`, ever.** Clinics must not look broken or second-class — they look deliberate: same tile, different call to action.
4. **Locations strip** — the three facilities with city/province. Informational; no per-location pages.
5. **How it works** — 3-step explainer (choose → schedule → deposit) so the deposit model is expected before the wizard.
6. **Footer** (global chrome).

**User can:** browse services, jump into the wizard with a service pre-selected, reach the dashboard via footer.

### 2.2 `book.html` — Booking wizard

**Purpose:** take any bookable service from selection to paid (simulated) deposit in 5 steps. Full flow spec in Section 3.

**Sections, in order:**

1. **Header** (global chrome; the header CTA is suppressed or repointed here — designer's call, but no CTA that restarts the flow destructively without warning).
2. **Step indicator** — 5 labeled steps, current step highlighted. Steps are numbered and named; completed steps are clickable to go back, future steps are not.
3. **Step panel** — one step visible at a time (see Section 3.5). Back/Continue controls at the bottom of the panel; Continue is blocked until the step validates.
4. **Booking summary rail** — persistent sidebar (stacks below the panel on narrow screens) showing every choice made so far plus the running deposit amount. Updates live. This is what makes one adaptive flow feel coherent across three booking shapes.
5. **Footer** (global chrome).

**User can:** select/change service, complete the adaptive flow, pay the demo deposit, get redirected to `confirmation.html`. Arriving with `?service=<id>` pre-fills step 1; arriving with an invalid/clinic/absent id lands on step 1 unselected. In-progress state lives in `sessionStorage` (Section 4.3) so a refresh does not lose work.

### 2.3 `confirmation.html` — Confirmation

**Purpose:** prove the booking exists, hand over the reference, set the "pending until confirmed" expectation.

**Sections, in order:**

1. **Header** (global chrome).
2. **Confirmation block** — booking reference (large, prominent), status shown as *pending*, and an explicit line that the front desk / manager confirms bookings (copywriter). Demo-deposit disclaimer repeated here.
3. **Booking summary** — full read-only recap: service, location, schedule (date/time, program+season, or camp week — whichever applies), participant, contact, deposit paid.
4. **Next actions** — link back to `index.html`; secondary "book another" link to `book.html`.
5. **Footer** (global chrome).

**Behavior:** reads `?ref=` from the URL, looks up the record in localStorage. If the ref is missing or not found, show a not-found message with a link home — never a blank page. This page never mutates data; the wizard writes the record *before* redirecting.

### 2.4 `dashboard.html` — Manager dashboard

Full spec in Section 6. Reached only by the footer link; no auth, no gate.

---

## 3. Catalog: services, locations, schedules

This is the domain data the whole demo runs on. Builder encodes it once in `js/catalog.js`.

### 3.1 Services

| serviceId | Service | type | Deposit (CAD) |
|---|---|---|---|
| `player-1on1` | Player 1-on-1 Session | `hourly` | $50 |
| `goalie-1on1` | Goalie 1-on-1 Session | `hourly` | $50 |
| `ice-rental` | Ice Rental | `hourly` | $150 full ice / $75 half ice |
| `dev-program` | Development Programs | `seasonal` | $150 |
| `goalie-dev-program` | Goalie Development Programs | `seasonal` | $150 |
| `r1-offseason` | R1 Off-Season Program | `seasonal` | $200 |
| `learn-to-skate` | Learn to Skate | `seasonal` | $75 |
| `figure-skating` | Figure Skating | `seasonal` | $75 |
| `hockey-camp` | Hockey Camps | `camp` | $125 |
| `player-clinic` | Player Clinics | `info` | — (not bookable) |
| `goalie-clinic` | Goalie Clinics | `info` | — (not bookable) |

Deposits are flat per service (ice rental varies by full/half). They are deposits, not full prices — do not invent full pricing anywhere on the site.

### 3.2 Locations and availability matrix

| locationId | Location |
|---|---|
| `trc` | RINK Training Centre — Winnipeg, MB |
| `north` | RINK North — Gateway Arena — Winnipeg, MB |
| `kelowna` | RINK Kelowna — Rutland Arena — Kelowna, BC |

| Service | trc | north | kelowna |
|---|---|---|---|
| player-1on1 | ● | ● | ● |
| goalie-1on1 | ● | — | ● |
| ice-rental | ● | ● | ● |
| dev-program | ● | ● | ● |
| goalie-dev-program | ● | — | — |
| r1-offseason | ● | — | ● |
| learn-to-skate | ● | ● | — |
| figure-skating | — | ● | — |
| hockey-camp | ● | ● | ● |
| player-clinic (info) | ● | — | ● |
| goalie-clinic (info) | ● | — | ● |

Single-location services (`goalie-dev-program`, `figure-skating`) exist deliberately: the wizard's location step must handle auto-selecting a lone option (see 3.5, step 2).

### 3.3 Programs and season blocks (seasonal services)

Program/age-group options per service:

- `dev-program`: U7 Introductory · U9 Development · U11 Advanced · U13 High-Performance · U15 Elite
- `goalie-dev-program`: U9 · U11 · U13 · U15
- `r1-offseason`: U13 · U15 · U18
- `learn-to-skate`: Pre-CanSkate (ages 3–5) · CanSkate Stages 1–6 (ages 5–12) · Adult/Teen (13+)
- `figure-skating`: Intro · CanSkate · Junior Development & Performance

Season blocks (labels include date ranges so the choice feels real):

- All seasonal services **except R1**: *Fall 2026 (Sep 14 – Dec 18)* and *Winter 2027 (Jan 11 – Mar 26)*.
- `r1-offseason` only: *Spring Block 2027 (Apr 6 – May 29)* and *Summer Block 2027 (Jun 1 – Aug 20)*.

Both blocks are open for registration at every location that offers the service. The participant's age group is the selected program tier — it is not asked twice.

### 3.4 Slots and camp weeks

**Hourly services** (`player-1on1`, `goalie-1on1`, `ice-rental`):

- 60-minute slots starting on the hour, **07:00–20:00 start times** (last session 20:00–21:00), 7 days a week, identical at all locations.
- Bookable window: **today through today + 45 days**. Past dates and, on today's date, already-elapsed start times are not selectable.
- A slot is **unavailable** if either: (a) an existing non-cancelled booking in localStorage occupies the same location + date + startTime for the same service, or (b) it is deterministically "held" by a pseudo-availability function — hash location + date + startTime to block roughly 25% of slots. Deterministic, not random-per-render: the same slot must stay blocked on every page load. This is what makes the grid feel like a live facility without an availability engine.
- `ice-rental` adds one choice before the grid: **full ice ($150 deposit) or half ice ($75 deposit)**. The choice changes the deposit only, not the slot grid.

**Camp weeks** (`hockey-camp`) — week-long, Mon–Fri:

| Week label | trc | north | kelowna |
|---|---|---|---|
| Aug 10–14, 2026 | ● | — | ● |
| Aug 17–21, 2026 | ● | ● | ● |
| Aug 24–28, 2026 | ● | ● | ● |
| March Break — Mar 29 – Apr 2, 2027 | ● | — | ● |

Weeks whose Monday is in the past are shown disabled/sold-out, not hidden (keeps the list feeling real as the demo ages). Camps have no capacity model — every listed future week is open.

### 3.5 The booking flow — one wizard, five steps

One flow for all three booking shapes. Steps 1, 2, 4, 5 are identical for everyone; **step 3 is the adaptive step** — its content is determined by the selected service's `type`. Never branch into separate flows.

**Step 1 — Service.**
All 9 bookable services, grouped as on the home page, each showing name + deposit. Clinics do **not appear in this step at all** (they are represented on `index.html` only). Pre-selected when arriving via `?service=`. Changing the service after later steps are filled resets steps 2–3 (schedule data is service-specific) but preserves step 4 details if already entered.
*Collected:* `serviceId`. *Validation:* one service selected.

**Step 2 — Location.**
Only locations from the 3.2 matrix for the chosen service. If exactly one location offers the service, it is auto-selected and shown as fixed (with a line saying it's the only location for this service) — the customer still passes through the step, keeping the step count stable.
*Collected:* `locationId`. *Validation:* one location selected.

**Step 3 — Schedule (adaptive).**

- *`hourly`:* (ice-rental only: full/half toggle first) → date picker (window per 3.4) → time-slot grid for that date with unavailable slots visibly disabled. *Collected:* `date`, `startTime` (+ `iceOption` for rentals). *Validation:* date in window, selected slot available.
- *`seasonal`:* program/age-group list (per 3.3) → season block list. *Collected:* `program`, `season`. *Validation:* both selected.
- *`camp`:* list of camp weeks available at the chosen location, past weeks disabled. *Collected:* `campWeek`. *Validation:* a future week selected.

**Step 4 — Details.**
Two sub-blocks on one step:

- *Participant* — adaptive by service:
  - `player-1on1` / `goalie-1on1`: participant full name + age group dropdown (U7, U9, U11, U13, U15, U18, Junior, Adult) + optional notes (goals/focus areas).
  - Seasonal services: participant full name + optional notes. Age group is already fixed by the step-3 program choice — display it read-only here, don't re-ask.
  - `hockey-camp`: participant full name + age group dropdown (U7–U15) + optional notes.
  - `ice-rental`: **no individual participant** — group/team name + estimated skater count (1–40) instead.
- *Contact (booker)* — always: full name, email, phone. Note near the fields that confirmation is by email/phone from the front desk (copywriter).

*Validation:* names non-empty (≥ 2 characters); email matches a basic `x@y.z` pattern; phone contains 10+ digits ignoring spaces/dashes/parentheses; age group selected where shown; skater count in range for rentals. Inline errors per field on Continue; first invalid field gets focus.

**Step 5 — Review & demo deposit.**
Read-only recap of every choice (edit links jump back to the relevant step), then the simulated checkout: cardholder name, card number, expiry, CVC, and the deposit amount displayed as the amount to be charged. **A clearly visible demo notice states no real payment occurs** (copywriter wording; designer makes it unmissable without wrecking the page).
*Validation — format only, no Luhn, no provider:* cardholder non-empty; card number 15–16 digits (spaces allowed, stripped); expiry MM/YY, a real month, not in the past; CVC 3–4 digits. Any plausible values pass.

**On submit:** build the booking record (Section 4), status `pending`, generate the reference, append to localStorage, store `cardLast4` only (never the full number, even in a demo), clear the draft, redirect to `confirmation.html?ref=<ref>`. Submission is synchronous; a brief disabled-button "processing" state is fine, fake multi-second spinners are not.

**Every booking starts as `pending`.** Confirmation is a manager action on the dashboard. This gives the dashboard a real job and makes the demo story land: customer books → manager confirms.

---

## 4. Data model

### 4.1 localStorage keys

| Key | Contents |
|---|---|
| `rink.bookings` | JSON array of booking records (the only booking store; customer flow appends, dashboard mutates status) |
| `rink.seedVersion` | Seed marker, e.g. `"1"` — presence at current version means "already seeded" |
| `rink.draft` | **sessionStorage**, not localStorage: in-progress wizard state; cleared on completed booking or new flow start |

### 4.2 Booking record shape

One shape for all three booking types; `schedule` carries only the fields relevant to the type, the rest are `null`. Statuses: exactly `"pending"`, `"confirmed"`, `"cancelled"` (lowercase, these spellings).

```json
{
  "ref": "RNK-40917",
  "serviceId": "dev-program",
  "serviceName": "Development Programs",
  "serviceType": "seasonal",
  "locationId": "trc",
  "locationName": "RINK Training Centre — Winnipeg, MB",
  "schedule": {
    "date": null,
    "startTime": null,
    "endTime": null,
    "iceOption": null,
    "program": "U11 Advanced",
    "season": "Fall 2026 (Sep 14 – Dec 18)",
    "campWeek": null
  },
  "participant": {
    "name": "…",
    "ageGroup": "U11",
    "groupName": null,
    "skaterCount": null,
    "notes": ""
  },
  "contact": {
    "name": "…",
    "email": "…",
    "phone": "…"
  },
  "deposit": {
    "amount": 150,
    "currency": "CAD",
    "cardLast4": "4242"
  },
  "status": "pending",
  "createdAt": "2026-08-09T14:32:00.000Z"
}
```

Field usage by type:

- `hourly`: `date` (ISO `YYYY-MM-DD`), `startTime`/`endTime` (24h `HH:MM`), `iceOption` (`"full"`/`"half"`, ice-rental only). Ice rentals use `participant.groupName` + `participant.skaterCount` with `name`/`ageGroup` null.
- `seasonal`: `program`, `season`; `participant.ageGroup` derived from program (for learn-to-skate/figure-skating, store the program tier label as the ageGroup).
- `camp`: `campWeek` (the week label string); `participant.ageGroup` from the dropdown.

Denormalized `serviceName`/`locationName` are intentional: dashboard and confirmation render without catalog lookups, and records stay readable in devtools.

### 4.3 Booking reference

Format: `RNK-` + 5 digits (10000–99999). Generate randomly, check against existing refs in `rink.bookings`, regenerate on collision. Displayed everywhere the booking is shown; it is the customer's only handle on the booking (no accounts).

### 4.4 Seed data

The dashboard must never open empty. On any page load, if `rink.seedVersion` is absent or outdated, write the seed set to `rink.bookings` (overwriting) and set the marker. The dashboard also gets a "Reset demo data" control that clears both keys and reseeds on the spot.

**Seed content — 12 bookings**, defined in `js/seed.js` as templates with **relative day offsets, materialized to absolute dates at seed time**, so the demo looks current whenever it is first run:

- `createdAt`: spread from 13 days ago to a few hours ago (at least 4 within the last 7 days so the "this week" stat reads well).
- Hourly bookings: event dates from 2 days ago (a completed confirmed session) to +10 days.
- Distribution across the matrix (every location and all three booking shapes represented):
  - 3 × hourly sessions (`player-1on1` ×2, `goalie-1on1` ×1) — 2 confirmed, 1 pending
  - 2 × `ice-rental` (one full @ $150, one half @ $75) — 1 confirmed, 1 pending
  - 3 × `dev-program` (different tiers/locations) — 2 confirmed, 1 pending
  - 1 × `goalie-dev-program` (trc) — confirmed
  - 1 × `learn-to-skate` (north) — pending
  - 1 × `figure-skating` (north) — cancelled
  - 1 × `hockey-camp` (kelowna, Aug 17–21 week) — cancelled
- Status totals: **6 confirmed, 4 pending, 2 cancelled.**
- Builder generates realistic, varied Canadian participant/contact names and plausible Winnipeg/Kelowna phone numbers (204/431/250 area codes), varied email domains. No joke names, no `test@test.com`.

---

## 5. Simulated deposit checkout — summary of rules

(Consolidated so the builder has one checklist; details in 3.5 step 5.)

- Card-style form: cardholder, number, expiry, CVC. Format validation only. No Luhn. No network request of any kind.
- Deposit amount comes from the 3.1 table (ice rental varies by full/half) and is displayed on the pay button/summary.
- Demo notice is mandatory and visible at the point of payment and again on the confirmation page.
- Store `cardLast4` only. Never persist the full card number, expiry, or CVC — not even in the draft.

---

## 6. Manager dashboard — `dashboard.html`

**Purpose:** one screen where a rink manager reviews incoming bookings, confirms or cancels them, and sees the money picture. No auth — plain link from the customer footer. Everything below is achievable in vanilla JS against `rink.bookings`; nothing requires libraries.

**Sections, in order:**

1. **Dashboard header** — dark chrome, inverse logo, "Manager Dashboard" identity, "Back to booking site" link → `index.html`, and the **"Reset demo data"** control (with a two-step confirm; it clears `rink.bookings` + `rink.seedVersion` and reseeds).
2. **Summary stats row** — four tiles, computed live from the store:
   - *Bookings this week* — records with `createdAt` in the trailing 7 days (including today), excluding cancelled.
   - *Deposits collected* — sum of `deposit.amount` where status is `pending` or `confirmed` (cancelled deposits count as refunded and are excluded), formatted as CAD.
   - *Pending* — count of `status === "pending"`. This is the manager's to-do number.
   - *Active bookings* — total non-cancelled records.
3. **Filter/search bar** —
   - Dropdown filters: **Service** (all 9 bookable), **Location**, **Status** — each with an "All" default; filters combine (AND).
   - **Text search** matching booking ref, contact name, or participant/group name (case-insensitive substring).
   - Visible count of matching rows; one-click "clear filters".
4. **Bookings table** — one row per booking. Columns: Ref · Created · Service · Location · Schedule (rendered per type: date+time, program+season, or camp week) · Participant (or group name) · Deposit · Status.
   - **Default sort: newest `createdAt` first.**
   - Sortable by clicking column headers: Created, Schedule (chronological on event/season start), Deposit. Toggle asc/desc with a direction indicator.
   - Status rendered as a flat tag (sharp corners — designer) with distinct treatment per status.
   - Cancelled rows visually muted but present.
   - Empty state when filters match nothing: a message + clear-filters action, never a bare empty table.
5. **Booking detail panel** — opens on row click (side panel or expanding section; designer decides, one visible at a time). Shows every field of the record: full schedule, participant details incl. notes, contact info with `mailto:`/`tel:` links, deposit + card last 4, status, created timestamp, ref.
   - **Actions:** *Confirm* (only when `pending` → sets `confirmed`) and *Cancel* (when `pending` or `confirmed` → sets `cancelled`). Cancel requires an explicit second confirmation step (inline "confirm cancel" state or native confirm dialog — builder's choice, but never one-click). **Cancelled is terminal** — no reactivation, no delete. Status changes persist immediately and re-render stats, table, and tag in place.
6. **Export** — an "Export CSV" button that downloads the currently filtered rows (same columns as the table plus contact email/phone) via a generated data URI/Blob. Cheap in vanilla JS, and exactly what a real front desk asks for.

Not on the dashboard: editing booking fields, creating bookings manager-side, calendar views, charts, per-manager anything. If the manager needs to change a detail, the demo story is "cancel and rebook".

---

## 7. Out of scope — do NOT build

- **No accounts or auth** — no customer login, no manager login, no sessions, no "my bookings" page. The confirmation ref is the customer's only receipt.
- **No real payments** — no Stripe/provider SDKs, no Luhn, no tokenization. Format-checked fake checkout only.
- **No email/SMS** — nothing is sent. Confirmation is on-screen only; copy may *say* the front desk will reach out.
- **No real availability engine** — availability is the deterministic pseudo-hold rule + localStorage collision check from 3.4. No capacity counts, no waitlists, no holds that expire.
- **No backend, no build step, no external requests** — pure static files; every asset self-hosted; works from `python3 -m http.server`.
- **No customer-side booking management** — no cancel/reschedule/edit by customers.
- **No full pricing** — deposits only; never show or compute full program/session prices.
- **No refund flows** — cancelling on the dashboard just excludes the deposit from totals.
- **No multi-participant registration** — one participant (or one group, for rentals) per booking; booking twice means running the flow twice.
- **No clinics booking path** — clinics never appear inside `book.html` under any circumstance.
- **No analytics, no cookies banner, no i18n, no dark mode.** Sensible semantic HTML and keyboard-reachable controls: yes. A WCAG audit: no.

---

## 8. Open decisions delegated

- **Copywriter:** all headings, service descriptors, demo-deposit disclaimer wording, clinic front-desk line, confirmation-page expectation setting, dashboard labels. Keyed by page/section per this doc's structure.
- **Designer:** step-indicator treatment, summary-rail placement at narrow widths, status-tag treatment, detail-panel pattern (side vs expand), how the demo notice is prominent without being ugly. Zero rounded corners throughout, per the brief.
- **Builder:** exact hash for the pseudo-availability rule, CSV escaping details, file layout within the map in Section 1 — everything else in this doc is fixed.
