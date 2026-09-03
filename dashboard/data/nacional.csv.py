"""Registros con fecha de hechos, sin desglose municipal.

Una fila por entidad × mes × categoría × sexo. Es lo que necesitan el
panorama nacional y las dos primeras gráficas del detalle estatal: 26 mil
filas en 40 KB, contra las 139 mil del grano municipal. La ausencia de
fila significa cero.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import load_register, write_csv  # noqa: E402

dated, _ = load_register()
nac = (
    dated.groupby(
        ["cve_entidad", "entidad", "periodo", "categoria", "sexo"],
        as_index=False,
    )["conteo"]
    .sum()
    .sort_values(["cve_entidad", "periodo", "categoria", "sexo"])
)
write_csv(nac.reset_index(drop=True))
