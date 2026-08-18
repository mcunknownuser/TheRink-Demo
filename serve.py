#!/usr/bin/env python3
"""
serve.py — local dev server for the demo.

Use this instead of `python3 -m http.server`.

The site is built from ES modules that import each other. Python's stock server
sends no cache headers, so a browser will happily hold an old `catalog.js`
next to a new `book.js` — and when an import no longer resolves, the module
fails to execute *silently*. The page renders completely empty with nothing in
the console to explain it. This server sends no-store on everything, so that
mismatch can't happen.

    python3 serve.py            # http://localhost:8000
    python3 serve.py 8080       # a different port
"""

import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def guess_type(self, path):
        """Serve text as UTF-8 so em dashes and · don't turn into mojibake."""
        mime = super().guess_type(path)
        if mime in ("text/html", "text/css", "application/javascript", "text/javascript"):
            return mime + "; charset=utf-8"
        return mime


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print("RINK + Testify demo → http://localhost:%d/  (Ctrl+C to stop)" % port)
    HTTPServer(("", port), NoCacheHandler).serve_forever()
