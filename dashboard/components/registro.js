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

/*
 * Los cuatro archivos se piden a la vez.
 *
 * Escritos como cuatro `await` seguidos, el navegador hacía cuatro viajes
 * en serie y la página esperaba la suma de los cuatro. Ninguno depende de
 * otro, así que van en un solo Promise.all y la espera pasa a ser la del
 * más lento.
 */
const [metaRaw, nacionalRaw, sinFechaRaw, poblacionRaw] = await Promise.all([
  FileAttachment("../data/meta.json").json(),
  FileAttachment("../data/nacional.csv").csv(),
  FileAttachment("../data/sin-fecha.csv").csv(),
  FileAttachment("../data/poblacion.csv").csv()
]);

export const meta = metaRaw;
export const nacional = numeric(nacionalRaw, ["conteo"]);
export const sinFecha = numeric(sinFechaRaw, ["conteo"]);
export const poblacion = numeric(poblacionRaw, ["anio", "poblacion"]);

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

/* ── Cortes ─────────────────────────────────────────────────────────
   El único filtro global de las páginas es el periodo, y filtrar por
   periodo es un `Array.filter` de una línea que cada vista escribe donde
   se lee. Lo que sí vive aquí es el remodelado: pasar de filas largas del
   registro a la matriz mes × serie que consumen las gráficas.

   Categoría y sexo ya no se filtran de forma global. Cada gráfica que los
   necesita trae su propio control —la leyenda de la tendencia, el selector
   del apilado por sexo—, así que el corte se hace sobre el dato ya
   recortado por periodo y no antes.

   No hay interruptor de «incluir sin fecha»: los registros sin fecha se
   dibujan siempre como elementos aparte y no entran en ninguna serie
   (DECISIONS.md #12.3). */

export const CATEGORIA_KEYS = Object.keys(CATEGORIA_LABELS);
export const SEXO_KEYS = Object.keys(SEXO_LABELS);

/**
 * Una fila por mes, una columna por clave.
 *
 * Es la forma que consumen el histograma apilado y el área acumulada: la
 * gráfica, el CSV y la tabla salen todos de esta misma matriz, así que no
 * pueden decir tres cifras distintas del mismo mes.
 *
 * Los meses sin ninguna fila salen igualmente, en cero. Un hueco en el eje
 * temporal se leería como un mes que no existe.
 *
 * @param {object[]} rows   filas del registro, ya filtradas
 * @param {string} field    la columna que reparte las series («categoria», «sexo»)
 * @param {string[]} keys   los valores de esa columna, en orden
 * @param {string} ini      primer mes (YYYY-MM)
 * @param {string} fin      último mes (YYYY-MM)
 */
export function monthlyMatrix(rows, field, keys, ini, fin) {
  const tope = consultado.slice(0, 7);
  const months = monthSpan(ini, fin < tope ? fin : tope);
  const index = new Map(months.map((p, i) => [p, i]));

  const out = months.map((periodo) => {
    const row = {periodo};
    for (const k of keys) row[k] = 0;
    return row;
  });

  for (const r of rows) {
    const i = index.get(r.periodo);
    if (i === undefined) continue;
    // Una clave que no está en `keys` —un sexo vacío, por ejemplo— no se
    // inventa una columna: se cuenta aparte, fuera de esta matriz.
    const k = r[field];
    if (!(k in out[i])) continue;
    out[i][k] += r.conteo;
  }
  return out;
}

/** La misma matriz, con cada columna acumulada mes a mes. */
export function cumulativeMatrix(matrix, keys) {
  const acc = Object.fromEntries(keys.map((k) => [k, 0]));
  return matrix.map((r) => {
    const row = {periodo: r.periodo};
    for (const k of keys) {
      acc[k] += r[k] ?? 0;
      row[k] = acc[k];
    }
    return row;
  });
}

/**
 * Suma por entidad × clave: {cve_entidad, [key]: conteo, total}.
 *
 * Lo que necesitan los dos rankings apilados de la portada.
 */
export function byEntidad(rows, field, keys) {
  const m = new Map();
  for (const r of rows) {
    let acc = m.get(r.cve_entidad);
    if (!acc) {
      acc = {cve_entidad: r.cve_entidad, total: 0};
      for (const k of keys) acc[k] = 0;
      m.set(r.cve_entidad, acc);
    }
    if (!(r[field] in acc)) continue;
    acc[r[field]] += r.conteo;
    acc.total += r.conteo;
  }
  return m;
}

/** Nombre de entidad por clave. */
export const entidadPorCve = new Map(entidades.map((e) => [e.cve_entidad, e.entidad]));
