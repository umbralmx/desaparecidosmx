#!/usr/bin/env python3
# umbral-lint: ignore-file[hardcoded-value] — the --help examples must show real hexes
"""Contrast checker for the Umbral palette.

Answers the question an agent should never guess at: does this pair pass?

    python3 check_contrast.py "#128273" "#F2F3F1"      # one pair
    python3 check_contrast.py "#128273" "#F2F3F1" --role mark
    python3 check_contrast.py --audit                  # every token pair, both modes
    python3 check_contrast.py --list                   # the tokens themselves

Thresholds follow the role, not the pixel:

    text       4.5:1   anything read, including direct series labels
    mark       3.0:1   data marks — series, bars, points
    furniture  exempt  gridlines, borders, baselines (deliberately low-contrast)

Ratios are rounded DOWN. A gate must never round up into a pass — v1.0 had a token
that missed by 0.0009.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

ASSETS = pathlib.Path(__file__).resolve().parent.parent / "assets"
THRESHOLD = {"text": 4.5, "mark": 3.0}


def _linear(c: float) -> float:
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hex_color: str) -> float:
    h = hex_color.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(ch * 2 for ch in h)
    if len(h) != 6:
        raise ValueError(f"not a hex colour: {hex_color!r}")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _linear(r) + 0.7152 * _linear(g) + 0.0722 * _linear(b)


def contrast(fg: str, bg: str) -> float:
    a, b = luminance(fg), luminance(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def floor2(x: float) -> float:
    return int(x * 100) / 100


def load(name: str):
    p = ASSETS / name
    if not p.exists():
        sys.exit(f"{p} missing — this script expects to run from the skill directory")
    return json.loads(p.read_text())


def cmd_pair(fg: str, bg: str, role: str | None) -> int:
    r = floor2(contrast(fg, bg))
    print(f"{fg} on {bg}   {r}:1")
    roles = [role] if role else ["text", "mark"]
    worst = 0
    for ro in roles:
        need = THRESHOLD.get(ro)
        if need is None:
            print(f"  {ro:<10} exempt")
            continue
        ok = r >= need
        print(f"  {ro:<10} needs {need}:1   {'PASS' if ok else 'FAIL'}")
        worst |= 0 if ok else 1
    if not role and worst:
        print("\n  Passing as a mark but not as text is normal for signal/model/alert.")
        print("  Use the -text variant for anything read, including direct series labels.")
    return worst


def cmd_audit() -> int:
    report = load("contrast.json")
    bad = 0
    for mode, pairs in report["modes"].items():
        print(f"\nmodo {mode}")
        print(f"  {'token':<14}{'on':<8}{'ratio':>7}  {'role':<10}{'verdict'}")
        print("  " + "-" * 52)
        for p in pairs:
            verdict = "exempt" if p["pass"] is None else ("pass" if p["pass"] else "FAIL")
            if p["pass"] is False:
                bad += 1
            print(f"  {p['token']:<14}{p['on']:<8}{p['ratio']:>7.2f}  {p['role']:<10}{verdict}")
    s = report["summary"]
    print(f"\n{s['pairsChecked']} pairs checked · {s['failures']} failing · "
          f"{s['exempt']} furniture tokens exempt")
    print(f"worst series separation incl. simulated dichromacy: {s['worstSeriesSeparation']}")
    return 1 if bad else 0


def cmd_list() -> int:
    tokens = load("tokens.json")
    report = load("contrast.json")
    roles = {p["token"]: p["role"] for p in report["modes"]["laboratorio"]}
    print(f"{'token':<14}{'laboratorio':<14}{'instrumento':<14}role")
    print("-" * 54)
    for name, light in tokens["mode"]["laboratorio"].items():
        if name == "series":
            continue
        dark = tokens["mode"]["instrumento"][name]
        print(f"{name:<14}{light:<14}{dark:<14}{roles.get(name, 'surface')}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("colors", nargs="*", metavar="HEX", help="foreground and background")
    ap.add_argument("--role", choices=["text", "mark", "furniture"])
    ap.add_argument("--audit", action="store_true", help="check every token pair")
    ap.add_argument("--list", action="store_true", help="list the tokens")
    a = ap.parse_args()

    if a.audit:
        return cmd_audit()
    if a.list:
        return cmd_list()
    if len(a.colors) != 2:
        ap.print_help()
        return 2
    return cmd_pair(a.colors[0], a.colors[1], a.role)


if __name__ == "__main__":
    sys.exit(main())
