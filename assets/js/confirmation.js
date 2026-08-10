/*
 * confirmation.js — confirmation page (STRATEGY.md §2.3, COPY.md §3).
 * Reads ?ref= from the URL, looks up the record in localStorage, renders a
 * read-only recap. Never mutates data; shows a not-found state for bad refs.
 */

import { ensureSeed, findBooking, formatDate, formatMoneyCAD, isCreditPaid } from "./store.js";
import { balanceOf } from "./accounts.js";
import { CREDIT_TYPES } from "./catalog.js";

ensureSeed();

const page = document.getElementById("confirmPage");

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const ICON_CHECK =
  '<svg class="icon" width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" style="color: var(--red);"><path d="M3 8.5 L6.5 12 L13 4.5"/></svg>';

const ICON_INFO =
  '<svg class="icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><rect x="2" y="2" width="12" height="12"/><path d="M8 7 V11.5 M8 4.5 V5"/></svg>';

const ICON_ARROW =
  '<svg class="icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M2 8 H13 M9 4 L13 8 L9 12"/></svg>';

function badgeFor(status) {
  const labels = { pending: "Pending", confirmed: "Confirmed", cancelled: "Cancelled" };
  return '<span class="badge badge--' + esc(status) + '">' + esc(labels[status] || status) + "</span>";
}

function row(label, value) {
  return '<div class="recap__row"><dt>' + esc(label) + "</dt><dd>" + esc(value) + "</dd></div>";
}

function group(title, rowsHtml) {
  return (
    '<div class="recap__group"><div class="recap__head"><h3>' + esc(title) + "</h3></div>" +
    "<dl>" + rowsHtml + "</dl></div>"
  );
}

function renderNotFound() {
  page.innerHTML =
    '<section class="confirm-block confirm-block--notfound on-dark">' +
    "<h1>Booking not found</h1>" +
    '<p class="confirm-block__note">We couldn\'t find a booking for that reference. Check the link from your confirmation, or start a new booking.</p>' +
    '<a class="btn btn--on-dark" href="index.html">Back to all services</a>' +
    "</section>";
}

function renderBooking(b) {
  const s = b.schedule;
  const isRental = b.serviceId === "ice-rental";

  let html = '<section class="confirm-block on-dark">';
  html += ICON_CHECK;
  html += '<h1 class="confirm-block__kicker">Booking received</h1>';
  html += '<p class="confirm-block__label">Your booking reference</p>';
  html += '<p class="confirm-block__ref">' + esc(b.ref) + "</p>";
  html += badgeFor(b.status);
  if (b.status === "pending") {
    html += '<p class="confirm-block__status">Status: pending confirmation</p>';
  }
  html += '<p class="confirm-block__note">Keep this reference. It\'s how the front desk finds your booking.</p>';
  html += '<p class="confirm-block__note">The front desk reviews every booking and confirms by email or phone, usually within one business day.</p>';
  html += "</section>";

  let schedRows = "";
  if (b.serviceType === "hourly") {
    schedRows += row("Date", formatDate(s.date));
    schedRows += row("Time", s.startTime + "–" + s.endTime);
    if (s.iceOption) schedRows += row("Ice option", s.iceOption === "full" ? "Full ice" : "Half ice");
  } else if (b.serviceType === "seasonal") {
    schedRows += row("Program", s.program);
    schedRows += row("Season", s.season);
  } else {
    schedRows += row("Camp week", s.campWeek);
  }

  let partRows = "";
  if (isRental) {
    partRows += row("Group", b.participant.groupName);
    partRows += row("Skaters", b.participant.skaterCount);
  } else {
    partRows += row("Participant", b.participant.name);
    partRows += row("Age division", b.participant.ageGroup);
    if (b.participant.notes) partRows += row("Notes", b.participant.notes);
  }

  html += '<section class="confirm-summary">';
  html += "<h2>Booking summary</h2>";
  html += '<div class="recap">';
  html += group("Service", row("Service", b.serviceName) + row("Location", b.locationName));
  html += group("Schedule", schedRows);
  html += group("Participant", partRows);
  html += group(
    "Contact",
    row("Contact", b.contact.name) + row("Email", b.contact.email) + row("Phone", b.contact.phone)
  );
  /* Credit-paid bookings settle against the account, not a card, so the
     payment group reports the balance the customer has left instead. */
  if (isCreditPaid(b)) {
    const type = b.payment.creditType;
    const short = (CREDIT_TYPES[type] || {}).short || "Session";
    const remaining = balanceOf(b.contact.email, type);
    html += group(
      "Payment",
      row("Paid with", "1 " + short + " session credit") +
        row("Credits remaining", String(remaining))
    );
  } else {
    html += group(
      "Deposit",
      row("Deposit paid", formatMoneyCAD(b.deposit.amount) + " · card ending " + b.deposit.cardLast4)
    );
  }
  html += "</div></section>";

  html +=
    '<div class="demo-notice demo-notice--invert">' + ICON_INFO +
    '<div><p class="demo-notice__text">This was a demo transaction. No payment was processed and your card was not charged.</p></div>' +
    "</div>";

  html +=
    '<div class="confirm-actions">' +
    '<a class="btn btn--primary" href="account.html">Go to My RINK' + ICON_ARROW + "</a>" +
    '<a class="btn btn--secondary" href="index.html">Back to all services</a>' +
    '<a class="text-link" href="book.html">Book another</a>' +
    "</div>";

  page.innerHTML = html;
}

const ref = new URLSearchParams(window.location.search).get("ref");
const booking = ref ? findBooking(ref) : null;
if (booking) renderBooking(booking);
else renderNotFound();
