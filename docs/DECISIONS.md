# Decision log

ADR-style record of significant pipeline decisions. Append a new entry
whenever a call of this kind is made; keep entries short.

---

## 1. Scrape the dashboard's internal JSON API, not the UI

- **Problem:** The Versión Estadística dashboard has no bulk export;
  we need machine-readable counts per filter combination.
- **Options:** (a) browser/UI automation reading rendered charts;
  (b) reproduce the dashboard's internal POST JSON endpoints.
- **Decision:** (b). We mapped the endpoints (`Totales`,
  `TablaDetalle`, catalogs, …) and the 31-field filter payload from
  the site's JS bundle, and verified API responses match the UI.
- **Why:** Stable, complete, and lighter on the server than driving a
  browser; raw responses can be cached verbatim before parsing.
  Gotcha encoded in `ingest.py`: the initial page GET must look like a
  normal load (no AJAX headers) or the session cookie is not set.

## 2. Municipio counts from TablaDetalle, with a residual-row fallback

- **Problem:** `BarChartSexoMunicipio` silently truncates to the top
  30 municipios (Edomex × 2024-01 summed 123 vs the true 164), which
  broke reconciliation for large states.
- **Options:** (a) keep the bar chart and absorb the gap in a residual
  row; (b) switch to `TablaDetalle` (`TipoDetalle=3`), the complete
  "Ver detalle completo" table, keeping the residual row only as a
  fallback.
- **Decision:** (b). If a table's sum still falls short of the Totales
  field, a single `MUNICIPIO NO DESGLOSADO` row reconciles the total
  and the fallback is logged; an excess is a hard error.
- **Why:** TablaDetalle verified complete (Edomex sums exactly
  164/331/26 = 521). The residual row preserves the invariant that
  every CSV reconciles to `TotalGlobal` even if the source degrades.

## 3. Categoría grain: 7 / 2 / 3, not desaparecida vs no localizada

- **Problem:** We want the finest categoría split available at the
  municipio × sexo grain.
- **Options:** (a) desaparecida and no localizada as separate
  categories; (b) the coarser 3-way partition
  `DESAPARECIDA_O_NO_LOCALIZADA` (7) / `LOCALIZADA_CON_VIDA` (2) /
  `LOCALIZADA_SIN_VIDA` (3).
- **Decision:** (b).
- **Why:** The public API only exposes the desaparecida/no-localizada
  split in the `Totales` aggregate, not in any detail endpoint. The
  3-way set partitions `TotalGlobal` exactly, which powers the
  reconciliation invariants.

## 4. Monthly CSVs are dated-records-only (`mostrarFechaNula=0`)

- **Problem:** The date filter acts on fecha de hechos;
  `mostrarFechaNula=1` would fold undated records into whatever month
  is queried.
- **Options:** (a) flag on — every monthly CSV silently includes the
  same undated pile, double-counting it across months; (b) flag off —
  monthly CSVs contain only records whose events fall in that month.
- **Decision:** (b), with the undated records handled separately
  (entry 5).
- **Why:** Months stay additive (summable across a range without
  double counting) and the periodo column means what it says.

## 5. SIN_FECHA bucket = Totales(flag on) − Totales(flag off)

- **Problem:** With dated-only monthly CSVs, undated records would
  vanish from the dataset entirely — unacceptable (Edomex has ~22k).
- **Options:** (a) drop them; (b) a per-state `sin-fecha.csv` computed
  per categoría as the difference between the two Totales calls.
- **Decision:** (b). The diff is date-range-independent (verified:
  identical values from the 2024-01 and 2024-02 slices), so the file
  is month-independent and refreshed on every export.
- **Why:** Preserves the full register while keeping monthly files
  clean. Limitation: the API exposes the undated diff only at the
  Totales aggregate, so no sexo/municipio breakdown; a negative diff
  raises `ReconciliationError`.

## 6. Living-register semantics: `consultado_en`, no fixed snapshot

- **Problem:** The RNPDNO is continuously updated — records are added,
  dated, re-classified, or removed — so counts for the same period
  change between consultations.
