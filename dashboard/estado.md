---
title: Detalle por estado
toc: false
---

```js
// Ver index.md: el armazón va aparte para que no espere al dato.
import "./components/fonts.js";
import {brand, nav, label} from "./components/chrome.js";
```

```js
import {periodoRange} from "./components/periodo.js";
import {serieLegend} from "./components/legend.js";
import {whenVisible} from "./components/lazy.js";
import {
  cumulativeAreaChart, rankingChart, stackedMonthlyChart, stackedRankChart,
  treemapChart
} from "./components/charts.js";
import {chartFrame, figureRow, snapshotTag, sourceLine} from "./components/frame.js";
import {
  CATEGORIA_COLORS, CATEGORIA_LABELS, CATEGORIA_TEXT_COLORS,
  SEXO_COLORS, SEXO_LABELS, SEXO_TEXT_COLORS,
  RANKING_COLORS, csvButton, fmt, fmt1, titleEs
} from "./components/format.js";
```

```js
// Los dos módulos de datos van en el mismo bloque a propósito: Framework
// funde sus importaciones en un solo Promise.all, así que los 5 KB de
// metadatos y los 107 KB del grano nacional bajan a la vez.
import {
  CATEGORIA_KEYS, SEXO_KEYS, consultado, cumulativeMatrix, entidades,
  monthlyMatrix, periodos, sinFecha
} from "./components/registro.js";
import {nacional} from "./components/registro-nacional.js";
import {municipiosDe} from "./components/municipios.js";
```

<div>${brand()}</div>

# Cada entidad tiene su propia mezcla de categorías, sexo y municipios

<p class="u-standfirst">El mismo registro, una entidad a la vez. Un mes puede ser una fracción pequeña del registro de un estado: los registros sin fecha de hechos viven aparte y nunca se suman a las series.</p>

<div>${nav("estado")}</div>

<section class="u-section">

```js
// Los dos únicos filtros globales de la página. Categoría y sexo se leen
// dentro de cada gráfica —la leyenda de la tendencia, los paneles del
// treemap—, donde el control está junto al efecto que produce.
const cveInput = Inputs.select(entidades.map((e) => e.cve_entidad), {
  label: "Estado",
  value: "01",
  format: (c) => titleEs(entidades.find((e) => e.cve_entidad === c)?.entidad ?? c)
});
const cve = Generators.input(cveInput);

const periodoInput = periodoRange(periodos);
const periodo = Generators.input(periodoInput);
```

<div>${label("filtros · por fecha de hechos")}</div>
<div class="u-controls">
  <div class="u-field">${cveInput}</div>
  <div class="u-field">${periodoInput}</div>
</div>

```js
const [ini, fin] = periodo;
const entidadLabel = titleEs(entidades.find((e) => e.cve_entidad === cve)?.entidad ?? cve);
const periodoLabel = ini === fin ? ini : `${ini} a ${fin}`;

// Ver index.md: la advertencia va en el subtítulo y la explicación de la
// caída final en la nota. Ninguna serie marca un «tramo provisional».
const AVISO_RETROACTIVO =
  "El registro se actualiza de forma retroactiva, así que toda la serie —no solo su cola— cambia entre consultas.";
const NOTA_REZAGO =
  "Los meses recientes se ven bajos porque el registro fecha los hechos con años de retraso: una caída al final de la serie es rezago de captura, no una mejora.";

const estadoRows = nacional.filter((r) => r.cve_entidad === cve);
const rows = estadoRows.filter((r) => r.periodo >= ini && r.periodo <= fin);

const sinFechaEstado = sinFecha.filter((r) => r.cve_entidad === cve);
// No depende del periodo ni de ninguna otra selección: la fuente no ubica
// estos registros en ningún mes. Es una cifra del estado, no del corte.
const sinFechaEstadoTotal = sinFechaEstado.reduce((a, r) => a + r.conteo, 0);

// Mismo umbral que .u-chart-grid en umbral.css.
const dual = width >= 860;
const anchoTercio = dual ? Math.floor((width - 80) / 3) : width;
```

