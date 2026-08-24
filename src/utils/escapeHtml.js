/**
 * Terminal output is rendered as raw HTML (via dangerouslySetInnerHTML and by
 * useTypewriter building nodes directly), so anything derived from user input
 * or from a network response must be escaped before it is interpolated.
 *
 * `innerHTML` will not execute a bare <script>, but it very much will fire
 * `onerror` / `onload` handlers — `<img src=x onerror=...>` is enough.
 */

const ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ENTITIES[char]);

/**
 * Escape a value destined for an HTML attribute (e.g. data-cmd="...").
 * Same rules, kept separate so intent is explicit at the call site.
 */
export const escapeAttr = escapeHtml;

// Inline formatting the AI is explicitly asked to produce, and nothing else.
const ALLOWED_TAGS = /<\/?(?:strong|em|b|i|br|code)\s*\/?>/gi;

// NUL sentinels: they cannot realistically appear in model output, they pass
// through escapeHtml untouched, and unlike a printable placeholder they cannot
// collide with literal text in the response.
const SENTINEL = String.fromCharCode(0);
const SENTINEL_PATTERN = new RegExp(`${SENTINEL}(\\d+)${SENTINEL}`, 'g');

/**
 * Sanitize model output before it reaches the DOM.
 *
 * The system prompt instructs the model to emit HTML, so escaping wholesale
 * would destroy the intended formatting. Instead the small allow-listed set of
 * inline tags is stashed, everything else is escaped, and the stashed tags are
 * restored — so no attributes, no event handlers and no unexpected elements
 * can survive, whether they came from a bad generation or a prompt injection.
 */
export const sanitizeAiHtml = (html) => {
  const stash = [];

  const placeholdered = String(html ?? '')
    // Strip any pre-existing sentinel bytes so they cannot be forged.
    .split(SENTINEL).join('')
    .replace(ALLOWED_TAGS, (match) => {
      stash.push(match);
      return `${SENTINEL}${stash.length - 1}${SENTINEL}`;
    });

  return escapeHtml(placeholdered).replace(
    SENTINEL_PATTERN,
    (_, index) => stash[Number(index)] ?? ''
  );
};
