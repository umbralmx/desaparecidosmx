---
title: Datos y método
toc: false
---

```js
// Ver index.md: el armazón va aparte para que no espere al dato.
import "./components/fonts.js";
import {actualizado, brand, nav, label} from "./components/chrome.js";
```

```js
import {dataTable} from "./components/frame.js";
import {fmt, titleEs} from "./components/format.js";
```

```js
import {consultado, entidades, meta, periodoCorte, sinFecha} from "./components/registro.js";
```

<div>${brand()}</div>

<p class="u-updated">${actualizado(consultado, periodoCorte)}</p>

# Todo lo que hay que saber antes de citar estos números

<div class="u-dots" aria-hidden="true"></div>

<p class="u-standfirst">Los datos provienen del RNPDNO consultado el ${consultado} (snapshot <code>${meta.snapshot}</code>). El pipeline, los datos y la documentación completa están en el repositorio.</p>

<div>${nav("datos")}</div>

<section class="u-section">

<div>${label("el registro, en dos cifras")}</div>

<p>Las cifras de abajo son las del <strong>dato publicado</strong>, que llega hasta ${meta.periodo_max_publicado}. El tablero grafica menos: solo años calendario completos, hasta ${meta.periodo_corte}. La razón está en la lista de advertencias.</p>

```js
// La cuenta de entidades salió de aquí: un «33» junto a dos totales del
// registro se leía como una tercera cifra del registro, cuando en realidad
// es la cobertura de la extracción —las 32 entidades federativas más el
// cajón de «entidad no especificada»—. Eso ya lo dice la bajada de la
// portada, y en prosa no se puede confundir con un conteo de personas.
display(html`<div class="u-kpis">
  <div class="u-kpi">
    <span class="u-kpi__label">Registros con fecha de hechos</span>
    <span class="u-kpi__value">${fmt(meta.total_con_fecha_publicado)}</span>
    <span class="u-kpi__note">De ${meta.periodos_publicados[0]} a ${meta.periodo_max_publicado}. El tablero dibuja ${fmt(meta.total_con_fecha)} de ellos, los de años completos.</span>
  </div>
  <div class="u-kpi">
    <span class="u-kpi__label">Registros sin fecha de hechos</span>
    <span class="u-kpi__value">${fmt(meta.total_sin_fecha)}</span>
    <span class="u-kpi__note">Fuera de toda serie mensual. La fuente solo los expone por categoría.</span>
  </div>
</div>`);
```

</section>

<section class="u-section">

<div>${label("antes de citar estos números")}</div>

