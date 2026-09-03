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
 * lang="es" (UMB-A11Y-001) y data-mode="instrumento".
 *
 * Framework emite <html> sin atributo de idioma y no lo expone en la
 * configuración. Sin esto, un lector de pantalla pronuncia todo el sitio
 * —incluidos los nombres de las categorías del RNPDNO— con fonética
 * inglesa. Se reescribe el HTML ya construido para que los atributos
 * viajen en el primer byte, y no dependan de que corra el JavaScript.
 *
 * data-mode conmuta los tokens de color a modo instrumento (oscuro). Si
 * llega en el HTML y no por JavaScript, la página nunca parpadea en
 * claro antes de oscurecerse.
 */
const pages = (await readdir("dist")).filter((f) => f.endsWith(".html"));
for (const page of pages) {
  const path = join("dist", page);
  const html = await readFile(path, "utf-8");
  if (!html.includes("<html>")) {
    throw new Error(`${page}: no se encontró <html> sin atributos; ` +
      "revisa si Framework cambió la plantilla antes de confiar en este paso");
  }
  await writeFile(
    path,
    html.replace("<html>", '<html lang="es" data-mode="instrumento">')
  );
}

// Evita que Pages ignore los directorios que empiezan con guion bajo
// (_file, _import, _npm).
await writeFile("dist/.nojekyll", "");

console.log(`lang="es" + data-mode="instrumento" en ${pages.length} páginas · dist/.nojekyll`);
