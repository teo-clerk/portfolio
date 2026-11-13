# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Interactive terminal-style portfolio for Teo Clerici. React 19 + Vite SPA, deployed on Vercel. The site is one CLI: visitors type commands into a fake terminal to read the CV, trigger easter eggs, play mini-games, and chat with an AI. A first visit opens on the orbit landing (`src/intro`), a conventional page with buttons that leads into the terminal. There is no routing and no scrolling page.

## Commands

```bash
npm run dev          # Vite dev server
npm run build        # production bundle; `prebuild` runs every gate below first
npm run preview      # serve the built bundle (does NOT apply vercel.json headers)
npm run lint         # ESLint flat config (eslint.config.js)
npm test             # Vitest unit tests (tests/*.test.js, Node environment, no DOM)
npm run check:vercel # compile every vercel.json route pattern the way Vercel does
npm run check:api    # load api/*.js under native Node ESM
node scripts/render-poster.mjs   # re-render the landing posters + og-card.jpg (not a build step; see its header)
```

`npm run build` runs `check:vercel`, `npm test`, `generate:cv` and `check:api` before Vite. Each gate exists because the failure it catches once shipped silently:

- **`check:vercel`** — Vercel compiles every `source` in `vercel.json` with path-to-regexp v6 before building, and a pattern it rejects fails the whole deployment while the previous build keeps serving. `"/(?:CV|cv)\\.pdf"` (a top-level group may not start with `?`) froze production from 2026-09-16 to 2026-11 without anyone noticing. Vite never reads `vercel.json`, so nothing else can see this.
- **`npm test`** — pure-logic tests: the AI sanitiser, the `calc` parser, the deep-link allow-list, the landing's decisions and the rule that `three` stays in its lazy chunk, registry integrity (every referenced `.mp3` exists, sounds play once), the CSP shape, and that CV claims which were never built stay out of the published content.
- **Lint** is clean (0 errors, 0 warnings) — **keep it that way**; a noisy gate previously hid four genuinely broken commands behind 400+ errors from a committed `.vite` cache.

**A failed Vercel deploy is silent.** After any push, check `gh api repos/teo-clerk/portfolio/commits/<sha>/status`.

**Important:** `api/ask.js` is a Vercel serverless function and does **not** run under `vite dev`. To exercise the real production AI path locally, use `vercel dev` instead; otherwise `aiService.js` falls back to a direct browser call (see AI Integration below).

## Architecture

### Background rendering tiers

`src/utils/deviceTier.js` returns `'none' | 'low' | 'high'` and `App.jsx` branches on it:

- **`none`** (reduced-motion, Save-Data, ≤2 GB RAM, ≤2 cores) renders `CssFallback` — a compositor-only gradient. `FloatingLines` is never imported, so no WebGL context is ever created.
- **`low`** (coarse pointer / small viewport) gets one wave, DPR 1.25, ~30 fps.
- **`high`** gets three waves, cursor interaction and parallax.

The background is mounted **only while the terminal is docked** (`App.jsx`). On the landing the orbit scene owns the one WebGL context, so the two never hold a context at the same time; do not move `FloatingLines` out of the docked branch.

`FloatingLines.jsx` is **raw WebGL2 with no framework** (Three.js was removed — it cost 123 kB gzipped to draw one triangle; the replacement is ~5 kB). Invariants:

