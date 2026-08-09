# RINK Booking Platform — Design System

**Author: Visual designer. Audience: builder, reviewer.**
The builder implements this exactly. Every value here is a decision. If a component you need is not specified, build it from the tokens and the anti-AI checklist (Section 8) — do not import a pattern from elsewhere.

File-path assumption: stylesheets live at `assets/css/main.css` (+ `assets/css/dashboard.css` for dashboard-only rules). All font URLs below are relative to `assets/css/`. STRATEGY.md leaves file layout to the builder — if you put CSS at `/css/` instead, the font URLs become `../assets/fonts/...`. Nothing else in this doc changes.

---

## 1. Design concept — "Board and Ice"

The whole site is built like a rink: flat white ice, near-black boards, red and blue lines. Two surfaces only — white/light-gray "ice" sections and near-black "board" sections — separated by hard horizontal edges, never gradients. RINK Red `#ea0029` is reserved for one job: **action and attention** (CTAs, selected states, the pending count, error text). RINK Blue `#0032a0` is the **institutional** color: informational notices, confirmed status, the clinics variant. Everything structural is drawn with solid borders and flat color blocks — no shadows, no glass, no rounding, anywhere.

The signature motif is the **slash**: skewed rectangles (`skewX(-14deg)`) echoing a skate cut across ice. It appears in exactly three places — the hero's big diagonal color block, the small red+blue slash pair beside section headings, and the diagonal strike across unavailable time slots. Used sparingly, it is unmistakably ours; used everywhere it becomes wallpaper. Three appearances, no more.

What makes it read as RINK and not as a template: UPPERCASE Geom 600 on every heading, button, and stat; a 3px red keyline under the dark header on every page; 4px color-edge accents on cards instead of drop shadows; dense 13–14px data typography on the dashboard instead of airy 18px "SaaS" text; and a palette that never leaves five colors plus white. It should look like the facility's own front-desk software — confident, structured, slightly severe.

---

## 2. Foundations — paste-ready CSS

### 2.1 `@font-face` (top of `assets/css/main.css`)

```css
@font-face {
  font-family: "Geom";
  src: url("../fonts/geom-semibold.woff2") format("woff2"),
       url("../fonts/geom-semibold.woff") format("woff");
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Open Sans";
  src: url("../fonts/opensans-variable.woff2") format("woff2-variations");
  font-weight: 300 800;
  font-style: normal;
  font-display: swap;
}
```

Geom has **one weight: 600**. Never declare or request any other weight for Geom; hierarchy within Geom comes from size, case, color, and letter-spacing only. `font-synthesis: none` on `html` (below) prevents the browser faking bold/italic Geom.

### 2.2 Custom properties

```css
:root {
  /* ---- Palette (BRIEF.md — the only hues on the site) ---- */
  --red:        #ea0029;   /* action, selected, attention, errors */
  --blue:       #0032a0;   /* secondary: info notices, confirmed, clinics */
  --ink:        #393939;   /* primary text on light */
  --black:      #151414;   /* header, footer, hero, summary rail */
  --dark:       #1e1e1e;   /* alternate dark band (locations strip) */
  --gray:       #f4f4f4;   /* light section bg, dashboard page bg, disabled */
  --white:      #ffffff;

  /* ---- Alpha tints (palette colors only — no new hues) ---- */
  --ink-70:     rgba(57, 57, 57, 0.72);   /* muted text on light */
  --ink-45:     rgba(57, 57, 57, 0.45);   /* disabled text, cancelled rows */
  --line:       rgba(21, 20, 20, 0.25);   /* standard border on light */
  --line-soft:  rgba(21, 20, 20, 0.12);   /* hairline dividers, table rows */
  --hover-tint: rgba(21, 20, 20, 0.04);   /* row/slot hover wash */
  --red-tint:   rgba(234, 0, 41, 0.05);   /* selected-card wash, error field bg */
  --white-70:   rgba(255, 255, 255, 0.70);/* body text on dark */
  --white-55:   rgba(255, 255, 255, 0.55);/* labels on dark */
  --white-line: rgba(255, 255, 255, 0.18);/* dividers on dark */
  --scrim:      rgba(21, 20, 20, 0.55);   /* detail-panel overlay only */

  /* ---- Type ---- */
  --font-head: "Geom", Arial, sans-serif;
  --font-body: "Open Sans", Arial, Helvetica, sans-serif;

  --fs-display: clamp(2.25rem, 1.5rem + 3.5vw, 3.5rem); /* hero H1 */
  --fs-h1:   2rem;      /* 32px — page titles */
  --fs-h2:   1.5rem;    /* 24px — section headings */
  --fs-h3:   1.125rem;  /* 18px — card/panel headings */
  --fs-stat: 2.25rem;   /* 36px — dashboard stat numbers, booking ref */
  --fs-body: 1rem;      /* 16px */
  --fs-sm:   0.875rem;  /* 14px — descriptors, buttons, table cells */
  --fs-xs:   0.8125rem; /* 13px — dense table cells, error messages */
  --fs-cap:  0.75rem;   /* 12px — labels, kickers */
  --fs-tag:  0.6875rem; /* 11px — badges, column headers */

  --ls-head: 0.04em;    /* headings */
  --ls-btn:  0.08em;    /* buttons, badges, labels */
  --ls-kick: 0.14em;    /* kickers */

  /* ---- Spacing (4px base) ---- */
  --sp-1: 0.25rem;  /*  4px */
  --sp-2: 0.5rem;   /*  8px */
  --sp-3: 0.75rem;  /* 12px */
  --sp-4: 1rem;     /* 16px */
  --sp-5: 1.5rem;   /* 24px */
  --sp-6: 2rem;     /* 32px */
  --sp-7: 3rem;     /* 48px */
  --sp-8: 4rem;     /* 64px */
  --sp-9: 6rem;     /* 96px */

  /* ---- Structure ---- */
  --radius: 0;               /* never override; 50% only for true circles */
  --edge: 4px;               /* the color-edge accent width */
  --border: 1px solid var(--line);
  --border-strong: 2px solid var(--black);
  --container: 1200px;
  --container-wide: 1360px;  /* dashboard */
  --header-h: 72px;
  --speed: 0.15s;            /* all transitions: 0.15s ease, colors/borders only */
}
```

### 2.3 Base element rules

