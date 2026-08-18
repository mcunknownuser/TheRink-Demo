/*
 * account.js — "My RINK", the customer account page (STRATEGY.md §8.5).
 *
 * The point of this page: one login covering everything RINK sells. Session
 * credits, seasonal registrations, camp weeks and ice rentals all land here,
 * because they all live in one store keyed by the customer's email.
 *
 * Sign-in is email only — no password. This is a demo, and gating the booking
 * wizard behind an account would cost more than it proves.
 */

import {
  CREDIT_TYPES,
  serviceForCreditType,
  packagesFor,
  findPackage,
  packageTotal,
  packageSavings,
  getService,
  getBrand
} from "./catalog.js";

import {
  ensureSeed,
  formatDateTime,
  formatMoney,
  formatMoneyCAD,
  formatScheduleLine,
  paymentLine,
  brandOfBooking
} from "./store.js";

import {
  accountFor,
  allAccounts,
  currentEmail,
  signIn,
  signOut,
  purchasePackage,
  bookingStart,
  normalizeEmail
} from "./accounts.js";

import { validateCard } from "./card.js";

ensureSeed();

const page = document.getElementById("accountPage");

/* View state: which purchase form is open, and any transient notice. */
let buyingType = null;
let errors = {};
let notice = null;

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const ICON_INFO =
  '<svg class="icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><rect x="2" y="2" width="12" height="12"/><path d="M8 7 V11.5 M8 4.5 V5"/></svg>';

const ICON_ARROW =
  '<svg class="icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M2 8 H13 M9 4 L13 8 L9 12"/></svg>';

const STATUS_LABELS = { pending: "Pending", confirmed: "Confirmed", cancelled: "Cancelled" };

const LEDGER_KINDS = {
  purchase: "Package purchased",
  redemption: "Session booked",
  forfeit: "Session forfeited",
  refund: "Credit returned",
  comp: "Credit added by front desk",
  adjustment: "Adjustment"
};

function badge(status) {
  return '<span class="badge badge--' + esc(status) + '">' + esc(STATUS_LABELS[status] || status) + "</span>";
}

function sectionHead(title) {
  return '<div class="section-head"><span class="slash-pair" aria-hidden="true"></span><h2>' + esc(title) + "</h2></div>";
}

function fieldError(key) {
  return errors[key] ? '<span class="field__error" id="err-' + key + '">' + esc(errors[key]) + "</span>" : "";
}

function fieldClass(key) {
  return "field" + (errors[key] ? " has-error" : "");
}

function ariaErr(key) {
  return errors[key] ? ' aria-invalid="true" aria-describedby="err-' + key + '"' : "";
}

/* ---- Signed-out view ---- */

/*
 * A demo audience should not have to remember a seeded email address, so the
 * sign-in screen lists the accounts that actually exist in this browser, with
 * the detail that makes each one worth clicking.
 */
function renderSignedOut() {
  const accounts = allAccounts().filter((a) => a.exists);
  const withCredits = accounts.filter((a) => a.totalCredits > 0);
  const rest = accounts.filter((a) => a.totalCredits === 0);

  let html = '<section class="band">';
  html += '<div class="container container--narrow">';
  html += sectionHead("My RINK");
  html +=
    '<p class="section-intro">One account for everything you book with us — sessions, programs, camps and ice. ' +
    "Sign in with the email you booked with.</p>";

  if (errors.email) html += '<p class="field__error" role="alert">' + esc(errors.email) + "</p>";

  html += '<form class="signin" id="signinForm">';
  html +=
    '<div class="' + fieldClass("email") + '">' +
    '<label class="field__label" for="signinEmail">Email address</label>' +
    '<input class="input" type="email" id="signinEmail" autocomplete="email" placeholder="you@example.com"' +
    ariaErr("email") + ">" +
    "</div>";
  html += '<button type="submit" class="btn btn--primary">View my account</button>';
  html += "</form>";

  html +=
    '<div class="demo-notice">' + ICON_INFO +
    '<div><span class="demo-notice__title">Demo sign-in.</span>' +
    '<p class="demo-notice__text">No password is required. Pick one of the accounts below to see a populated account, or use the email from any booking you made in this browser.</p>' +
    "</div></div>";

  if (withCredits.length) {
    html += "<h3>Accounts with session credits</h3>";
    html += '<ul class="account-picker">';
    for (const a of withCredits) {
      const detail = a.balances
        .filter((b) => b.balance > 0)
        .map((b) => b.balance + " × " + b.short)
        .join(" · ");
      html += pickerRow(a, detail);
    }
    html += "</ul>";
  }

  if (rest.length) {
    html += "<h3>Other accounts</h3>";
    html += '<ul class="account-picker">';
    for (const a of rest) {
      const n = a.bookings.length;
      html += pickerRow(a, n + (n === 1 ? " booking" : " bookings"));
    }
    html += "</ul>";
  }

  html += "</div></section>";
  page.innerHTML = html;

  const form = page.querySelector("#signinForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = page.querySelector("#signinEmail").value;
    handleSignIn(value);
  });

  page.querySelectorAll("[data-signin]").forEach((btn) => {
    btn.addEventListener("click", () => handleSignIn(btn.dataset.signin));
  });
}

