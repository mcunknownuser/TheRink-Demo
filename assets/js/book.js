/*
 * book.js — the 5-step booking wizard (STRATEGY.md §3.5, COPY.md §2).
 * One adaptive flow for all three booking shapes; draft state in
 * sessionStorage so a refresh does not lose work. Card details are never
 * stored — only cardLast4 goes into the booking record.
 */

import {
  getService,
  getLocation,
  servicesInGroup,
  depositFor,
  ageGroupFromProgram,
  campWeeksAt,
  isSlotHeld,
  slotEndTime,
  SLOT_TIMES,
  BOOKING_WINDOW_DAYS,
  HOURLY_AGE_GROUPS,
  CAMP_AGE_GROUPS
} from "./catalog.js";

import {
  ensureSeed,
  createBooking,
  isSlotBooked,
  parseISODate,
  formatDate,
  formatMoney,
  formatMoneyCAD
} from "./store.js";

ensureSeed();

const DRAFT_KEY = "rink.draft";
const STEP_NAMES = ["Service", "Location", "Schedule", "Details", "Review & deposit"];

/* ---- Draft state ---- */

function blankSchedule() {
  return { date: null, startTime: null, iceOption: null, program: null, season: null, campWeek: null };
}

function blankDraft() {
  return {
    step: 1,
    serviceId: null,
    locationId: null,
    schedule: blankSchedule(),
    details: {
      participantName: "",
      ageGroup: "",
      groupName: "",
      skaterCount: "",
      notes: "",
      contactName: "",
      email: "",
      phone: ""
    }
  };
}

function loadDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== "object") return null;
    const base = blankDraft();
    return {
      step: Number(d.step) || 1,
      serviceId: d.serviceId || null,
      locationId: d.locationId || null,
      schedule: { ...base.schedule, ...(d.schedule || {}) },
      details: { ...base.details, ...(d.details || {}) }
    };
  } catch {
    return null;
  }
}