<ol class="u-caveats">
<li><strong>El filtro de fecha es sobre la <em>fecha de hechos</em></strong>, no la fecha de registro. Un mes reciente se sigue llenando durante meses o años, así que una caída al final de cualquier serie es rezago de captura y no una mejora.</li>
<li><strong>El tablero se detiene en ${meta.anio_corte}; los archivos no.</strong> Un año en curso siempre se ve bajo: a ${meta.anio_corte + 1} le faltaban cinco meses cuando se consultó, encima del rezago de captura. Esa caída no dice nada sobre la desaparición en el país y se leía como si lo dijera. Las gráficas cubren años calendario completos; los CSV llevan todo lo que devolvió la fuente, hasta ${meta.periodo_max_publicado}. La ventana se recorre sola: es el último año que ya había terminado el día de la consulta.</li>
<li><strong>Toda la serie es provisional, no solo su cola.</strong> El registro fecha hechos con años de retraso y reclasifica registros de cualquier antigüedad, de modo que la cifra de 2011 cambia entre dos consultas igual que la del mes pasado. Por eso ninguna gráfica marca un tramo como provisional: hacerlo diría que el resto está cerrado, y no lo está.</li>
<li><strong>Un mes puede ser una fracción pequeña del registro de un estado.</strong> Hay dos mecanismos. El primero son los registros sin fecha de hechos. El segundo son los hechos ocurridos en otros periodos. Nunca sume unos cuantos meses y lo llame total estatal.</li>
<li><strong>El registro es vivo.</strong> Los conteos del mismo periodo cambian entre consultas por altas, fechado tardío y reclasificación. Cada fila lleva su <code>consultado_en</code>. Dos consultas distintas no son comparables entre sí.</li>
<li><strong>La entidad 33 es «entidad no especificada»</strong>, no una clave INEGI. Agrupa registros cuya entidad se desconoce. Ubicación desconocida no es cero.</li>
<li><strong>Los conteos se reconcilian con el tablero, que es lo más lejos que se puede llegar.</strong> Cada corte de entidad × mes suma exactamente el total que muestra el propio tablero del RNPDNO, y las tres categorías particionan ese total. Eso verifica la extracción, no el registro: si la fuente cuenta mal, esta herramienta reproduce fielmente esa cuenta.</li>
<li><strong>La base pública no es el registro completo.</strong> Data Cívica documentó, sobre una filtración de febrero de 2026, que el <strong>38.5%</strong> de los registros del RNPDNO está confidencializado y fuera de la consulta pública, y que esa proporción no se reparte parejo: va del 71% en Nayarit y el 66.2% en Jalisco al 11.1% en Chihuahua y el 12.1% en Guerrero. Todo lo que hay en esta herramienta sale de la parte pública, así que <strong>comparar entidades compara también sus políticas de confidencialización</strong>. Los dos rankings de la portada se leen con esa advertencia puesta.</li>
<li><strong>Las categorías se mueven, y algunas no están en la Ley.</strong> El mismo informe señala que términos usados en el debate público —«ubicados», «sin reportante», «localizados sin formalizar»— no existen en la Ley General, y que ha habido reclasificaciones sin prueba física de localización ni consentimiento de las familias. La columna <code>categoria</code> de estos archivos hereda esa definición: es la que el registro aplicaba el día de la consulta.</li>
<li><strong>Los filtros de la fuente tienen fugas, y no somos los únicos que las vemos.</strong> La documentación del API del RNPDNO de <em>violetaenroth</em> reporta que las consultas filtradas devuelven registros de periodos que no corresponden al filtro, que las sumas mensuales no cuadran con los totales anuales, y que las discrepancias empeoran después de 2019. Ese trabajo va contra los endpoints de registro individual; este pipeline lee los agregados de <em>Versión Estadística</em>, pero encuentra la misma familia de problemas, que es la razón de que cada corte se valide contra el total del tablero antes de escribirse.</li>
</ol>

<p class="u-note">Las cuatro advertencias anteriores son sobre el registro, no sobre esta herramienta. Se enumeran aquí porque condicionan cualquier lectura de estas cifras, y porque quien las citó primero merece el crédito: ver <a href="https://datacivica.org/a-quienes-nos-faltan-2026/los-otros-datos/">Data Cívica</a> y <a href="https://violetaenroth.github.io/api-rnpdno/">violetaenroth</a> más abajo.</p>

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
</div>`);
```

<p class="u-source">Corte <code>${meta.snapshot}</code> · consulta realizada el ${consultado} · datos CC BY 4.0 · código MIT</p>

<p class="u-source">Denominador de las tasas: ${meta.poblacion_fuente}</p>

</section>

<section class="u-section">

<div>${label("cortes sucesivos del mismo periodo")}</div>

<p>Cada corte es un re-scrapeo de la misma ventana móvil de 24 meses, hecho en una fecha distinta. Son la evidencia de que el registro se reescribe: al restar dos cortes se ve cuánto cambió el conteo de un mes que ya había pasado en los dos. Es el material para calibrar el rezago de captura, que es lo que hoy no se puede afirmar con un solo corte.</p>

```js
const VINTAGES = `${REPO}/raw/main/data/vintages`;
const porAnio = new Map();
for (const v of meta.vintages) {
  if (!porAnio.has(v.anio)) porAnio.set(v.anio, []);
  porAnio.get(v.anio).push(v);
}
```

