"""Registros con fecha de hechos, al grano municipal.

Una fila por entidad × mes × categoría × sexo × municipio. La ausencia de
fila significa cero. 139 mil filas caben en 0.4 MB comprimidas, así que el
navegador recibe el grano completo y filtra en memoria: no hace falta ni
DuckDB ni carga por estado.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import load_register, write_csv  # noqa: E402

dated, _ = load_register()
# Sin la columna `entidad`: la clave ya la identifica, y repetir el
# nombre en 139 mil filas engorda el archivo sin añadir nada.
cols = [
    "cve_entidad", "periodo", "categoria", "sexo",
    "cve_municipio", "municipio", "conteo",
]
write_csv(dated[cols].reset_index(drop=True))