- **Options:** (a) pretend counts are stable; (b) stamp every row with
  the UTC query date and document that cross-consultation comparisons
  are not apples-to-apples.
- **Decision:** (b). `consultado_en` comes from the cached
  `.meta.json` sidecar written at fetch time.
- **Why:** Honest provenance; enables detecting register churn by
  re-consulting the same slice later.

## 7. Two-mechanism caveat for low monthly counts (not "mostly undated")

- **Problem:** Jalisco's tiny 2024 monthly counts (~20) were first
  attributed to bulk-loaded undated records, and the docs said the
  "vast majority" lacked dates.
- **Options:** (a) keep that wording; (b) probe historical months and
  restate the caveat.
- **Decision:** (b). Probe (2019/2021 × 3 months each) showed Jalisco
  dated monthly totals of ~270–450, vs only ~1,443 undated — the mass
  sits in earlier years. Edomex is the opposite (~22k undated). Docs
  now state two mechanisms — undated records OR events in other
  periods — with the share varying by state.
- **Why:** The original claim was empirically wrong for Jalisco;
  the corrected caveat tells users to cover the full date range *and*
  `sin-fecha.csv` before quoting state totals.

## 8. Estado 33 included as ENTIDAD NO ESPECIFICADA

- **Problem:** The dashboard has a "se desconoce" option
  (`idEstado=33`, not an INEGI code) for records whose entidad is
  unknown. Excluding it silently drops those records from any
  national aggregate.
- **Options:** (a) exclude — only real entidades; (b) include as its
  own entity in the run, labeled `ENTIDAD NO ESPECIFICADA`, written to
  `data/processed/33/`.
- **Decision:** (b), included in every batch alongside estados 1–32.
- **Why:** Unknown location ≠ zero — the same principle behind the
  SIN_FECHA bucket applies to the spatial dimension. `cve_entidad`
  `33` is documented as a special non-INEGI value; consumers joining
  on INEGI codes must handle or filter it explicitly.

## 9. Combined all-states files: strict inputs, SIN_FECHA only in the yearly file

- **Problem:** Consumers want national files, not 33 directories. Two
  sub-questions: where do SIN_FECHA rows go, and what happens when a
  state's input CSV is missing?
- **Options:** SIN_FECHA — (a) repeat the bucket in every monthly
  combined file; (b) dated-only monthly files, SIN_FECHA once per state
  in the yearly file. Missing inputs — (a) combine whatever exists with
  a warning; (b) refuse to write.
- **Decision:** (b) and (b), in `combine.py`. `all-states/<YYYY-MM>.csv`
  concatenates the per-state monthly CSVs verbatim;
  `all-states/<YYYY>.csv` adds each state's `sin-fecha.csv` exactly
  once, distinguishable via `periodo = SIN_FECHA`. Any missing input
  raises `MissingInputError` and nothing is written. Built purely from
  `data/processed/`, no fetching.
- **Why:** Repeating SIN_FECHA per month would double-count it across
  any month range, breaking the additivity entry 4 bought; putting it
  in the yearly file keeps the full register visible and filterable.
  Refusing on missing inputs means a partial national file can never
  silently overwrite (or pose as) a complete one — a warning on stderr
  doesn't travel with a CSV.

## 10. Orchestrator (`run.py`): log-and-continue, cache-skip by default

- **Problem:** Batch runs (33 estados × 12 months) die mid-run on one
  bad slice under fail-fast, and re-running re-fetches hundreds of
  already-cached slices — slow and impolite to the server.
- **Options:** (a) fail-fast like the single-slice CLIs; (b) record the
  failure, skip the slice, keep going, exit nonzero with a summary.
  And: (a) always re-fetch; (b) skip ingest when the slice's raw cache
  is complete (all files listed in `SLICE_CACHE_NAMES`), `--refetch`
  to override.