function pickerRow(account, detail) {
  return (
    '<li><button type="button" class="account-picker__row" data-signin="' + esc(account.email) + '">' +
    '<span class="account-picker__name">' + esc(account.profile.name || account.email) + "</span>" +
    '<span class="account-picker__email">' + esc(account.email) + "</span>" +
    '<span class="account-picker__detail">' + esc(detail) + "</span>" +
    "</button></li>"
  );
}

function handleSignIn(value) {
  const email = normalizeEmail(value);
  errors = {};
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = "Enter a valid email address, like name@example.com.";
    render();
    return;
  }
  const account = accountFor(email);
  if (!account || !account.exists) {
    errors.email = "We couldn't find an account for that email. Check the address, or make a booking to start one.";
    render();
    return;
  }
  signIn(email);
  render();
}

/* ---- Signed-in view ---- */

/* Upcoming = a dated booking still in the future, or any undated (seasonal /
   camp) booking that hasn't been cancelled. */
function isUpcoming(booking, now) {
  if (booking.status === "cancelled") return false;
  const start = bookingStart(booking);
  return start ? start.getTime() >= now.getTime() : true;
}

function bookingCard(b) {
  const svc = getService(b.serviceId);
  let html = '<li class="booking-card' + (b.status === "cancelled" ? " is-cancelled" : "") + '">';
  html += '<div class="booking-card__head">';
  html += '<h3>' + esc(b.serviceName) + "</h3>";
  html += badge(b.status);
  html += "</div>";
  html += '<p class="booking-card__brand"><span class="brand-tag brand-tag--' + esc(brandOfBooking(b)) +
    '">' + esc(getBrand(brandOfBooking(b)).name) + "</span></p>";
  html += '<p class="booking-card__schedule">' + esc(formatScheduleLine(b)) + "</p>";
  html += '<p class="booking-card__meta">' + esc(b.locationName) + "</p>";
  html +=
    '<p class="booking-card__meta">' + esc(paymentLine(b)) +
    " · booked " + esc(formatDateTime(b.createdAt)) + "</p>";
  html +=
    '<a class="text-link" href="confirmation.html?ref=' + encodeURIComponent(b.ref) + '">' +
    esc(b.ref) + ICON_ARROW + "</a>";
  html += "</li>";
  return html;
}

/*
 * The credit history table, with a running balance. A bare list of entries
 * answers "what happened"; the running column answers "so why is my balance
 * what it is", which is the question the front desk actually gets.
 */
function ledgerTable(account, creditType) {
  const entries = account.entries.filter((e) => e.creditType === creditType);
  if (!entries.length) return "";

  /* entries are newest-first; accumulate oldest-first, then flip back. */
  const ascending = [...entries].reverse();
  let running = 0;
  const rows = ascending.map((e) => {
    running += e.qty;
    return { entry: e, running };
  });
  rows.reverse();

  /* A redemption tied to a booking says so; one without a booking record is a
     session redeemed at the desk, and must not imply a booking to click. */
  const label = (e) =>
    e.kind === "redemption" && !e.bookingRef
      ? "Session redeemed"
      : LEDGER_KINDS[e.kind] || e.kind;

  let html = '<div class="table-wrap"><table class="ledger">';
  html +=
    "<thead><tr><th scope='col'>Date</th><th scope='col'>Activity</th>" +
    "<th scope='col' class='num'>Change</th><th scope='col' class='num'>Balance</th></tr></thead><tbody>";
  for (const { entry, running: bal } of rows) {
    const detail = entry.note || (entry.bookingRef ? "Booking " + entry.bookingRef : "");
    html +=
      "<tr><td>" + esc(formatDateTime(entry.at)) + "</td>" +
      "<td><span class='ledger__kind'>" + esc(label(entry)) + "</span>" +
      (detail ? "<br><span class='ledger__note'>" + esc(detail) + "</span>" : "") +
      (entry.amount ? "<br><span class='ledger__note'>" + esc(formatMoneyCAD(entry.amount)) + "</span>" : "") +
      "</td>" +
      "<td class='num'><span class='ledger__delta" + (entry.qty > 0 ? " is-positive" : "") + "'>" +
      (entry.qty > 0 ? "+" : "") + entry.qty + "</span></td>" +
      "<td class='num'>" + bal + "</td></tr>";
  }
  html += "</tbody></table></div>";
  return html;
}

