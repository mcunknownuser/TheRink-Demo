# RINK Booking Platform — Copy

**Author: Copywriter. Audience: builder (paste verbatim), designer, reviewer.**
Keyed to `docs/STRATEGY.md` page-by-page and section-by-section. Everything in a "Copy" cell or code block is final copy — paste it as written. Headings render in UPPERCASE Geom semibold; they are written short on purpose. No exclamation marks anywhere on this site.

**Invented facts used consistently throughout (do not vary):**

| Fact | Value |
|---|---|
| RINK Training Centre phone | (204) 560-4233 |
| RINK North — Gateway Arena phone | (204) 334-2210 |
| RINK Kelowna — Rutland Arena phone | (250) 765-4188 |
| Main booking email | bookings@therink.ca |
| Front desk hours (all locations) | Open daily, 8:00 AM–8:00 PM |
| RINK Training Centre address | 660 Century St, Winnipeg, MB |
| RINK North address | 1717 Gateway Rd, Winnipeg, MB |
| RINK Kelowna address | 605 Rutland Rd N, Kelowna, BC |

---

## 0. Global chrome

### 0.1 Page titles (`<title>`)

| Page | Title |
|---|---|
| `index.html` | RINK Booking — The Home of Hockey Development |
| `book.html` | Book — RINK |
| `confirmation.html` | Booking Confirmation — RINK |
| `dashboard.html` | Manager Dashboard — RINK |

### 0.2 Header (customer pages)

- Logo alt text: `RINK — The Home of Hockey Development`
- Header CTA (index and confirmation; suppressed on book.html per strategy): `Book now`

### 0.3 Footer (customer pages)

**Locations block heading:** `Our locations`

```
RINK Training Centre
660 Century St, Winnipeg, MB
(204) 560-4233

RINK North — Gateway Arena
1717 Gateway Rd, Winnipeg, MB
(204) 334-2210

RINK Kelowna — Rutland Arena
605 Rutland Rd N, Kelowna, BC
(250) 765-4188
```

**Contact block heading:** `Front desk`

```
Open daily, 8:00 AM–8:00 PM
bookings@therink.ca
```

**Demo disclaimer line (footer, every customer page):**

```
This is a demonstration booking platform. Deposits are simulated and no payments are processed.
```

**Utility row:**

- Manager dashboard link label: `Manager Dashboard`
- Copyright line: `© 2026 RINK. The Home of Hockey Development.`

---

## 1. `index.html` — Home / Services

### 1.1 Hero

- Headline: `Book your ice`
- Subline:

```
1-on-1 sessions, seasonal programs, camps, and ice rentals at our Winnipeg and Kelowna facilities. A deposit holds your spot. The front desk confirms every booking.
```

- Hero CTA (scrolls to catalog): `See all services`

### 1.2 Services catalog

**Section heading:** `Our services`

**Section intro:**

```
Nine bookable services across three facilities. Sessions and ice are booked by the hour, programs by season, camps by the week. Clinics are registered through the front desk.
```

**Group headings + group sublines:**

| Group | Heading | Subline |
|---|---|---|
| Sessions & Ice | `Sessions & ice` | `Booked by the hour.` |
| Programs | `Programs` | `Seasonal registration.` |
| Camps | `Camps` | `Week-long, Monday to Friday.` |
| Clinics | `Clinics` | `Registered through the front desk.` |

**Bookable tile CTA label (all nine):** `Book`

**Service tiles — name, description, locations line, deposit line:**

The locations line on each tile lists cities per the 3.2 matrix; use the short forms below.

| locationId | Short form for tiles |
|---|---|
| trc | `Training Centre` |
| north | `RINK North` |
| kelowna | `Kelowna` |

**`player-1on1` — Player 1-on-1 Session**

```
One skater, one coach, one hour of ice. Every session is planned around the skater's position and stage of development.
```
- Locations line: `Training Centre · RINK North · Kelowna`
- Deposit line: `$50 deposit per session`

**`goalie-1on1` — Goalie 1-on-1 Session**

