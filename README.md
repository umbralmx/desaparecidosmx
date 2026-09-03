# desaparecidosmx — RNPDNO data pipeline

Turns Mexico's [RNPDNO](https://versionpublicarnpdno.segob.gob.mx/Dashboard/Sociodemografico)
(Registro Nacional de Personas Desaparecidas y No Localizadas, *Versión
Estadística*) into clean, monthly, per-state CSVs disaggregated by
categoría, sexo, and municipio.

The public dashboard only shows aggregate counts per filter combination
and has no bulk export. This pipeline reproduces the dashboard's
internal JSON API calls, iterates over filter permutations, caches every
raw response, and reconciles the normalized output against the
dashboard's own totals. An [Observable Framework dashboard](#dashboard)
sits on top of the processed CSVs.

## Output

For each entidad (INEGI codes `01`–`32`, plus `33` = entidad no
especificada):

- `data/processed/<cve_entidad>/<YYYY-MM>.csv` — one row per
  categoría × sexo × municipio for records whose **fecha de hechos**
  falls in that month.
- `data/processed/<cve_entidad>/sin-fecha.csv` — records with no fecha
  de hechos, per categoría (month-independent).

Plus combined national files built from the per-state CSVs:

- `data/processed/all-states/<YYYY-MM>.csv` — all states, one month
  (dated rows only).
- `data/processed/all-states/<YYYY>.csv` — all states, all 12 months,
  plus each state's SIN_FECHA bucket once (filterable via `periodo`).
  **Concatenating several yearly files repeats that bucket once per
  year** — dedupe SIN_FECHA rows on `cve_entidad` × `categoria` when
  combining years.

Reference data (not from the RNPDNO):

- `data/reference/poblacion_entidades.csv` — CONAPO mid-year population
  per entidad × year (2010–2026, revisión 2023), used by the dashboard
  for per-100k rates. Built by `scripts/build_population_reference.py`;
  the vintage is stated in the file's `fuente` column.

Columns: `cve_entidad`, `entidad`, `periodo`, `categoria`, `sexo`,
`cve_municipio`, `municipio`, `conteo`, `consultado_en`. The full schema
and its caveats are in [`docs/data_dictionary.md`](docs/data_dictionary.md).

### Coverage

All 33 entidades are present with continuous month-by-month coverage
from **2010-01 through 2026-12** — every state has all 204 monthly CSVs
plus its month-independent `sin-fecha.csv`. Combined
`all-states/<YYYY>.csv` yearly files exist for every year **2010–2026**.
Regenerate or extend any scope with `rnpdno.run` (see Quickstart).

**Read the caveats before quoting numbers.** A month's CSV can be a
small fraction of a state's register (undated records live only in
`sin-fecha.csv`; dated events may sit in other years), and the RNPDNO is
a living register — counts change between consultations, hence the
`consultado_en` column.

## Quickstart

```sh
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # optional; REQUEST_DELAY_SECONDS defaults to 2.0

# run everything (ingest → export → combine) for a scope:
PYTHONPATH=src python -m rnpdno.run --estados all --periodos 2024

# or drive the steps individually:
PYTHONPATH=src python -m rnpdno.ingest --estado 1 --mes 2024-01
PYTHONPATH=src python -m rnpdno.export --estado 1 --mes 2024-01
PYTHONPATH=src python -m rnpdno.combine --periodo 2024-01

pytest
```

The runner records failures, skips them, keeps going, and prints a
pass/fail summary (nonzero exit if anything failed). Slices whose raw
cache is already complete are not re-fetched, so re-running with the
same arguments resumes an interrupted batch (`--refetch` overrides).