- **Decision:** (b) and (b). `python -m rnpdno.run --estados all
  --periodos 2024` runs ingest → export → combine; export is skipped
  for slices whose ingest failed; combines run last over the full
  entidad set regardless of `--estados` (entry 9 guards partial
  output). Yearly combines only for periodos given as a bare year.
- **Why:** For a long unattended batch, one flaky slice must cost one
  slice, not the run; the summary + exit code preserve loud failure at
  the batch level. Cache-skip makes re-running with identical
  arguments the resume mechanism, and honors "be gentle". Single-slice
  CLIs stay fail-fast — ingest/export/combine remain independent
  modules the runner merely calls.

## 11. Request reduction: month-invariant fetches hoisted to state level

- **Problem:** A full-year backfill made 8 requests per entidad × month
  slice (3,168 per year, ~1h46m of polite 2s delays), but half of them
  re-fetched data that never changes within a state: the municipio
  catalog is byte-identical across months (verified by checksum against
  the cached 2023–2025 slices), the SIN_FECHA diff
  Totales(fechaNula=1) − Totales(fechaNula=0) is identical for every
  month (verified likewise), AreaChartSexoMeses was consumed by
  nothing downstream, and the session-priming GET ran once per slice.
- **Options:** (a) shorten REQUEST_DELAY_SECONDS or parallelize;
  (b) keep the pacing and eliminate redundant requests.
- **Decision:** (b). Per-slice ingest now fetches only the
  reconciliation set: Totales (mostrarFechaNula=0) + TablaDetalle ×3
  categorías — that path is unchanged. The municipio catalog and the
  fechaNula pair (=1 and =0 over one shared range) are cached once per
  state in `data/raw/estado=<id>/` (`ensure_state_cache`), seeded by
  copying from already-cached old-layout slices before any fetching.
  One HTTP session (`Fetcher`) is shared across a run and re-primed if
  it expires. AreaChartSexoMeses dropped from the hot loop (refetch ad
  hoc if a cross-check ever needs it). Old-layout slices still satisfy
  `slice_cache_complete` (the new per-slice set is a subset) and stay
  exportable via fallbacks in `transform.py`, so resuming a batch never
  refetches anything already cached.
- **Why:** ~48% fewer requests (3,168 → ~1,651 per year run) without
  touching the delay, adding concurrency, or altering the per-month
  reconciliation invariants (entry 2); honors "be gentle" by asking
  the server only for what actually varies.

## 12. Dashboard framing: descriptive monitor under the Umbral system

- **Problem:** The dashboard's scope and honesty posture had to be
  settled before building: explorer vs analytical instrument, page
  structure, and how the data's gaps surface in the UI. Design
  reviewed and approved 2026-07-11 (proposal in session; brand rules
  in docs/umbral-brand.md + docs/umbral-engineering.md, binding).
- **Options & decisions:**
  1. **Descriptive monitor, no projections in v1.** A defensible
     forecast needs register-dynamics modeling (living register,
     fecha-de-hechos reporting lag, one `consultado_en` vintage) that
     we don't have data for; the brand's uncertainty rules make an
     undefendable projection a violation, not a feature. The `model`
     token stays reserved for a future modeled series.
  2. **Three pages by question altitude** — Panorama nacional /
     Detalle por estado / Datos y método — instead of the wireframe's
     single page, resolving the all-states-ranking vs one-state-
     municipal filter tension.
  3. **SIN_FECHA always visible, never a toggle.** The wireframe's
     "include SIN_FECHA" checkbox is dropped: undated counts render
     as permanent separate elements (badges/annotations/panel) and
     are never summed into dated series or bars.
  4. **Neutral KPI deltas.** No signal/alert coloring on
     month-over-month changes: recent drops are usually reporting
     lag, and valenced deltas on disappearances fail both honesty and
     dignity rules. Deliberate deviation from the component spec's
     delta coloring, per its own "decide direction per metric" escape
     hatch.
  5. **Per-100k toggle in v1** for the state ranking (umbral-
     engineering.md bans raw-count comparison across differently
     sized populations): static population file in `data/reference/`
     with its vintage year stated in the file and in the chart
     caption; estado 33 shows counts only (no population exists).
