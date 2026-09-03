<!-- references/checklist.md — GENERATED from the normative layer of
     umbralmx/umbral-style-guide v1.3.0. Do not edit; regenerate. -->

# Pre-ship checklist

29 `error` rules are checked by `umbral-lint` and the token build. These
29 need human judgement:

- [ ] **UMB-BRD-001** — The wordmark is `umbral_` in lowercase, Space Grotesk 500, underscore in signal
- [ ] **UMB-BRD-004** — The logo is never distorted, outlined, shadowed or recoloured outside the tokens
- [ ] **UMB-COL-004** — signal is used on exactly one element of the data layer per view
- [ ] **UMB-COL-007** — The two modes are never mixed inside one panel
- [ ] **UMB-COL-009** — The two sequential ramps never encode two variables in one figure
- [ ] **UMB-COL-010** — Missing, suppressed and zero are visually distinct from one another
- [ ] **UMB-CHT-001** — The chart title states the finding as a full sentence
- [ ] **UMB-CHT-002** — Every chart carries a subtitle with geography, period and unit
- [ ] **UMB-CHT-004** — Horizontal gridlines only, with a darker baseline
- [ ] **UMB-CHT-005** — Series are labelled directly at line ends; no legend box
- [ ] **UMB-CHT-008** — The y-axis starts at zero for bars
- [ ] **UMB-CHT-009** — Any axis truncation is annotated on the chart itself
- [ ] **UMB-CHT-011** — Every projection or estimate shows its uncertainty
- [ ] **UMB-CHT-012** — Every rate states its denominator and n
- [ ] **UMB-VOZ-001** — Spanish first; English is added where the audience earns it
- [ ] **UMB-NUM-001** — es-MX and en both use comma for thousands and point for decimals
- [ ] **UMB-NUM-005** — Stated precision never exceeds the precision of the data
- [ ] **UMB-NUM-006** — Zero, null and suppressed are written differently and mean differently
- [ ] **UMB-DAT-003** — Every published figure rebuilds from raw data with one command
- [ ] **UMB-DAT-005** — Missing or under-reported data is disclosed, never silently dropped or imputed
- [ ] **UMB-A11Y-003** — Each chart has an adjacent data table or <details> with the figures
- [ ] **UMB-A11Y-004** — Each chart ships a downloadable CSV
- [ ] **UMB-A11Y-005** — Meaning is never encoded by colour alone
- [ ] **UMB-MET-001** — Causal verbs are used only with a named identification strategy
- [ ] **UMB-MET-002** — The headline is defensible from the data the chart shows
- [ ] **UMB-MET-003** — Raw counts are never compared across differently sized populations
- [ ] **UMB-MET-004** — Sensitive topics are handled with dignity: people are counted, never made spectacle
- [ ] **UMB-PRO-004** — Changing a token value is a MAJOR version bump
- [ ] **UMB-PRO-005** — The guide chapter and the rule entry are updated together

## Always

- [ ] Correct mode for the surface — light by default
- [ ] Every colour, font and spacing value from the tokens; none hand-typed
- [ ] Display is Space Grotesk 500, never 700
- [ ] Every chart: finding-title + subtitle + source + licence + CSV + `aria-label`
- [ ] Uncertainty visible wherever there is a projection or estimate
- [ ] One `signal` element in the data layer per view
- [ ] `lang` correct
- [ ] Spanish first; terminology per `references/terminology.md`
- [ ] Causal language matches the identification strategy actually used
- [ ] Nothing from the never list
