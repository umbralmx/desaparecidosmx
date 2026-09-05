/**
 * Leyenda que además es el control de la gráfica.
 *
 * UMB-CHT-005 pide etiqueta directa al final de la serie en vez de una
 * caja de leyenda. Una pila no tiene final de serie donde colgarla: todas
 * las bandas terminan en la misma columna, una encima de otra. La leyenda
 * es la salida, y si de todos modos hay que dibujarla, que sirva para algo
 * — cada entrada enciende y apaga su banda.
 *
 * Tres decisiones que importan:
 *
 *   - Cada entrada es un <button role="switch">, no un <div> con un
 *     manejador de clic. Así llega por tabulación, responde a Enter y a
 *     espacio sin código extra, y anuncia su estado (UMB-A11Y-006).
 *   - Apagada, la entrada no solo pierde color: el cuadro se vacía y el
 *     texto se tacha. El estado nunca queda codificado solo por el color
 *     (UMB-A11Y-005).
 *   - No se puede apagar la última encendida. Una gráfica vacía es un
 *     callejón sin salida y sin explicación; el clic simplemente no hace
 *     nada.
 *
 * El nodo se comporta como un Input de Observable: expone `value` y emite
 * «input» al cambiar, así que `Generators.input` lo lee igual que a un
 * `Inputs.checkbox`.
 */

/**
 * @param {object[]} items  [{key, label, color}]
 * @param {object} [o]
 * @param {string[]} [o.value]  las claves encendidas al arrancar
 * @param {string} [o.label]    nombre accesible del grupo
 * @param {boolean} [o.interactive]  false = clave de lectura, sin controles
 * @returns {HTMLElement} con `.value` = las claves encendidas, en el orden de `items`
 */
export function serieLegend(items, {value, label = "Series", interactive = true} = {}) {
  let activos = new Set(value ?? items.map((d) => d.key));

  const root = document.createElement("div");
  root.className = "u-legend";
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", label);

  /** @type {Map<string, HTMLElement>} */
  const botones = new Map();

  for (const item of items) {
    // Sin interacción, la entrada es un <span>: un botón que no hace nada
    // al pulsarlo es una promesa rota, y además se cuela en el recorrido de
    // tabulación sin llevar a ningún sitio.
    const btn = document.createElement(interactive ? "button" : "span");
    btn.className = "u-legend__item";
    if (interactive) {
      btn.type = "button";
      btn.setAttribute("role", "switch");
    }
    btn.dataset.key = item.key;

    const swatch = document.createElement("span");
    swatch.className = "u-legend__swatch";
    // El único color de la leyenda es el de la serie que nombra, y sale
    // del mismo objeto que pinta la gráfica: no hay forma de que se
    // separen.
    swatch.style.setProperty("--u-legend-color", item.color);

    const texto = document.createElement("span");
    texto.className = "u-legend__label";
    texto.textContent = item.label;

    btn.append(swatch, texto);
    botones.set(item.key, btn);
    root.append(btn);
  }

  function pintar() {
    for (const [key, btn] of botones) {
      const on = activos.has(key);
      if (interactive) btn.setAttribute("aria-checked", on ? "true" : "false");
      btn.classList.toggle("is-off", !on);
    }
  }

  if (interactive) root.addEventListener("click", (e) => {
    const btn = e.target.closest(".u-legend__item");
    if (!btn) return;
    const key = btn.dataset.key;
    if (activos.has(key)) {
      // La última encendida se queda encendida.
      if (activos.size === 1) return;
      activos.delete(key);
    } else {
      activos.add(key);
    }
    pintar();
    root.dispatchEvent(new Event("input", {bubbles: true}));
  });

  Object.defineProperty(root, "value", {
    get: () => items.map((d) => d.key).filter((k) => activos.has(k)),
    set: (v) => {
      activos = new Set(v);
      pintar();
    }
  });

  pintar();
  return root;
}
