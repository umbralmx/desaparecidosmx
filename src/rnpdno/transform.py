"""Normalize cached raw RNPDNO responses into the CSV row shape.

Row grain: entidad x month x categoria x sexo x municipio (see
docs/data_dictionary.md). Reads only from data/raw/ — never hits the
network.

Municipio x sexo counts come from the cached TablaDetalle responses
(complete municipio table). If a table's sum falls short of the
corresponding Totales field, a MUNICIPIO NO DESGLOSADO residual row is
added so totals still reconcile, and the fallback is logged to stderr.
Every municipio name is also checked against that entidad's own
CatalogoMunicipios: an unrecognized name is either the source's own
SIN MUNICIPIO DE REFERENCIA bucket (legitimate) or a cross-entidad
leak, and raises MunicipioProvenanceError.

Also computes the per-state SIN_FECHA bucket: records without a fecha
de hechos, per categoria, as Totales(mostrarFechaNula=1) minus
Totales(mostrarFechaNula=0).
"""

import json
import re
import sys
from pathlib import Path

from rnpdno.catalogs import (
    CATEGORIA_TOTALES_FIELD,
    CATEGORIAS,
    ENTIDADES,
    cve_entidad,
    cve_municipio,
)
from rnpdno.config import RAW_DIR

COLUMNS = [
    "cve_entidad",
    "entidad",
    "periodo",
    "categoria",
    "sexo",
    "cve_municipio",
    "municipio",
    "conteo",
    "consultado_en",
]

RESIDUAL_MUNICIPIO = "MUNICIPIO NO DESGLOSADO"
SIN_FECHA_PERIODO = "SIN_FECHA"

# TablaDetalle's own bucket for records it cannot pin to a municipio.
# Unlike RESIDUAL_MUNICIPIO (synthesized here to patch a shortfall),
# this label comes verbatim from the source and legitimately never
# joins to a CatalogoMunicipios entry.
SIN_MUNICIPIO_REFERENCIA = "SIN MUNICIPIO DE REFERENCIA"

# TablaDetalle column header -> sexo value.
SEXO_HEADERS = {"HOMBRES": "HOMBRE", "MUJERES": "MUJER",
                "INDETERMINADO": "INDETERMINADO"}


class ReconciliationError(Exception):
    """Row sums do not match the dashboard's Totales for the slice."""


class MunicipioProvenanceError(Exception):
    """A TablaDetalle row names a municipio outside its own entidad.

    The row still counts toward this entidad's Totales (so
    ReconciliationError stays silent), but the name doesn't exist in
    this entidad's own cached CatalogoMunicipios — i.e. the server
    answered a state-filtered request with another state's data.
    """


def parse_total(value: str) -> int:
    # Totales values are formatted strings like "04" or "3,514".
    return int(value.replace(",", ""))


def _load(slice_dir: Path, name: str) -> dict:
    return json.loads((slice_dir / f"{name}.json").read_text())


def _consultado_en(slice_dir: Path, name: str) -> str:
    meta = json.loads((slice_dir / f"{name}.meta.json").read_text())
    return meta["fetched_at"][:10]


def municipio_code_map(slice_dir: Path) -> dict:
    """Municipio name -> within-state code, from the cached catalog.

    The catalog is month-invariant and cached once per state (in
    slice_dir's parent, see ingest.ensure_state_cache); old-layout
    slices carried a per-month copy, kept as a fallback so they stay
    exportable as-is.
    """
    src = slice_dir.parent
    if not (src / "CatalogoMunicipios.json").is_file():
        src = slice_dir
    catalog = _load(src, "CatalogoMunicipios")
    return {row["Text"].strip(): row["Value"] for row in catalog if row["Value"] != 0}


def _municipio_cve(municipio: str, muni_codes: dict, *, id_estado: str,
                    entidad: str, categoria: str, periodo: str) -> str:
    """Join a TablaDetalle municipio name to its INEGI cve, or "".

    Raises MunicipioProvenanceError if the name is neither in this
    entidad's own catalog nor the source's SIN_MUNICIPIO_REFERENCIA
    bucket — i.e. it belongs to some other entidad's catalog.
    """
    code = muni_codes.get(municipio)
    if code is not None:
        return cve_municipio(id_estado, code)
    if municipio == SIN_MUNICIPIO_REFERENCIA:
        return ""
    raise MunicipioProvenanceError(
        f"{municipio!r} not found in {entidad}'s own CatalogoMunicipios "
        f"(estado={id_estado}, categoria={categoria}, periodo={periodo}); "
        "likely a cross-entidad data leak from TablaDetalle"
    )


def parse_tabla_detalle(html: str) -> list[tuple[str, str, int]]:
    """TablaDetalle Html -> [(municipio, sexo, conteo), ...], zeros dropped."""
    tr = re.findall(r"<tr>(.*?)</tr>", html, re.S)
    if not tr:
        return []
    def cells(row):
        return [re.sub(r"<[^>]+>", "", c).strip()
                for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S)]
    header = cells(tr[0])
    sexos = [SEXO_HEADERS.get(h.upper()) for h in header[1:]]
    if not all(sexos):
        raise ValueError(f"unexpected TablaDetalle header: {header}")
    out = []
    for row in tr[1:]:
        vals = cells(row)
        municipio = vals[0]
        for sexo, raw in zip(sexos, vals[1:], strict=True):
            conteo = int(raw.replace(",", ""))
            if conteo:
                out.append((municipio, sexo, conteo))
    return out


