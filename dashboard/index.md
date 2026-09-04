---
title: Panorama nacional
toc: false
---

```js
// El armazón de la página va en su propio bloque, y por tanto en su propia
// celda. Framework funde todas las importaciones de UN bloque en UNA celda:
// juntas, la marca y la navegación esperaban a que llegaran los CSV, y la
// página arrancaba con doce indicadores girando. Separadas, el armazón se
// dibuja de inmediato y solo espera lo que de verdad necesita el dato.
import "./components/fonts.js";
import {brand, nav, label} from "./components/chrome.js";
```

```js
// Sin dato: se resuelven en cuanto bajan los módulos.
import {periodoRange} from "./components/periodo.js";
import {catSexoChart, rankingChart, trendChart} from "./components/charts.js";
import {chartFrame, figureRow} from "./components/frame.js";
import {
  CATEGORIA_COLORS, CATEGORIA_LABELS, CATEGORIA_TEXT_COLORS, SEXO_LABELS,
  fmt, fmt1, provisionalFrom, titleEs
} from "./components/format.js";
```

```js
// El único bloque que espera a la red.
import {
  CATEGORIA_KEYS, SEXO_KEYS, applyFilters, consultado, entidades, meta,
  monthlySeries, nacional, periodos, poblacion, sinFecha, sumBy
} from "./components/registro.js";
```

<div>${brand()}</div>

# El RNPDNO registra a las personas desaparecidas, no localizadas y localizadas en México

<p class="u-standfirst">Registros por <strong>fecha de hechos</strong>, 2010–2026, las 32 entidades más «entidad no especificada». El registro es vivo: los conteos del mismo periodo cambian entre consultas.</p>

<div>${nav("index")}</div>

<section class="u-section">

```js
// Los controles se construyen aquí y se colocan más abajo, dentro del
// riel de filtros. `view()` los dibujaría en el lugar del bloque de
// código; `Generators.input` da el valor reactivo sin dibujar nada.
const periodoInput = periodoRange(periodos);
const categoriasInput = Inputs.checkbox(CATEGORIA_KEYS, {
  label: "Categoría", value: CATEGORIA_KEYS, format: (d) => CATEGORIA_LABELS[d]
});
const sexosInput = Inputs.checkbox(SEXO_KEYS, {
  label: "Sexo", value: SEXO_KEYS, format: (d) => SEXO_LABELS[d]
});

const periodo = Generators.input(periodoInput);
const categorias = Generators.input(categoriasInput);
const sexos = Generators.input(sexosInput);
```

<div>${label("filtros · por fecha de hechos")}</div>
<div class="u-controls">
  <div class="u-field">${periodoInput}</div>
  <div class="u-field">${categoriasInput}</div>
  <div class="u-field">${sexosInput}</div>
</div>

```js
// El control entrega el par ya ordenado.
const [ini, fin] = periodo;
const cats = categorias.length ? categorias : CATEGORIA_KEYS;
const sex = sexos.length ? sexos : SEXO_KEYS;

const {rows, sinDesglose} = applyFilters(nacional, {
  periodoIni: ini, periodoFin: fin, categorias: cats, sexos: sex
});
const periodoLabel = ini === fin ? ini : `${ini} a ${fin}`;
const cut = provisionalFrom(consultado);
```

```js
if (sinDesglose > 0) {
  display(html`<p class="u-note">${fmt(sinDesglose)} registros sin desglose de sexo quedan fuera de esta selección.</p>`);
}
```

</section>

<section class="u-section">

<div>${label("cifras del periodo")}</div>

```js
const porCategoria = sumBy(rows, "categoria");
const desaparecidas = porCategoria.get("DESAPARECIDA_O_NO_LOCALIZADA") ?? 0;
const localizadas =
  (porCategoria.get("LOCALIZADA_CON_VIDA") ?? 0) +
  (porCategoria.get("LOCALIZADA_SIN_VIDA") ?? 0);
const totalPeriodo = desaparecidas + localizadas;
const sinFechaSel = sinFecha
  .filter((r) => cats.includes(r.categoria))
  .reduce((a, r) => a + r.conteo, 0);
```

