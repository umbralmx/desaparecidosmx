/**
 * Selector de periodo: una rejilla de meses, años en filas.
 *
 * Sustituye a los dos <select> de «Desde» y «Hasta». El registro cubre
 * 199 meses en 17 años, así que un calendario que avanza año por año
 * obliga a 17 clics para cruzarlo. Con los años en filas y los meses en
 * columnas, el tramo entero se ve de una vez y el rango se lee como una
 * banda continua.
 *
 * `calendar` y `date-picker` son «adopta» en guide/16-componentes.md.
 * `date-picker` es la composición de `calendar` con `popover`, y `popover`
 * es una de las seis capas superpuestas que gobierna UMB-A11Y-008: el foco
 * entra al abrir, queda atrapado mientras la capa está abierta, Escape
 * cierra y el foco vuelve al control de origen.
 *
 * Ese contrato no se escribe a mano aquí. Un <dialog> nativo abierto con
 * showModal() lo da entero, que es la razón por la que components.css
 * colapsa las cinco formas de capa en `.u-dialog`.
 *
 * Del componente de shadcn se copia la forma, no el acabado: trae esquinas
 * redondeadas, sombra y extremos de rango en píldora, y las tres están
 * prohibidas (UMB-LAY-001, UMB-LAY-002). Aquí las celdas son cuadradas, la
 * selección se marca con relleno y el borde es de 1px. Las fechas viajan en
 * ISO dentro del dato (UMB-NUM-003).
 *
 * El nodo se comporta como un Input de Observable: expone `value` y
 * emite «input» al cambiar, así que `Generators.input` lo lee igual que
 * a un `Inputs.select`.
 */

const MESES = ["ene", "feb", "mar", "abr", "may", "jun",
               "jul", "ago", "sep", "oct", "nov", "dic"];

const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
                      "julio", "agosto", "septiembre", "octubre", "noviembre",
                      "diciembre"];

/** «2014-03» → «marzo de 2014», para el aria-label de cada celda. */
const largo = (periodo) =>
  `${MESES_LARGOS[Number(periodo.slice(5, 7)) - 1]} de ${periodo.slice(0, 4)}`;

/**
 * @param {string[]} periodos  los meses con datos, «YYYY-MM», ordenados
 * @param {object} [o]
 * @param {[string,string]} [o.value]  rango inicial
 * @param {string} [o.label]
 * @returns {HTMLElement} con `.value` = [ini, fin]
 */