```
Individual crease work with a RINK goaltending coach. Movement, tracking, and save selection, built for the goaltender in front of them.
```
- Locations line: `Training Centre · Kelowna`
- Deposit line: `$50 deposit per session`

**`ice-rental` — Ice Rental**

```
Full or half ice by the hour for teams and groups. Run your own practice, skate, or scrimmage.
```
- Locations line: `Training Centre · RINK North · Kelowna`
- Deposit line: `$150 deposit full ice · $75 half ice`

**`dev-program` — Development Programs**

```
Seasonal on-ice development from U7 to U15. Each age division follows the RINK development model, from introductory skills to high-performance work.
```
- Locations line: `Training Centre · RINK North · Kelowna`
- Deposit line: `$150 deposit to register`

**`goalie-dev-program` — Goalie Development Programs**

```
Season-long goaltending development for U9 to U15. Small groups, position-specific instruction, weekly ice.
```
- Locations line: `Training Centre`
- Deposit line: `$150 deposit to register`

**`r1-offseason` — R1 Off-Season Program**

```
A structured off-season training block for U13 to U18 skaters. Spring and summer ice that sets up the fall season.
```
- Locations line: `Training Centre · Kelowna`
- Deposit line: `$200 deposit to register`

**`learn-to-skate` — Learn to Skate**

```
First strides to confident skating. Pre-CanSkate for ages 3–5, CanSkate Stages 1–6 for ages 5–12, and an Adult/Teen stream for 13 and up.
```
- Locations line: `Training Centre · RINK North`
- Deposit line: `$75 deposit to register`

**`figure-skating` — Figure Skating**

```
Intro, CanSkate, and Junior Development & Performance streams at RINK North. Edge work, jumps, and program instruction with dedicated coaches.
```
- Locations line: `RINK North`
- Deposit line: `$75 deposit to register`

**`hockey-camp` — Hockey Camps**

```
Week-long summer and March Break camps, Monday to Friday. Full training days, grouped by age division.
```
- Locations line: `Training Centre · RINK North · Kelowna`
- Deposit line: `$125 deposit per week`

**Clinic tiles** — same layout as bookable tiles; the CTA slot carries a tag plus a contact line. No link to `book.html`.

**`player-clinic` — Player Clinics**

```
Short-format group clinics on specific skills: shooting, skating, small-area play. Scheduled in blocks through the year.
```
- Locations line: `Training Centre · Kelowna`
- Tag (in the CTA slot): `Front desk only`
- Contact line (phone numbers as `tel:` links):

```
Call to register: Winnipeg (204) 560-4233 · Kelowna (250) 765-4188
```

**`goalie-clinic` — Goalie Clinics**

```
Group clinics for skaters who play the position, run by RINK goaltending staff. Scheduled in blocks through the year.
```
- Locations line: `Training Centre · Kelowna`
- Tag (in the CTA slot): `Front desk only`
- Contact line (phone numbers as `tel:` links):

```
Call to register: Winnipeg (204) 560-4233 · Kelowna (250) 765-4188
```

### 1.3 Locations strip

**Section heading:** `Three facilities`

**Section intro:**

```
Two rinks in Winnipeg, one in Kelowna. Front desks are open daily, 8:00 AM–8:00 PM.
```

**Location entries:**

```
RINK Training Centre
Winnipeg, MB
660 Century St · (204) 560-4233
```

```
RINK North — Gateway Arena
Winnipeg, MB
1717 Gateway Rd · (204) 334-2210
```

```
RINK Kelowna — Rutland Arena
Kelowna, BC
605 Rutland Rd N · (250) 765-4188
```

### 1.4 How it works

**Section heading:** `How booking works`

**Step 1**
- Title: `Choose your service`
- Body: `Pick a session, program, camp, or rental. Every service lists its deposit up front.`

**Step 2**
- Title: `Set your schedule`
- Body: `Choose a location, then your time slot, season block, or camp week.`

**Step 3**
- Title: `Hold it with a deposit`
- Body: `Pay the deposit at checkout. The front desk confirms your booking by email or phone. In this demo, checkout is simulated and no card is charged.`

