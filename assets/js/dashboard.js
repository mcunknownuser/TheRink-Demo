/*
 * dashboard.js — manager dashboard (STRATEGY.md §6, COPY.md §4).
 * Stats, AND-combined filters + search, sortable table, slide-over detail
 * panel, confirm/cancel with a second-click cancel, CSV export of the
 * filtered rows, and a two-step "Reset demo data" control. No auth by design.
 */

import { bookableServices, LOCATIONS, getLocation, scheduleSortValue, CREDIT_TYPES } from "./catalog.js";
import {
  ensureSeed,
  resetDemoData,
  getBookings,
  findBooking,
  updateStatus,
  formatDate,
  formatDateTime,
  formatMoney,
  formatMoneyCAD,
  formatScheduleLine,
  participantLabel,
  paymentLine,
  isCreditPaid,
  bookingAmount,
  bookingsToCsv
} from "./store.js";
import {
  allAccounts,
  accountFor,
  applyCancellationPolicy,
  compCredit,
  bookingStart,
  hoursUntil,
  CANCELLATION_NOTICE_HOURS
} from "./accounts.js";

ensureSeed();

/* ---- Elements ---- */

const els = {
  stats: document.querySelectorAll(".stat[data-stat]"),
  scopeStrip: document.getElementById("scopeStrip"),
  scopeTitle: document.getElementById("scopeTitle"),
  scopeBasis: document.getElementById("scopeBasis"),
  scopeFacts: document.getElementById("scopeFacts"),
  scopeClear: document.getElementById("scopeClearBtn"),
  statWeek: document.getElementById("statWeek"),
  statDeposits: document.getElementById("statDeposits"),
  statPending: document.getElementById("statPending"),
  statActive: document.getElementById("statActive"),
  filterService: document.getElementById("filterService"),
  filterLocation: document.getElementById("filterLocation"),
  filterStatus: document.getElementById("filterStatus"),
  search: document.getElementById("searchInput"),
  count: document.getElementById("filterCount"),
  clearFilters: document.getElementById("clearFiltersBtn"),
  exportBtn: document.getElementById("exportBtn"),
  table: document.getElementById("bookingsTable"),
  body: document.getElementById("bookingsBody"),
  empty: document.getElementById("emptyState"),
  tabs: document.querySelectorAll(".dash-tab"),
  filters: document.querySelector(".filters"),
  tableWrap: document.querySelector(".table-wrap"),
  accountsWrap: document.getElementById("accountsWrap"),
  accountsTable: document.getElementById("accountsTable"),
  accountsBody: document.getElementById("accountsBody"),
  accountsEmpty: document.getElementById("accountsEmpty"),
  scrim: document.getElementById("panelScrim"),
  panel: document.getElementById("detailPanel"),
  panelRef: document.getElementById("panelRef"),
  panelBadge: document.getElementById("panelBadge"),
  panelBody: document.getElementById("panelBody"),
  panelActions: document.getElementById("panelActions"),
  panelClose: document.getElementById("panelClose"),
  resetBtn: document.getElementById("resetBtn"),
  resetStrip: document.getElementById("resetStrip"),
  resetConfirm: document.getElementById("resetConfirmBtn"),
  resetCancel: document.getElementById("resetCancelBtn")
};

/* ---- State ---- */

let sortKey = "created";
let sortDir = "desc";
let openRef = null;
let cancelArmed = false;

/* Which table is showing, and — when the slide-over is open — whether it is
   showing a booking or a customer account. */
let view = "bookings";
let openEmail = null;
let compArmed = null; // creditType awaiting confirmation
let statScope = null; // which headline number the table is scoped to

const STATUS_LABELS = { pending: "Pending", confirmed: "Confirmed", cancelled: "Cancelled" };

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function badgeHtml(status) {
  return '<span class="badge badge--' + esc(status) + '">' + esc(STATUS_LABELS[status] || status) + "</span>";
}

/* ---- Filter selects ---- */

for (const svc of bookableServices()) {
  const opt = document.createElement("option");
  opt.value = svc.id;
  opt.textContent = svc.name;
  els.filterService.appendChild(opt);
}
for (const loc of LOCATIONS) {
  const opt = document.createElement("option");
  opt.value = loc.id;
  opt.textContent = loc.name;
  els.filterLocation.appendChild(opt);
}

