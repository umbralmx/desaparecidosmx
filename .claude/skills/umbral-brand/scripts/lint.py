#!/usr/bin/env python3
"""Umbral conformance checks — the subset that works standalone.

    python3 lint.py <path>            # check a file or directory
    python3 lint.py <path> --json     # machine-readable

This is a thin, dependency-free stand-in for `tools/umbral-lint` (Phase 5 of the
style guide build). It implements the checks that need nothing but the file and the
token list, and reports rule IDs so a finding can be looked up.

It deliberately does NOT string-match. Naive greps for the banned strings produce
almost entirely false positives on real Umbral code:

    "Inter"       matches  cursor: pointer
    "white"       matches  white-space: nowrap
    "gradient"    matches  a single-colour linear-gradient drawing a 1px rule
    "box-shadow"  matches  inset 4px 0 0 var(--u-signal), which is a rule, not a shadow

All four of those were measured against the most conformant product in the Umbral
portfolio. So the checks below parse declarations and skip comments.

Known limits, so you do not over-trust a clean run: it does not catch bare hexes
without a leading `#` (matplotlib style files write `xtick.color: 9AA19B`), and the
chart-source check is a heuristic over one file at a time. `umbral-lint` covers both.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys

ASSETS = pathlib.Path(__file__).resolve().parent.parent / "assets"

CSS_LIKE = {".css", ".scss", ".sass", ".html", ".htm", ".svelte", ".vue", ".jsx", ".tsx"}
CODE_LIKE = {".py", ".r", ".R", ".js", ".mjs", ".ts", ".qmd", ".ipynb", ".md"}
BANNED_FAMILIES = {"inter", "roboto", "arial", "helvetica", "source sans", "source sans pro"}

findings: list[dict] = []


def report(rule: str, sev: str, path: pathlib.Path, line: int, msg: str, fix: str) -> None:
    findings.append({"rule": rule, "severity": sev, "file": str(path),
                     "line": line, "message": msg, "fix": fix})


def strip_comments(text: str) -> list[tuple[int, str]]:
    """Return (line_number, code) with /* */, // and # comments blanked out."""
    text = re.sub(r"/\*.*?\*/", lambda m: "\n" * m.group().count("\n"), text, flags=re.S)
    out = []
    for i, raw in enumerate(text.splitlines(), 1):
        # `//` is only a comment when it is not the `//` of a URL scheme.
        line = re.sub(r"(?<!:)//.*$", "", raw)
        line = re.sub(r"(?<!:)#(?![0-9A-Fa-f]{3,8}\b).*$", "", line)
        out.append((i, line))
    return out


def token_hexes() -> dict[str, str]:
    t = json.loads((ASSETS / "tokens.json").read_text())
    out = {}
    for mode, vals in t["mode"].items():
        for name, v in vals.items():
            if isinstance(v, str) and v.startswith("#"):
                out[v.lower()] = f"{name} ({mode})"
    return out


TOKENS = token_hexes()


# The token files are where hexes are SUPPOSED to live. Flagging them for
# containing colour values is the linter failing to understand its own system.
TOKEN_FILE = re.compile(
    r"(^|/)(tokens\.(css|json|py|R|scss)|_tokens\.scss|[\w.-]+\.tokens\.json"
    r"|contrast\.json|plotly-umbral-\w+\.json|umbral-\w+\.mplstyle"
    r"|streamlit-config\.toml|_brand\.yml)$")


def is_token_file(p: pathlib.Path) -> bool:
    return bool(TOKEN_FILE.search(p.as_posix())) or "tokens/" in p.as_posix()


