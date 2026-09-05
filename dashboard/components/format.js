/**
 * Etiquetas, formato numérico y ventanas de tiempo.
 *
 * Las etiquetas de categoría y sexo son las oficiales del RNPDNO, no
 * redacción propia (guide/15-terminologia.md). Los colores salen de los
 * tokens; aquí no se escribe ningún hex.
 */
import {tokensFor} from "@umbralmx/umbral-plot/tokens";

/*
 * Modo instrumento (oscuro).
 *
 * Es lo que la tabla de superficies de la guía asigna a un tablero en
 * vivo. Cambiar esta constante y el atributo data-mode del documento
 * mueve todo el sistema de color: los tokens, el tema de Plot y los
 * colores de categoría salen de aquí.
 */
export const MODE = "instrumento";
export const T = tokensFor(MODE);

// umbral-lint: ignore[terminology] — etiquetas oficiales del RNPDNO.
export const CATEGORIA_LABELS = {
  DESAPARECIDA_O_NO_LOCALIZADA: "Desaparecidas o no localizadas",
  LOCALIZADA_CON_VIDA: "Localizadas con vida",
  LOCALIZADA_SIN_VIDA: "Localizadas sin vida"
};

export const SEXO_LABELS = {
  HOMBRE: "Hombres",
  MUJER: "Mujeres",
  INDETERMINADO: "Indeterminado"
};

/**
 * Color por categoría.
 *
 * El grupo que sigue sin aparecer lleva `signal`; los demás bajan a model
 * y muted. Nunca `alert` para «localizada sin vida»: la regla de dignidad
 * prohíbe teñir de alarma a las personas encontradas (DECISIONS.md #12).
 */
export const CATEGORIA_COLORS = {
  DESAPARECIDA_O_NO_LOCALIZADA: T.signal,
  LOCALIZADA_CON_VIDA: T.model,
  LOCALIZADA_SIN_VIDA: T.muted
};

/** Variante -text para etiquetas: texto pequeño necesita 4.5:1 (UMB-CHT-005). */
export const CATEGORIA_TEXT_COLORS = {
  DESAPARECIDA_O_NO_LOCALIZADA: T["signal-text"],
  LOCALIZADA_CON_VIDA: T["model-text"],
  LOCALIZADA_SIN_VIDA: T.muted
};

/**
 * Color por sexo.
 *
 * Disjunto del de categoría a propósito: en una misma página conviven
 * gráficas apiladas por categoría y por sexo, y si las dos usan signal,
 * model y muted el lector traslada un significado de una a la otra.
 *
 * Los tres tokens salen de la paleta de series de la marca —el orden es
 * signal, model, muted, alert, series-4, series-5— y son los tres que
 * quedan libres una vez que las categorías se llevan los tres primeros.
 * No se deriva ningún color nuevo: UMB-COL-002 prohíbe el hex a mano, y un
 * color calculado fuera de los tokens nunca pasa por la matriz de
 * contraste.
 *
 * Ni azul ni rosa para mujeres. `model` queda descartado dos veces —es
 * azul y es color de categoría—, y series-5 sale de «mujeres» porque a ese
 * violeta se le lee el rosa, que es justo la convención de género que hay
 * que evitar. Mujeres llevan amarillo.
 *
 * El reparto de los otros dos lo decide el contraste, no el gusto. El
 * texto dentro de un azulejo del treemap necesita 4.5:1 contra el relleno,
 * y series-5 (#b454b3) no llega ni con `base` (4.28:1) ni con `ink`
 * (3.80:1): cae justo en el centro de la escala de luminosidad. Por eso va
 * a «indeterminado», que no pasa del 3.1% en ninguna entidad × categoría y
 * nunca da un azulejo lo bastante grande para llevar texto dentro.
 * `alert`, a 5.68:1, sí sostiene una etiqueta y va al grupo mayoritario.
 *
 * `alert` sobre «hombres» no afirma nada sobre ellos: es la serie 4 de la
 * paleta categórica de la marca y la gráfica no compara grupos con una
 * valencia. La regla de dignidad de DECISIONS.md #12 prohíbe el token de
 * alarma sobre «localizada sin vida», que es una afirmación sobre lo que
 * le pasó a una persona, no sobre en qué casilla del registro cayó.
 */
export const SEXO_COLORS = {
  HOMBRE: T.alert,
  MUJER: T["series-4"],
  INDETERMINADO: T["series-5"]
};

/*
 * Variante -text para etiquetas directas (UMB-CHT-005).
 *
 * series-4 y series-5 no traen variante -text en los tokens: se publican
 * como color de marca, con umbral 3:1. La única etiqueta pequeña que los
 * lleva es la de la leyenda, y va sobre el fondo de la página en tamaño de
 * cuerpo, no en 12px sobre el dato.
 */