`ingest` only fetches and caches; `export` only reads the cache;
`combine` only reads `data/processed/` and refuses to write a national
file if any state's input is missing. The
transform enforces reconciliation invariants (every CSV must sum to the
dashboard's `TotalGlobal` for the same filter) and fails loudly if the
source and output disagree.

## Dashboard

An [Observable Framework](https://observablehq.com/framework/) site over
the processed CSVs — three pages (Panorama nacional / Detalle por estado
/ Datos y método) under the Umbral design system (`docs/umbral-brand.md`,
binding). It is a static site: every filter runs in the browser, and the
built pages never call a server.

```sh
npm install          # once
npm run dev          # preview on http://127.0.0.1:3000
npm run build        # static site into dist/
```

The build needs Python with pandas on PATH: the data loaders in
`dashboard/data/*.csv.py` read `data/processed/` and emit the CSVs the
pages fetch. `observablehq.config.js` picks up `.venv/bin/python3` when
it exists and falls back to `python3`.

Pushing to `main` builds and publishes to GitHub Pages at
**https://umbral.org.mx/desaparecidosmx/** (`.github/workflows/deploy.yml`).

The site is a *project page* of the `umbralmx` org, so it inherits the
custom domain from `umbralmx/umbralmx.github.io`, which holds the CNAME
for `umbral.org.mx`. This repo must **not** carry a CNAME of its own:
that would claim the whole domain for this project and take the root
site down. Every link in the pages is relative, so the site also works
served from a domain root or any other subpath.

Design decisions (descriptive monitor, SIN_FECHA always visible, neutral
figures, per-100k with stated CONAPO vintage) are logged in
`docs/DECISIONS.md` entry 12; the move off Streamlit is entry 16. State
population reference data is built by
`scripts/build_population_reference.py`.

## Repository layout

```
src/rnpdno/
├── config.py      # endpoints, filter payload, request settings
├── ingest.py      # fetch + cache raw API responses (data/raw/)
├── catalogs.py    # entidad / municipio / categoría maps
├── transform.py   # normalize, disaggregate, reconcile
├── export.py      # write per-state monthly CSVs (data/processed/)
├── combine.py     # concatenate per-state CSVs into all-states files
└── run.py         # orchestrator: ingest → export → combine, log-and-continue
dashboard/                 # Observable Framework source root
├── index.md       # Panorama nacional
├── estado.md      # Detalle por estado
├── datos.md       # Datos y método
├── umbral.css     # the Umbral stylesheet (modo laboratorio)
├── components/
│   ├── registro.js  # loads the CSVs, applies filters, builds series
│   ├── charts.js    # trend / ranking / categoría×sexo Plot builders
│   ├── frame.js     # the mandatory chart frame + data table
│   ├── chrome.js    # brand, three-page nav, section labels
│   ├── format.js    # labels, number format, time helpers, CSV
│   └── fonts.js     # self-hosted @font-face injection
├── data/          # data loaders: *.csv.py → CSV served to the browser
└── assets/        # tokens.css, logo SVGs, woff2 fonts
vendor/umbral-plot/        # @umbralmx/umbral-plot v1.3.0, vendored
scripts/
├── build_population_reference.py  # CONAPO population → data/reference/
└── copy-static.mjs                # CNAME + .nojekyll into dist/
assets/            # Umbral tokens (tokens.json/.css) + logo SVGs
docs/
├── data_dictionary.md    # CSV schema — the contract for consumers
├── methodology.md        # how the numbers are produced, and why
├── DECISIONS.md          # ADR-style log of pipeline + dashboard decisions
├── umbral-brand.md       # Umbral design system — binding for all UI
└── umbral-engineering.md # implementation + interpretability standards
```

## Ground rules

- **Be gentle with the source.** All fetching goes through
  `rnpdno.ingest`, which waits `REQUEST_DELAY_SECONDS` between requests
  and retries with backoff.
- **`data/raw/` is never committed** — cached responses may contain
  sensitive detail. Only the aggregated `data/processed/` CSVs are
  shareable.
- Every fetched response is cached verbatim before any parsing, so
  transforms are reproducible and re-runnable offline.
