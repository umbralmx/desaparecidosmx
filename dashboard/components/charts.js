/**
 * Constructores de gráficas.
 *
 * Todas siguen guide/08-anatomia-grafica.md: rejilla horizontal, una sola
 * serie en `signal`, etiquetas directas al final de la línea en vez de
 * caja de leyenda, y trazo punteado con regla etiquetada para la cola
 * provisional.
 *
 * La línea de fuente no se dibuja aquí. La pone components/frame.js, que
 * ninguna vista puede saltarse.
 */
// umbral-lint: ignore-file[chart-source-present]
import * as Plot from "@observablehq/plot";
import {theme, dashedFuture} from "@umbralmx/umbral-plot";
import {
  CATEGORIA_TEXT_COLORS,
  MODE,
  T,
  fmt,
  toDate
} from "./format.js";

const BASE = theme(MODE);

const mono = {
  fontFamily: "IBM Plex Mono, ui-monospace, monospace",
  fontSize: 12
};

/**
 * Serie mensual con cola provisional.
 *
 * @param {object} o
 * @param {Array} o.series  [{label, color, textColor, values: [{periodo, conteo}]}]
 * @param {string} o.cut    primer mes provisional (YYYY-MM)
 * @param {number} [o.height]
 */
export function trendChart({series, cut, height = 380, width}) {
  const cutDate = toDate(cut);
  const multi = series.length > 1;

  const flat = series.flatMap((s) =>
    s.values.map((v) => ({
      ...v,
      fecha: toDate(v.periodo),
      serie: s.label,
      color: s.color
    }))
  );

  const marks = [
    Plot.ruleY([0], {stroke: T.baseline, strokeWidth: 1})
  ];

  for (const s of series) {
    const pts = s.values.map((v) => ({...v, fecha: toDate(v.periodo), serie: s.label}));
    const firm = pts.filter((d) => d.periodo <= cut);
    const prov = pts.filter((d) => d.periodo >= cut);

    if (firm.length > 1) {
      marks.push(
        Plot.lineY(firm, {x: "fecha", y: "conteo", stroke: s.color, strokeWidth: 2})
      );
    }
    // El tramo reciente se sigue llenando durante meses. Sin puntear, la
    // caída final se lee como una mejora y no como un dato incompleto.
    if (prov.length > 1) {
      marks.push(
        Plot.lineY(prov, dashedFuture({mode: MODE, color: s.color, x: "fecha", y: "conteo"}))
      );
    }

    // Etiqueta directa al final del último punto firme: la cola
    // provisional cae hacia cero y amontonaría todas las etiquetas.
    if (multi) {
      const anchor = firm.length ? firm[firm.length - 1] : pts[pts.length - 1];
      if (anchor) {
        marks.push(
          Plot.text([anchor], {
            x: "fecha",
            y: "conteo",
            text: () => s.label,
            fill: s.textColor ?? s.color,
            textAnchor: "start",
            dx: 8,
            fontSize: 12,
            fontFamily: "IBM Plex Sans, system-ui, sans-serif"
          })
        );
      }
    }
  }

  const first = series[0]?.values ?? [];
  const inRange =
    first.length && first[0].periodo <= cut && first[first.length - 1].periodo >= cut;

  if (inRange) {
    marks.push(
      Plot.ruleX([cutDate], {stroke: T.caption, strokeDasharray: "4 3", strokeWidth: 1}),
      Plot.text([cutDate], {
        x: (d) => d,
        frameAnchor: "top",
        text: () => "provisional →",
        fill: T.caption,
        textAnchor: "start",
        dx: 5,
        dy: 2,
        ...mono
      })
    );
  }

  marks.push(
    Plot.tip(
      flat,
      Plot.pointerX({
        x: "fecha",
        y: "conteo",
        title: (d) =>
          `${d.periodo}\n${multi ? `${d.serie}\n` : ""}${fmt(d.conteo)} registros`,
        fontFamily: "IBM Plex Mono, ui-monospace, monospace",
        fontSize: 12
      })
    )
  );

  return Plot.plot({
    ...BASE,
    width,
    height,
    // El margen derecho hospeda las etiquetas directas de serie y, cuando
    // el corte cae cerca del borde, la palabra «provisional».
    marginRight: multi ? 150 : 104,
    marginTop: 20,
    // El eje x NO hereda de BASE: el tema trae tickFormat "d", que en una
    // escala temporal se interpreta como formato de cadena y dibuja una
    // «d» en cada marca.
    x: {grid: false, type: "utc", label: null, ticks: 6},
    y: {...BASE.y, label: null, tickFormat: "~s"},
    marks
  });
}

/**
 * Barras horizontales ordenadas, una sola en `signal`.
 *
 * Sin rejilla: cada barra lleva su valor en mono, así que la rejilla no
 * tiene nada que hacer (guide/08-anatomia-grafica.md § barras).
 */
export function rankingChart({
  data,
  valueKey,
  labelKey,
  idKey,
  highlight,
  valueLabel,
  tooltip,
  width,
  height
}) {
  const sorted = [...data].sort((a, b) => b[valueKey] - a[valueKey]);
  const h = height ?? Math.max(360, 24 * sorted.length + 60);

  return Plot.plot({
    ...BASE,
    width,
    height: h,
    marginLeft: 168,
    marginRight: 96,
    marginTop: 8,
    marginBottom: 8,
    x: {axis: null, domain: [0, Math.max(1, sorted[0]?.[valueKey] ?? 1) * 1.12]},
    y: {label: null, domain: sorted.map((d) => d[labelKey])},
    marks: [
      Plot.barX(sorted, {
        x: valueKey,
        y: labelKey,
        // Una barra en signal, el resto en muted: el punto de atención de
        // la vista se gasta una sola vez (UMB-COL-004).
        fill: (d) => (d[idKey] === highlight ? T.signal : T.muted),
        title: tooltip,
        insetTop: 2,
        insetBottom: 2
      }),
      Plot.text(sorted, {
        x: valueKey,
        y: labelKey,
        text: valueLabel,
        textAnchor: "start",
        dx: 6,
        fill: T.muted,
        ...mono
      }),
      Plot.ruleX([0], {stroke: T.baseline, strokeWidth: 1})
    ],
    style: {
      ...BASE.style,
      fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    }
  });
}

/**
 * Barras agrupadas en dos niveles: categoría › sexo.
 *
 * El color sigue a la categoría, así que el sexo lo llevan la posición y
 * la etiqueta, nunca el color solo (UMB-A11Y-005).
 */
export function catSexoChart({data, width, height = 380}) {
  return Plot.plot({
    ...BASE,
    width,
    height,
    marginBottom: 48,
    marginTop: 16,
    x: {label: null, tickSize: 0},
    y: {...BASE.y, label: null, tickFormat: "~s"},
    fx: {label: null},
    marks: [
      Plot.barY(data, {
        fx: "categoria_label",
        x: "sexo_label",
        y: "conteo",
        fill: (d) => d.color,
        insetLeft: 2,
        insetRight: 2,
        title: (d) => `${d.categoria_label} · ${d.sexo_label}\n${fmt(d.conteo)} registros`
      }),
      Plot.text(data, {
        fx: "categoria_label",
        x: "sexo_label",
        y: "conteo",
        text: (d) => fmt(d.conteo),
        textAnchor: "middle",
        dy: -7,
        fill: T.muted,
        ...mono
      }),
      Plot.ruleY([0], {stroke: T.baseline, strokeWidth: 1})
    ],
    style: {...BASE.style, fontFamily: "IBM Plex Sans, system-ui, sans-serif"}
  });
}

export {CATEGORIA_TEXT_COLORS};
