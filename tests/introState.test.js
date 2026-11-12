import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shouldShowIntro, getIntroMode, computePosterZoom, DOCKED_SESSION_KEY } from '../src/intro/introState.js';
import { resolveDeepLink } from '../src/commands/deepLink.js';

describe('shouldShowIntro', () => {
  it('shows the landing on a plain first visit', () => {
    expect(shouldShowIntro({ search: '', docked: false })).toBe(true);
    expect(shouldShowIntro()).toBe(true);
  });

  it('shows the landing to visitors arriving from a CV or campaign link', () => {
    expect(shouldShowIntro({ search: '?utm_source=cv' })).toBe(true);
    expect(shouldShowIntro({ search: '?ref=linkedin' })).toBe(true);
  });

  it('goes straight to the terminal for a command deep link', () => {
    expect(shouldShowIntro({ search: '?cmd=recruiter' })).toBe(false);
    expect(shouldShowIntro({ search: '?utm_source=cv&cmd=floodfusion' })).toBe(false);
  });

  it('stays in the terminal once this session has docked', () => {
    expect(shouldShowIntro({ search: '', docked: true })).toBe(false);
  });

  it('keeps the session key the previous boot animation used', () => {
    expect(DOCKED_SESSION_KEY).toBe('booted');
  });
});

describe('getIntroMode', () => {
  it('uses the live 3D scene only on capable desktops', () => {
    expect(getIntroMode('high')).toBe('scene');
  });

  it('uses the still poster on phones and modest hardware', () => {
    expect(getIntroMode('low')).toBe('poster');
  });

  it('uses the CSS-only landing for reduced motion and Save-Data', () => {
    expect(getIntroMode('none')).toBe('static');
    expect(getIntroMode(undefined)).toBe('static');
  });
});

describe('computePosterZoom', () => {
  const screen = { x: 0.7, y: 0.4, width: 0.2, height: 0.25 };

  it('centres the monitor screen and scales it to cover the viewport', () => {
    // Same aspect ratio: no crop, the image is shown at 1000 x 500.
    const zoom = computePosterZoom({
      viewport: { width: 1000, height: 500 },
      image: { width: 2000, height: 1000 },
      screen,
    });
    // Cover needs max(1000 / 200, 500 / 125) = 5.
    expect(zoom.scale).toBeCloseTo(5);
    expect(zoom.translateX).toBeCloseTo(-(0.2 * 1000) * 5);
    expect(zoom.translateY).toBeCloseTo(-(-0.1 * 500) * 5);
  });

  it('accounts for the crop that object-fit: cover applies', () => {
    // A square viewport shows the 2:1 image at 1000 x 500 scaled to 2000 x 1000.
    const zoom = computePosterZoom({
      viewport: { width: 1000, height: 1000 },
      image: { width: 2000, height: 1000 },
      screen,
    });
    expect(zoom.translateX / zoom.scale).toBeCloseTo(-(0.2 * 2000));
    expect(zoom.translateY / zoom.scale).toBeCloseTo(0.1 * 1000);
  });

  it('follows the image when it is anchored to the top instead of centred', () => {
    // 1:2 image in a 3:4 viewport: shown at 900 x 1800, so 600 px are cropped.
    const input = {
      viewport: { width: 900, height: 1200 },
      image: { width: 900, height: 1800 },
      screen: { x: 0.5, y: 0.2, width: 0.4, height: 0.15 },
    };
    const centred = computePosterZoom(input);
    const top = computePosterZoom({ ...input, anchor: { x: 0.5, y: 0 } });

    // Centred: the crop is split, the screen sits at 360 - 300 = 60 px.
    expect(centred.translateY / centred.scale).toBeCloseTo(-(60 - 600));
    // Top-anchored: nothing is cropped above, the screen sits at 360 px.
    expect(top.translateY / top.scale).toBeCloseTo(-(360 - 600));
    expect(top.translateX).toBeCloseTo(0);
  });

  it('never zooms out and caps how far it zooms in', () => {
    const tiny = computePosterZoom({
      viewport: { width: 1000, height: 500 },
      image: { width: 2000, height: 1000 },
      screen: { x: 0.5, y: 0.5, width: 0.001, height: 0.001 },
    });
    expect(tiny.scale).toBe(9);

    const huge = computePosterZoom({
      viewport: { width: 1000, height: 500 },
      image: { width: 2000, height: 1000 },
      screen: { x: 0.5, y: 0.5, width: 2, height: 2 },
    });
    expect(huge.scale).toBe(1);
  });

  it('returns the identity transform for unusable measurements', () => {
    const identity = { translateX: 0, translateY: 0, scale: 1 };
    expect(computePosterZoom({ viewport: { width: 0, height: 0 }, image: { width: 2000, height: 1000 }, screen })).toEqual(identity);
    expect(computePosterZoom({ viewport: { width: 100, height: 100 }, image: { width: NaN, height: 1 }, screen })).toEqual(identity);
    expect(computePosterZoom({})).toEqual(identity);
  });
});

describe('landing shortcuts', () => {
  // The landing's buttons dock and then run one of these. They must stay real
  // commands, or the button would land on "Command not found".
  it.each(['recruiter', 'floodfusion'])('%s is a registered, link-safe command', (cmd) => {
    expect(resolveDeepLink(cmd)).toBe(cmd);
  });
});

describe('the 3D scene stays in its lazy chunk', () => {
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const SRC = join(ROOT, 'src');
  const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : /\.jsx?$/.test(name) ? [path] : [];
    });
  const sources = walk(SRC).map((path) => ({ file: relative(ROOT, path), code: readFileSync(path, 'utf8') }));

  // three is ~133 kB gzipped. It is affordable only because nothing on the
  // critical path can reach it: one module imports it, and that module is
  // only ever loaded with a dynamic import().
  it('imports three from src/intro/orbitScene.js and nowhere else', () => {
    const importers = sources.filter(({ code }) => /from\s+['"]three(\/[^'"]*)?['"]/.test(code)).map(({ file }) => file);
    expect(importers).toEqual(['src/intro/orbitScene.js']);
  });

  it('never imports the scene module statically', () => {
    const staticImporters = sources
      .filter(({ code }) => /^\s*import\s[^;]*from\s+['"][^'"]*orbitScene(\.js)?['"]/m.test(code))
      .map(({ file }) => file);
    expect(staticImporters).toEqual([]);

    const dynamicImporters = sources
      .filter(({ code }) => /import\(\s*['"][^'"]*orbitScene(\.js)?['"]\s*\)/.test(code))
      .map(({ file }) => file);
    expect(dynamicImporters).toEqual(['src/intro/useOrbitScene.js']);
  });

  it('keeps the poster metadata in step with the rendered posters', async () => {
    const { POSTER_META } = await import('../src/intro/posterMeta.js');
    for (const name of ['landscape', 'portrait']) {
      const { width, height, screen } = POSTER_META[name];
      expect(width > 0 && height > 0, name).toBe(true);
      for (const key of ['x', 'y', 'width', 'height']) {
        expect(screen[key], `${name}.screen.${key}`).toBeGreaterThan(0);
        expect(screen[key], `${name}.screen.${key}`).toBeLessThan(1);
      }
      for (const ext of ['avif', 'webp']) {
        expect(statSync(join(SRC, `intro/assets/orbit-poster-${name}.${ext}`)).size, `${name}.${ext}`).toBeLessThan(120_000);
      }
    }
    expect(POSTER_META.portrait.height).toBeGreaterThan(POSTER_META.portrait.width);
  });
});
