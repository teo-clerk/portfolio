/**
 * cvData sections are terminal-flavoured HTML fragments: a `section-title`
 * span, `list-item` spans, and clickable `command-highlight` spans. Outside the
 * terminal (the static /cv page, the solar-system map's panels) they need real
 * semantic markup instead. Both use this one cleaner so they cannot drift.
 *
 * No imports: scripts/generate-cv.mjs loads it under plain Node ESM.
 */

const COMMAND_SPAN = /<span class="command-highlight" data-cmd="([^"]*)">([\s\S]*?)<\/span>/g;

/**
 * @param {string} html A cvData section.
 * @param {{ command?: (cmd: string, label: string) => string }} [options]
 *   `command` decides what a clickable terminal command becomes; by default,
 *   just its label. It runs before the generic `</span>` → `</li>` rewrite,
 *   which would otherwise close the surrounding list item early.
 * @returns {string} The section without its title, list items as `<li>`.
 */
export const toSemantic = (html, { command = (_cmd, label) => label } = {}) =>
  String(html ?? '')
    .replace(COMMAND_SPAN, (_match, cmd, label) => command(cmd, label))
    .replace(/<span class="section-title">[\s\S]*?<\/span>/g, '')
    .replace(/<span class="list-item">/g, '<li>')
    .replace(/<\/span>/g, '</li>')
    .replace(/&nbsp;/g, ' ')
    .trim();

/** Wraps list items in `<ul>`, or every line in `<p>` when there are none. */
export const wrapList = (html) =>
  html.includes('<li>')
    ? `<ul>${html}</ul>`
    : html
        .split('\n')
        .filter(Boolean)
        .map((line) => `<p>${line}</p>`)
        .join('\n');
