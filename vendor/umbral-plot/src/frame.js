/**
 * The chart frame: finding-title, subtitle, source line.
 *
 * `Frame` throws without a source. The v1.0 engineering doc asked for exactly this
 * ("a chart with no source should throw in dev") and nobody built it; the Phase 0
 * audit then found charts shipping without one. A chart circulates without its page
 * the moment someone screenshots it, so the source line is the only context that
 * travels with it.
 */
import { tokensFor, font } from './tokens.js';

const SNAPSHOT = /consultado\s+\d{4}-\d{2}|\b[a-z][\w-]*-\d{4}-\d{2}\b/i;
const LICENCE = /CC BY|MIT|dominio p[úu]blico/i;

export class MissingSourceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MissingSourceError';
    this.rule = 'UMB-CHT-003';
  }
}

export class Frame {
  /**
   * @param {object} o
   * @param {string} o.title     states the finding, as a sentence
   * @param {string} o.subtitle  geography · period · unit
   * @param {string} o.source    required
   * @param {string} [o.accessed]  YYYY-MM-DD
   * @param {string} [o.snapshot]  e.g. rnpdno-2026-07
   */
  constructor({
    title, subtitle, source, accessed = '', snapshot = '',
    licence = 'CC BY 4.0', site = 'umbral.mx', strict = true,
  } = {}) {
    if (!source || !String(source).trim()) {
      throw new MissingSourceError(
        'a chart needs its source (UMB-CHT-003). Pass source, and ideally accessed '
        + 'and snapshot — a live register\'s counts change between queries, so a '
        + 'chart without a snapshot tag cannot be reconciled later.');
    }
    if (!title || !String(title).trim()) {
      throw new Error('a chart title states the finding as a sentence (UMB-CHT-001)');
    }
    if (strict && (!subtitle || !String(subtitle).trim())) {
      throw new Error(
        'a chart needs a subtitle with geography, period and unit (UMB-CHT-002). '
        + 'Pass strict: false only for a deliberately bare figure.');
    }
    Object.assign(this, { title, subtitle, source, accessed, snapshot, licence, site });
  }

  // umbral-lint: ignore[snapshot-tag] — the template below is built, not quoted
  sourceLine() {
    const parts = [`Fuente: ${String(this.source).trim()}`];
    if (this.accessed) parts.push(`consultado ${this.accessed}`);
    if (this.snapshot) parts.push(this.snapshot);
    parts.push(this.site, `datos ${this.licence}`);
    return parts.join(' · ');
  }

  /** The aria-label carries the finding, not the chart type (UMB-A11Y-002). */
  ariaLabel() {
    return String(this.title).trim();
  }

  /** Non-fatal gaps worth surfacing in review. */
  warnings() {
    const out = [];
    const line = this.sourceLine();
    if (!SNAPSHOT.test(line)) out.push('source line names no access date or snapshot tag (UMB-DAT-002)');
    if (!LICENCE.test(line)) out.push('source line names no licence (UMB-DAT-004)');
    if (String(this.title).trimEnd().endsWith('.')) out.push('chart titles carry no full stop');
    if (String(this.title).split(/\s+/).length < 4) {
      out.push('the title looks like a topic, not a finding (UMB-CHT-001)');
    }
    return out;
  }

  /**
   * Wrap a rendered plot in its frame.
   *
   * @param {Element} plot        the node Plot.plot() returned
   * @param {object}  [o]
   * @param {string}  [o.mode]
   * @param {string}  [o.csv]     href for the downloadable CSV (UMB-A11Y-004)
   * @param {Element} [o.table]   an adjacent data table (UMB-A11Y-003)
   * @returns {Element} a <figure>
   */
  render(plot, { mode = 'laboratorio', csv = null, table = null, document: doc } = {}) {
    const d = doc ?? globalThis.document;
    if (!d) throw new Error('Frame.render needs a DOM; pass { document }');
    const t = tokensFor(mode);

    const fig = d.createElement('figure');
    fig.setAttribute('role', 'figure');
    fig.setAttribute('aria-label', this.ariaLabel());
    fig.style.cssText = 'margin:0;display:flex;flex-direction:column;gap:4px';

    const h = d.createElement('h3');
    h.textContent = this.title;
    h.style.cssText = `margin:0;font-family:'${font.display}',system-ui,sans-serif;`
      + `font-weight:500;letter-spacing:-0.02em;font-size:22px;color:${t.ink}`;
    fig.append(h);

    if (this.subtitle) {
      const p = d.createElement('p');
      p.textContent = this.subtitle;
      p.style.cssText = `margin:0 0 8px;font-family:'${font.body}',system-ui,sans-serif;`
        + `font-size:14px;color:${t.muted}`;
      fig.append(p);
    }

    if (plot) fig.append(plot);
    if (table) fig.append(table);

    const cap = d.createElement('figcaption');
    cap.style.cssText = `margin-top:8px;padding-top:8px;border-top:1px solid ${t.border};`
      + `font-family:'${font.mono}',ui-monospace,monospace;font-size:12px;color:${t.caption}`;
    cap.textContent = this.sourceLine();
    if (csv) {
      const a = d.createElement('a');
      a.href = csv;
      a.setAttribute('download', '');
      a.textContent = 'Descargar CSV';
      a.style.cssText = `margin-left:12px;color:${t['signal-text']}`;
      cap.append(a);
    }
    fig.append(cap);
    return fig;
  }
}

export const frame = (o) => new Frame(o);