```css
*, *::before, *::after { box-sizing: border-box; border-radius: 0; }

html {
  font-synthesis: none;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--fs-body);
  font-weight: 400;
  line-height: 1.6;
  color: var(--ink);
  background: var(--white);
}

h1, h2, h3, h4 {
  font-family: var(--font-head);
  font-weight: 600;               /* the only Geom weight */
  text-transform: uppercase;
  letter-spacing: var(--ls-head);
  line-height: 1.15;
  margin: 0 0 var(--sp-4);
}

a { color: var(--ink); text-decoration: underline; text-underline-offset: 3px; }
a:hover { color: var(--red); }

::selection { background: var(--red); color: var(--white); }

:focus-visible { outline: 2px solid var(--red); outline-offset: 2px; }
.on-dark :focus-visible,
.site-header :focus-visible,
.site-footer :focus-visible { outline-color: var(--white); }

img { max-width: 100%; display: block; }
```

The universal `border-radius: 0` is deliberate belt-and-braces: even a forgotten default (native inputs, buttons) gets squared. The only permitted override is `border-radius: 50%` on a genuinely circular element — as of this spec, **no component needs one**.

---

## 3. Typography system

| Role | Font / weight | Size | Case / tracking | Line-height | Color |
|---|---|---|---|---|---|
| Hero display (H1, index) | Geom 600 | `--fs-display` | UPPERCASE, `--ls-head` | 1.1 | `--white` |
| Page title (H1, book/confirm/dash) | Geom 600 | `--fs-h1` 32px | UPPERCASE, `--ls-head` | 1.15 | `--black` (or `--white` on dark) |
| Section heading (H2) | Geom 600 | `--fs-h2` 24px | UPPERCASE, `--ls-head` | 1.2 | `--black` |
| Card / panel heading (H3) | Geom 600 | `--fs-h3` 18px | UPPERCASE, `--ls-head` | 1.25 | `--black` |
| Kicker (above H1/H2) | Geom 600 | `--fs-cap` 12px | UPPERCASE, `--ls-kick` | 1 | `--red` (on dark too — it passes at this size only because it sits beside, never carries, meaning; the heading below repeats the context) |
| Stat number / booking ref | Geom 600 | `--fs-stat` 36px | UPPERCASE, `0.02em` | 1 | `--black` / `--white` |
| Buttons | Geom 600 | `--fs-sm` 14px | UPPERCASE, `--ls-btn` | 1 | per variant (§5.1) |
| Badges / tags | Geom 600 | `--fs-tag` 11px | UPPERCASE, `--ls-btn` | 1 | per status (§5.13) |
| Deposit amounts (cards, rail) | Geom 600 | `--fs-sm`–`--fs-h3` | as-is (digits) | 1 | `--red` |
| Body copy | Open Sans 400 | `--fs-body` 16px | sentence case | 1.6 | `--ink` |
| Body on dark | Open Sans 400 | `--fs-body` | sentence case | 1.6 | `--white-70` |
| Card descriptors, help text | Open Sans 400 | `--fs-sm` 14px | sentence case | 1.5 | `--ink-70` |
| Form labels | Open Sans 700 | `--fs-cap` 12px | UPPERCASE, `0.06em` | 1.2 | `--ink` |
| Form inputs | Open Sans 400 | 16px (never smaller — prevents iOS zoom) | as typed | 1.4 | `--ink` |
| Table cells | Open Sans 400 | `--fs-xs` 13px | as-is | 1.4 | `--ink` |
| Table column headers | Open Sans 700 | `--fs-tag` 11px | UPPERCASE, `0.06em` | 1.2 | `--ink-70` |
| Error messages | Open Sans 600 | `--fs-xs` 13px | sentence case | 1.4 | `--red` |
| Footer utility / disclaimers | Open Sans 400 | `--fs-cap`–`--fs-xs` | sentence case | 1.5 | `--white-55` on dark |

Division of labor, memorizable: **Geom shouts** (headings, buttons, nav labels, stats, badges, deposit figures — always uppercase or digits, always tracked). **Open Sans works** (paragraphs, labels, inputs, tables, fine print — never uppercase except tiny labels/column heads). Never set paragraph text in Geom; never set a heading or button in Open Sans.

Numbers that align (table Deposit column, slot times): add `font-variant-numeric: tabular-nums;`.

---

## 4. Iconography

Icons only where a label alone fails. Inline SVG, stroke-based, sharp joints — **square caps, miter joins, no rounding**. Never emoji, never icon fonts, never filled blob icons.

Template — every icon on the site derives from this:

```html
<svg class="icon" width="16" height="16" viewBox="0 0 16 16" fill="none"
     stroke="currentColor" stroke-width="2" stroke-linecap="square"
     stroke-linejoin="miter" aria-hidden="true">…</svg>
```

```css
.icon { display: inline-block; vertical-align: -2px; flex: none; }
```

The complete permitted set (paths for the 16-box):

| Icon | Path data | Used in |
|---|---|---|
| chevron-down | `<path d="M3 5.5 8 10.5 13 5.5"/>` | select fields (as data-URI bg, §5.7), sortable headers |
| arrow-right | `<path d="M2 8 H13 M9 4 L13 8 L9 12"/>` | card CTAs, "next actions" links |
| close | `<path d="M4 4 L12 12 M12 4 L4 12"/>` | detail-panel close |
| info-square | `<rect x="2" y="2" width="12" height="12"/><path d="M8 7 V11.5 M8 4.5 V5"/>` | demo-deposit notice |
| check | `<path d="M3 8.5 L6.5 12 L13 4.5"/>` | confirmation block, completed wizard steps |

Nothing else. If a new icon feels needed, it probably isn't — use a text label.

---

## 5. Components

All transitions in this section: `transition: background-color var(--speed) ease, border-color var(--speed) ease, color var(--speed) ease;` — never transition transform, shadow, or size.

### 5.1 Buttons