/* ---- Data selection ---- */

function filtersActive() {
  return Boolean(
    els.filterService.value ||
      els.filterLocation.value ||
      els.filterStatus.value ||
      els.search.value.trim() ||
      statScope
  );
}

/* A stat scope narrows the population first; the dropdowns and search then
   filter within it, so the two combine rather than override each other. */
function filteredBookings() {
  const service = els.filterService.value;
  const location = els.filterLocation.value;
  const status = els.filterStatus.value;
  const query = els.search.value.trim().toLowerCase();
  const base = statScope ? scopeRows(statScope, getBookings()) : getBookings();
  return base.filter((b) => {
    if (service && b.serviceId !== service) return false;
    if (location && b.locationId !== location) return false;
    if (status && b.status !== status) return false;
    if (query) {
      const haystack = [b.ref, b.contact.name, b.participant.name || "", b.participant.groupName || ""]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

function sortedBookings(list) {
  const dir = sortDir === "asc" ? 1 : -1;
  const key = (b) => {
    if (sortKey === "created") return b.createdAt;
    if (sortKey === "schedule") return scheduleSortValue(b);
    return bookingAmount(b);
  };
  return [...list].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    if (ka < kb) return -1 * dir;
    if (ka > kb) return 1 * dir;
    return a.ref < b.ref ? -1 : 1; // stable-ish tiebreak
  });
}

function currentRows() {
  return sortedBookings(filteredBookings());
}

/* ---- Stats ---- */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/*
 * Each headline number is a control: clicking it scopes the table to exactly
 * the bookings it counts, and the strip beneath explains how the figure is
 * composed. `basis` states the rule in words, so a manager reading a number
 * off the dashboard never has to guess what it includes.
 *
 * "Deposits collected" and "Active bookings" cover the same rows — every
 * non-cancelled booking — because those are the same population counted two
 * ways, in money and in volume. Their breakdowns differ accordingly.
 */
const STAT_SCOPES = {
  week: {
    title: "Bookings this week",
    basis: "Booked in the last 7 days. Cancelled bookings are excluded.",
    match: (b, now) => b.status !== "cancelled" && new Date(b.createdAt).getTime() >= now - WEEK_MS
  },
  deposits: {
    title: "Deposits collected",
    basis: "Every pending and confirmed booking. Credit-paid sessions were paid for when the package was bought, so they add nothing here.",
    match: (b) => b.status === "pending" || b.status === "confirmed"
  },
  pending: {
    title: "Pending bookings",
    basis: "Booked and paid for, waiting on the front desk to confirm.",
    match: (b) => b.status === "pending"
  },
  active: {
    title: "Active bookings",
    basis: "Everything not cancelled, whatever its status or date.",
    match: (b) => b.status !== "cancelled"
  }
};

function scopeRows(scope, bookings, now = Date.now()) {
  return bookings.filter((b) => STAT_SCOPES[scope].match(b, now));
}

/* label/value pairs shown in the strip — the "why is it this number" detail. */
function scopeFacts(scope, rows) {
  const money = rows.reduce((sum, b) => sum + bookingAmount(b), 0);
  const byStatus = (s) => rows.filter((b) => b.status === s).length;
  const paidByCard = rows.filter((b) => !isCreditPaid(b) && bookingAmount(b) > 0);
  const paidByCredit = rows.filter(isCreditPaid);

  const busiest = () => {
    const counts = new Map();
    for (const b of rows) counts.set(b.serviceName, (counts.get(b.serviceName) || 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] + " (" + top[1] + ")" : "—";
  };

  const byLocation = () =>
    LOCATIONS.map((l) => {
      const n = rows.filter((b) => b.locationId === l.id).length;
      return n ? l.short + " " + n : null;
    })
      .filter(Boolean)
      .join(" · ") || "—";

  const nextSession = () => {
    const upcoming = rows
      .map(bookingStart)
      .filter((d) => d && d.getTime() >= Date.now())
      .sort((a, b) => a - b)[0];
    return upcoming ? formatDateTime(upcoming.toISOString()) : "None scheduled";
  };

  if (scope === "week") {
    return [
      ["Bookings", String(rows.length)],
      ["Confirmed", String(byStatus("confirmed"))],
      ["Awaiting confirmation", String(byStatus("pending"))],
      ["Deposits taken", formatMoneyCAD(money)],
      ["Most booked", busiest()],
      ["By location", byLocation()]
    ];
  }
  if (scope === "deposits") {
    const avg = paidByCard.length ? Math.round(money / paidByCard.length) : 0;
    return [
      ["Total collected", formatMoneyCAD(money)],
      ["From card deposits", paidByCard.length + (paidByCard.length === 1 ? " booking" : " bookings")],
      ["Average deposit", paidByCard.length ? formatMoneyCAD(avg) : "—"],
      ["Credit-paid (adds $0)", String(paidByCredit.length)],
      ["Held against pending", formatMoneyCAD(rows.filter((b) => b.status === "pending").reduce((s, b) => s + bookingAmount(b), 0))],
      ["By location", byLocation()]
    ];
  }
  if (scope === "pending") {
    const oldest = rows
      .map((b) => new Date(b.createdAt).getTime())
      .sort((a, b) => a - b)[0];
    const days = oldest ? Math.floor((Date.now() - oldest) / (24 * 60 * 60 * 1000)) : 0;
    return [
      ["Waiting", String(rows.length)],
      ["Longest wait", rows.length ? (days === 0 ? "Under a day" : days + (days === 1 ? " day" : " days")) : "—"],
      ["Deposits held", formatMoneyCAD(money)],
      ["Next session", nextSession()],
      ["Most booked", busiest()],
      ["By location", byLocation()]
    ];
  }
  const dated = rows.filter((b) => bookingStart(b));
  const upcoming = dated.filter((b) => bookingStart(b).getTime() >= Date.now()).length;
  return [
    ["Active bookings", String(rows.length)],
    ["Confirmed", String(byStatus("confirmed"))],
    ["Awaiting confirmation", String(byStatus("pending"))],
    ["Upcoming sessions", String(upcoming)],
    ["Seasonal or camp", String(rows.length - dated.length)],
    ["By location", byLocation()]
  ];
}

function renderStats() {
  const bookings = getBookings();
  const now = Date.now();
  els.statWeek.textContent = String(scopeRows("week", bookings, now).length);
  /* Credit-paid bookings contribute nothing: that money was banked when the
     package was bought, so counting it again would double the total. */
  els.statDeposits.textContent = formatMoneyCAD(
    scopeRows("deposits", bookings, now).reduce((sum, b) => sum + bookingAmount(b), 0)
  );
  els.statPending.textContent = String(scopeRows("pending", bookings, now).length);
  els.statActive.textContent = String(scopeRows("active", bookings, now).length);

  els.stats.forEach((btn) => {
    const active = btn.dataset.stat === statScope;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function renderScopeStrip() {
  if (!statScope || view !== "bookings") {
    els.scopeStrip.hidden = true;
    return;
  }
  const def = STAT_SCOPES[statScope];
  const rows = scopeRows(statScope, getBookings());
  els.scopeStrip.hidden = false;
  els.scopeTitle.textContent = def.title;
  els.scopeBasis.textContent = def.basis;
  els.scopeFacts.innerHTML = scopeFacts(statScope, rows)
    .map(
      ([label, value]) =>
        '<div class="scope__fact"><dt>' + esc(label) + "</dt><dd>" + esc(value) + "</dd></div>"
    )
    .join("");
}

function setStatScope(next) {
  statScope = statScope === next ? null : next; // clicking the active tile clears it
  if (statScope && view !== "bookings") {
    setView("bookings"); // setView refreshes for us
    return;
  }
  refresh();
}

/* ---- Table ---- */

function renderTable() {
  const all = getBookings();
  const rows = currentRows();

  els.count.textContent =
    "Showing " + rows.length + " of " + all.length + " bookings" +
    (statScope ? " · " + STAT_SCOPES[statScope].title.toLowerCase() : "");
  els.clearFilters.hidden = !filtersActive();

  if (all.length === 0) {
    els.table.hidden = true;
    els.empty.hidden = false;
    els.empty.innerHTML = "<p>No bookings yet. Reset demo data to load the sample set.</p>";
    return;
  }
  if (rows.length === 0) {
    els.table.hidden = true;
    els.empty.hidden = false;
    els.empty.innerHTML =
      "<h3>No bookings match your filters.</h3>" +
      '<button type="button" class="btn btn--secondary btn--small" id="emptyClearBtn">Clear filters</button>';
    els.empty.querySelector("#emptyClearBtn").addEventListener("click", clearAllFilters);
    return;
  }

  els.table.hidden = false;
  els.empty.hidden = true;
  els.empty.innerHTML = "";

  els.body.innerHTML = rows
    .map((b) => {
      const loc = getLocation(b.locationId);
      const cls = [b.status === "cancelled" ? "is-cancelled" : "", b.ref === openRef ? "is-open" : ""]
        .filter(Boolean)
        .join(" ");
      return (
        '<tr data-ref="' + esc(b.ref) + '"' + (cls ? ' class="' + cls + '"' : "") + ' tabindex="0">' +
        '<td class="ref">' + esc(b.ref) + "</td>" +
        "<td>" + esc(formatDateTime(b.createdAt)) + "</td>" +
        "<td>" + esc(b.serviceName) + "</td>" +
        "<td>" + esc(loc ? loc.name : b.locationName) + "</td>" +
        "<td>" + esc(formatScheduleLine(b)) + "</td>" +
        "<td>" + esc(participantLabel(b)) + "</td>" +
        '<td>' + (isCreditPaid(b) ? '<span class="pill">' + esc(paymentLine(b)) + "</span>" : "Card") + "</td>" +
        '<td class="num">' + esc(formatMoney(bookingAmount(b))) + "</td>" +
        "<td>" + badgeHtml(b.status) + "</td>" +
        "</tr>"
      );
    })
    .join("");

  els.body.querySelectorAll("tr").forEach((tr) => {
    tr.addEventListener("click", () => openPanel(tr.dataset.ref));
    tr.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPanel(tr.dataset.ref);
      }
    });
  });
}

/* ---- Accounts table ---- */

/* Accounts are matched on name and email only — the booking-level filters
   (service, location, status) don't apply to a customer. */
function filterAccounts(list) {
  const query = els.search.value.trim().toLowerCase();
  if (!query) return list;
  return list.filter((a) => (a.profile.name + " " + a.email).toLowerCase().includes(query));
}

function creditSummary(account) {
  const held = account.balances.filter((b) => b.balance !== 0);
  if (!held.length) return "—";
  return held.map((b) => b.balance + " × " + b.short).join(", ");
}

function renderAccountsTable() {
  /* allAccounts() walks bookings and the ledger, so derive once per render. */
  const all = allAccounts().filter((a) => a.exists);
  const rows = filterAccounts(all);

  els.count.textContent = "Showing " + rows.length + " of " + all.length + " accounts";
  els.clearFilters.hidden = !els.search.value.trim();

  if (rows.length === 0) {
    els.accountsTable.hidden = true;
    els.accountsEmpty.hidden = false;
    els.accountsEmpty.innerHTML =
      "<h3>No accounts match your search.</h3>" +
      '<button type="button" class="btn btn--secondary btn--small" id="accountsClearBtn">Clear search</button>';
    els.accountsEmpty.querySelector("#accountsClearBtn").addEventListener("click", clearAllFilters);
    return;
  }

  els.accountsTable.hidden = false;
  els.accountsEmpty.hidden = true;
  els.accountsEmpty.innerHTML = "";

  els.accountsBody.innerHTML = rows
    .map((a) => {
      const last = a.bookings[0];
      const hasCredits = a.balances.some((b) => b.balance > 0);
      return (
        '<tr data-email="' + esc(a.email) + '"' + (a.email === openEmail ? ' class="is-open"' : "") + ' tabindex="0">' +
        '<td class="ref">' + esc(a.profile.name || "—") + "</td>" +
        "<td>" + esc(a.email) + "</td>" +
        "<td>" + esc(a.profile.phone || "—") + "</td>" +
        '<td class="num">' + a.bookings.length + "</td>" +
        "<td>" + (hasCredits ? '<span class="pill">' + esc(creditSummary(a)) + "</span>" : esc(creditSummary(a))) + "</td>" +
        '<td class="num">' + esc(formatMoney(a.lifetimeSpend)) + "</td>" +
        "<td>" + esc(last ? formatDateTime(last.createdAt) : "—") + "</td>" +
        "</tr>"
      );
    })
    .join("");

  els.accountsBody.querySelectorAll("tr").forEach((tr) => {
    tr.addEventListener("click", () => openAccountPanel(tr.dataset.email));
    tr.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openAccountPanel(tr.dataset.email);
      }
    });
  });
}

