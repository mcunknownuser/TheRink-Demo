# RINK Booking Platform — Review

**Author: Reviewer. Date: 2026-08-09.**
Independent adversarial review of the built demo against `docs/BRIEF.md` (contract), `docs/STRATEGY.md`, `docs/COPY.md`, `docs/DESIGN.md`. Method: full read of all 4 HTML pages, both stylesheets, all 6 JS modules and the smoke test; `node --check` on every module; `test/smoke.mjs` run in three timezones (America/Winnipeg, UTC+14, UTC−11); site served with `python3 -m http.server` and every page/asset curled; a separate adversarial Node harness run against `store.js`/`catalog.js` (CSV escaping, corrupt storage, expiry logic, slot-hold distribution, the step-4 validation replica). Every finding below was reproduced or traced to a concrete failing input before being written down. Nothing was fixed — report only.

**Verdict: 0 BLOCKER · 1 MAJOR · 8 MINOR.** The client contract holds on every hard requirement (verification table at the end). The one MAJOR is a real wizard validation gap a demo audience could hit.

---

## Findings (ranked)

### MAJOR-1 — Stale age division from a previous service silently passes camp validation

- **Where:** `assets/js/book.js:808` (`validateDetails`: `if (svc.type !== "seasonal" && !d.ageGroup)`), in combination with the service-change handler at `book.js:277–294` (which deliberately preserves `draft.details`) and the select rendering at `book.js:563–572` (which only marks an option `selected` when it matches the current service's list).
- **What's wrong:** validation only checks that `details.ageGroup` is *truthy*, not that it is a member of the age-group list the current service actually offers (`CAMP_AGE_GROUPS` = U7–U15 vs `HOURLY_AGE_GROUPS` = U7–Adult). When the user changes service after filling details (a path the wizard explicitly advertises: "Your participant and contact details are saved"), a stale value carries over invisibly.
- **Concrete failure scenario (verified with a logic replica; validation returns zero errors):**
  1. Book a Player 1-on-1: step 4, pick Age division **"Adult"** (or U18/Junior), fill contact, reach step 5.
  2. Click "Change" on Service → switch to **Hockey Camps**. Schedule clears, details are kept (as specced).
  3. Pick location + camp week. Step 4 now shows the camp age select displaying **"Select age division"** (no option matches "Adult") — visually nothing is selected.
  4. Click Continue: it passes, because `draft.details.ageGroup === "Adult"` is truthy. Step 5 recap and the stored booking read **"Age division: Adult"** for a U7–U15 camp — what the customer saw (nothing selected) and what got stored disagree.
- **Suggested fix:** in `validateDetails`, require membership: `const opts = isCamp ? CAMP_AGE_GROUPS : HOURLY_AGE_GROUPS; if (!opts.includes(d.ageGroup)) errors.pAge = …`. Alternatively (or additionally) clear `draft.details.ageGroup` in the step-1 service-change handler when it isn't valid for the new service.

### MINOR-1 — Dashboard: focus is never restored to the table row on panel close

- **Where:** `assets/js/dashboard.js:349–358` (`openPanel`) and `:360–368` (`closePanel`).
- **What's wrong:** `openPanel` stores the clicked `<tr>` in `lastFocusedRow`, then immediately calls `renderTable()` (line 357), which rebuilds `els.body.innerHTML` (line 185) and detaches that element. `closePanel`'s guard `document.contains(lastFocusedRow)` (line 366) is therefore **always false**, so the focus-restore branch is dead code — it never runs.
- **Failure scenario:** keyboard user Tabs to a row, presses Enter (panel opens, focus moves to Close), presses Escape — focus drops to `<body>`; they must Tab from the top of the page back to where they were. Reproducible on every single open/close.
- **Suggested fix:** re-resolve the row by ref at close time: `const row = els.body.querySelector('tr[data-ref="' + CSS.escape(ref) + '"]'); if (row) row.focus();` (keep the ref, not the element).

### MINOR-2 — Payment step re-validates hourly slot availability only; window/past checks can go stale

- **Where:** `assets/js/book.js:879–885` (final re-check is `svc.type === "hourly"` + `slotAvailable` only) and `book.js:175–183` (`slotAvailable` has no past-date/45-day-window check — its "elapsed hour" rule only fires when `date === todayISO()`).
- **What's wrong:** the date-window and camp-week checks run at step-3 Continue, never again. Seasonal/camp submissions are not re-validated at all.
- **Failure scenario:** user reaches step 5 with today's date (or the "Aug 10–14" camp week) late in the evening, leaves the tab open (the draft lives in `sessionStorage` and survives), and clicks Pay after midnight / days later: the booking is created for a now-past date or an already-started camp week. Narrow in a live demo, but constructible.
- **Suggested fix:** in `handlePayment`, re-run the step-3 validation (`validateStep` logic for the schedule) for all three shapes before `createBooking`, bouncing to step 3 with the existing error copy on failure.

### MINOR-3 — Malformed booking records (valid JSON, wrong shape) crash the dashboard and CSV export

- **Where:** `assets/js/store.js:19–27` (`getBookings` guards JSON parse errors and non-arrays, not record shape); crash sites verified: `dashboard.js:113` (`b.contact.name` in the search filter) and `store.js:191–193` (`participantLabel` → `booking.participant.groupName` in table/CSV rendering).
- **What's wrong / verified failure:** with `localStorage["rink.bookings"] = '[{}]'` (e.g. devtools tampering, or any future writer bug), `bookingsToCsv` and the dashboard filter both throw `TypeError: Cannot read properties of undefined` — the module dies and the table never renders. Fully corrupt JSON, by contrast, is handled gracefully (verified: returns `[]`, dashboard shows its empty state).
- **Suggested fix:** filter in `getBookings`: keep only records with `ref`, `contact`, `participant`, `schedule`, `deposit` objects present (one `Array.isArray` + `.filter()` line), matching the defensive posture already taken for parse errors.

### MINOR-4 — CSV export: no UTF-8 BOM, and formula-leading values are not neutralized

- **Where:** `assets/js/store.js:210–237` (`csvEscape`/`bookingsToCsv`), `assets/js/dashboard.js:394–405` (Blob download).
- **What's wrong / verified:** (a) every seeded `locationName` contains an em dash ("RINK Training Centre — Winnipeg, MB"); the Blob is UTF-8 with no BOM, so Excel-on-Windows' default CSV open renders it as `â€"` mojibake. (b) `csvEscape` passes `=2+2` (or any customer-typed name starting `=`, `+`, `-`, `@`) through bare — classic CSV formula injection when the manager opens the export in Excel (verified: the bare `=2+2` lands unquoted in the output).
- **Suggested fix:** prepend `"﻿"` to the Blob content; prefix values matching `/^[=+\-@]/` with `'` in `csvEscape`.

### MINOR-5 — Dashboard `tel:` link malformed when the customer includes a country code

- **Where:** `assets/js/dashboard.js:285, 289` — `'tel:+1' + phoneDigits` where `phoneDigits` is all digits from the stored phone.
- **What's wrong:** step-4 validation (`book.js:812`) accepts any phone with ≥10 digits, so `+1 (204) 555-0134` is valid input; its digits are `12045550134`, producing `tel:+112045550134` — a number with a doubled country code that won't dial.
- **Failure scenario:** customer enters their phone with `+1`; manager taps the phone link in the detail panel; the call fails.
- **Suggested fix:** strip a leading `1` when 11 digits: `const d10 = phoneDigits.length === 11 && phoneDigits.startsWith("1") ? phoneDigits.slice(1) : phoneDigits;`.

### MINOR-6 — Confirmation not-found state has no `<h1>`

- **Where:** `assets/js/confirmation.js:47–54` — `renderNotFound` renders only an `<h2>Booking not found</h2>`; the success state renders an `<h1>` (line 62), so only the not-found variant leaves the page without a top-level heading.
- **Failure scenario:** screen-reader user lands on `confirmation.html?ref=garbage` and heading navigation starts at level 2 with no level 1 — a hierarchy skip on an entry-point URL (the state is directly reachable from any mistyped/shared link).
- **Suggested fix:** make the not-found heading an `<h1>` (visual style is class-driven, so no CSS change needed).

### MINOR-7 — Detail panel declares `aria-modal` but doesn't trap focus or inert the background

- **Where:** `dashboard.html:117` (`role="dialog" aria-modal="true"`), `assets/js/dashboard.js:349–374`.
- **What's wrong:** initial focus (Close), Escape, and scrim-click all work, but Tab walks out of the "modal" into the obscured page beneath, contradicting the `aria-modal` claim. (STRATEGY §7 explicitly descopes a WCAG audit, hence MINOR, but the attribute promises behavior the code doesn't deliver.)
- **Failure scenario:** keyboard user opens a booking, Tabs past the last action button, and is now operating filter controls hidden behind the scrim.
- **Suggested fix:** either a small Tab-cycle handler within the panel, or drop `aria-modal="true"` and keep it a non-modal `role="dialog"`.

