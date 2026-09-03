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
