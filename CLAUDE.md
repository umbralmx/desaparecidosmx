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
- The dashboard is an Observable Framework site rooted at dashboard/.
  Run `npm run dev` from the repo root; `npm run build` writes dist/.
  Its data loaders (dashboard/data/*.csv.py) read only data/processed/
  and data/reference/ — never the network. When concatenating yearly
  all-states files, dedupe SIN_FECHA rows (see dashboard/data/_common.py
  and data_dictionary.md).

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

<!-- Umbral design system v2.0.0 — paste into a downstream repo's CLAUDE.md.
     GENERATED; regenerate from umbralmx/umbral-style-guide rather than editing. -->

## Umbral brand — the minimum

This repo follows the Umbral design system at **v2.0.0**.

v2.0.0 ships in `package.json` on the upstream `main` but carries no git
tag yet — the newest tag is still v1.1.0. So every URL below pins the
commit `ec88f2cf`, which is immutable in the same way a tag is. Move them
to `v2.0.0` once that tag exists.

2.0 rewrote the chart frame and every published subtitle and source line
with it. See DECISIONS.md #19; the shape of both is below.

Full guide: https://github.com/umbralmx/umbral-style-guide/tree/ec88f2cf/guide

The dashboard is **modo instrumento** (dark), which is what the guide's
surface table assigns to a live dashboard. It uses the minimal layout
idiom, which is mode-independent: dot field in the outer margin only
(UMB-LAY-009), a content sheet over it, mono lowercase section labels
(UMB-LAY-006), rows separated by 1px rules instead of cards
(UMB-LAY-007), and secondary controls as 1px mono rectangles that move
to signal on hover and focus (UMB-LAY-008).

Changing mode means changing three things together: `MODE` in
`dashboard/components/format.js`, the `data-mode` attribute written by
`scripts/copy-static.mjs` and `chrome.js`, and the isotype variant.
See DECISIONS.md #16.

**Load the skill** before producing anything visual: copy
`umbral-style-guide/skills/umbral-brand/` into `.claude/skills/`, or install the packaged
`.skill` from the release.

**Never hand-type a colour, font or spacing value.** Import them:

```
https://raw.githubusercontent.com/umbralmx/umbral-style-guide/ec88f2cf/tokens/build/tokens.css     # web
https://raw.githubusercontent.com/umbralmx/umbral-style-guide/ec88f2cf/tokens/build/tokens.json    # anything
https://raw.githubusercontent.com/umbralmx/umbral-style-guide/ec88f2cf/tokens/build/tokens.py      # Python / Streamlit / notebooks
https://raw.githubusercontent.com/umbralmx/umbral-style-guide/ec88f2cf/tokens/build/tokens.R       # R / Quarto
https://raw.githubusercontent.com/umbralmx/umbral-style-guide/ec88f2cf/tokens/build/streamlit-config.toml
https://raw.githubusercontent.com/umbralmx/umbral-style-guide/ec88f2cf/rules/rules.json            # the 75 rules, machine-readable
```

Pin a tag or a commit. Never point at `main` — a token change would land without warning.

**Two modes.** `laboratorio` (light) is the default: site, reports, documents, decks.
`instrumento` (dark) for dashboards, social cards and big-stat slides. Switch with
`data-mode="instrumento"`; never mix them inside one panel.

**The rules broken most often:**

- `signal` (`#128273`) marks **one** element of the data layer per view.
- Use `signal-text` (`#227c6f`) for text and direct series labels — `signal` only
  clears 3:1, and labels are small text needing 4.5:1.
- Chart titles state the finding as a sentence, not the topic.
- Chart subtitles name the **construction**, not a list of fields: transformation,
  unit, scope, period, as a phrase. «Suma acumulada de personas desaparecidas por
  estado, 2021-2026», never «México · 2021-2026 · personas».
- The source line has two sides over a 1px rule: «Fuente: Elaboración propia con
  datos de ORIGEN. Consulta realizada el AAAA-MM-DD.» left, «umbral.org.mx» right.
  No licence and no snapshot tag on that line — both live on the page, next to the
  CSV link (UMB-DAT-002, UMB-DAT-004).
- Every chart still needs an `aria-label` carrying the finding, and a downloadable CSV.
- Space Grotesk **500** for display — never 700. Self-host the fonts; never a CDN.
- Uncertainty is visible: bands at 0.15 opacity, dashed past the
  present, a dashed `hoy` rule.
- Causal verbs only with a named identification strategy. Otherwise «asociado con».
- `lang="es"`. Never encode meaning by colour alone.
- Spanish first. Sensitive terminology is binding — see `guide/15-terminologia.md`.

**Never:** emoji · gradients · drop shadows · pill buttons · pure black or white · 700-weight
display · a chart without its source · a figure that cannot be rebuilt from raw data.
