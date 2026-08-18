/*
 * dashboard.js — manager dashboard (STRATEGY.md §6, COPY.md §4).
 * Stats, AND-combined filters + search, sortable table, slide-over detail
 * panel, confirm/cancel with a second-click cancel, CSV export of the
 * filtered rows, and a two-step "Reset demo data" control. No auth by design.
 */

import {
  bookableServices,
  LOCATIONS,
  getLocation,
  scheduleSortValue,
  CREDIT_TYPES,
  BRANDS,
  getBrand,
  getTier,
  streamLabel,
  MEMBERSHIP_MIN_TERM_MONTHS
} from "./catalog.js";
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
  isMembership,
  brandOfBooking,
  monthlyValue,
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
  filterBrand: document.getElementById("filterBrand"),
  membershipsWrap: document.getElementById("membershipsWrap"),
  membershipsTable: document.getElementById("membershipsTable"),
  membershipsBody: document.getElementById("membershipsBody"),
  membershipsEmpty: document.getElementById("membershipsEmpty"),
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
let openStat = null; // which headline number's detail panel is open

const STATUS_LABELS = { pending: "Pending", confirmed: "Confirmed", cancelled: "Cancelled" };

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function brandTag(brandId) {
  return (
    '<span class="brand-tag brand-tag--' + esc(brandId) + '">' + esc(getBrand(brandId).name) + "</span>"
  );
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
    els.filterBrand.value ||
      els.filterService.value ||
      els.filterLocation.value ||
      els.filterStatus.value ||
      els.search.value.trim()
  );
}

