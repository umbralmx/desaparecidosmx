<!-- references/charts.md — GENERATED from the normative layer of
     umbralmx/umbral-style-guide v1.3.0. Do not edit; regenerate. -->

# Charts

**Read this before writing any chart code.**

## The frame every chart carries

```
Title that states the finding, as a sentence      Space Grotesk 500, 22px, left-aligned
Geography · period · unit                         Plex Sans, muted
[ plot area ]                                     horizontal gridlines only,
                                                  darker baseline, no border, no fill
──────────────────────────────────────            1px rule
Fuente: … · umbral.mx · datos CC BY 4.0           Plex Mono 12px, caption
```

Plus, always:

- `aria-label` carrying the same claim as the title — not "line chart";
- an adjacent data table or `<details>`;
- a downloadable CSV.

## Source line format

```
Fuente: ORIGEN (INSTITUCIÓN) · consultado AAAA-MM-DD · SNAPSHOT-TAG · umbral.mx · datos CC BY 4.0
```

The snapshot tag matters for live registers: the RNPDNO's counts for past months change between
queries, so two correct charts made weeks apart appear to contradict each other without it.

## Uncertainty

- Band at **0.15** opacity of the series colour, no border.
- Dashed stroke (`7 5`) past the last observed datum.
- Dashed vertical rule labelled `hoy`.
- The subtitle must say **what the band is**: `IC 95%`, `intervalo de predicción 80%`, or the
  source's own published bounds.

Live registers under-report recent periods. Mark the incomplete tail as provisional, or the final
drop reads as an improvement.

## Never

Pie · donut · 3D · dual axes · truncated y-axis without an annotation · legend boxes · more than 5
series · a chart without its source.

## Picking a chart

| Intent | Chart |
|---|---|
| Change over time | Line; area only if the total means something |
| Ranking | Horizontal bars, sorted by value |
| Composition | Stacked bar to 100% — never a pie |
| Distribution | Histogram; box or ridge to compare; dots when n < 30 |
| Relationship | Scatter; no trend line unless the model is declared |
| Geography | Choropleth of **rates**, never counts — and ask if sorted bars read better |
| Daily density over years | Calendar heatmap — one square cell per day, one sequential ramp |

## The calendar heatmap

One square cell per day, columns are weeks, rows are weekdays. Use it for cadence, not for trend.

It breaks UMB-COL-010 more easily than any other chart. A day with no entry, a suppressed day and a
measured zero all look like an empty cell. Draw three distinct fills and put all three in the
legend.

A live register makes this worse. Its recent tail is always empty, and empty reads as zero. Hatch
the provisional range and say so in the subtitle.

`umbral_viz.heatmap.calendar()` and `@umbralmx/umbral-plot`'s `calendar()` both do this.

## The adjacent table

Every chart ships one (UMB-A11Y-003). Top rule 2px `ink`, row rules 1px `border`, header in Plex
Sans 600.

Text columns align left. Figure columns align right, in Plex Mono with tabular numerals, because
comparing columns is what the table is for.

A delta carries an arrow or a word: `+9.2% ▲`. Colour never carries direction alone
(UMB-A11Y-005), and never inside a filled pill (UMB-LAY-001).

A missing cell reads `sin dato`. Never `0`, never empty (UMB-NUM-006).

The table repeats the chart's exact figures at the same precision. Rounding differently in the two
places publishes two numbers for one fact.

## Rules

- **UMB-CHT-001** (**must**) — The chart title states the finding as a full sentence
  - do: Escribe «El gasto observable acumula ≥ 107.6 M MXN».
  - don't: No escribas «Gasto por mes».
- **UMB-CHT-002** (**must**) — Every chart carries a subtitle with geography, period and unit
  - do: Escribe «México · registros por mes de la fecha de hechos · el registro se actualiza retroactivamente».
  - don't: No dejes la unidad implícita en el eje.
- **UMB-CHT-003** (**must**) — Every chart carries its source line with licence, above a 1px rule
  - do: Escribe «Fuente: RNPDNO (CNB/SEGOB) · consultado 2026-07-09 · rnpdno-2026-07 · umbral.mx · datos CC BY 4.0».
  - don't: No publiques una gráfica sin fuente. No dejes la fuente solo en el texto que la rodea.
- **UMB-CHT-004** (**must**) — Horizontal gridlines only, with a darker baseline
  - do: Pon y.grid en true, x.grid en false, y la base en --u-baseline.
  - don't: No pongas retícula en ambos ejes. No dibujes un marco alrededor de la gráfica.
- **UMB-CHT-005** (**must**) — Series are labelled directly at line ends; no legend box
  - do: Dibuja el texto de la serie sobre su último dato.
  - don't: No pongas una caja de leyenda al costado.
- **UMB-CHT-006** (should) — A chart carries at most 5 series
  - do: Pon una serie en signal y el resto en model o muted. Agrupa la cola en «otros» y di cuántas agrupaste.
  - don't: No dibujes ocho líneas con una leyenda para desenredarlas.
- **UMB-CHT-007** (should) — Axis ticks are mono, abbreviated, with comma thousands separators
  - do: Escribe 12k, 3.7M y 351,057.
  - don't: No escribas 12000 ni 3700000. No pongas las cifras en la tipografía de cuerpo.
- **UMB-CHT-008** (**must**) — The y-axis starts at zero for bars
  - do: Empieza las barras en 0 siempre.
  - don't: No empieces el eje en el mínimo observado para que se note más la diferencia.
- **UMB-CHT-009** (**must**) — Any axis truncation is annotated on the chart itself
  - do: Marca el corte y dilo junto al eje.
  - don't: No trunques el eje en silencio.
- **UMB-CHT-010** (**must**) — No pie charts, 3D or dual axes
  - do: Usa barras para composición, líneas para tiempo y dos paneles para dos unidades.
  - don't: No uses pastel, dona, barras 3D ni dos ejes verticales con escalas distintas.
- **UMB-CHT-011** (**must**) — Every projection or estimate shows its uncertainty
  - do: Dibuja la banda al 15% de opacidad del color de la serie. Puntea el trazo más allá del presente. Etiqueta la regla vertical como «hoy».
  - don't: No cruces al futuro con una línea sólida igual a la del dato observado.
- **UMB-CHT-012** (**must**) — Every rate states its denominator and n
  - do: Escribe «tasa por 100 mil habitantes · denominador CONAPO 2026 · n = 1,204».
  - don't: No publiques la tasa sola.