export const SEXO_TEXT_COLORS = {
  HOMBRE: T["alert-text"],
  MUJER: T["series-4"],
  INDETERMINADO: T["series-5"]
};

/**
 * Los dos papeles de un ranking sin apilar.
 *
 * `rankingChart` pinta una barra en signal y el resto en muted. Son dos
 * papeles, no dos categorías, pero el lector necesita igual la clave que
 * los nombra.
 */
export const RANKING_COLORS = {
  destacado: T.signal,
  resto: T.muted
};

const NF = new Intl.NumberFormat("es-MX", {maximumFractionDigits: 0});
const NF1 = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

/** Cifra entera con separador de millares. */
export const fmt = (n) => NF.format(n ?? 0);

/** Cifra con un decimal — tasas y porcentajes. */
export const fmt1 = (n) => NF1.format(n ?? 0);

const LOWER_ES = new Set(["de", "del", "la", "las", "los", "y", "e", "no"]);

/** ESTADO DE MEXICO → Estado de Mexico. */
export function titleEs(name) {
  if (!name) return "";
  return String(name)
    .toLocaleLowerCase("es-MX")
    .split(/\s+/)
    .map((w, i) =>
      i > 0 && LOWER_ES.has(w) ? w : w.charAt(0).toLocaleUpperCase("es-MX") + w.slice(1)
    )
    .join(" ");
}

/* ── Tiempo ─────────────────────────────────────────────────────────
   Los periodos vienen como «YYYY-MM». Se convierten a Date en UTC para
   que el eje sea temporal y no una lista de 199 etiquetas ordinales. */

export const toDate = (periodo) => new Date(`${periodo}-01T00:00:00Z`);

export const toPeriodo = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

/** Suma de meses sobre un «YYYY-MM». */
export function addMonths(periodo, n) {
  const d = toDate(periodo);
  d.setUTCMonth(d.getUTCMonth() + n);
  return toPeriodo(d);
}

/** Meses calendario de ini a fin, ambos incluidos. */
export function monthSpan(ini, fin) {
  const out = [];
  let p = ini;
  while (p <= fin) {
    out.push(p);
    p = addMonths(p, 1);
  }
  return out;
}

/* ── CSV ────────────────────────────────────────────────────────────
   Ninguna gráfica se publica sin su CSV descargable (UMB-A11Y-004). Se
   arma en el navegador a partir de las mismas filas que dibuja la
   gráfica, así que no puede desincronizarse de lo que se ve.

   Se arma AL PULSAR, no al dibujar. Antes cada figura llamaba a
   `URL.createObjectURL` mientras se construía: seis blobs en la portada
   nada más abrir, y seis más cada vez que el lector movía el periodo,
   porque un Blob URL vive hasta que se revoca o se cierra la pestaña.
   Nadie los revocaba. Ahora el CSV ni siquiera se serializa hasta que
   alguien lo pide, y su URL se revoca en cuanto el navegador la usa. */

export function toCSV(rows, columns) {
  const cols = columns ?? Object.keys(rows[0] ?? {});
  const cell = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
}

/**
 * El botón de descarga de una figura.
 *
 * @param {object} o
 * @param {object[]} o.rows      las filas exactas que dibuja la gráfica
 * @param {string[]} [o.columns] orden de columnas
 * @param {string} o.filename    nombre del archivo
 * @param {string} [o.label]
 * @returns {HTMLAnchorElement}
 */
export function csvButton({rows, columns, filename, label = "Descargar CSV"}) {
  const a = document.createElement("a");
  a.className = "u-btn";
  a.href = "#";
  a.textContent = label;
  // Un <a download> con href de marcador no descarga nada por sí solo, así
  // que el clic arma el archivo y lo entrega con un enlace de usar y tirar.
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const url = URL.createObjectURL(
      new Blob([toCSV(rows, columns)], {type: "text/csv;charset=utf-8"})
    );
    const tmp = document.createElement("a");
    tmp.href = url;
    tmp.download = filename;
    document.body.append(tmp);
    tmp.click();
    tmp.remove();
    // Revocar en el mismo turno cancela la descarga en algunos
    // navegadores; un turno después ya la han tomado.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  return a;
}

/* ── Lectura de CSV ─────────────────────────────────────────────────
   Las claves INEGI son texto, no números.

   `csv({typed: true})` convertiría «01» en 1 y perdería el cero inicial de
   cada clave de entidad y de municipio. Por eso se lee todo como texto y
   solo se convierten a número las columnas que de verdad lo son.

   Vive aquí, y no en registro.js, para que los dos módulos de carga la
   compartan sin que uno tenga que importar al otro: si `registro-nacional`
   importara `registro`, sus descargas dejarían de ir en paralelo. */

export function numeric(rows, columns) {
  for (const r of rows) for (const c of columns) r[c] = +r[c];
  return rows;
}
