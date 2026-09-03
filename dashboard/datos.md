---
title: Datos y método
toc: false
---

```js
import "./components/fonts.js";
import {brand, nav, label} from "./components/chrome.js";
import {consultado, entidades, meta, periodos, sinFecha} from "./components/registro.js";
import {dataTable} from "./components/frame.js";
import {fmt, titleEs} from "./components/format.js";
```

<div>${brand()}</div>

# Todo lo que hay que saber antes de citar estos números

<p class="u-standfirst">Los datos provienen del RNPDNO consultado el ${consultado} (snapshot <code>${meta.snapshot}</code>). El pipeline, los datos y la documentación completa están en el repositorio.</p>

<div>${nav("datos")}</div>

<section class="u-section">

<div>${label("el registro, en tres cifras")}</div>

```js
display(html`<div class="u-figures">
  <div class="u-figure-cell">
    <span class="u-figure-label">Registros con fecha de hechos</span>
    <span class="u-figure-value">${fmt(meta.total_con_fecha)}</span>
    <span class="u-figure-note">Repartidos en ${periodos.length} meses, de ${periodos[0]} a ${periodos[periodos.length - 1]}.</span>
  </div>
  <div class="u-figure-cell">
    <span class="u-figure-label">Registros sin fecha de hechos</span>
    <span class="u-figure-value">${fmt(meta.total_sin_fecha)}</span>
    <span class="u-figure-note">Fuera de toda serie mensual. La fuente solo los expone por categoría.</span>
  </div>
  <div class="u-figure-cell">
    <span class="u-figure-label">Entidades</span>
    <span class="u-figure-value">${entidades.length}</span>
    <span class="u-figure-note">Las 32 entidades federativas más «entidad no especificada».</span>
  </div>
</div>`);
```

</section>

<section class="u-section">

<div>${label("antes de citar estos números")}</div>

<ol class="u-caveats">
<li><strong>El filtro de fecha es sobre la <em>fecha de hechos</em></strong>, no la fecha de registro. Un mes reciente se sigue llenando durante meses o años. Por eso las series marcan la cola como provisional.</li>
<li><strong>Un mes puede ser una fracción pequeña del registro de un estado.</strong> Hay dos mecanismos. El primero son los registros sin fecha de hechos. El segundo son los hechos ocurridos en otros periodos. Nunca sume unos cuantos meses y lo llame total estatal.</li>
<li><strong>El registro es vivo.</strong> Los conteos del mismo periodo cambian entre consultas por altas, fechado tardío y reclasificación. Cada fila lleva su <code>consultado_en</code>. Dos consultas distintas no son comparables entre sí.</li>
<li><strong>La entidad 33 es «entidad no especificada»</strong>, no una clave INEGI. Agrupa registros cuya entidad se desconoce. Ubicación desconocida no es cero.</li>
<li><strong>Los conteos se reconcilian.</strong> Cada corte de entidad × mes suma exactamente el total que muestra el propio tablero del RNPDNO. Las tres categorías particionan ese total.</li>
</ol>

</section>

<section class="u-section">

<div>${label("descargas")}</div>

<p>Los archivos anuales combinados llevan las 33 entidades × 12 meses, más el bloque sin fecha de cada estado exactamente una vez. Ese bloque se distingue por <code>periodo = SIN_FECHA</code>. Son los mismos artefactos que produce el pipeline, byte por byte.</p>

```js
const REPO = "https://github.com/umbralmx/desaparecidosmx";
const RAW = `${REPO}/raw/main/data/processed/all-states`;
const years = Array.from({length: 17}, (_, i) => 2010 + i);
```

```js
display(html`<div class="u-controls">
  ${years.map((y) => html`<a class="u-btn" href=${`${RAW}/${y}.csv`}>${y}</a>`)}
</div>`);
```

```js
display(html`<div class="u-controls">
  <a class="u-btn" href=${`${REPO}/raw/main/data/reference/poblacion_entidades.csv`}>Población por entidad 2010–2026 (CONAPO)</a>
  <a class="u-btn" href=${`${REPO}/blob/main/docs/data_dictionary.md`}>Diccionario de datos</a>
  <a class="u-btn" href=${`${REPO}/blob/main/docs/methodology.md`}>Metodología</a>
  <a class="u-btn" href=${`${REPO}/blob/main/docs/DECISIONS.md`}>Decisiones</a>
</div>`);
```

<p class="u-source">Denominador de las tasas: ${meta.poblacion_fuente}</p>

</section>

<section class="u-section">

<div>${label("diccionario de datos")}</div>

