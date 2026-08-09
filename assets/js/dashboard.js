/*
 * dashboard.js — manager dashboard (STRATEGY.md §6, COPY.md §4).
 * Stats, AND-combined filters + search, sortable table, slide-over detail
 * panel, confirm/cancel with a second-click cancel, CSV export of the
 * filtered rows, and a two-step "Reset demo data" control. No auth by design.
 */

import { bookableServices, LOCATIONS, getLocation, scheduleSortValue } from "./catalog.js";
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
  depositLine,
  bookingsToCsv
} from "./store.js";

ensureSeed();

/* ---- Elements ---- */

const els = {
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
    els.filterService.value || els.filterLocation.value || els.filterStatus.value || els.search.value.trim()
  );
}

function filteredBookings() {
  const service = els.filterService.value;
  const location = els.filterLocation.value;
  const status = els.filterStatus.value;
  const query = els.search.value.trim().toLowerCase();
  return getBookings().filter((b) => {
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
    return b.deposit.amount;
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

function renderStats() {
  const bookings = getBookings();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const week = bookings.filter((b) => b.status !== "cancelled" && new Date(b.createdAt).getTime() >= weekAgo);
  const live = bookings.filter((b) => b.status === "pending" || b.status === "confirmed");
  const deposits = live.reduce((sum, b) => sum + b.deposit.amount, 0);
  els.statWeek.textContent = String(week.length);
  els.statDeposits.textContent = formatMoneyCAD(deposits);
  els.statPending.textContent = String(bookings.filter((b) => b.status === "pending").length);
  els.statActive.textContent = String(bookings.filter((b) => b.status !== "cancelled").length);
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
        "<td>" + esc(b.serviceName) + "</td>" +
        "<td>" + esc(loc ? loc.name : b.locationName) + "</td>" +
        "<td>" + esc(formatScheduleLine(b)) + "</td>" +
        "<td>" + esc(participantLabel(b)) + "</td>" +
        '<td class="num">' + esc(formatMoney(b.deposit.amount)) + "</td>" +
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

  els.panelBody.innerHTML =
    panelSection("Schedule", schedRows) +
    panelSection("Participant", partRows) +
    panelSection("Contact", contactRows) +
    panelSection("Deposit", panelRow("Deposit", esc(depositLine(b)))) +
    panelSection("Meta", panelRow("Booked", esc(formatDateTime(b.createdAt))));

  renderPanelActions(b);
}

function renderPanelActions(b) {
  els.panelActions.classList.toggle("panel__actions--confirm", cancelArmed);

  if (b.status === "cancelled") {
    els.panelActions.innerHTML = '<p class="panel__cancelled-note">This booking is cancelled.</p>';
    return;
  }

  if (cancelArmed) {
    els.panelActions.innerHTML =
      '<p class="panel__confirm-text">Cancel ' + esc(b.ref) +
      "? Cancelled bookings can't be reactivated, and the deposit is excluded from totals.</p>" +
      '<div class="panel__confirm-buttons">' +
      '<button type="button" class="btn btn--danger btn--small is-armed" id="cancelYesBtn">Yes, cancel it</button>' +
      '<button type="button" class="text-link" id="cancelNoBtn">Keep booking</button>' +
      "</div>";
    els.panelActions.querySelector("#cancelYesBtn").addEventListener("click", () => {
      updateStatus(b.ref, "cancelled");
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

function openPanel(ref) {
  openRef = ref;
  cancelArmed = false;
  renderPanel();
  els.scrim.hidden = false;
  els.panel.hidden = false;
  els.panelClose.focus();
  renderTable(); // repaint the is-open row highlight
}

function closePanel() {
  const refToFocus = openRef;
  openRef = null;
  cancelArmed = false;
  els.scrim.hidden = true;
  els.panel.hidden = true;
  renderTable();
  /* Rows are rebuilt on every render, so re-resolve the row by ref rather
     than holding a detached element; fall back to the table itself. */
  const row = refToFocus ? els.body.querySelector('tr[data-ref="' + CSS.escape(refToFocus) + '"]') : null;
  if (row) row.focus();
  else els.table.focus();
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
  renderTable();
}

[els.filterService, els.filterLocation, els.filterStatus].forEach((sel) =>
  sel.addEventListener("change", renderTable)
);
els.search.addEventListener("input", renderTable);
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
  if (openRef) closePanel();
  clearAllFilters();
  refresh();
  els.resetBtn.focus();
});

/* ---- Orchestration ---- */

function refresh() {
  renderStats();
  renderTable();
  if (openRef) renderPanel();
}

refresh();