```css
.btn {
  display: inline-block;
  font-family: var(--font-head);
  font-weight: 600;
  font-size: var(--fs-sm);
  text-transform: uppercase;
  letter-spacing: var(--ls-btn);
  line-height: 1;
  text-decoration: none;
  text-align: center;
  padding: 15px 28px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: background-color var(--speed) ease,
              border-color var(--speed) ease,
              color var(--speed) ease;
}

/* Primary — red. One per view region; it is THE action. */
.btn--primary { background: var(--red); color: var(--white); border-color: var(--red); }
.btn--primary:hover { background: var(--black); border-color: var(--black); color: var(--white); }

/* Secondary — outline on light backgrounds. */
.btn--secondary { background: transparent; color: var(--black); border-color: var(--black); }
.btn--secondary:hover { background: var(--black); color: var(--white); }

/* On-dark — outline on dark backgrounds (header, footer, dark panels). */
.btn--on-dark { background: transparent; color: var(--white); border-color: var(--white); }
.btn--on-dark:hover { background: var(--white); color: var(--black); }

/* Danger outline — dashboard Cancel action only. */
.btn--danger { background: transparent; color: var(--red); border-color: var(--red); }
.btn--danger:hover, .btn--danger.is-armed { background: var(--red); color: var(--white); }

/* Size modifier */
.btn--small { padding: 10px 18px; font-size: var(--fs-cap); }

.btn:disabled, .btn[aria-disabled="true"] {
  opacity: 0.45; cursor: not-allowed;
  background: revert-layer; /* i.e. no hover swap — builder: also guard hover styles with :not(:disabled) */
}
.btn--block { display: block; width: 100%; }
```

Hover language everywhere: a **flat swap within the palette** (red→black, outline→filled). No darkened tints, no gradients, no lift/translate, no glow.

Text-link action (e.g. "clear filters", review-step "Edit"): Geom 600, `--fs-cap`, uppercase, `--ls-btn`, color `--red`, no underline at rest, `text-decoration: underline` on hover, background none, border none, padding 0.

### 5.2 Header (customer pages: index, book, confirmation)

Dark bar with the red keyline — the single most identifying element, identical on every customer page.

```css
.site-header {
  position: sticky; top: 0; z-index: 100;
  background: var(--black);
  border-bottom: 3px solid var(--red);
  height: var(--header-h);
}
.site-header__inner {
  max-width: var(--container); margin: 0 auto; padding: 0 var(--sp-5);
  height: 100%; display: flex; align-items: center; justify-content: space-between;
}
.site-header__logo img { height: 36px; width: auto; } /* logo-inv.png, 3:1 → ~108px wide */
```

- Logo: `assets/img/logo-inv.png`, links to `index.html`. `alt="RINK — The Home of Hockey Development"` (the tagline lives in the alt and the hero; the header stays clean).
- Right slot on `index.html` and `confirmation.html`: one `.btn--primary .btn--small` → `book.html`.
- Right slot on `book.html`: the CTA is **replaced** by the tagline as plain text — Geom 600, `--fs-cap`, uppercase, `--ls-kick`, color `--white-55`. No link that could restart the flow.
- Mobile (<640px): header height 60px, logo 28px, padding `0 var(--sp-4)`.

### 5.3 Footer (customer pages)

```css
.site-footer { background: var(--black); color: var(--white-70); margin-top: var(--sp-9); }
.site-footer__main {
  max-width: var(--container); margin: 0 auto;
  padding: var(--sp-8) var(--sp-5) var(--sp-7);
  display: grid; grid-template-columns: 2fr 1fr 1fr; gap: var(--sp-7);
}
.site-footer h3 { color: var(--white); font-size: var(--fs-sm); margin-bottom: var(--sp-4); }
.site-footer a { color: var(--white-70); }
.site-footer a:hover { color: var(--white); }
.site-footer__utility {
  border-top: 1px solid var(--white-line);
  padding: var(--sp-4) var(--sp-5);
  max-width: var(--container); margin: 0 auto;
  display: flex; justify-content: space-between; gap: var(--sp-4); flex-wrap: wrap;
  font-size: var(--fs-cap); color: var(--white-55);
}
.site-footer__manager-link {
  color: var(--white-55); text-decoration: underline; text-underline-offset: 3px;
  font-size: var(--fs-cap);
}
.site-footer__manager-link:hover { color: var(--white); }
```

- Column 1: `logo-inv.png` at height 40px + tagline line (COPY.md) at `--fs-sm`.
- Column 2: "Locations" — the three facilities, one per line, city/province in `--white-55`.
- Column 3: "Contact" — front-desk line, `tel:` + `mailto:` links (COPY.md).
- Utility row: left = demo disclaimer line; right = **"Manager Dashboard" link** (`.site-footer__manager-link`) → `dashboard.html`. Discreet by size and color, findable by position — never a button, never red.
- Mobile: columns stack (`grid-template-columns: 1fr`), utility row stacks left-aligned.

### 5.4 Hero (`index.html`)

Dark, typographic, with the signature diagonal. No photos exist, so color geometry does the athletic work.

```css
.hero {
  position: relative; overflow: hidden;
  background: var(--black); color: var(--white);
  padding: var(--sp-9) 0;
}
/* Blue slab bleeding off the right edge */
.hero::before {
  content: ""; position: absolute; top: -10%; bottom: -10%;
  right: -140px; width: 420px;
  background: var(--blue);
  transform: skewX(-14deg);
}
/* Red slash riding its leading edge */
.hero::after {
  content: ""; position: absolute; top: -10%; bottom: -10%;
  right: 316px; width: 18px;
  background: var(--red);
  transform: skewX(-14deg);
}
.hero__inner {
  position: relative; z-index: 1;
  max-width: var(--container); margin: 0 auto; padding: 0 var(--sp-5);
}
.hero__kicker {
  font-family: var(--font-head); font-weight: 600; font-size: var(--fs-cap);
  text-transform: uppercase; letter-spacing: var(--ls-kick); color: var(--red);
  margin-bottom: var(--sp-3);
}
.hero h1 { font-size: var(--fs-display); max-width: 640px; margin-bottom: var(--sp-4); color: var(--white); }
.hero__lede { font-size: var(--fs-body); color: var(--white-70); max-width: 520px; margin: 0 0 var(--sp-6); }
```

- Content: kicker (tagline treatment, COPY.md), H1, one short lede, one `.btn--primary` → `#services` anchor. Left-aligned. Never centered, never a carousel.
- ≤1024px: `.hero::before { right: -220px; }` (slab narrows off-canvas); ≤640px: hide both pseudo-elements (`display: none`) and reduce padding to `var(--sp-7) 0` — on phones the red header keyline and typography carry the brand.

### 5.5 Section headings + slash pair (index sections, wizard step titles)

```css
.slash-pair { position: relative; display: inline-block; width: 30px; height: 18px; margin-right: var(--sp-3); }
.slash-pair::before, .slash-pair::after {
  content: ""; position: absolute; top: 0; bottom: 0; width: 9px; transform: skewX(-14deg);
}
.slash-pair::before { left: 4px; background: var(--red); }
.slash-pair::after  { left: 18px; background: var(--blue); }

.section-head { display: flex; align-items: center; margin-bottom: var(--sp-6); }
.section-head h2 { margin: 0; }
```