function purchaseFormHtml(creditType) {
  const svc = serviceForCreditType(creditType);
  if (!svc) return "";
  let html = '<form class="buy-form" id="buyForm" autocomplete="off" novalidate>';
  html += '<h4>Buy more ' + esc((CREDIT_TYPES[creditType] || {}).short || "") + " sessions</h4>";
  if (errors.packageId) html += '<p class="field__error" role="alert">' + esc(errors.packageId) + "</p>";
  html += '<ul class="option-list">';
  for (const pkg of packagesFor(svc.id)) {
    const saved = packageSavings(svc.id, pkg);
    html +=
      '<li><label class="option">' +
      '<input type="radio" name="buyPackage" value="' + esc(pkg.id) + '">' +
      '<span class="option__body"><span>' +
      '<span class="option__name">' + esc(pkg.label) + "</span><br>" +
      '<span class="option__sub">' + esc(formatMoney(pkg.unit)) + " per session" +
      (saved > 0 ? " · save " + esc(formatMoney(saved)) : "") + "</span></span>" +
      '<span class="option__price">' + esc(formatMoney(packageTotal(pkg))) + "</span>" +
      "</span></label></li>";
  }
  html += "</ul>";

  html +=
    '<div class="demo-notice">' + ICON_INFO +
    '<div><span class="demo-notice__title">Demo checkout.</span>' +
    '<p class="demo-notice__text">No payment is processed and no card is ever charged.</p>' +
    "</div></div>";

  html +=
    '<div class="' + fieldClass("cardName") + '">' +
    '<label class="field__label" for="cardName">Cardholder name</label>' +
    '<input class="input" type="text" id="cardName" placeholder="Name as shown on the card"' + ariaErr("cardName") + ">" +
    fieldError("cardName") + "</div>";
  html +=
    '<div class="' + fieldClass("cardNumber") + '">' +
    '<label class="field__label" for="cardNumber">Card number</label>' +
    '<input class="input input--card" type="text" id="cardNumber" inputmode="numeric" placeholder="4242 4242 4242 4242"' + ariaErr("cardNumber") + ">" +
    fieldError("cardNumber") + "</div>";
  html += '<div class="field-row">';
  html +=
    '<div class="' + fieldClass("cardExpiry") + '">' +
    '<label class="field__label" for="cardExpiry">Expiry</label>' +
    '<input class="input input--card" type="text" id="cardExpiry" inputmode="numeric" placeholder="MM/YY"' + ariaErr("cardExpiry") + ">" +
    fieldError("cardExpiry") + "</div>";
  html +=
    '<div class="' + fieldClass("cardCvc") + '">' +
    '<label class="field__label" for="cardCvc">CVC</label>' +
    '<input class="input input--card" type="text" id="cardCvc" inputmode="numeric" placeholder="123"' + ariaErr("cardCvc") + ">" +
    fieldError("cardCvc") + "</div>";
  html += "</div>";

  html +=
    '<div class="buy-form__controls">' +
    '<button type="submit" class="btn btn--primary btn--small">Buy package</button>' +
    '<button type="button" class="text-link" id="buyCancel">Cancel</button>' +
    "</div>";
  html += "</form>";
  return html;
}

function creditTile(account, creditType, balance) {
  const meta = CREDIT_TYPES[creditType] || {};
  const svc = serviceForCreditType(creditType);
  let html = '<article class="credit-tile">';
  html += '<p class="credit-tile__value">' + balance + "</p>";
  html += '<p class="credit-tile__label">' + esc(meta.label || creditType) + "</p>";
  html +=
    '<p class="credit-tile__sublabel">' +
    (balance > 0
      ? "Ready to book — no payment needed at checkout."
      : "No sessions left. Buy a package to book again.") +
    "</p>";
  html += '<div class="credit-tile__actions">';
  if (balance > 0 && svc) {
    html +=
      '<a class="btn btn--secondary btn--small" href="book.html?service=' + esc(svc.id) + '">Book a session</a>';
  }
  html +=
    '<button type="button" class="btn btn--' + (balance > 0 ? "secondary" : "primary") +
    ' btn--small" data-buy="' + esc(creditType) + '">Buy more</button>';
  html += "</div>";
  if (buyingType === creditType) html += purchaseFormHtml(creditType);
  html += "</article>";
  return html;
}