---

## 2. `book.html` — Booking wizard

### 2.1 Page heading

- Heading (above the step indicator): `Make a booking`

### 2.2 Step indicator labels

| Step | Label |
|---|---|
| 1 | `Service` |
| 2 | `Location` |
| 3 | `Schedule` |
| 4 | `Details` |
| 5 | `Review & deposit` |

### 2.3 Wizard controls (all steps)

- Back button: `Back`
- Continue button: `Continue`
- Summary rail heading: `Your booking`
- Summary rail deposit row label: `Deposit`
- Summary rail empty value (choice not made yet): `—`

### 2.4 Step 1 — Service

- Panel title: `Choose your service`
- Microcopy: `Select the service you want to book. The deposit holds your spot.`
- Group headings: same as home page — `Sessions & ice` / `Programs` / `Camps` (no clinics on this step).
- Each option shows service name + deposit line from Section 1.2.
- Notice shown when the customer changes service after completing later steps:

```
Schedule cleared for the new service. Your participant and contact details are saved.
```

- Validation (no service selected): `Select a service to continue.`

### 2.5 Step 2 — Location

- Panel title: `Choose a location`
- Microcopy: `This service runs at the locations below.`
- Location option format: full location name, e.g. `RINK Training Centre — Winnipeg, MB`
- Single-location line (shown when the lone option is auto-selected, with the location name substituted):

```
{Location name} is the only location for this service. You're set here.
```

- Validation (no location selected): `Select a location to continue.`

### 2.6 Step 3 — Schedule (adaptive)

#### Variant A — hourly (`player-1on1`, `goalie-1on1`, `ice-rental`)

- Panel title: `Pick your ice time`
- Microcopy: `Sessions run 60 minutes, starting on the hour, 7:00 AM to 8:00 PM. Book up to 45 days ahead.`
- Ice rental only, shown above the date picker:
  - Field label: `Ice option`
  - Option 1: `Full ice — $150 deposit`
  - Option 2: `Half ice — $75 deposit`
- Date field label: `Date`
- Time grid label: `Start time`
- Grid legend: `Greyed-out times are already booked.`
- All-slots-taken message (every slot unavailable on the chosen date): `No ice left on this date. Try another day.`
- Validation:
  - No ice option (rentals): `Choose full or half ice.`
  - No date: `Pick a date within the next 45 days.`
  - Date outside window: `That date is outside the booking window. Pick a date within the next 45 days.`
  - No time selected: `Select an available start time.`
  - Selected slot became unavailable: `That time was just taken. Pick another start time.`

#### Variant B — seasonal (`dev-program`, `goalie-dev-program`, `r1-offseason`, `learn-to-skate`, `figure-skating`)

- Panel title: `Choose program & season`
- Microcopy: `Pick the participant's program, then a season block. Registration is open for both blocks.`
- Program list label: `Program`
- Season list label: `Season block`
- Program option labels: exactly as listed in STRATEGY 3.3 (e.g. `U11 Advanced`, `Pre-CanSkate (ages 3–5)`).
- Season option labels: exactly as listed in STRATEGY 3.3 (e.g. `Fall 2026 (Sep 14 – Dec 18)`).
- Validation:
  - No program: `Select a program.`
  - No season: `Select a season block.`

#### Variant C — camp (`hockey-camp`)

- Panel title: `Choose a camp week`
- Microcopy: `Camps run Monday to Friday. Weeks that have already started are closed.`
- Week option label: the week label from STRATEGY 3.4 (e.g. `Aug 17–21, 2026`).
- Disabled past-week tag: `Closed`
- Validation (no week selected): `Select an upcoming camp week.`

### 2.7 Step 4 — Details

- Panel title: `Participant & contact`

#### Participant sub-block

- Sub-block heading: `Participant`