/* ---- View switching ---- */

function setView(next) {
  view = next;
  els.tabs.forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  /* The service/location/status selects and CSV export are booking concepts;
     search is shared, so only its placeholder changes. */
  els.filters.classList.toggle("filters--accounts", view === "accounts");
  els.search.placeholder = view === "accounts" ? "Name or email" : "Ref, contact, or participant";
  els.tableWrap.hidden = view !== "bookings";
  els.accountsWrap.hidden = view !== "accounts";
  if (!els.panel.hidden) closePanel();
  refresh();
}

els.tabs.forEach((tab) => tab.addEventListener("click", () => setView(tab.dataset.view)));

/* ---- Sorting ---- */

els.table.querySelectorAll("th.is-sortable").forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.dataset.sort;
    if (sortKey === key) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDir = key === "created" ? "desc" : "asc";
    }
    els.table.querySelectorAll("th.is-sortable").forEach((h) => {
      const active = h.dataset.sort === sortKey;
      h.classList.toggle("is-sorted", active);
      h.classList.toggle("desc", active && sortDir === "desc");
      if (active) h.setAttribute("aria-sort", sortDir === "asc" ? "ascending" : "descending");
      else h.removeAttribute("aria-sort");
    });
    renderTable();
  });
});

/* ---- Detail panel ---- */