</section>

<section class="u-section">

<div>${label("tendencia estatal")}</div>

```js
const catLegendInput = serieLegend(
  CATEGORIA_KEYS.map((k) => ({
    key: k,
    label: CATEGORIA_LABELS[k],
    color: CATEGORIA_COLORS[k]
  })),
  {label: "Categorías de la gráfica"}
);
const catVisibles = Generators.input(catLegendInput);
```

```js
const trendSeries = CATEGORIA_KEYS.filter((k) => catVisibles.includes(k)).map((k) => ({
  key: k,
  label: CATEGORIA_LABELS[k],
  color: CATEGORIA_COLORS[k],
  textColor: CATEGORIA_TEXT_COLORS[k]
}));

const trendRows = monthlyMatrix(rows, "categoria", trendSeries.map((s) => s.key), ini, fin);
const trendTotales = trendSeries.map((s) => ({
  ...s,
  total: trendRows.reduce((a, r) => a + r[s.key], 0)
}));
const trendTotal = trendTotales.reduce((a, s) => a + s.total, 0);
const trendMayor = [...trendTotales].sort((a, b) => b.total - a.total)[0];
const trendIni = trendRows[0]?.periodo ?? ini;
const trendFin = trendRows[trendRows.length - 1]?.periodo ?? fin;
```

```js
display(chartFrame({
  title: trendMayor && trendTotal > 0
    ? `${entidadLabel} suma ${fmt(trendTotal)} hechos entre ${trendIni} y ${trendFin}, y ${trendMayor.label.toLocaleLowerCase("es-MX")} son el ${fmt1(trendMayor.total / trendTotal * 100)}%`
    : `Registros de ${entidadLabel} por mes de la fecha de hechos, ${periodoLabel}`,
  subtitle: `Conteo mensual de registros por fecha de hechos, apilado por categoría, ${entidadLabel}, ${periodoLabel}. ${AVISO_RETROACTIVO}`,
  consultado,
  controls: catLegendInput,
  plot: stackedMonthlyChart({rows: trendRows, series: trendSeries, width}),
  data: trendRows,
  columns: ["periodo", ...trendSeries.map((s) => s.key)],
  numericColumns: trendSeries.map((s) => s.key),
  download: `umbral_rnpdno_tendencia_${cve}_${ini}_${fin}_c${consultado}.csv`,
  note: `${NOTA_REZAGO} Los ${fmt(sinFechaEstadoTotal)} registros de ${entidadLabel} sin fecha de hechos no aparecen en esta serie; se detallan al final de la página. Clic en una categoría de la leyenda para ocultarla.`
}));
```

</section>

<section class="u-section">

<div>${label("acumulado estatal")}</div>

```js
const acumSeries = CATEGORIA_KEYS.map((k) => ({
  key: k,
  label: CATEGORIA_LABELS[k],
  color: CATEGORIA_COLORS[k],
  textColor: CATEGORIA_TEXT_COLORS[k]
}));
const acumRows = cumulativeMatrix(
  monthlyMatrix(rows, "categoria", CATEGORIA_KEYS, ini, fin),
  CATEGORIA_KEYS
);
// Toda gráfica que reparte color lleva su clave. Esta no es control: solo
// nombra las tres bandas que antes se etiquetaban al final del área.
const acumKey = serieLegend(acumSeries, {
  label: "Categorías del área acumulada",
  interactive: false
});
const acumFin = acumRows[acumRows.length - 1] ?? {};
const acumTotal = CATEGORIA_KEYS.reduce((a, k) => a + (acumFin[k] ?? 0), 0);
const acumDesap = acumFin.DESAPARECIDA_O_NO_LOCALIZADA ?? 0;
```