- It creates its WebGL context in a **create-once effect with empty deps**; prop changes are pushed into a plain uniform-state object by a second effect and uploaded every frame. Never add props to the init effect's dependency array — that is what previously rebuilt (and leaked) the GL context on every render. Any object or array prop passed to it must have a stable identity: module-scope constants, not inline literals or default parameter objects.
- Geometry is **one oversized clip-space triangle** (`[-1,-1, 3,-1, -1,3]`), not a quad — no diagonal seam, no matrices, no vertex data beyond that buffer.
- The shader source is **GLSL ES 1.00** (`attribute`, `gl_FragColor`, no `#version 300 es`) so the same string compiles on the `webgl2` context and on the `webgl` fallback. That rules out ES 3.00-only features: integer `min`/`max`, and indexing a uniform array with anything but a constant or loop counter (see `getLineColor`). Three.js used to hide this by prepending `#version 300 es` on WebGL2, so the old "WebGL1-portable" shader never actually was.
- `createPipeline(gl)` compiles/links, creates the VBO and **caches every uniform location**; `drawFrame` only ever uses those cached locations. On `webglcontextrestored` every GL object is invalid, so the pipeline **must** be rebuilt with `createPipeline`, never reused.
- Teardown deletes buffer/shaders/program and then calls `WEBGL_lose_context.loseContext()` — browsers cap ~16 live contexts and a detached canvas keeps its context alive until GC.
- Time is wall-clock (`performance.now() - t0`), so it keeps advancing while paused/hidden and never jumps on resume.

The render loop is gated on `IntersectionObserver`, `visibilitychange`, and a `paused` prop that `Terminal` drives via `onOverlayChange` when a full-screen overlay opens.

### Orbit landing (`src/intro`)

`App.jsx` holds one piece of state, `session = { view: 'orbit' | 'terminal', command }`. `shouldShowIntro()` decides the starting view: the landing, unless the URL has `?cmd=` or this tab has already docked (sessionStorage `booted`). `Terminal` is mounted only while docked, so every dock starts a fresh terminal.

