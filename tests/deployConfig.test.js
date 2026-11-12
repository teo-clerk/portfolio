import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findInvalidSources } from '../scripts/check-vercel.mjs';
import { cvData } from '../src/data/cvData.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(resolve(ROOT, file), 'utf8');
const vercelConfig = JSON.parse(read('vercel.json'));

const headerValue = (source, key) =>
  vercelConfig.headers
    .find((rule) => rule.source === source)
    ?.headers.find((header) => header.key.toLowerCase() === key.toLowerCase())?.value;

describe('vercel.json', () => {
  it('has only route patterns Vercel can compile', () => {
    expect(findInvalidSources(vercelConfig)).toEqual([]);
  });

  it('would have caught the pattern that froze production for two months', () => {
    const broken = { headers: [{ source: '/(?:CV|cv)\\.pdf', headers: [] }] };
    const failures = findInvalidSources(broken);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('Pattern cannot start with "?"');
  });

  it('reports a rule with no source instead of throwing', () => {
    expect(findInvalidSources({ rewrites: [{ destination: '/x' }] })).toHaveLength(1);
    expect(findInvalidSources({ headers: 'nope' })).toHaveLength(1);
    expect(findInvalidSources({})).toEqual([]);
  });

  it('serves the CV PDF as a fresh download', () => {
    expect(headerValue('/(CV|cv)\\.pdf', 'Content-Disposition')).toContain('attachment');
    expect(headerValue('/(CV|cv)\\.pdf', 'Cache-Control')).toContain('must-revalidate');
  });
});

describe('Content-Security-Policy', () => {
  const csp = headerValue('/(.*)', 'Content-Security-Policy') ?? '';
  const directive = (name) =>
    csp
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name} `)) ?? '';

  it('is sent on every route', () => {
    expect(csp).not.toBe('');
  });

  it('allows no inline or eval script', () => {
    expect(directive('script-src')).toBe("script-src 'self'");
    expect(csp).not.toContain('unsafe-eval');
  });

  it('locks down the fallbacks', () => {
    expect(directive('default-src')).toBe("default-src 'self'");
    expect(directive('object-src')).toBe("object-src 'none'");
    expect(directive('base-uri')).toBe("base-uri 'self'");
    expect(directive('frame-ancestors')).toBe("frame-ancestors 'none'");
  });

  it('allows exactly the third parties the terminal uses', () => {
    expect(directive('connect-src')).toBe("connect-src 'self' https://wttr.in");
    expect(directive('frame-src')).toBe('frame-src https://silentspacemarine.com https://www.openstreetmap.org');
    expect(directive('font-src')).toBe("font-src 'self' https://fonts.gstatic.com");
  });

  it('is not undermined by inline event handlers in the pages it protects', () => {
    const inlineHandler = /<[a-z][^>]*\son[a-z]+\s*=/i;
    expect(read('index.html')).not.toMatch(inlineHandler);
    expect(read('scripts/generate-cv.mjs')).not.toMatch(inlineHandler);
  });

  it('is not undermined by eval in the app source', () => {
    for (const file of ['src/commands/dynamic.commands.js', 'src/utils/calc.js']) {
      expect(read(file), file).not.toMatch(/new Function|\beval\(/);
    }
  });
});

describe('published CV facts', () => {
  const published = [
    Object.values(cvData).join('\n'),
    read('index.html'),
    read('scripts/generate-cv.mjs'),
    read('src/commands/actions.commands.js'),
  ].join('\n');

  // Work that was planned but never built must not be presented as done, and
  // the job title must stay at the honest level (a second-year undergraduate).
  it.each([
    [/satellite[- ]tracking/i],
    [/\bSGP4\b/],
    [/\bASCOM\b/],
    [/orbital mechanics/i],
    [/Data Science Specialist/i],
  ])('does not claim %s', (pattern) => {
    expect(published).not.toMatch(pattern);
  });

  it('leads the projects with FloodFusion', () => {
    const firstProject = cvData.projects.match(/<span class="list-item"><strong>([^<]+)<\/strong>/)?.[1];
    expect(firstProject).toBe('FloodFusion');
  });

  it('keeps the JSON-LD parseable and in step with the CV', () => {
    const jsonLd = read('index.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    const person = JSON.parse(jsonLd);
    expect(person.jobTitle).toBe('AI & Data Science Student');
    expect(person.subjectOf[0].name).toBe('FloodFusion');
  });
});

describe('social sharing card', () => {
  const html = read('index.html');

  // Unhashed images are cached as immutable for a year (vercel.json), so the
  // card needs its own file name and must really be the size the tags claim.
  it('points Open Graph and Twitter at the dedicated 1200x630 card', () => {
    expect(html).toContain('<meta property="og:image" content="https://teoclerici.com/og-card.jpg" />');
    expect(html).toContain('<meta name="twitter:image" content="https://teoclerici.com/og-card.jpg" />');
    expect(html).not.toMatch(/(og|twitter):image" content="[^"]*bg-hero/);
  });

  it('ships a card whose pixel size matches the declared one', () => {
    const jpeg = readFileSync(resolve(ROOT, 'public/og-card.jpg'));
    // The frame header (SOF0 / SOF2) holds height then width as big-endian 16-bit.
    let offset = 2;
    let size = null;
    while (offset < jpeg.length && size === null) {
      const marker = jpeg[offset + 1];
      const length = jpeg.readUInt16BE(offset + 2);
      if (marker === 0xc0 || marker === 0xc2) {
        size = { height: jpeg.readUInt16BE(offset + 5), width: jpeg.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(html).toContain('<meta property="og:image:width" content="1200" />');
    expect(html).toContain('<meta property="og:image:height" content="630" />');
  });
});