```js
display(chartFrame({
  title: acumTotal > 0
    ? `Al cierre de ${acumFin.periodo ?? fin}, ${entidadLabel} acumula ${fmt(acumTotal)} registros en el periodo, de los que ${fmt(acumDesap)} siguen como desaparecidas o no localizadas`
    : `Acumulado de registros de ${entidadLabel}, ${periodoLabel}`,
  subtitle: `Suma acumulada de registros por fecha de hechos dentro del periodo, apilada por categoría, ${entidadLabel}, ${periodoLabel}. ${AVISO_RETROACTIVO}`,
  consultado,
  controls: acumKey,
  plot: cumulativeAreaChart({rows: acumRows, series: acumSeries, width}),
  data: acumRows,
  columns: ["periodo", ...CATEGORIA_KEYS],
  numericColumns: CATEGORIA_KEYS,
  download: `umbral_rnpdno_acumulado_${cve}_${ini}_${fin}_c${consultado}.csv`,
  note: `El acumulado corre solo sobre el periodo elegido, no sobre todo el registro de ${entidadLabel}. Los ${fmt(sinFechaEstadoTotal)} registros sin fecha de hechos no entran en ninguna serie mensual.`
}));
```

</section>

<section class="u-section" id="seccion-sexo-categoria">

<div>${label("sexo dentro de cada categoría")}</div>

```js
// Ver index.md: las dos secciones de sexo están bajo el pliegue y esperan
// a que el lector se acerque en vez de construirse al abrir la página.
const treeVisible = whenVisible("#seccion-sexo-categoria");
const sexMesVisible = whenVisible("#seccion-sexo-mes");

// Tres paneles de UNA figura, no tres figuras: la comparación es entre
// ellos, así que comparten título, fuente, CSV y tabla.
const treeSeries = SEXO_KEYS.map((k) => ({
  key: k,
  label: SEXO_LABELS[k],
  color: SEXO_COLORS[k]
}));

// Clave de lectura de los tres paneles. No es un control: los azulejos
// pequeños —«indeterminado» es el 0.2% del registro— no dan para etiqueta
// dentro, y sin clave quedarían identificables solo por el globo.
const treeKey = serieLegend(treeSeries, {
  label: "Sexo en los tres paneles",
  interactive: false
});

const treePaneles = !treeVisible ? [] : CATEGORIA_KEYS.map((c) => {
  const data = treeSeries.map((s) => ({
    ...s,
    conteo: rows
      .filter((r) => r.categoria === c && r.sexo === s.key)
      .reduce((a, r) => a + r.conteo, 0)
  }));
  const total = data.reduce((a, d) => a + d.conteo, 0);
  const mujeres = data.find((d) => d.key === "MUJER")?.conteo ?? 0;
  return {
    categoria: c,
    label: CATEGORIA_LABELS[c],
    data,
    total,
    pctMujeres: total ? (mujeres / total) * 100 : 0
  };
});

const treeConDatos = treePaneles.filter((p) => p.total > 0);
const treeOrden = [...treeConDatos].sort((a, b) => a.pctMujeres - b.pctMujeres);
const treeMin = treeOrden[0];
const treeMax = treeOrden[treeOrden.length - 1];

const treeData = treePaneles.flatMap((p) =>
  p.data.map((d) => ({
    categoria: p.categoria,
    sexo: d.key,
    conteo: d.conteo,
    porcentaje: p.total ? Number(((d.conteo / p.total) * 100).toFixed(1)) : null
  }))
);
```

```js
const treePanelesNodo = html`<div class="u-chart-grid u-chart-grid--3">
  ${treePaneles.map((p) => html`<div>
    <h4 class="u-panel-title">${p.label}</h4>
    <p class="u-panel-note">${fmt(p.total)} registros</p>
    ${p.total > 0
      ? treemapChart({data: p.data, width: anchoTercio, height: 240})
      : html`<p class="u-note">Sin registros en el periodo.</p>`}
  </div>`)}
</div>`;
```