function saveDraft() {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

let draft = loadDraft() || blankDraft();
let showServiceChangeNotice = false;
let pendingErrors = {}; // fieldKey -> message, rendered by the current step

/* ?service= pre-fill: a valid bookable id starts a fresh flow with that
   service selected; an invalid/clinic id lands on step 1 unselected. */
(function applyServiceParam() {
  const id = new URLSearchParams(window.location.search).get("service");
  if (!id) return;
  const svc = getService(id);
  if (svc && svc.type !== "info") {
    if (draft.serviceId !== id) {
      draft = blankDraft();
      draft.serviceId = id;
    }
  } else {
    draft = blankDraft();
  }
})();

/* Clamp the draft step to what the collected data actually supports. */
function scheduleComplete() {
  const svc = getService(draft.serviceId);
  if (!svc) return false;
  const s = draft.schedule;
  if (svc.type === "hourly") {
    if (svc.id === "ice-rental" && !s.iceOption) return false;
    return Boolean(s.date && s.startTime);
  }
  if (svc.type === "seasonal") return Boolean(s.program && s.season);
  if (svc.type === "camp") return Boolean(s.campWeek);
  return false;
}

function detailsComplete() {
  return validateDetails(true);
}

(function clampStep() {
  let max = 1;
  if (draft.serviceId) max = 2;
  if (draft.serviceId && draft.locationId) max = 3;
  if (max === 3 && scheduleComplete()) max = 4;
  if (max === 4 && detailsComplete()) max = 5;
  draft.step = Math.min(Math.max(draft.step, 1), max);
})();

/* ---- DOM handles ---- */

const panel = document.getElementById("stepPanel");
const stepsList = document.getElementById("steps");
const currentLabel = document.getElementById("stepsCurrentLabel");
const rail = {
  service: document.getElementById("railService"),
  location: document.getElementById("railLocation"),
  schedule: document.getElementById("railSchedule"),
  participant: document.getElementById("railParticipant"),
  participantLabel: document.getElementById("railParticipantLabel"),
  deposit: document.getElementById("railDeposit")
};

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function todayISO() {
  const n = new Date();
  return (
    n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0")
  );
}

function maxDateISO() {
  const n = new Date();
  const d = new Date(n.getFullYear(), n.getMonth(), n.getDate() + BOOKING_WINDOW_DAYS);
  return (
    d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
  );
}

function currentDeposit() {
  return depositFor(draft.serviceId, draft.schedule.iceOption);
}

function slotAvailable(serviceId, locationId, date, startTime) {
  if (isSlotHeld(locationId, date, startTime)) return false;
  if (isSlotBooked(serviceId, locationId, date, startTime)) return false;
  if (date === todayISO()) {
    const hour = parseInt(startTime.slice(0, 2), 10);
    if (hour <= new Date().getHours()) return false;
  }
  return true;
}

/* ---- Shared render helpers ---- */

const ICON_INFO =
  '<svg class="icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><rect x="2" y="2" width="12" height="12"/><path d="M8 7 V11.5 M8 4.5 V5"/></svg>';

function panelHead(title, intro) {
  return (
    '<div class="section-head"><span class="slash-pair" aria-hidden="true"></span>' +
    '<h2 id="stepTitle" tabindex="-1">' + esc(title) + "</h2></div>" +
    (intro ? '<p class="step-intro">' + esc(intro) + "</p>" : "")
  );
}

function controlsRow(continueLabel) {
  return (
    '<div class="step-panel__controls">' +
    (draft.step > 1 ? '<button type="button" class="btn btn--secondary" id="backBtn">Back</button>' : "") +
    '<button type="' + (draft.step === 5 ? "submit" : "button") + '" class="btn btn--primary" id="continueBtn">' +
    esc(continueLabel || "Continue") +
    "</button></div>"
  );
}

function fieldError(key) {
  const msg = pendingErrors[key];
  return msg ? '<span class="field__error" id="err-' + key + '">' + esc(msg) + "</span>" : "";
}

function groupError(key) {
  const msg = pendingErrors[key];
  return msg ? '<p class="field__error" id="err-' + key + '" role="alert">' + esc(msg) + "</p>" : "";
}

function fieldClass(key) {
  return "field" + (pendingErrors[key] ? " has-error" : "");
}

function ariaErr(key) {
  return pendingErrors[key] ? ' aria-invalid="true" aria-describedby="err-' + key + '"' : "";
}

function optionRow(name, value, checked, opts = {}) {
  const cls = ["option"];
  if (opts.disabled) cls.push("is-disabled");
  if (opts.fixed) cls.push("is-fixed");
  return (
    '<label class="' + cls.join(" ") + '">' +
    '<input type="radio" name="' + esc(opts.group) + '" value="' + esc(value) + '"' +
    (checked ? " checked" : "") + (opts.disabled ? " disabled" : "") + ">" +
    '<span class="option__body"><span><span class="option__name">' + esc(name) + "</span>" +
    (opts.sub ? '<br><span class="option__sub">' + esc(opts.sub) + "</span>" : "") +
    "</span>" +
    (opts.price ? '<span class="option__price' + (opts.wrapPrice ? " option__price--wrap" : "") + '">' + esc(opts.price) + "</span>" : "") +
    (opts.tag ? '<span class="option__tag">' + esc(opts.tag) + "</span>" : "") +
    "</span></label>"
  );
}

/* ---- Step renderers ---- */

function renderStep1() {
  let html = panelHead("Choose your service", "Select the service you want to book. The deposit holds your spot.");
  if (showServiceChangeNotice) {
    html += '<div class="form-notice" role="status">Schedule cleared for the new service. Your participant and contact details are saved.</div>';
  }
  html += groupError("service");
  const groups = [
    ["Sessions & ice", servicesInGroup("sessions")],
    ["Programs", servicesInGroup("programs")],
    ["Camps", servicesInGroup("camps")]
  ];
  html += '<fieldset class="option-set"><legend class="visually-hidden">Service</legend>';
  for (const [label, services] of groups) {
    html += '<p class="option-set__group-head">' + esc(label) + "</p>";
    html += '<ul class="option-list option-list--services">';
    for (const svc of services) {
      html +=
        "<li>" +
        optionRow(svc.name, svc.id, draft.serviceId === svc.id, {
          group: "service",
          price: svc.depositLine,
          wrapPrice: svc.id === "ice-rental"
        }) +
        "</li>";
    }
    html += "</ul>";
  }
  html += "</fieldset>";
  html += controlsRow();
  panel.innerHTML = html;

  panel.querySelectorAll('input[name="service"]').forEach((input) => {
    input.addEventListener("change", () => {
      const newId = input.value;
      const hadLaterData = Boolean(draft.locationId) || Object.values(draft.schedule).some(Boolean);
      if (draft.serviceId && draft.serviceId !== newId && hadLaterData) {
        draft.locationId = null;
        draft.schedule = blankSchedule();
        showServiceChangeNotice = true;
        draft.serviceId = newId;
        pendingErrors = {};
        render(false);
        return;
      }
      draft.serviceId = newId;
      pendingErrors = {};
      saveDraft();
      updateRail();
    });
  });
}

function renderStep2() {
  const svc = getService(draft.serviceId);
  const locations = svc.locations.map(getLocation);
  const single = locations.length === 1;
  if (single) draft.locationId = locations[0].id;

  let html = panelHead("Choose a location", "This service runs at the locations below.");
  html += groupError("location");
  html += '<fieldset class="option-set"><legend class="visually-hidden">Location</legend><ul class="option-list">';
  for (const loc of locations) {
    html +=
      "<li>" +
      optionRow(loc.name, loc.id, draft.locationId === loc.id, {
        group: "location",
        sub: loc.city,
        fixed: single
      }) +
      "</li>";
  }
  html += "</ul></fieldset>";
  if (single) {
    html += '<p class="option-note">' + esc(locations[0].name) + " is the only location for this service. You're set here.</p>";
  }
  html += controlsRow();
  panel.innerHTML = html;

  panel.querySelectorAll('input[name="location"]').forEach((input) => {
    input.addEventListener("change", () => {
      const newId = input.value;
      if (draft.locationId !== newId) {
        // Availability is location-specific: drop choices that no longer apply.
        if (draft.schedule.startTime) draft.schedule.startTime = null;
        if (draft.schedule.campWeek) {
          const stillOffered = campWeeksAt(newId).some((w) => w.label === draft.schedule.campWeek);
          if (!stillOffered) draft.schedule.campWeek = null;
        }
      }
      draft.locationId = newId;
      pendingErrors = {};
      saveDraft();
      updateRail();
    });
  });
}

function renderStep3() {
  const svc = getService(draft.serviceId);
  if (svc.type === "hourly") renderStep3Hourly(svc);
  else if (svc.type === "seasonal") renderStep3Seasonal(svc);
  else renderStep3Camp();
}

function renderStep3Hourly(svc) {
  const isRental = svc.id === "ice-rental";
  const s = draft.schedule;
  let html = panelHead(
    "Pick your ice time",
    "Sessions run 60 minutes, starting on the hour, 7:00 AM to 8:00 PM. Book up to 45 days ahead."
  );

  if (isRental) {
    html += '<fieldset class="option-set"><legend>Ice option</legend>';
    html += groupError("iceOption");
    html += '<ul class="option-list">';
    html += "<li>" + optionRow("Full ice — $150 deposit", "full", s.iceOption === "full", { group: "iceOption" }) + "</li>";
    html += "<li>" + optionRow("Half ice — $75 deposit", "half", s.iceOption === "half", { group: "iceOption" }) + "</li>";
    html += "</ul></fieldset>";
  }

  html +=
    '<div class="' + fieldClass("date") + '">' +
    '<label class="field__label" for="dateInput">Date</label>' +
    '<input class="input input--date" type="date" id="dateInput" min="' + todayISO() + '" max="' + maxDateISO() +
    '" value="' + esc(s.date || "") + '"' + ariaErr("date") + ">" +
    fieldError("date") +
    "</div>";

  if (s.date && s.date >= todayISO() && s.date <= maxDateISO()) {
    const slots = SLOT_TIMES.map((t) => ({
      time: t,
      available: slotAvailable(svc.id, draft.locationId, s.date, t)
    }));
    const anyAvailable = slots.some((x) => x.available);
    html += '<div class="' + fieldClass("startTime") + '">';
    html += '<span class="field__label" id="slotGridLabel">Start time</span>';
    html += groupError("startTime");
    if (anyAvailable) {
      html += '<div class="slot-grid" role="group" aria-labelledby="slotGridLabel">';
      for (const slot of slots) {
        html +=
          '<button type="button" class="slot' + (s.startTime === slot.time ? " is-selected" : "") +
          '" data-time="' + slot.time + '"' +
          (slot.available ? "" : " disabled") +
          (s.startTime === slot.time ? ' aria-pressed="true"' : ' aria-pressed="false"') +
          ">" + slot.time + "</button>";
      }
      html += "</div>";
      html +=
        '<div class="slot-legend">' +
        '<span class="slot-legend__item"><span class="swatch" aria-hidden="true"></span>Available</span>' +
        '<span class="slot-legend__item"><span class="swatch swatch--unavailable" aria-hidden="true"></span>Unavailable</span>' +
        '<span class="slot-legend__item"><span class="swatch swatch--selected" aria-hidden="true"></span>Selected</span>' +
        "</div>" +
        '<p class="fine-print">Greyed-out times are already booked.</p>';
    } else {
      html += '<p class="slot-empty">No ice left on this date. Try another day.</p>';
    }
    html += "</div>";
  }

  html += controlsRow();
  panel.innerHTML = html;

  if (isRental) {
    panel.querySelectorAll('input[name="iceOption"]').forEach((input) => {
      input.addEventListener("change", () => {
        draft.schedule.iceOption = input.value;
        delete pendingErrors.iceOption;
        saveDraft();
        updateRail();
      });
    });
  }

  const dateInput = panel.querySelector("#dateInput");
  dateInput.addEventListener("change", () => {
    draft.schedule.date = dateInput.value || null;
    draft.schedule.startTime = null;
    pendingErrors = {};
    saveDraft();
    render(false);
  });

  panel.querySelectorAll(".slot").forEach((btn) => {
    btn.addEventListener("click", () => {
      draft.schedule.startTime = btn.dataset.time;
      delete pendingErrors.startTime;
      saveDraft();
      updateRail();
      panel.querySelectorAll(".slot").forEach((b) => {
        b.classList.toggle("is-selected", b === btn);
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
    });
  });
}

function renderStep3Seasonal(svc) {
  const s = draft.schedule;
  let html = panelHead(
    "Choose program & season",
    "Pick the participant's program, then a season block. Registration is open for both blocks."
  );
  html += '<fieldset class="option-set"><legend>Program</legend>';
  html += groupError("program");
  html += '<ul class="option-list">';
  for (const p of svc.programs) {
    html += "<li>" + optionRow(p, p, s.program === p, { group: "program" }) + "</li>";
  }
  html += "</ul></fieldset>";
  html += '<fieldset class="option-set"><legend>Season block</legend>';
  html += groupError("season");
  html += '<ul class="option-list">';
  for (const block of svc.seasons) {
    html += "<li>" + optionRow(block, block, s.season === block, { group: "season" }) + "</li>";
  }
  html += "</ul></fieldset>";
  html += controlsRow();
  panel.innerHTML = html;

  panel.querySelectorAll('input[name="program"]').forEach((input) => {
    input.addEventListener("change", () => {
      draft.schedule.program = input.value;
      delete pendingErrors.program;
      saveDraft();
      updateRail();
    });
  });
  panel.querySelectorAll('input[name="season"]').forEach((input) => {
    input.addEventListener("change", () => {
      draft.schedule.season = input.value;
      delete pendingErrors.season;
      saveDraft();
      updateRail();
    });
  });
}

function renderStep3Camp() {
  const s = draft.schedule;
  const weeks = campWeeksAt(draft.locationId);
  const today = todayISO();
  let html = panelHead("Choose a camp week", "Camps run Monday to Friday. Weeks that have already started are closed.");
  html += '<fieldset class="option-set"><legend class="visually-hidden">Camp week</legend>';
  html += groupError("campWeek");
  html += '<ul class="option-list">';
  for (const week of weeks) {
    const past = week.monday < today;
    html +=
      "<li>" +
      optionRow(week.label, week.label, s.campWeek === week.label, {
        group: "campWeek",
        disabled: past,
        tag: past ? "Closed" : null
      }) +
      "</li>";
  }
  html += "</ul></fieldset>";
  html += controlsRow();
  panel.innerHTML = html;

  panel.querySelectorAll('input[name="campWeek"]').forEach((input) => {
    input.addEventListener("change", () => {
      draft.schedule.campWeek = input.value;
      delete pendingErrors.campWeek;
      saveDraft();
      updateRail();
    });
  });
}

function renderStep4() {
  const svc = getService(draft.serviceId);
  const d = draft.details;
  const isRental = svc.id === "ice-rental";
  const isSeasonal = svc.type === "seasonal";
  const isCamp = svc.type === "camp";

  let html = panelHead("Participant & contact", "");

  html += "<h3>Participant</h3>";
  if (isRental) {
    html += '<p class="step-intro">Tell us who\'s renting the ice.</p>';
    html +=
      '<div class="' + fieldClass("pGroup") + '">' +
      '<label class="field__label" for="pGroup">Group or team name</label>' +
      '<input class="input" type="text" id="pGroup" placeholder="e.g. Winnipeg Selects U13" value="' + esc(d.groupName) + '"' + ariaErr("pGroup") + ">" +
      fieldError("pGroup") +
      "</div>";
    html +=
      '<div class="' + fieldClass("pSkaters") + '">' +
      '<label class="field__label" for="pSkaters">Estimated skaters</label>' +
      '<input class="input input--date" type="number" id="pSkaters" min="1" max="40" step="1" value="' + esc(d.skaterCount) + '"' + ariaErr("pSkaters") + ">" +
      fieldError("pSkaters") +
      '<span class="field__help">1 to 40, including goaltenders.</span>' +
      "</div>";
  } else {
    if (isSeasonal) html += '<p class="step-intro">The age division is set by your program choice.</p>';
    else if (isCamp) html += '<p class="step-intro">Tell us who\'s coming to camp.</p>';
    else html += '<p class="step-intro">Tell us who\'s on the ice.</p>';

    html +=
      '<div class="' + fieldClass("pName") + '">' +
      '<label class="field__label" for="pName">Participant full name</label>' +
      '<input class="input" type="text" id="pName" placeholder="e.g. Owen Fraser" value="' + esc(d.participantName) + '"' + ariaErr("pName") + ">" +
      fieldError("pName") +
      "</div>";

    if (isSeasonal) {
      const derived = ageGroupFromProgram(draft.schedule.program) || "";
      html +=
        '<div class="field">' +
        '<label class="field__label" for="pAgeFixed">Age division</label>' +
        '<input class="input input--readonly" type="text" id="pAgeFixed" value="' + esc(derived) + '" readonly>' +
        "</div>";
    } else {
      const options = isCamp ? CAMP_AGE_GROUPS : HOURLY_AGE_GROUPS;
      html +=
        '<div class="' + fieldClass("pAge") + '">' +
        '<label class="field__label" for="pAge">Age division</label>' +
        '<select class="input" id="pAge"' + ariaErr("pAge") + '>' +
        '<option value="">Select age division</option>' +
        options.map((o) => '<option value="' + esc(o) + '"' + (d.ageGroup === o ? " selected" : "") + ">" + esc(o) + "</option>").join("") +
        "</select>" +
        fieldError("pAge") +
        "</div>";
    }

    const notesPlaceholder =
      svc.type === "hourly" ? "Goals or focus areas for this session" : "Anything the coaches should know";
    html +=
      '<div class="field">' +
      '<label class="field__label" for="pNotes">Notes <span class="optional">(optional)</span></label>' +
      '<textarea class="input" id="pNotes" placeholder="' + esc(notesPlaceholder) + '">' + esc(d.notes) + "</textarea>" +
      "</div>";
  }

  html += "<h3>Booking contact</h3>";
  html += '<p class="step-intro">The front desk confirms every booking by email or phone, so make sure we can reach you.</p>';
  html +=
    '<div class="' + fieldClass("cName") + '">' +
    '<label class="field__label" for="cName">Full name</label>' +
    '<input class="input" type="text" id="cName" autocomplete="name" placeholder="e.g. Dana Fraser" value="' + esc(d.contactName) + '"' + ariaErr("cName") + ">" +
    fieldError("cName") +
    "</div>";
  html += '<div class="field-row">';
  html +=
    '<div class="' + fieldClass("cEmail") + '">' +
    '<label class="field__label" for="cEmail">Email</label>' +
    '<input class="input" type="email" id="cEmail" autocomplete="email" placeholder="you@example.com" value="' + esc(d.email) + '"' + ariaErr("cEmail") + ">" +
    fieldError("cEmail") +
    "</div>";
  html +=
    '<div class="' + fieldClass("cPhone") + '">' +
    '<label class="field__label" for="cPhone">Phone</label>' +
    '<input class="input" type="tel" id="cPhone" autocomplete="tel" placeholder="(204) 555-0134" value="' + esc(d.phone) + '"' + ariaErr("cPhone") + ">" +
    fieldError("cPhone") +
    "</div>";
  html += "</div>";

  html += controlsRow();
  panel.innerHTML = html;

  const bind = (id, key) => {
    const el = panel.querySelector("#" + id);
    if (!el) return;
    el.addEventListener("input", () => {
      draft.details[key] = el.value;
      saveDraft();
      updateRail();
    });
  };
  bind("pName", "participantName");
  bind("pGroup", "groupName");
  bind("pSkaters", "skaterCount");
  bind("pNotes", "notes");
  bind("cName", "contactName");
  bind("cEmail", "email");
  bind("cPhone", "phone");
  const age = panel.querySelector("#pAge");
  if (age) {
    age.addEventListener("change", () => {
      draft.details.ageGroup = age.value;
      delete pendingErrors.pAge;
      saveDraft();
    });
  }
}

function recapRow(label, value) {
  return (
    '<div class="recap__row"><dt>' + esc(label) + "</dt><dd>" + esc(value) + "</dd></div>"
  );
}

function recapGroup(title, gotoStep, rowsHtml) {
  return (
    '<div class="recap__group"><div class="recap__head"><h3>' + esc(title) + "</h3>" +
    '<button type="button" class="text-link" data-goto-step="' + gotoStep + '">Change</button></div>' +
    "<dl>" + rowsHtml + "</dl></div>"
  );
}

function renderStep5() {
  const svc = getService(draft.serviceId);
  const loc = getLocation(draft.locationId);
  const s = draft.schedule;
  const d = draft.details;
  const amount = currentDeposit();
  const isRental = svc.id === "ice-rental";

  let html = panelHead("Review & pay deposit", "Check everything over, then pay the deposit to hold your booking.");
  html += '<form id="payForm" autocomplete="off" novalidate>';
  html += '<div class="recap">';
  html += recapGroup("Service", 1, recapRow("Service", svc.name));
  html += recapGroup("Location", 2, recapRow("Location", loc.full));

  let schedRows = "";
  if (svc.type === "hourly") {
    schedRows += recapRow("Date", formatDate(s.date));
    schedRows += recapRow("Time", s.startTime + "–" + slotEndTime(s.startTime));
    if (isRental) schedRows += recapRow("Ice option", s.iceOption === "full" ? "Full ice" : "Half ice");
  } else if (svc.type === "seasonal") {
    schedRows += recapRow("Program", s.program);
    schedRows += recapRow("Season", s.season);
  } else {
    schedRows += recapRow("Camp week", s.campWeek);
  }
  html += recapGroup("Schedule", 3, schedRows);

  let partRows = "";
  if (isRental) {
    partRows += recapRow("Group", d.groupName.trim());
    partRows += recapRow("Skaters", d.skaterCount);
  } else {
    partRows += recapRow("Participant", d.participantName.trim());
    const ageValue = svc.type === "seasonal" ? ageGroupFromProgram(s.program) : d.ageGroup;
    partRows += recapRow("Age division", ageValue);
    if (d.notes.trim()) partRows += recapRow("Notes", d.notes.trim());
  }
  html += recapGroup("Participant", 4, partRows);

  html += recapGroup(
    "Contact",
    4,
    recapRow("Contact", d.contactName.trim()) + recapRow("Email", d.email.trim()) + recapRow("Phone", d.phone.trim())
  );
  html += "</div>";

  html += "<h3>Deposit checkout</h3>";
  html +=
    '<div class="checkout__amount"><span class="checkout__amount-label">Deposit due today</span>' +
    '<span class="checkout__amount-value">' + formatMoneyCAD(amount) + "</span></div>";

  html +=
    '<div class="demo-notice">' + ICON_INFO +
    '<div><span class="demo-notice__title">Demo checkout.</span>' +
    '<p class="demo-notice__text">No payment is processed and no card is ever charged. Enter any card details in a valid format to complete the booking.</p>' +
    "</div></div>";

  html +=
    '<div class="' + fieldClass("cardName") + '">' +
    '<label class="field__label" for="cardName">Cardholder name</label>' +
    '<input class="input" type="text" id="cardName" placeholder="Name as shown on the card"' + ariaErr("cardName") + ">" +
    fieldError("cardName") +
    "</div>";
  html +=
    '<div class="' + fieldClass("cardNumber") + '">' +
    '<label class="field__label" for="cardNumber">Card number</label>' +
    '<input class="input input--card" type="text" id="cardNumber" inputmode="numeric" placeholder="4242 4242 4242 4242"' + ariaErr("cardNumber") + ">" +
    fieldError("cardNumber") +
    "</div>";
  html += '<div class="field-row">';
  html +=
    '<div class="' + fieldClass("cardExpiry") + '">' +
    '<label class="field__label" for="cardExpiry">Expiry</label>' +
    '<input class="input input--card" type="text" id="cardExpiry" inputmode="numeric" placeholder="MM/YY"' + ariaErr("cardExpiry") + ">" +
    fieldError("cardExpiry") +
    "</div>";
  html +=
    '<div class="' + fieldClass("cardCvc") + '">' +
    '<label class="field__label" for="cardCvc">CVC</label>' +
    '<input class="input input--card" type="text" id="cardCvc" inputmode="numeric" placeholder="123"' + ariaErr("cardCvc") + ">" +
    fieldError("cardCvc") +
    "</div>";
  html += "</div>";

  html +=
    '<div class="step-panel__controls">' +
    '<button type="button" class="btn btn--secondary" id="backBtn">Back</button>' +
    '<button type="submit" class="btn btn--primary" id="payBtn">Pay ' + formatMoney(amount) + " deposit</button>" +
    "</div>";
  html += '<p class="fine-print">Deposits are held against your booking and refunded if the front desk cancels it. This is a demo transaction.</p>';
  html += "</form>";

  panel.innerHTML = html;

  panel.querySelectorAll("[data-goto-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      draft.step = Number(btn.dataset.gotoStep);
      pendingErrors = {};
      render();
    });
  });

  panel.querySelector("#payForm").addEventListener("submit", (e) => {
    e.preventDefault();
    handlePayment();
  });
}

