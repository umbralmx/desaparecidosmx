"""Registros sin fecha de hechos, por entidad × categoría.

La fuente solo expone este bloque por categoría: no tiene desglose de sexo
ni de municipio, y no entra en ninguna serie mensual (DECISIONS.md #12.3).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import load_register, write_csv  # noqa: E402

_, undated = load_register()
cols = ["cve_entidad", "entidad", "categoria", "conteo"]
write_csv(
    undated[cols].sort_values(["cve_entidad", "categoria"]).reset_index(drop=True)
)
