# Observable Framework under the Umbral system — what to reuse

Notes from migrating this dashboard off Streamlit, kept for the next
Umbral project that picks Framework. The decisions and their reasons are
in `DECISIONS.md` entries 16 to 18. This file is the shorter, portable
version: the traps, and what to do instead.

Framework version 1.13.4. Umbral design system v1.6.0.

---

## 1. One code block is one cell, so split the imports

Framework merges every `import` in a single fenced block into one cell.
That cell resolves when its slowest import resolves.

Our first version put all seven imports in one block. The result was one
cell exporting 29 names. The brand, the navigation and the section labels
came from a module that loads in 90 ms. They waited behind a module that
fetches four CSV files. The page opened with twelve spinners for about
two seconds, including one on the logo.

Split the imports by what they wait on:

```js
// block 1 — page chrome. No network.
import "./components/fonts.js";
import {brand, nav, label} from "./components/chrome.js";
```

```js
// block 2 — pure functions. No network.
import {chartFrame} from "./components/frame.js";
```

```js
// block 3 — the only block that waits on data.
import {nacional, periodos} from "./components/registro.js";
```

The chrome now paints as soon as its module arrives.

## 2. Fetch the data files in parallel

Four consecutive top-level `await`s in a data module make four serial
round trips. The page then waits for their sum.

```js
// wrong: four round trips, one after another
export const meta = await FileAttachment("../data/meta.json").json();
export const nacional = await FileAttachment("../data/nacional.csv").csv();

// right: one round trip's latency
const [metaRaw, nacionalRaw] = await Promise.all([
  FileAttachment("../data/meta.json").json(),
  FileAttachment("../data/nacional.csv").csv()
]);
export const meta = metaRaw;
export const nacional = nacionalRaw;
```

## 3. A chart inside a `<section>` silently reverts to 640px

Framework's `global.css` caps every `figure`, `table` and `figcaption` at
640px. The generated Umbral stylesheet lifts that cap, but only for
**direct children** of `#observablehq-main`:

```css
#observablehq-main > figure { max-width: none; }
```

The minimal idiom puts content in sections, because UMB-LAY-006 asks for
a section label. A chart inside `<section class="u-section">` is not a
direct child, so it keeps the 640px cap. Plot draws at the full column
width and the svg's `max-width: 100%` scales it back down. The chart
looks correctly proportioned and too small, which is why this is easy to
miss.

Opt the chart frame out by class, wherever it sits:

```css
.u-chart, .u-chart > figcaption, .u-table-wrap, table.u-table { max-width: none; }
```

Reported upstream: umbralmx/umbral-style-guide#9.

## 4. Prefer CSV over parquet below a few million rows

`FileAttachment.parquet()` pulls **6.2 MB of `parquet-wasm`** into the
browser. Our register is 139 thousand rows:

| Format | On disk | Over the wire | Extra runtime |
|---|---|---|---|
| parquet + zstd | 0.48 MB | 0.48 MB | 6.2 MB wasm |
| CSV | 8.6 MB | 0.74 MB gzipped | none |

GitHub Pages gzips CSV, so the wire cost is comparable and the decoder
disappears. Parse cost is about 420 ms for 139 thousand rows, once.

Read every column as text and cast only the numeric ones. `csv({typed:
true})` runs `d3.autoType`, which turns the INEGI key `"01"` into `1`.

## 5. Self-hosted fonts: the `.woff2` trap

The guide's recipe is a `<link>` in `head` to a stylesheet of
`@font-face` rules. That works for a plain stylesheet. It does not work
if the rules live in the sheet named by `style`, for two reasons.

- Framework bundles that sheet with esbuild, which has **no loader for
  `.woff2`**. A relative `url()` fails the build.
- An absolute `/assets/…` path fails in preview. Preview serves
  source-root files under `/_file/`, not at the root.

What works in both preview and build is `FileAttachment`, which returns
the same content-hashed URL in each. Build the `@font-face` rules at
runtime from those URLs. See `dashboard/components/fonts.js`. The cost is
one font swap on first paint, which `font-display: swap` covers.

## 6. Set `lang` at build time, not with a script

Framework emits `<html>` with no `lang` attribute at all, and does not
expose the tag. The guide suggests a shim in `head`:

```js
head: '<script>document.documentElement.lang="es"</script>',
```

Rewriting the built HTML is stronger. The attribute is then in the first
byte, and it does not depend on JavaScript running. See
`scripts/copy-static.mjs`. The same step writes `data-mode`, so the page
never paints in the wrong mode first.

## 7. Delay the loading indicator

Framework draws a rotating indicator in every pending cell from the first
frame. A cell that resolves in 80 ms still flashes one.

Delay it, do not hide it. A monitor over a living register should say
when it is waiting.

```css
observablehq-loading { opacity: 0; animation-delay: 0s, 400ms; /* … */ }
```

## 8. Defer the expensive slice, and reserve its height

Our municipal file is 744 KB gzipped and about 420 ms to parse, for a
chart below the fold. `components/lazy.js` gates it on an
`IntersectionObserver` with a 600px margin, so the fetch starts before
the section is on screen.

Three conditions make it safe:

- Without `IntersectionObserver`, load immediately. A section that never
  loads is worse than one that always loads.
- Reserve the chart's height in the placeholder, or the page jumps.
- Say in words why the placeholder is empty. An absence explains itself.

## 9. Overlays: use a native `<dialog>`

`guide/16-componentes.md` maps `date-picker` to `calendar` plus
`popover`, and `popover` is bound by UMB-A11Y-008. A native `<dialog>`
opened with `showModal()` supplies the whole contract: focus enters,
focus is trapped, `Escape` closes, focus returns to the opener.

One adjustment. `.u-dialog` carries `max-width: var(--u-measure)`, which
is 65ch. That is the right measure for prose and too narrow for a wide
control such as a twelve-column grid. Override it on the specific dialog.

## 10. Data loaders write to stdout, so parquet needs a buffer

A loader writes its output to stdout. Parquet closes with a footer that
needs a seek, and stdout cannot seek. Build the file in memory first:

```python
buf = io.BytesIO()
df.to_parquet(buf, index=False)
sys.stdout.buffer.write(buf.getvalue())
```

CSV has no such problem: `df.to_csv(sys.stdout, index=False)`.

## 11. Verify with the linter, not with screenshots

The guide ships `skills/umbral-brand/scripts/lint.py`. It parses
declarations rather than grepping, so it does not produce the usual false
positives on `cursor: pointer` or `white-space: nowrap`.

```sh
python3 .claude/skills/umbral-brand/scripts/lint.py dashboard
```

Exclude generated and vendored files, which legitimately contain hexes:
`observable-framework-*.css`, `vendor/`, and `.observablehq/cache/`.

This matters more than it sounds. During this migration a browser
screenshot tool repeatedly returned stale frames, and twice led to the
conclusion that a working page was frozen. A build-time check does not
have that failure mode.