<p>Una fila por <strong>entidad × mes × categoría × sexo × municipio</strong>. La ausencia de fila significa cero.</p>

<div class="u-table-wrap">
<table class="u-table">
<thead><tr><th scope="col">columna</th><th scope="col">ejemplo</th><th scope="col">nota</th></tr></thead>
<tbody>
<tr><td><code>cve_entidad</code></td><td><code>01</code></td><td>clave INEGI; <code>33</code> = entidad no especificada</td></tr>
<tr><td><code>entidad</code></td><td><code>AGUASCALIENTES</code></td><td>nombre según el tablero</td></tr>
<tr><td><code>periodo</code></td><td><code>2024-01</code></td><td>mes de la fecha de hechos, o <code>SIN_FECHA</code></td></tr>
<tr><td><code>categoria</code></td><td><code>DESAPARECIDA_O_NO_LOCALIZADA</code></td><td>también <code>LOCALIZADA_CON_VIDA</code> y <code>LOCALIZADA_SIN_VIDA</code></td></tr>
<tr><td><code>sexo</code></td><td><code>MUJER</code></td><td>vacío en filas residuales y en <code>SIN_FECHA</code></td></tr>
<tr><td><code>cve_municipio</code></td><td><code>01005</code></td><td>clave INEGI de 5 dígitos</td></tr>
<tr><td><code>municipio</code></td><td><code>JESÚS MARÍA</code></td><td>o <code>MUNICIPIO NO DESGLOSADO</code> (residual)</td></tr>
<tr><td><code>conteo</code></td><td class="u-num">12</td><td>registros en esa combinación</td></tr>
<tr><td><code>consultado_en</code></td><td><code>2026-08-09</code></td><td>fecha UTC de consulta al API</td></tr>
</tbody>
</table>
</div>

<p class="u-note">La fuente no permite separar «desaparecida» de «no localizada» al grano municipio × sexo. Tampoco permite desglosar el bloque sin fecha por sexo o municipio.</p>

</section>

<section class="u-section">

<div>${label("método, en corto")}</div>

<p>El RNPDNO solo publica agregados por combinación de filtros. No hay export masivo ni microdatos. El pipeline reproduce las llamadas internas del tablero <em>Versión Estadística</em>. Guarda cada respuesta cruda antes de procesarla. Itera con pausas de cortesía. Valida que cada corte reconcilie con los totales del propio tablero, y falla si no.</p>

<p>El detalle está en la metodología: endpoints, el bloque sin fecha como diferencia de totales, e invariantes. Las decisiones y sus porqués están en el registro de decisiones.</p>

</section>

<section class="u-section">

<div>${label("registros sin fecha, por entidad")}</div>

```js
const sinFechaPorEntidad = entidades.map((e) => {
  const filas = sinFecha.filter((r) => r.cve_entidad === e.cve_entidad);
  const row = {entidad: titleEs(e.entidad)};
  for (const c of ["DESAPARECIDA_O_NO_LOCALIZADA", "LOCALIZADA_CON_VIDA", "LOCALIZADA_SIN_VIDA"]) {
    row[c] = filas.filter((r) => r.categoria === c).reduce((a, r) => a + r.conteo, 0);
  }
  row.total = row.DESAPARECIDA_O_NO_LOCALIZADA + row.LOCALIZADA_CON_VIDA + row.LOCALIZADA_SIN_VIDA;
  return row;
}).sort((a, b) => b.total - a.total);
```

```js
display(dataTable(sinFechaPorEntidad, {
  columns: ["entidad", "DESAPARECIDA_O_NO_LOCALIZADA", "LOCALIZADA_CON_VIDA", "LOCALIZADA_SIN_VIDA", "total"],
  numericColumns: ["DESAPARECIDA_O_NO_LOCALIZADA", "LOCALIZADA_CON_VIDA", "LOCALIZADA_SIN_VIDA", "total"],
  open: true
}));
```

</section>

<section class="u-section">

<div>${label("cómo citar")}</div>

```js
display(html`<pre class="u-cite">Umbral (2026). Registros del RNPDNO por entidad, mes, categoría, sexo y municipio (snapshot ${meta.snapshot}, consultado ${consultado}). Datos fuente: RNPDNO, Comisión Nacional de Búsqueda / SEGOB. https://github.com/umbralmx/desaparecidosmx · Datos CC BY 4.0, código MIT.</pre>`);
```

<p class="u-note">Los datos procesados se publican bajo CC BY 4.0 y el código bajo MIT. La fuente original es pública. Al citar, nombre siempre al RNPDNO y la fecha de consulta.</p>

</section>