### MINOR-8 — DESIGN.md vs COPY.md conflicts were resolved silently; STRATEGY requires deviations be flagged here

- **Where:** `DESIGN.md:724` specifies the reset control as an in-place button swap ("CONFIRM RESET", 4-second revert); `COPY.md:534–541` specifies a two-step strip with "Yes, reset" / "Keep current data". Built: the COPY version (`dashboard.html:26–34`). Same class: DESIGN's armed-cancel label "CONFIRM CANCELLATION" (`DESIGN.md:849`) vs COPY's "Yes, cancel it" (built, `dashboard.js:314`); DESIGN's not-found button "GO TO HOMEPAGE" (`DESIGN.md:698`) vs COPY's "Back to all services" (built); DESIGN wants the demo notice "directly above the pay button" (`DESIGN.md:636`) — built above the card fields instead (`book.js:702–705`).
- **What's wrong:** the builder's calls are all defensible (COPY is the copy authority, and the notice remains unmissable), but STRATEGY.md's preamble requires deviations to be flagged in REVIEW.md and none were. Recorded here so the spec docs and the build stop disagreeing silently.
- **Suggested fix:** none needed in code; designer should reconcile DESIGN.md §5.12/§5.14/§5.15/§5.19 with COPY.md (COPY won in all four spots).

