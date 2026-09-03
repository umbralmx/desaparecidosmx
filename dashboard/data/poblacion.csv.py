"""Población CONAPO a mitad de año, por entidad × año.

La construye scripts/build_population_reference.py; el vintage viaja en la
columna `fuente`. La entidad 33 no tiene población por diseño.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import REPO_ROOT, write_csv  # noqa: E402

import pandas as pd  # noqa: E402

pop = pd.read_csv(
    REPO_ROOT / "data" / "reference" / "poblacion_entidades.csv",
    dtype={"cve_entidad": str},
)
write_csv(pop[["cve_entidad", "anio", "poblacion"]])