Used before H2s on `index.html` (Services, Locations, How it works) and before the wizard's step-panel H2. Nowhere else.

Section band rhythm on `index.html`: hero (`--black`) → services (`--white`) → locations strip (`--dark`) → how-it-works (`--gray`) → footer (`--black`). Bands meet at hard edges — no separators, no waves, no gradients.

### 5.6 Service catalog cards (`index.html`)

Grid: `display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-5);` per category group (2-up ≤1024px, 1-up ≤640px). Category groups introduced by an H3 group heading with a 2px solid `--black` underline (`border-bottom: 2px solid var(--black); padding-bottom: var(--sp-2); margin-bottom: var(--sp-5);`).

```css
.card {
  display: flex; flex-direction: column; gap: var(--sp-3);
  background: var(--white);
  border: var(--border);
  border-left: var(--edge) solid var(--red);
  padding: var(--sp-5);
  transition: border-color var(--speed) ease;
}
.card:hover { border-color: var(--black); border-left-color: var(--red); }

.card h3 { margin: 0; }
.card__desc { font-size: var(--fs-sm); color: var(--ink-70); margin: 0; }
.card__meta {
  font-size: var(--fs-cap); text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--ink-70); margin-top: auto;   /* pins meta+CTA to the bottom, equal-height cards */
}
.card__deposit {
  font-family: var(--font-head); font-weight: 600; font-size: var(--fs-sm);
  color: var(--red); text-transform: uppercase; letter-spacing: var(--ls-btn);
}
.card .btn { margin-top: var(--sp-3); }
```

Bookable card contents, top→bottom: H3 name · descriptor · (auto gap) · locations line (e.g. "TRC · NORTH · KELOWNA" — short labels, COPY.md) · deposit line ("DEPOSIT $50" — ice rental shows "DEPOSIT $75–$150") · `.btn--secondary .btn--small .btn--block` "BOOK" → `book.html?service=<id>`. On card hover the button pre-fills: `.card:hover .btn--secondary { background: var(--black); color: var(--white); }`.

**Clinic variant** — same card, same size, same slots, deliberately different color logic:

```css
.card--clinic { border-left-color: var(--blue); }
.card--clinic:hover { border-color: var(--line); border-left-color: var(--blue); } /* no interactive hover */
.card__tag {
  display: inline-block; align-self: flex-start;
  font-family: var(--font-head); font-weight: 600; font-size: var(--fs-tag);
  text-transform: uppercase; letter-spacing: var(--ls-btn);
  background: var(--blue); color: var(--white); padding: 5px 8px;
}
```

In the CTA slot: `.card__tag` "FRONT DESK ONLY" + a `--fs-sm` contact line with a `tel:` link (COPY.md). **No deposit line, no button, no link to `book.html`.** Blue edge + blue tag = "institutional, talk to us", visually equal in weight to red = "bookable".

### 5.7 Form fields

```css
.field { margin-bottom: var(--sp-5); }
.field__label {
  display: block; font-family: var(--font-body); font-weight: 700;
  font-size: var(--fs-cap); text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--ink); margin-bottom: var(--sp-2);
}
.field__label .optional { font-weight: 400; color: var(--ink-70); text-transform: none; letter-spacing: 0; }

.input {
  display: block; width: 100%;
  font-family: var(--font-body); font-size: 1rem; color: var(--ink);
  background: var(--white);
  border: 1px solid rgba(57, 57, 57, 0.4);
  padding: 12px 14px;
  transition: border-color var(--speed) ease, box-shadow var(--speed) ease;
}
.input:focus {
  outline: none;
  border-color: var(--red);
  box-shadow: inset 0 0 0 1px var(--red);   /* 2px red edge total; zero blur — crisp, not a glow */
}
.input::placeholder { color: var(--ink-45); }

/* Error state */
.field.has-error .input { border-color: var(--red); box-shadow: inset 0 0 0 1px var(--red); background: var(--red-tint); }
.field__error {
  display: block; margin-top: var(--sp-2);
  font-size: var(--fs-xs); font-weight: 600; color: var(--red);
}

/* Selects: same box, custom sharp chevron */
select.input {
  appearance: none; -webkit-appearance: none;
  padding-right: 40px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23393939' stroke-width='2'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 14px center;
}

textarea.input { min-height: 96px; resize: vertical; }
```

- Error messages state what to fix ("Enter a phone number with at least 10 digits"), never just "Invalid". Wording from COPY.md; builder wires `aria-invalid="true"` and `aria-describedby` to the error element, and focuses the first invalid field on Continue (per STRATEGY 3.5).
- Native `input[type="date"]` gets `.input` styling as-is; do not build a custom calendar.
- Two-up field rows (expiry/CVC, name/age-group): `.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-4); }`, collapsing to `1fr` ≤640px.

### 5.8 Wizard progress indicator (`book.html`)

Five numbered squares with connecting rules. Squares, not circles — this is the brand.

```css
.steps { display: flex; align-items: flex-start; margin: var(--sp-6) 0; padding: 0; list-style: none; }
.steps__item { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; }
/* connector */
.steps__item + .steps__item::before {
  content: ""; position: absolute; top: 16px; right: 50%;
  width: 100%; height: 2px; background: var(--line);
  transform: translateX(-16px); z-index: 0;
  /* builder: simplest is width calc(100% - 32px); exact math is builder's call, the look is a 2px line between squares */
}
.steps__num {
  position: relative; z-index: 1;
  width: 32px; height: 32px; display: grid; place-items: center;
  font-family: var(--font-head); font-weight: 600; font-size: var(--fs-sm);
  background: var(--white); color: var(--ink-45);
  border: 1px solid rgba(57, 57, 57, 0.4);
}
.steps__label {
  margin-top: var(--sp-2);
  font-family: var(--font-head); font-weight: 600; font-size: var(--fs-tag);
  text-transform: uppercase; letter-spacing: var(--ls-btn); color: var(--ink-70);
  text-align: center;
}

/* States */
.steps__item.is-current .steps__num { background: var(--red); border-color: var(--red); color: var(--white); }
.steps__item.is-current .steps__label { color: var(--black); }
.steps__item.is-done .steps__num { background: var(--black); border-color: var(--black); color: var(--white); cursor: pointer; }
.steps__item.is-done + .steps__item::before { background: var(--black); }
.steps__item.is-done:hover .steps__label { text-decoration: underline; }
```

