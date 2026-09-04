---
title: Detalle por estado
toc: false
---

```js
import "./components/fonts.js";
import {brand, nav, label} from "./components/chrome.js";
import {periodoRange} from "./components/periodo.js";
import {
  CATEGORIA_KEYS, SEXO_KEYS, applyFilters, consultado, entidades, meta,
  monthlySeries, municipiosDe, nacional, periodos, sinFecha, sumBy
} from "./components/registro.js";
import {catSexoChart, rankingChart, trendChart} from "./components/charts.js";
import {chartFrame, figureRow} from "./components/frame.js";
import {
  CATEGORIA_COLORS, CATEGORIA_LABELS, CATEGORIA_TEXT_COLORS, SEXO_LABELS,
  csvHref, fmt, fmt1, provisionalFrom, titleEs
} from "./components/format.js";
```

<div>${brand()}</div>

# Cada entidad tiene su propia mezcla de categorías, sexo y municipios

<p class="u-standfirst">El mismo registro, una entidad a la vez. Un mes puede ser una fracción pequeña del registro de un estado: los registros sin fecha de hechos viven aparte y nunca se suman a las series.</p>

<div>${nav("estado")}</div>

<section class="u-section">

```js
const cveInput = Inputs.select(entidades.map((e) => e.cve_entidad), {
  label: "Estado",
  value: "01",
  format: (c) => titleEs(entidades.find((e) => e.cve_entidad === c)?.entidad ?? c)
});
const cve = Generators.input(cveInput);
```

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
<div class="u-periodo-field">${periodoInput}</div>
<div class="u-controls">
  <div class="u-field">${cveInput}</div>
  <div class="u-field">${categoriasInput}</div>
  <div class="u-field">${sexosInput}</div>
</div>

```js
const [ini, fin] = periodo;
const cats = categorias.length ? categorias : CATEGORIA_KEYS;
const sex = sexos.length ? sexos : SEXO_KEYS;
const entidadLabel = titleEs(entidades.find((e) => e.cve_entidad === cve)?.entidad ?? cve);
const periodoLabel = ini === fin ? ini : `${ini} a ${fin}`;
const cut = provisionalFrom(consultado);

const estadoRows = nacional.filter((r) => r.cve_entidad === cve);
const {rows, sinDesglose} = applyFilters(estadoRows, {
  periodoIni: ini, periodoFin: fin, categorias: cats, sexos: sex
});

const sinFechaEstado = sinFecha.filter((r) => r.cve_entidad === cve);
const sinFechaSel = sinFechaEstado
  .filter((r) => cats.includes(r.categoria))
  .reduce((a, r) => a + r.conteo, 0);
```

```js
if (sinDesglose > 0) {
  display(html`<p class="u-note">${fmt(sinDesglose)} registros sin desglose de sexo quedan fuera de esta selección.</p>`);
}
```

</section>

<section class="u-section">

<div>${label("tendencia estatal")}</div>

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
const trendData = trendMonths.map((m, i) => {
  const row = {periodo: m.periodo};
  for (const s of series) row[s.label] = s.values[i].conteo;
  return row;
});
```

```js
display(chartFrame({
  title: `${entidadLabel} acumula ${fmt(trendTotal)} registros con hechos entre ${trendMonths[0]?.periodo ?? ini} y ${trendMonths[trendMonths.length - 1]?.periodo ?? fin}`,
  subtitle: `${entidadLabel} · registros por mes de la fecha de hechos · el registro se actualiza retroactivamente`,
  consultado,
  plot: trendChart({series, cut, width}),
  data: trendData,
  columns: ["periodo", ...series.map((s) => s.label)],
  numericColumns: series.map((s) => s.label),
  download: `umbral_rnpdno_tendencia_${cve}_${ini}_${fin}_c${consultado}.csv`,
  note: `${fmt(sinFechaSel)} registros de ${entidadLabel} sin fecha de hechos no aparecen en esta serie; se detallan al final de la página.`
}));
```

</section>

<section class="u-section">

<div>${label("categoría y sexo")}</div>

```js
const SEXO_ORDER = {HOMBRE: 0, MUJER: 1, INDETERMINADO: 2, "": 3};