function panelRow(label, valueHtml) {
  return '<div class="panel__row"><dt>' + esc(label) + "</dt><dd>" + valueHtml + "</dd></div>";
}

function panelSection(title, rowsHtml) {
  return '<div class="panel__section"><h3>' + esc(title) + "</h3><dl>" + rowsHtml + "</dl></div>";
}

function renderPanel() {
  const b = findBooking(openRef);
  if (!b) {
    closePanel();
    return;
  }

  els.panelRef.textContent = b.ref;
  els.panelBadge.className = "badge badge--" + b.status;
  els.panelBadge.textContent = STATUS_LABELS[b.status];

  const s = b.schedule;
  let schedRows = "";
  schedRows += panelRow("Service", esc(b.serviceName));
  schedRows += panelRow("Location", esc(b.locationName));
  if (b.serviceType === "hourly") {
    schedRows += panelRow("Date", esc(formatDate(s.date)));
    schedRows += panelRow("Time", esc(s.startTime + "–" + s.endTime));
    if (s.iceOption) schedRows += panelRow("Ice option", esc(s.iceOption === "full" ? "Full ice" : "Half ice"));
  } else if (b.serviceType === "seasonal") {
    schedRows += panelRow("Program", esc(s.program));
    schedRows += panelRow("Season", esc(s.season));
  } else {
    schedRows += panelRow("Camp week", esc(s.campWeek));
  }

  let partRows = "";
  if (b.participant.groupName) {
    partRows += panelRow("Group", esc(b.participant.groupName));
    partRows += panelRow("Skaters", esc(b.participant.skaterCount));
  } else {
    partRows += panelRow("Participant", esc(b.participant.name));
    partRows += panelRow("Age division", esc(b.participant.ageGroup));
  }
  if (b.participant.notes) partRows += panelRow("Notes", esc(b.participant.notes));

  /* tel: hygiene — don't double the +1 when the customer typed a country code. */
  let phoneDigits = b.contact.phone.replace(/\D/g, "");
  if (phoneDigits.length === 11 && phoneDigits.startsWith("1")) phoneDigits = phoneDigits.slice(1);
  const contactRows =
    panelRow("Name", esc(b.contact.name)) +
    panelRow("Email", '<a href="mailto:' + esc(b.contact.email) + '">' + esc(b.contact.email) + "</a>") +
    panelRow("Phone", '<a href="tel:+1' + esc(phoneDigits) + '">' + esc(b.contact.phone) + "</a>");

  /* Payment: credit-paid bookings show the balance context a front desk needs
     when the customer is on the phone asking about it. */
  let payRows = panelRow("Paid with", esc(paymentLine(b)));
  if (isCreditPaid(b)) {
    const account = accountFor(b.contact.email);
    const held = account ? account.balances.find((x) => x.creditType === b.payment.creditType) : null;
    if (held) payRows += panelRow("Balance now", esc(held.balance + " " + held.short + " credits"));
    payRows += panelRow(
      "Account",
      '<button type="button" class="text-link" data-open-account="' + esc(b.contact.email) + '">View account</button>'
    );
  }

  els.panelBody.innerHTML =
    panelSection("Schedule", schedRows) +
    panelSection("Participant", partRows) +
    panelSection("Contact", contactRows) +
    panelSection("Payment", payRows) +
    panelSection("Meta", panelRow("Booked", esc(formatDateTime(b.createdAt))));

  els.panelBody.querySelectorAll("[data-open-account]").forEach((btn) => {
    btn.addEventListener("click", () => openAccountPanel(btn.dataset.openAccount));
  });

  renderPanelActions(b);
}

