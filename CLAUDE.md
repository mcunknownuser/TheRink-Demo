# RINK Booking Platform — Demo

A standalone booking platform demo for RINK ("The Home of Hockey Development"):
customers browse services, book, and pay a **simulated** deposit; managers review
and confirm/cancel bookings on an open dashboard. Static HTML + CSS + vanilla JS
(ES modules). No frameworks, no build step, no CDNs, no external requests, no
real payments.

## Run it

```
cd "/Users/muradcheway/Voltris/Projects /The Rink Demo" && python3 -m http.server
```

Then open http://localhost:8000/ (the path contains spaces — always quote it).

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Home / services catalog (clinics listed but front-desk only) |
| `book.html` | 5-step booking wizard incl. simulated deposit checkout |
| `confirmation.html?ref=RNK-XXXXX` | Booking confirmation / not-found state |
| `dashboard.html` | Manager dashboard (no auth; linked from every customer footer) |

## Where the data lives

All in the browser — there is no backend:

- `localStorage["rink.bookings"]` — JSON array of booking records (statuses: `pending` / `confirmed` / `cancelled`).
- `localStorage["rink.seedVersion"]` — seed marker; 12 sample bookings are materialized with relative dates on first load. "Reset demo data" on the dashboard clears both keys and reseeds.
- `sessionStorage["rink.draft"]` — in-progress wizard state (never contains card details; only `cardLast4` is ever stored, on the booking record).

JS modules (`assets/js/`): `catalog.js` (services/locations/slots domain data),
`store.js` (data layer: storage, refs, transitions, CSV), `seed.js` (seed
templates), `book.js` / `confirmation.js` / `dashboard.js` (page logic).
`package.json` exists only to mark the JS as ES modules for Node
(`node --check`, `node test/smoke.mjs`) — it is not a build setup.

## Tests

```
cd "/Users/muradcheway/Voltris/Projects /The Rink Demo" && node test/smoke.mjs
```

Exercises the data layer (seeding, booking creation, status transitions, CSV)
with a localStorage stub.

## Docs index

- `docs/BRIEF.md` — constraints, brand facts, services catalog.
- `docs/STRATEGY.md` — sitemap, wizard flow, data model, seed spec, dashboard spec.
- `docs/COPY.md` — all site copy (used verbatim).
- `docs/DESIGN.md` — design system: tokens, type, components. Hard rules: `border-radius: 0` everywhere (50% only for true circles), Geom + Open Sans only, five-color palette.