def check_file(p: pathlib.Path) -> None:
    try:
        text = p.read_text(errors="replace")
    except OSError:
        return
    lines = strip_comments(text)
    ext = p.suffix
    token_source = is_token_file(p)

    for n, line in lines:
        low = line.lower()

        # UMB-COL-001 — pure black/white, as a colour value not a word
        for m in (re.finditer(r"(?:^|[:\s,(])(#fff|#ffffff|#000|#000000)\b", low)
                  if not token_source else []):
            report("UMB-COL-001", "error", p, n, f"pure {m.group(1)}",
                   "use var(--u-base) / var(--u-ink)")
        for m in re.finditer(r"(?:color|background|fill|stroke)\s*:\s*(white|black)\b", low):
            report("UMB-COL-001", "error", p, n, f"pure {m.group(1)}",
                   "use var(--u-base) / var(--u-ink)")

        # UMB-COL-002 / UMB-PRO-003 — a hex that is already a token
        for m in (re.finditer(r"#[0-9a-f]{6}\b", low) if not token_source else []):
            if m.group() in TOKENS:
                report("UMB-COL-002", "error", p, n,
                       f"{m.group()} is the {TOKENS[m.group()]} token, hard-coded",
                       "import it from tokens/build/")

        # UMB-TYP-002 — banned families, matched as stack entries not substrings
        fm = re.search(r"font-family\s*:\s*([^;}\n]+)", low)
        if fm:
            for fam in fm.group(1).split(","):
                fam = fam.strip().strip("'\"")
                if fam in BANNED_FAMILIES:
                    report("UMB-TYP-002", "error", p, n, f"font family {fam!r}",
                           "Space Grotesk / IBM Plex Sans / IBM Plex Mono only")

        # UMB-TYP-001 — heavy display weight
        wm = re.search(r"font-weight\s*:\s*(\d{3}|bold)\b", low)
        if wm and (wm.group(1) == "bold" or int(wm.group(1)) >= 700):
            report("UMB-TYP-001", "error", p, n, f"font-weight {wm.group(1)}",
                   "display type is Space Grotesk 500; 600 for small labels")

        # UMB-LAY-001 — radius above the 2px ceiling
        for m in re.finditer(r"border-radius\s*:\s*([^;}\n]+)", low):
            for v in re.findall(r"(\d+(?:\.\d+)?)(px|rem|em|%)", m.group(1)):
                px = float(v[0]) * (16 if v[1] in ("rem", "em") else 1)
                if v[1] == "%" or px > 2:
                    report("UMB-LAY-001", "error", p, n,
                           f"border-radius {v[0]}{v[1]}", "maximum is 2px")

        # UMB-LAY-002 — drop shadows, but `inset` is a rule and is allowed
        sm = re.search(r"box-shadow\s*:\s*([^;}\n]+)", low)
        if sm and "inset" not in sm.group(1) and sm.group(1).strip() != "none":
            report("UMB-LAY-002", "error", p, n, "box-shadow",
                   "1px rules do the structural work; inset shadows are fine")

        # UMB-COL-003 — gradients, but a single-colour one is a layout technique
        gm = re.search(r"(linear|radial|conic)-gradient\(([^)]*)\)", low)
        if gm:
            stops = set(re.findall(r"var\(--[\w-]+\)|#[0-9a-f]{3,8}", gm.group(2)))
            if len(stops) > 1:
                report("UMB-COL-003", "error", p, n, "gradient with multiple stops",
                       "solid fills; a sequential ramp if intensity must be encoded")

        # UMB-LAY-005 — emoji
        if re.search(r"[\U0001F300-\U0001FAFF☀-➿]", line):
            report("UMB-LAY-005", "error", p, n, "emoji",
                   "the numbers carry the argument")

        # UMB-VOZ-004 — placeholder content
        if re.search(r"\blorem ipsum\b", low):
            report("UMB-VOZ-004", "error", p, n, "placeholder text",
                   "publish the section when its copy exists")

    # UMB-TYP-005 — fonts must be self-hosted
    for n, line in lines:
        if re.search(r"fonts\.(googleapis|gstatic|bunny|cdnfonts)\.com|use\.typekit", line, re.I):
            report("UMB-TYP-005", "error", p, n, "font served from a CDN",
                   "self-host to assets/fonts/; a data product must work offline "
                   "and must not leak reader IPs to a third party")

    # UMB-A11Y-001 — lang on an HTML document
    if ext in (".html", ".htm"):
        m = re.search(r"<html[^>]*\blang\s*=\s*[\"']([^\"']+)", text, re.I)
        if not m:
            report("UMB-A11Y-001", "error", p, 1, "no lang attribute", 'set lang="es"')
        elif m.group(1).startswith("en") and re.search(r"[áéíóúñ¿¡]", text, re.I):
            report("UMB-A11Y-001", "error", p, 1,
                   f'lang="{m.group(1)}" on Spanish content', 'set lang="es"')

    # UMB-CHT-003 — a file that plots but never names a source
    if ext in CODE_LIKE:
        plots = re.search(r"\b(plt\.(plot|bar|scatter|fill_between)|go\.Figure|px\.\w+|"
                          r"Plot\.plot|alt\.Chart|ggplot)\s*\(", text)
        if plots and not re.search(r"Fuente\s*:", text, re.I):
            report("UMB-CHT-003", "error", p, text[:plots.start()].count("\n") + 1,
                   "chart code with no source line",
                   "Fuente: ORIGEN · consultado FECHA · SNAPSHOT · umbral.mx · CC BY 4.0")


def walk(root: pathlib.Path):
    skip = {".git", "node_modules", "__pycache__", ".venv", "dist", "_site", ".quarto"}
    if root.is_file():
        yield root
        return
    for p in root.rglob("*"):
        if p.is_file() and not any(s in p.parts for s in skip):
            if p.suffix in CSS_LIKE | CODE_LIKE:
                yield p


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("path", type=pathlib.Path)
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    if not a.path.exists():
        sys.exit(f"{a.path} does not exist")
    for f in walk(a.path):
        check_file(f)

    errors = [f for f in findings if f["severity"] == "error"]
    if a.json:
        print(json.dumps({"findings": findings, "errors": len(errors)}, indent=2))
    else:
        for f in sorted(findings, key=lambda x: (x["file"], x["line"])):
            print(f"{f['file']}:{f['line']}  {f['severity']:<7} {f['rule']}  {f['message']}")
            print(f"    fix: {f['fix']}")
        print(f"\n{len(findings)} finding(s), {len(errors)} error(s)")
        if not findings:
            print("clean")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