function renderPanelActions(b) {
  els.panelActions.classList.toggle("panel__actions--confirm", cancelArmed);

  if (b.status === "cancelled") {
    els.panelActions.innerHTML = '<p class="panel__cancelled-note">This booking is cancelled.</p>';
    return;
  }

  if (cancelArmed) {
    /* Spell out the credit consequence before the click, not after — the
       24-hour rule is the thing a manager gets asked to override. */
    let consequence = "Cancelled bookings can't be reactivated, and the deposit is excluded from totals.";
    if (isCreditPaid(b)) {
      const start = bookingStart(b);
      const outside = !start || hoursUntil(start) >= CANCELLATION_NOTICE_HOURS;
      consequence = outside
        ? "Cancelled bookings can't be reactivated. This is outside the 24-hour window, so the session credit returns to the customer's account."
        : "Cancelled bookings can't be reactivated. This is inside the 24-hour window, so the session credit is used and will not return.";
    }
    els.panelActions.innerHTML =
      '<p class="panel__confirm-text">Cancel ' + esc(b.ref) + "? " + esc(consequence) + "</p>" +
      '<div class="panel__confirm-buttons">' +
      '<button type="button" class="btn btn--danger btn--small is-armed" id="cancelYesBtn">Yes, cancel it</button>' +
      '<button type="button" class="text-link" id="cancelNoBtn">Keep booking</button>' +
      "</div>";
    els.panelActions.querySelector("#cancelYesBtn").addEventListener("click", () => {
      /* Status first, then the ledger consequence, so a booking is never left
         cancelled-but-unsettled if the policy call throws. */
      updateStatus(b.ref, "cancelled");
      applyCancellationPolicy(b);
      cancelArmed = false;
      refresh();
    });
    els.panelActions.querySelector("#cancelNoBtn").addEventListener("click", () => {
      cancelArmed = false;
      renderPanel();
    });
    return;
  }

  let html = "";
  if (b.status === "pending") {
    html += '<button type="button" class="btn btn--primary" id="confirmBtn">Confirm booking</button>';
  }
  html += '<button type="button" class="btn btn--danger" id="cancelBtn">Cancel booking</button>';
  els.panelActions.innerHTML = html;

  const confirmBtn = els.panelActions.querySelector("#confirmBtn");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {
      updateStatus(b.ref, "confirmed");
      refresh();
    });
  }
  els.panelActions.querySelector("#cancelBtn").addEventListener("click", () => {
    cancelArmed = true;
    renderPanel();
  });
}

