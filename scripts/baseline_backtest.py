"""Rolling-origin backtest of forecast baselines + current anomaly flags.

Works entirely from data/processed/all-states/<YYYY>.csv (dated rows,
categoría DESAPARECIDA_O_NO_LOCALIZADA), aggregated to entidad × month.

Three baselines, forecast h = 1..6 months ahead from each origin:
  - estacional_ingenuo : y[t+h] = y[t+h-12]
  - estacional_deriva  : seasonal naive scaled by the trailing-year /
                         prior-year ratio (clipped to [0.5, 2.0])
  - indice_estacional  : trailing 12-month mean level × a per-month
                         seasonal index (mean of up to 5 past years)

Evaluation targets stop at EVAL_END: counts for the months after that
are still immature (the register keeps receiving late registrations for
recent fecha-de-hechos months), so scoring against them would reward
under-forecasting. The same immaturity means recent-month anomaly flags
are one-sided: ALTO flags are conservative (the count can only grow),
BAJO flags are unreliable and marked as such.

Outputs (schema documented in docs/data_dictionary.md):
  data/processed/derived/backtest_metrics.csv
  data/processed/derived/anomaly_flags.csv
"""

from pathlib import Path

import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
ALL_STATES_DIR = REPO_ROOT / "data" / "processed" / "all-states"
OUT_DIR = REPO_ROOT / "data" / "processed" / "derived"

YEARS = range(2010, 2027)
CATEGORIA = "DESAPARECIDA_O_NO_LOCALIZADA"
HORIZONS = range(1, 7)
FIRST_ORIGIN = "2015-12"   # first forecast origin (targets start 2016-01)
EVAL_END = "2025-12"       # last mature target month
MATURITY_MONTHS = 6        # trailing months treated as immature
RECENT_FLAG_MONTHS = 12    # window scanned for anomalies
Z_THRESHOLD = 2.0
CLIP_DRIFT = (0.5, 2.0)


def load_monthly() -> pd.DataFrame:
    """Wide frame: PeriodIndex (monthly) × cve_entidad, integer counts."""
    frames = [
        pd.read_csv(
            ALL_STATES_DIR / f"{year}.csv",
            dtype={"cve_entidad": str, "periodo": str, "categoria": str},
            usecols=["cve_entidad", "periodo", "categoria", "conteo", "consultado_en"],
        )
        for year in YEARS
    ]
    df = pd.concat(frames, ignore_index=True)
    df = df[(df["periodo"] != "SIN_FECHA") & (df["categoria"] == CATEGORIA)]
    monthly = (
        df.groupby(["periodo", "cve_entidad"])["conteo"].sum().unstack(fill_value=0)
    )
    monthly.index = pd.PeriodIndex(monthly.index, freq="M")
    monthly = monthly.reindex(
        pd.period_range(monthly.index.min(), monthly.index.max(), freq="M"),
        fill_value=0,
    )
    # The scrape month itself is a partial month — drop it.
    scrape_month = pd.Period(df["consultado_en"].max()[:7], freq="M")
    return monthly[monthly.index < scrape_month]


def entidad_names() -> dict[str, str]:
    df = pd.read_csv(
        ALL_STATES_DIR / "2024.csv",
        dtype=str,
        usecols=["cve_entidad", "entidad"],
    ).drop_duplicates()
    return dict(df.itertuples(index=False, name=None))


def seasonal_index(history: pd.Series, month: int) -> float:
    """Mean share of `month` within its year, over up to 5 past years."""
    by_year = history.groupby(history.index.year)
    ratios = []
    for _, year_vals in list(by_year)[-6:]:
        if len(year_vals) < 12:
            continue
        mean = year_vals.mean()
        if mean > 0:
            ratios.append(
                year_vals[year_vals.index.month == month].iloc[0] / mean
            )
    return float(np.mean(ratios[-5:])) if ratios else 1.0


def forecast(history: pd.Series, horizon: int, model: str) -> float:
    """Point forecast for the month `horizon` steps after history's end."""
    target = history.index[-1] + horizon
    base = history.get(target - 12, np.nan)
    if model == "estacional_ingenuo":
        return float(base)
    if model == "estacional_deriva":
        last = history.iloc[-12:].sum()
        prior = history.iloc[-24:-12].sum()
        ratio = np.clip(last / prior, *CLIP_DRIFT) if prior > 0 else 1.0
        return float(base * ratio)
    if model == "indice_estacional":
        return float(history.iloc[-12:].mean() * seasonal_index(history, target.month))
    raise ValueError(model)


MODELS = ["estacional_ingenuo", "estacional_deriva", "indice_estacional"]


