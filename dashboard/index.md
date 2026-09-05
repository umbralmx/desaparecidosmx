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
import {serieLegend} from "./components/legend.js";
import {whenVisible} from "./components/lazy.js";
import {
  cumulativeAreaChart, stackedMonthlyChart, stackedRankChart, treemapChart
} from "./components/charts.js";
import {chartFrame} from "./components/frame.js";
import {
  CATEGORIA_COLORS, CATEGORIA_LABELS, CATEGORIA_TEXT_COLORS,
  SEXO_COLORS, SEXO_LABELS, SEXO_TEXT_COLORS,
  fmt, fmt1, titleEs
} from "./components/format.js";
```

```js
// El único bloque que espera a la red. Los dos módulos van juntos a
// propósito: Framework funde las importaciones de un bloque en un solo
// Promise.all, así que los 5 KB de metadatos y los 107 KB del grano
// nacional se piden a la vez y no uno detrás de otro.
import {
  CATEGORIA_KEYS, SEXO_KEYS, byEntidad, consultado, cumulativeMatrix,
  entidades, meta, monthlyMatrix, periodos, sinFecha
} from "./components/registro.js";
import {nacional, poblacion} from "./components/registro-nacional.js";
```

<div>${brand()}</div>

# El RNPDNO registra a las personas desaparecidas, no localizadas y localizadas en México

<p class="u-standfirst">Sin embargo, su acceso es restrictivo y opaco debido a las características de su diseño, la tecnología usada para su operación y los propios retos que enfrentan las autoridades para la recolección y sistematización de dichos datos. Con el objetivo de facilitar su acceso a investigadores, periodistas y de la sociedad civil, Umbral libera esta herramienta. Aquí, podrán acceder a una versión más amplia de la estadística descriptiva y descargar los datos agregados para su consulta. Los datos disponibles en esta herramienta constan de los registros por <strong>fecha de hechos</strong>, 2010–2026, para las 32 entidades más «entidad no especificada».</p>

<p class="u-standfirst">Una nota metodológica importante, es que los datos extraidos del RNPDNO tienden a contar con discrepancias que dificultan la comparación de periodios y a menudo están condicionados a cuándo se hizo la consulta y bajo que filtros, por lo que se actualiza constantemente de manera retroactiva. Para más información, consulta la sección de <strong>datos y método.</strong></p>

<div>${nav("index")}</div>

<section class="u-section">

```js
// El periodo es el único filtro global de la página. Categoría y sexo se
// eligen dentro de la gráfica que los usa —la leyenda de la tendencia, el
// selector del apilado por sexo—, donde el control está junto al efecto
// que produce y no a media pantalla de distancia.
const periodoInput = periodoRange(periodos);
const periodo = Generators.input(periodoInput);
```

<div>${label("filtros · por fecha de hechos")}</div>
<div class="u-controls">
  <div class="u-field">${periodoInput}</div>
</div>

```js
// El control entrega el par ya ordenado.
const [ini, fin] = periodo;
const periodoLabel = ini === fin ? ini : `${ini} a ${fin}`;

// La advertencia que el lector necesita antes de mirar cualquier serie, y
// que por eso va en el subtítulo (UMB-CHT-002). No hay «tramo
// provisional»: el registro reescribe cifras de cualquier año entre dos
// consultas, así que marcar solo la cola diría que el resto está cerrado.
const AVISO_RETROACTIVO =
  "El registro se actualiza de forma retroactiva, así que toda la serie —no solo su cola— cambia entre consultas.";

// El texto que explica la caída del final, que es donde más se malinterpreta.
const NOTA_REZAGO =
  "Los meses recientes se ven bajos porque el registro fecha los hechos con años de retraso: una caída al final de la serie es rezago de captura, no una mejora.";

const rows = nacional.filter((r) => r.periodo >= ini && r.periodo <= fin);

// El bloque sin fecha no depende del periodo: son registros que la fuente
// no ubica en ningún mes. Se nombra en cada gráfica de serie y nunca se
// suma a ninguna (DECISIONS.md #12.3).
const sinFechaTotal = sinFecha.reduce((a, r) => a + r.conteo, 0);

