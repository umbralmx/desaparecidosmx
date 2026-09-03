/**
 * Cierra el build: idioma del documento y los archivos que nadie
 * referencia.
 *
 * Todo lo demás (fuentes, logos, datos) viaja por FileAttachment, así que
 * Framework ya lo copia a dist/_file/ con su hash de contenido.
 *
 * Aquí NO se escribe un CNAME. El sitio se publica como project page de
 * la organización umbralmx, y una project page hereda el dominio de la
 * user/organization page (umbralmx.github.io, que sí lleva el CNAME de
 * umbral.org.mx). Un CNAME propio en este repositorio reclamaría el
 * dominio entero para este proyecto y tumbaría el sitio raíz.
 */
import {readdir, readFile, writeFile} from "node:fs/promises";
import {join} from "node:path";

/*
 * lang="es" (UMB-A11Y-001).
 *
 * Framework emite <html> sin atributo de idioma y no lo expone en la
 * configuración. Sin esto, un lector de pantalla pronuncia todo el sitio
 * —incluidos los nombres de las categorías del RNPDNO— con fonética
 * inglesa. Se reescribe el HTML ya construido para que el atributo viaje
 * en el primer byte, y no dependa de que corra el JavaScript.
 */
const pages = (await readdir("dist")).filter((f) => f.endsWith(".html"));
for (const page of pages) {
  const path = join("dist", page);
  const html = await readFile(path, "utf-8");
  if (!html.includes("<html>")) {
    throw new Error(`${page}: no se encontró <html> sin atributos; ` +
      "revisa si Framework cambió la plantilla antes de confiar en este paso");
  }
  await writeFile(path, html.replace("<html>", '<html lang="es">'));
}

// Evita que Pages ignore los directorios que empiezan con guion bajo
// (_file, _import, _npm).
await writeFile("dist/.nojekyll", "");

console.log(`lang="es" en ${pages.length} páginas · dist/.nojekyll`);