---

## Contract verification (BRIEF.md hard requirements) — all pass

| Requirement | Verdict | Evidence |
|---|---|---|
| Every service bookable except clinics; clinics visible, front-desk only, no wizard path | **PASS** | Clinics render as `card--clinic` tiles with "Front desk only" tag + `tel:` lines, no `book.html` link (`index.html:136–149`); wizard step 1 lists only sessions/programs/camps groups (`book.js:251–255`); `?service=player-clinic` / any invalid id is rejected to a blank step 1 (`book.js:92–104`, `type !== "info"` gate); dashboard service filter uses `bookableServices()` only. |
| Simulated deposit: format-only validation, no provider, no full card number persisted anywhere (incl. sessionStorage draft) | **PASS** | No `fetch`/XHR/WebSocket/beacon anywhere (grep clean). Card fields have no input bindings — `bind()` covers only participant/contact fields (`book.js:610–625`); card values are read into locals at submit (`book.js:831–834`), the error path re-fills from an in-memory object without touching the draft (`book.js:863–872`), and only `digits.slice(-4)` is stored (`book.js:924`). Smoke test asserts the full number is absent from the stored record. Expiry check accepts the current month and rejects past MM/YY correctly (verified: 08/26 ok, 07/26 expired, 13/27 bad month at a 2026-08-09 clock). |
| Manager dashboard: plain link on every customer page, no auth | **PASS** | `site-footer__manager-link` → `dashboard.html` on `index.html:234`, `book.html:109`, `confirmation.html:51`; `dashboard.html` has no gate of any kind. |
| Zero rounded corners (50% only for true circles) | **PASS** | Universal `*, *::before, *::after { border-radius: 0 }` (`main.css:94`); grep finds no other `border-radius` and no `50%` radius anywhere; no component needs one. |
| Only Geom (600) + Open Sans; only the brief's palette | **PASS** | Two `@font-face` blocks, self-hosted, verified valid wOFF/wOF2 magic bytes; every `font-family` resolves to the two stacks DESIGN.md specifies (Arial/Helvetica fallbacks are per DESIGN §2.2). Hex grep finds only the five brief colors + white; all tints are rgba() of palette colors. |
| No external requests | **PASS** | Grep for `https?://`, CDNs, `@import`, network APIs: only SVG-namespace URIs and inline data: URIs. Served locally, all 13 pages/assets return 200 from `python3 -m http.server`. |
| Runs with `python3 -m http.server` | **PASS** | Verified (see log below). |
| Bookings persist in localStorage, shared customer/manager | **PASS** | Single `rink.bookings` store; wizard appends, dashboard mutates status; smoke test covers seed → create → confirm → cancel → CSV. |

