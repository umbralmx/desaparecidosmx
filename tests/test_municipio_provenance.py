"""Unit tests for the municipio-provenance check, no raw cache needed.

See docs/DECISIONS.md #13 and issue #3: TablaDetalle occasionally
returns a row for a municipio belonging to another entidad's catalog.
"""

import pytest

from rnpdno.transform import (
    SIN_MUNICIPIO_REFERENCIA,
    MunicipioProvenanceError,
    _municipio_cve,
)

MUNI_CODES = {"JESUS MARIA": 5, "AGUASCALIENTES": 1}


def test_known_municipio_joins():
    cve = _municipio_cve("JESUS MARIA", MUNI_CODES, id_estado="1",
                          entidad="AGUASCALIENTES", categoria="c", periodo="p")
    assert cve == "01005"


def test_sin_municipio_referencia_is_legitimate():
    cve = _municipio_cve(SIN_MUNICIPIO_REFERENCIA, MUNI_CODES, id_estado="1",
                          entidad="AGUASCALIENTES", categoria="c", periodo="p")
    assert cve == ""


def test_unrecognized_municipio_raises():
    # e.g. TIJUANA (Baja California) leaking into an Aguascalientes slice.
    with pytest.raises(MunicipioProvenanceError):
        _municipio_cve("TIJUANA", MUNI_CODES, id_estado="1",
                        entidad="AGUASCALIENTES", categoria="c", periodo="p")