function filteredBookings() {
  const service = els.filterService.value;
  const location = els.filterLocation.value;
  const status = els.filterStatus.value;
  const query = els.search.value.trim().toLowerCase();
  const brand = els.filterBrand.value;
  return getBookings().filter((b) => {
    if (brand && brandOfBooking(b) !== brand) return false;
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
 * Each headline number opens the slide-over detail panel: what the figure
 * means (`basis`, the rule in words), a per-stat breakdown, and the actual
 * bookings behind it — each one clickable through to its own detail panel.
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
      ["Monthly recurring", formatMoneyCAD(rows.reduce((sum, b) => sum + monthlyValue(b), 0))],
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
    ["Memberships", String(rows.filter(isMembership).length)],
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
}

/* ---- Table ---- */

function renderTable() {
  const all = getBookings();
  const rows = currentRows();

  els.count.textContent = "Showing " + rows.length + " of " + all.length + " bookings";
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
        "<td>" + brandTag(brandOfBooking(b)) + "</td>" +
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

/* ---- Memberships view ---- */

/*
 * Memberships are the one thing the manager cannot read off the bookings table:
 * what matters is the recurring commitment, not the assessment fee that was
 * charged. This view leads with monthly recurring revenue and lists the members
 * behind it.
 */
function membershipRows() {
  const brand = els.filterBrand.value;
  const status = els.filterStatus.value;
  const query = els.search.value.trim().toLowerCase();
  return getBookings()
    .filter(isMembership)
    .filter((b) => !brand || brandOfBooking(b) === brand)
    .filter((b) => !status || b.status === status)
    .filter((b) => {
      if (!query) return true;
      return [b.ref, b.contact.name, b.participant.name || ""].join(" ").toLowerCase().includes(query);
    })
    .sort((a, b) => (a.schedule.startDate < b.schedule.startDate ? 1 : -1));
}

function renderMembershipsTable() {
  const all = getBookings().filter(isMembership);
  const rows = membershipRows();
  const mrr = rows.reduce((sum, b) => sum + monthlyValue(b), 0);
  const live = rows.filter((b) => b.status !== "cancelled").length;

  els.count.textContent =
    "Showing " + rows.length + " of " + all.length + " memberships · " +
    formatMoneyCAD(mrr) + "/mo from " + live + " active";
  els.clearFilters.hidden = !filtersActive();

  if (rows.length === 0) {
    els.membershipsTable.hidden = true;
    els.membershipsEmpty.hidden = false;
    els.membershipsEmpty.innerHTML =
      "<h3>No memberships match your filters.</h3>" +
      '<button type="button" class="btn btn--secondary btn--small" id="msClearBtn">Clear filters</button>';
    els.membershipsEmpty.querySelector("#msClearBtn").addEventListener("click", clearAllFilters);
    return;
  }

  els.membershipsTable.hidden = false;
  els.membershipsEmpty.hidden = true;
  els.membershipsEmpty.innerHTML = "";

  els.membershipsBody.innerHTML = rows
    .map((b) => {
      const tier = getTier(b.schedule.tier);
      const loc = getLocation(b.locationId);
      const cls = [b.status === "cancelled" ? "is-cancelled" : "", b.ref === openRef ? "is-open" : ""]
        .filter(Boolean)
        .join(" ");
      return (
        '<tr data-ref="' + esc(b.ref) + '"' + (cls ? ' class="' + cls + '"' : "") + ' tabindex="0">' +
        '<td class="ref">' + esc(b.ref) + "</td>" +
        "<td>" + esc(participantLabel(b) || b.contact.name) + "</td>" +
        "<td>" + esc(tier ? tier.label : b.schedule.tier) +
        (tier ? ' <span class="ledger__note">' + tier.sessions + "×/wk</span>" : "") + "</td>" +
        "<td>" + esc(streamLabel(b.schedule.stream)) + "</td>" +
        '<td class="num">' + esc(formatMoney(monthlyValue(b))) + "</td>" +
        "<td>" + esc(b.schedule.startDate ? formatDate(b.schedule.startDate) : "—") + "</td>" +
        "<td>" + esc(loc ? loc.name : b.locationName) + "</td>" +
        "<td>" + badgeHtml(b.status) + "</td>" +
        "</tr>"
      );
    })
    .join("");

  els.membershipsBody.querySelectorAll("tr").forEach((tr) => {
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
  els.filters.classList.toggle("filters--memberships", view === "memberships");
  els.search.placeholder = view === "accounts" ? "Name or email" : "Ref, contact, or participant";
  els.tableWrap.hidden = view !== "bookings";
  els.membershipsWrap.hidden = view !== "memberships";
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
  /* Panel wears the brand of the booking it shows. */
  els.panel.setAttribute("data-brand", brandOfBooking(b));

  const s = b.schedule;
  let schedRows = "";
  schedRows += panelRow("Brand", brandTag(brandOfBooking(b)));
  schedRows += panelRow("Service", esc(b.serviceName));
  schedRows += panelRow("Location", esc(b.locationName));
  if (b.serviceType === "membership") {
    const tier = getTier(s.tier);
    schedRows += panelRow("Tier", esc((tier ? tier.label : s.tier) + " · " + streamLabel(s.stream)));
    if (tier) schedRows += panelRow("Sessions", esc(tier.sessions + " per week"));
    schedRows += panelRow("Monthly", esc(formatMoneyCAD(monthlyValue(b))));
    schedRows += panelRow("Minimum term", esc((s.termMonths || MEMBERSHIP_MIN_TERM_MONTHS) + " months"));
    schedRows += panelRow("Starts", esc(s.startDate ? formatDate(s.startDate) : "—"));
  } else if (b.serviceType === "hourly") {
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
    if (isMembership(b)) {
      consequence =
        "Cancelling ends the membership. " + formatMoneyCAD(monthlyValue(b)) +
        " per month stops counting toward recurring revenue, and the record stays for history.";
    }
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
  els.panel.setAttribute("data-brand", "rink");
  openRef = null;
  openEmail = email;
  openStat = null;
  cancelArmed = false;
  compArmed = null;
  renderAccountPanel();
  els.scrim.hidden = false;
  els.panel.hidden = false;
  els.panelClose.focus();
  renderCurrentTable();
}

/* ---- Stat detail panel ---- */

/*
 * The detail behind a headline number, in the same slide-over managers
 * already use: what the figure means, its breakdown, and every booking it
 * counts — each clickable through to that booking's own panel.
 */
function renderStatPanel() {
  const def = STAT_SCOPES[openStat];
  const rows = scopeRows(openStat, getBookings());

  els.panelRef.textContent = def.title;
  els.panelBadge.className = "badge badge--confirmed";
  els.panelBadge.textContent =
    openStat === "deposits"
      ? formatMoneyCAD(rows.reduce((sum, b) => sum + bookingAmount(b), 0))
      : rows.length + (rows.length === 1 ? " booking" : " bookings");

  let html =
    '<div class="panel__section"><h3>What this counts</h3>' +
    '<p class="panel__text">' + esc(def.basis) + "</p></div>";

  let factRows = "";
  for (const [label, value] of scopeFacts(openStat, rows)) {
    factRows += panelRow(label, esc(value));
  }
  html += panelSection("Breakdown", factRows);

  let bookingRows = "";
  for (const b of sortedBookings(rows)) {
    bookingRows += panelRow(
      formatScheduleLine(b) || b.serviceName,
      '<button type="button" class="text-link" data-open-booking="' + esc(b.ref) + '">' +
        esc(b.ref) + "</button> · " + esc(STATUS_LABELS[b.status])
    );
  }
  html += panelSection(
    "The bookings behind it",
    bookingRows || panelRow("Bookings", "None right now")
  );

  els.panelBody.innerHTML = html;
  els.panelBody.querySelectorAll("[data-open-booking]").forEach((btn) => {
    btn.addEventListener("click", () => openPanel(btn.dataset.openBooking));
  });

  els.panelActions.classList.remove("panel__actions--confirm");
  els.panelActions.innerHTML = "";
}

function openStatPanel(key) {
  els.panel.setAttribute("data-brand", "rink");
  openRef = null;
  openEmail = null;
  openStat = key;
  cancelArmed = false;
  compArmed = null;
  renderStatPanel();
  els.scrim.hidden = false;
  els.panel.hidden = false;
  els.panelClose.focus();
}

function openPanel(ref) {
  openRef = ref;
  openEmail = null;
  openStat = null;
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
  const statToFocus = openStat;
  openRef = null;
  openEmail = null;
  openStat = null;
  cancelArmed = false;
  compArmed = null;
  els.scrim.hidden = true;
  els.panel.hidden = true;
  renderCurrentTable();
  /* A stat panel came from a tile, so focus returns there. */
  if (statToFocus) {
    const tile = document.querySelector('.stat[data-stat="' + CSS.escape(statToFocus) + '"]');
    if (tile) {
      tile.focus();
      return;
    }
  }
  /* Rows are rebuilt on every render, so re-resolve the row by key rather
     than holding a detached element; fall back to the table itself. */
  let row = null;
  if (view === "bookings" && refToFocus) {
    row = els.body.querySelector('tr[data-ref="' + CSS.escape(refToFocus) + '"]');
  } else if (view === "memberships" && refToFocus) {
    row = els.membershipsBody.querySelector('tr[data-ref="' + CSS.escape(refToFocus) + '"]');
  } else if (view === "accounts" && emailToFocus) {
    row = els.accountsBody.querySelector('tr[data-email="' + CSS.escape(emailToFocus) + '"]');
  }
  if (row) row.focus();
  else (view === "accounts" ? els.accountsTable : view === "memberships" ? els.membershipsTable : els.table).focus();
}

els.panelClose.addEventListener("click", closePanel);
els.scrim.addEventListener("click", closePanel);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !els.panel.hidden) closePanel();
});

/* ---- Filters wiring ---- */

function clearAllFilters() {
  els.filterBrand.value = "";
  els.filterService.value = "";
  els.filterLocation.value = "";
  els.filterStatus.value = "";
  els.search.value = "";
  renderCurrentTable();
}

/* Tiles are divs with role="button" (to keep the original <p> markup), so
   Enter/Space activation is wired by hand. */
els.stats.forEach((btn) => {
  btn.addEventListener("click", () => openStatPanel(btn.dataset.stat));
  btn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openStatPanel(btn.dataset.stat);
    }
  });
});

[els.filterBrand, els.filterService, els.filterLocation, els.filterStatus].forEach((sel) =>
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
  if (openRef || openEmail || openStat) closePanel();
  clearAllFilters(); // refreshes stats, scope strip and table
  els.resetBtn.focus();
});

/* ---- Orchestration ---- */

function renderCurrentTable() {
  if (view === "accounts") renderAccountsTable();
  else if (view === "memberships") renderMembershipsTable();
  else renderTable();
}

function refresh() {
  renderStats();
  renderCurrentTable();
  if (openRef) renderPanel();
  else if (openEmail) renderAccountPanel();
  else if (openStat) renderStatPanel();
}

refresh();
