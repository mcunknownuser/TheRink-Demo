#!/usr/bin/env python3
"""
build-artifact.py — bundle the multi-page demo into ONE self-contained HTML file.

The site itself is a normal multi-page app: five HTML pages, seven ES modules,
two stylesheets, self-hosted fonts. A Claude Artifact must be a single file
with no external requests, so this script derives that file from the real
sources rather than anyone maintaining a second copy by hand. Re-run it after
changing the site and republish.

    python3 tools/build-artifact.py

What it does:
  * inlines both stylesheets, with fonts embedded as data: URIs
  * embeds images as data: URIs
  * concatenates the shared modules in dependency order, each wrapped in an
    IIFE that returns its exports (they have colliding private helpers — two
    different `storage()` functions, for one)
  * wraps each page script in an init function so their many same-named
    helpers (`esc`, `ICON_INFO`, `STATUS_LABELS`, …) stop colliding
  * swaps page-to-page navigation for a hash router

Output: dist/rink-demo.html
"""

import base64
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "dist" / "rink-demo.html"

# Shared modules, in dependency order. Each is wrapped in an IIFE and its
# exports are destructured to top level for the next one to use.
SHARED = ["catalog.js", "card.js", "seed.js", "store.js", "accounts.js"]

# page id -> (html file, page script, body class)
PAGES = {
    "home": ("index.html", "home.js", ""),
    "book": ("book.html", "book.js", ""),
    "confirmation": ("confirmation.html", "confirmation.js", ""),
    "account": ("account.html", "account.js", ""),
    "dashboard": ("dashboard.html", "dashboard.js", "dash"),
}


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def data_uri(rel, mime):
    raw = (ROOT / rel).read_bytes()
    return "data:%s;base64,%s" % (mime, base64.b64encode(raw).decode("ascii"))


# ---------------------------------------------------------------- modules

IMPORT_RE = re.compile(r"^import\s+(?:[\s\S]*?)\s+from\s+\"[^\"]+\";\s*$", re.M)
REEXPORT_RE = re.compile(r"^export\s*\{([^}]*)\}\s*;\s*$", re.M)


def exported_names(src):
    """Every name a module exports, including `export { A, B };` re-exports."""
    names = []
    names += re.findall(r"^export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)", src, re.M)
    names += re.findall(r"^export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)", src, re.M)
    for block in REEXPORT_RE.findall(src):
        names += [n.strip() for n in block.split(",") if n.strip()]
    seen, out = set(), []
    for n in names:
        if n not in seen:
            seen.add(n)
            out.append(n)
    return out


def strip_module_syntax(src):
    src = IMPORT_RE.sub("", src)
    src = REEXPORT_RE.sub("", src)
    src = re.sub(r"^export\s+", "", src, flags=re.M)
    return src


def build_shared():
    """Emit each shared module as an IIFE plus a top-level destructure."""
    chunks, declared = [], set()
    for name in SHARED:
        src = read("assets/js/" + name)
        exports = exported_names(src)
        body = strip_module_syntax(src)
        fresh = [n for n in exports if n not in declared]
        declared.update(fresh)
        tag = "__m_" + name.replace(".js", "")
        chunks.append(
            "/* ==== assets/js/%s ==== */\n"
            "const %s = (function () {\n%s\nreturn { %s };\n})();\n"
            "const { %s } = %s;\n"
            % (name, tag, body, ", ".join(exports), ", ".join(fresh), tag)
        )
    return "\n".join(chunks)


def build_page_script(page_id, filename):
    """Wrap a page script so its module-level state resets on each visit."""
    src = strip_module_syntax(read("assets/js/" + filename))
    # Page scripts read their own query string; the router supplies it.
    src = src.replace("window.location.search", "ROUTE_QUERY")
    # In-app navigation goes through the router, not a document load.
    src = src.replace(
        'window.location.href = "confirmation.html?ref=" + encodeURIComponent(record.ref);',
        'navigate("confirmation", "ref=" + encodeURIComponent(record.ref));',
    )
    return "function init_%s() {\n%s\n}\n" % (page_id, src)


# ---------------------------------------------------------------- markup

LOGO_INV = None  # filled in main()