- Completed squares are buttons (go back); future squares are inert (`aria-disabled`, no pointer styles). Completed squares may show the check icon instead of the number — builder's choice, but pick one and keep it.
- ≤640px: hide all `.steps__label`s; below the row show one line — `.steps__current-label`: "STEP 2 OF 5 — LOCATION" in Geom `--fs-cap`, uppercase, `--ls-btn`, color `--black`.

### 5.9 Wizard layout, step panel, option cards

```css
.wizard {
  max-width: var(--container); margin: 0 auto; padding: 0 var(--sp-5) var(--sp-8);
  display: grid; grid-template-columns: 1fr 340px; gap: var(--sp-6); align-items: start;
}
.step-panel { background: var(--white); border: var(--border); padding: var(--sp-6); }
.step-panel__controls {
  display: flex; justify-content: space-between; align-items: center;
  border-top: 1px solid var(--line-soft); padding-top: var(--sp-5); margin-top: var(--sp-6);
}
```

Controls row: left = `.btn--secondary` "BACK" (hidden on step 1), right = `.btn--primary` "CONTINUE" (step 5: the pay button, §5.12). Continue is enabled but validates on click, showing inline errors (per STRATEGY) — never a mysteriously dead disabled button.

**Option cards** — one pattern for step 1 (services), step 2 (locations), step 3 seasonal (programs, then seasons) and camp weeks. Stacked full-width rows; grid `repeat(2, 1fr)` for step 1's nine services at ≥1024px.

```css
.option { position: relative; }
.option input[type="radio"] { position: absolute; opacity: 0; pointer-events: none; }
.option__body {
  display: flex; justify-content: space-between; align-items: baseline; gap: var(--sp-4);
  background: var(--white);
  border: 1px solid rgba(57, 57, 57, 0.4);
  padding: var(--sp-4) var(--sp-5);
  cursor: pointer;
  transition: border-color var(--speed) ease, background-color var(--speed) ease;
}
.option__body:hover { border-color: var(--black); }
.option input:checked + .option__body {
  border-color: var(--black);
  box-shadow: inset 0 0 0 1px var(--black),          /* thickens to 2px without layout shift */
              inset var(--edge) 0 0 0 var(--red);    /* red left edge, also shift-free */
  background: var(--red-tint);
}
.option input:focus-visible + .option__body { outline: 2px solid var(--red); outline-offset: 2px; }

.option__name { font-family: var(--font-head); font-weight: 600; font-size: var(--fs-sm); text-transform: uppercase; letter-spacing: var(--ls-head); color: var(--black); }
.option__sub  { font-size: var(--fs-xs); color: var(--ink-70); }
.option__price { font-family: var(--font-head); font-weight: 600; font-size: var(--fs-sm); color: var(--red); white-space: nowrap; }

.option.is-disabled .option__body {
  background: var(--gray); border-color: var(--line-soft);
  color: var(--ink-45); cursor: default; pointer-events: none;
}
.option.is-disabled .option__name, .option.is-disabled .option__price { color: var(--ink-45); }
```

- Step 1 rows: name + deposit (`.option__price`). Step 2: location name + city/province (`.option__sub`); a lone auto-selected location renders checked + `pointer-events: none` with the "only location" line (COPY.md) beneath. Step 3 seasonal: program rows (name + age note), then season rows (label with date range). Camp weeks: week label + past weeks as `.is-disabled` with a right-aligned Geom `--fs-tag` "PAST" tag in `--ink-45`.
- Real radio inputs, visually hidden as above — keyboard and screen-reader behavior for free.

### 5.10 Time-slot grid (hourly services, step 3)

```css
.slot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: var(--sp-2);
  margin-top: var(--sp-4);
}
.slot {
  font-family: var(--font-body); font-weight: 600; font-size: var(--fs-sm);
  font-variant-numeric: tabular-nums;
  padding: 10px 0; text-align: center;
  background: var(--white); color: var(--ink);
  border: 1px solid rgba(57, 57, 57, 0.4);
  cursor: pointer;
  transition: border-color var(--speed) ease, background-color var(--speed) ease;
}
.slot:hover:not(:disabled) { border-color: var(--black); background: var(--hover-tint); }
.slot.is-selected { background: var(--red); border-color: var(--red); color: var(--white); }
.slot:disabled {
  background: var(--gray); border-color: var(--line-soft); color: var(--ink-45);
  cursor: not-allowed;
  /* the skate-cut strike — hard-stop stripe, reads as a flat diagonal line */
  background-image: linear-gradient(135deg,
    transparent 45%, rgba(57, 57, 57, 0.3) 45%,
    rgba(57, 57, 57, 0.3) 55%, transparent 55%);
}
```

- `<button type="button">` elements, label "07:00" (24h, per data model). Held and booked slots are visually identical — one disabled treatment.
- Legend above the grid: three 14×14px squares (available = white/1px border, unavailable = the disabled treatment, selected = solid red) each with an Open Sans `--fs-cap` label. Squares, not dots.
- Ice-rental full/half toggle above the date picker: two `.option` rows ("FULL ICE — DEPOSIT $150" / "HALF ICE — DEPOSIT $75").

### 5.11 Summary rail (`book.html`)

Dark panel — the brand anchor inside the white wizard.

```css
.rail {
  position: sticky; top: calc(var(--header-h) + var(--sp-5));
  background: var(--black); color: var(--white);
  border-top: var(--edge) solid var(--red);
  padding: var(--sp-5);
}
.rail h2 { color: var(--white); font-size: var(--fs-h3); margin-bottom: var(--sp-5); }
.rail__row { display: flex; justify-content: space-between; gap: var(--sp-4); padding: var(--sp-2) 0; }
.rail__label { font-size: var(--fs-tag); text-transform: uppercase; letter-spacing: var(--ls-btn); color: var(--white-55); }
.rail__value { font-size: var(--fs-sm); font-weight: 600; color: var(--white); text-align: right; }
.rail__value:empty::before { content: "—"; color: var(--white-55); font-weight: 400; }
.rail__total {
  display: flex; justify-content: space-between; align-items: baseline;
  border-top: 1px solid var(--white-line);
  margin-top: var(--sp-4); padding-top: var(--sp-4);
}
.rail__total-label { font-family: var(--font-head); font-weight: 600; font-size: var(--fs-cap); text-transform: uppercase; letter-spacing: var(--ls-btn); color: var(--white); }
.rail__total-amount { font-family: var(--font-head); font-weight: 600; font-size: var(--fs-h2); color: var(--red); }
```