- **Why:** Every choice falls out of the same principle the pipeline
  already encodes (entries 4, 5, 8): gaps are shown, not smoothed
  over, and nothing is claimed that the data can't defend.

## 13. Municipio-provenance check: raise on cross-entidad TablaDetalle rows

- **Problem:** Cross-checking committed CSVs against an independent
  source (México Evalúa's published RNPDNO figures) turned up
  entidad-level totals off by up to 3.65x, and confirmed cases of a
  municipio name belonging to a *different* entidad's catalog showing
  up in a state's `TablaDetalle` response (e.g. TIJUANA, XALAPA,
  DURANGO rows inside other states' slices) — the server occasionally
  answers a state-filtered request with another state's data. The
  existing reconciliation invariant (entry 2) can't catch this: a
  misattributed row still counts toward *some* entidad's `Totales`, so
  sums keep reconciling even when a row is in the wrong file.
- **Options:** (a) leave unrecognized names silently joining to an
  empty `cve_municipio`, as before; (b) raise as soon as a name doesn't
  match the entidad's own cached `CatalogoMunicipios`, mirroring how
  `ReconciliationError` already treats a totals excess as a hard stop.
- **Decision:** (b), as `MunicipioProvenanceError` in `transform.py`.
  One legitimate case is carved out first: `SIN MUNICIPIO DE
  REFERENCIA` is the source's own bucket for records it can't pin to a
  municipio (not synthesized here, unlike `MUNICIPIO NO DESGLOSADO`)
  and never joins by design. `run.py`'s existing log-and-continue
  `Runner.attempt` (entry 10) means a bad slice is skipped and reported
  in the run summary rather than silently written.
- **Why:** Provenance and totals are independent invariants — a leak
  can be invisible to one and caught by the other. Raising surfaces
  the affected slice immediately instead of shipping a state-level
  number an external check would later contradict.

## 14. National cross-check as a standalone invariant, not wired into `run.py`

- **Problem:** Issue #3's recommendation 2: verify sum(per-entidad
  `Totales`) == a direct `idEstado=0` query, as a check independent of
  #13 (a wrong-entidad leak still counts nationally either way, so it
  can't catch drops/duplicates the way this can).
- **Options:** (a) fold into `run.py` so every batch fetches a national
  Totales per periodo and checks it inline; (b) a standalone module
  (`validate.py`) run deliberately, separate from the regular
  ingest → export → combine path.
- **Decision:** (b). `ingest.fetch_national_totales` caches
  `idEstado=0` Totales the same way per-entidad slices are cached, but
  only `Totales` (not `TablaDetalle`, which at national scope would
  return every municipio in the country for no benefit this check
  needs). `validate.national_cross_check` reads cached JSON only —
  never fetches — so it stays a fail-fast library call like
  `transform_slice`, not another log-and-continue step in the batch.
- **Why:** The check is only meaningful when every one of the 34
  `Totales` responses (33 entidades + national) was fetched close
  together in time — confirmed empirically: comparing a fresh national
  fetch against 2024-01's per-entidad `Totales` (cached during the
  original backfill, weeks to months earlier) showed a mismatch purely
  from ordinary register drift, not a pipeline bug. Wiring this into
  every `run.py` invocation would fetch a national total that's stale
  relative to a resumed/partial batch by construction, generating false
  positives. Keeping it standalone (run manually, ideally against a
  same-session fetch of all 34) avoids that trap. Confirmed working on
  a clean same-batch snapshot (all 33 entidades + national fetched
  within the same few minutes, 2025-06): sums matched the direct
  national query exactly on every field.

## 15. Issue #3 recommendations 3–4: leak and total mismatch are upstream, not this pipeline

- **Problem:** Two of issue #3's findings still needed a cause: (a) the
  wrong-entidad municipio leak (entry 13) — is it *our* `Fetcher`
  reusing one session across entidades, or the server itself? (b) the
  large state-level divergence from México Evalúa — is it stale data
  that's since corrected, or a real discrepancy?