def backtest(monthly: pd.DataFrame) -> pd.DataFrame:
    """One row per entidad × model × origin × horizon with error columns."""
    origins = pd.period_range(FIRST_ORIGIN, pd.Period(EVAL_END, "M") - 1, freq="M")
    eval_end = pd.Period(EVAL_END, "M")
    rows = []
    for cve, series in monthly.items():
        for origin in origins:
            history = series[series.index <= origin]
            if len(history) < 24:
                continue
            for h in HORIZONS:
                target = origin + h
                if target > eval_end:
                    continue
                actual = float(series[target])
                for model in MODELS:
                    pred = forecast(history, h, model)
                    if np.isnan(pred):
                        continue
                    rows.append((cve, model, str(origin), h, actual, pred))
    return pd.DataFrame(
        rows,
        columns=["cve_entidad", "modelo", "origen", "horizonte", "real", "pronostico"],
    )


def summarize(bt: pd.DataFrame, monthly: pd.DataFrame) -> pd.DataFrame:
    """Per entidad × model: MAE and MASE (scale = seasonal-naive MAE)."""
    bt = bt.assign(error_abs=(bt["real"] - bt["pronostico"]).abs())
    scale = {
        cve: max(series.diff(12).abs().loc[FIRST_ORIGIN:EVAL_END].mean(), 1e-9)
        for cve, series in monthly.items()
    }
    out = (
        bt.groupby(["cve_entidad", "modelo"])
        .agg(mae=("error_abs", "mean"), n=("error_abs", "size"))
        .reset_index()
    )
    out["mase"] = out.apply(lambda r: r["mae"] / scale[r["cve_entidad"]], axis=1)
    return out


def anomaly_flags(monthly: pd.DataFrame) -> pd.DataFrame:
    """Robust-z flags for the last RECENT_FLAG_MONTHS months per entidad.

    Expected values come from indice_estacional refit at each month's
    origin; the residual scale is a MAD over the mature history only.
    """
    last = monthly.index.max()
    mature_end = last - MATURITY_MONTHS
    rows = []
    for cve, series in monthly.items():
        resid_hist = []
        flag_start = last - (RECENT_FLAG_MONTHS - 1)
        for month in pd.period_range(pd.Period(FIRST_ORIGIN, "M") + 1, last, freq="M"):
            history = series[series.index < month]
            if len(history) < 24:
                continue
            expected = forecast(history, 1, "indice_estacional")
            residual = float(series[month]) - expected
            if month <= mature_end:
                resid_hist.append(residual)
            if month < flag_start:
                continue
            mad = np.median(np.abs(np.array(resid_hist) - np.median(resid_hist)))
            denom = max(1.4826 * mad, 1.0)
            z = residual / denom
            flag = "ALTO" if z >= Z_THRESHOLD else "BAJO" if z <= -Z_THRESHOLD else ""
            rows.append(
                (
                    cve,
                    str(month),
                    int(series[month]),
                    round(expected, 1),
                    round(z, 2),
                    flag,
                    month <= mature_end,
                )
            )
    return pd.DataFrame(
        rows,
        columns=[
            "cve_entidad",
            "periodo",
            "conteo",
            "esperado",
            "z",
            "bandera",
            "maduro",
        ],
    )


def main() -> None:
    monthly = load_monthly()
    names = entidad_names()
    print(
        f"Series: {monthly.shape[1]} entidades × {monthly.shape[0]} meses "
        f"({monthly.index.min()}–{monthly.index.max()})"
    )

    bt = backtest(monthly)
    metrics = summarize(bt, monthly)
    metrics.insert(1, "entidad", metrics["cve_entidad"].map(names))

    flags = anomaly_flags(monthly)
    flags.insert(1, "entidad", flags["cve_entidad"].map(names))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    metrics.to_csv(OUT_DIR / "backtest_metrics.csv", index=False)
    flags.to_csv(OUT_DIR / "anomaly_flags.csv", index=False)

    print("\n=== MASE nacional por modelo (h 1–6 agrupados, menor es mejor) ===")
    print(metrics.groupby("modelo")["mase"].agg(["mean", "median"]).round(3))

    wins = (
        metrics.loc[metrics.groupby("cve_entidad")["mase"].idxmin()]
        .groupby("modelo")
        .size()
    )
    print("\n=== Entidades donde cada modelo gana ===")
    print(wins)

    recent = flags[flags["bandera"] != ""].sort_values("z", ascending=False)
    print(f"\n=== Banderas en los últimos {RECENT_FLAG_MONTHS} meses ===")
    print(
        recent[
            ["entidad", "periodo", "conteo", "esperado", "z", "bandera", "maduro"]
        ].to_string(index=False)
        if not recent.empty
        else "(ninguna)"
    )


if __name__ == "__main__":
    main()
