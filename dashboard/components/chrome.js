/**
 * Marca y navegación.
 *
 * No hay barra de encabezado: la marca va al principio del contenido,
 * alineada con el titular (guide/14-superficies/landing.md § Sin barra de
 * navegación). Tres páginas no justifican una banda fija que repita lo
 * que la página ya muestra.
 */
import {FileAttachment} from "observablehq:stdlib";
import {html} from "npm:htl";

// Resuelve a la misma URL con hash en preview y en build.
const isotipo = await FileAttachment("../assets/umbral-isotype-dark.svg").url();

// En el build, scripts/copy-static.mjs escribe lang="es" y
// data-mode="instrumento" en el HTML, que es lo que importa
// (UMB-A11Y-001). Estas líneas dan la misma corrección en `preview`,
// donde ese paso no corre.
document.documentElement.lang = "es";
document.documentElement.dataset.mode = "instrumento";

/*
 * Los enlaces de NAVEGACIÓN son relativos, nunca absolutos.
 *
 * Las tres páginas son hermanas en el mismo nivel, así que `./estado`
 * resuelve igual servido en la raíz de un dominio que bajo un subcamino
 * como `umbral.org.mx/desaparecidosmx/`. Un `/estado` absoluto saltaría
 * al sitio raíz y sacaría al lector del proyecto.
 */
const PAGES = [
  {id: "index", href: "./", label: "panorama nacional"},
  {id: "estado", href: "./estado", label: "detalle por estado"},
  {id: "datos", href: "./datos", label: "datos y método"}
];

/*
 * El sitio del laboratorio.
 *
 * Es la única excepción a la regla de arriba, y es absoluta a propósito:
 * la marca sale del proyecto, no navega dentro de él. Volver al tablero
 * lo hace la primera pestaña.
 *
 * El dominio se escribe aquí y en la línea de fuente de cada gráfica, que
 * lo toma del valor por defecto de `Frame` en @umbralmx/umbral-plot. Son
 * dos sitios, no uno, pero el segundo es del paquete de marca y no de
 * este repositorio.
 */
const SITIO = "https://umbral.org.mx/";

/** El lockup, dentro del contenido. Lleva al sitio del laboratorio. */
export function brand() {
  return html`<a class="u-brand" href=${SITIO} aria-label="umbral_ — ir a umbral.org.mx">
    <img src=${isotipo} alt="" width="24" height="24">
    <span class="u-wordmark">umbral<span>_</span></span>
  </a>`;
}

/**
 * La navegación de tres entradas.
 *
 * `current` es el id de la página, no su ruta: la ruta cambia según dónde
 * se publique el sitio y el id no.
 *
 * La página actual lleva aria-current, no solo el color: el color por sí
 * solo no codifica nada (UMB-A11Y-005).
 */
export function nav(current) {
  return html`<nav class="u-nav" aria-label="Páginas">
    ${PAGES.map(
      (p) =>
        html`<a href=${p.href} aria-current=${p.id === current ? "page" : null}>${p.label}</a>`
    )}
  </nav>`;
}

/** Etiqueta de sección: mono, minúsculas, en caption (UMB-LAY-006). */
export function label(text) {
  return html`<h2 class="u-label">${text}</h2>`;
}