```js
// Cifras neutras, sin flechas de variación: una caída mes contra mes casi
// siempre es rezago de registro, y una flecha con valencia falla la regla
// de dignidad (DECISIONS.md #12.4).
display(figureRow([
  {label: "Registros en el periodo", value: totalPeriodo},
  {label: "Desaparecidas o no localizadas", value: desaparecidas},
  {label: "Localizadas (con y sin vida)", value: localizadas},
  {
    label: "Sin fecha de hechos",
    value: sinFechaSel,
    note: "No incluidos en las demás cifras ni en las series."
  }
]));
```

<p class="u-source">Periodo ${periodoLabel} · las tres categorías particionan el total · Fuente: RNPDNO (CNB/SEGOB) · consultado ${consultado} · ${meta.snapshot} · umbral.mx · datos CC BY 4.0</p>

</section>

<section class="u-section">

<div>${label("tendencia nacional")}</div>

```js
const porCategoriaTrendInput = Inputs.toggle({label: "Ver por categoría", value: false});
const porCategoriaTrend = Generators.input(porCategoriaTrendInput);
display(html`<div class="u-controls"><div class="u-field">${porCategoriaTrendInput}</div></div>`);
```

```js
const series = porCategoriaTrend
  ? CATEGORIA_KEYS.filter((c) => cats.includes(c)).map((c) => ({
      label: CATEGORIA_LABELS[c],
      color: CATEGORIA_COLORS[c],
      textColor: CATEGORIA_TEXT_COLORS[c],
      values: monthlySeries(rows.filter((r) => r.categoria === c), ini, fin)
    }))
  : [{
      label: "Total",
      color: CATEGORIA_COLORS.DESAPARECIDA_O_NO_LOCALIZADA,
      textColor: CATEGORIA_TEXT_COLORS.DESAPARECIDA_O_NO_LOCALIZADA,
      values: monthlySeries(rows, ini, fin)
    }];

const trendMonths = series[0]?.values ?? [];
const trendTotal = series.reduce(
  (a, s) => a + s.values.reduce((b, v) => b + v.conteo, 0), 0
);

// El CSV y la tabla repiten las cifras exactas que dibuja la gráfica.
const trendData = trendMonths.map((m, i) => {
  const row = {periodo: m.periodo};
  for (const s of series) row[s.label] = s.values[i].conteo;
  return row;
});
const trendCols = ["periodo", ...series.map((s) => s.label)];
```

```js
display(chartFrame({
  title: `El RNPDNO acumula ${fmt(trendTotal)} registros con hechos entre ${trendMonths[0]?.periodo ?? ini} y ${trendMonths[trendMonths.length - 1]?.periodo ?? fin}`,
  subtitle: "México · registros por mes de la fecha de hechos · el registro se actualiza retroactivamente",
  consultado,
  plot: trendChart({series, cut, width}),
  data: trendData,
  columns: trendCols,
  numericColumns: series.map((s) => s.label),
  download: `umbral_rnpdno_tendencia_nacional_${ini}_${fin}_c${consultado}.csv`,
  note: `${fmt(sinFechaSel)} registros sin fecha de hechos no aparecen en esta serie; se detallan en Datos y método. La cola punteada marca los meses que siguen llenándose.`
}));
```

</section>

<section class="u-section">

<div>${label("ranking estatal")}</div>

```js
const enTasaInput = Inputs.toggle({label: "Por cada 100 mil habitantes", value: false});
const enTasa = Generators.input(enTasaInput);
```