**1-on-1 sessions (`player-1on1`, `goalie-1on1`):**
- Microcopy: `Tell us who's on the ice.`
- Field: `Participant full name` — placeholder: `e.g. Owen Fraser`
- Field: `Age division` — dropdown default option: `Select age division` — options: `U7`, `U9`, `U11`, `U13`, `U15`, `U18`, `Junior`, `Adult`
- Field: `Notes (optional)` — placeholder: `Goals or focus areas for this session`

**Seasonal services:**
- Microcopy: `The age division is set by your program choice.`
- Field: `Participant full name` — placeholder: `e.g. Owen Fraser`
- Read-only field label: `Age division` (value = the step-3 program tier)
- Field: `Notes (optional)` — placeholder: `Anything the coaches should know`

**Hockey camps:**
- Microcopy: `Tell us who's coming to camp.`
- Field: `Participant full name` — placeholder: `e.g. Owen Fraser`
- Field: `Age division` — dropdown default option: `Select age division` — options: `U7`, `U9`, `U11`, `U13`, `U15`
- Field: `Notes (optional)` — placeholder: `Anything the coaches should know`

**Ice rentals:**
- Microcopy: `Tell us who's renting the ice.`
- Field: `Group or team name` — placeholder: `e.g. Winnipeg Selects U13`
- Field: `Estimated skaters` — helper text below the field: `1 to 40, including goaltenders.`

#### Contact sub-block

- Sub-block heading: `Booking contact`
- Microcopy (the front-desk note required by strategy):

```
The front desk confirms every booking by email or phone, so make sure we can reach you.
```

- Field: `Full name` — placeholder: `e.g. Dana Fraser`
- Field: `Email` — placeholder: `you@example.com`
- Field: `Phone` — placeholder: `(204) 555-0134`

#### Step 4 validation messages (inline, per field)

| Field | Message |
|---|---|
| Participant name empty/short | `Enter the participant's full name.` |
| Group name empty/short | `Enter your group or team name.` |
| Skater count missing/out of range | `Enter a skater count between 1 and 40.` |
| Age division not selected | `Select an age division.` |
| Contact name empty/short | `Enter your full name.` |
| Email invalid | `Enter a valid email address, like name@example.com.` |
| Phone invalid | `Enter a phone number with at least 10 digits.` |

### 2.8 Step 5 — Review & demo deposit

- Panel title: `Review & pay deposit`
- Microcopy: `Check everything over, then pay the deposit to hold your booking.`
- Edit link label (next to each recap group): `Change`

**Review recap labels** (show only the rows relevant to the booking type):

| Row | Label |
|---|---|
| Service | `Service` |
| Location | `Location` |
| Date | `Date` |
| Time | `Time` |
| Ice option | `Ice option` (values: `Full ice` / `Half ice`) |
| Program | `Program` |
| Season | `Season` |
| Camp week | `Camp week` |
| Participant | `Participant` |
| Age division | `Age division` |
| Group | `Group` |
| Skaters | `Skaters` |
| Notes | `Notes` |
| Contact | `Contact` |
| Email | `Email` |
| Phone | `Phone` |

**Checkout block:**

- Checkout heading: `Deposit checkout`
- Amount line label: `Deposit due today` (value e.g. `$150 CAD`)
- Demo notice (mandatory, visible at the point of payment):

```
Demo checkout. No payment is processed and no card is ever charged. Enter any card details in a valid format to complete the booking.
```

- Field: `Cardholder name` — placeholder: `Name as shown on the card`
- Field: `Card number` — placeholder: `4242 4242 4242 4242`
- Field: `Expiry` — placeholder: `MM/YY`
- Field: `CVC` — placeholder: `123`
- Pay button (amount substituted): `Pay $150 deposit`
- Pay button processing state: `Processing…`
- Fine print under the button:

```
Deposits are held against your booking and refunded if the front desk cancels it. This is a demo transaction.
```

**Checkout validation messages:**

| Field | Message |
|---|---|
| Cardholder empty | `Enter the cardholder's name.` |
| Card number wrong length/characters | `Card numbers are 15 or 16 digits. Check yours and try again.` |
| Expiry wrong format | `Enter the expiry as MM/YY.` |
| Expiry month invalid | `That month doesn't exist. Enter the expiry as MM/YY.` |
| Expiry in the past | `That card has expired. Use an expiry date in the future.` |
| CVC invalid | `Enter the 3 or 4 digit code on the back of the card.` |