- **`Landing.jsx`** is real HTML and must stay usable with no JS-driven visuals: `<h1>`, the role line, buttons **Enter terminal** / **60-second summary** (docks, then runs `recruiter`) / **Read the CV** (`/cv`) / **Download PDF**, a FloodFusion link (docks, then runs `floodfusion`) and, once the scene is live, **Explore the solar system**. Enter docks only from the home view. The backdrop is a still poster on every device.
- **`scenePolicy.js`** (pure, tested) decides how much 3D a device gets. `getIntroMode(tier, { hasFailed })` returns `'scene'` for `high` and `low` (live Three.js over the poster), `'poster'` once the scene has given up in this tab (poster plus a CSS zoom; no WebGL), and `'static'` for `none` (poster, no animation, instant cut). The live scene starts on a quality rung (`high` on desktops: glow pass, 4k Earth, DPR 2; `lite` on phones: no glow, 2k Earth, DPR 1.5, 30 fps at rest; `minimal` below that). After going live the scene samples frame intervals (at least 1.5 s and six frames, at most 6 s; `isAssessmentComplete`) and `assessFrames()` judges the median: keep, step down a rung (pixel ratio, glow and frame cap change; the Earth map and noise octaves stay those of the starting rung), or give up, which writes sessionStorage `orbit-fallback` and shows the poster for the rest of the session, including after `exit`. Long frames count as evidence; a hidden tab is not part of any check and starts it over. Every limit is above 33.3 ms, so a 30 Hz display keeps its rung.
- **`three` is imported only by `orbitScene.js` and `src/intro/scene/*`**, and that code is reached only through the dynamic `import()` in `useOrbitScene.js`, which waits for first contentful paint. Phones now download it too (for the lite scene), but never before a paint. The glow pass (`scene/postfx.js`, three's EffectComposer) is a further dynamic import from `orbitScene.js`, on the `high` rung only, so phones never request it. `tests/introState.test.js` enforces all of this, plus the texture budgets. Do not import `three`, `orbitScene` or `scene/*` statically from anywhere else, and do not add React Three Fiber.
- **`orbitScene.js`** is the entry point (renderer, loop, input, flights, public API `dock` / `enterMap` / `exitMap` / `focusStop` / `freeze` / `dispose`); the pieces live in `scene/` (`earth`, `sky`, `workstation`, `satellite`, `solarSystem`, `bodyMaterial`, `cameraRig`, `postfx`, `layout`). It follows the `FloatingLines` rules: one context per mount, no rendering while hidden, clamped DPR, every geometry, material, texture (including those held only as shader uniforms), render target and the composer disposed, then `forceContextLoss()`. Bodies are custom `ShaderMaterial`s that end with three's `tonemapping_fragment` / `colorspace_fragment` includes; the Milky Way is baked once into a texture. Image textures are NASA public domain, listed in `assets/CREDITS.md`; add any new one there.
- **One world, compressed scale** (`scene/layout.js`): the workstation is at the origin, the Earth (radius 26) below it, and the Sun 400 units away along the direction the home light already came from, so pulling back from the workstation to the whole system is one continuous camera move. The camera rig interpolates distance in log space and refits near/far every frame. Planets orbit only while the map is open; at home everything is at t = 0.
- **`stops.js`** maps the Sun and the eight planets to CV sections (Mars = `projects`, Jupiter = `experience`, …). `SolarMap.jsx` (lazy, loaded once the scene is live) renders the stop strip, the labels and the panel; panel text is `cvData` cleaned by `src/utils/sectionHtml.js`, the same cleaner `scripts/generate-cv.mjs` uses for `/cv`, so there is no second copy of any CV fact. **Open in terminal** and in-panel command buttons go through `resolveDeepLink()`; `tests/solarMap.test.js` checks every stop's sections exist and pass it. Keyboard: Tab, Enter, ← → between stops, Esc closes the panel, then the map.
- **The poster is a render of the scene at t = 0** (`scripts/render-poster.mjs` → `src/intro/assets/orbit-poster-*`, `posterMeta.js`, `public/og-card.jpg`). Every motion in the scene is zero at t = 0 and the star field is seeded, so the live scene cross-fades over the poster without a jump. Landscape and the OG card render on the `high` rung, portrait on `lite`, matching who sees them; anything that differs between rungs must not change the picture (that is why the clouds use the same shader on every rung, and only the octave count changes). After changing anything visible in the scene, re-run the script and commit the images; never use `Math.random()` in the scene.
- **Four places share the 23/20 portrait split**: `PORTRAIT_MAX_ASPECT` (scene camera, home and map framing), the `<source media>` queries in `Landing.jsx`, `intro.css` and `solarMap.css`. The portrait poster is anchored `object-position: center top`, and `Landing.jsx` passes the same anchor to `computePosterZoom()`.
- **Docking**: `Landing` runs the fly-in (camera move from wherever the camera is: `SCENE_DOCK_MS` from home, `MAP_DOCK_MS` from the map; or the poster zoom), then calls `onDock(command)`; `App` swaps the views under a short veil in the monitor's colour. **Undocking** (`exit` / `quit` → `ctx.onUndock`) always happens in a later task, never inside the keydown that ran the command: the landing focuses its primary button and listens for Enter, so mounting it synchronously let the same key press dock straight back in.
- The old full-screen `BootSequence` is gone. Its lines (`src/data/bootLines.js`) type out on the 3D monitor during the fly-in.

### Command pipeline

The whole app funnels through `runCommand()` in `src/hooks/useTerminal.js`, which calls `resolveCommand(lowercasedInput)` from `src/commands/registry.js`:

1. `registry` — a `Map` of exact names (and aliases) built from the category modules: `content.commands.js` (CV sections, bodies come from `cvData`), `cv.commands.js`, `actions.commands.js`, `terminal.commands.js`, `eastereggs.commands.js`
2. `dynamicRegistry` — the ordered array in `dynamic.commands.js` of `{ match(cmd), runDynamic(cmd, ctx) }` for commands with arguments (`man`, `open`, `theme <name>`, `sudo`, `calc`, `ask`, `cowsay`, `weather`, `volume`, `lang`)
3. otherwise → "Command not found"

`match()` receives the lowercased input, but `runDynamic()` receives it **as typed** (so `ask` and `cowsay` keep their capitals). A command whose argument is a keyword must strip its prefix case-insensitively and lowercase the rest (`keywordArg()`): phone keyboards capitalise the first letter, and `Open linkedin` used to fail. Matchers use `isCommand()` so `sudo` does not also swallow `sudoku`.

Never look user input up in an object literal (`links[target]`, `THEMES[name]`): `({})['constructor']` is truthy. Use a `Map`, as `OPEN_TARGETS` and `src/utils/themes.js` do.

Executors return a result object; every field is optional:

```js
{
  outputContent: '<div>…</div>',  // raw HTML string appended to history
  shouldAnimate: true,            // false = render instantly, skip typewriter
  specialAction: () => {…},       // side effect fired before the output is pushed
  earlyReturn: true               // executor took over history/state itself; runCommand bails
}
```

`ctx` gives executors the terminal's full state surface: `newHistory`, `setHistory`, `setInputVal`, `setIsTyping`, `applyTheme`, `playSound`, `toggleLoopingSound`, `globalVolume`/`setGlobalVolume`, `setShowGame`/`setShowMatrix`/`setShowDoom`/`setShowSnake`, `commandHistory`/`setCommandHistory`, `setHistoryIndex`, `setTourQueue`, `onUndock` (leave the terminal for the landing; used by `exit`).

### Async commands

`ask` and `weather` follow a fixed pattern — do not deviate when adding another async command:

1. push a placeholder entry with a unique `id` into `ctx.newHistory`, commit it with `ctx.setHistory`, clear input, `setIsTyping(true)`
2. `return { earlyReturn: true }`
3. when the promise resolves, patch that entry immutably: `setHistory(cur => cur.map(i => i.id === id ? { ...i, content, isAnimated: true } : i))` and `setIsTyping(true)` again

### Output is HTML strings

All terminal output is raw HTML rendered via `dangerouslySetInnerHTML` (static lines) or walked node-by-node by `useTypewriter`. Consequences:

- **Clickable commands** are `<span class="command-highlight" data-cmd="help">help</span>`. `handleWrapperClick` in `Terminal.jsx` reads `data-cmd` and re-enters `runCommand`. Use this instead of any onClick handler.
- **ASCII art must be wrapped in `class="ascii-art"`.** `useTypewriter` deliberately dumps `.ascii-art` innerHTML in one shot rather than typing it character-by-character; typing large art previously froze the browser.
- **Escape everything user-derived.** Use `escapeHtml()` from `src/utils/escapeHtml.js` at every interpolation site — unescaped input previously executed via `<img onerror>`. AI replies go through `sanitizeAiHtml()`, which allow-lists only `strong/em/b/i/br/code`.
- Watch escaping in these template literals: `\\s` in a regex matches a literal backslash, not whitespace, and `\\n` renders as the visible characters `\n`. Both shipped as real bugs.

### Registering a new command

Add one object to the right category module in `src/commands/` (contract in `types.js`). `commandsList` (Tab-completion, the `commands` listing) and the `help` screen are derived from the modules in `registry.js`, so there is no second list to update. A command appears in `help` when it has a `description`; registering the same name twice throws in development. CV sections are one line: `fromCvData('name', 'description', ['alias'])` plus the `cvData` key — and add the key to `SECTIONS` in `scripts/generate-cv.mjs` if it belongs on the static `/cv` page.

### Deep links

`?cmd=<command>` skips the landing and runs a command on arrival, through `resolveDeepLink()` in `src/commands/deepLink.js`. `App.jsx` reads the parameter and hands the result to the terminal as `initialCommand`; `useTerminal` validates it again, because the landing's shortcut buttons use the same prop. A link is written by a third party, so the command is untrusted: only exact registry commands with `category: 'cv'`, plus `help`, `tour` and `recruiter`, are allowed. Pattern commands are never allowed — `?cmd=ask …` used to fire a billed AI request with attacker-chosen text. Do not widen the list to anything with a side effect.

### Terminal input and the typing state

`isTyping` is true while output is being typed or an async command is pending. The input is deliberately **not** `disabled` during that time (that dropped focus on every command and closed the on-screen keyboard on phones); instead `handleKeyDown` / `handleInputChange` in `useTerminal.js` swallow input, and a printable key, Enter or Escape skips the typewriter.

A line reports completion through `handleLineComplete(id)` in `Terminal.jsx`, which has a stable identity and reads history through a ref. Keep it that way: `OutputLine`'s memo comparator freezes finished lines, so a line holds the callback from the render that created it, and a closure over `history` goes stale (the welcome line used to clear the typing state under whatever command ran before it finished).

### Themes

Two places must agree: the `THEMES` map in `src/utils/themes.js` (applied by `applyTheme` in `useTerminal.js`, which sets `--accent-color` / `--terminal-bg` inline on `documentElement` plus a `data-theme` attribute) and the `[data-theme="…"]` blocks in `src/index.css` (used only for extra per-theme selectors such as `.download-cv-btn`). The inline properties are what actually recolor the terminal, so a theme works without a CSS block, but loses those extras.

### AI integration (`ask`)

The system prompt lives in `src/services/systemPrompt.js` and is shared by both paths so they cannot drift. It embeds the CV as plain text (`htmlToText()` over `cvData`), so it follows content changes automatically; `api/ask.js` imports it under native Node ESM, so every relative import in that chain needs an explicit `.js` extension. `src/services/aiService.js` branches on `import.meta.env.DEV`:

- **prod** → `POST /api/ask` with `{ question }` **only**. The endpoint builds the system prompt server-side and ignores any model/temperature/messages from the client — accepting those made it usable as a free xAI proxy. It rate-limits per IP (8/min, in-memory, best-effort across instances) and never forwards upstream error bodies.
- **dev** → direct call to x.ai using `VITE_XAI_API_KEY` from `.env.local`. Behind `import.meta.env.DEV`, so Vite dead-code-eliminates the whole branch — verified absent from `dist/`. Use `vercel dev` to exercise the real proxy.

### Performance model

Core Web Vitals were tuned deliberately; changes here regress real metrics:

- `index.html` holds inline critical CSS, an LQIP background, AVIF preloads for the landing's poster (one per composition, behind `media` queries; Vite rewrites the `/src/...` paths to the hashed files), and deferred Google Fonts (`media="print"`, switched to `all` from `src/main.jsx` once loaded — not an inline `onload`, which the CSP forbids).
- The terminal's hero photo (`bg-hero.*`, ~200 kB) is a CSS background gated on `html[data-hero]`, which `App.jsx` sets when docked, or a few seconds into the landing. A first visit therefore does not fetch it up front; do not put it back in an unconditional `body` rule or a preload.
- `App.jsx` lazy-loads `FloatingLines` (raw WebGL2, ~15 kB raw / ~5 kB gzip) and `CustomCursor` behind `Suspense`; `isLowPower()` (viewport, coarse pointer, `hardwareConcurrency`) downgrades wave count, bend radius, parallax, and blend mode.
- `vite.config.js` `manualChunks` isolates `react-vendor` and `@vercel` so nothing heavy blocks first paint. `vendor-three` exists again, but only behind the landing's dynamic import (see Orbit landing); three's postprocessing and shader modules are kept out of it so they ride in the lazy `postfx` chunk. The terminal's background stays raw WebGL2 — do not use `three` for it, and do not let `three` onto the critical path.
- `OutputLine` in `Terminal.jsx` uses a custom `React.memo` comparator that permanently freezes already-finished lines.
- `Terminal.jsx` disables the SVG turbulence rAF loop on Safari and pauses it while game/matrix overlays are open.
- Cache headers and rewrites live in `vercel.json`. Static hashed assets are immutable-cached (1 yr), while `index.html`, `cv.html`, and `CV.pdf` (`public, max-age=0, must-revalidate`) ensure immediate freshness on redeploy without stale browser caching. `/CV.pdf` (and rewritten `/cv.pdf`) also sends `Content-Disposition: attachment; filename="Teo_Clerici_CV.pdf"` so direct visits trigger an automatic download.

### Security headers

`vercel.json` sends a Content-Security-Policy on every route: `script-src 'self'` with no `'unsafe-inline'` and no `'unsafe-eval'`. That is why there are no inline event handlers in `index.html` or the generated `/cv` page, and why `calc` uses the parser in `src/utils/calc.js` rather than `eval`/`new Function` — do not reintroduce either. `style-src` allows `'unsafe-inline'` because terminal output is HTML strings full of `style=""` attributes. Adding a third-party origin (a fetch, an iframe, a font) means adding it to the matching directive, and `tests/deployConfig.test.js` pins the current list. `vite preview` does not send these headers; test the policy on a Vercel preview deployment.

Third-party iframes (`doom`, `map`) are sandboxed, and every `target="_blank"` link carries `rel="noopener noreferrer"` (enforced by a test).

### SEO / AEO layer

`index.html` carries JSON-LD `Person` schema and OG/Twitter cards; `public/robots.txt` explicitly allows GPTBot / ClaudeBot / Google-Extended. Machine-readable CV facts live in the JSON-LD only — a hidden `#ai-manifesto` div once carried keyword text aimed at LLM crawlers and was deleted as cloaking (audit §5.3); do not reintroduce hidden crawler-only text. When CV facts change in `src/data/cvData.js`, update the JSON-LD (`alumniOf`, `worksFor`, `knowsAbout`, `knowsLanguage`) and the OG/Twitter/meta descriptions to match — job titles in particular must not drift from the CV.

## Layout notes

- `src/data/cvData.js` (~740 lines) is the content store: CV sections, ASCII art variants (`asciiArtFull` / `asciiArt` / `asciiArtMobile`, chosen by viewport width) and easter-egg payloads; `src/data/randomArt.js` holds the `randomart` pool. CV facts come from the owner's knowledge base and dated CVs, not from this repo: work that was planned but not built must not be listed (a test guards the known cases).
- `src/intro/` is the orbit landing (see Orbit landing). `introState.js`, `scenePolicy.js` and `stops.js` hold its pure, unit-tested decisions and data; keep DOM and `three` out of them.
- `src/commands/` is the command registry (see Command pipeline). `cvData.js` and `eastereggs.commands.js` are past the usual size guidance by design — keep additions grouped with their neighbours rather than starting a parallel structure.
- `src/utils/` holds the cross-cutting helpers: `escapeHtml` (+ `sanitizeAiHtml`), `htmlToText` (prompt formatting only, not a sanitiser), `calc`, `themes`, `sfx` (one shared `AudioContext` — never construct your own), `storage` (never-throwing storage access), `deviceTier`.
- **Never write a ref during render** (`ref.current = value` in the component body). Use an effect, an event handler, or let a loop own the mirror; `react-hooks/refs` enforces this and the codebase is currently clean.
- `AUDIT_AND_OPTIMIZATION.md` is the standing technical audit (August 2026) with dated addenda for the November 2026 audit and the orbit landing (v1, then v2: the solar system). Open work: the §4 feature-folder migration and the §6 ideas. The file contains a few NUL bytes, so `grep` treats it as binary: use `grep -a`.
- `legacy/` is the pre-React vanilla HTML/CSS/JS version, kept for reference and not part of the build.
- `portfolio.md` (an older AI-facing context doc) was deleted in favour of this file — every section it carried was either stale or already covered here. It is in git history if you need it; do not recreate a parallel context doc.
