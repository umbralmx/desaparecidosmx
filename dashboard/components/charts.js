/**
 * Constructores de gráficas.
 *
 * Todas siguen guide/08-anatomia-grafica.md: rejilla horizontal, línea
 * base más oscura, sin marco, ejes en mono abreviados.
 *
 * Sobre UMB-CHT-005 — etiqueta directa en vez de caja de leyenda: aquí no
 * hay ninguna. Un apilado no tiene «final de serie» donde colgar la
 * etiqueta, porque todas las bandas terminan en la misma columna, y toda
 * gráfica de este tablero que reparte color lleva la clave de
 * components/legend.js. En la tendencia esa clave es además el control que
 * enciende y apaga cada serie.
 *
 * El área acumulada sí admitía etiqueta al final de cada banda y la tuvo.
 * Se quitó al poner clave en todas: repetía los mismos tres nombres a
 * treinta píxeles de distancia y se comía 150px de margen derecho en una
 * gráfica que vive a media columna.
 *
 * Ninguna gráfica marca un «tramo provisional». El RNPDNO rellena hacia
 * atrás durante años y reclasifica registros de cualquier antigüedad, así
 * que la cifra de 2011 es tan provisional como la del mes pasado. Una
 * banda sobre los últimos seis meses decía lo contrario: que el resto
 * estaba cerrado. La advertencia va donde vale para toda la serie, en el
 * subtítulo y en la nota (UMB-CHT-002).
 *
 * La línea de fuente no se dibuja aquí. La pone components/frame.js, que
 * ninguna vista puede saltarse.
 */
// umbral-lint: ignore-file[chart-source-present]
import * as Plot from "@observablehq/plot";
import {theme} from "@umbralmx/umbral-plot";
import {
  MODE,
  T,
  addMonths,
  fmt,
  fmt1,
  toDate
} from "./format.js";

const BASE = theme(MODE);

const mono = {
  fontFamily: "IBM Plex Mono, ui-monospace, monospace",
  fontSize: 12
};

const sans = "IBM Plex Sans, system-ui, sans-serif";

/* ── Piezas compartidas ─────────────────────────────────────────────── */

/**
 * Apila los conteos de cada mes en el orden dado.
 *
 * El apilado se calcula aquí y no con la transformación `stack` de Plot:
 * el orden de las bandas tiene que ser el de `series` en todas las
 * gráficas de la página, y `stack` lo deriva del dato. Con los tramos ya
 * resueltos, la gráfica, el CSV y la tabla salen del mismo cálculo.
 *
 * @param {object[]} rows    una fila por mes: {periodo, [key]: conteo}
 * @param {object[]} series  [{key, label, color}] en orden de apilado
 */
function stackRows(rows, series) {
  const segments = [];
  const totals = [];
  for (const r of rows) {
    const fecha = toDate(r.periodo);
    const fechaFin = toDate(addMonths(r.periodo, 1));
    let acc = 0;
    for (const s of series) {
      const conteo = r[s.key] ?? 0;
      if (conteo > 0) {
        segments.push({
          periodo: r.periodo,
          fecha,
          fechaFin,
          serie: s.label,
          color: s.color,
          conteo,
          y1: acc,
          y2: acc + conteo
        });
      }
      acc += conteo;
    }
    totals.push({periodo: r.periodo, fecha, total: acc});
  }
  return {segments, totals};
}

/** El texto del globo: el mes, cada serie con su cifra, y el total. */
function monthTooltip(rows, series) {
  const porPeriodo = new Map(rows.map((r) => [r.periodo, r]));
  return (d) => {
    const r = porPeriodo.get(d.periodo) ?? {};
    const total = series.reduce((a, s) => a + (r[s.key] ?? 0), 0);
    const lineas = series.map((s) => `${s.label}: ${fmt(r[s.key] ?? 0)}`);
    return [d.periodo, ...lineas, `Total: ${fmt(total)}`].join("\n");
  };
}

/* ── 1. Histograma mensual apilado ──────────────────────────────────── */

/**
 * Barras mensuales apiladas, en conteos absolutos.
 *
 * Absolutas y no al 100%: la pregunta de la vista es cuánto crece el
 * registro, y una vista normalizada la borra. La composición relativa la
 * responden el área acumulada y los apilados al 100% de más abajo.
 *
 * @param {object} o
 * @param {object[]} o.rows    una fila por mes: {periodo, [key]: conteo}
 * @param {object[]} o.series  [{key, label, color}] en orden de apilado
 */
