/**
 * El grano municipal: 139 mil filas, 744 KB comprimidos.
 *
 * Módulo aparte por dos razones. Solo lo usa la página de estado, y solo
 * cuando el lector se acerca a la sección de municipios: si viviera en
 * `registro-nacional.js`, la portada declararía una dependencia sobre un
 * archivo de 8 MB que nunca pide, y ese archivo entraría en el mapa de
 * adjuntos de las dos páginas.
 *
 * El módulo no descarga nada al importarse. La descarga la dispara la
 * primera llamada a `municipiosDe`, que a su vez espera a `whenVisible`
 * (components/lazy.js).
 */
import {FileAttachment} from "observablehq:stdlib";
import {numeric} from "./format.js";

let cache = null;

/**
 * Las filas de una entidad. Se filtran en cuanto se leen, así que la vista
 * nunca guarda las de las otras 32.
 */
export async function municipiosDe(cveEntidad) {
  cache ??= numeric(await FileAttachment("../data/municipios.csv").csv(), ["conteo"]);
  return cache.filter((r) => r.cve_entidad === cveEntidad);
}
