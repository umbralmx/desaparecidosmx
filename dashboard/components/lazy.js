/**
 * Cargar un tramo pesado solo cuando el lector se acerca a él.
 *
 * El archivo municipal pesa 744 KB comprimidos y tarda ~420 ms en
 * convertirse en 139 mil objetos. Eso bloquea el hilo principal, y hasta
 * ahora pasaba al abrir la página aunque el lector nunca bajara hasta la
 * gráfica de municipios.
 *
 * `whenVisible` devuelve un generador que emite `false` y luego `true`
 * cuando el nodo se acerca a la pantalla. Una celda que lo consume se
 * vuelve a evaluar al cambiar el valor, así que basta con condicionar la
 * carga a él.
 *
 * Tres decisiones que importan:
 *
 *   - El margen es de 600px, así que la carga arranca antes de que la
 *     sección se vea. En la práctica el lector llega y ya está.
 *   - Sin IntersectionObserver, emite `true` de inmediato. El tablero
 *     tiene que funcionar en un navegador viejo, y una pieza que no
 *     carga nunca es peor que una que carga siempre.
 *   - No es una animación. `prefers-reduced-motion` no aplica: no hay
 *     nada que se mueva, solo una petición que se aplaza.
 */

/**
 * @param {string} selector  el nodo que dispara la carga al acercarse
 * @param {object} [o]
 * @param {string} [o.rootMargin]  cuánto antes de entrar en vista
 * @returns {AsyncGenerator<boolean>}
 */
export async function* whenVisible(selector, {rootMargin = "600px"} = {}) {
  const node = document.querySelector(selector);

  if (!node || typeof IntersectionObserver !== "function") {
    yield true;
    return;
  }

  yield false;

  await new Promise((resolve) => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          // Una sola vez: el dato queda en caché y la sección no vuelve a
          // pedirlo.
          observer.disconnect();
          resolve();
        }
      },
      {rootMargin}
    );
    observer.observe(node);
  });

  yield true;
}
