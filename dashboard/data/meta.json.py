"""Metadatos del registro: fecha de consulta, meses e inventario de entidades.

Se calculan aquí, en el build, para que las páginas no tengan que recorrer
139 mil filas solo para saber qué meses existen.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import (  # noqa: E402
    REPO_ROOT,
    anio_corte,
    load_register,
    periodo_corte,
    solo_anios_completos,
)

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

# El tablero solo grafica años completos (DECISIONS.md #24). Los archivos
# de data/processed/ siguen llevando el año en curso: el recorte es de la
# vista, no del dato publicado, y por eso el inventario de abajo distingue
# lo que se dibuja de lo que se puede descargar.
visible = solo_anios_completos(dated)

# Cada vintage es un re-scrapeo de la ventana móvil de 24 meses. Se listan
# desde el disco, no a mano: el barrido mensual añade uno cada vez.
vintages = []
for meta_path in sorted((REPO_ROOT / "data" / "vintages").glob("*.meta.json")):
    vm = json.loads(meta_path.read_text(encoding="utf-8"))
    csv_path = meta_path.with_suffix("").with_suffix(".csv")
    meses = vm.get("months", [])
    vintages.append(
        {
            "label": vm["label"],
            "anio": vm["label"][:4],
            "desde": meses[0] if meses else None,
            "hasta": meses[-1] if meses else None,
            "meses": len(meses),
            "filas": int(vm.get("n_rows") or 0),
            "kb": round(csv_path.stat().st_size / 1024) if csv_path.exists() else None,
        }
    )

meta = {
    "consultado_en": consultado,
    "snapshot": f"rnpdno-{consultado[:7]}",
    # Los meses que el tablero ofrece en el selector de periodo.
    "periodos": sorted(visible["periodo"].unique().tolist()),
    "anio_corte": anio_corte(dated),
    "periodo_corte": periodo_corte(dated),
    # Hasta dónde llega el dato publicado en data/processed/, que es más
    # lejos que el tablero.
    "periodos_publicados": sorted(dated["periodo"].unique().tolist()),
    "periodo_max_publicado": str(dated["periodo"].max()),
    "entidades": entidades,
    "categorias": sorted(dated["categoria"].unique().tolist()),
    "sexos": sorted(dated["sexo"].unique().tolist()),
    # Cuadra con la suma de nacional.csv, que también va recortado.
    "total_con_fecha": int(visible["conteo"].sum()),
    # Todo el registro con fecha, incluido el año en curso: es lo que
    # describe la sección de descargas.
    "total_con_fecha_publicado": int(dated["conteo"].sum()),
    "total_sin_fecha": int(undated["conteo"].sum()),
    "poblacion_fuente": str(pop["fuente"].iloc[0]),
    "anios_poblacion": [int(pop["anio"].min()), int(pop["anio"].max())],
    "vintages": vintages,
}
json.dump(meta, sys.stdout, ensure_ascii=False)
