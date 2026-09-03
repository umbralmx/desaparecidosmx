/**
 * Carga y filtrado del registro.
 *
 * Los cargadores entregan CSV: 107 KB comprimidos para el grano nacional y
 * 744 KB para el municipal. Se eligió CSV sobre parquet porque
 * `FileAttachment.parquet()` arrastra 6.2 MB de parquet-wasm al navegador
 * para descomprimir medio mega de datos.
 *
 * Todo el filtrado ocurre en el navegador: el sitio es estático y no habla
 * con ningún servidor.
 *
 * Las filas con fecha y las sin fecha nunca se suman (DECISIONS.md #12.3).
 */
import {FileAttachment} from "observablehq:stdlib";
import {CATEGORIA_LABELS, SEXO_LABELS, monthSpan} from "./format.js";

/**
 * Las claves INEGI son texto, no números.
 *
 * `csv({typed: true})` convertiría «01» en 1 y perdería el cero inicial de
 * cada clave de entidad y de municipio. Por eso se lee todo como texto y
 * solo se convierten a número las columnas que de verdad lo son.
 */
function numeric(rows, columns) {
  for (const r of rows) for (const c of columns) r[c] = +r[c];
  return rows;
}

export const meta = await FileAttachment("../data/meta.json").json();

export const nacional = numeric(
  await FileAttachment("../data/nacional.csv").csv(),
  ["conteo"]
);

export const sinFecha = numeric(
  await FileAttachment("../data/sin-fecha.csv").csv(),
  ["conteo"]
);

export const poblacion = numeric(
  await FileAttachment("../data/poblacion.csv").csv(),
  ["anio", "poblacion"]
);

/**
 * Grano municipal, solo de una entidad.
 *
 * Son 139 mil filas para las 33 entidades. Solo la página de estado las
 * pide, y se filtran en cuanto se leen: la vista nunca guarda las demás.
 */
let municipiosCache = null;
export async function municipiosDe(cveEntidad) {
  municipiosCache ??= numeric(
    await FileAttachment("../data/municipios.csv").csv(),
    ["conteo"]
  );
  return municipiosCache.filter((r) => r.cve_entidad === cveEntidad);
}

export const entidades = meta.entidades;
export const periodos = meta.periodos;
export const consultado = meta.consultado_en;

/* ── Filtros ────────────────────────────────────────────────────────
   No hay interruptor de «incluir sin fecha»: los registros sin fecha se
   dibujan siempre como elementos aparte y no entran en ninguna serie
   (DECISIONS.md #12.3). */

export const CATEGORIA_KEYS = Object.keys(CATEGORIA_LABELS);
export const SEXO_KEYS = Object.keys(SEXO_LABELS);

/**
 * Aplica el filtro y devuelve {rows, sinDesglose}.
 *
 * Las filas sin desglose de sexo —los residuales de MUNICIPIO NO
 * DESGLOSADO— se conservan mientras estén seleccionados todos los sexos,
 * para que los totales cuadren con el registro. Se excluyen, y se cuentan
 * aparte, en cuanto el lector recorta por sexo: no se pueden atribuir a
 * ninguno.
 */
export function applyFilters(rows, {periodoIni, periodoFin, categorias, sexos}) {
  const cats = new Set(categorias);
  const todosLosSexos = sexos.length === SEXO_KEYS.length;
  const sexSet = new Set(sexos);

  const out = [];
  let sinDesglose = 0;
  for (const r of rows) {
    if (r.periodo < periodoIni || r.periodo > periodoFin) continue;
    if (!cats.has(r.categoria)) continue;
    if (todosLosSexos) {
      out.push(r);
      continue;
    }
    if (!r.sexo) {
      sinDesglose += r.conteo;
      continue;
    }
    if (sexSet.has(r.sexo)) out.push(r);
  }
  return {rows: out, sinDesglose};
}

/** Suma por una clave. */
export function sumBy(rows, key) {
  const m = new Map();
  for (const r of rows) m.set(r[key], (m.get(r[key]) ?? 0) + r.conteo);
  return m;
}

/**
 * Serie mensual sobre el tramo pedido; la ausencia de fila es cero.
 *
 * Los meses posteriores a la consulta no se dibujan: todavía no pueden
 * contener hechos registrados.
 */
export function monthlySeries(rows, ini, fin) {
  const tope = consultado.slice(0, 7);
  const months = monthSpan(ini, fin < tope ? fin : tope);
  const m = new Map(months.map((p) => [p, 0]));
  for (const r of rows) if (m.has(r.periodo)) m.set(r.periodo, m.get(r.periodo) + r.conteo);
  return months.map((periodo) => ({periodo, conteo: m.get(periodo)}));
}

/** Nombre de entidad por clave. */
export const entidadPorCve = new Map(entidades.map((e) => [e.cve_entidad, e.entidad]));