Rows: Service · Location · Schedule (rendered per type) · Participant/Group — unfilled rows show the em-dash placeholder, so the rail's shape is stable from step 1. Total row: "DEPOSIT DUE" + amount (red 24px on black — passes large-text contrast at 3.9:1).

**Narrow placement (decision delegated by STRATEGY §8):** at ≤1024px the rail loses `position: sticky` and moves **below the step panel** as a full-width block (source order: panel first, rail second; grid collapses to one column). No floating mini-bar — the deposit is also visible on the step-5 pay button, which is where it matters.

### 5.12 Review + demo checkout (step 5)

- **Review recap:** definition-list rows, `1px solid var(--line-soft)` between rows, label column in form-label style, value in `--fs-sm` 600. Each group heading (Service / Schedule / Participant / Contact) is an H3 with a text-link "EDIT" (§5.1 text-link style) right-aligned, jumping to its step.
- **Card form**, under an H3 "Deposit payment": cardholder (full width) → card number (full width, `letter-spacing: 0.04em; font-variant-numeric: tabular-nums;`) → expiry + CVC in a `.field-row`. All `.input` fields, validation per STRATEGY (format only). `autocomplete="off"` on the form; `inputmode="numeric"` on number/expiry/CVC.
- **Demo notice** — directly above the pay button, unmissable by position and color, institutional (blue) rather than alarming (red):

```css
.demo-notice {
  display: flex; gap: var(--sp-3); align-items: flex-start;
  background: var(--blue); color: var(--white);
  padding: var(--sp-4) var(--sp-5);
  margin: var(--sp-5) 0;
}
.demo-notice .icon { margin-top: 2px; }
.demo-notice__title {
  font-family: var(--font-head); font-weight: 600; font-size: var(--fs-cap);
  text-transform: uppercase; letter-spacing: var(--ls-btn); display: block; margin-bottom: 2px;
}
.demo-notice__text { font-size: var(--fs-sm); color: rgba(255, 255, 255, 0.85); margin: 0; }
```

Contents: info-square icon + "DEMO CHECKOUT" title + one sentence (COPY.md). Solid blue block, white text — impossible to miss, on-palette, not an error.

- **Pay button:** `.btn--primary .btn--block`, label carries the amount — "PAY $150 DEPOSIT" (COPY.md pattern). While processing: `disabled` + label "PROCESSING…" — no spinner.
- **Confirmation-page variant** of the notice: same layout, inverted — `background: var(--white); border: 2px solid var(--blue); color: var(--blue);` text `--ink-70`.

### 5.13 Status badges (dashboard, confirmation)

```css
.badge {
  display: inline-block;
  font-family: var(--font-head); font-weight: 600; font-size: var(--fs-tag);
  text-transform: uppercase; letter-spacing: var(--ls-btn);
  padding: 5px 8px; line-height: 1;
  border: 1px solid transparent;
}
.badge--pending   { background: var(--red);  color: var(--white); border-color: var(--red); }
.badge--confirmed { background: var(--blue); color: var(--white); border-color: var(--blue); }
.badge--cancelled { background: transparent; color: var(--ink-70); border-color: rgba(57, 57, 57, 0.4); }
```

System: **filled = live** (pending red = needs the manager; confirmed blue = settled), **hollow = dead** (cancelled). Sharp corners, never pills. Labels: "PENDING" / "CONFIRMED" / "CANCELLED".

### 5.14 Confirmation page (`confirmation.html`)

Single centered column, `max-width: 720px; margin: 0 auto; padding: var(--sp-8) var(--sp-5);`.

```css
.confirm-block {
  background: var(--black); color: var(--white);
  border-top: var(--edge) solid var(--red);
  padding: var(--sp-7) var(--sp-6);
  text-align: center;
}
.confirm-block__kicker { /* kicker style §3, color var(--red) */ }
.confirm-block__ref {
  font-family: var(--font-head); font-weight: 600;
  font-size: var(--fs-stat); letter-spacing: 0.06em; color: var(--white);
  margin: var(--sp-3) 0 var(--sp-4);
}
.confirm-block .badge--pending { margin-bottom: var(--sp-4); }
.confirm-block__note { font-size: var(--fs-sm); color: var(--white-70); max-width: 440px; margin: 0 auto; }
```

Order: check icon (24px, `stroke: var(--red)`) → kicker "BOOKING RECEIVED" → the ref, huge → `.badge--pending` → front-desk expectation line (COPY.md). Below the block: the read-only summary (§5.12 recap style, no Edit links) in a `var(--border)` white panel; then the inverted demo-notice variant; then next actions — `.btn--secondary` "BACK TO SERVICES" + text link "Book another" → `book.html`.

**Not-found state** (bad/missing ref): same `.confirm-block` shell but border-top color `var(--blue)`, no icon, H2 + explanation + `.btn--on-dark` "GO TO HOMEPAGE". Never a blank page.

### 5.15 Dashboard chrome (`dashboard.html`)

Page background `var(--gray)` — the manager side is instantly distinguishable from the white customer side. Content container `max-width: var(--container-wide)`.

```css
.dash-header {
  background: var(--black); border-bottom: 3px solid var(--red);
  height: 64px; position: sticky; top: 0; z-index: 100;
}
.dash-header__inner {
  max-width: var(--container-wide); margin: 0 auto; padding: 0 var(--sp-5);
  height: 100%; display: flex; align-items: center; gap: var(--sp-4);
}
.dash-header__logo img { height: 28px; width: auto; }  /* logo-inv.png */
.dash-header__title {
  font-family: var(--font-head); font-weight: 600; font-size: var(--fs-sm);
  text-transform: uppercase; letter-spacing: var(--ls-btn); color: var(--white);
  border-left: 1px solid var(--white-line); padding-left: var(--sp-4);
}
.dash-header__actions { margin-left: auto; display: flex; align-items: center; gap: var(--sp-4); }
.dash-header__back { font-size: var(--fs-xs); color: var(--white-55); }
.dash-header__back:hover { color: var(--white); }
```