/* ---- Account panel ---- */

const LEDGER_KINDS = {
  purchase: "Package purchased",
  redemption: "Session booked",
  forfeit: "Session forfeited",
  refund: "Credit returned",
  comp: "Credit added by front desk",
  adjustment: "Adjustment"
};

function renderAccountPanel() {
  const account = accountFor(openEmail);
  if (!account || !account.exists) {
    closePanel();
    return;
  }

  els.panelRef.textContent = account.profile.name || account.email;
  els.panelBadge.className = "badge badge--confirmed";
  els.panelBadge.textContent = account.totalCredits + " credits";

  let phoneDigits = (account.profile.phone || "").replace(/\D/g, "");
  if (phoneDigits.length === 11 && phoneDigits.startsWith("1")) phoneDigits = phoneDigits.slice(1);

  const contactRows =
    panelRow("Email", '<a href="mailto:' + esc(account.email) + '">' + esc(account.email) + "</a>") +
    (phoneDigits
      ? panelRow("Phone", '<a href="tel:+1' + esc(phoneDigits) + '">' + esc(account.profile.phone) + "</a>")
      : "") +
    panelRow("Lifetime spend", esc(formatMoneyCAD(account.lifetimeSpend)));

  let balanceRows = "";
  if (account.balances.length) {
    for (const b of account.balances) balanceRows += panelRow(b.short, esc(String(b.balance)));
  } else {
    balanceRows = panelRow("Credits", "None");
  }

  let bookingRows = "";
  for (const b of account.bookings.slice(0, 8)) {
    bookingRows += panelRow(
      formatScheduleLine(b) || b.serviceName,
      '<button type="button" class="text-link" data-open-booking="' + esc(b.ref) + '">' +
        esc(b.ref) + "</button> · " + esc(STATUS_LABELS[b.status])
    );
  }
  if (account.bookings.length > 8) {
    bookingRows += panelRow("", esc("+ " + (account.bookings.length - 8) + " more"));
  }
  if (!bookingRows) bookingRows = panelRow("Bookings", "None");

  let ledgerRows = "";
  for (const e of account.entries.slice(0, 10)) {
    const detail = e.note || (e.bookingRef ? "Booking " + e.bookingRef : "");
    const kind =
      e.kind === "redemption" && !e.bookingRef ? "Session redeemed" : LEDGER_KINDS[e.kind] || e.kind;
    ledgerRows += panelRow(
      formatDateTime(e.at),
      '<span class="ledger__delta' + (e.qty > 0 ? " is-positive" : "") + '">' +
        (e.qty > 0 ? "+" : "") + e.qty + "</span> " +
        esc(kind) +
        (detail ? '<br><span class="ledger__note">' + esc(detail) + "</span>" : "")
    );
  }

  els.panelBody.innerHTML =
    panelSection("Contact", contactRows) +
    panelSection("Credit balances", balanceRows) +
    panelSection("Bookings", bookingRows) +
    (ledgerRows ? panelSection("Credit history", ledgerRows) : "");

  els.panelBody.querySelectorAll("[data-open-booking]").forEach((btn) => {
    btn.addEventListener("click", () => openPanel(btn.dataset.openBooking));
  });

  renderAccountActions(account);
}