/* ---- Validation ---- */

function validateStep() {
  pendingErrors = {};
  const svc = getService(draft.serviceId);

  if (draft.step === 1) {
    if (!draft.serviceId) pendingErrors.service = "Select a service to continue.";
  } else if (draft.step === 2) {
    if (!draft.locationId) pendingErrors.location = "Select a location to continue.";
  } else if (draft.step === 3) {
    validateSchedule(svc);
  } else if (draft.step === 4) {
    validateDetails(false);
  }
  return Object.keys(pendingErrors).length === 0;
}

/* Step-3 schedule validation; also re-run at payment time for every shape. */
function validateSchedule(svc) {
  const s = draft.schedule;
  if (svc.type === "hourly") {
    if (svc.id === "ice-rental" && !s.iceOption) pendingErrors.iceOption = "Choose full or half ice.";
    if (!s.date) {
      pendingErrors.date = "Pick a date within the next 45 days.";
    } else if (s.date < todayISO() || s.date > maxDateISO()) {
      pendingErrors.date = "That date is outside the booking window. Pick a date within the next 45 days.";
    } else if (!s.startTime) {
      pendingErrors.startTime = "Select an available start time.";
    } else if (!slotAvailable(svc.id, draft.locationId, s.date, s.startTime)) {
      draft.schedule.startTime = null;
      pendingErrors.startTime = "That time was just taken. Pick another start time.";
    }
  } else if (svc.type === "seasonal") {
    if (!s.program) pendingErrors.program = "Select a program.";
    if (!s.season) pendingErrors.season = "Select a season block.";
  } else if (svc.type === "camp") {
    const week = campWeeksAt(draft.locationId).find((w) => w.label === s.campWeek);
    if (!week || week.monday < todayISO()) pendingErrors.campWeek = "Select an upcoming camp week.";
  }
}