```js
const y0 = Number(ini.slice(0, 4));
const y1 = Math.min(Number(fin.slice(0, 4)), meta.anios_poblacion[1]);

// Denominador: población media a mitad de año sobre los años del periodo.
const popPeriodo = new Map();
for (const p of poblacion) {
  if (p.anio < y0 || p.anio > y1) continue;
  const acc = popPeriodo.get(p.cve_entidad) ?? {suma: 0, n: 0};
  acc.suma += p.poblacion;
  acc.n += 1;
  popPeriodo.set(p.cve_entidad, acc);
}

const porEstadoMap = new Map();
for (const r of rows) {
  const acc = porEstadoMap.get(r.cve_entidad) ?? 0;
  porEstadoMap.set(r.cve_entidad, acc + r.conteo);
}
const sinFechaEstado = new Map();
for (const r of sinFecha) {
  if (!cats.includes(r.categoria)) continue;
  sinFechaEstado.set(r.cve_entidad, (sinFechaEstado.get(r.cve_entidad) ?? 0) + r.conteo);
}

const porEstado = entidades.map((e) => {
  const conteo = porEstadoMap.get(e.cve_entidad) ?? 0;
  const pop = popPeriodo.get(e.cve_entidad);
  const poblacionMedia = pop ? pop.suma / pop.n : null;
  return {
    cve_entidad: e.cve_entidad,
    entidad: e.entidad,
    entidad_label: titleEs(e.entidad),
    conteo,
    sin_fecha: sinFechaEstado.get(e.cve_entidad) ?? 0,
    poblacion_promedio: poblacionMedia ? Math.round(poblacionMedia) : null,
    tasa_100k: poblacionMedia ? Number((conteo / poblacionMedia * 1e5).toFixed(1)) : null
  };
});

// La entidad 33 no tiene población por diseño y sale de las tasas.
const rankBase = enTasa ? porEstado.filter((d) => d.tasa_100k !== null) : porEstado;
const rankSorted = [...rankBase].sort(
  (a, b) => (enTasa ? b.tasa_100k - a.tasa_100k : b.conteo - a.conteo)
);
const top = rankSorted[0];
const totalRank = rankBase.reduce((a, d) => a + d.conteo, 0);
```

```js
const destacadoInput = Inputs.select(rankSorted.map((d) => d.cve_entidad), {
  label: "Destacar entidad",
  value: top?.cve_entidad,
  format: (c) => rankSorted.find((d) => d.cve_entidad === c)?.entidad_label ?? c
});
const destacado = Generators.input(destacadoInput);
display(html`<div class="u-controls">
  <div class="u-field">${enTasaInput}</div>
  <div class="u-field">${destacadoInput}</div>
</div>`);
```

```js
const rankTitle = enTasa
  ? `${top.entidad_label} registra la tasa más alta: ${fmt1(top.tasa_100k)} registros por 100 mil habitantes (${periodoLabel})`
  : `${top.entidad_label} concentra el ${fmt1(top.conteo / Math.max(totalRank, 1) * 100)}% de los registros con hechos en ${periodoLabel}`;

const rankSubtitle = enTasa
  ? `Tasa = registros con hechos en el periodo / población promedio a mitad de año ${y0}–${y1} × 100,000 · «Entidad no especificada» se excluye de las tasas`
  : "Conteos absolutos, sin ajustar por población — active la tasa para comparar entidades de distinto tamaño";
```

```js
display(chartFrame({
  title: rankTitle,
  subtitle: rankSubtitle,
  consultado,
  extraSource: enTasa ? "población CONAPO (rev. 2023)" : "",
  plot: rankingChart({
    data: rankBase,
    valueKey: enTasa ? "tasa_100k" : "conteo",
    labelKey: "entidad_label",
    idKey: "cve_entidad",
    highlight: destacado,
    valueLabel: enTasa
      ? (d) => fmt1(d.tasa_100k)
      : (d) => `${fmt(d.conteo)} · +${fmt(d.sin_fecha)} s/f`,
    tooltip: (d) =>
      `${d.entidad_label}\n${fmt(d.conteo)} registros · +${fmt(d.sin_fecha)} sin fecha` +
      (d.tasa_100k !== null ? `\n${fmt1(d.tasa_100k)} por 100 mil` : ""),
    width
  }),
  data: rankSorted,
  columns: ["cve_entidad", "entidad", "conteo", "sin_fecha", "poblacion_promedio", "tasa_100k"],
  numericColumns: ["conteo", "sin_fecha", "poblacion_promedio", "tasa_100k"],
  download: `umbral_rnpdno_ranking_estatal_${ini}_${fin}_c${consultado}.csv`,
  note: "«+N s/f» = registros de esa entidad sin fecha de hechos, no sumados a la barra. «Entidad no especificada» agrupa registros cuya entidad se desconoce: ubicación desconocida no es cero."
}));
```

</section>
