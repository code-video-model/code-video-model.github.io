#!/usr/bin/env python3

import argparse
import base64
import binascii
import hmac
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class AuthenticatedHandler(SimpleHTTPRequestHandler):
    username = ""
    password = ""

    def _authorized(self) -> bool:
        header = self.headers.get("Authorization", "")
        if not header.startswith("Basic "):
            return False

        try:
            decoded = base64.b64decode(header[6:], validate=True).decode("utf-8")
            username, password = decoded.split(":", 1)
        except (binascii.Error, UnicodeDecodeError, ValueError):
            return False

        return hmac.compare_digest(username, self.username) and hmac.compare_digest(
            password, self.password
        )

    def _require_authentication(self) -> None:
        self.send_response(401)
        self.send_header("WWW-Authenticate", 'Basic realm="Code Video Model"')
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self) -> None:
        if not self._authorized():
            self._require_authentication()
            return
        super().do_GET()

    def do_HEAD(self) -> None:
        if not self._authorized():
            self._require_authentication()
            return
        super().do_HEAD()


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the project page with Basic Auth")
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8795)
    parser.add_argument(
        "--directory",
        type=Path,
        default=Path(__file__).resolve().parent,
    )
    args = parser.parse_args()

    username = os.environ.get("PROJECT_PAGE_USERNAME")
    password = os.environ.get("PROJECT_PAGE_PASSWORD")
    if not username or not password:
        parser.error(
            "PROJECT_PAGE_USERNAME and PROJECT_PAGE_PASSWORD must both be set"
        )

    AuthenticatedHandler.username = username
    AuthenticatedHandler.password = password
    handler = partial(AuthenticatedHandler, directory=str(args.directory.resolve()))
    server = ThreadingHTTPServer((args.bind, args.port), handler)
    print(f"Serving authenticated project page on http://{args.bind}:{args.port}/")
    server.serve_forever()


if __name__ == "__main__":
    main()