const bdMap = new Map();
for (const r of rows) {
  const k = `${r.categoria}|${r.sexo}`;
  bdMap.set(k, (bdMap.get(k) ?? 0) + r.conteo);
}
const bd = [...bdMap.entries()]
  .map(([k, conteo]) => {
    const [categoria, sexo] = k.split("|");
    return {
      categoria,
      sexo,
      categoria_label: CATEGORIA_LABELS[categoria],
      sexo_label: SEXO_LABELS[sexo] ?? "Sin desglose",
      color: CATEGORIA_COLORS[categoria],
      conteo
    };
  })
  .sort((a, b) =>
    CATEGORIA_KEYS.indexOf(a.categoria) - CATEGORIA_KEYS.indexOf(b.categoria) ||
    (SEXO_ORDER[a.sexo] ?? 9) - (SEXO_ORDER[b.sexo] ?? 9)
  );

const desap = bd.filter((d) => d.categoria === "DESAPARECIDA_O_NO_LOCALIZADA");
const desapTotal = desap.reduce((a, d) => a + d.conteo, 0);
const lead = desap.length
  ? desap.reduce((a, d) => (d.conteo > a.conteo ? d : a))
  : null;

const catSexoTitle = lead && desapTotal > 0
  ? `El ${fmt1(lead.conteo / desapTotal * 100)}% de los registros de personas desaparecidas o no localizadas en ${entidadLabel} corresponde a ${lead.sexo_label.toLocaleLowerCase("es-MX")}`
  : `Registros de ${entidadLabel} por categoría y sexo, ${periodoLabel}`;

const residualAqui = rows
  .filter((r) => r.sexo === "" || r.sexo === null)
  .reduce((a, r) => a + r.conteo, 0);

const catSexoNote = [
  `Los ${fmt(sinFechaSel)} registros sin fecha de hechos no tienen desglose de sexo y quedan fuera de esta gráfica.`,
  residualAqui ? `«Sin desglose» agrupa ${fmt(residualAqui)} registros que la fuente no reparte por municipio ni sexo.` : ""
].filter(Boolean).join(" ");
```

```js
display(bd.length
  ? chartFrame({
      title: catSexoTitle,
      subtitle: `${entidadLabel} · ${periodoLabel} · solo registros con fecha de hechos`,
      consultado,
      plot: catSexoChart({data: bd, width}),
      data: bd.map((d) => ({
        categoria: d.categoria, sexo: d.sexo_label, conteo: d.conteo
      })),
      columns: ["categoria", "sexo", "conteo"],
      numericColumns: ["conteo"],
      download: `umbral_rnpdno_categoria_sexo_${cve}_${ini}_${fin}_c${consultado}.csv`,
      note: catSexoNote
    })
  : html`<p class="u-note">La selección no deja registros con fecha de hechos en ${entidadLabel}.</p>`);
```

</section>

<section class="u-section">

<div>${label("municipios")}</div>

```js
// El grano municipal son 139 mil filas; se filtran por entidad antes de
// materializar los objetos, así que la página nunca construye el resto.
const munRaw = await municipiosDe(cve);
const munFiltered = applyFilters(munRaw, {
  periodoIni: ini, periodoFin: fin, categorias: cats, sexos: sex
}).rows;

const munMap = new Map();
for (const r of munFiltered) {
  const k = r.cve_municipio;
  const acc = munMap.get(k) ?? {cve_municipio: k, municipio: r.municipio, conteo: 0};
  acc.conteo += r.conteo;
  munMap.set(k, acc);
}
const munTotal = Math.max([...munMap.values()].reduce((a, d) => a + d.conteo, 0), 1);
const mun = [...munMap.values()]
  .map((d) => ({
    ...d,
    municipio_label: titleEs(d.municipio),
    porcentaje: Number((d.conteo / munTotal * 100).toFixed(1))
  }))
  .sort((a, b) => b.conteo - a.conteo);