export function stackedMonthlyChart({rows, series, width, height = 380}) {
  const {segments, totals} = stackRows(rows, series);
  const yMax = Math.max(1, ...totals.map((d) => d.total)) * 1.06;

  // Con doscientos meses en mil píxeles cada barra mide cinco: un canalón
  // de medio píxel deja la serie en pura rejilla.
  const inset = rows.length > 80 ? 0 : 0.5;

  return Plot.plot({
    ...BASE,
    width,
    height,
    marginTop: 20,
    marginRight: 16,
    marks: [
      Plot.rect(segments, {
        x1: "fecha",
        x2: "fechaFin",
        y1: "y1",
        y2: "y2",
        fill: "color",
        insetLeft: inset,
        insetRight: inset
      }),
      Plot.ruleY([0], {stroke: T.baseline, strokeWidth: 1}),
      Plot.tip(
        totals,
        Plot.pointerX({
          x: "fecha",
          y: "total",
          title: monthTooltip(rows, series),
          ...mono
        })
      )
    ],
    // El eje x NO hereda de BASE: el tema trae tickFormat "d", que en una
    // escala temporal se interpreta como formato de cadena y dibuja una
    // «d» en cada marca.
    x: {grid: false, type: "utc", label: null, ticks: 6},
    y: {...BASE.y, label: null, tickFormat: "~s", domain: [0, yMax]}
  });
}

/* ── 2. Área acumulada ──────────────────────────────────────────────── */

/**
 * El acumulado del periodo, apilado por serie.
 *
 * Apilada y no superpuesta: los acumulados de las tres categorías son
 * aditivos —particionan el registro—, así que el borde superior de la
 * pila es el registro entero y cada banda es lo que aporta cada categoría.
 *
 * @param {object[]} o.rows  una fila por mes con el acumulado por serie
 */
export function cumulativeAreaChart({rows, series, width, height = 380}) {
  const {segments, totals} = stackRows(rows, series);
  const yMax = Math.max(1, ...totals.map((d) => d.total)) * 1.06;

  const marks = [];

  for (const s of series) {
    const pts = segments.filter((d) => d.serie === s.label);
    if (!pts.length) continue;
    marks.push(
      Plot.areaY(pts, {x: "fecha", y1: "y1", y2: "y2", fill: s.color, curve: "linear"})
    );
  }

  marks.push(
    Plot.ruleY([0], {stroke: T.baseline, strokeWidth: 1}),
    Plot.tip(
      totals,
      Plot.pointerX({
        x: "fecha",
        y: "total",
        title: monthTooltip(rows, series),
        ...mono
      })
    )
  );

  return Plot.plot({
    ...BASE,
    width,
    height,
    marginTop: 20,
    marginRight: 16,
    marks,
    x: {grid: false, type: "utc", label: null, ticks: 5},
    y: {...BASE.y, label: null, tickFormat: "~s", domain: [0, yMax]}
  });
}

/* ── 3. Treemap ─────────────────────────────────────────────────────── */

