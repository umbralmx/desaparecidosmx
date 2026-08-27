"""Unit tests for the national cross-check invariant, no raw cache or
network needed — RAW_DIR and ENTIDADES are monkeypatched to a temp dir
and a small fake entidad set.
"""

import json

import pytest

from rnpdno import validate

FAKE_ENTIDADES = {"1": "A", "2": "B"}

TOTALES_FIELDS = ["TotalDesaparecidos", "TotalLocalizadosCV",
                  "TotalLocalizadosSV", "TotalGlobal"]


def _write_totales(path, values):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(dict(zip(TOTALES_FIELDS, values))))


@pytest.fixture(autouse=True)
def fake_catalog(monkeypatch, tmp_path):
    monkeypatch.setattr(validate, "RAW_DIR", tmp_path)
    monkeypatch.setattr(validate, "ENTIDADES", FAKE_ENTIDADES)
    return tmp_path


def test_matching_sums_pass(fake_catalog):
    _write_totales(fake_catalog / "estado=1" / "2024-01" / "Totales.json",
                    ["10", "20", "5", "35"])
    _write_totales(fake_catalog / "estado=2" / "2024-01" / "Totales.json",
                    ["4", "6", "0", "10"])
    _write_totales(fake_catalog / "estado=0" / "2024-01" / "Totales.json",
                    ["14", "26", "5", "45"])
    validate.national_cross_check("2024-01")  # must not raise


def test_mismatch_raises(fake_catalog):
    _write_totales(fake_catalog / "estado=1" / "2024-01" / "Totales.json",
                    ["10", "20", "5", "35"])
    _write_totales(fake_catalog / "estado=2" / "2024-01" / "Totales.json",
                    ["4", "6", "0", "10"])
    _write_totales(fake_catalog / "estado=0" / "2024-01" / "Totales.json",
                    ["99", "26", "5", "45"])  # TotalDesaparecidos off
    with pytest.raises(validate.ReconciliationError, match="TotalDesaparecidos"):
        validate.national_cross_check("2024-01")


def test_missing_national_raises_file_not_found(fake_catalog):
    with pytest.raises(FileNotFoundError):
        validate.national_cross_check("2024-01")


def test_missing_entidad_raises_file_not_found(fake_catalog):
    _write_totales(fake_catalog / "estado=1" / "2024-01" / "Totales.json",
                    ["10", "20", "5", "35"])
    _write_totales(fake_catalog / "estado=0" / "2024-01" / "Totales.json",
                    ["14", "26", "5", "45"])
    # estado=2 never written
    with pytest.raises(FileNotFoundError, match="estado"):
        validate.national_cross_check("2024-01")
