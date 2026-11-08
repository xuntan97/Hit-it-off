#!/usr/bin/env python3
"""Push pages to the badge over its own hotspot, without a browser.

Doubles as a way to tell "the firmware is fine, the page is broken" apart from
"the firmware never received anything" during a demo.

    python3 tools/http_test.py                 # ping + state
    python3 tools/http_test.py --deck 2        # card + two beasts
    python3 tools/http_test.py --beast congguang
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

BASE = "http://192.168.50.1"
HEAD = 4  # slot, pages, show, reserved
FRAMES = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..",
                                       "epd-out", "frames"))
SLOTS = ["person", "baize", "qingluan", "congguang"]


def call(path: str, body: bytes | None = None, timeout: float = 8.0) -> str:
    req = urllib.request.Request(BASE + path, data=body,
                                 method="POST" if body is not None else "GET")
    if body is not None:
        req.add_header("Content-Type", "text/plain")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", "replace").strip()


def frame(key: str) -> bytes:
    for name in os.listdir(FRAMES):
        if name.endswith(f"-{key}.bin"):
            with open(os.path.join(FRAMES, name), "rb") as fp:
                return fp.read()
    raise SystemExit(f"missing frame for {key!r} in {FRAMES}")


def push(slot: int, pages: int, show: int, key: str) -> None:
    data = frame(key)
    body = bytes([slot, pages, show, 0]) + data
    call("/frame", body)
    print(f"  slot {slot} {key:<10} {len(data)} bytes  pages={pages} show={show}  -> ok")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--deck", type=int, default=None, help="upload the card plus N beasts")
    ap.add_argument("--beast", default=None, help="upload one beast page by key")
    args = ap.parse_args()

    try:
        print("ping  :", call("/ping", timeout=4))
        print("state :", call("/state"))
    except (urllib.error.URLError, OSError) as err:
        raise SystemExit(f"badge unreachable at {BASE} ({err}) — is the Mac on HitItOff?")

    if args.deck:
        for slot in range(args.deck + 1):
            push(slot, args.deck, 0 if slot == args.deck else 0xFF, SLOTS[slot])
    elif args.beast:
        slot = SLOTS.index(args.beast)
        push(slot, slot, slot, args.beast)

    if args.deck or args.beast:
        print("state :", call("/state"))


if __name__ == "__main__":
    main()