function validateDetails(silent) {
  const svc = getService(draft.serviceId);
  if (!svc) return false;
  const d = draft.details;
  const errors = {};
  if (svc.id === "ice-rental") {
    if (d.groupName.trim().length < 2) errors.pGroup = "Enter your group or team name.";
    const count = Number(d.skaterCount);
    if (!Number.isInteger(count) || count < 1 || count > 40 || d.skaterCount === "") {
      errors.pSkaters = "Enter a skater count between 1 and 40.";
    }
  } else {
    if (d.participantName.trim().length < 2) errors.pName = "Enter the participant's full name.";
    if (svc.type !== "seasonal") {
      /* Membership, not truthiness: an age division kept from a previously
         selected service (e.g. "Adult" from a 1-on-1) must not pass for a
         service that doesn't offer it. Clear the stale value so the select
         and the draft agree. */
      const allowed = svc.type === "camp" ? CAMP_AGE_GROUPS : HOURLY_AGE_GROUPS;
      if (!allowed.includes(d.ageGroup)) {
        if (d.ageGroup) draft.details.ageGroup = "";
        errors.pAge = "Select an age division.";
      }
    }
  }
  if (d.contactName.trim().length < 2) errors.cName = "Enter your full name.";
  if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) errors.cEmail = "Enter a valid email address, like name@example.com.";
  if (d.phone.replace(/\D/g, "").length < 10) errors.cPhone = "Enter a phone number with at least 10 digits.";
  if (!silent) Object.assign(pendingErrors, errors);
  return Object.keys(errors).length === 0;
}

