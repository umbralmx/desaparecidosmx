// umbral_ · monitor del RNPDNO — configuración de Observable Framework.
//
// Modo laboratorio (claro). El sitio es un micrositio de proyecto, no un
// tablero suelto: guide/14-superficies/web.md lo pone en laboratorio, y el
// idioma visual es el mismo de umbral.org.mx (hoja de contenido, reglas de
// 1px, etiquetas mono en minúsculas). La retícula de puntos ya no vive en
// el margen: es la banda bajo el titular, ver DECISIONS.md #25.
import {existsSync} from "node:fs";

// Los cargadores de datos leen data/processed/ con pandas + pyarrow. En local
// eso vive en .venv; en CI, en el python del runner.
const python = existsSync(".venv/bin/python3") ? ".venv/bin/python3" : "python3";

const REPO = "https://github.com/umbralmx/desaparecidosmx";

export default {
  title: "umbral_ · RNPDNO",
  root: "dashboard",
  output: "dist",

  // Hoja de estilo propia. Reemplaza al tema por defecto: la marca define
  // color, tipografía y mobiliario, no Framework.
  style: "umbral.css",

  // Framework carga Source Serif 4 desde Google Fonts si no se vacía esta
  // lista. Las fuentes se auto-hospedan (UMB-TYP-005): un CDN filtra la IP
  // de cada lector a un tercero, y el sitio tiene que abrir en redes de
  // gobierno sin salida a fonts.googleapis.com.
  globalStylesheets: [],

  pages: [
    {name: "Panorama nacional", path: "/"},
    {name: "Detalle por estado", path: "/estado"},
    {name: "Datos y método", path: "/datos"}
  ],

  // La navegación son tres páginas. Una barra lateral fija para tres
  // entradas ocupa una banda de pantalla para repetir lo que la página ya
  // muestra (guide/14-superficies/landing.md § Sin barra de navegación).
  sidebar: false,
  header: "",
  pager: false,
  toc: false,
  search: false,

  // lang="es" (UMB-A11Y-001) y la tarjeta social en modo instrumento.
  head: ({title}) => `
<meta name="description" content="Registros del RNPDNO por entidad, mes, categoría, sexo y municipio. Datos abiertos, conciliados contra el tablero oficial.">
<link rel="icon" type="image/svg+xml" href="./assets/umbral-favicon.svg">
<meta property="og:title" content="${title ?? "umbral_ · RNPDNO"}">
<meta property="og:description" content="México · registros del RNPDNO por fecha de hechos · 2010–2026">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary">`,

  footer: `<div class="u-footer-inner">
  <p class="u-footer-line">Fuente: RNPDNO (CNB/SEGOB) · datos CC BY 4.0 · código MIT</p>
  <p class="u-footer-line"><a href="${REPO}">${REPO.replace("https://", "")}</a> · <a href="mailto:hola@umbral.org.mx">hola@umbral.org.mx</a></p>
</div>`,

  interpreters: {".py": [python]},
  preserveIndex: false,
  linkify: false
};