```js
display(!treeVisible
  // Reserva la altura para que la página no salte al llegar la figura.
  ? html`<div style="min-height:380px"></div>`
  : treeConDatos.length
  ? chartFrame({
      title: treeMin && treeMax && treeMin !== treeMax
        ? `En ${entidadLabel} la proporción de mujeres va del ${fmt1(treeMin.pctMujeres)}% en ${treeMin.label.toLocaleLowerCase("es-MX")} al ${fmt1(treeMax.pctMujeres)}% en ${treeMax.label.toLocaleLowerCase("es-MX")}`
        : `Reparto por sexo dentro de cada categoría en ${entidadLabel}, ${periodoLabel}`,
      subtitle: `Reparto porcentual por sexo dentro de cada categoría, con el área de cada azulejo proporcional a su número de registros, ${entidadLabel}, ${periodoLabel}.`,
      consultado,
      controls: treeKey,
      plot: treePanelesNodo,
      data: treeData,
      columns: ["categoria", "sexo", "conteo", "porcentaje"],
      numericColumns: ["conteo", "porcentaje"],
      download: `umbral_rnpdno_sexo_por_categoria_${cve}_${ini}_${fin}_c${consultado}.csv`,
      note: `Los porcentajes son dentro de cada categoría, no del registro de ${entidadLabel}. Los ${fmt(sinFechaEstadoTotal)} registros sin fecha de hechos no traen desglose de sexo y quedan fuera.`
    })
  : html`<p class="u-note">La selección no deja registros con fecha de hechos en ${entidadLabel}.</p>`);
```

</section>

<section class="u-section" id="seccion-sexo-mes">

<div>${label("sexo mes a mes")}</div>

```js
// Aquí las tres categorías van sumadas a propósito: la pregunta es cómo se
// reparte por sexo el registro entero del estado, y el desglose por
// categoría lo responde la figura de arriba.
const sexoSeries = SEXO_KEYS.map((k) => ({
  key: k,
  label: SEXO_LABELS[k],
  color: SEXO_COLORS[k],
  textColor: SEXO_TEXT_COLORS[k]
}));
const sexoKey = serieLegend(sexoSeries, {
  label: "Sexos de la gráfica mensual",
  interactive: false
});
const sexoRows = sexMesVisible ? monthlyMatrix(rows, "sexo", SEXO_KEYS, ini, fin) : [];
const sexoTotales = sexoSeries.map((s) => ({
  ...s,
  total: sexoRows.reduce((a, r) => a + r[s.key], 0)
}));
const sexoTotal = sexoTotales.reduce((a, s) => a + s.total, 0);
const sexoMayor = [...sexoTotales].sort((a, b) => b.total - a.total)[0];

// Filas que la fuente no reparte por sexo. Al grano estatal no hay ninguna
// hoy; la cuenta se queda porque el registro cambia y una diferencia
// silenciosa entre la pila y el total sería peor que una nota.
const sexoResidual = rows.reduce((a, r) => a + r.conteo, 0) - sexoTotal;
```

```js
display(!sexMesVisible
  ? html`<div style="min-height:460px"></div>`
  : chartFrame({
      title: sexoMayor && sexoTotal > 0
        ? `${sexoMayor.label} son el ${fmt1(sexoMayor.total / sexoTotal * 100)}% del registro de ${entidadLabel} en ${periodoLabel}`
        : `Registros de ${entidadLabel} por mes y sexo, ${periodoLabel}`,
      subtitle: `Conteo mensual de registros por fecha de hechos, apilado por sexo y con las tres categorías sumadas, ${entidadLabel}, ${periodoLabel}. ${AVISO_RETROACTIVO}`,
      consultado,
      controls: sexoKey,
      plot: stackedMonthlyChart({rows: sexoRows, series: sexoSeries, width}),
      data: sexoRows,
      columns: ["periodo", ...SEXO_KEYS],
      numericColumns: SEXO_KEYS,
      download: `umbral_rnpdno_sexo_mensual_${cve}_${ini}_${fin}_c${consultado}.csv`,
      note: sexoResidual > 0
        ? `${fmt(sexoResidual)} registros de esta selección no traen desglose de sexo y quedan fuera de la pila.`
        : "El sexo es el que asienta el registro; la fuente no publica identidad de género."
    }));
```

