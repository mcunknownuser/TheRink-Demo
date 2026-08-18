# RINK Booking Platform — Demo

A standalone booking platform demo for **RINK** ("The Home of Hockey Development")
and its off-ice partner **Testify Performance**, on one account and one dashboard:
customers browse services, book, hold a spot with a **simulated** deposit or a
session credit, and manage everything from one account; managers review and
confirm/cancel bookings and see customer accounts on an open dashboard. Static
HTML + CSS + vanilla JS (ES modules). No frameworks, no build step, no CDNs, no
external requests, no real payments.

## Run it

```
cd "/Users/nathansamson/Desktop/The Rink Demo" && python3 -m http.server
```

Then open http://localhost:8000/ (the path contains spaces — always quote it).

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Home / services catalog (clinics listed but front-desk only) |
| `book.html` | 5-step booking wizard; step 5 is deposit, credit redemption, or package purchase |
| `confirmation.html?ref=RNK-XXXXX` | Booking confirmation / not-found state |
| `account.html` | "My RINK" — credit balances, bookings, credit history (email sign-in, no password) |
| `dashboard.html` | Manager dashboard: Bookings, Memberships (with MRR) and Accounts views, brand filter (no auth) |

## Two brands, one platform

RINK runs the ice; Testify Performance (`testifyperformance.ca`) runs off-ice
training and therapy. They are partners in the same two buildings and link to
each other publicly. Every service carries `brand: "rink" | "testify"`, and
every booking record stores the brand it was made under.

Their sites are one design system with an accent swap — the same Geom typeface
and the same neutrals (`#393939`, `#f4f4f4`, `#1e1e1e`), red vs gold. So does
this: `[data-brand="testify"]` remaps `--red` to their gold `#ad8400` and
`--black` to `#101010`, and every component re-skins because they all read
tokens rather than literal colours.

## The three pricing models

The catalog decides how a service is paid for, and everything downstream follows:

- **`credit`** — 1-on-1 sessions. Sold as packages ($199 single / $179 ×5 /
  $169 ×10, matching therink.ca), redeemed one session per booking. U9 and up.
- **`deposit`** — ice rentals, camps, seasonal registration, assessments.
- **`membership`** — Testify only. A recurring monthly commitment with a
  3-month minimum, entered through a $99.99 assessment. Bronze/Silver/Gold/
  Platinum × Athlete/Lifestyle, $170–$550 per month. Stored as a booking with
  `serviceType: "membership"`, so the table, panel, account page and CSV all
  handle it with no parallel pipeline. **The assessment fee is what is charged;
  the monthly rate is recurring revenue, never a deposit** — read it through
  `monthlyValue()`, which returns 0 for cancelled memberships.

Cancelling a credit-paid booking more than 24 hours ahead returns the credit;
inside the window it is kept. Managers can hand one back from the dashboard.

## Where the data lives

All in the browser — there is no backend:

- `localStorage["rink.bookings"]` — JSON array of booking records (statuses: `pending` / `confirmed` / `cancelled`).
- `localStorage["rink.credits"]` — append-only credit ledger. Balances are **derived** by summing `qty`, never stored.
- `localStorage["rink.accounts"]` — optional profile overlay (name/phone); accounts themselves are derived from `contact.email` on bookings.
- `localStorage["rink.seedVersion"]` — seed marker (currently `"3"`); 17 sample bookings across both brands and a matching ledger are materialized with relative dates on first load. "Reset demo data" on the dashboard clears every key and reseeds.
- `sessionStorage["rink.draft"]` — in-progress wizard state (never contains card details; only `cardLast4` is ever stored, on the booking record).
- `sessionStorage["rink.session"]` — `{ email }` of the signed-in customer.

**Accounts are derived, not stored.** Every booking already carries
`contact.email`, so an account's history is a filter over `rink.bookings` — the
17 seeded bookings produce populated accounts with no migration, and one
account (s.hartley@mymts.net) deliberately spans both brands. Only the
credit ledger and the profile overlay are genuinely new data.