// Ancho de las gráficas en paralelo. El umbral es el mismo que el de
// .u-chart-grid en umbral.css, así que el SVG y su columna cambian de
// forma en el mismo punto.
const dual = width >= 860;
const anchoMitad = dual ? Math.floor((width - 40) / 2) : width;
const anchoTercio = dual ? Math.floor((width - 80) / 3) : width;
```

</section>

<section class="u-section">

<div>${label("tendencia nacional")}</div>

```js
// La leyenda es también el control: cada entrada apaga su banda de la
// pila. Ver components/legend.js.
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
    ? `El registro suma ${fmt(trendTotal)} hechos entre ${trendIni} y ${trendFin}, y ${trendMayor.label.toLocaleLowerCase("es-MX")} son el ${fmt1(trendMayor.total / trendTotal * 100)}%`
    : `Registros por mes de la fecha de hechos, ${periodoLabel}`,
  subtitle: `Conteo mensual de registros por fecha de hechos, apilado por categoría, nacional, ${periodoLabel}. ${AVISO_RETROACTIVO}`,
  consultado,
  controls: catLegendInput,
  plot: stackedMonthlyChart({rows: trendRows, series: trendSeries, width}),
  data: trendRows,
  columns: ["periodo", ...trendSeries.map((s) => s.key)],
  numericColumns: trendSeries.map((s) => s.key),
  download: `umbral_rnpdno_tendencia_nacional_${ini}_${fin}_c${consultado}.csv`,
  note: `${NOTA_REZAGO} Los ${fmt(sinFechaTotal)} registros sin fecha de hechos no aparecen en esta serie. Clic en una categoría de la leyenda para ocultarla.`
}));
```

</section>

<section class="u-section">

<div>${label("acumulado y composición por sexo")}</div>

```js
// El selector de categoría solo gobierna la gráfica de la derecha. La
// izquierda muestra siempre las tres, porque su asunto es cómo se reparte
// el acumulado entre ellas.
const catSexoInput = Inputs.select(["TODAS", ...CATEGORIA_KEYS], {
  label: "Categoría (apilado por sexo)",
  value: "DESAPARECIDA_O_NO_LOCALIZADA",
  format: (k) => (k === "TODAS" ? "Todas las categorías" : CATEGORIA_LABELS[k])
});
const catSexo = Generators.input(catSexoInput);
display(html`<div class="u-controls"><div class="u-field">${catSexoInput}</div></div>`);
```

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
const sexoRowsFuente = catSexo === "TODAS"
  ? rows
  : rows.filter((r) => r.categoria === catSexo);
const sexoCatLabel = catSexo === "TODAS"
  ? "todas las categorías"
  : CATEGORIA_LABELS[catSexo].toLocaleLowerCase("es-MX");

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
const sexoRows = monthlyMatrix(sexoRowsFuente, "sexo", SEXO_KEYS, ini, fin);
const sexoTotales = sexoSeries.map((s) => ({
  ...s,
  total: sexoRows.reduce((a, r) => a + r[s.key], 0)
}));
const sexoTotal = sexoTotales.reduce((a, s) => a + s.total, 0);
const sexoMayor = [...sexoTotales].sort((a, b) => b.total - a.total)[0];

// Filas que la fuente no reparte por sexo. Al grano nacional no hay
// ninguna hoy; la cuenta se queda porque el registro cambia y una
// diferencia silenciosa entre la pila y el total sería peor que una nota.
const sexoResidual = sexoRowsFuente.reduce((a, r) => a + r.conteo, 0) - sexoTotal;
```

<div class="u-chart-grid">
<div>

```js
display(chartFrame({
  title: acumTotal > 0
    ? `Al cierre de ${acumFin.periodo ?? fin} el periodo acumula ${fmt(acumTotal)} registros, de los que ${fmt(acumDesap)} siguen como desaparecidas o no localizadas`
    : `Acumulado de registros, ${periodoLabel}`,
  subtitle: `Suma acumulada de registros por fecha de hechos dentro del periodo, apilada por categoría, nacional, ${periodoLabel}. ${AVISO_RETROACTIVO}`,
  consultado,
  controls: acumKey,
  plot: cumulativeAreaChart({
    rows: acumRows, series: acumSeries, width: anchoMitad, height: 340
  }),
  data: acumRows,
  columns: ["periodo", ...CATEGORIA_KEYS],
  numericColumns: CATEGORIA_KEYS,
  download: `umbral_rnpdno_acumulado_nacional_${ini}_${fin}_c${consultado}.csv`,
  note: `El acumulado corre solo sobre el periodo elegido, no sobre todo el registro. Los ${fmt(sinFechaTotal)} registros sin fecha de hechos no entran en ninguna serie mensual.`
}));
```

</div>
<div>