</section>

<section class="u-section" id="seccion-municipios">

<div>${label("municipios")}</div>

```js
// El archivo municipal solo se pide cuando el lector se acerca a esta
// sección. Es el tramo caro de la página: 744 KB comprimidos y ~420 ms de
// conversión a objetos, para una gráfica que está muy por debajo del
// pliegue. Ver components/lazy.js.
const munVisible = whenVisible("#seccion-municipios");
```

```js
// El grano municipal son 139 mil filas; se filtran por entidad antes de
// materializar los objetos, así que la página nunca construye el resto.
// La entidad 33 no tiene desglose municipal: su único «municipio» en la
// fuente es «Se desconoce». No hay razón para traerle el archivo.
const munRaw = munVisible && cve !== "33" ? await municipiosDe(cve) : null;
const munFiltered = munRaw
  ? munRaw.filter((r) => r.periodo >= ini && r.periodo <= fin)
  : [];

const munMap = new Map();
for (const r of munFiltered) {
  const k = r.cve_municipio;
  let acc = munMap.get(k);
  if (!acc) {
    acc = {cve_municipio: k, municipio: r.municipio, conteo: 0};
    for (const c of CATEGORIA_KEYS) acc[c] = 0;
    munMap.set(k, acc);
  }
  acc.conteo += r.conteo;
  if (r.categoria in acc) acc[r.categoria] += r.conteo;
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
  : !munVisible
  // Reserva la altura de la gráfica para que la página no salte al
  // llegar el dato.
  ? html`<div style="min-height:420px">
      <p class="u-note">Los municipios se cargan al llegar a esta sección: son 744 KB que no hacen falta para leer el resto de la página.</p>
    </div>`
  : mun.length === 0
  ? html`<p class="u-note">La selección no deja registros municipales en ${entidadLabel}.</p>`
  : chartFrame({
      title: `${mun[0].municipio_label} concentra el ${fmt1(mun[0].porcentaje)}% de los registros de ${entidadLabel} en ${periodoLabel}`,
      subtitle: `Total de registros por fecha de hechos, en los ${top15.length} municipios con más registros de los ${mun.length} con actividad, ${entidadLabel}, ${periodoLabel}. La tabla y el CSV incluyen todos.`,
      consultado,
      // Aquí el color no reparte categorías: separa la barra destacada del
      // resto. La clave lo dice con esas palabras.
      controls: serieLegend([
        {key: "destacado", label: mun[0].municipio_label, color: RANKING_COLORS.destacado},
        {key: "resto", label: "Los demás municipios", color: RANKING_COLORS.resto}
      ], {label: "Papeles del color en el ranking municipal", interactive: false}),
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

<div>${label("composición por municipio")}</div>

```js
// Apilado al 100%: la pregunta aquí no es cuál municipio tiene más
// registros —eso lo acaba de contestar el ranking de arriba— sino cómo se
// reparte cada uno entre las tres categorías. Con las barras a la misma
// longitud, la comparación es directa; el conteo que la normalización
// esconde va escrito al final de cada barra.
const munSeries = CATEGORIA_KEYS.map((k) => ({
  key: k,
  label: CATEGORIA_LABELS[k],
  color: CATEGORIA_COLORS[k]
}));
const top13 = mun.slice(0, 13);

const top13Extremo = [...top13]
  .filter((d) => d.conteo > 0)
  .sort(
    (a, b) =>
      b.DESAPARECIDA_O_NO_LOCALIZADA / b.conteo -
      a.DESAPARECIDA_O_NO_LOCALIZADA / a.conteo
  )[0];