Actions: "Back to booking site" link + `.btn--on-dark .btn--small` "RESET DEMO DATA". Two-step confirm: first click swaps the same button to `.btn--danger .is-armed` (solid red) with label "CONFIRM RESET" for 4 seconds, then reverts. No customer footer; a one-line utility bar at page bottom with the demo disclaimer in `--fs-cap` `--ink-70`.

### 5.16 Dashboard stat tiles

```css
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-4); margin: var(--sp-6) 0; }
.stat {
  background: var(--white); border: var(--border);
  border-top: var(--edge) solid var(--black);
  padding: var(--sp-4) var(--sp-5);
}
.stat--attention { border-top-color: var(--red); }   /* Pending tile only */
.stat__value {
  font-family: var(--font-head); font-weight: 600; font-size: var(--fs-stat);
  line-height: 1; color: var(--black); font-variant-numeric: tabular-nums;
}
.stat--attention .stat__value { color: var(--red); }
.stat__label {
  font-size: var(--fs-tag); font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--ink-70); margin-top: var(--sp-2);
}
```

Order: Bookings this week · Deposits collected (formatted "$1,025 CAD") · Pending (`.stat--attention` — the to-do number is the only red on the row) · Active bookings. ≤1024px: `repeat(2, 1fr)`; stays 2-up on phones.

### 5.17 Filter/search bar

White toolbar panel above the table:

```css
.filters {
  background: var(--white); border: var(--border);
  padding: var(--sp-4); margin-bottom: 0;
  display: flex; flex-wrap: wrap; gap: var(--sp-3); align-items: center;
}
.filters .input { width: auto; padding: 9px 12px; font-size: var(--fs-sm); }
.filters .input[type="search"] { flex: 1; min-width: 200px; }
.filters__count { font-size: var(--fs-xs); color: var(--ink-70); margin-left: auto; white-space: nowrap; }
```

Left→right: Service select · Location select · Status select (each with visually-hidden labels, "All …" defaults) · search input (placeholder from COPY.md) · count "8 of 12 bookings" · "CLEAR FILTERS" text-link (only visible when a filter is active) · `.btn--secondary .btn--small` "EXPORT CSV" pinned rightmost. ≤640px: everything wraps full-width, selects `flex: 1 1 45%`.

### 5.18 Bookings table

Attached directly below the filter bar (shared border, no gap — they read as one instrument):

```css
.table-wrap { background: var(--white); border: var(--border); border-top: 0; overflow-x: auto; }
.bookings { width: 100%; border-collapse: collapse; min-width: 960px; }
.bookings th {
  font-size: var(--fs-tag); font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--ink-70); text-align: left;
  padding: var(--sp-3); border-bottom: 2px solid var(--black);
  white-space: nowrap;
}
.bookings th.is-sortable { cursor: pointer; user-select: none; }
.bookings th.is-sortable:hover { color: var(--black); }
.bookings th.is-sorted { color: var(--black); }
.bookings th.is-sorted::after { content: " ↑"; color: var(--red); }
.bookings th.is-sorted.desc::after { content: " ↓"; }

.bookings td {
  font-size: var(--fs-xs); padding: var(--sp-3);
  border-bottom: 1px solid var(--line-soft); vertical-align: top;
}
.bookings td.num { font-variant-numeric: tabular-nums; text-align: right; }
.bookings tbody tr { cursor: pointer; transition: background-color var(--speed) ease; }
.bookings tbody tr:hover { background: var(--hover-tint); }
.bookings tbody tr.is-open { background: var(--red-tint); box-shadow: inset var(--edge) 0 0 0 var(--red); }
.bookings tbody tr.is-cancelled td { color: var(--ink-45); }
.bookings .ref { font-family: var(--font-head); font-weight: 600; font-size: var(--fs-xs); letter-spacing: 0.04em; white-space: nowrap; }
```

- Columns per STRATEGY §6.4: Ref (`.ref`) · Created · Service · Location · Schedule · Participant · Deposit (`.num`, "$150") · Status (`.badge`). Sortable: Created, Schedule, Deposit. The arrows are text glyphs `↑`/`↓` — typographic, not emoji, acceptable.
- Cancelled rows: muted text but the hollow badge stays legible; rows remain hoverable/clickable.
- **Mobile decision (delegated):** horizontal scroll, not card collapse — `overflow-x: auto` on `.table-wrap` with the table's `min-width: 960px`. A manager tool keeps its columns; card collapse hides the scanning value. Builder adds `-webkit-overflow-scrolling: touch`.

**Empty state** (filters match nothing) — rendered inside `.table-wrap` in place of the table body:

```css
.empty {
  padding: var(--sp-8) var(--sp-5); text-align: center;
  border: 1px dashed rgba(57, 57, 57, 0.4); margin: var(--sp-5);
}
.empty h3 { margin-bottom: var(--sp-2); }
.empty p { font-size: var(--fs-sm); color: var(--ink-70); margin: 0 0 var(--sp-4); }
```

Slash-pair motif above the H3? **No** — the slash stays in its three places. Empty state is: H3 "NO MATCHING BOOKINGS" + one line + "CLEAR FILTERS" as `.btn--secondary .btn--small` (copy from COPY.md).

### 5.19 Booking detail panel

**Pattern decision (delegated by STRATEGY §8): right-side slide-over**, not row expansion — it shows the full record without unseating the table, and one panel at a time is structurally guaranteed.

```css
.panel-scrim { position: fixed; inset: 0; background: var(--scrim); z-index: 200; }
.panel {
  position: fixed; top: 0; right: 0; bottom: 0; z-index: 201;
  width: min(440px, 100vw);
  background: var(--white);
  border-left: var(--edge) solid var(--red);
  display: flex; flex-direction: column;
}
.panel__head {
  background: var(--black); color: var(--white);
  padding: var(--sp-4) var(--sp-5);
  display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4);
}
.panel__ref { font-family: var(--font-head); font-weight: 600; font-size: var(--fs-h3); letter-spacing: 0.04em; }
.panel__close { background: none; border: 1px solid var(--white-line); color: var(--white); width: 32px; height: 32px; display: grid; place-items: center; cursor: pointer; }
.panel__close:hover { border-color: var(--white); }
.panel__body { flex: 1; overflow-y: auto; padding: var(--sp-5); }
.panel__section + .panel__section { border-top: 1px solid var(--line-soft); margin-top: var(--sp-4); padding-top: var(--sp-4); }
.panel__section h3 { font-size: var(--fs-cap); letter-spacing: var(--ls-btn); color: var(--ink-70); margin-bottom: var(--sp-3); }
.panel__row { display: flex; justify-content: space-between; gap: var(--sp-4); padding: 3px 0; font-size: var(--fs-xs); }
.panel__row dt { color: var(--ink-70); } .panel__row dd { margin: 0; font-weight: 600; text-align: right; }
.panel__actions {
  border-top: 2px solid var(--black); padding: var(--sp-4) var(--sp-5);
  display: flex; gap: var(--sp-3);
}
.panel__actions .btn { flex: 1; }
```