```js
display(chartFrame({
  title: sexoMayor && sexoTotal > 0
    ? `${sexoMayor.label} son el ${fmt1(sexoMayor.total / sexoTotal * 100)}% de los registros de ${sexoCatLabel}`
    : `Registros por mes y sexo, ${periodoLabel}`,
  subtitle: `Conteo mensual de registros por fecha de hechos, apilado por sexo, ${sexoCatLabel}, nacional, ${periodoLabel}. ${AVISO_RETROACTIVO}`,
  consultado,
  controls: sexoKey,
  plot: stackedMonthlyChart({
    rows: sexoRows, series: sexoSeries, width: anchoMitad, height: 340
  }),
  data: sexoRows,
  columns: ["periodo", ...SEXO_KEYS],
  numericColumns: SEXO_KEYS,
  download: `umbral_rnpdno_sexo_mensual_${catSexo}_${ini}_${fin}_c${consultado}.csv`,
  note: sexoResidual > 0
    ? `${fmt(sexoResidual)} registros de esta selección no traen desglose de sexo y quedan fuera de la pila.`
    : "El sexo es el que asienta el registro; la fuente no publica identidad de género."
}));
```

</div>
</div>

</section>

<section class="u-section" id="seccion-sexo-categoria">

<div>${label("sexo dentro de cada categoría")}</div>

```js
// Estas dos secciones están muy por debajo del pliegue. Construirlas al
// abrir la página costaba ~120 ms de hilo principal y unos 1,200 nodos
// para algo que el lector todavía no ve. `whenVisible` las deja esperar a
// que se acerque (components/lazy.js); el margen de 600px hace que en la
// práctica ya estén cuando llega.
const treeVisible = whenVisible("#seccion-sexo-categoria");
const rankVisible = whenVisible("#seccion-ranking");
// Tres paneles de UNA figura, no tres figuras: la comparación es entre
// ellos, así que comparten título, fuente, CSV y tabla. Es la misma idea
// que un facetado, con el treemap dibujado a mano por panel.
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
  : chartFrame({
      title: treeMin && treeMax && treeMin !== treeMax
        ? `La proporción de mujeres cambia según la categoría: ${fmt1(treeMax.pctMujeres)}% en ${treeMax.label.toLocaleLowerCase("es-MX")} y ${fmt1(treeMin.pctMujeres)}% en ${treeMin.label.toLocaleLowerCase("es-MX")}`
        : `Reparto por sexo dentro de cada categoría, ${periodoLabel}`,
      subtitle: `Reparto porcentual por sexo dentro de cada categoría, con el área de cada azulejo proporcional a su número de registros, nacional, ${periodoLabel}.`,
      consultado,
      controls: treeKey,
      plot: treePanelesNodo,
      data: treeData,
      columns: ["categoria", "sexo", "conteo", "porcentaje"],
      numericColumns: ["conteo", "porcentaje"],
      download: `umbral_rnpdno_sexo_por_categoria_${ini}_${fin}_c${consultado}.csv`,
      note: `Los porcentajes son dentro de cada categoría, no del registro entero. Los ${fmt(sinFechaTotal)} registros sin fecha de hechos no traen desglose de sexo y quedan fuera.`
    }));
```

</section>

<section class="u-section" id="seccion-ranking">

<div>${label("ranking estatal")}</div>

```js
const rankSeries = CATEGORIA_KEYS.map((k) => ({
  key: k,
  label: CATEGORIA_LABELS[k],
  color: CATEGORIA_COLORS[k]
}));

const rankKeyAbs = serieLegend(rankSeries, {
  label: "Categorías del ranking en conteos",
  interactive: false
});
const rankKeyTasa = serieLegend(rankSeries, {
  label: "Categorías del ranking en tasa",
  interactive: false
});

const porEntidad = rankVisible
  ? byEntidad(rows, "categoria", CATEGORIA_KEYS)
  : new Map();

const sinFechaEntidad = new Map();
for (const r of sinFecha) {
  sinFechaEntidad.set(r.cve_entidad, (sinFechaEntidad.get(r.cve_entidad) ?? 0) + r.conteo);
}

// Denominador: población media a mitad de año sobre los años del periodo.
const y0 = Number(ini.slice(0, 4));
const y1 = Math.min(Number(fin.slice(0, 4)), meta.anios_poblacion[1]);
const popPeriodo = new Map();
for (const p of poblacion) {
  if (p.anio < y0 || p.anio > y1) continue;
  const acc = popPeriodo.get(p.cve_entidad) ?? {suma: 0, n: 0};
  acc.suma += p.poblacion;
  acc.n += 1;
  popPeriodo.set(p.cve_entidad, acc);
}

const estadoBase = entidades.map((e) => {
  const cuenta = porEntidad.get(e.cve_entidad);
  const pop = popPeriodo.get(e.cve_entidad);
  const poblacionMedia = pop ? pop.suma / pop.n : null;
  const row = {
    cve_entidad: e.cve_entidad,
    entidad: e.entidad,
    entidad_label: titleEs(e.entidad),
    total: cuenta?.total ?? 0,
    sin_fecha: sinFechaEntidad.get(e.cve_entidad) ?? 0,
    poblacion_promedio: poblacionMedia ? Math.round(poblacionMedia) : null
  };
  for (const k of CATEGORIA_KEYS) row[k] = cuenta?.[k] ?? 0;
  return row;
});

const rankAbs = [...estadoBase].sort((a, b) => b.total - a.total);
const totalNacional = estadoBase.reduce((a, d) => a + d.total, 0);
const topAbs = rankAbs[0];
```

