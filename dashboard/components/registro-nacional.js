/**
 * El grano pesado del registro: la matriz nacional y la población.
 *
 * Aparte de `registro.js` porque solo lo usan dos de las tres páginas.
 * `nacional.csv` son 107 KB comprimidos y 26,501 filas que tardan unas
 * décimas en volverse objetos; la página de método no toca ninguna.
 *
 * No importa nada de `registro.js` a propósito. Framework compila las
 * importaciones de un bloque a un único `Promise.all`, así que los dos
 * módulos se descargan a la vez siempre que la página los pida en el mismo
 * bloque. Una dependencia entre ellos convertiría ese paralelo en una
 * cadena.
 *
 * Se eligió CSV sobre parquet porque `FileAttachment.parquet()` arrastra
 * 6.2 MB de parquet-wasm al navegador para descomprimir medio mega de
 * datos (DECISIONS.md #16.2).
 */
import {FileAttachment} from "observablehq:stdlib";
import {numeric} from "./format.js";

const [nacionalRaw, poblacionRaw] = await Promise.all([
  FileAttachment("../data/nacional.csv").csv(),
  FileAttachment("../data/poblacion.csv").csv()
]);

export const nacional = numeric(nacionalRaw, ["conteo"]);
export const poblacion = numeric(poblacionRaw, ["anio", "poblacion"]);