def transform_slice(id_estado: str, periodo: str) -> list[dict]:
    """Cached raw slice -> list of row dicts, reconciled against Totales."""
    slice_dir = RAW_DIR / f"estado={id_estado}" / periodo
    if not slice_dir.is_dir():
        raise FileNotFoundError(f"no cached slice at {slice_dir}; run ingest first")

    totales = _load(slice_dir, "Totales")
    muni_codes = municipio_code_map(slice_dir)
    entidad = ENTIDADES[id_estado]

    rows = []
    for categoria, id_estatus in CATEGORIAS.items():
        name = f"TablaDetalle_estatus={id_estatus}"
        detalle = _load(slice_dir, name)
        consultado = _consultado_en(slice_dir, name)
        cat_rows = []
        for municipio, sexo, conteo in parse_tabla_detalle(detalle["Html"]):
            cve = _municipio_cve(municipio, muni_codes, id_estado=id_estado,
                                  entidad=entidad, categoria=categoria,
                                  periodo=periodo)
            cat_rows.append({
                "cve_entidad": cve_entidad(id_estado),
                "entidad": entidad,
                "periodo": periodo,
                "categoria": categoria,
                "sexo": sexo,
                "cve_municipio": cve,
                "municipio": municipio,
                "conteo": conteo,
                "consultado_en": consultado,
            })

        expected = parse_total(totales[CATEGORIA_TOTALES_FIELD[categoria]])
        got = sum(r["conteo"] for r in cat_rows)
        if got < expected:
            # TablaDetalle did not carry the full count: keep totals
            # reconciling with an explicit residual row.
            print(f"WARNING {categoria} estado={id_estado} {periodo}: "
                  f"TablaDetalle sums to {got} of {expected}; adding "
                  f"{RESIDUAL_MUNICIPIO} residual of {expected - got}",
                  file=sys.stderr)
            cat_rows.append({
                "cve_entidad": cve_entidad(id_estado),
                "entidad": entidad,
                "periodo": periodo,
                "categoria": categoria,
                "sexo": "",
                "cve_municipio": "",
                "municipio": RESIDUAL_MUNICIPIO,
                "conteo": expected - got,
                "consultado_en": consultado,
            })
        elif got > expected:
            raise ReconciliationError(
                f"{categoria}: rows sum to {got}, exceeding Totales {expected} "
                f"(estado={id_estado}, periodo={periodo})"
            )
        else:
            print(f"municipio source ok: TablaDetalle complete for "
                  f"{categoria} estado={id_estado} {periodo} ({got})",
                  file=sys.stderr)
        rows.extend(cat_rows)

    # Grand total must match TotalGlobal exactly.
    expected = parse_total(totales["TotalGlobal"])
    got = sum(r["conteo"] for r in rows)
    if got != expected:
        raise ReconciliationError(
            f"grand total: rows sum to {got}, TotalGlobal is {expected} "
            f"(estado={id_estado}, periodo={periodo})"
        )

    rows.sort(key=lambda r: (r["categoria"], r["cve_municipio"],
                             r["municipio"], r["sexo"]))
    return rows


def sin_fecha_rows(id_estado: str, periodo: str) -> list[dict]:
    """Per-state SIN_FECHA bucket: undated records per categoria.

    Computed as Totales(mostrarFechaNula=1) - Totales(mostrarFechaNula=0)
    over one shared date range. The result is independent of the range
    queried (the flag adds the same undated records to any date range),
    so the pair is cached once per state (see ingest.ensure_state_cache);
    old-layout slices, which cached the pair per month, are a fallback.
    """
    state_dir = RAW_DIR / f"estado={id_estado}"
    pair = ("Totales_fechaNula", "Totales_fechaNula_base")
    if all((state_dir / f"{n}.json").is_file() for n in pair):
        con = _load(state_dir, "Totales_fechaNula")
        sin = _load(state_dir, "Totales_fechaNula_base")
        consultado = _consultado_en(state_dir, "Totales_fechaNula")
    else:
        slice_dir = state_dir / periodo
        con = _load(slice_dir, "Totales_fechaNula")
        sin = _load(slice_dir, "Totales")
        consultado = _consultado_en(slice_dir, "Totales_fechaNula")

    rows = []
    for categoria in CATEGORIAS:
        field = CATEGORIA_TOTALES_FIELD[categoria]
        diff = parse_total(con[field]) - parse_total(sin[field])
        if diff < 0:
            raise ReconciliationError(
                f"SIN_FECHA {categoria}: negative diff {diff} "
                f"(estado={id_estado}, periodo={periodo})"
            )
        if diff:
            rows.append({
                "cve_entidad": cve_entidad(id_estado),
                "entidad": ENTIDADES[id_estado],
                "periodo": SIN_FECHA_PERIODO,
                "categoria": categoria,
                "sexo": "",
                "cve_municipio": "",
                "municipio": "",
                "conteo": diff,
                "consultado_en": consultado,
            })
    return rows