const top15 = mun.slice(0, 15);
const noDesglosado = mun
  .filter((d) => d.municipio === "MUNICIPIO NO DESGLOSADO")
  .reduce((a, d) => a + d.conteo, 0);
```

```js
display(cve === "33"
  ? html`<div>
      <h3 class="u-chart-title">Los registros sin entidad conocida no tienen desglose municipal</h3>
      <p class="u-chart-subtitle">Estos registros corresponden a personas cuya entidad se desconoce. Su único «municipio» en la fuente es <strong>Se desconoce</strong>. Ubicación desconocida no es cero: por eso esta entidad se reporta como una más.</p>
    </div>`
  : mun.length === 0
  ? html`<p class="u-note">La selección no deja registros municipales en ${entidadLabel}.</p>`
  : chartFrame({
      title: `${mun[0].municipio_label} concentra el ${fmt1(mun[0].porcentaje)}% de los registros de ${entidadLabel} en ${periodoLabel}`,
      subtitle: `Los ${top15.length} municipios con más registros, de ${mun.length} con registros en el periodo · la tabla y el CSV incluyen todos`,
      consultado,
      plot: rankingChart({
        data: top15,
        valueKey: "conteo",
        labelKey: "municipio_label",
        idKey: "cve_municipio",
        highlight: mun[0].cve_municipio,
        valueLabel: (d) => fmt(d.conteo),
        tooltip: (d) => `${d.municipio_label}\n${fmt(d.conteo)} registros · ${fmt1(d.porcentaje)}% del estado`,
        width
      }),
      data: mun.map((d) => ({
        cve_municipio: d.cve_municipio,
        municipio: d.municipio,
        conteo: d.conteo,
        porcentaje: d.porcentaje
      })),
      columns: ["cve_municipio", "municipio", "conteo", "porcentaje"],
      numericColumns: ["conteo", "porcentaje"],
      download: `umbral_rnpdno_municipios_${cve}_${ini}_${fin}_c${consultado}.csv`,
      note: [
        noDesglosado ? `«Municipio no desglosado» agrupa ${fmt(noDesglosado)} registros que la fuente no reparte por municipio.` : "",
        "Conteos agregados por municipio (clave INEGI en el CSV); el registro público no contiene ni permite ubicar casos individuales."
      ].filter(Boolean).join(" ")
    }));
```

</section>

<section class="u-section">

<div>${label("registros sin fecha de hechos")}</div>

```js
// Un hecho del estado completo: no depende de los filtros de periodo,
// categoría ni sexo. El hueco es del registro, no de la selección.
const fechadosEstado = estadoRows.reduce((a, r) => a + r.conteo, 0);
const sinFechaTotal = sinFechaEstado.reduce((a, r) => a + r.conteo, 0);
const registroTotal = fechadosEstado + sinFechaTotal;
const pctSinFecha = sinFechaTotal / Math.max(registroTotal, 1) * 100;
```

```js
display(html`<div>
  <h3 class="u-chart-title">El ${fmt1(pctSinFecha)}% del registro de ${entidadLabel} no tiene fecha de hechos</h3>
  <p class="u-chart-subtitle">${fmt(sinFechaTotal)} de ${fmt(registroTotal)} registros carecen de fecha de hechos. No aparecen en ninguna serie mensual ni en el desglose municipal o por sexo: la fuente solo expone este bloque por categoría. Todo el registro del estado, sin filtros.</p>
  ${figureRow(CATEGORIA_KEYS.map((c) => ({
    label: CATEGORIA_LABELS[c],
    value: sinFechaEstado.filter((r) => r.categoria === c).reduce((a, r) => a + r.conteo, 0)
  })))}
  <div class="u-chart-foot">
    <p class="u-source">Fuente: RNPDNO (CNB/SEGOB) · consultado ${consultado} · ${meta.snapshot} · umbral.mx · datos CC BY 4.0</p>
    <a class="u-btn" href=${csvHref(sinFechaEstado, ["cve_entidad", "entidad", "categoria", "conteo"])} download=${`umbral_rnpdno_sin_fecha_${cve}_c${consultado}.csv`}>Descargar CSV</a>
  </div>
</div>`);
```

</section>
