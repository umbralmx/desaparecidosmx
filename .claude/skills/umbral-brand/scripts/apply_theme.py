#!/usr/bin/env python3
"""Apply the Umbral theme to a plotting session, or print the setup to paste.

    python3 apply_theme.py --show matplotlib          # print the setup code
    python3 apply_theme.py --show plotly --mode instrumento
    python3 apply_theme.py --show streamlit
    python3 apply_theme.py --colors                   # the series palette, in order

In a live session, import it instead:

    import sys; sys.path.insert(0, "path/to/skill/scripts")
    from apply_theme import use
    use("matplotlib", mode="laboratorio")

The theme does NOT draw the chart frame. Titles, subtitles, source lines and CSV
buttons are your job — see references/charts.md. A theme cannot know your finding.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

ASSETS = pathlib.Path(__file__).resolve().parent.parent / "assets"
MODES = ("laboratorio", "instrumento")


def tokens() -> dict:
    return json.loads((ASSETS / "tokens.json").read_text())


def palette(mode: str = "laboratorio") -> list[str]:
    return tokens()["mode"][mode]["series"]


def use(library: str, mode: str = "laboratorio") -> None:
    """Activate the Umbral theme in the current session."""
    if mode not in MODES:
        raise ValueError(f"mode must be one of {MODES}")

    if library == "matplotlib":
        import matplotlib.pyplot as plt
        plt.style.use(str(ASSETS / f"umbral-{mode}.mplstyle"))

    elif library == "plotly":
        import plotly.graph_objects as go
        import plotly.io as pio
        tpl = json.loads((ASSETS / f"plotly-umbral-{mode}.json").read_text())
        layout = {k: v for k, v in tpl["layout"].items() if k != "colorscale"}
        pio.templates["umbral"] = go.layout.Template(layout=layout)
        pio.templates.default = "umbral"

    elif library == "altair":
        import altair as alt
        t = tokens()["mode"][mode]
        f = tokens()["font"]

        def theme():
            return {"config": {
                "background": t["base"],
                "title": {"font": f["display"], "fontSize": 22,
                          "fontWeight": f["displayWeight"], "anchor": "start",
                          "color": t["ink"]},
                "axis": {"labelFont": f["mono"], "labelFontSize": 12,
                         "labelColor": t["caption"], "titleFont": f["body"],
                         "titleColor": t["muted"], "domainColor": t["baseline"],
                         "gridColor": t["gridline"], "grid": False},
                "axisY": {"grid": True, "domain": False, "ticks": False},
                "range": {"category": t["series"]},
                "legend": {"disable": True},
                "view": {"stroke": None},
            }}

        alt.themes.register("umbral", theme)
        alt.themes.enable("umbral")

    else:
        raise ValueError(f"unknown library {library!r}")


SNIPPETS = {
    "matplotlib": '''import matplotlib.pyplot as plt
import json

ASSETS = "{assets}"
plt.style.use(f"{{ASSETS}}/umbral-{mode}.mplstyle")
_tokens = json.load(open(f"{{ASSETS}}/tokens.json"))
t, font = _tokens["mode"]["{mode}"], _tokens["font"]

fig, ax = plt.subplots(figsize=(8, 4.5))
ax.plot(x, y, color=t["signal"])                 # the one highlighted series
ax.plot(x, y2, color=t["muted"])                 # everything else steps down
ax.fill_between(x, lo, hi, color=t["signal"], alpha=0.15)   # uncertainty band

# The frame is not optional — the theme cannot supply it.
ax.set_title("Los registros crecen 9% anual desde 2015", loc="left")
fig.text(0.01, -0.02,
         "Fuente: RNPDNO · consultado 2026-07-09 · rnpdno-2026-07 · umbral.mx · CC BY 4.0",
         family=font["mono"], size=9, color=t["caption"])''',

    "plotly": '''import json, plotly.graph_objects as go

tpl = json.load(open("{assets}/plotly-umbral-{mode}.json"))
fig = go.Figure()
fig.update_layout(**{{k: v for k, v in tpl["layout"].items() if k != "colorscale"}})

# Direct labels, not a legend (UMB-CHT-005):
fig.add_annotation(x=x[-1], y=y[-1], text="Desapariciones", showarrow=False,
                   xanchor="left", xshift=6)''',

    "altair": '''import sys; sys.path.insert(0, "{scripts}")
from apply_theme import use
use("altair", mode="{mode}")''',

    "streamlit": '''# 1. Theme — copy the generated config, do not retype the keys.
#    cp {assets}/streamlit-config.toml .streamlit/config.toml

# 2. Streamlit hardcodes lang="en". Fix it once, at the top of the app:
import streamlit.components.v1 as components
components.html("<script>window.parent.document.documentElement.lang='es';</script>", height=0)

# 3. Every chart ships its CSV (UMB-A11Y-004):
st.download_button("Descargar CSV", df.to_csv(index=False), "serie.csv", "text/csv")''',
}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--show", choices=sorted(SNIPPETS), help="print setup code")
    ap.add_argument("--mode", choices=MODES, default="laboratorio")
    ap.add_argument("--colors", action="store_true", help="print the series palette")
    a = ap.parse_args()

    if a.colors:
        t = tokens()["mode"][a.mode]
        names = ["signal", "model", "muted", "alert", "series-4", "series-5"]
        for i, hex_ in enumerate(palette(a.mode)):
            print(f"{i + 1}. {names[i]:<10} {hex_}")
        print(f"\nUse at most 5 in one chart (UMB-CHT-006). The first is the "
              f"highlighted series; the rest step down.")
        print(f"For text and direct series labels use the -text variants: "
              f"{t['signal-text']}, {t['model-text']}, {t['alert-text']}")
        return 0

    if a.show:
        print(SNIPPETS[a.show].format(
            assets=ASSETS, mode=a.mode,
            scripts=pathlib.Path(__file__).resolve().parent))
        return 0

    ap.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