function renderSignedIn(account) {
  const now = new Date();
  const upcoming = account.bookings.filter((b) => isUpcoming(b, now));
  const past = account.bookings.filter((b) => !isUpcoming(b, now));

  let html = "";

  /* Head */
  html += '<section class="account-head on-dark">';
  html += '<div class="container container--narrow">';
  html += '<p class="account-head__kicker">My RINK</p>';
  html += "<h1>" + esc(account.profile.name || account.email) + "</h1>";
  html += '<p class="account-head__email">' + esc(account.email) + "</p>";
  html +=
    '<div class="account-head__stats">' +
    '<span><strong>' + account.bookings.length + "</strong> " +
    (account.bookings.length === 1 ? "booking" : "bookings") + "</span>" +
    '<span><strong>' + account.totalCredits + "</strong> session credits</span>" +
    '<span><strong>' + esc(formatMoney(account.lifetimeSpend)) + "</strong> lifetime</span>" +
    "</div>";
  html += '<button type="button" class="text-link text-link--on-dark" id="signOutBtn">Sign out</button>';
  html += "</div></section>";

  html += '<section class="band"><div class="container container--narrow">';

  if (notice) html += '<div class="form-notice" role="status">' + esc(notice) + "</div>";

  /* Credits */
  html += sectionHead("Session credits");
  if (account.balances.length === 0) {
    html +=
      '<p class="section-intro">You don\'t have any session credits yet. 1-on-1 sessions are sold as packages — ' +
      "buy once, book whenever the ice suits you.</p>";
    html += '<div class="credit-grid">';
    for (const type of Object.keys(CREDIT_TYPES)) {
      html += creditTile(account, type, 0);
    }
    html += "</div>";
  } else {
    html +=
      '<p class="section-intro">Credits are bought once and redeemed one session at a time. ' +
      "Cancel more than 24 hours ahead and the credit comes back.</p>";
    html += '<div class="credit-grid">';
    for (const b of account.balances) html += creditTile(account, b.creditType, b.balance);
    html += "</div>";
  }

  /* Upcoming */
  html += sectionHead("Upcoming");
  if (upcoming.length === 0) {
    html += '<p class="section-intro">Nothing booked right now. <a class="text-link" href="index.html">Browse services</a></p>';
  } else {
    html += '<ul class="booking-list">' + upcoming.map(bookingCard).join("") + "</ul>";
  }

  /* History */
  if (past.length) {
    html += sectionHead("Booking history");
    html += '<ul class="booking-list">' + past.map(bookingCard).join("") + "</ul>";
  }

  /* Credit history, one table per credit type held */
  if (account.balances.length) {
    html += sectionHead("Credit history");
    for (const b of account.balances) {
      html += '<h3 class="ledger__head">' + esc(b.label) + "</h3>";
      html += ledgerTable(account, b.creditType);
    }
  }

  html += "</div></section>";
  page.innerHTML = html;

  page.querySelector("#signOutBtn").addEventListener("click", () => {
    signOut();
    buyingType = null;
    notice = null;
    errors = {};
    render();
  });

  page.querySelectorAll("[data-buy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      buyingType = buyingType === btn.dataset.buy ? null : btn.dataset.buy;
      errors = {};
      notice = null;
      render();
    });
  });

  const buyForm = page.querySelector("#buyForm");
  if (buyForm) {
    buyForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handlePurchase(account);
    });
    page.querySelector("#buyCancel").addEventListener("click", () => {
      buyingType = null;
      errors = {};
      render();
    });
    const firstError = page.querySelector(".has-error .input");
    if (firstError) firstError.focus();
  }
}

function handlePurchase(account) {
  const svc = serviceForCreditType(buyingType);
  if (!svc) return;

  const chosen = page.querySelector('input[name="buyPackage"]:checked');
  const card = {
    name: page.querySelector("#cardName").value,
    number: page.querySelector("#cardNumber").value,
    expiry: page.querySelector("#cardExpiry").value,
    cvc: page.querySelector("#cardCvc").value
  };

  errors = validateCard(card);
  if (!chosen) errors.packageId = "Choose a package to continue.";

  if (Object.keys(errors).length > 0) {
    render();
    return;
  }

  const pkg = findPackage(svc.id, chosen.value);
  purchasePackage(account.email, buyingType, pkg);
  notice =
    pkg.qty + " " + ((CREDIT_TYPES[buyingType] || {}).short || "") +
    " session credits added to your account.";
  buyingType = null;
  errors = {};
  render();
}

/* ---- Orchestration ---- */

function render() {
  const email = currentEmail();
  const account = email ? accountFor(email) : null;
  if (account && account.exists) renderSignedIn(account);
  else renderSignedOut();
}

render();
