# RNPDNO Data Pipeline

## Goal
Scrape/ingest Mexico's RNPDNO and produce monthly CSVs per state,
disaggregated by category, sex, municipality (where available), and
other variables. Output goes to data/processed/.

## Key facts about the source
- Versión Estadística dashboard returns AGGREGATE counts per filter
  combination, no bulk export. The pipeline works by discovering the
  dashboard's internal API calls and iterating over filter permutations.
- Categoría = desaparecido / no localizado / localizado.
- 32 entidades federativas; use INEGI codes for state/municipio joins.

## Conventions
- All fetching goes through src/rnpdno/ingest.py and caches raw
  responses to data/raw/ before any parsing.
- Be gentle: respect REQUEST_DELAY_SECONDS, use tenacity for retries.
- Never commit data/raw/ (may contain sensitive detail).
- CSV schema is defined in docs/data_dictionary.md — keep it in sync.
- The dashboard (dashboard/, run `streamlit run dashboard/app.py` from
  the repo root) reads only data/processed/ and data/reference/ —
  never the network. When concatenating yearly all-states files,
  dedupe SIN_FECHA rows (see data.py / data_dictionary.md).

## Brand — binding for all UI, charts, and published artifacts
Anything user-facing (dashboard, figures, social, docs) follows the
Umbral design system: docs/umbral-brand.md (identity, voice, color
modes, chart rules) and docs/umbral-engineering.md (implementation,
accessibility, interpretability standards). Color/type tokens live in
assets/tokens.json and assets/tokens.css — never hard-code a hex that
exists as a token. Logo SVGs are in assets/.

## Definition of done for the spike
One entidad × one month, fetched → normalized → written as a clean CSV
matching the schema, with totals that match the dashboard's displayed count.

---

<!-- Umbral design system v1.1.0 — paste into a downstream repo's CLAUDE.md.
     GENERATED; regenerate from umbralmx/umbral-style-guide rather than editing. -->

## Umbral brand — the minimum

This repo follows the Umbral design system, pinned at **v1.1.0**.
Full guide: https://github.com/umbralmx/umbral-style-guide/tree/v1.1.0/guide

**Load the skill** before producing anything visual: copy
`umbral-style-guide/skills/umbral-brand/` into `.claude/skills/`, or install the packaged
`.skill` from the release.

**Never hand-type a colour, font or spacing value.** Import them:

```
https://raw.githubusercontent.com/umbralmx/umbral-style-guide/v1.1.0/tokens/build/tokens.css     # web
https://raw.githubusercontent.com/umbralmx/umbral-style-guide/v1.1.0/tokens/build/tokens.json    # anything
https://raw.githubusercontent.com/umbralmx/umbral-style-guide/v1.1.0/tokens/build/tokens.py      # Python / Streamlit / notebooks
https://raw.githubusercontent.com/umbralmx/umbral-style-guide/v1.1.0/tokens/build/tokens.R       # R / Quarto
https://raw.githubusercontent.com/umbralmx/umbral-style-guide/v1.1.0/tokens/build/streamlit-config.toml
https://raw.githubusercontent.com/umbralmx/umbral-style-guide/v1.1.0/rules/rules.json            # the 69 rules, machine-readable
```

Pin the tag. Never point at `main` — a token change would land without warning.

**Two modes.** `laboratorio` (light) is the default: site, reports, documents, decks.
`instrumento` (dark) for dashboards, social cards and big-stat slides. Switch with
`data-mode="instrumento"`; never mix them inside one panel.

**The rules broken most often:**

- `signal` (`#128273`) marks **one** element of the data layer per view.
- Use `signal-text` (`#227c6f`) for text and direct series labels — `signal` only
  clears 3:1, and labels are small text needing 4.5:1.
- Chart titles state the finding as a sentence, not the topic.
- Every chart: subtitle (geography · period · unit), source line with licence and snapshot tag,
  `aria-label` with the finding, and a downloadable CSV.
- Space Grotesk **500** for display — never 700. Self-host the fonts; never a CDN.
- Uncertainty is visible: bands at 0.15 opacity, dashed past the
  present, a dashed `hoy` rule.
- Causal verbs only with a named identification strategy. Otherwise «asociado con».
- `lang="es"`. Never encode meaning by colour alone.
- Spanish first. Sensitive terminology is binding — see `guide/15-terminologia.md`.

**Never:** emoji · gradients · drop shadows · pill buttons · pure black or white · 700-weight
display · a chart without its source · a figure that cannot be rebuilt from raw data.