/*
 * The front desk's escape hatch: hand a credit back when the policy said no
 * but the situation says yes (coach illness, arena closure, goodwill). Every
 * comp lands in the ledger with its reason, so the balance stays explainable.
 */
function renderAccountActions(account) {
  els.panelActions.classList.toggle("panel__actions--confirm", Boolean(compArmed));

  const types = account.balances.length
    ? account.balances.map((b) => b.creditType)
    : Object.keys(CREDIT_TYPES);

  if (compArmed) {
    const meta = CREDIT_TYPES[compArmed] || {};
    els.panelActions.innerHTML =
      '<p class="panel__confirm-text">Add one ' + esc(meta.short || compArmed) +
      " credit to " + esc(account.profile.name || account.email) + "? It will show in their credit history as a front-desk addition.</p>" +
      '<div class="panel__confirm-buttons">' +
      '<button type="button" class="btn btn--primary btn--small" id="compYesBtn">Yes, add credit</button>' +
      '<button type="button" class="text-link" id="compNoBtn">Cancel</button>' +
      "</div>";
    els.panelActions.querySelector("#compYesBtn").addEventListener("click", () => {
      compCredit(account.email, compArmed, "Credit added by front desk");
      compArmed = null;
      refresh();
    });
    els.panelActions.querySelector("#compNoBtn").addEventListener("click", () => {
      compArmed = null;
      renderAccountPanel();
    });
    return;
  }

  els.panelActions.innerHTML = types
    .map(
      (t) =>
        '<button type="button" class="btn btn--secondary btn--small" data-comp="' + esc(t) + '">Add ' +
        esc((CREDIT_TYPES[t] || {}).short || t) + " credit</button>"
    )
    .join("");

  els.panelActions.querySelectorAll("[data-comp]").forEach((btn) => {
    btn.addEventListener("click", () => {
      compArmed = btn.dataset.comp;
      renderAccountPanel();
    });
  });
}

