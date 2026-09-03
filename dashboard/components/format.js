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

/**
 * Meses cuyos conteos siguen llenándose al momento de la consulta.
 *
 * Seis es un piso, no una promesa: el registro rellena hacia atrás
 * durante años (docs/methodology.md). La ventana se puede calibrar
 * cuando haya suficientes vintages (DECISIONS.md #12.1).
 */
export const PROVISIONAL_MONTHS = 6;

export const provisionalFrom = (consultadoEn) =>
  addMonths(consultadoEn.slice(0, 7), -PROVISIONAL_MONTHS);

/* ── CSV ────────────────────────────────────────────────────────────
   Ninguna gráfica se publica sin su CSV descargable (UMB-A11Y-004). Se
   arma en el navegador a partir de las mismas filas que dibuja la
   gráfica, así que no puede desincronizarse de lo que se ve. */

export function toCSV(rows, columns) {
  const cols = columns ?? Object.keys(rows[0] ?? {});
  const cell = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
}

export function csvHref(rows, columns) {
  return URL.createObjectURL(
    new Blob([toCSV(rows, columns)], {type: "text/csv;charset=utf-8"})
  );
}
