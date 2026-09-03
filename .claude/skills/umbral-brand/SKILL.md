---
name: umbral-brand
description: Applies the Umbral (umbral_) brand and data-visualization style system — color tokens and the two modes (laboratorio/instrumento), Space Grotesk/IBM Plex typography, chart anatomy, uncertainty visualization, Spanish-first editorial voice, numeric style, and accessibility rules. Use this skill whenever building or reviewing anything Umbral-branded — websites, Streamlit dashboards, Quarto documents, notebooks, charts, slides, social cards, READMEs — and whenever the user mentions umbral, umbralmx, desaparecidosmx, pautamx, cabildo-libre, observatorio-delictivo-mx, tokens, signal color, modo laboratorio or modo instrumento, even if they don't say "brand" or "style guide".
---

# Umbral brand system

Umbral (`umbral_`) is an independent, Spanish-first, open-source data lab publishing on
disappearances, crime and public spending in Mexico. *Umbral* = threshold — the point where
evidence becomes significant.

Everything below is binding unless a human overrides it. The normative source is
`rules/rules.yaml` in `umbralmx/umbral-style-guide`; the rule IDs cited here resolve there.

## Before you do anything

**Never type a hex, font name, or spacing value from memory.** Read `assets/tokens.json`. Every
value in this skill is generated from that file. Retype one and you have introduced the exact defect
this system exists to prevent (UMB-COL-002, UMB-PRO-003).

Then pick the mode:

| Surface | Mode |
|---|---|
| Website, report, deck, document, print, email | **laboratorio** (light) — the default |
| Live dashboard, social card, monitoring screen, section divider, big-stat slide | **instrumento** (dark) |

Switch with `data-mode="instrumento"` or `.u-dark` on a whole container. Never mix modes inside one
panel (UMB-COL-007).

## Decision procedure

- **About to write chart code?** Read `references/charts.md` first. Every chart carries a
  finding-title, a subtitle, a source line and a downloadable CSV — no exceptions.
- **Choosing colors?** Read `references/color.md`. Do not invent a color.
- **Writing prose, numbers, dates, or anything about disappearances?** Read
  `references/voice-and-numbers.md` and `references/terminology.md`. The terminology is binding and
  the distinctions are legal, not stylistic.
- **Targeting a specific surface?** Read `references/surfaces.md`.
- **Finishing up?** Run `references/checklist.md`.

## The eleven rules that get broken most

1. **`signal` marks one thing.** One element in the data layer per view carries `signal`. If the
   logo, a button and a series are all teal, none of them is the point (UMB-COL-004).
2. **Chart titles state the finding, as a sentence.** «Los registros crecen 9% anual desde 2015»,
   not «Registros por año» (UMB-CHT-001).
<!-- umbral-lint: ignore[snapshot-tag] — format template, not a real source line -->
3. **Every chart has a source line.** `Fuente: ORIGEN · consultado FECHA · SNAPSHOT · umbral.mx ·
   datos CC BY 4.0`. A chart circulates without its page; the source line is what travels with it
   (UMB-CHT-003).
4. **Display type is Space Grotesk 500. Never 700.** The medium weight is the signature
   (UMB-TYP-001).
5. **Direct series labels, never a legend box** (UMB-CHT-005). This is *why* `signal-text`,
   `model-text` and `alert-text` exist: a series label is small text, so it needs 4.5:1, while the
   line itself only needs 3:1.
6. **Uncertainty is visible.** Bands at 15% opacity, dashed stroke past the present, a dashed `hoy`
   rule. A point estimate with no interval is incomplete (UMB-CHT-011).
7. **Causal verbs need an identification strategy named next to the estimate.** «Asociado con» for
   descriptive work; «efecto»/«reduce» only with RCT, DiD, RD or IV (UMB-MET-001).
8. **`lang` must be right.** Spanish content with `lang="en"` is read aloud with English phonetics.
   Streamlit hardcodes `lang="en"` — see `references/surfaces.md` for the shim (UMB-A11Y-001).
9. **Never encode meaning by color alone.** Series need text labels; deltas need an arrow or a word
   (UMB-A11Y-005).
10. **Write one statement per sentence, 25 words maximum.** Active voice. One word for one thing.
    It is ASD-STE100 discipline applied to the lab's prose, and it applies to what you write as
    well as what you review (UMB-VOZ-005).
11. **No pure black or white, no gradients, no shadows, no radius > 2px, no emoji.**

## The never list

Emoji · gradients · stock icons · drop shadows · pill buttons · pure black/white · decorative
illustration · hype copy · exclamation marks · 700-weight display type · `signal` on more than one
data element per view · a chart without its source · a published figure that cannot be rebuilt from
raw data.

## Colors, in brief

Full table and the generated contrast matrix: `references/color.md`.

Semantic roles: `ink · base · panel · border · gridline · baseline · muted · caption · signal ·
signal-text · model · model-text · alert · alert-text · series-4 · series-5 · missing`.

Three things that are easy to get wrong:

- **`signal` vs `signal-text`.** `signal` is the mark (3:1 threshold). `signal-text` is any text or
  link in signal (4.5:1). Same for `model` and `alert`.
- **The third series is `muted`**, not `caption`. v1.0's Python tooling used `caption`, which is
  below the 3:1 a data mark needs.
- **Gridlines are deliberately low-contrast.** Do not "fix" them.

Series order: `signal · model · muted · alert · series-4 · series-5`. Max 5 series in one chart.

## Typography, in brief

| | | |
|---|---|---|
| **Space Grotesk** | 500 | Wordmark, headlines, chart titles, a standalone hero figure |
| **IBM Plex Sans** | 400–600 | Body, UI, labels |
| **IBM Plex Mono** | 400–500 | Axis ticks, source lines, code, and any figure that aligns in a column or is compared |

Never substitute Inter, Roboto, Helvetica, Arial, or Streamlit's default Source Sans. Self-host;
never link a font CDN. Minimums: **12px mono on web · 24px on slides · 11pt in documents.**

Figures: mono when they align or are compared (KPI rows, tables, axes); Space Grotesk 500 for a
single hero figure read as language.

## Charts, in brief

Full spec: `references/charts.md`. Every chart, every medium:

<!-- umbral-lint: ignore[snapshot-tag] — template, not a real source line -->
```
Title that states the finding                      Space Grotesk 500
Geography · period · unit                          Plex Sans, muted
[ chart: horizontal gridlines only, darker baseline, no border ]
────────────────────────────────────────────       1px rule
Fuente: … · umbral.mx · datos CC BY 4.0            Plex Mono, caption
```

Plus: `aria-label` carrying the finding, an adjacent table or `<details>`, and a downloadable CSV.

Never: pie, 3D, dual axes, a truncated y-axis without an annotation, a legend box, or a chart
without its source.

## Scripts

Deterministic work — run these rather than reasoning about numbers:

```bash
python3 scripts/check_contrast.py "#128273" "#F2F3F1"   # ratio + pass/fail by role
python3 scripts/check_contrast.py --audit               # every token pair
python3 scripts/apply_theme.py --help                   # matplotlib/plotly/altair setup
python3 scripts/lint.py <path>                          # the checks umbral-lint runs
```

## When you are unsure

Say so, and name the rule you are unsure about. A rule that looks wrong goes to
`audit/open-questions.md` with evidence — it does not get quietly changed. If a rule is right but
inconvenient, the rule wins.

Two things that are always safe: **more whitespace than feels necessary**, and **stating the source**.