```

```js
display(cve === "33" || !munVisible
  ? html`<p class="u-note">Esta figura usa el mismo archivo municipal que la sección anterior.</p>`
  : top13.length === 0
  ? html`<p class="u-note">La selección no deja registros municipales en ${entidadLabel}.</p>`
  : chartFrame({
      title: top13Extremo
        ? `En ${top13Extremo.municipio_label} el ${fmt1(top13Extremo.DESAPARECIDA_O_NO_LOCALIZADA / top13Extremo.conteo * 100)}% de los registros sigue como desaparecida o no localizada, la proporción más alta de los ${top13.length} municipios con más registros`
        : `Composición por categoría de los ${top13.length} municipios con más registros de ${entidadLabel}`,
      subtitle: `Reparto porcentual entre las tres categorías, en los ${top13.length} municipios con más registros, ${entidadLabel}, ${periodoLabel}. Cada barra suma 100%.`,
      consultado,
      controls: serieLegend(munSeries, {
        label: "Categorías del reparto municipal",
        interactive: false
      }),
      plot: stackedRankChart({
        rows: top13,
        series: munSeries,
        labelKey: "municipio_label",
        normalize: true,
        valueLabel: (d) => `n = ${fmt(d.conteo)}`,
        width,
        rowHeight: 28
      }),
      data: top13.map((d) => {
        const row = {cve_municipio: d.cve_municipio, municipio: d.municipio};
        for (const c of CATEGORIA_KEYS) row[c] = d[c];
        row.total = d.conteo;
        return row;
      }),
      columns: ["cve_municipio", "municipio", ...CATEGORIA_KEYS, "total"],
      numericColumns: [...CATEGORIA_KEYS, "total"],
      download: `umbral_rnpdno_municipios_composicion_${cve}_${ini}_${fin}_c${consultado}.csv`,
      note: "Un reparto al 100% oculta el tamaño: «n =» al final de cada barra es el conteo del municipio en el periodo. Un municipio con pocos registros mueve mucho su porcentaje con un solo caso."
    }));
```

</section>

<section class="u-section">

<div>${label("registros sin fecha de hechos")}</div>

```js
// Un hecho del estado completo: no depende del filtro de periodo. El
// hueco es del registro, no de la selección.
const fechadosEstado = estadoRows.reduce((a, r) => a + r.conteo, 0);
const registroTotal = fechadosEstado + sinFechaEstadoTotal;
const pctSinFecha = sinFechaEstadoTotal / Math.max(registroTotal, 1) * 100;
```

```js
display(html`<div>
  <h3 class="u-chart-title">El ${fmt1(pctSinFecha)}% del registro de ${entidadLabel} no tiene fecha de hechos</h3>
  <p class="u-chart-subtitle">${fmt(sinFechaEstadoTotal)} de ${fmt(registroTotal)} registros carecen de fecha de hechos. No aparecen en ninguna serie mensual ni en el desglose municipal o por sexo: la fuente solo expone este bloque por categoría. Todo el registro del estado, sin filtros.</p>
  ${figureRow(CATEGORIA_KEYS.map((c) => ({
    label: CATEGORIA_LABELS[c],
    value: sinFechaEstado.filter((r) => r.categoria === c).reduce((a, r) => a + r.conteo, 0)
  })))}
  <div class="u-chart-foot">
    <p class="u-source">${sourceLine(consultado)}</p>
    <p class="u-source u-site">umbral.org.mx</p>
  </div>
  <div class="u-chart-proc">
    ${csvButton({
      rows: sinFechaEstado,
      columns: ["cve_entidad", "entidad", "categoria", "conteo"],
      filename: `umbral_rnpdno_sin_fecha_${cve}_c${consultado}.csv`
    })}
    <p class="u-source">Corte ${snapshotTag(consultado)} · datos CC BY 4.0 · código MIT</p>
  </div>
</div>`);
```

</section>