```js
display(html`<div>
  ${[...porAnio].map(([anio, lista]) => html`<div>
    <h3 class="u-panel-title">${anio}</h3>
    <p class="u-panel-note">${lista.length} ${lista.length === 1 ? "corte" : "cortes"}</p>
    <div class="u-controls">
      ${lista.map((v) => html`<a class="u-btn" href=${`${VINTAGES}/${v.label}.csv`}>${v.label}</a>`)}
    </div>
  </div>`)}
</div>`);
```

```js
display(dataTable(meta.vintages.map((v) => ({
  corte: v.label,
  desde: v.desde,
  hasta: v.hasta,
  meses: v.meses,
  filas: v.filas,
  kb: v.kb
})), {
  columns: ["corte", "desde", "hasta", "meses", "filas", "kb"],
  numericColumns: ["meses", "filas", "kb"],
  open: true
}));
```

<p class="u-note">Mismo esquema que los archivos anuales. Cada corte trae además un <code>.meta.json</code> con la lista de meses, los estados barridos y los fallos de esa corrida. Los cortes no se suman entre sí ni con <code>data/processed/</code>: cada uno es una lectura completa del mismo periodo en un día distinto.</p>

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
<tr><td><code>conteo</code></td><td data-numeric>12</td><td>registros en esa combinación</td></tr>
<tr><td><code>consultado_en</code></td><td><code>2026-08-09</code></td><td>fecha UTC de consulta al API</td></tr>
</tbody>
</table>
</div>

<p class="u-note">La fuente no permite separar «desaparecida» de «no localizada» al grano municipio × sexo. Tampoco permite desglosar el bloque sin fecha por sexo o municipio.</p>

</section>

<section class="u-section">

<div>${label("método, en corto")}</div>

<p>El RNPDNO solo publica agregados por combinación de filtros. No hay export masivo ni microdatos. El pipeline reproduce las llamadas internas del tablero <em>Versión Estadística</em>. Guarda cada respuesta cruda antes de procesarla. Itera con pausas de cortesía. Valida que cada corte reconcilie con los totales del propio tablero, y falla si no.</p>

<p>El detalle está en la metodología: endpoints, el bloque sin fecha como diferencia de totales, e invariantes.</p>

</section>

<section class="u-section">

<div>${label("lo que han documentado otros")}</div>

<p>Esta herramienta no audita el RNPDNO: lo extrae y lo ordena. Dos trabajos previos sí lo auditan, y sin ellos las cifras de esta página se leerían con menos cuidado del que hace falta.</p>

<ul class="u-rows">
<li class="u-row">
  <div>
    <p><strong><a href="https://datacivica.org/a-quienes-nos-faltan-2026/los-otros-datos/">Los otros datos: retos y deficiencias de los registros de desaparición en México</a></strong> — Data Cívica, <em>A quiénes nos faltan</em> (2026).</p>
    <p class="u-note">Sobre una base filtrada de febrero de 2026: el 38.5% de los registros está confidencializado y fuera de la consulta pública, con una dispersión estatal de 11.1% a 71%; el dato de contacto de la persona reportante está en blanco en el 70% de los casos; las variables de búsqueda diferenciada se omiten en el 96.1% de los expedientes; y menos del 2% de los registros no alcanza un umbral mínimo de identificación, contra el 36% que declaró el SESNSP. También documenta categorías en uso público que no existen en la Ley General.</p>
  </div>
</li>
<li class="u-row">
  <div>
    <p><strong><a href="https://violetaenroth.github.io/api-rnpdno/">Documentación del API del RNPDNO</a></strong> — violetaenroth.</p>
    <p class="u-note">Ingeniería inversa de los endpoints del registro. Documenta que las consultas filtradas devuelven registros fuera del rango pedido, que las sumas mensuales exceden los totales anuales, que un mismo registro aparece repetido entre periodos, y que la vista de lista dejó de responder a principios de 2026. Es la corroboración independiente de las inconsistencias que este pipeline encuentra al reconciliar cortes, y la razón de que las series de esta herramienta lleven fecha de consulta en cada fila.</p>
  </div>
</li>
</ul>

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
