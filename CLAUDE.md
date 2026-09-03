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

<!-- Umbral design system v1.3.0 — paste into a downstream repo's CLAUDE.md.
     GENERATED; regenerate from umbralmx/umbral-style-guide rather than editing. -->

## Umbral brand — the minimum

This repo follows the Umbral design system at **v1.3.0**.

v1.3.0 ships in `package.json` on the upstream `main` but carries no git
tag yet — the newest tag is v1.1.0. So every URL below pins the merge
commit `ef694c5e`, which is immutable in the same way a tag is. Move
them to `v1.3.0` once that tag exists.

Full guide: https://github.com/umbralmx/umbral-style-guide/tree/ef694c5e9e98658049ff57390856770208908f9c/guide

The dashboard is **modo laboratorio** (light), in the minimal idiom of
umbral.org.mx: dot field in the outer margin only (UMB-LAY-009), a
content sheet over it, mono lowercase section labels (UMB-LAY-006),
rows separated by 1px rules instead of cards (UMB-LAY-007), and
secondary controls as 1px mono rectangles that move to signal on
hover and focus (UMB-LAY-008). See DECISIONS.md #16.

**Load the skill** before producing anything visual: copy
`umbral-style-guide/skills/umbral-brand/` into `.claude/skills/`, or install the packaged
`.skill` from the release.

**Never hand-type a colour, font or spacing value.** Import them:

```
https://raw.githubusercontent.com/umbralmx/umbral-style-guide/ef694c5e9e98658049ff57390856770208908f9c/tokens/build/tokens.css     # web
https://raw.githubusercontent.com/umbralmx/umbral-style-guide/ef694c5e9e98658049ff57390856770208908f9c/tokens/build/tokens.json    # anything
https://raw.githubusercontent.com/umbralmx/umbral-style-guide/ef694c5e9e98658049ff57390856770208908f9c/tokens/build/tokens.py      # Python / Streamlit / notebooks
https://raw.githubusercontent.com/umbralmx/umbral-style-guide/ef694c5e9e98658049ff57390856770208908f9c/tokens/build/tokens.R       # R / Quarto
https://raw.githubusercontent.com/umbralmx/umbral-style-guide/ef694c5e9e98658049ff57390856770208908f9c/tokens/build/streamlit-config.toml
https://raw.githubusercontent.com/umbralmx/umbral-style-guide/ef694c5e9e98658049ff57390856770208908f9c/rules/rules.json            # the 75 rules, machine-readable
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
