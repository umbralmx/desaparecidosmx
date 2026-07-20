"""Vintage re-scrape: refetch the trailing months and snapshot the result.

The register keeps receiving late registrations for recent
fecha-de-hechos months, so data/processed/ is only "the register as of
consultado_en". This job re-fetches the trailing window (default 24
complete months, all 33 entidades) and appends a dated snapshot of the
window to data/vintages/<label>.csv — an append-only series of
register views that the nowcast / revision-audit work needs.

Per run:
1. If running the full entidad set and the window's current processed
   rows aren't snapshotted yet, write them first as the pre-refetch
   baseline vintage (labeled by their max consultado_en).
2. Refetch stale months via rnpdno.run (refetch=True). A month is
   fresh — and skipped, making an interrupted run resumable with the
   same arguments — when every estado's raw Totales was fetched on or
   after the run label's date.
3. Rebuild the yearly all-states files the window touches.
4. Snapshot the refreshed window to data/vintages/<label>.csv plus a
   .meta.json (window, row count, any per-slice failures).

Usage:
    python scripts/scrape_vintage.py                  # full monthly job
    python scripts/scrape_vintage.py --window 2 --estados 1   # smoke test
    python scripts/scrape_vintage.py --label 2026-08-09       # resume a run
"""

import argparse
import csv
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "src"))

from rnpdno.catalogs import ENTIDADES, cve_entidad          # noqa: E402
from rnpdno.combine import combine_year                     # noqa: E402
from rnpdno.config import RAW_DIR                           # noqa: E402
from rnpdno.export import PROCESSED_DIR                     # noqa: E402
from rnpdno.run import Runner, parse_estados, run           # noqa: E402
from rnpdno.transform import COLUMNS                        # noqa: E402

VINTAGES_DIR = REPO_ROOT / "data" / "vintages"
DEFAULT_WINDOW = 24


def trailing_months(n: int, today: date) -> list[str]:
    """The n complete months before today's month, ascending."""
    year, month = today.year, today.month
    months = []
    for _ in range(n):
        month -= 1
        if month == 0:
            year, month = year - 1, 12
        months.append(f"{year}-{month:02d}")
    return sorted(months)


def gather_rows(months: list[str], estados: list[str]) -> list[dict]:
    """Window rows from data/processed/: monthly CSVs + sin-fecha once."""
    rows = []
    for id_estado in estados:
        state_dir = PROCESSED_DIR / cve_entidad(id_estado)
        for name in months + ["sin-fecha"]:
            path = state_dir / f"{name}.csv"
            if not path.is_file():
                raise FileNotFoundError(f"expected processed file {path}")
            with path.open(newline="", encoding="utf-8") as f:
                rows.extend(csv.DictReader(f))
    return rows


def write_vintage(label: str, months: list[str], estados: list[str],
                  runner: Runner | None = None) -> Path:
    rows = gather_rows(months, estados)
    VINTAGES_DIR.mkdir(parents=True, exist_ok=True)
    out_path = VINTAGES_DIR / f"{label}.csv"
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    meta = {
        "label": label,
        "written_at": datetime.now().astimezone().isoformat(),
        "months": months,
        "estados": estados,
        "n_rows": len(rows),
        "failures": [list(f) for f in runner.failures] if runner else [],
    }
    (VINTAGES_DIR / f"{label}.meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2))
    print(f"vintage {label}: {len(rows)} rows -> {out_path}", file=sys.stderr)
    return out_path


def ensure_baseline(months: list[str], estados: list[str]) -> None:
    """Snapshot the pre-refetch window once, labeled by its consultado_en."""
    rows = gather_rows(months, estados)
    label = max(r["consultado_en"] for r in rows)
    if not (VINTAGES_DIR / f"{label}.csv").is_file():
        print(f"baseline vintage {label} not yet snapshotted; writing it "
              "before refetch", file=sys.stderr)
        write_vintage(label, months, estados)


def month_is_fresh(mes: str, estados: list[str], label: str) -> bool:
    """True if every estado's raw Totales was fetched on/after label's date."""
    for id_estado in estados:
        meta_path = RAW_DIR / f"estado={id_estado}" / mes / "Totales.meta.json"
        if not meta_path.is_file():
            return False
        fetched_at = json.loads(meta_path.read_text()).get("fetched_at", "")
        if fetched_at[:10] < label:
            return False
    return True


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Refetch the trailing window and snapshot a vintage.")
    parser.add_argument("--window", type=int, default=DEFAULT_WINDOW,
                        metavar="N", help="number of trailing complete "
                        f"months to refetch (default {DEFAULT_WINDOW})")
    parser.add_argument("--estados", type=parse_estados,
                        default=parse_estados("all"),
                        metavar="all|ID,ID,...",
                        help="estados to refetch (default all; a subset "
                        "skips the baseline snapshot)")
    # UTC to match consultado_en, which transform derives from the raw
    # fetched_at timestamps.
    parser.add_argument("--label",
                        default=datetime.now(timezone.utc).date().isoformat(),
                        metavar="YYYY-MM-DD",
                        help="vintage label; pass a previous run's label "
                        "to resume it (default today)")
    args = parser.parse_args()

    months = trailing_months(args.window, date.fromisoformat(args.label))
    full_set = args.estados == sorted(ENTIDADES, key=int)
    print(f"vintage run {args.label}: {months[0]}..{months[-1]}, "
          f"{len(args.estados)} estados", file=sys.stderr)

    if full_set:
        ensure_baseline(months, args.estados)

    stale = [m for m in months
             if not month_is_fresh(m, args.estados, args.label)]
    if stale:
        print(f"refetching {len(stale)}/{len(months)} months "
              f"({len(months) - len(stale)} already fresh)", file=sys.stderr)
        runner = run(args.estados, stale, years=[], refetch=True)
        print(runner.summary())
    else:
        runner = None
        print("all months already fresh; snapshot only", file=sys.stderr)

    if full_set:
        for year in sorted({m[:4] for m in months}):
            combine_year(year)

    write_vintage(args.label, months, args.estados, runner)
    sys.exit(1 if runner and runner.failures else 0)


if __name__ == "__main__":
    main()
