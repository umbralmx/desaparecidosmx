<!-- references/voice-and-numbers.md — GENERATED from the normative layer of
     umbralmx/umbral-style-guide v1.3.0. Do not edit; regenerate. -->

# Voice, numbers and method

## Voice

Precise, sober, civic-scientific. The numbers carry the argument. **Spanish first**; English only
where the audience earns it. Code, commits and metadata are English.

Chart titles and headlines state the **finding**, as a full sentence — a claim that can be checked
against the figure, and therefore argued with.

Never: hype words, exclamation marks, emoji, rhetorical-question headlines, an adjective where a
number works, or placeholder text in production.

Hedge precisely, next to the claim — not in a footnote:

> Los registros con fecha de hechos en 2025 son 12% más que en 2024; el registro se actualiza
> retroactivamente, así que la cifra de 2025 subirá.

## Numbers (es-MX and en)

| | |
|---|---|
| Thousands / decimals | `351,057` · `3.7` — Mexico uses the anglophone convention, unlike Spain |
| Axis abbreviation | `12k` · `3.7M`; write figures in full in prose |
| Percent | `9.2%`, tight. Distinguish **per cent** from **percentage points** |
| Precision | 2–3 significant figures unless the data supports more |
| Money | Always name the currency: `107.6 M MXN`. In long series use real pesos with a stated base year |
| Dates | ISO in data and axes (`2026-07`); prose in text (`julio de 2026`). Never `07/06/2026` |
| Ranges | `2010–2026` with an en dash |
| Censored values | `≥ 107.6 M` — a lower bound is not an estimate |

**Zero, null and suppressed are three different things** and must be written differently:
`0` · `sin dato` · `suprimido (< umbral)`. Filling a null with zero is a silent imputation, and
in disappearance data it changes the claim.

## Rates

Any comparison across places of different size uses a **rate per 100,000**, with the denominator
and its year named, plus *n*. Small denominators make rates jump on a single case — publish the
count alongside, or suppress and say so.

## Method

Descriptive verbs («asociado con», «correlaciona») unless there is a named identification strategy
(RCT, diff-in-diff, RD, IV), in which case name it and its key assumption **next to the estimate**.

Disclose gaps; never silently drop or impute. Sensitive topics are handled with dignity: people are
counted, never made spectacle, and never mapped to identifiable individuals.

## Rules

- **UMB-VOZ-001** (**must**) — Spanish first; English is added where the audience earns it
  - do: Escribe guide/ en español. Escribe el código, los commits y la capa meta en inglés.
  - don't: No traduzcas del inglés al español como paso final.
- **UMB-VOZ-002** (**must**) — No hype words, exclamation marks, emoji or rhetorical-question headlines
  - do: Escribe «Los registros crecen 9% anual desde 2015».
  - don't: No escribas «¿Sabías que los registros se DISPARARON? 🚨».
- **UMB-VOZ-003** (should) — An adjective never replaces a number
  - do: Cuantifica.
  - don't: No escribas «dramático», «masivo» ni «considerable» sin la cifra al lado.
- **UMB-VOZ-004** (**must**) — Placeholder content is never published
  - do: Publica la sección cuando su texto exista.
  - don't: No dejes Lorem ipsum, «foto», «TODO» ni una biografía sin escribir.
- **UMB-VOZ-005** (should) — A sentence states one thing and does not exceed 25 words
  - do: Corta en la conjunción. Usa voz activa. Nombra la misma cosa con la misma palabra en todo el documento.
  - don't: No uses punto y coma para unir dos ideas. No apiles metáforas donde cabe un dato.
- **UMB-NUM-001** (**must**) — es-MX and en both use comma for thousands and point for decimals
  - do: Escribe 351,057 · 3.7 · 12.5%
  - don't: No escribas 351.057 ni 3,7
- **UMB-NUM-002** (should) — Large figures are abbreviated on axes and written in full in prose
  - do: Escribe 12k y 3.7M en el eje. Escribe 351,057 registros en el texto.
  - don't: No escribas «351.1k registros» dentro de una oración.
- **UMB-NUM-003** (should) — Dates are ISO in data and prose-formatted in text
  - do: Escribe 2026-07 en datos y etiquetas. Escribe julio de 2026 en el texto.
  - don't: No escribas 07/06/2026. Significa cosas distintas en México y en Estados Unidos.
- **UMB-NUM-004** (may) — The percent sign is set tight against the figure
  - do: Escribe 9.2% sin espacio entre la cifra y el símbolo.
  - don't: No escribas 9.2 % con espacio.
- **UMB-NUM-005** (**must**) — Stated precision never exceeds the precision of the data
  - do: Redondea a la precisión que el método sostiene y di cuál es.
  - don't: No arrastres todos los decimales que devuelve el cálculo.
- **UMB-NUM-006** (**must**) — Zero, null and suppressed are written differently and mean differently
  - do: Escribe 0 · «sin dato» · «suprimido (< umbral de reporte)».
  - don't: No rellenes los huecos con 0 al construir la serie.
- **UMB-MET-001** (**must**) — Causal verbs are used only with a named identification strategy
  - do: Usa «asociado con» o «correlaciona» para lo descriptivo. Usa «efecto» o «reduce» solo con RCT, dif-en-dif, RD o VI declarada.
  - don't: No escribas «X redujo Y» a partir de una serie de tiempo descriptiva.
- **UMB-MET-002** (**must**) — The headline is defensible from the data the chart shows
  - do: Comprueba que el lector puede verificar el título mirando la figura.
  - don't: No pongas un titular sobre causas encima de una gráfica descriptiva.
- **UMB-MET-003** (**must**) — Raw counts are never compared across differently sized populations
  - do: Usa una tasa por 100 mil con denominador declarado, o compara la misma unidad a lo largo del tiempo.
  - don't: No publiques un ranking de entidades por conteo absoluto.
- **UMB-MET-004** (**must**) — Sensitive topics are handled with dignity: people are counted, never made spectacle
  - do: Publica agregados, con lenguaje sobrio y la terminología del glosario.
  - don't: No publiques mapas a nivel de individuo, fotografías, ni adjetivos que dramaticen el conteo.
- **UMB-MET-005** (**must**) — Sensitive terminology follows the glossary, which is binding
  - do: Consulta guide/15-terminologia.md y usa la forma preferida.
  - don't: No elijas el término por brevedad ni por costumbre.
