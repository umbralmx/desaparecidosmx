"""Metadatos del registro: fecha de consulta, meses e inventario de entidades.

Se calculan aquí, en el build, para que las páginas no tengan que recorrer
139 mil filas solo para saber qué meses existen.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import REPO_ROOT, load_register  # noqa: E402

import pandas as pd  # noqa: E402

dated, undated = load_register()

# El registro es vivo: cada fila lleva su propia fecha de consulta y el
# barrido puede cruzar días. La consulta más reciente es la que se cita
# (DECISIONS.md #6).
consultado = str(dated["consultado_en"].max())

pop = pd.read_csv(
    REPO_ROOT / "data" / "reference" / "poblacion_entidades.csv",
    dtype={"cve_entidad": str},
)

entidades = (
    dated[["cve_entidad", "entidad"]]
    .drop_duplicates()
    .sort_values("cve_entidad")
    .to_dict("records")
)

meta = {
    "consultado_en": consultado,
    "snapshot": f"rnpdno-{consultado[:7]}",
    "periodos": sorted(dated["periodo"].unique().tolist()),
    "entidades": entidades,
    "categorias": sorted(dated["categoria"].unique().tolist()),
    "sexos": sorted(dated["sexo"].unique().tolist()),
    "total_con_fecha": int(dated["conteo"].sum()),
    "total_sin_fecha": int(undated["conteo"].sum()),
    "poblacion_fuente": str(pop["fuente"].iloc[0]),
    "anios_poblacion": [int(pop["anio"].min()), int(pop["anio"].max())],
}
json.dump(meta, sys.stdout, ensure_ascii=False)