---

## 3. `confirmation.html` — Confirmation

### 3.1 Confirmation block

- Heading: `Booking received`
- Booking reference label: `Your booking reference`
- Reference value: rendered large, e.g. `RNK-40917`
- Line under the reference:

```
Keep this reference. It's how the front desk finds your booking.
```

- Status line: `Status: pending confirmation`
- Front-desk expectation line:

```
The front desk reviews every booking and confirms by email or phone, usually within one business day.
```

- Demo disclaimer (repeated here per strategy):

```
This was a demo transaction. No payment was processed and your card was not charged.
```

### 3.2 Booking summary

- Section heading: `Booking summary`
- Row labels: reuse the review recap labels from Section 2.8 exactly.
- Deposit row label: `Deposit paid` (value e.g. `$150 CAD · card ending 4242`)

### 3.3 Next actions

- Primary link (→ `index.html`): `Back to all services`
- Secondary link (→ `book.html`): `Book another`

### 3.4 Not-found state (bad or missing `?ref=`)

- Heading: `Booking not found`
- Body:

```
We couldn't find a booking for that reference. Check the link from your confirmation, or start a new booking.
```

- Link (→ `index.html`): `Back to all services`

---

## 4. `dashboard.html` — Manager dashboard

### 4.1 Dashboard header

- Identity label: `Manager Dashboard`
- Back link (→ `index.html`): `Back to booking site`
- Reset control label: `Reset demo data`
- Reset confirmation (two-step, before anything is cleared):

```
Reset demo data? This removes every booking in this browser and restores the original sample set.
```

- Reset confirm button: `Yes, reset`
- Reset cancel button: `Keep current data`

### 4.2 Summary stats row

| Tile | Label | Sublabel |
|---|---|---|
| 1 | `Bookings this week` | `Last 7 days, excluding cancelled` |
| 2 | `Deposits collected` | `Pending and confirmed` |
| 3 | `Pending` | `Waiting on confirmation` |
| 4 | `Active bookings` | `All non-cancelled` |

### 4.3 Filter / search bar

- Service filter label: `Service` — default option: `All services`
- Location filter label: `Location` — default option: `All locations`
- Status filter label: `Status` — default option: `All statuses` — options: `Pending`, `Confirmed`, `Cancelled`
- Search field label: `Search` — placeholder: `Ref, contact, or participant`
- Matching count line (numbers substituted): `Showing 8 of 12 bookings`
- Clear control: `Clear filters`

### 4.4 Bookings table

**Column headers:**

`Ref` · `Created` · `Service` · `Location` · `Schedule` · `Participant` · `Deposit` · `Status`

**Status tag labels:** `Pending` / `Confirmed` / `Cancelled`

**Empty state (filters match nothing):**

```
No bookings match your filters.
```
- Action: `Clear filters`

**Empty state (store empty, pre-seed edge case):**

```
No bookings yet. Reset demo data to load the sample set.
```

### 4.5 Booking detail panel

- Panel heading: the booking reference, e.g. `RNK-40917`
- Section labels: `Schedule` · `Participant` · `Contact` · `Deposit`
- Deposit line format: `$150 CAD · card ending 4242`
- Created line label: `Booked` (value e.g. `Aug 9, 2026, 2:32 PM`)
- Close control label: `Close`

**Actions:**

- Confirm button (pending only): `Confirm booking`
- Cancel button (pending or confirmed): `Cancel booking`
- Cancel confirmation wording (second step, ref substituted):

```
Cancel RNK-40917? Cancelled bookings can't be reactivated, and the deposit is excluded from totals.
```

- Cancel confirm button: `Yes, cancel it`
- Cancel back-out button: `Keep booking`

### 4.6 Export

- Button label: `Export CSV`
- Helper text (near the button): `Downloads the bookings currently shown.`
