# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Interactive terminal-style portfolio for Teo Clerici. React 19 + Vite SPA, deployed on Vercel. The entire site is one CLI: visitors type commands into a fake terminal to read the CV, trigger easter eggs, play mini-games, and chat with an AI. There is no routing and no scrolling page.

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # production bundle (manual chunking, see vite.config.js)
npm run preview    # serve the built bundle
npm run lint       # ESLint flat config (eslint.config.js)
```

There is no test suite or test runner in this repo. `npm run lint` is the only automated check — it is clean (0 errors, 0 warnings), so **keep it that way**; a noisy gate previously hid four genuinely broken commands behind 400+ errors from a committed `.vite` cache.

**Important:** `api/ask.js` is a Vercel serverless function and does **not** run under `vite dev`. To exercise the real production AI path locally, use `vercel dev` instead; otherwise `aiService.js` falls back to a direct browser call (see AI Integration below).

## Architecture

### Background rendering tiers

`src/utils/deviceTier.js` returns `'none' | 'low' | 'high'` and `App.jsx` branches on it:

- **`none`** (reduced-motion, Save-Data, ≤2 GB RAM, ≤2 cores) renders `CssFallback` — a compositor-only gradient. `FloatingLines` is never imported, so the ~123 kB gzipped `three` chunk is never fetched.
- **`low`** (coarse pointer / small viewport) gets one wave, DPR 1.25, ~30 fps.
- **`high`** gets three waves, cursor interaction and parallax.

`FloatingLines.jsx` creates its WebGL context in a **create-once effect with empty deps**; prop changes are pushed into live uniforms by a second effect. Never add props to the init effect's dependency array — that is what previously rebuilt (and leaked) the GL context on every render. Any object or array prop passed to it must have a stable identity: module-scope constants, not inline literals or default parameter objects.

The render loop is gated on `IntersectionObserver`, `visibilitychange`, and a `paused` prop that `Terminal` drives via `onOverlayChange` when a full-screen overlay opens.

### Command pipeline

The whole app funnels through `runCommand()` in `src/hooks/useTerminal.js`. Resolution order for an entered string (lowercased):

1. `commandExecutors[cmd]` — exact-match map in `src/hooks/commandExecutors.js`
2. `dynamicCommandExecutors` — ordered array of `{ match(cmd), execute(cmd, ctx) }` for prefix commands (`open `, `theme `, `calc `, `ask `, `cowsay `, `weather`, `volume`, `lang `, `sudo`)
3. `cvData[cmd]` — plain content commands (`about`, `education`, `experience`, `projects`, `skills`, …) resolve straight out of the data object with no executor
4. otherwise → "Command not found"

Executors return a result object; every field is optional:

```js
{
  outputContent: '<div>…</div>',  // raw HTML string appended to history
  shouldAnimate: true,            // false = render instantly, skip typewriter
  specialAction: () => {…},       // side effect fired before the output is pushed
  earlyReturn: true               // executor took over history/state itself; runCommand bails
}
```

`ctx` gives executors the terminal's full state surface: `newHistory`, `setHistory`, `setInputVal`, `setIsTyping`, `applyTheme`, `playSound`, `toggleLoopingSound`, `globalVolume`/`setGlobalVolume`, `setShowGame`/`setShowMatrix`/`setShowDoom`/`setShowSnake`, `commandHistory`/`setCommandHistory`, `setHistoryIndex`, `setTourQueue`.

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

Adding an executor is not enough. Also append the command name (and every alias) to `commandsList` in `src/data/cvData.js` — it drives both Tab-completion in `handleKeyDown` and the `commands` debug listing. Add it to `helpText` too if it is meant to be discoverable.

### Themes

Two places must agree: the `THEMES` map in `useTerminal.js` (sets `--accent-color` / `--terminal-bg` inline on `documentElement` plus a `data-theme` attribute) and the `[data-theme="…"]` blocks in `src/index.css` (used only for extra per-theme selectors such as `.download-cv-btn`). The inline properties are what actually recolor the terminal, so a theme works without a CSS block, but loses those extras.

### AI integration (`ask`)

The system prompt lives in `src/services/systemPrompt.js` and is shared by both paths so they cannot drift. `src/services/aiService.js` branches on `import.meta.env.DEV`:

- **prod** → `POST /api/ask` with `{ question }` **only**. The endpoint builds the system prompt server-side and ignores any model/temperature/messages from the client — accepting those made it usable as a free xAI proxy. It rate-limits per IP (8/min, in-memory, best-effort across instances) and never forwards upstream error bodies.
- **dev** → direct call to x.ai using `VITE_XAI_API_KEY` from `.env.local`. Behind `import.meta.env.DEV`, so Vite dead-code-eliminates the whole branch — verified absent from `dist/`. Use `vercel dev` to exercise the real proxy.

### Performance model

Core Web Vitals were tuned deliberately; changes here regress real metrics:

- `index.html` holds inline critical CSS, an LQIP background, AVIF/WebP preloads, and deferred Google Fonts (`media="print"` + `onload`).
- `App.jsx` lazy-loads `FloatingLines` (Three.js, ~600 KB) and `CustomCursor` behind `Suspense`; `isLowPower()` (viewport, coarse pointer, `hardwareConcurrency`) downgrades wave count, bend radius, parallax, and blend mode.
- `vite.config.js` `manualChunks` isolates `three`, `react-vendor`, and `@vercel` so nothing heavy blocks first paint.
- `OutputLine` in `Terminal.jsx` uses a custom `React.memo` comparator that permanently freezes already-finished lines.
- `Terminal.jsx` disables the SVG turbulence rAF loop on Safari and pauses it while game/matrix overlays are open.
- Cache headers live in `vercel.json`.

### SEO / AEO layer

`index.html` carries JSON-LD `Person` schema, OG/Twitter cards, and a hidden `#ai-manifesto` div aimed at LLM crawlers; `public/robots.txt` explicitly allows GPTBot / ClaudeBot / Google-Extended. When CV facts change in `src/data/cvData.js`, update these to match.

## Layout notes

- `src/data/cvData.js` (~930 lines) is the content store: CV sections, help text, ASCII art variants (`asciiArtFull` / `asciiArt` / `asciiArtMobile`, chosen by viewport width), easter-egg payloads, and `commandsList`.
- `src/hooks/commandExecutors.js` (~600 lines) is the command registry. Both files are past the usual size guidance by design — keep additions grouped with their neighbours rather than starting a parallel structure.
- `src/utils/` holds the cross-cutting helpers: `escapeHtml` (+ `sanitizeAiHtml`), `sfx` (one shared `AudioContext` — never construct your own), `storage` (never-throwing storage access), `deviceTier`.
- **Never write a ref during render** (`ref.current = value` in the component body). Use an effect, an event handler, or let a loop own the mirror; `react-hooks/refs` enforces this and the codebase is currently clean.
- `AUDIT_AND_OPTIMIZATION.md` is the standing technical audit. Phases 1–3 are done; §4 (structural refactor) and §6 (features) are the open work.
- `legacy/` is the pre-React vanilla HTML/CSS/JS version, kept for reference and not part of the build.
- `portfolio.md` is an older AI-facing context doc and is stale (it describes commands as still living inside `useTerminal.js` and lists Tab-completion, `tour`, and the command-pattern refactor as future work — all three shipped). Prefer this file.
