/*
 * home.js — the services catalog page.
 *
 * One job beyond seeding: the brand switch. RINK's catalogue is eleven cards,
 * so before this the only way to discover Testify Performance was to scroll
 * past all of it — which read as an afterthought rather than half the offer.
 *
 * State lives in the URL hash (#rink / #testify), so the back button works,
 * a filtered view is shareable, and a demo click can be reproduced from a
 * link. The hash values deliberately don't match any element id: matching one
 * would make the browser jump-scroll to it on every change.
 */

import { ensureSeed } from "./store.js";
import { SERVICES, BRANDS } from "./catalog.js";

ensureSeed();

const VIEWS = {
  all: {
    label: "All services",
    intro:
      "Everything bookable across both brands, at two facilities. Sessions and ice by the hour, " +
      "programs by season, camps by the week, and off-ice training on a monthly membership."
  },
  rink: {
    label: BRANDS.rink.name,
    intro:
      "On-ice development at two facilities. Sessions and ice are booked by the hour, programs by " +
      "season, camps by the week. Clinics are registered through the front desk."
  },
  testify: {
    label: BRANDS.testify.name,
    intro:
      "Off-ice training and therapy, in the same two buildings and on the same account. Memberships " +
      "run month to month after a paid assessment; therapy is booked with the clinic team."
  }
};

const switchEl = document.getElementById("brandSwitch");
const introEl = document.getElementById("servicesIntro");
const liveEl = document.getElementById("brandSwitchStatus");
const sections = {
  rink: document.getElementById("services"),
  testify: document.getElementById("testify")
};

/* Card counts come from the catalog rather than being written into the copy,
   so the summary can't drift when a service is added. */
function countFor(brandId) {
  return SERVICES.filter((s) => (s.brand || "rink") === brandId).length;
}

function viewFromHash() {
  const raw = window.location.hash.replace(/^#/, "").toLowerCase();
  return Object.prototype.hasOwnProperty.call(VIEWS, raw) ? raw : "all";
}

function apply(view) {
  for (const [brand, section] of Object.entries(sections)) {
    section.hidden = view !== "all" && view !== brand;
  }

  introEl.textContent = VIEWS[view].intro;

  switchEl.querySelectorAll("input").forEach((input) => {
    input.checked = input.value === view;
  });

  const shown =
    view === "all" ? countFor("rink") + countFor("testify") : countFor(view);
  liveEl.textContent =
    "Showing " + shown + " services — " + VIEWS[view].label + ".";
}

switchEl.addEventListener("change", (e) => {
  const value = e.target.value;
  /* Writing the hash drives apply() through the hashchange handler, so the
     click path and the shared-link path stay identical. "all" clears it so a
     default view has a clean URL. */
  if (value === "all") {
    try {
      history.pushState(null, "", window.location.pathname + window.location.search);
    } catch {
      window.location.hash = "";
    }
    apply("all");
  } else {
    window.location.hash = value;
  }
});

/*
 * The window-level listeners have to survive this module running more than
 * once. In the single-file artifact build the home page is re-initialised
 * every time it is routed to, and a plain addEventListener would stack a new
 * handler on each visit. Keeping the previous one on `window` and removing it
 * first makes re-initialisation idempotent in both builds.
 */
const HANDLER_KEY = "__rinkHomeBrandHandler";
if (window[HANDLER_KEY]) {
  window.removeEventListener("hashchange", window[HANDLER_KEY]);
  window.removeEventListener("popstate", window[HANDLER_KEY]);
}
const onRouteChange = () => {
  /* Guard against a stale handler firing after the page has been swapped out
     from under it in the artifact build. */
  if (!document.body.contains(switchEl)) return;
  apply(viewFromHash());
};
window[HANDLER_KEY] = onRouteChange;
window.addEventListener("hashchange", onRouteChange);
window.addEventListener("popstate", onRouteChange);

apply(viewFromHash());
