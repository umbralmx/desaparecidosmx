"""Cross-entidad validation invariants, complementing transform.py's
per-slice reconciliation (see docs/DECISIONS.md #13).

national_cross_check reads only cached raw data — never the network.
Populate the national (idEstado=0) side with
`python -m rnpdno.validate --periodo <YYYY-MM> --fetch-national` first.

Usage:
    python -m rnpdno.validate --periodo 2024-01 --fetch-national
"""

import argparse
import json
import sys
from datetime import datetime

from rnpdno.catalogs import CATEGORIA_TOTALES_FIELD, ENTIDADES
from rnpdno.config import RAW_DIR
from rnpdno.transform import ReconciliationError, parse_total

TOTALES_FIELDS = list(CATEGORIA_TOTALES_FIELD.values()) + ["TotalGlobal"]


def national_cross_check(periodo: str) -> None:
    """Sum of every entidad's own Totales must equal the direct
    idEstado=0 query, for every categoria field plus TotalGlobal.

    A misattributed row (MunicipioProvenanceError's concern) still
    passes this check — it's still counted somewhere nationally either
    way. This instead catches drops or duplicates across the per-entidad
    fetch loop: something a wrong-entidad leak, by construction, cannot
    produce (see DECISIONS.md #13).
    """
    national_path = RAW_DIR / "estado=0" / periodo / "Totales.json"
    if not national_path.is_file():
        raise FileNotFoundError(
            f"no cached national Totales at {national_path}; run with "
            "--fetch-national first")
    national = json.loads(national_path.read_text())

    summed = dict.fromkeys(TOTALES_FIELDS, 0)
    missing = []
    for id_estado in ENTIDADES:
        path = RAW_DIR / f"estado={id_estado}" / periodo / "Totales.json"
        if not path.is_file():
            missing.append(id_estado)
            continue
        totales = json.loads(path.read_text())
        for field in TOTALES_FIELDS:
            summed[field] += parse_total(totales[field])
    if missing:
        raise FileNotFoundError(
            f"missing cached Totales for estado(s) {missing} at periodo={periodo}")

    mismatches = {
        field: (summed[field], parse_total(national[field]))
        for field in TOTALES_FIELDS
        if summed[field] != parse_total(national[field])
    }
    if mismatches:
        detail = ", ".join(
            f"{field}: sum(entidades)={s} vs national={n}"
            for field, (s, n) in mismatches.items())
        raise ReconciliationError(
            f"national cross-check failed for periodo={periodo}: {detail}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="National cross-check: sum of per-entidad Totales "
                    "vs. the direct idEstado=0 query.")
    parser.add_argument("--periodo", required=True, metavar="YYYY-MM")
    parser.add_argument("--fetch-national", action="store_true",
                        help="fetch the national Totales first if not "
                             "already cached")
    args = parser.parse_args()
    try:
        datetime.strptime(args.periodo, "%Y-%m")
    except ValueError:
        parser.error(f"--periodo must be YYYY-MM, got {args.periodo!r}")

    if args.fetch_national:
        from rnpdno.ingest import fetch_national_totales, month_bounds
        fecha_inicio, fecha_fin = month_bounds(args.periodo)
        fetch_national_totales(fecha_inicio, fecha_fin)

    national_cross_check(args.periodo)
    print(f"national cross-check passed for periodo={args.periodo}",
          file=sys.stderr)


if __name__ == "__main__":
    main()