- **Tests run (live, see issue #3 for the full write-up):**
  1. Fetched the three known-contaminated (source entidad, victim
     entidad, periodo) triples back-to-back in one shared session —
     each reproduced its exact original leaked municipio (SUCHIATE,
     TLAJOMULCO DE ZÚÑIGA, TIJUANA). Then fetched CDMX × 2025-04 *alone*,
     in a brand-new session with no prior request — SUCHIATE still
     appeared. A leak that survives an isolated, zero-prior-request
     session cannot be this pipeline's session/cookie reuse.
  2. Re-fetched just `Totales` (cheap: 1 POST/slice) for the 4 outlier
     entidades × Jan–Nov 2025 already committed. Fresh sums were within
     ~1–3% of committed (Guanajuato −1.9%, CDMX −1.6%, Estado de México
     −2.6%, Jalisco +0.8%) — ordinary register churn (entry 6), not the
     4x-scale divergence against México Evalúa.
- **Conclusion:** Both are upstream RNPDNO server behavior, not a local
  caching or session bug — no code change indicated for either. The
  muni-leak (entry 13) already has a hard stop; the total-magnitude
  divergence itself is still unexplained (methodology difference in
  México Evalúa's own figure, or a server-side state-filter bug deeper
  than the municipio-name symptom — see caveat below) and stays open.
- **Known caveat on entry 13's check:** `MunicipioProvenanceError` only
  fires when a leaked name doesn't exist in the victim entidad's own
  catalog. Many municipio names repeat across states (there is more
  than one "INDEPENDENCIA", "PROGRESO", etc. in Mexico); a leak that
  happens to land on such a name would join "successfully" to the
  wrong municipio's code and pass silently. The provenance check is a
  floor on this bug's visibility, not a ceiling on its extent — it
  cannot be used to argue the leak is *only* ~41/6,732 slices.

## 16. Dashboard rebuilt on Observable Framework, in modo laboratorio

- **Problem:** The Streamlit dashboard cost too much to keep running.
  Entry 12's framing was right, but the runtime was not. Three
  symptoms drove the decision. Streamlit needs a live Python server
  for a page that only reads static CSVs. The deployment pinned
  `pyarrow==24.0.0` because pyarrow 25 segfaulted the hosted app
  through three separate APIs. Every brand rule had to be re-applied
  as CSS that fought Streamlit's own widgets.
- **Decision:** Rebuild the three pages as an
  [Observable Framework](https://observablehq.com/framework/) site.
  The build writes static HTML, and every filter runs in the browser.
  There is no server to keep alive and no Arrow dependency at
  runtime. GitHub Actions publishes to GitHub Pages on push to
  `main`.
- **Sub-decisions:**
  1. **The source root is `dashboard/`, not `src/`.** Framework
     defaults to `src/`, which this repo already uses for the
     `rnpdno` Python package. Pointing Framework at `src/` made it
     try to build `src/rnpdno/README.md` as a page.
  2. **The data loaders emit CSV, not parquet.**
     `FileAttachment.parquet()` downloads 6.2 MB of `parquet-wasm` to
     decode 0.5 MB of data. The CSV is 8.2 MB on disk and 744 KB over
     the wire, because GitHub Pages serves it with gzip. CSV also
     removes a runtime dependency. The loaders read every column as
     text and cast only `conteo`, so INEGI keys keep their leading
     zero.
  3. **Two data files, not one.** `nacional.csv` drops the municipio
     grain and holds 26,501 rows in 107 KB compressed. `municipios.csv`
     keeps the full 138,835 rows. Panorama nacional never fetches the
     large file, and Detalle por estado fetches it once and filters to
     one entidad.
  4. **The fonts are injected at runtime** by
     `dashboard/components/fonts.js`. Framework's CSS bundler has no
     loader for `.woff2`, so a `url()` to a font file in the main
     stylesheet fails the build. `FileAttachment` serves any file and
     returns the same hashed URL in `preview` and in `build`. The
     cost is one font swap on first paint, which `font-display: swap`
     and the fallback stack cover. The fonts stay self-hosted, which
     is the point of UMB-TYP-005.
  5. **`@umbralmx/umbral-plot` v1.3.0 is vendored** under `vendor/`
     and installed as a `file:` dependency. The package is not
     published to npm. It supplies the Plot theme, the token values
     and the `Frame` class that throws when a chart has no source
     (UMB-CHT-003), no title (UMB-CHT-001) or no subtitle
     (UMB-CHT-002).
  6. **The site is modo instrumento (dark).** This is what the
     surface table in the style guide assigns to a live dashboard.
     The first build of this migration shipped in laboratorio,
     reasoning that a project micrositio is a web surface. That was
     reversed the same day: the surface table is the more specific
     rule, and this page is a monitor over a living register, not a
     page about the project.
     The mode lives in three places, and they must agree:
     `MODE` in `dashboard/components/format.js`, which drives the
     Plot theme and the categoría colours; `data-mode` on `<html>`,
     written by `scripts/copy-static.mjs` at build time and by
     `chrome.js` in preview; and the isotype variant, which is
     `umbral-isotype-dark.svg` on a dark ground.
     The minimal layout idiom does not change with the mode. The dot
     field, the content sheet, the mono lowercase labels and the 1px
     rules are all defined against tokens, so they carry over intact
     (UMB-LAY-006 through UMB-LAY-009).
     Checkboxes are drawn by hand rather than left native: the
     browser's dark-scheme checkbox arrives filled, with roughly a
     4px radius, which breaks UMB-LAY-001.
- **Why:** Entry 12's decisions all survive the move. The monitor
  stays descriptive. SIN_FECHA counts stay visible and stay out of
  every dated series. The figures stay neutral, with no valenced
  arrows. The per-100k toggle keeps its stated CONAPO vintage. What
  changed is the runtime under those decisions, not the decisions.

## 17. Period filter: a month grid, not two dropdowns

- **Problem:** The period filter was two `<select>` menus, «Desde» and
  «Hasta», each holding 199 options. Three things were wrong with it.
  A reader could not see the shape of the register while choosing.
  Picking a range meant two long scrolling menus. Nothing showed which
  months hold data and which do not.
- **Decision:** One range picker, drawn as a grid. The years are rows
  and the months are columns, so all 199 months are visible at once and
  the selected range reads as a continuous band. The first click sets
  the start and the second sets the end. A click before the anchor
  swaps the ends instead of rejecting the click.
- **Where the form comes from:** the calendar in `shadcn/ui`, in range
  mode, cut down to month grain. The finish does not come from there.
  That component uses rounded corners, a drop shadow and pill-shaped
  range ends. All three are forbidden (UMB-LAY-001, UMB-LAY-002). The
  cells here are square, the border is 1px and the range is marked by
  fill.
- **Sub-decisions:**
  1. **Years as rows, not a paged month view.** A calendar that pages
     one year at a time needs 17 steps to cross this register. The grid
     needs none.
  2. **Only the two ends carry `signal`.** The months between them take
     a `gridline` fill and a `muted` dot. Two hundred dots in signal
     would spend the view's single accent on a control, which
     UMB-COL-004 reserves for the data layer.
  3. **Months without data stay visible and disabled.** They are drawn
     as a hollow outline, not hidden and not painted as zero. «There is
     no record» and «zero cases» are different facts (UMB-COL-010).
  4. **The panel is folded by default.** Open, the grid is about 550px
     tall. Folded, the trigger states the current range, so the figures
     and the charts stay on the first screen.
  5. **It behaves like an Observable input.** The node exposes `value`
     and emits `input`, so `Generators.input` reads it exactly like an
     `Inputs.select`. No page code knows it is custom.
  6. **The grid is one tab stop.** A roving `tabindex` moves with the
     focus. Arrows move by month and by year, Enter selects, and Escape
     cancels a half-made range (UMB-A11Y-006).