Booking records keep `deposit` as a required field (the `isBookingRecord`
contract) and add an optional `payment` block describing how it was actually
paid. Read it through `paymentLine()` / `bookingAmount()`, never directly —
credit-paid bookings must contribute `$0` to dashboard totals, because that
revenue was recognized when the package was bought.

JS modules (`assets/js/`): `catalog.js` (services/locations/slots/pricing domain
data), `store.js` (data layer: storage keys, refs, transitions, formatters,
CSV), `accounts.js` (ledger, balances, sign-in, derived accounts), `card.js`
(shared simulated-card validation), `seed.js` (seed templates),
`book.js` / `confirmation.js` / `account.js` / `dashboard.js` (page logic).
`package.json` exists only to mark the JS as ES modules for Node
(`node --check`, `node test/smoke.mjs`) — it is not a build setup.

## Tests

```
cd "/Users/nathansamson/Desktop/The Rink Demo" && node test/smoke.mjs
```

23 tests over the data layer: seeding, booking creation, status transitions,
CSV, credit purchase/redemption/refund/forfeit/comp, the 24-hour cancellation
policy, derived accounts, brand coverage, membership rates and MRR, and
malformed-input handling for both stores. Uses
localStorage/sessionStorage stubs; no browser required.

## Docs index

- `docs/BRIEF.md` — constraints, brand facts, services catalog.
- `docs/STRATEGY.md` — sitemap, wizard flow, data model, seed spec, dashboard spec.
- `docs/COPY.md` — all site copy (used verbatim).
- `docs/DESIGN.md` — design system: tokens, type, components. Hard rules: `border-radius: 0` everywhere (50% only for true circles), Geom + Open Sans only, five-color palette (plus §2.4, the scoped Testify gold).
- `docs/REVIEW.md` — an adversarial review of the pre-account build. Its findings have all been fixed; keep it as history, not as an open list.

## Facilities

Two, matching therink.ca/contact-us — these are real, do not invent others:

| | Address | Phone |
|---|---|---|
| RINK Training Centre | 57 South Landing Drive, Oak Bluff, MB R4G 0C4 | (204) 489-7465 |
| RINK Kelowna | 103-716 Adams Ct, Kelowna, BC V1X 7S2 | (250) 491-4160 |

Both use `info@therink.ca`. A previous version of this demo invented a third
facility ("RINK North — Gateway Arena") and three fictional addresses/phones;
that is gone. Gateway Recreation Centre and Rutland Arena are arenas RINK
*rents* for camps, not facilities — don't add them to `LOCATIONS`.

## Known gaps vs. the real therink.ca

Deliberately not addressed — each needs a decision, not just a correction:

- **Testify programme pricing is a placeholder.** Membership rates and the
  $99.99 assessment fee are published on their site and are real. The $150
  deposits on R1 Off-Season Training and the ACL Program are **invented** —
  they publish no programme pricing. Confirm before showing these as real.
- **R1 is claimed by both.** therink.ca lists an "R1 Off-Season Program" and
  testifyperformance.ca lists "R1 Hockey Off Season". The demo models them as
  two halves of one programme: `r1-offseason` (RINK, on-ice) and `r1-training`
  (Testify, off-ice). Worth confirming with them.
- **Therapy runs on Jane App** (`testifyperformance.janeapp.com`) — a third
  outside platform alongside EZFacility and CatchCorner. Listed here but not
  booked, the same way RINK's front-desk-only clinics are.
- **Camps** run at 8 arenas across MB/BC/ON (incl. Kenora, Fort Frances and
  Port Hope, Ontario), 6 of them rented. Modelling that needs a venue concept
  separate from `LOCATIONS`; right now camps just run at the two facilities.
- **Clinics** are modelled as front-desk-only, but really sell online via
  EZFacility as packages — the same credit model this build already supports.
- **Ice rental** is full/half; the real facility has three named sheets
  (Standard 200×85, Training 120×60, Goalie 60×35).
- **No live cross-tab sync.** Each page reads storage on load and after its own
  actions; there is no `storage` listener. A manager comping a credit will not
  appear in an already-open customer tab until it reloads.