- Head: ref + status badge; close button (X icon) — also closes on scrim click and Esc.
- Body sections: Schedule · Participant (incl. notes) · Contact (`mailto:`/`tel:` links) · Deposit ("$150 CAD · card ending 4242") · Meta (created timestamp).
- Actions per status: pending → `.btn--primary` "CONFIRM" + `.btn--danger` "CANCEL"; confirmed → `.btn--danger` "CANCEL" alone; cancelled → no buttons, a single `--fs-xs` `--ink-70` line: "This booking is cancelled." Cancel is two-step: first click swaps the same button to solid red (`.is-armed`) "CONFIRM CANCELLATION" with a "Keep booking" text-link beside it; second click commits. Status changes update badge, table row, and stats in place.
- No transform animation on open — the panel appears (opacity is fine, sliding is not required). ≤640px it is full-width.

---

## 6. Layout rules

- **Containers:** customer pages `max-width: 1200px`; dashboard `1360px`. Horizontal padding `var(--sp-5)` (24px), `var(--sp-4)` (16px) ≤640px. Content is **left-aligned** throughout; the only centered compositions are the confirmation block and the table empty state.
- **Vertical rhythm:** index sections `padding: var(--sp-9) 0` (96px) desktop, `var(--sp-7) 0` (48px) ≤640px. Wizard/confirmation/dashboard pages: `var(--sp-6)` top padding under the header, `var(--sp-8)` bottom.
- **Breakpoints — exactly two,** written mobile-first as `@media (min-width: 640px)` and `@media (min-width: 1024px)`:
  - **<640px:** single column everywhere; step labels collapse to the "STEP N OF 5" line; hero pseudo-elements hidden; footer stacks; filter controls wrap full-width; detail panel full-width; field rows stack.
  - **640–1023px:** catalog cards 2-up; stat tiles 2-up; wizard single column (rail below panel); hero slab narrowed.
  - **≥1024px:** catalog 3-up; wizard `1fr 340px` with sticky rail; stat tiles 4-up.
- **The table never collapses to cards** — horizontal scroll per §5.18.
- **Sticky elements:** customer header, dashboard header, summary rail (≥1024px only). Nothing else sticks; no floating action buttons.
- **Z-index scale:** header 100, panel scrim 200, panel 201. No other z-index values.

---

## 7. Asset usage

| Asset | Where | Size |
|---|---|---|
| `assets/img/logo.png` (light bg) | reserved — current pages all put the logo on dark; use only if a light-background logo placement is added | height 36px |
| `assets/img/logo-inv.png` (dark bg) | customer header (36px), dashboard header (28px), footer (40px) | height as noted, width auto (3:1) |
| `assets/img/favicon.png` | `<link rel="icon">` on all four pages | 32px |

Never scale a logo up beyond its rendered heights above; never recolor, skew, or crop the logos; never place `logo.png` on dark or `logo-inv.png` on light.

---

## 8. The anti-AI checklist

The reviewer verifies every line. Each DON'T is paired with the DO that replaces it.

| # | DON'T (instant AI tell) | DO instead |
|---|---|---|
| 1 | Any `border-radius` other than `0` — rounded cards, pill buttons, pill badges, rounded inputs. (`50%` allowed only for a genuinely circular element; this spec needs none.) | Universal `border-radius: 0` reset (§2.3); squares and rectangles everywhere, including the step indicator and legend swatches. |
| 2 | Soft drop shadows — any `box-shadow` with a blur radius, "floating card" looks, glows on focus. | Borders do the separating: `1px` lines, `2px` strong edges, `4px` color-edge accents. `box-shadow` only with **zero blur** as inset border thickening (§5.9, §5.18); the one soft element on the site is the panel scrim, which is an overlay, not a shadow. |
| 3 | Any hue outside the palette — purple, teal, mint, orange, "success green", gradient-of-the-week. | Five colors + white (§2.2). New tones only as rgba() of these. Confirmed = blue, not green. |
| 4 | Inter, Poppins, Roboto, Montserrat, `system-ui` — anywhere, including fallback stacks. | Geom 600 + Open Sans variable, self-hosted, `Arial` fallback only (§2.1). No Google Fonts requests — zero external requests at all. |
| 5 | Emoji as icons (📅 ✅ ❌ 🏒), icon fonts, or rounded-line icon packs. | Five inline SVG stroke icons, `stroke-linecap="square"`, `currentColor` (§4). Text labels preferred over icons. |
| 6 | Gradient buttons, gradient hero washes, glassmorphism / `backdrop-filter`. | Flat single-color fills; hover = hard palette swap (red→black, outline→filled). Diagonals via `skewX(-14deg)` blocks, not gradient fades. (Sole `linear-gradient`: the hard-stop diagonal strike on disabled slots — flat lines, no fade.) |
| 7 | Friendly sentence-case headings ("Let's get you booked!"), centered hero text, exclamation-mark UI. | Every heading UPPERCASE Geom via `text-transform` (§2.3), left-aligned, tracked. Copy tone is COPY.md's job; the CSS enforces the case. |
| 8 | The generic centered three-column feature grid: icon-in-circle, heading, blurb. | Left-aligned bordered cards with 4px color edges (§5.6); "How it works" uses big red Geom numerals ("01 02 03"), no icons, no circles. |
| 9 | Skeleton shimmer loaders, fake multi-second spinners, bouncing/entrance animations, transform-on-hover lifts. | Transitions limited to color/background/border at 0.15s (§5). Submit shows a disabled "PROCESSING…" button, per STRATEGY §3.5. |
| 10 | Airy oversized body text (18–20px), tables restyled as padded card lists, low-density "dashboard" look. | 16px body, 13px table cells, 11px column headers (§3); the dashboard is a dense working instrument with a real `<table>`. |

Reviewer's 30-second smoke test: view any page and look for (a) a curve, (b) a blur, (c) a hue that isn't red/blue/ink/black/gray, (d) a lowercase heading, (e) a network request leaving localhost. Any hit fails review.