function openAccountPanel(email) {
  openRef = null;
  openEmail = email;
  cancelArmed = false;
  compArmed = null;
  renderAccountPanel();
  els.scrim.hidden = false;
  els.panel.hidden = false;
  els.panelClose.focus();
  renderCurrentTable();
}

function openPanel(ref) {
  openRef = ref;
  openEmail = null;
  cancelArmed = false;
  compArmed = null;
  renderPanel();
  els.scrim.hidden = false;
  els.panel.hidden = false;
  els.panelClose.focus();
  renderCurrentTable(); // repaint the is-open row highlight
}

function closePanel() {
  const refToFocus = openRef;
  const emailToFocus = openEmail;
  openRef = null;
  openEmail = null;
  cancelArmed = false;
  compArmed = null;
  els.scrim.hidden = true;
  els.panel.hidden = true;
  renderCurrentTable();
  /* Rows are rebuilt on every render, so re-resolve the row by key rather
     than holding a detached element; fall back to the table itself. */
  let row = null;
  if (view === "bookings" && refToFocus) {
    row = els.body.querySelector('tr[data-ref="' + CSS.escape(refToFocus) + '"]');
  } else if (view === "accounts" && emailToFocus) {
    row = els.accountsBody.querySelector('tr[data-email="' + CSS.escape(emailToFocus) + '"]');
  }
  if (row) row.focus();
  else (view === "accounts" ? els.accountsTable : els.table).focus();
}

els.panelClose.addEventListener("click", closePanel);
els.scrim.addEventListener("click", closePanel);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !els.panel.hidden) closePanel();
});

/* ---- Filters wiring ---- */

function clearAllFilters() {
  els.filterService.value = "";
  els.filterLocation.value = "";
  els.filterStatus.value = "";
  els.search.value = "";
  statScope = null;
  refresh(); // stats and the scope strip both reflect the cleared scope
}

els.stats.forEach((btn) => btn.addEventListener("click", () => setStatScope(btn.dataset.stat)));
els.scopeClear.addEventListener("click", () => {
  statScope = null;
  refresh();
});

[els.filterService, els.filterLocation, els.filterStatus].forEach((sel) =>
  sel.addEventListener("change", renderCurrentTable)
);
/* Search is shared by both views; the selects only apply to bookings. */
els.search.addEventListener("input", renderCurrentTable);
els.clearFilters.addEventListener("click", clearAllFilters);

/* ---- CSV export (currently filtered rows) ---- */

els.exportBtn.addEventListener("click", () => {
  const csv = bookingsToCsv(currentRows());
  /* UTF-8 BOM so Excel-on-Windows decodes em dashes etc. correctly. */
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rink-bookings.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

/* ---- Reset demo data (two-step) ---- */

els.resetBtn.addEventListener("click", () => {
  els.resetStrip.hidden = false;
  els.resetStrip.focus();
});
els.resetCancel.addEventListener("click", () => {
  els.resetStrip.hidden = true;
  els.resetBtn.focus();
});
els.resetConfirm.addEventListener("click", () => {
  resetDemoData();
  els.resetStrip.hidden = true;
  if (openRef || openEmail) closePanel();
  clearAllFilters(); // refreshes stats, scope strip and table
  els.resetBtn.focus();
});

/* ---- Orchestration ---- */

function renderCurrentTable() {
  if (view === "accounts") renderAccountsTable();
  else renderTable();
}

function refresh() {
  renderStats();
  renderScopeStrip();
  renderCurrentTable();
  if (openRef) renderPanel();
  else if (openEmail) renderAccountPanel();
}

refresh();