## Spec-fidelity spot checks — pass

- **COPY.md verbatim** (12+ strings checked): hero lede, "Nine bookable services…" intro, all validation messages (step 3/4/5 tables), service-change notice, single-location line, demo-checkout notice, fine print, confirmation block lines, reset strip, cancel-confirm wording, stat labels/sublabels, "Downloads the bookings currently shown." — all character-exact in the HTML/JS.
- **Seed** matches STRATEGY §4.4 exactly: 12 records, 6/4/2 status split (smoke-tested), every location and shape represented, hourly events −2 to +10 days, 6 of 12 created inside the trailing 7 days, 204/431/250 area codes, varied domains. Relative-date materialization uses local calendar components (`seed.js:17–29`) — no UTC day-shift; `parseISODate` (`store.js:143–146`) avoids the classic `new Date("YYYY-MM-DD")` off-by-one (smoke suite passes at UTC+14 and UTC−11).
- **Slot logic**: FNV-1a hold measured at 24.9% over all 3 locations × 45 days with zero fully-held days; hold is stable across loads; seeded bookings correctly block their exact slots via `isSlotBooked` (per-service, per STRATEGY 3.4a's wording); elapsed same-day hours excluded; the double-submit path is closed (button disabled synchronously; the sole submit button being disabled also blocks Enter-key implicit submission).
- **Dashboard logic**: stats formulas match COPY sublabels (trailing 7 days excl. cancelled; deposits = pending+confirmed); transitions enforced in `updateStatus` (cancelled terminal — smoke-tested); sort keys are correctly comparable strings/numbers across all three schedule shapes (verified ordering); CSV quoting of commas/quotes verified field-exact (10 fields with `Smith, "Bobby" O'Neil`).
- **Confirmation `?ref=`**: garbage/missing/absent refs all land on the copy-specced not-found state (never blank, no echo of the input — no XSS surface); page never mutates data.
- **DESIGN tokens/components**: token block, badge variants (pending red / confirmed blue / cancelled hollow), slash motif in exactly its three places, uppercase Geom headings via `text-transform`, icons restricted to the five permitted square-cap SVGs, breakpoints exactly 640/1024 mobile-first, table horizontal-scrolls in a wrapper (`min-width: 960px` + `overflow-x: auto`) instead of collapsing, hero slabs hidden <640px. Anti-AI checklist: no curve, no blur (only zero-blur inset borders + the scrim), no off-palette hue, no emoji, no external request.

## Run log

- `node --check` — all 6 modules + smoke: pass.
- `node test/smoke.mjs` — 8/8 pass; repeated under `TZ=Pacific/Kiritimati` (UTC+14) and `TZ=Pacific/Niue` (UTC−11): pass.
- `python3 -m http.server` + curl — 200 for all 4 pages, 2 stylesheets, JS, all 3 fonts, all 3 images; font/image files verified by magic bytes (wOFF/wOF2/PNG).
- Adversarial probe (scratchpad harness) — CSV escaping, corrupt-storage behavior, `[{}]` crash, expiry matrix, hold-ratio, sort values, stale-ageGroup validation gap: results as cited in the findings above.