function focusFirstError() {
  const firstError = panel.querySelector(".has-error .input, .field__error");
  if (!firstError) return;
  if (firstError.classList.contains("input")) firstError.focus();
  else {
    const title = panel.querySelector("#stepTitle");
    if (title) title.focus();
  }
}

/* ---- Payment (simulated; format validation only, no Luhn, no network) ---- */

function handlePayment() {
  pendingErrors = {};
  const name = panel.querySelector("#cardName").value;
  const number = panel.querySelector("#cardNumber").value;
  const expiry = panel.querySelector("#cardExpiry").value.trim();
  const cvc = panel.querySelector("#cardCvc").value.trim();

  if (!name.trim()) pendingErrors.cardName = "Enter the cardholder's name.";

  const digits = number.replace(/\s/g, "");
  if (!/^\d{15,16}$/.test(digits)) {
    pendingErrors.cardNumber = "Card numbers are 15 or 16 digits. Check yours and try again.";
  }

  const m = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!m) {
    pendingErrors.cardExpiry = "Enter the expiry as MM/YY.";
  } else {
    const month = Number(m[1]);
    const year = 2000 + Number(m[2]);
    if (month < 1 || month > 12) {
      pendingErrors.cardExpiry = "That month doesn't exist. Enter the expiry as MM/YY.";
    } else {
      const now = new Date();
      if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
        pendingErrors.cardExpiry = "That card has expired. Use an expiry date in the future.";
      }
    }
  }

  if (!/^\d{3,4}$/.test(cvc)) {
    pendingErrors.cardCvc = "Enter the 3 or 4 digit code on the back of the card.";
  }

  if (Object.keys(pendingErrors).length > 0) {
    const keep = { name, number, expiry, cvc };
    render(false);
    // Re-fill what the customer typed (card data never touches the draft).
    panel.querySelector("#cardName").value = keep.name;
    panel.querySelector("#cardNumber").value = keep.number;
    panel.querySelector("#cardExpiry").value = keep.expiry;
    panel.querySelector("#cardCvc").value = keep.cvc;
    focusFirstError();
    return;
  }

  const svc = getService(draft.serviceId);
  const s = draft.schedule;

  // Final schedule re-check for ALL shapes: a stale overnight draft must not
  // book a past date, a taken slot, or an already-started camp week.
  pendingErrors = {};
  validateSchedule(svc);
  if (Object.keys(pendingErrors).length > 0) {
    draft.step = 3;
    render();
    return;
  }

  const payBtn = panel.querySelector("#payBtn");
  payBtn.disabled = true;
  payBtn.textContent = "Processing…";

  const loc = getLocation(draft.locationId);
  const d = draft.details;
  const isRental = svc.id === "ice-rental";

  const record = createBooking({
    serviceId: svc.id,
    serviceName: svc.name,
    serviceType: svc.type,
    locationId: loc.id,
    locationName: loc.full,
    schedule: {
      date: svc.type === "hourly" ? s.date : null,
      startTime: svc.type === "hourly" ? s.startTime : null,
      endTime: svc.type === "hourly" ? slotEndTime(s.startTime) : null,
      iceOption: isRental ? s.iceOption : null,
      program: svc.type === "seasonal" ? s.program : null,
      season: svc.type === "seasonal" ? s.season : null,
      campWeek: svc.type === "camp" ? s.campWeek : null
    },
    participant: {
      name: isRental ? null : d.participantName.trim(),
      ageGroup: isRental ? null : svc.type === "seasonal" ? ageGroupFromProgram(s.program) : d.ageGroup,
      groupName: isRental ? d.groupName.trim() : null,
      skaterCount: isRental ? Number(d.skaterCount) : null,
      notes: isRental ? "" : d.notes.trim()
    },
    contact: {
      name: d.contactName.trim(),
      email: d.email.trim(),
      phone: d.phone.trim()
    },
    deposit: {
      amount: currentDeposit(),
      cardLast4: digits.slice(-4)
    }
  });

  sessionStorage.removeItem(DRAFT_KEY);
  window.location.href = "confirmation.html?ref=" + encodeURIComponent(record.ref);
}

