# `skills/umbral-brand/scripts/`

Deterministic work an agent should **run**, not reason about. Standard library only — these have to
work in whatever environment the notebook or dashboard already has.

| | |
|---|---|
| `check_contrast.py` | Does this pair pass? Thresholds follow the token's role, and ratios round **down** — a gate must never round up into a pass |
| `apply_theme.py` | Activate the matplotlib / Plotly / Altair theme, or print setup code to paste |
| `lint.py` | The conformance checks that need nothing but the file and the token list |

```bash
python3 check_contrast.py "#128273" "#F2F3F1"
python3 check_contrast.py --audit          # every token pair, both modes
python3 apply_theme.py --show streamlit
python3 lint.py ../../..                   # lint a whole repo
```

`check_contrast.py` exits non-zero when a pair fails, so it works in a shell pipeline.

## What they deliberately don't do

`apply_theme.py` does not draw the chart frame. Titles, subtitles, source lines and CSV buttons stay
the caller's job. A theme cannot know your finding, and a chart without its source is the one thing
the brand never permits.

`lint.py` is a subset of `tools/umbral-lint`. It misses bare hexes with no leading `#`; matplotlib
style files write `xtick.color: 9AA19B`. Its chart-source check is a per-file heuristic. Both gaps
are stated in its docstring, so a clean run is not over-trusted.