def page_body(html):
    """Everything inside <body>, minus the module <script> tag."""
    body = html.split("<body", 1)[1].split(">", 1)[1].rsplit("</body>", 1)[0]
    body = re.sub(r'<script type="module"[^>]*>[\s\S]*?</script>', "", body)
    body = re.sub(r"<script[^>]*src=[^>]*></script>", "", body)
    # Page-to-page links become router hashes.
    body = body.replace('href="index.html"', 'href="#home"')
    body = body.replace('href="account.html"', 'href="#account"')
    body = body.replace('href="dashboard.html"', 'href="#dashboard"')
    body = re.sub(r'href="book\.html\?service=([\w-]+)"', r'href="#book?service=\1"', body)
    body = body.replace('href="book.html"', 'href="#book"')
    body = body.replace('src="assets/img/logo-inv.png"', 'src="%s"' % LOGO_INV)
    return body.strip()


def build_css():
    css = read("assets/css/main.css") + "\n" + read("assets/css/dashboard.css")
    css = css.replace(
        'url("../fonts/geom-semibold.woff2") format("woff2"),\n       url("../fonts/geom-semibold.woff") format("woff")',
        'url("%s") format("woff2")' % data_uri("assets/fonts/geom-semibold.woff2", "font/woff2"),
    )
    css = css.replace(
        'url("../fonts/opensans-variable.woff2") format("woff2-variations")',
        'url("%s") format("woff2-variations")'
        % data_uri("assets/fonts/opensans-variable.woff2", "font/woff2"),
    )
    # Only one page is in the DOM at a time.
    css += "\n/* ---- Artifact shell ---- */\n.page-view[hidden] { display: none !important; }\n"
    return css


ROUTER_JS = """
/* ---- Hash router -------------------------------------------------------
   The real demo is five separate documents. Here they share one, so each
   route re-creates its container's markup from a template before running the
   page script: fresh nodes mean the previous visit's event listeners are
   discarded with the nodes they were bound to, exactly as a real page load
   would do. ROUTE_QUERY stands in for window.location.search. */

let ROUTE_QUERY = "";
const PAGE_INIT = {
  home: init_home,
  book: init_book,
  confirmation: init_confirmation,
  account: init_account,
  dashboard: init_dashboard
};
const BODY_CLASS = { dashboard: "dash" };
const DEFAULT_PAGE = "home";

function navigate(page, query) {
  window.location.hash = "#" + page + (query ? "?" + query : "");
}

function parseHash() {
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return { page: DEFAULT_PAGE, query: "" };
  const i = raw.indexOf("?");
  const page = i === -1 ? raw : raw.slice(0, i);
  return {
    page: Object.prototype.hasOwnProperty.call(PAGE_INIT, page) ? page : DEFAULT_PAGE,
    query: i === -1 ? "" : raw.slice(i + 1)
  };
}

function renderRoute() {
  const { page, query } = parseHash();
  ROUTE_QUERY = query ? "?" + query : "";
  document.body.className = BODY_CLASS[page] || "";
  for (const id of Object.keys(PAGE_INIT)) {
    const view = document.getElementById("view-" + id);
    const isCurrent = id === page;
    if (isCurrent) view.innerHTML = document.getElementById("tpl-" + id).innerHTML;
    else view.innerHTML = "";
    view.hidden = !isCurrent;
  }
  const init = PAGE_INIT[page];
  if (init) init();
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", renderRoute);
renderRoute();
"""


def main():
    global LOGO_INV
    LOGO_INV = data_uri("assets/img/logo-inv.png", "image/png")

    views, templates, page_scripts = [], [], []
    for page_id, (html_file, script, _cls) in PAGES.items():
        templates.append(
            '<template id="tpl-%s">%s</template>' % (page_id, page_body(read(html_file)))
        )
        views.append('<div class="page-view" id="view-%s" hidden></div>' % page_id)
        if script:
            page_scripts.append(build_page_script(page_id, script))

    doc = (
        "<title>RINK Booking Platform — Demo</title>\n"
        "<style>\n" + build_css() + "\n</style>\n"
        + "\n".join(templates) + "\n"
        + "\n".join(views) + "\n"
        + '<script type="module">\n'
        + build_shared() + "\n"
        + "\n".join(page_scripts) + "\n"
        + ROUTER_JS
        + "\n</script>\n"
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(doc, encoding="utf-8")
    print("wrote %s (%.1f KB)" % (OUT, len(doc.encode()) / 1024))


if __name__ == "__main__":
    main()