/** Luminancia relativa de un hex, según WCAG 2.1. */
function luminancia(hex) {
  const h = hex.replace("#", "");
  const canal = (i) => {
    const v = parseInt(h.slice(i * 2, i * 2 + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}

/** Razón de contraste entre dos colores. */
function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/**
 * El color legible para el texto que va DENTRO de un relleno.
 *
 * Elige entre los dos extremos de la escala —`base` e `ink`— el que más
 * contraste da, y devuelve null cuando ninguno llega a 4.5:1. Un relleno
 * de luminosidad intermedia no sostiene texto pequeño con ningún token, y
 * escribirlo igual sería publicar una etiqueta que no se lee.
 *
 * Se mide aquí, en cada dibujo, y no se anota en una tabla: así un cambio
 * de token no deja una etiqueta ilegible sin que nadie se entere.
 */
function textoSobre(fondo) {
  const mejor = [T.base, T.ink]
    .map((c) => ({color: c, r: contraste(c, fondo)}))
    .sort((a, b) => b.r - a.r)[0];
  return mejor.r >= 4.5 ? mejor.color : null;
}

/**
 * Reparte el rectángulo entre los valores, partiendo siempre el lado largo.
 *
 * Es el reparto binario de d3-hierarchy, escrito a mano: traer
 * d3-hierarchy entero al navegador para colocar tres o cuatro rectángulos
 * no se paga. Parte la lista en dos mitades de suma parecida y le da a
 * cada una la fracción del lado largo que le toca, así que ningún azulejo
 * sale como una tira.
 */
function squarify(items, izq, arr, der, aba) {
  if (!items.length) return [];
  if (items.length === 1) return [{...items[0], izq, arr, der, aba}];

  const total = items.reduce((a, d) => a + d.valor, 0);
  if (total <= 0) return [];

  // El corte que deja las dos mitades más parejas.
  let acc = 0;
  let corte = 1;
  let mejor = Infinity;
  for (let i = 1; i < items.length; i++) {
    acc += items[i - 1].valor;
    const desvio = Math.abs(acc - total / 2);
    if (desvio < mejor) {
      mejor = desvio;
      corte = i;
    }
  }

  const a = items.slice(0, corte);
  const b = items.slice(corte);
  const frac = a.reduce((s, d) => s + d.valor, 0) / total;

  if (der - izq >= aba - arr) {
    const medio = izq + (der - izq) * frac;
    return [...squarify(a, izq, arr, medio, aba), ...squarify(b, medio, arr, der, aba)];
  }
  const medio = arr + (aba - arr) * frac;
  return [...squarify(a, izq, arr, der, medio), ...squarify(b, izq, medio, der, aba)];
}

/**
 * Treemap de pocas categorías, con la cifra dentro de cada azulejo.
 *
 * El área es la única codificación de magnitud; el color solo nombra al
 * grupo, y el nombre va escrito dentro del azulejo, así que el color no
 * codifica nada por su cuenta (UMB-A11Y-005). Los azulejos que no dan para
 * texto se leen en el globo y en la tabla de abajo.
 *
 * @param {object[]} o.data  [{key, label, color, conteo}]
 */
export function treemapChart({data, width, height = 260}) {
  const items = data
    .filter((d) => d.conteo > 0)
    .map((d) => ({...d, valor: d.conteo}))
    .sort((a, b) => b.valor - a.valor);
  const total = items.reduce((a, d) => a + d.valor, 0);

  const tiles = squarify(items, 0, 0, 1, 1).map((t) => ({
    ...t,
    porcentaje: total ? (t.valor / total) * 100 : 0,
    // Píxeles reales del azulejo, para decidir si le cabe el texto.
    ancho: (t.der - t.izq) * width,
    alto: (t.aba - t.arr) * height
  }));

  // Qué azulejo lleva etiqueta dentro se decide contra el ancho del texto
  // que le tocaría, no contra un umbral fijo. Con un umbral fijo, «Mujeres»
  // —el segundo grupo de todas las categorías— se quedaba sin etiqueta en
  // una tira de 68px donde cabe de sobra.
  //
  // 7.4px por carácter es la anchura media de IBM Plex Sans a 13px. Es una
  // estimación: medir de verdad exige el nodo ya montado, y equivocarse por
  // poco solo mueve un azulejo de un lado al otro de la frontera.
  const ANCHO_CARACTER = 7.4;
  const ALTO_LINEA = 13 * 1.35;
  const lineas = (t) => [t.label, fmt(t.conteo), `${fmt1(t.porcentaje)}%`];
  const conTexto = tiles
    .map((t) => ({...t, texto: textoSobre(t.color)}))
    .filter((t) => {
      // Sin un token que llegue a 4.5:1 sobre este relleno, no hay
      // etiqueta que valga: se lee en la clave, el globo y la tabla.
      if (!t.texto) return false;
      const ancho = Math.max(...lineas(t).map((l) => l.length)) * ANCHO_CARACTER;
      return t.ancho > ancho + 10 && t.alto > ALTO_LINEA * 3 + 10;
    });
  // Los que no dan para etiqueta se leen por color en la clave de la
  // figura, por el globo, y en la tabla adyacente que frame.js siempre
  // pone (UMB-A11Y-003).

  return Plot.plot({
    ...BASE,
    width,
    height,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    // Sin ejes: en un treemap la posición no significa nada, solo el área.
    x: {axis: null, domain: [0, 1]},
    // Dominio invertido para que el grupo mayor quede arriba a la izquierda.
    y: {axis: null, domain: [1, 0], grid: false},
    marks: [
      Plot.rect(tiles, {
        x1: "izq",
        x2: "der",
        y1: "arr",
        y2: "aba",
        fill: "color",
        // El canalón se hace con el fondo de la página, no con un borde de
        // color: un marco alrededor de cada azulejo es mobiliario que la
        // guía no quiere (UMB-CHT-004).
        stroke: T.base,
        strokeWidth: 2,
        title: (d) =>
          `${d.label}\n${fmt(d.conteo)} registros · ${fmt1(d.porcentaje)}%`
      }),
      Plot.text(conTexto, {
        x: (d) => (d.izq + d.der) / 2,
        y: (d) => (d.arr + d.aba) / 2,
        text: (d) => lineas(d).join("\n"),
        fill: (d) => d.texto,
        lineHeight: 1.35,
        fontFamily: sans,
        fontSize: 13
      })
    ]
  });
}

/* ── 4. Ranking apilado ─────────────────────────────────────────────── */

/**
 * Barras horizontales apiladas, una por fila del ranking.
 *
 * Sirve a las dos formas que pide la página: conteos absolutos y reparto
 * al 100%. En la forma normalizada la barra mide siempre lo mismo, así que
 * el total de la fila —el dato que la normalización esconde— se escribe al
 * final de la barra.
 *
 * Sin rejilla vertical: cada barra lleva su cifra en mono
 * (guide/08-anatomia-grafica.md § barras).
 *
 * @param {object[]} o.rows     ordenadas ya; {[labelKey], [key]: conteo}
 * @param {object[]} o.series   [{key, label, color}] en orden de apilado
 * @param {boolean} [o.normalize]  reparto al 100% en vez de absolutos
 */
export function stackedRankChart({
  rows,
  series,
  labelKey,
  valueLabel,
  normalize = false,
  width,
  height,
  rowHeight = 24
}) {
  const segments = [];
  for (const r of rows) {
    const total = series.reduce((a, s) => a + (r[s.key] ?? 0), 0);
    const escala = normalize ? (total > 0 ? 100 / total : 0) : 1;
    let acc = 0;
    for (const s of series) {
      const conteo = r[s.key] ?? 0;
      if (conteo > 0) {
        segments.push({
          etiqueta: r[labelKey],
          serie: s.label,
          color: s.color,
          conteo,
          total,
          x1: acc,
          x2: acc + conteo * escala
        });
      }
      acc += conteo * escala;
    }
  }

  const maxTotal = Math.max(
    1,
    ...rows.map((r) => series.reduce((a, s) => a + (r[s.key] ?? 0), 0))
  );
  const xMax = normalize ? 100 : maxTotal * 1.02;
  const h = height ?? Math.max(280, rowHeight * rows.length + 60);

  // El margen derecho lo fija la etiqueta más larga que de verdad se va a
  // escribir, no un número redondo. Con un margen fijo de 104px, «168,796 ·
  // +12,345 s/f» —21 caracteres en mono de 12px, unos 152px— se cortaba
  // contra el borde del SVG.
  const ANCHO_CARACTER = 7.25;
  const anchoEtiqueta = Math.max(
    0,
    ...rows.map((r) => String(valueLabel(r) ?? "").length * ANCHO_CARACTER)
  );

  return Plot.plot({
    ...BASE,
    width,
    height: h,
    marginLeft: 168,
    marginRight: Math.ceil(anchoEtiqueta) + 14,
    marginTop: 8,
    marginBottom: 8,
    x: {axis: null, domain: [0, xMax]},
    y: {label: null, domain: rows.map((r) => r[labelKey])},
    marks: [
      Plot.barX(segments, {
        x1: "x1",
        x2: "x2",
        y: "etiqueta",
        fill: "color",
        insetTop: 2,
        insetBottom: 2,
        title: (d) =>
          `${d.etiqueta}\n${d.serie}: ${fmt(d.conteo)}` +
          (d.total > 0 ? ` · ${fmt1((d.conteo / d.total) * 100)}%` : "")
      }),
      Plot.text(rows, {
        x: () => xMax,
        y: labelKey,
        text: valueLabel,
        textAnchor: "start",
        dx: 6,
        fill: T.muted,
        ...mono
      }),
      Plot.ruleX([0], {stroke: T.baseline, strokeWidth: 1})
    ],
    style: {...BASE.style, fontFamily: sans}
  });
}

/* ── 5. Ranking simple ──────────────────────────────────────────────── */

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
      fontFamily: sans
    }
  });
}