export function periodoRange(periodos, {value, label = "Periodo"} = {}) {
  const conDatos = new Set(periodos);
  const primero = periodos[0];
  const ultimo = periodos[periodos.length - 1];
  let [ini, fin] = value ?? [primero, ultimo];

  // Cuando ya se eligió un extremo y falta el otro, la rejilla entra en
  // modo «pendiente»: el siguiente clic cierra el rango.
  let anclaPendiente = null;

  const anios = [...new Set(periodos.map((p) => p.slice(0, 4)))];

  const root = document.createElement("div");
  root.className = "u-periodo";

  // La etiqueta la pone el componente, no la página: así queda en mono y
  // en versalitas como las de los demás campos (UMB-LAY-006).
  const etiqueta = document.createElement("span");
  etiqueta.className = "u-periodo-label";
  etiqueta.id = `periodo-label-${Math.random().toString(36).slice(2, 8)}`;
  etiqueta.textContent = label;
  root.append(etiqueta);

  // ── Disparador ───────────────────────────────────────────────────
  // La rejilla completa mide ~550px de alto. Vive plegada para no
  // empujar las cifras y las gráficas fuera de la primera pantalla.
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "u-btn u-periodo-trigger";
  trigger.setAttribute("aria-expanded", "false");

  const valorTexto = document.createElement("span");
  valorTexto.className = "u-periodo-valor";
  trigger.append(valorTexto);

  const panel = document.createElement("dialog");
  panel.className = "u-dialog u-periodo-dialog";
  const panelId = `periodo-${Math.random().toString(36).slice(2, 8)}`;
  panel.id = panelId;
  trigger.setAttribute("aria-controls", panelId);

  // El diálogo necesita un nombre accesible propio; el disparador no se lo
  // presta una vez que el foco entra en la capa.
  const titulo = document.createElement("h2");
  titulo.className = "u-dialog__title";
  titulo.id = `${panelId}-titulo`;
  titulo.textContent = "Periodo por mes";
  panel.setAttribute("aria-labelledby", titulo.id);
  panel.append(titulo);

  // ── Cabecera del panel ───────────────────────────────────────────
  const head = document.createElement("div");
  head.className = "u-periodo-head";
  const hint = document.createElement("p");
  hint.className = "u-periodo-hint";
  hint.textContent = "Elige el mes inicial y después el final.";
  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "u-btn";
  reset.textContent = "Todo el periodo";
  head.append(hint, reset);
  panel.append(head);

  // ── Rejilla ──────────────────────────────────────────────────────
  const grid = document.createElement("div");
  grid.className = "u-periodo-grid";
  grid.setAttribute("role", "grid");
  grid.setAttribute("aria-label", `${label} por mes`);

  const encabezado = document.createElement("div");
  encabezado.className = "u-periodo-row u-periodo-monthhead";
  encabezado.setAttribute("role", "row");
  const esquina = document.createElement("span");
  esquina.setAttribute("role", "columnheader");
  encabezado.append(esquina);
  for (const m of MESES) {
    const th = document.createElement("span");
    th.setAttribute("role", "columnheader");
    th.textContent = m;
    encabezado.append(th);
  }
  grid.append(encabezado);

  /** @type {Map<string, HTMLButtonElement>} */
  const celdas = new Map();

  for (const anio of anios) {
    const row = document.createElement("div");
    row.className = "u-periodo-row";
    row.setAttribute("role", "row");

    const rh = document.createElement("span");
    rh.className = "u-periodo-anio";
    rh.setAttribute("role", "rowheader");
    rh.textContent = anio;
    row.append(rh);

    for (let m = 0; m < 12; m++) {
      const periodo = `${anio}-${String(m + 1).padStart(2, "0")}`;
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "u-periodo-cell";
      cell.setAttribute("role", "gridcell");
      cell.dataset.periodo = periodo;
      cell.tabIndex = -1;
      // El mes va en el aria-label, no solo en la columna: un lector de
      // pantalla no ve el encabezado al saltar de celda en celda.
      cell.setAttribute("aria-label", largo(periodo));

      if (!conDatos.has(periodo)) {
        // Un mes sin datos no se puede elegir. Queda visible y apagado:
        // «no hay registro» es un hecho del periodo, no un hueco que
        // convenga esconder.
        cell.disabled = true;
        cell.setAttribute("aria-disabled", "true");
      }
      celdas.set(periodo, cell);
      row.append(cell);
    }
    grid.append(row);
  }

  panel.append(grid);

  const resumen = document.createElement("p");
  resumen.className = "u-periodo-resumen u-source";
  panel.append(resumen);

  trigger.setAttribute("aria-describedby", etiqueta.id);
  root.append(trigger, panel);

  // ── Estado ───────────────────────────────────────────────────────

  function pintar() {
    const [a, b] = anclaPendiente
      ? [anclaPendiente, anclaPendiente]
      : [ini, fin];
    for (const [periodo, cell] of celdas) {
      const dentro = periodo >= a && periodo <= b;
      const extremo = periodo === a || periodo === b;
      cell.classList.toggle("is-dentro", dentro && !extremo);
      cell.classList.toggle("is-extremo", extremo);
      cell.setAttribute("aria-selected", dentro ? "true" : "false");
    }
    valorTexto.textContent = ini === fin ? ini : `${ini} → ${fin}`;
    const meses = periodos.filter((p) => p >= ini && p <= fin).length;
    resumen.textContent = anclaPendiente
      ? `Inicio en ${largo(anclaPendiente)}. Elige el mes final.`
      : `${ini === fin ? largo(ini) : `${largo(ini)} a ${largo(fin)}`} · ${meses} ${meses === 1 ? "mes" : "meses"}`;
  }

  function emitir() {
    root.dispatchEvent(new Event("input", {bubbles: true}));
  }

  function elegir(periodo) {
    if (!conDatos.has(periodo)) return;
    if (anclaPendiente === null) {
      anclaPendiente = periodo;
      pintar();
      return;
    }
    // El segundo clic cierra el rango. Si cae antes del ancla, los
    // extremos se invierten en vez de rechazar el clic.
    [ini, fin] = anclaPendiente <= periodo
      ? [anclaPendiente, periodo]
      : [periodo, anclaPendiente];
    anclaPendiente = null;
    pintar();
    emitir();
    cerrar();
  }

  // ── Interacción ──────────────────────────────────────────────────

  grid.addEventListener("click", (e) => {
    const cell = e.target.closest(".u-periodo-cell");
    if (cell && !cell.disabled) elegir(cell.dataset.periodo);
  });

  // Vista previa del rango mientras se mueve el ratón con un ancla
  // puesta: sin esto no se ve qué se está por seleccionar.
  grid.addEventListener("pointerover", (e) => {
    if (anclaPendiente === null) return;
    const cell = e.target.closest(".u-periodo-cell");
    if (!cell || cell.disabled) return;
    const p = cell.dataset.periodo;
    const [a, b] = anclaPendiente <= p ? [anclaPendiente, p] : [p, anclaPendiente];
    for (const [periodo, c] of celdas) {
      const dentro = periodo >= a && periodo <= b;
      c.classList.toggle("is-dentro", dentro && periodo !== a && periodo !== b);
      c.classList.toggle("is-extremo", periodo === a || periodo === b);
    }
  });

  // Navegación con teclado sobre la rejilla (UMB-A11Y-006). El tabindex
  // viaja con el foco, así que la rejilla entera es una sola parada de
  // tabulación.
  const ORDEN = periodos;
  grid.addEventListener("keydown", (e) => {
    const cell = e.target.closest(".u-periodo-cell");
    if (!cell) return;
    const p = cell.dataset.periodo;
    const i = ORDEN.indexOf(p);
    let destino = null;

    switch (e.key) {
      case "ArrowRight": destino = ORDEN[i + 1]; break;
      case "ArrowLeft": destino = ORDEN[i - 1]; break;
      case "ArrowDown": destino = ORDEN[i + 12]; break;
      case "ArrowUp": destino = ORDEN[i - 12]; break;
      case "Home": destino = ORDEN[0]; break;
      case "End": destino = ORDEN[ORDEN.length - 1]; break;
      case "Enter":
      case " ":
        e.preventDefault();
        elegir(p);
        return;
      case "Escape":
        // Con un ancla a medias, Escape la cancela y deja la capa abierta.
        // Sin ancla, se deja pasar y el <dialog> cierra por su cuenta.
        if (anclaPendiente !== null) {
          e.preventDefault();
          anclaPendiente = null;
          pintar();
        }
        return;
      default: return;
    }
    if (destino && celdas.has(destino)) {
      e.preventDefault();
      enfocar(destino);
    }
  });

  function enfocar(periodo) {
    for (const c of celdas.values()) c.tabIndex = -1;
    const cell = celdas.get(periodo);
    cell.tabIndex = 0;
    cell.focus();
  }

  reset.addEventListener("click", () => {
    ini = primero;
    fin = ultimo;
    anclaPendiente = null;
    pintar();
    emitir();
  });

  function abrir() {
    // showModal() —no show()— es lo que atrapa el foco y habilita Escape.
    panel.showModal();
    trigger.setAttribute("aria-expanded", "true");
    enfocar(conDatos.has(ini) ? ini : primero);
  }

  function cerrar() {
    if (panel.open) panel.close();
  }

  // `close` cubre las tres salidas: el botón, Escape y el cierre por
  // programa. El navegador devuelve el foco al disparador por su cuenta.
  panel.addEventListener("close", () => {
    trigger.setAttribute("aria-expanded", "false");
    anclaPendiente = null;
    pintar();
  });

  // Un clic en el fondo cierra, como cualquier popover. El fondo es el
  // propio <dialog>: su contenido no recibe estos clics.
  panel.addEventListener("click", (e) => {
    if (e.target === panel) cerrar();
  });

  trigger.addEventListener("click", () => {
    panel.open ? cerrar() : abrir();
  });

  Object.defineProperty(root, "value", {
    get: () => [ini, fin],
    set: (v) => {
      [ini, fin] = v;
      anclaPendiente = null;
      pintar();
    }
  });

  pintar();
  return root;
}