/* ---- Chrome: step indicator + rail ---- */

function updateStepsUI() {
  stepsList.querySelectorAll(".steps__item").forEach((item) => {
    const n = Number(item.dataset.step);
    const btn = item.querySelector(".steps__num");
    item.classList.toggle("is-current", n === draft.step);
    item.classList.toggle("is-done", n < draft.step);
    if (n === draft.step) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
    btn.disabled = n >= draft.step;
    if (n >= draft.step) btn.setAttribute("aria-disabled", "true");
    else btn.removeAttribute("aria-disabled");
  });
  currentLabel.textContent = "Step " + draft.step + " of 5 — " + STEP_NAMES[draft.step - 1];
}

function railScheduleText() {
  const svc = getService(draft.serviceId);
  if (!svc) return "";
  const s = draft.schedule;
  if (svc.type === "hourly") {
    if (!s.date) return "";
    return formatDate(s.date) + (s.startTime ? " · " + s.startTime : "");
  }
  if (svc.type === "seasonal") {
    if (!s.program && !s.season) return "";
    return [s.program, s.season].filter(Boolean).join(" · ");
  }
  return s.campWeek || "";
}

function updateRail() {
  const svc = getService(draft.serviceId);
  rail.service.textContent = svc ? svc.name : "";
  const loc = getLocation(draft.locationId);
  rail.location.textContent = loc ? loc.name : "";
  rail.schedule.textContent = railScheduleText();
  const isRental = draft.serviceId === "ice-rental";
  rail.participantLabel.textContent = isRental ? "Group" : "Participant";
  rail.participant.textContent = isRental ? draft.details.groupName.trim() : draft.details.participantName.trim();
  const amount = currentDeposit();
  rail.deposit.textContent = amount == null ? "" : formatMoney(amount);
}

