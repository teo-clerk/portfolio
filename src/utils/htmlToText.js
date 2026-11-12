/**
 * Flatten the terminal's HTML fragments into plain text.
 *
 * The CV content in `cvData` is presentation markup (`<span class="list-item">`,
 * `&nbsp;` indents, inline styles). Sending it verbatim to the language model
 * spent roughly a third of every `ask` prompt on tags the model has no use for.
 *
 * This is a formatter for our own trusted content, NOT a sanitiser: its output
 * goes into a prompt, never into the DOM. Use `escapeHtml` / `sanitizeAiHtml`
 * for anything that will be rendered.
 *
 * No DOM APIs: this module is also imported by the `/api/ask` serverless
 * function, which runs under Node.
 */

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  times: '×',
  middot: '·',
};

const decodeEntities = (text) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body) => {
    if (body[0] !== '#') return NAMED_ENTITIES[body.toLowerCase()] ?? match;
    const isHex = body[1] === 'x' || body[1] === 'X';
    const codePoint = Number.parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
    return Number.isInteger(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : match;
  });

const stripTags = (html) => html.replace(/<[^>]*>/g, '');

const bareAddress = (value) =>
  value.replace(/^(https?:\/\/|mailto:)/i, '').replace(/\/$/, '').toLowerCase();

/**
 * A link label that already shows its target (`github.com/x` for
 * `https://github.com/x`). The label must itself look like an address: a word
 * such as "PDF" also occurs inside `…/paper.pdf` but tells the reader nothing.
 */
const labelShowsTarget = (label, href) =>
  /\S\.\S/.test(label) && !/\s/.test(label) && bareAddress(href).includes(bareAddress(label));

const linkToText = (_match, href, inner) => {
  const label = stripTags(inner).trim();
  if (!/^https?:\/\//i.test(href) || labelShowsTarget(label, href)) return label;
  return `${label} (${href})`;
};

/**
 * @param {string} html Trusted HTML fragment.
 * @returns {string} Plain text: one line per block or `<br>`, links kept as `label (url)`.
 */
export const htmlToText = (html) =>
  decodeEntities(
    stripTags(
      String(html ?? '')
        .replace(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, linkToText)
        .replace(/<br\s*\/?>|<\/(?:div|p|li|h[1-6]|pre)>/gi, '\n')
    )
  )
    .split('\n')
    .map((line) => line.replace(/[ \t\u00a0]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
