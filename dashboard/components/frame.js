/**
 * El encuadre obligatorio de toda gráfica.
 *
 * Título-hallazgo, subtítulo, gráfica, línea de fuente, CSV y tabla
 * adyacente. La validación la hace `Frame` de @umbralmx/umbral-plot: sin
 * fuente lanza MissingSourceError (UMB-CHT-003), sin título lanza
 * (UMB-CHT-001) y sin subtítulo lanza (UMB-CHT-002). Ninguna vista puede
 * saltárselo.
 *
 * El DOM se dibuja aquí, con las clases de umbral.css, en vez de usar
 * `Frame.render`: ese método trae los estilos en línea y esta hoja ya
 * define el mobiliario.
 */
// umbral-lint: ignore-file[chart-source-present] — este archivo ES el que
// dibuja la línea de fuente. El literal «Fuente:» vive en Frame.sourceLine()
// del paquete de marca, así que la heurística de un archivo a la vez no lo ve.
import {Frame} from "@umbralmx/umbral-plot";
import {csvHref, fmt} from "./format.js";

const SOURCE = "RNPDNO (CNB/SEGOB)";

/** La línea de fuente del proyecto, armada por el paquete de marca. */
export function sourceLine(consultadoEn, extra = "") {
  const frame = new Frame({
    title: "marcador",
    subtitle: "marcador",
    source: SOURCE,
    accessed: consultadoEn,
    snapshot: `rnpdno-${consultadoEn.slice(0, 7)}`
  });
  const line = frame.sourceLine();
  return extra ? line.replace(" · umbral.mx", ` · ${extra} · umbral.mx`) : line;
}

/**
 * Envuelve una gráfica en su encuadre.
 *
 * @param {object} o
 * @param {string} o.title      el hallazgo, como oración
 * @param {string} o.subtitle   geografía · periodo · unidad
 * @param {string} o.consultado fecha de consulta al registro (YYYY-MM-DD)
 * @param {Element} o.plot      el nodo que devolvió Plot.plot()
 * @param {object[]} o.data     las filas exactas que dibuja la gráfica
 * @param {string} o.download   nombre del archivo CSV
 * @param {string[]} [o.columns]     orden de columnas del CSV y la tabla
 * @param {string[]} [o.numericColumns] columnas que van en mono a la derecha
 * @param {string} [o.extraSource]   añadido a la línea de fuente
 * @param {string} [o.note]          nota al pie de la gráfica
 * @returns {Element} un <figure>
 */
export function chartFrame({
  title,
  subtitle,
  consultado,
  plot,
  data,
  download,
  columns,
  numericColumns = [],
  extraSource = "",
  note = ""
}) {
  // Construir el Frame valida título, subtítulo y fuente antes de dibujar.
  const frame = new Frame({
    title,
    subtitle,
    source: SOURCE,
    accessed: consultado,
    snapshot: `rnpdno-${consultado.slice(0, 7)}`
  });
  if (!download) throw new Error("una gráfica no se publica sin su CSV (UMB-A11Y-004)");

  const fig = document.createElement("figure");
  fig.className = "u-chart";
  fig.setAttribute("role", "figure");
  // El aria-label lleva el hallazgo, no el tipo de gráfica (UMB-A11Y-002).
  fig.setAttribute("aria-label", frame.ariaLabel());

  const h = document.createElement("h3");
  h.className = "u-chart-title";
  h.textContent = title;
  fig.append(h);

  const sub = document.createElement("p");
  sub.className = "u-chart-subtitle";
  sub.textContent = subtitle;
  fig.append(sub);

  const holder = document.createElement("div");
  holder.className = "u-chart-plot";
  holder.append(plot);
  fig.append(holder);

  const foot = document.createElement("figcaption");
  foot.className = "u-chart-foot";

  const src = document.createElement("p");
  src.className = "u-source";
  src.textContent = sourceLine(consultado, extraSource);
  foot.append(src);

  const a = document.createElement("a");
  a.className = "u-btn";
  a.href = csvHref(data, columns);
  a.download = download;
  a.textContent = "Descargar CSV";
  foot.append(a);
  fig.append(foot);

  if (note) {
    const p = document.createElement("p");
    p.className = "u-note";
    p.textContent = note;
    fig.append(p);
  }

  // Tabla adyacente: los números tienen que ser alcanzables sin la
  // gráfica (UMB-A11Y-003). Repite las cifras exactas, con la misma
  // precisión: redondear distinto es publicar dos cifras para un hecho.
  fig.append(dataTable(data, {columns, numericColumns}));
  return fig;
}

/** Tabla de datos plegada, con la anatomía de guide/04-layout.md. */
export function dataTable(data, {columns, numericColumns = [], open = false} = {}) {
  const cols = columns ?? Object.keys(data[0] ?? {});
  const numeric = new Set(numericColumns);

  const details = document.createElement("details");
  details.className = "u-details";
  details.open = open;
  const summary = document.createElement("summary");
  summary.textContent = `Ver los datos de esta gráfica (${fmt(data.length)} filas)`;
  details.append(summary);

  const wrap = document.createElement("div");
  wrap.className = "u-table-wrap";
  const table = document.createElement("table");
  table.className = "u-table";

  const thead = document.createElement("thead");
  const htr = document.createElement("tr");
  for (const c of cols) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = c;
    // components.css alinea y pone en mono por atributo, no por clase.
    if (numeric.has(c)) th.setAttribute("data-numeric", "");
    htr.append(th);
  }
  thead.append(htr);
  table.append(thead);

  const tbody = document.createElement("tbody");
  for (const row of data) {
    const tr = document.createElement("tr");
    for (const c of cols) {
      const td = document.createElement("td");
      const v = row[c];
      if (v === null || v === undefined || v === "") {
        // «Sin registro» no es cero ni vacío: lleva su propio relleno y su
        // propia palabra (UMB-COL-010).
        td.textContent = "sin dato";
        td.className = "u-cell";
        td.setAttribute("data-estado", "sin-registro");
      } else {
        td.textContent = typeof v === "number" ? fmt(v) : String(v);
      }
      if (numeric.has(c)) td.setAttribute("data-numeric", "");
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(tbody);
  wrap.append(table);
  details.append(wrap);
  return details;
}

/**
 * Una fila de cifras.
 *
 * Cada celda es el componente `.u-kpi` de components.css: mono, numerales
 * tabulares, etiqueta en caption. La retícula que las separa con reglas de
 * 1px —y no con tarjetas— la pone `.u-kpis` en umbral.css (UMB-LAY-007).
 */
export function figureRow(items) {
  const div = document.createElement("div");
  div.className = "u-kpis";
  for (const it of items) {
    const cell = document.createElement("div");
    cell.className = "u-kpi";
    const label = document.createElement("span");
    label.className = "u-kpi__label";
    label.textContent = it.label;
    const value = document.createElement("span");
    value.className = "u-kpi__value";
    value.textContent = typeof it.value === "number" ? fmt(it.value) : it.value;
    // La etiqueta va antes que la cifra en el orden de lectura.
    cell.append(label, value);
    if (it.note) {
      const note = document.createElement("span");
      note.className = "u-kpi__note";
      note.textContent = it.note;
      cell.append(note);
    }
    div.append(cell);
  }
  return div;
}
