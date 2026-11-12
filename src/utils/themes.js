/**
 * Terminal colour themes.
 *
 * A Map rather than an object literal on purpose: the theme name comes straight
 * from user input (`theme <name>`), and `({})['constructor']` is truthy. With a
 * plain object, `theme constructor` passed the "is this a theme?" check, painted
 * `undefined` colours and persisted the broken name to localStorage, so the
 * terminal came back colourless on every later visit.
 *
 * Must agree with the `[data-theme="…"]` blocks in src/index.css, which add the
 * per-theme extras (e.g. `.download-cv-btn`).
 */
export const THEMES = new Map([
  ['purple', { accent: '#8A2BE2', bg: 'rgba(20, 20, 20, 0.5)' }],
  ['green', { accent: '#27c93f', bg: 'rgba(0, 20, 5, 0.55)' }],
  ['amber', { accent: '#ffbd2e', bg: 'rgba(20, 15, 0, 0.55)' }],
  ['spiderman', { accent: '#ff0000', bg: 'rgba(0, 20, 50, 0.75)' }],
]);

/**
 * @param {unknown} name
 * @returns {{ accent: string, bg: string } | null} The theme, or null when unknown.
 */
export const getTheme = (name) => THEMES.get(name) ?? null;
