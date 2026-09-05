"""Lectura compartida del registro para los cargadores de datos.

Lee los archivos anuales combinados (data/processed/all-states/<YYYY>.csv).
Cada archivo anual lleva el bloque sin fecha de cada estado exactamente una
vez (DECISIONS.md #9), así que concatenar años repite ese bloque.
`load_register` lo deduplica a una fila por entidad × categoría.

Las filas con fecha y las sin fecha nunca se suman (DECISIONS.md #12.3).
"""

from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
ALL_STATES_DIR = REPO_ROOT / "data" / "processed" / "all-states"
YEARS = range(2010, 2027)

STR_COLS = [
    "cve_entidad", "entidad", "periodo", "categoria", "sexo",
    "cve_municipio", "municipio", "consultado_en",
]


def load_register() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Devuelve (con fecha, sin fecha) para 2010–2026, las 33 entidades."""
    frames = [
        pd.read_csv(
            ALL_STATES_DIR / f"{year}.csv",
            dtype={c: str for c in STR_COLS},
        )
        for year in YEARS
    ]
    df = pd.concat(frames, ignore_index=True)
    for col in ["sexo", "cve_municipio", "municipio"]:
        df[col] = df[col].fillna("")
    df["conteo"] = df["conteo"].astype(int)

    dated = df[df["periodo"] != "SIN_FECHA"].copy()
    undated = (
        df[df["periodo"] == "SIN_FECHA"]
        .sort_values("consultado_en")
        .drop_duplicates(subset=["cve_entidad", "categoria"], keep="last")
        .copy()
    )
    return dated, undated


def anio_corte(dated: pd.DataFrame) -> int:
    """El último año calendario que ya había terminado al consultar.

    El tablero solo grafica años completos. Un año en curso se ve bajo
    —2026 llevaba siete meses cuando se consultó— y esa caída no es una
    caída: es un año al que le faltan cinco meses, encima de un registro
    que fecha hechos con años de retraso.

    La regla se deriva de `consultado_en`, no se escribe a mano, para que
    un re-scrapeo mueva la ventana solo. El barrido está pensado para
    correr en junio, que le da al año anterior medio año de asentamiento
    antes de publicarlo (DECISIONS.md #24).

    Los archivos de data/processed/ NO se recortan: llevan todo lo que
    devolvió la fuente, incluido el año en curso. El recorte es del
    tablero, no del dato publicado.
    """
    return int(str(dated["consultado_en"].max())[:4]) - 1


def periodo_corte(dated: pd.DataFrame) -> str:
    """El último mes que el tablero dibuja, «YYYY-12»."""
    return f"{anio_corte(dated)}-12"


def solo_anios_completos(dated: pd.DataFrame) -> pd.DataFrame:
    """Las filas con fecha de hechos hasta el último año completo."""
    return dated[dated["periodo"] <= periodo_corte(dated)]


def write_csv(df: pd.DataFrame) -> None:
    """Escribe el DataFrame como CSV a stdout.

    CSV y no parquet: leerlo en el navegador no cuesta ningún decodificador
    extra, mientras que `FileAttachment.parquet()` arrastra 6.2 MB de
    parquet-wasm para descomprimir 477 KB de datos. GitHub Pages sirve el
    CSV con gzip, así que por la red pesa menos que el parquet.

    Framework espera la salida en stdout; cualquier otra cosa impresa ahí
    acaba dentro del archivo servido al navegador.
    """
    import sys

    df.to_csv(sys.stdout, index=False)
