/**
 * Renders the still images of the orbit scene:
 *
 *   src/intro/assets/orbit-poster-{landscape,portrait}.{avif,webp}
 *       what the landing shows before (or instead of) the live Three.js scene
 *   src/intro/posterMeta.js
 *       where the monitor's screen sits in each poster, for the zoom "fly-in"
 *   public/og-card.jpg
 *       the 1200x630 social-sharing card
 *
 * They are renders of src/intro/orbitScene.js itself, frozen at t = 0, so the
 * live scene can cross-fade over the poster without a jump. Re-run this after
 * changing anything visible in the scene:
 *
 *   PLAYWRIGHT_FROM=/path/to/a/project/with/playwright-core/package.json \
 *     node scripts/render-poster.mjs
 *
 * Needs: a Chromium binary (CHROMIUM_PATH, default /usr/bin/chromium),
 * playwright-core (resolved from PLAYWRIGHT_FROM, default this project),
 * `avifenc` and ImageMagick's `magick` on PATH. None of these are build
 * dependencies: the rendered files are committed.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'src/intro/assets');
const CHROMIUM_PATH = process.env.CHROMIUM_PATH ?? '/usr/bin/chromium';
const PLAYWRIGHT_FROM = process.env.PLAYWRIGHT_FROM ?? join(ROOT, 'package.json');

/**
 * Each poster is rendered on the quality rung the devices that see it start
 * on: landscape for desktops (with the glow pass), portrait for phones.
 */
const POSTERS = [
  { name: 'landscape', width: 1600, height: 900, quality: 'high' },
  { name: 'portrait', width: 900, height: 1800, quality: 'lite' },
];
const OG_CARD = { width: 1200, height: 630 };

const BLANK_PAGE = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&display=swap">
<style>html,body{margin:0;background:#04060c;overflow:hidden}</style></head><body></body></html>`;

/** Serves an empty page next to the app's modules, so the scene can be imported as-is. */
const blankPagePlugin = () => ({
  name: 'poster-blank-page',
  configureServer(server) {
    server.middlewares.use('/__poster', (_request, response) => {
      response.setHeader('Content-Type', 'text/html');
      response.end(BLANK_PAGE);
    });
  },
});

/** Runs in the browser: render one frozen frame and report where the screen is. */
const renderFrame = async ({ width, height, quality, card }) => {
  await Promise.all([document.fonts.load('15px "Fira Code"'), document.fonts.load('bold 40px "Fira Code"')]);
  const { createOrbitScene } = await import('/src/intro/orbitScene.js');

  const canvas = document.createElement('canvas');
  canvas.style.cssText = `position:fixed;left:0;top:0;width:${width}px;height:${height}px`;
  document.body.replaceChildren(canvas);

  const scene = await new Promise((done) => {
    const created = createOrbitScene(canvas, { quality, onReady: () => done(created) });
  });
  scene.freeze();
  // Read back in the same task as the render: the drawing buffer is still valid.
  const screen = scene.getScreenRect();

  if (!card) {
    const png = canvas.toDataURL('image/png');
    scene.dispose();
    return { screen, dataUrl: png };
  }

  // Social card: the same frame with the name set over a left-hand scrim.
  const flat = document.createElement('canvas');
  flat.width = width;
  flat.height = height;
  const ctx = flat.getContext('2d');
  ctx.drawImage(canvas, 0, 0, width, height);
  scene.dispose();

  const scrim = ctx.createLinearGradient(0, 0, width * 0.62, 0);
  scrim.addColorStop(0, 'rgba(4, 6, 12, 0.92)');
  scrim.addColorStop(0.55, 'rgba(4, 6, 12, 0.6)');
  scrim.addColorStop(1, 'rgba(4, 6, 12, 0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, width, height);

  const left = 72;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#4df08a';
  ctx.font = '22px "Fira Code"';
  ctx.fillText(card.eyebrow.toUpperCase().split('').join(' '), left, 214);
  ctx.fillStyle = '#f2f5fa';
  ctx.font = 'bold 84px "Fira Code"';
  ctx.fillText(card.title, left - 4, 318);
  ctx.fillStyle = '#c3cbd9';
  ctx.font = '27px "Fira Code"';
  card.lines.forEach((line, index) => ctx.fillText(line, left, 384 + index * 42));
  ctx.fillStyle = '#4df08a';
  ctx.font = 'bold 26px "Fira Code"';
  ctx.fillText(card.footer, left, 520);

  return { screen, dataUrl: flat.toDataURL('image/jpeg', 0.88) };
};

const decode = (dataUrl) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
const round = (value) => Number(value.toFixed(4));

const main = async () => {
  const { chromium } = createRequire(PLAYWRIGHT_FROM)('playwright-core');
  const work = mkdtempSync(join(tmpdir(), 'orbit-poster-'));

  const server = await createServer({
    root: ROOT,
    logLevel: 'error',
    plugins: [blankPagePlugin()],
    server: { port: 5199, host: '127.0.0.1' },
  });
  await server.listen();
  const origin = server.resolvedUrls.local[0].replace(/\/$/, '');

  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });

  try {
    const meta = {};
    for (const { name, width, height, quality } of POSTERS) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      await page.goto(`${origin}/__poster`);
      const { screen, dataUrl } = await page.evaluate(renderFrame, { width, height, quality });
      await page.close();

      const png = join(work, `${name}.png`);
      writeFileSync(png, decode(dataUrl));
      execFileSync('avifenc', ['-q', '58', '-s', '3', png, join(ASSETS, `orbit-poster-${name}.avif`)], { stdio: 'ignore' });
      execFileSync('magick', [png, '-quality', '80', '-define', 'webp:method=6', join(ASSETS, `orbit-poster-${name}.webp`)]);

      meta[name] = { width, height, screen: Object.fromEntries(Object.entries(screen).map(([k, v]) => [k, round(v)])) };
      process.stdout.write(`poster ${name}: ${width}x${height}, screen ${JSON.stringify(meta[name].screen)}\n`);
    }

    const page = await browser.newPage({ viewport: OG_CARD, deviceScaleFactor: 1 });
    await page.goto(`${origin}/__poster`);
    const { dataUrl } = await page.evaluate(renderFrame, {
      ...OG_CARD,
      quality: 'high',
      card: {
        eyebrow: 'Interactive portfolio',
        title: 'Teo Clerici',
        lines: ['AI & Data Science student building', 'AI for Earth observation.'],
        footer: 'teoclerici.com',
      },
    });
    await page.close();
    writeFileSync(join(ROOT, 'public/og-card.jpg'), decode(dataUrl));
    process.stdout.write('og card: public/og-card.jpg\n');

    const frozen = (value) => `Object.freeze(${value})`;
    const entry = ({ width, height, screen }) =>
      frozen(`{ width: ${width}, height: ${height}, screen: ${frozen(JSON.stringify(screen).replace(/"/g, '').replace(/([:,])/g, '$1 ').replace('{', '{ ').replace('}', ' }'))} }`);
    writeFileSync(
      join(ROOT, 'src/intro/posterMeta.js'),
      `// Generated by scripts/render-poster.mjs — do not edit by hand.\n` +
        `// \`screen\` is the monitor glass as fractions of the image (centre and size).\n` +
        `export const POSTER_META = Object.freeze({\n` +
        POSTERS.map(({ name }) => `  ${name}: ${entry(meta[name])},\n`).join('') +
        `});\n`
    );
  } finally {
    await browser.close();
    await server.close();
  }
};

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exit(1);
});
