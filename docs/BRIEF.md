# RINK Booking Platform — Team Brief

**Read this first. Every agent on this project works from this brief.**

## What we are building

A standalone **booking platform** for RINK (therink.ca), "The Home of Hockey Development" — a high-end hockey development facility. This is **not** their marketing website; it is the booking system a customer lands on to book and pay a deposit for RINK services.

Two audiences, one site:

1. **Customers** — browse services, pick a location/date/time, enter details, pay a **simulated deposit** (fake checkout, no real payment provider, clearly marked as a demo transaction).
2. **Managers** — a dashboard reachable from a plain link on the page. **No login, no username, no password.** They see and manage all bookings.

## Hard requirements (non-negotiable)

- Customers can book **every service EXCEPT clinics**. Player Clinics and Goalie Clinics are listed but marked "book through the front desk / contact us" — no booking flow for them.
- Deposit checkout is **simulated**: a card-style form that accepts anything plausible, validates format only, and never contacts a payment provider. Label it clearly as a demo deposit.
- Manager dashboard: open access from a footer/header link. Views bookings, confirms/cancels them, sees deposit totals.
- **Zero rounded corners.** `border-radius: 0` is the brand. Sharp boxes, sharp buttons, sharp inputs. (Their real CSS is dominated by `border-radius:0`.) The ONLY exception: perfect circles (50%) where a circular element is genuinely needed.
- Must **not look AI-generated**: no Inter/Poppins-default look, no purple gradients, no emoji as icons, no generic card grids with soft shadows and 16px radii. It must look like RINK built it.

## Brand facts (extracted from therink.ca — use these exactly)

- **Headings / display / buttons:** `"Geom", sans-serif` — semibold (600) only. Self-hosted at `assets/fonts/geom-semibold.woff2` (+ `.woff`). This is their real brand font, pulled from their site. Headings on their site are frequently UPPERCASE.
- **Body text:** `"Open Sans", sans-serif` — self-hosted variable font at `assets/fonts/opensans-variable.woff2` (declare `font-weight: 300 800`). Use 400 body, 600/700 emphasis.
- **Colors:**
  - RINK Red `#ea0029` — primary. Buttons, accents, active states.
  - RINK Blue `#0032a0` — secondary. Deep royal blue.
  - Dark gray `#393939` — primary text.
  - Near-black `#151414` / `#1e1e1e` — dark sections, footer.
  - Light gray `#f4f4f4` — section backgrounds.
  - White `#fff`.
- **Logos:** `assets/img/logo.png` (for light backgrounds), `assets/img/logo-inv.png` (for dark), `assets/img/favicon.png`.
- **Tagline:** "The Home of Hockey Development".
- **Voice:** professional, development-focused, confident, structured-pathway language ("development model", "high performance", age divisions U7–U15). Not cutesy, not salesy.

## Services catalog (from their real site)

**Bookable:**
| Service | Notes |
|---|---|
| Player 1-on-1 Sessions | individual skill coaching, hourly |
| Goalie 1-on-1 Sessions | individual goaltending coaching, hourly |
| Development Programs | U7 Introductory, U9 Development, U11 Advanced, U13 High-Performance, U15 Elite — seasonal registration |
| Goalie Development Programs | U9–U15, seasonal registration |
| Hockey Camps | summer camps, week-long, by location |
| R1 Off-Season Program | off-season training block |
| Learn to Skate | Pre-CanSkate (3–5), CanSkate Stages 1–6 (5–12), Adult/Teen (13+) |
| Figure Skating | Intro, CanSkate, Junior Development & Performance |
| Ice Rentals | full/half ice, hourly, teams & groups |

**NOT bookable (info only, "contact the front desk"):** Player Clinics, Goalie Clinics.

**Locations:** RINK Training Centre (Winnipeg, MB) · RINK North — Gateway Arena (Winnipeg, MB) · RINK Kelowna — Rutland Arena (Kelowna, BC). Not every service needs to exist at every location.

## Tech constraints

- Static site: plain HTML + CSS + vanilla JS. **No frameworks, no build step, no CDNs, no external requests** (fonts/logos are self-hosted).
- Bookings persist in `localStorage` (shared by customer flow and manager dashboard in the same browser — fine for a demo).
- Runs locally with one command: `python3 -m http.server` from the project root.
- Project root: `/Users/muradcheway/Voltris/Projects /The Rink Demo` (note: the path contains spaces — always quote it).

## Team docs

- `docs/BRIEF.md` — this file.
- `docs/STRATEGY.md` — strategist: sitemap, page specs, booking flow, data model, dashboard spec.
- `docs/COPY.md` — copywriter: all site copy, keyed by page/section.
- `docs/DESIGN.md` — visual designer: design system (tokens, type scale, spacing, components).
- `docs/REVIEW.md` — reviewer: findings.