```js
// La entidad 33 no tiene población por diseño y sale de las tasas
// (DECISIONS.md #8). Cada categoría se convierte a tasa por separado para
// que la pila siga sumando la tasa total de la entidad.
const tasaKeys = CATEGORIA_KEYS.map((k) => `${k}_100k`);
const rankTasa = estadoBase
  .filter((d) => d.poblacion_promedio)
  .map((d) => {
    const row = {...d, tasa_100k: 0};
    for (const k of CATEGORIA_KEYS) {
      const t = Number(((d[k] / d.poblacion_promedio) * 1e5).toFixed(2));
      row[`${k}_100k`] = t;
      row.tasa_100k += t;
    }
    row.tasa_100k = Number(row.tasa_100k.toFixed(1));
    return row;
  })
  .sort((a, b) => b.tasa_100k - a.tasa_100k);

const tasaSeries = CATEGORIA_KEYS.map((k) => ({
  key: `${k}_100k`,
  label: CATEGORIA_LABELS[k],
  color: CATEGORIA_COLORS[k]
}));
const topTasa = rankTasa[0];
```

```js
display(!rankVisible
  ? html`<div style="min-height:900px"></div>`
  : chartFrame({
      title: topAbs && totalNacional > 0
        ? `${topAbs.entidad_label} concentra el ${fmt1(topAbs.total / totalNacional * 100)}% de los registros con hechos en ${periodoLabel}`
        : `Registros por entidad, ${periodoLabel}`,
      subtitle: `Total de registros por fecha de hechos, por entidad, apilado por categoría, ${periodoLabel}.`,
      consultado,
      controls: rankKeyAbs,
      plot: stackedRankChart({
        rows: rankAbs,
        series: rankSeries,
        labelKey: "entidad_label",
        valueLabel: (d) => `${fmt(d.total)} · +${fmt(d.sin_fecha)} s/f`,
        width
      }),
      data: rankAbs,
      columns: ["cve_entidad", "entidad", ...CATEGORIA_KEYS, "total", "sin_fecha"],
      numericColumns: [...CATEGORIA_KEYS, "total", "sin_fecha"],
      download: `umbral_rnpdno_ranking_absoluto_${ini}_${fin}_c${consultado}.csv`,
      note: `«+N s/f» son los registros de esa entidad sin fecha de hechos, que no están sumados a la barra. «Entidad no especificada» agrupa registros cuya entidad se desconoce o no fue registrada; ubicación desconocida no es cero.`
    }));
```

```js
display(!rankVisible
  ? html`<div style="min-height:900px"></div>`
  : chartFrame({
      title: topTasa
        ? `${topTasa.entidad_label} registra la tasa más alta: ${fmt1(topTasa.tasa_100k)} registros por cada 100 mil habitantes`
        : `Tasa por entidad, ${periodoLabel}`,
      subtitle: `Tasa de registros por cada 100 mil habitantes, por entidad, apilada por categoría, ${periodoLabel}. El denominador es la población media a mitad de año de ${y0}–${y1}.`,
      consultado,
      extraSource: "proyecciones de población de CONAPO (rev. 2023)",
      controls: rankKeyTasa,
      plot: stackedRankChart({
        rows: rankTasa,
        series: tasaSeries,
        labelKey: "entidad_label",
        valueLabel: (d) => fmt1(d.tasa_100k),
        width
      }),
      data: rankTasa,
      columns: ["cve_entidad", "entidad", ...tasaKeys, "tasa_100k", "poblacion_promedio"],
      numericColumns: [...tasaKeys, "tasa_100k", "poblacion_promedio"],
      download: `umbral_rnpdno_ranking_tasa_${ini}_${fin}_c${consultado}.csv`,
      note: `«Entidad no especificada» no aparece aquí: no tiene población que sirva de denominador. Los registros sin fecha de hechos tampoco entran en el numerador, así que la tasa es del periodo elegido y no del registro completo de cada entidad.`
    }));
```

</section>
