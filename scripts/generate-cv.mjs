/**
 * Generates public/cv.html — a static, semantic, no-JavaScript rendering of the
 * CV from the same src/data/cvData.js the terminal uses.
 *
 * Why this exists:
 *  - Accessibility: the terminal is a keyboard-driven CLI with no accessible
 *    reading path. This page is plain HTML with real headings and links.
 *  - SEO: a crawler without JS previously saw an empty <div id="root">.
 *  - Conversion: a recruiter on a phone gets the content immediately.
 *
 * Run via the `predev` / `prebuild` npm scripts, so it can never go stale.
 * The output is generated, not authored — it is gitignored.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cvData } from '../src/data/cvData.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public/cv.html');

const SITE = 'https://teoclerici.com';

const SECTIONS = [
  ['about', 'Profile'],
  ['education', 'Education'],
  ['experience', 'Experience'],
  ['projects', 'Projects'],
  ['skills', 'Skills'],
  ['certifications', 'Certifications & Awards'],
  ['languages', 'Languages'],
  ['interests', 'Interests'],
];

/**
 * cvData values are terminal-flavoured HTML fragments. Strip the presentational
 * span wrappers so the static page can use real semantic elements, and drop the
 * duplicated section title (the <h2> already says it).
 */
const toSemantic = (html) =>
  html
    .replace(/<span class="section-title">[\s\S]*?<\/span>/g, '')
    .replace(/<span class="list-item">/g, '<li>')
    .replace(/<\/span>/g, '</li>')
    .replace(/&nbsp;/g, ' ')
    .trim();

const wrapList = (html) =>
  html.includes('<li>') ? `<ul>${html}</ul>` : html.split('\n').filter(Boolean).map((l) => `<p>${l}</p>`).join('\n');

const sectionHtml = ([key, title]) => {
  const raw = cvData[key];
  if (!raw) return '';
  const id = key;
  return `      <section aria-labelledby="${id}-heading">
        <h2 id="${id}-heading">${title}</h2>
        ${wrapList(toSemantic(raw))}
      </section>`;
};

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Teo Clerici Jurado — CV</title>
    <meta name="description" content="Curriculum vitae of Teo Clerici Jurado — AI &amp; Data Science student at H-FARM Campus, Junior Consultant at Lumina Consulting, Educational Mentor with the MIT Edgerton Center." />
    <link rel="canonical" href="${SITE}/cv" />
    <link rel="icon" type="image/png" sizes="32x32" href="/duck-32.png" />
    <meta name="theme-color" content="#0a0a0a" />
    <meta property="og:type" content="profile" />
    <meta property="og:url" content="${SITE}/cv" />
    <meta property="og:title" content="Teo Clerici Jurado — CV" />
    <meta property="og:image" content="${SITE}/bg-hero.jpg" />
    <style>
      :root {
        color-scheme: dark light;
        --bg: #0d0d10;
        --fg: #e9e9ee;
        --muted: #a2a2ad;
        --accent: #8A2BE2;
        --rule: #2a2a33;
        --mono: 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }
      @media (prefers-color-scheme: light) {
        :root { --bg:#fbfbfd; --fg:#16161a; --muted:#5b5b66; --rule:#e2e2ea; }
      }
      *, *::before, *::after { box-sizing: border-box; }
      body {
        margin: 0;
        padding: clamp(1.5rem, 5vw, 4rem) 1.25rem 5rem;
        background: var(--bg);
        color: var(--fg);
        font: 16px/1.65 var(--mono);
        -webkit-text-size-adjust: 100%;
      }
      main { max-width: 62rem; margin: 0 auto; }
      a { color: var(--accent); }
      a:focus-visible, .skip:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
      header { border-bottom: 1px solid var(--rule); padding-bottom: 1.5rem; margin-bottom: 2rem; }
      h1 { font-size: clamp(1.7rem, 5vw, 2.6rem); margin: 0 0 .4rem; letter-spacing: -0.02em; }
      .role { color: var(--muted); margin: 0 0 1rem; font-size: 1.05rem; }
      .meta { display: flex; flex-wrap: wrap; gap: .5rem 1.25rem; margin: 0; padding: 0; list-style: none; font-size: .92rem; }
      h2 {
        font-size: 1.05rem; text-transform: uppercase; letter-spacing: .09em;
        color: var(--accent); margin: 2.5rem 0 .9rem;
        border-bottom: 1px solid var(--rule); padding-bottom: .4rem;
      }
      ul { padding-left: 1.1rem; margin: 0; }
      li { margin-bottom: 1rem; }
      p { margin: 0 0 .8rem; }
      .actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1.5rem; }
      .btn {
        display: inline-block; padding: .6rem 1.1rem; border: 1px solid var(--accent);
        border-radius: 8px; text-decoration: none; font-size: .92rem;
      }
      .btn--primary { background: var(--accent); color: #fff; border-color: var(--accent); }
      .skip {
        position: absolute; left: -9999px; top: 0;
        background: var(--accent); color: #fff; padding: .6rem 1rem; border-radius: 0 0 8px 0;
      }
      .skip:focus { left: 0; }
      footer { margin-top: 3.5rem; padding-top: 1.5rem; border-top: 1px solid var(--rule); color: var(--muted); font-size: .88rem; }
      @media print {
        body { background:#fff; color:#000; padding:0; font-size:11pt; }
        h2 { color:#000; }
        .actions, .skip, footer a { display:none; }
      }
    </style>
  </head>
  <body>
    <a class="skip" href="#content">Skip to content</a>
    <main>
      <header>
        <h1>Teo Clerici Jurado</h1>
        <p class="role">AI &amp; Data Science Student · Junior Consultant · Educational Mentor</p>
        <ul class="meta">
          <li><a href="mailto:clerici.teo5@gmail.com">clerici.teo5@gmail.com</a></li>
          <li><a href="https://linkedin.com/in/teo-clerici" rel="noopener noreferrer">linkedin.com/in/teo-clerici</a></li>
          <li><a href="https://github.com/teo-clerk" rel="noopener noreferrer">github.com/teo-clerk</a></li>
          <li>Venice, Italy</li>
        </ul>
        <div class="actions">
          <a class="btn btn--primary" href="/CV.pdf" download>Download PDF</a>
          <a class="btn" href="/">Interactive terminal version</a>
        </div>
      </header>

      <div id="content">
${SECTIONS.map(sectionHtml).filter(Boolean).join('\n\n')}
      </div>

      <footer>
        <p>This is the plain-text version of an <a href="/">interactive terminal portfolio</a>.</p>
      </footer>
    </main>
  </body>
</html>
`;

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, page, 'utf8');
console.log(`generate-cv: wrote ${OUT} (${(page.length / 1024).toFixed(1)} kB)`);