/* ---- Orchestration ---- */

function render(moveFocus = true) {
  showServiceChangeNoticeCleanup();
  const renderers = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];
  renderers[draft.step - 1]();
  updateStepsUI();
  updateRail();
  saveDraft();
  wireControls();
  if (moveFocus) {
    const title = panel.querySelector("#stepTitle");
    if (title) title.focus();
  }
  if (Object.keys(pendingErrors).length > 0) focusFirstError();
}

let noticeShownOnce = false;
function showServiceChangeNoticeCleanup() {
  if (showServiceChangeNotice && noticeShownOnce) showServiceChangeNotice = false;
  if (showServiceChangeNotice) noticeShownOnce = true;
  if (draft.step !== 1) {
    showServiceChangeNotice = false;
    noticeShownOnce = false;
  }
}

function wireControls() {
  const back = panel.querySelector("#backBtn");
  if (back) {
    back.addEventListener("click", () => {
      draft.step = Math.max(1, draft.step - 1);
      pendingErrors = {};
      render();
    });
  }
  const cont = panel.querySelector("#continueBtn");
  if (cont && draft.step < 5) {
    cont.addEventListener("click", () => {
      if (validateStep()) {
        draft.step += 1;
        pendingErrors = {};
        render();
      } else {
        render(false);
        focusFirstError();
      }
    });
  }
}

stepsList.addEventListener("click", (e) => {
  const btn = e.target.closest(".steps__num");
  if (!btn || btn.disabled) return;
  const target = Number(btn.dataset.goto);
  if (target < draft.step) {
    draft.step = target;
    pendingErrors = {};
    render();
  }
});

render(false);
