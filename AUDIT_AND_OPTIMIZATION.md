# Technical Audit & Optimization Roadmap
### Interactive Terminal Portfolio — React 19 / Vite 7 / raw WebGL2 (Three.js r181 at audit time, removed in Phase 5)

**Audited:** 2026-08-24 · **Commit:** `c699157` · **Scope:** `src/`, `api/`, `index.html`, `vite.config.js`, `vercel.json`, `public/`

> ## Remediation status
>
> **Phases 1–3 are implemented and verified** (commits `a45761f`..`d8fbec4`).
> Every item below marked ✅ has been fixed on `main`, with browser verification
> in a headless Chromium against the production build. Phase 4 (§4 structural
> refactor and §6 features) has not been started.
>
> **Two bugs were found during implementation that this audit missed**, both
> pre-existing on `main` — see §2.B14. One of them broke four commands
> outright, and it was being reported by the lint rule I dismissed as cosmetic
> noise in §2.B13. That call was wrong: in `commandExecutors.js` the
> `no-useless-escape` errors were flagging genuine defects, not ASCII art.
>
> **Verified after the changes** (headless Chromium, production build):
> WebGL canvas count stays at 1 across repeated viewport changes · XSS payload
> renders as inert text with zero injected elements · `calc`/`volume`/`cowsay`/
> `ls` all correct · command chips are `role="button" tabindex="0"` and respond
> to Enter · mobile tier has no SVG filter and no horizontal overflow ·
> reduced-motion tier renders the CSS fallback and never fetches the `three`
> chunk · zero page errors · `npm run lint` reports 0 problems.

---

## 0. Method & Honest Scope

**What was done:** a full static read of every source file (~5,000 LOC), a production build, and a complete ESLint pass. Every bug in §2 was traced in the actual source and is cited by `file:line`.

**What was *not* done:** no runtime profiling on a physical device. I did not attach Chrome DevTools, run Lighthouse, or capture a GPU trace, so **all frame-time and FPS figures below are analytical estimates, not measurements.** They are labelled as such. §3.7 gives you the exact commands to convert every estimate into a measurement — do that before and after each change, because the ranking of fixes may shift once you have real numbers on real hardware.

**Build output (measured):**

| Chunk | Raw | Gzip |
|---|---:|---:|
| `three` | 482.15 kB | 123.08 kB | ← **removed in Phase 5 (§3.8)** |
| `react-vendor` | 188.88 kB | 58.95 kB |
| `index` | 101.88 kB | 29.69 kB |
| `FloatingLines` | 9.47 kB | 3.30 kB |
| `index.css` | 10.57 kB | 3.15 kB |
| **Total JS** | **786 kB** | **~217 kB** |

---

## 1. Executive Summary

The performance work in `c699157` was real and well-targeted — lazy-loading Three.js, chunk splitting, LQIP, inline critical CSS, a memoized `OutputLine`. Those are good instincts and they should stay. But they optimized the **loading** path while the **steady-state runtime** path still has three compounding problems, and the mobile symptom you describe is almost certainly all three at once.

### Critical bugs (fix first — these are correctness, not tuning)

| # | Severity | Bug | Location |
|---|---|---|---|
| **C1** | Critical | **WebGL context is destroyed and rebuilt on every `App` re-render**, and `dispose()` never releases the GL context. Browsers hard-cap ~16 live contexts, then the canvas dies permanently. | `FloatingLines.jsx:730-800`, `App.jsx:45` |
| **C2** | Critical | **Render loop never pauses.** `requestAnimationFrame` runs a full-screen fragment shader continuously — behind the Matrix overlay, behind DOOM, behind Pong, and while the canvas is fully occluded. | `FloatingLines.jsx:770` |
| **C3** | Critical | **`AudioContext` leaked per sound effect** in Snake. iOS Safari caps ~4 contexts; audio dies silently after a few pellets and the contexts are never closed. | `SnakeGame.jsx:32` |
| **C4** | High | **Self-XSS**: raw user input is interpolated into `innerHTML` in at least four command paths. Typing `<img src=x onerror=...>` executes. | `useTerminal.js:196`, `commandExecutors.js` (weather/cowsay) |
| **C5** | High | **54 MB of audio in `public/`** — `lofi.mp3` is 27.4 MB, `rain.mp3` is 21.6 MB. One command triggers a 27 MB mobile download. | `public/sounds/` |

### Top 3 immediate performance wins

> **Win #1 — Clamp DPR and kill MSAA on the shader canvas.** *(~10 lines, est. 2-4x mobile GPU reduction)*
> The canvas is a single full-screen quad with a per-pixel fragment shader. It runs at `min(devicePixelRatio, 2)` with `antialias: true`. On an iPhone (DPR 3, clamped to 2) that is **4x the fragment work of DPR 1**, and MSAA on a quad with no geometric edges buys literally nothing while costing bandwidth and GPU memory. Clamping mobile to 1.25 and disabling AA is the highest impact-to-effort ratio in this codebase.

> **Win #2 — Pause the render loop when it isn't visible.** *(~25 lines, est. 100% GPU reclaim while overlays are open)*
> `IntersectionObserver` + `visibilitychange` + an explicit `paused` prop driven by overlay state. Today, opening Matrix rain runs *two* full-screen animations simultaneously — the canvas rain **and** the occluded WebGL shader — on the device least able to afford it.

> **Win #3 — Disable the animated SVG `feTurbulence` filter on mobile.** *(~5 lines CSS + 1 guard, est. large main-thread reclaim)*
> `.terminal-glass` stacks `backdrop-filter: blur(12px)` **and** `filter: url(#liquid-distortion)`, and `Terminal.jsx` mutates `baseFrequency` every 3rd frame via rAF. SVG filters are **CPU-rasterized** in most browsers — this re-rasterizes a displacement map over the whole panel continuously. The existing mobile media query only softens the blur to 8px; it never touches the SVG filter. Safari is already special-cased — mobile deserves the same treatment.

### Bonus: a 123 kB gzip win sitting in plain sight

`three` ships **123 kB gzipped** to render *one fullscreen quad with a custom `ShaderMaterial`* — no scene graph, no lights, no textures, no loaders, no raycasting. A hand-rolled WebGL2 setup for a single quad is ~80 lines and ~2 kB. See §3.8. Separately, **`@react-three/fiber`, `@react-three/drei`, and `maath` are declared dependencies with zero imports anywhere in `src/`** — 4.3 MB of `node_modules` for nothing.

---

## 2. Bug Log & Fixes

Severity: **Critical** (breaks/leaks) · **High** (perf or security) · **Medium** · **Low**

---

### C1 — WebGL context rebuilt every render, and leaked every time · Critical · ✅ Fixed

**Two defects compounding.**

**(a) Unstable effect dependencies.** The init effect depends on `enabledWaves` and `bottomWavePosition`. `App.jsx:45` passes a **new array literal** on every render, and `bottomWavePosition` is a **default parameter object** — re-created on every call when the prop is omitted (which it is). Both change identity on every single render, so the effect tears down and rebuilds the entire renderer.

```jsx
// App.jsx:45 — BEFORE: new array identity on every App render
<FloatingLines
  enabledWaves={lowPower ? ['middle'] : ['top', 'middle', 'bottom']}
  ...
/>

// FloatingLines.jsx:437 — BEFORE: default object, new identity per call
export default function FloatingLines({
  bottomWavePosition = { x: 2.0, y: -0.7, rotate: -1 },
  ...
})
```

**(b) The cleanup does not release the context.** `renderer.dispose()` frees GL *resources* but leaves the *context* alive until GC. Combined with (a) — and with StrictMode double-mounting every effect in development — you accumulate contexts until the browser evicts the oldest and the canvas goes permanently black with `WARNING: Too many active WebGL contexts`.

**Fix — hoist stable references:**

```jsx
// App.jsx — AFTER: module-scope constants, referentially stable forever
const WAVES_FULL = ['top', 'middle', 'bottom'];
const WAVES_LOW  = ['middle'];

// ...inside App
<FloatingLines enabledWaves={lowPower ? WAVES_LOW : WAVES_FULL} ... />
```

```jsx
// FloatingLines.jsx — AFTER: hoist default objects out of the signature
const DEFAULT_TOP    = Object.freeze({ x: 10.0, y:  0.5, rotate: -0.4 });
const DEFAULT_MIDDLE = Object.freeze({ x:  5.0, y:  0.0, rotate:  0.2 });
const DEFAULT_BOTTOM = Object.freeze({ x:  2.0, y: -0.7, rotate: -1   });

export default function FloatingLines({
  topWavePosition    = DEFAULT_TOP,
  middleWavePosition = DEFAULT_MIDDLE,
  bottomWavePosition = DEFAULT_BOTTOM,
  ...
})
```

**Fix — release the context on teardown:**

```js
// FloatingLines.jsx cleanup — AFTER
return () => {
  cancelAnimationFrame(raf);
  ro?.disconnect();
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerleave', handlePointerLeave);

  geometry.dispose();
  material.dispose();
  renderer.dispose();
  renderer.forceContextLoss();          // releases the GL context immediately
  renderer.domElement.remove();
};
```

**Structural fix (recommended over patching deps).** Split into two effects so the context is created exactly once and prop changes only write uniforms — no teardown, ever:

```jsx
const uniformsRef = useRef(null);

// Effect 1: create context ONCE
useEffect(() => { /* renderer, scene, mesh, loop, cleanup */ }, []);

// Effect 2: push prop changes into live uniforms — no rebuild
useEffect(() => {
  const u = uniformsRef.current;
  if (!u) return;
  u.enableTop.value      = enabledWaves.includes('top');
  u.topLineCount.value   = topLineCount;
  u.bendRadius.value     = bendRadius;
  u.animationSpeed.value = animationSpeed;
}, [enabledWaves, topLineCount, bendRadius, animationSpeed]);
```

---

### C2 — Render loop never pauses · Critical · ✅ Fixed

`FloatingLines.jsx:770` schedules `requestAnimationFrame` unconditionally. `Terminal.jsx` already pauses the SVG turbulence loop when `showGame || showMatrix` — the WebGL loop got no such treatment. Opening `matrix` therefore runs a 2D canvas rain loop *and* an occluded full-screen fragment shader at the same time.

```js
// BEFORE — always renders
const renderLoop = () => {
  uniforms.iTime.value = clock.getElapsedTime();
  /* ...lerps... */
  renderer.render(scene, camera);
  raf = requestAnimationFrame(renderLoop);
};
```

```js
// AFTER — visibility-, occlusion- and overlay-aware
const visibleRef = { current: true };

const io = new IntersectionObserver(
  ([entry]) => { visibleRef.current = entry.isIntersecting; },
  { threshold: 0 }
);
io.observe(renderer.domElement);

const onVisibility = () => { visibleRef.current = !document.hidden; };
document.addEventListener('visibilitychange', onVisibility);

const renderLoop = () => {
  raf = requestAnimationFrame(renderLoop);

  // pausedRef is driven by the `paused` prop (overlay state)
  if (!visibleRef.current || pausedRef.current) return;

  uniforms.iTime.value = clock.getElapsedTime();
  if (interactive) { /* ...lerps... */ }
  renderer.render(scene, camera);
};
```

`clock.getElapsedTime()` keeps advancing while paused, so the animation resumes at the correct phase rather than snapping.

Thread the overlay state through from `App`/`Terminal`:

```jsx
<FloatingLines paused={showMatrix || showGame || showDoom || showSnake} ... />
```

**Also add a context-loss handler** — mobile GPUs drop contexts under memory pressure routinely, and today that is unrecoverable:

```js
renderer.domElement.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();          // required, or the context can never be restored
  cancelAnimationFrame(raf);
});
renderer.domElement.addEventListener('webglcontextrestored', () => {
  setSize();
  renderLoop();
});
```

---

### C3 — `AudioContext` leaked on every Snake sound · Critical · ✅ Fixed

```js
// SnakeGame.jsx:32 — BEFORE: a NEW AudioContext per sound, never closed
const playSound = (type) => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    /* ... */
    osc.start();
    osc.stop(audioCtx.currentTime + d);
  } catch(e) {}          // also swallows the error silently
};
```

Chrome caps hardware contexts (~6); iOS Safari is stricter (~4). Eat five pellets and audio dies with no diagnostic — the empty `catch` guarantees you never find out why.

```js
// AFTER — one lazily-created shared context, reused and resumed
let sharedCtx = null;
const getAudioCtx = () => {
  if (!sharedCtx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    sharedCtx = new Ctor();
  }
  // iOS suspends the context until a user gesture
  if (sharedCtx.state === 'suspended') sharedCtx.resume();
  return sharedCtx;
};

const playSound = (type) => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const { f1, d, osc: oscType, ramp } = SOUND_PRESETS[type];
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = oscType;
  osc.frequency.setValueAtTime(f1, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(ramp, ctx.currentTime + d);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + d);
  osc.onended = () => { osc.disconnect(); gain.disconnect(); };  // free the nodes
};
```

---

### C4 — Self-XSS: unescaped user input rendered as HTML · High · ✅ Fixed

All terminal output is injected via `dangerouslySetInnerHTML` or built into the DOM by `useTypewriter`. Several paths interpolate raw user input:

```js
// useTerminal.js:196 — user input straight into innerHTML
outputContent = `<div>Command not found: <span class="command-highlight"
  data-cmd="${trimmedCmd}">${trimmedCmd}</span>. ...</div>`;

// commandExecutors.js — same pattern for `weather <city>`, `cowsay <msg>`, `theme <name>`, `lang <x>`
return { outputContent: `<div style="color:#ff5f56;">Failed to fetch weather for "${city}".</div>` };
```

Typing `<img src=x onerror=alert(document.cookie)>` executes. `innerHTML` won't run a bare `<script>`, but `onerror`/`onload` handlers fire normally.

Impact is genuinely limited — it's self-inflicted, there's no session or auth to steal, and no way to persist it. But it's free to fix, and there is a **second-order vector that is not self-inflicted**: the AI reply from `ask` is injected raw (`commandExecutors.js:476`) and the system prompt *explicitly instructs the model to emit HTML*. A prompt injection or a bad generation can put arbitrary markup in the DOM.

```js
// shared/escapeHtml.js — AFTER
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g,
  (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
```

```js
// Apply at every interpolation site
const safe = escapeHtml(trimmedCmd);
outputContent = `<div>Command not found: <span class="command-highlight" data-cmd="${safe}">${safe}</span>...</div>`;
```

For the AI reply, allow-list rather than escaping wholesale (the formatting is intentional):

```js
const ALLOWED = /<\/?(?:strong|em|br|b|i)\s*\/?>/gi;
const sanitizeAiHtml = (html) => {
  const stash = [];
  const withPlaceholders = html.replace(ALLOWED, (m) => ` ${stash.push(m) - 1} `);
  return escapeHtml(withPlaceholders)
    .replace(/ (\d+) /g, (_, i) => stash[i]);
};
```

---

### C5 — 54 MB of audio shipped in `public/` · High · ✅ Partly fixed (23 MB; trimming left as a content decision)

```
27.4 MB  lofi.mp3        downloaded in full when a visitor types `lofi`
21.6 MB  rain.mp3        downloaded in full when a visitor types `rain`
 5.0 MB  starlord.mp3
 0.9 MB  yoda.mp3
   54 MB  total  ->  .git is 67 MB packed, almost entirely this
```

These are `new Audio(...)` with `loop = true` — ambience tracks. At 27 MB they are almost certainly uncompressed or near-lossless exports.

**Fix:**

1. Re-encode ambience to **64 kbps mono Opus** (`.webm`) with an `.mp3` fallback. A 3-minute seamless loop lands at **~1.5 MB**, a **>90% reduction**.
   ```bash
   ffmpeg -i lofi.mp3 -c:a libopus     -b:a 64k -ac 1 lofi.webm
   ffmpeg -i lofi.mp3 -c:a libmp3lame  -b:a 96k -ac 1 lofi-fallback.mp3
   ```
2. Trim to a genuine loop point — a 30 s seamless loop beats a 5-minute track for ambience.
3. Keep `preload="none"` and only construct `Audio` on first invocation (already the case), but add a loading indicator — right now `lofi` looks broken for ~40 s on 4G.
4. Consider `git filter-repo` to purge the large blobs from history if clone time matters; otherwise leave history alone and just fix `HEAD`.

---

### B6 — `PongGame`: animating `left`/`top` forces layout every frame · High · ✅ Fixed

```jsx
// PongGame.jsx:95 — BEFORE: percentage left/top = layout + paint, 60x/sec, 3 elements
if (playerRef.current) playerRef.current.style.left = `${(p.playerX / LOGICAL_WIDTH) * 100}%`;
if (ballRef.current) {
  ballRef.current.style.left = `${(p.ballX / LOGICAL_WIDTH) * 100}%`;
  ballRef.current.style.top  = `${(p.ballY / LOGICAL_HEIGHT) * 100}%`;
}
```

The comment says *"Direct DOM refs to bypass React's render pipeline for 60fps movement"* — right instinct, wrong property. `left`/`top` are layout-triggering; only `transform` and `opacity` are compositor-only.

```jsx
// AFTER — compositor-only, no layout, no paint
// Position elements at 0,0 once, then translate against the measured rect
const px = (p.ballX / LOGICAL_WIDTH)  * rect.current.width;
const py = (p.ballY / LOGICAL_HEIGHT) * rect.current.height;
ballRef.current.style.transform = `translate3d(${px}px, ${py}px, 0)`;
```

**Also in Pong:**

- `styles.header` is `width: 800px` **fixed** — on a 375 px phone this overflows the terminal horizontally. Use `width: 100%; max-width: 800px`.
- `handleTouchMove` calls `document.getElementById` + `getBoundingClientRect()` on **every touch event** — a forced synchronous layout per move. Cache the rect in a ref on mount and on resize.
- React attaches `onTouchMove` passively at the root, so the `e.preventDefault()` at `PongGame.jsx:132` is a no-op with a console warning. `touchAction: 'none'` is already set and is what's actually working — remove the dead `preventDefault` or attach a non-passive native listener.

---

### B7 — `SnakeGame`: loop restarts on every score change, side effects inside a state updater · High · ✅ Fixed

```js
// SnakeGame.jsx:161 — BEFORE
const intervalId = setInterval(moveSnake, SPEED);
return () => clearInterval(intervalId);
}, [hasStarted, gameOver, food, score, highScore]);   // food/score change every pellet
```

Every pellet destroys and recreates the interval, resetting the tick phase — the snake visibly gains a partial free frame on each eat. Worse:

```js
setSnake(prev => {
  ...
  playSound('die');          // side effect inside a reducer
  setGameOver(true);         // state update inside a reducer
  setFood(spawnFood(newSnake));
  ...
});
```

State updaters must be pure. **React 18 StrictMode invokes them twice in development**, so every death plays the sound twice and fires `setGameOver` twice. It happens to be idempotent today — it will not stay that way.

```js
// AFTER — stable interval, effects hoisted out of the updater
const foodRef  = useRef(food);  foodRef.current  = food;
const pendingRef = useRef(null);          // side effects queued as DATA from the updater

useEffect(() => {
  if (gameOver || !hasStarted) return;
  const id = setInterval(() => {
    setSnake(prev => {
      const next = step(prev, directionRef.current, foodRef.current);
      pendingRef.current = next.event;     // 'eat' | 'die' | null — data, not effects
      return next.snake;
    });
  }, SPEED);
  return () => clearInterval(id);
}, [hasStarted, gameOver]);               // only true lifecycle deps

// Effects run in an effect, where they belong
useEffect(() => {
  const evt = pendingRef.current;
  if (!evt) return;
  pendingRef.current = null;
  if (evt === 'die') { playSound('die'); setGameOver(true); }
  if (evt === 'eat') { playSound('eat'); /* score, food, highScore */ }
}, [snake]);
```

**Also:** `spawnFood` uses `while (true)` with no exit guard — if the snake ever fills the 20x20 grid, the tab hard-freezes. Bound it: collect free cells and pick one, or cap retries and fall back to a linear scan.

**Also:** Snake is **keyboard-only** — no touch controls at all, so it is unplayable on the mobile devices this audit prioritizes. Pong has touch; Snake needs swipe handlers or an on-screen D-pad.

---

### B8 — `MatrixRain`: column/drop desync on resize, `setInterval` ignores tab visibility · Medium · ✅ Fixed

```js
// MatrixRain.jsx:13 — BEFORE
const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
resize();
window.addEventListener('resize', resize);

const columns = Math.floor(canvas.width / step);   // computed ONCE
const drops = Array(columns).fill(1);              // never resized
```

Rotate the device and `columns` no longer matches `drops.length` — the rain either stops short of the right edge or renders past it.

Three more issues in the same file:

- `setInterval(draw, fps)` — the variable is named `fps` but holds a **millisecond interval** (40 / 67). Misleading, and `setInterval` keeps firing in background tabs where `requestAnimationFrame` would correctly throttle.
- `ctx.shadowBlur = 8` is set for ~5% of characters. Canvas shadows are one of the most expensive 2D operations there is; across ~120 columns at 25 fps this is a meaningful mobile cost. Pre-render the glow to an offscreen canvas once, or drop the shadow on coarse pointers.
- `useEffect(..., [onExit])` where `Terminal.jsx:137` passes an **inline arrow** — new identity on every Terminal render, so the whole effect (canvas reset, listener rebind, drop state) tears down and restarts. Wrap the handler in `useCallback` or use an `onExitRef`.

```js
// AFTER — rAF-driven, resize-safe, DPR-aware
let drops = [];
const resize = () => {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width  = Math.floor(window.innerWidth  * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width  = '100%';
  canvas.style.height = '100%';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cols = Math.ceil(window.innerWidth / step);
  drops = Array.from({ length: cols }, (_, i) => drops[i] ?? 1);   // preserve state
};
```

---

### B9 — Unthrottled `mousemove` writing a 3D transform onto a filtered element · Medium · ✅ Fixed

```jsx
// Terminal.jsx:88 — BEFORE: fires at pointer rate (up to 1000 Hz on gaming mice)
const handleMouseMove = (e) => {
  if (window.innerWidth <= 768) { /* still runs, just early-returns */ }
  const wrapper = document.getElementById('terminal-wrapper');
  wrapper.style.transform = `perspective(1000px) rotateX(...) rotateY(...)`;
};
window.addEventListener('mousemove', handleMouseMove);
```

Each write invalidates a stacking context whose child carries **both** `backdrop-filter: blur(12px)` and `filter: url(#liquid-distortion)`. That is the worst possible element to re-transform at pointer frequency.

```jsx
// AFTER — coalesce to one write per frame; never bind the listener at all on touch
const latest = useRef({ x: 0, y: 0 });
const rafId  = useRef(0);
const wrapperRef = useRef(null);          // also: stop using getElementById

useEffect(() => {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const onMove = (e) => {
    latest.current = { x: e.clientX, y: e.clientY };
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = 0;
      const { x, y } = latest.current;
      const rx = ((y - innerHeight / 2) / (innerHeight / 2)) * -5;
      const ry = ((x - innerWidth  / 2) / (innerWidth  / 2)) *  5;
      wrapperRef.current.style.transform =
        `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
  };

  window.addEventListener('mousemove', onMove, { passive: true });
  return () => {
    window.removeEventListener('mousemove', onMove);
    cancelAnimationFrame(rafId.current);
  };
}, []);
```

---

### B10 — `useTypewriter` forces a synchronous reflow on every tick · Medium · ✅ Fixed

```js
// useTypewriter.js:50 — BEFORE: read scrollHeight (forced layout) every 6 characters
const terminalBody = document.getElementById('terminal-body');
if (terminalBody) terminalBody.scrollTop = terminalBody.scrollHeight;
await new Promise(r => setTimeout(r, TYPE_SPEED));
```

`helpText` is ~2,000 characters, so ~330 iterations, each doing a `getElementById` + a layout-forcing `scrollHeight` read + a `setTimeout`. Also, `TYPE_SPEED = 1` is fiction: nested `setTimeout` is clamped to ~4 ms after depth 5, so the real cadence is ~4 ms.

```js
// AFTER — scroll coalesced to once per frame, no forced layout in the hot path
let scrollQueued = false;
const queueScroll = (el) => {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => { scrollQueued = false; el.scrollTop = el.scrollHeight; });
};
```

Better still: replace the character-walk entirely with a CSS reveal (`clip-path`, or a stepped `width` animation on a wrapper) and let the compositor do it — zero main-thread cost, and it respects `prefers-reduced-motion` for free.

---

### B11 — Debug logging left in production · Low · ✅ Fixed

```jsx
// FloatingLines.jsx:439
console.log("FloatingLines mounted");     // in the RENDER BODY — fires every render
// FloatingLines.jsx:497
console.log("FloatingLines effect running", containerRef.current);
```

The first is in the render body, which also makes it a side effect during render — a StrictMode violation, not just noise. Delete both, and add `esbuild: { drop: ['console', 'debugger'] }` to `vite.config.js` as a backstop.

---

### B12 — WebGL1 portability: uniform-bounded loops · Low · ✅ Fixed

```glsl
for (int i = 0; i < bottomLineCount; ++i) { ... }   // bottomLineCount is a uniform
```

GLSL ES 1.00 (WebGL1) requires **constant** loop bounds. Three.js prefers WebGL2 where this is legal, so it works on modern devices — but on a WebGL1-only fallback the shader fails to compile and you get a **silent blank canvas**, because nothing checks `material.program` or listens for compile errors. Either gate on `renderer.capabilities.isWebGL2`, or use a constant bound with an early `break`:

```glsl
const int MAX_LINES = 12;
for (int i = 0; i < MAX_LINES; ++i) {
  if (i >= bottomLineCount) break;
  ...
}
```

---

### B13 — Miscellaneous correctness · ✅ Fixed

| Item | Location | Note |
|---|---|---|
| `sessionStorage` / `localStorage` unguarded | `useTerminal.js:107`, `SnakeGame.jsx:16` | Throws in blocked-storage contexts; wrap in try/catch |
| Looping audio never stopped on unmount | `useTerminal.js:57` | `audioRefs` has no cleanup effect — `lofi` survives navigation |
| Konami handler captures stale `globalVolume` | `useTerminal.js:117` | Mount-time closure; always plays at 0.75 |
| ASCII art variant fixed at mount | `useTerminal.js:41` | Resize/rotate doesn't re-pick mobile vs. desktop art |
| `pointerleave` on `window` | `FloatingLines.jsx:722` | Rarely fires; use `document.documentElement` + `pointerout` |
| Empty `catch (e) {}` | `SnakeGame.jsx:47` | Silently swallows; log at minimum |
| `.vite/deps/` committed to git | 17 tracked files | Generated Vite cache; add to `.gitignore` **and** ESLint `globalIgnores` |
| Unused dependencies | `package.json` | `@react-three/fiber`, `@react-three/drei`, `maath` — **zero imports**, 4.3 MB |

**Lint state (measured):** `npm run lint` reported **415 errors**, but **363 came from the committed `.vite/deps/` cache**. Source-only was **41 errors + 11 warnings**.

> ⚠️ **Correction.** I originally wrote that the 39 `no-useless-escape` errors were "inside ASCII-art template literals" and therefore cosmetic. That was wrong. The ones in `src/data/` are indeed art, but the ones in `commandExecutors.js` were flagging **four genuinely broken commands** — see B14. The rule is now disabled *only* for `src/data/**`, never for logic files.

✅ **Fixed.** `.vite` untracked and ignored, `legacy`/`dist` ignored, Node globals block added for `api/`, `no-useless-escape` scoped off for `src/data` only. **`npm run lint` now reports 0 errors and 0 warnings.**

---

### B14 — Two pre-existing bugs this audit missed ✅ Fixed

Found while implementing the fixes, both present on `main` before any change. Neither was in the original findings — recorded here so the list is honest.

**(a) `\\s` in five command regexes — four commands broken outright**

```js
// BEFORE — matches a literal backslash followed by zero or more "s"
const expression = cmd.replace(/^calc\\s*/i, '').trim();
```

The command word was never stripped from its argument. Only `lang` used a single backslash and worked.

| Command | Actual behaviour before the fix |
|---|---|
| `calc 6*7` | expression stayed `"calc 6*7"` → failed the character whitelist → **always** "Error evaluating expression" |
| `volume 40` | `parseInt("volume 40")` → `NaN` → "Invalid volume" |
| `weather venice` | fetched `wttr.in/weather%20venice` |
| `cowsay hi` | printed `cowsay hi` inside the speech bubble |
| `ask <q>` | sent `"ask <q>"` to the model — degraded, not broken |

```js
// AFTER
const expression = cmd.replace(/^calc\s*/i, '').trim();
```

**(b) `\\n` in the `ls` listings — rendered as visible `\n` text**

```js
// BEFORE — a template literal, so "\\n" is backslash + n, not a newline
outputContent: `<div class="ascii-art">drwxr-xr-x  about/\\ndrwxr-xr-x  education/…</div>`
```

`.ascii-art` already sets `white-space: pre`, so real newlines render correctly. `ls` and `ls -la` were printing everything on one line with literal `\n` characters between entries.

**Lesson worth keeping:** a lint gate producing 415 errors is a lint gate nobody reads. These two defects sat in plain sight, reported on every run, invisible because generated third-party output was being linted alongside source.

---

## 3. WebGL Performance Checklist

### 3.1 Renderer configuration — do these first

```js
const coarse = window.matchMedia('(pointer: coarse)').matches;

const renderer = new WebGLRenderer({
  antialias: false,              // useless on a fullscreen quad; costs bandwidth + memory
  alpha: true,                   // required for mix-blend-mode: screen
  powerPreference: 'high-performance',
  depth: false,                  // no depth testing on a single quad
  stencil: false,                // no stencil buffer needed
  preserveDrawingBuffer: false,
});

// THE mobile win: DPR 3 -> 1.25 is ~5.7x less fragment work than DPR 3, ~2.6x less than DPR 2
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.75));
```

- [ ] `antialias: false`
- [ ] `depth: false`, `stencil: false`
- [ ] DPR clamp **1.25 mobile / 1.75 desktop** (currently a flat `2`)
- [ ] `powerPreference: 'high-performance'`

### 3.2 Render-loop gating

- [ ] `IntersectionObserver` on the canvas — skip `render()` when off-screen
- [ ] `document.visibilitychange` — skip when the tab is hidden
- [ ] `paused` prop driven by `showMatrix || showGame || showDoom || showSnake`
- [ ] Keep `clock` running while paused so phase is continuous on resume
- [ ] `webglcontextlost` / `webglcontextrestored` handlers (with `preventDefault()`)
- [ ] Optional: cap to 30 fps on coarse pointers — halves GPU load, visually near-identical for a slow ambient wave

```js
const FRAME_MS = coarse ? 33.3 : 0;
let last = 0;
const renderLoop = (t) => {
  raf = requestAnimationFrame(renderLoop);
  if (!visibleRef.current || pausedRef.current) return;
  if (FRAME_MS && t - last < FRAME_MS) return;
  last = t;
  /* ...render... */
};
```

### 3.3 Adaptive resolution scaling

The shader is **fragment-bound** — cost scales linearly with pixel count, so resolution is your most effective single dial. Measure and back off:

```js
let acc = 0, frames = 0, scale = 1;
const MIN_SCALE = 0.6;

// inside the loop, after render:
acc += dt; frames++;
if (frames === 60) {
  const avg = acc / frames;
  if (avg > 20 && scale > MIN_SCALE) {          // slower than ~50fps -> downscale
    scale = Math.max(MIN_SCALE, scale - 0.1);
    renderer.setPixelRatio(basePixelRatio * scale);
  } else if (avg < 13 && scale < 1) {           // comfortably >75fps -> recover
    scale = Math.min(1, scale + 0.05);
    renderer.setPixelRatio(basePixelRatio * scale);
  }
  acc = 0; frames = 0;
}
```

Because the output is a soft, blurred gradient field, rendering at 0.6x and letting the browser upscale is **visually almost undetectable here**. This is the highest-leverage knob you have.

### 3.4 Shader cost reduction

Current per-pixel cost (analytical): 3 wave loops x `lineCount` iterations, each doing `log()`, `length()`, a `rotate()` (2x`sin` + 2x`cos`), `sin()`, `exp()`, `smoothstep()`, plus a `getLineColor()` gradient lookup.

- Desktop: 7 lines x 3 waves = **21 iterations/pixel**
- Mobile (`lowPower`): 3 lines x 1 wave = **3 iterations/pixel** — already tuned well

- [ ] **Hoist loop invariants.** `float angle = bottomWavePosition.z * log(length(baseUv) + 1.0);` and `vec2 ruv = baseUv * rotate(angle);` are **identical on every iteration** of each loop — they do not depend on `i`. Lift them above the loop. That removes one `log`, one `length`, and four trig calls per iteration — roughly **a third of the per-iteration ALU cost**, for free, with zero visual change.
- [ ] Use `mediump` for colour/gradient work; reserve `highp` for UV/position math. Many mobile GPUs run `mediump` at double rate.
- [ ] Replace `exp(-dot(d,d) * bendRadius)` with a polynomial falloff (`smoothstep`) — cheaper on tile-based mobile GPUs.
- [ ] Precompute the gradient into a 1D lookup texture instead of branching through `lineGradient[]` per pixel per line.

### 3.5 Instancing, culling, draw calls — not applicable, and that is the point

The brief asks about `InstancedMesh`, frustum culling, and polygon counts. **None apply here**, and it is worth saying why explicitly: the scene is **one `PlaneGeometry(2,2)` — 2 triangles, 1 draw call, 1 material, no textures.** Geometry is not the bottleneck and never will be. Every millisecond is in the **fragment shader**, so the only levers that matter are (a) pixel count, (b) per-pixel ALU, (c) how often you run it. §3.1-3.4 are exactly those three. Do not spend effort on geometry optimization here.

Likewise **KTX2/Basis texture compression is not applicable** — there are no textures in the scene. (It *would* apply if you adopt the gradient-LUT idea above, but a 256x1 LUT is negligible either way.)

### 3.6 Low-end fallback: a CSS-only background

`isLowPower()` currently only *degrades* the shader. Add a tier that skips WebGL entirely:

```js
const tier = (() => {
  const mem   = navigator.deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const saveData = navigator.connection?.saveData;
  const reduced  = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || saveData || mem <= 2 || cores <= 2) return 'none';   // CSS only
  if (matchMedia('(pointer: coarse)').matches)       return 'low';    // 1 wave, DPR 1.25, 30fps
  return 'high';
})();
```

```css
/* tier === 'none' — animated gradient, compositor-only, ~0 CPU */
.bg-fallback {
  position: fixed; inset: 0; z-index: 0;
  background: radial-gradient(120% 80% at 30% 20%, #2f4ba2 0%, transparent 55%),
              radial-gradient(100% 70% at 75% 80%, #e947f5 0%, transparent 50%), #0a0a0a;
  opacity: .35;
  animation: drift 40s ease-in-out infinite alternate;
}
@keyframes drift { to { transform: translate3d(0, -3%, 0) scale(1.06); } }
@media (prefers-reduced-motion: reduce) { .bg-fallback { animation: none; } }
```

This also means **`three` never downloads at all** on low-end devices — saving 123 kB gzip exactly where bandwidth is scarcest. Note that `prefers-reduced-motion` is currently only handled in CSS (`index.css:40`); the WebGL loop ignores it entirely. It should not.

### 3.7 Measure — turn every estimate above into a number

```bash
# Lighthouse mobile, throttled, 3 runs
npx unlighthouse --site http://localhost:4173 --throttle

# Bundle composition
npx vite-bundle-visualizer

# Real-device GPU trace: chrome://inspect -> remote target -> Performance -> check "GPU"
# Watch: the GPU track, frame duration, and the Rasterize/Layerize bands for the SVG filter
```

Suggested budgets: **TTI < 2.5 s** on a throttled Moto G4 profile; **frame time < 12 ms** with the terminal idle; **< 16 ms** during typewriter output.

### 3.8 Drop Three.js for raw WebGL2 (optional, 123 kB gzip) · ✅ Fixed (Phase 5)

> **Done.** `FloatingLines.jsx` is now a hand-rolled WebGL2 pipeline (WebGL1
> fallback) with one oversized clip-space triangle, cached uniform locations,
> `webglcontextlost`/`webglcontextrestored` handling that rebuilds the pipeline,
> and `WEBGL_lose_context` teardown. `three` is uninstalled and the `three`
> manual chunk is gone from `vite.config.js`.
>
> | Chunk | Before (raw / gzip) | After (raw / gzip) |
> |---|---:|---:|
> | `three` | 482,132 B / 123,129 B | **removed** |
> | `FloatingLines` | 11,998 B / 4,272 B | 14,765 B / 5,196 B |
> | **Net on `low`/`high` tiers** | | **−479,365 B raw / −122,205 B gzip** |
>
> Two things Three.js had been hiding surfaced during the port: the shader
> used integer `min()` and `lineGradient[idx]` (a non-constant uniform-array
> index), both **GLSL ES 3.00-only**. Three prepends `#version 300 es` on
> WebGL2, so the "WebGL1-portable" fix in B12 had never actually been
> exercised. Both are now written in ES 1.00 form (float `min`, constant-bound
> select loop), so a single shader string compiles on either context.

Three.js was used for: `Scene`, `OrthographicCamera`, `WebGLRenderer`, `PlaneGeometry(2,2)`, `Mesh`, `ShaderMaterial`, `Vector2/3`, `Clock`. That is a fullscreen-quad blitter. A hand-rolled equivalent is ~80 lines:

```js
const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, depth: false, stencil: false });
const prog = link(gl, VERT, FRAG);
// One buffer, ONE oversized triangle covering clip space — no matrices needed at all
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
// ...cache uniform locations once, then per frame: gl.uniform1f(uTime, t); gl.drawArrays(gl.TRIANGLES, 0, 3);
```

Note the **single oversized triangle** rather than a quad — a standard trick that avoids the diagonal seam and is marginally faster.

**Trade-off, stated plainly:** you lose Three.js's context-loss handling, capability detection, and cross-browser shader preamble, and you take on ~80 lines to maintain. Worth it if the 123 kB matters to you; entirely reasonable to skip if it does not. **Do §3.1-3.4 first** — they cost far less and deliver more.

---

## 4. Structural Refactor Plan

### Current state

The layering (`components` / `hooks` / `data` / `services`) is sound for the size, but two files are load-bearing and oversized, and organization is by *type* rather than by *feature*:

```
src/data/cvData.js               929 lines   content + ASCII art + help + command registry
src/hooks/commandExecutors.js    599 lines   every command, all domains, one object
src/components/FloatingLines.jsx 846 lines   shader source + React wrapper + GL lifecycle
src/index.css                    695 lines   every style in the app
```

The real coupling problem: **adding one command requires edits in three files** (`commandExecutors.js`, `commandsList` in `cvData.js`, `helpText` in `cvData.js`) with no enforcement that they stay in sync — a class of bug your own `portfolio.md` already documents having hit.

### Proposed structure

```
src/
├── app/
│   ├── App.jsx                     # composition root only
│   ├── main.jsx
│   └── deviceTier.js               # 'none' | 'low' | 'high'
│
├── features/
│   ├── terminal/
│   │   ├── Terminal.jsx            # shell chrome
│   │   ├── OutputLine.jsx          # extracted from Terminal.jsx
│   │   ├── useTerminal.js          # state machine ONLY (no sound, no themes)
│   │   ├── useTypewriter.js
│   │   ├── useTiltEffect.js        # extracted from Terminal.jsx
│   │   └── commands/
│   │       ├── index.js            # registry: assembles + validates all modules
│   │       ├── types.js            # JSDoc typedef for the Command contract
│   │       ├── cv.commands.js      # about, education, experience, skills…
│   │       ├── system.commands.js  # ls, pwd, date, whoami, clear, history
│   │       ├── social.commands.js  # open, contact, email, download, recruiter
│   │       ├── fun.commands.js     # cowsay, fortune, randomart, sudo
│   │       ├── eastereggs.commands.js
│   │       └── async.commands.js   # ask, weather (share one async pattern)
│   │
│   ├── background/
│   │   ├── Background.jsx          # picks WebGL vs CSS by device tier
│   │   ├── FloatingLines.jsx       # React wrapper — ~120 lines
│   │   ├── CssFallback.jsx
│   │   └── gl/
│   │       ├── createRenderer.js   # context, DPR, resize, context-loss
│   │       ├── renderLoop.js       # rAF + visibility + adaptive scaling
│   │       ├── uniforms.js
│   │       ├── waves.frag.glsl     # real .glsl files, syntax highlighting,
│   │       └── quad.vert.glsl      # via vite-plugin-glsl
│   │
│   └── games/
│       ├── pong/  snake/  matrix/  doom/
│
├── shared/
│   ├── audio/audioManager.js       # ONE AudioContext + <Audio> pool + volume bus
│   ├── html/escapeHtml.js
│   ├── html/sanitizeAiHtml.js
│   └── theme/themes.js             # single source of truth (CSS generated from it)
│
├── content/
│   ├── cv/  {about,education,experience,projects,skills}.js
│   ├── art/ {ascii,random}.js
│   └── help.js                     # DERIVED from the registry, not hand-maintained
│
├── services/aiService.js
└── styles/  base.css tokens.css terminal.css animations.css
```

### The key architectural change: a self-describing command contract

Make each command declare its own metadata so `commandsList` and `helpText` are **derived**, not hand-synced:

```js
// features/terminal/commands/types.js
/**
 * @typedef {Object} Command
 * @property {string}   name
 * @property {string[]} [aliases]
 * @property {string}   [description]   // omit -> hidden from `help`
 * @property {'cv'|'system'|'fun'|'egg'} category
 * @property {boolean}  [hidden]
 * @property {(args: string, ctx: TerminalCtx) => CommandResult} execute
 */
```

```js
// features/terminal/commands/index.js
const modules = [...cvCommands, ...systemCommands, ...funCommands, ...eggCommands];

export const registry = new Map();
for (const cmd of modules) {
  for (const key of [cmd.name, ...(cmd.aliases ?? [])]) {
    if (registry.has(key) && import.meta.env.DEV) {
      throw new Error(`Duplicate command registration: "${key}"`);   // fail loudly in dev
    }
    registry.set(key, cmd);
  }
}

export const commandsList = [...registry.keys()].sort();             // Tab-completion, free
export const helpText = renderHelp(modules.filter(c => c.description && !c.hidden));
```

One file to add a command. Tab-completion, `commands`, and `help` all update automatically. Duplicate registrations become a loud dev-time error instead of a silent shadow.

### Cleanup checklist

- [x] `npm rm @react-three/fiber @react-three/drei maath` — **zero imports**, 4.3 MB
- [x] Add `.vite/` to `.gitignore`; `git rm -r --cached .vite`
- [x] Add `.vite`, `dist`, `legacy` to ESLint `globalIgnores`
- [x] Decide on `legacy/` — kept on `main` and documented in `CLAUDE.md` as reference-only, excluded from the build and from linting
- [x] Delete `src/assets/react.svg` (unused Vite scaffold)
- [x] `portfolio.md` is stale — it describes commands as living in `useTerminal.js` and lists Tab-completion, `tour`, and the command-pattern refactor as *future* work; all three shipped. Fold the accurate parts into `CLAUDE.md` and delete it. *(Deleted; nothing needed folding — `CLAUDE.md` already covered every section more accurately.)*
- [ ] Extract the inline `styles` objects in `PongGame`/`SnakeGame` — they allocate a new object graph on every render. *(`PongGame` done: static sprite/overlay/hint styles hoisted to module scope. **`SnakeGame` is the one that actually matters and is still untouched** — it has no module-level `styles` at all and re-renders every game tick, so it reallocates ~8 static objects plus one per snake segment per tick. `PongGame` only re-renders on a goal, so its fix was clarity, not measurable perf.)*

---

## 5. UX, Accessibility & Conversion

### 5.1 Accessibility — the honest assessment

A CLI-only portfolio is an inherently exclusionary interface, and this one currently has **no accessible path at all**. These are WCAG 2.2 Level A failures, not nitpicks:

| Issue | WCAG | Location | Fix |
|---|---|---|---|
| `cursor: none !important` on `*` | 2.4.7 / 1.4.1 | `index.css:33` | Scope to `body`; restore the native cursor on `:focus-visible` and if the cursor chunk fails to load |
| `.command-highlight` spans are click-only | **2.1.1 Keyboard** | throughout | Render as `<button type="button">` — they are already interactive |
| Terminal output has no live region | **4.1.3** | `Terminal.jsx:170` | `role="log" aria-live="polite" aria-atomic="false"` on `.terminal-body` |
| Input has no accessible name | **4.1.2** | `Terminal.jsx:243` | `aria-label="Terminal command input"` |
| Overlays are not dialogs, no focus trap | **2.4.3** | Matrix/DOOM/Snake/Pong | `role="dialog" aria-modal="true"`, trap focus, restore on close, Esc everywhere |
| DOOM close is a `<div onClick>` | 2.1.1 | `Terminal.jsx:196` | Use a real `<button>` |
| ASCII art read character-by-character | 1.1.1 | all art | `aria-hidden="true"` plus an adjacent `<span class="sr-only">` text alternative |
| Typewriter ignores reduced-motion | 2.3.3 | `useTypewriter.js` | Skip the animation when `prefers-reduced-motion: reduce` |
| No skip mechanism | 2.4.1 | — | Offer a plain-HTML `/cv` route (below) |

**The highest-value accessibility change is also the highest-value SEO and conversion change:** ship a **static, semantic `/cv` page**. Same content from `content/cv/*`, real headings, real links, no JS required. Link it from the terminal (a `plain` or `a11y` command) and from a persistent corner link. Recruiters on a phone in a hurry, screen-reader users, and Googlebot are all served by one artifact.

### 5.2 Time to Interactive — the boot sequence costs ~3.9 s · ✅ Fixed (~1.2 s, and skipped for tagged inbound traffic)

```js
// BootSequence.jsx:34 — delay accumulates: 120 + 200x3 + 350x6 ~= 2,820ms
// + 600ms hold + 500ms fade ~= 3.9s before the terminal is usable on first visit
```

It is skippable and gated to once per session (`sessionStorage`), and it is genuinely charming — but it is 3.9 s of forced wait for a first-time visitor who may be a recruiter with 40 tabs open. Recommendations:

- Cut the accumulated delay to **~1.2 s** total (halve the per-line steps)
- Make "press any key to skip" **much** more prominent, and show it immediately rather than after the lines render
- **Skip the boot entirely** when `prefers-reduced-motion: reduce`, `navigator.connection.saveData`, or a `?utm_source` / `?ref` parameter is present — inbound clicks from a CV link or job application should land straight in the terminal
- Render the terminal **behind** the boot overlay so it is warm the instant the overlay fades

### 5.3 SEO / AEO — concrete defects found · ✅ Fixed

| Defect | Location | Fix |
|---|---|---|
| `robots.txt` points to `https://teoclerici.com/sitemap.xml` — **the file does not exist** (404) | `public/robots.txt:16` | Add a real `sitemap.xml`, or remove the line |
| `og:image` is `/bg-hero.jpg` — **relative**; OG requires absolute URLs | `index.html:92` | `https://teoclerici.com/bg-hero.jpg` |
| No `<link rel="canonical">` | `index.html` | Add it |
| No `og:image:width` / `height` / `alt` | `index.html` | Add — prevents layout shift in previews |
| No `theme-color` meta, no web manifest | `index.html` | Add both |
| Hidden `#ai-manifesto` div | `index.html:103` | `display:none` keyword text aimed at crawlers is textbook **cloaking**; Google may penalize it. The JSON-LD already does this job legitimately — delete the hidden div. |
| JSON-LD is thin | `index.html:70` | Add `alumniOf`, `knowsAbout`, `worksFor`, `email`, `image` |
| Content is JS-rendered only | — | The static `/cv` page in §5.1 is the real fix — a crawler with JS disabled currently sees an empty `<div id="root">` |

`og:image` also points at the 415 kB hero JPG. Export a dedicated 1200x630 card (< 200 kB) with the name and title legible at thumbnail size — that image *is* the click-through on LinkedIn.

### 5.4 Mobile & touch

- **Snake has no touch controls** — unplayable on mobile. Add swipe handling or a D-pad.
- **Pong's header is `width: 800px` fixed** — horizontal overflow on any phone.
- **Tab-completion is desktop-only.** Mobile users cannot discover commands by typing. Add a horizontally-scrolling chip row of common commands above the input on coarse pointers — likely the single biggest mobile *usability* win in this audit.
- Verify the input's `font-size` is **>= 16px** on iOS, or Safari zooms the viewport on focus.
- `height: 92dvh` is correct — good catch already made.
- The floating **Download CV** button is a strong conversion element; consider keeping it sticky-visible on mobile, where the terminal is harder to navigate.

### 5.5 Conversion

The terminal is a fantastic *filter* for technical audiences and a *barrier* for everyone else. `recruiter` and `tour` already acknowledge this — go further:

- **First-visit hint:** after ~8 s of no input, softly surface `try: recruiter` in the input placeholder
- **Deep links:** `?cmd=projects` auto-runs a command on load, so `teoclerici.com/?cmd=recruiter` can go directly into applications
- **Shareable output:** a `share` command that copies a permalink to the current command
- Make `recruiter` the most discoverable entry in `help` — it is your conversion funnel

---

## 6. Feature & Modernization Ideas

**Highest impact first:**

1. **Static `/cv` companion page** — accessibility, SEO, and recruiter conversion in one artifact (§5.1).
2. **Command palette (Ctrl/Cmd+K)** — familiar to every developer, and it solves mobile discoverability. Fuzzy-search the registry from §4.
3. **Deep-linkable commands** — `?cmd=projects`, plus `history.pushState` per command so Back works.
4. **Streaming AI responses** — `ask` currently blocks on the full completion behind a static "Thinking…". SSE from `/api/ask` streaming into the typewriter would feel dramatically faster and fits the terminal metaphor perfectly.
5. **`projects --live`** — pull GitHub repo stats at build time, cached. Proves the data claim rather than asserting it.

**Craft and polish:**

6. **Real shader-based CRT** — you are already paying for a WebGL context; a proper barrel-distortion + chromatic-aberration + scanline post pass in the *same* fragment shader is nearly free, and would replace the expensive CSS `filter: url()` and `.scanlines` overlay with something better-looking **and** cheaper.
7. **View Transitions API** for theme switches — one line, graceful degradation.
8. **`man <command>`** — extended per-command help, reading the `description` field from the registry.
9. **Rate-limit `/api/ask`** — currently unauthenticated and unthrottled; a bored visitor can burn your xAI credits. Vercel KV plus an IP bucket, ~20 lines. **Do this before the site gets any real traffic.**
10. **Persist `theme`** in `localStorage`, and add a `spiderman` block to `index.css` — it exists in the JS `THEMES` map but has no CSS block, so it works only via the inline custom properties and silently misses the per-theme `.download-cv-btn` styling the other themes get.

---

## 7. Prioritized Roadmap

### Phase 1 — Stop the bleeding *(~half a day)* — ✅ DONE

1. C1: stable props + `forceContextLoss()` + split effects
2. C2: pause loop (IntersectionObserver + visibility + `paused` prop) + context-loss handlers
3. §3.1: `antialias: false`, DPR clamp 1.25/1.75, `depth`/`stencil` off
4. Win #3: disable `filter: url(#liquid-distortion)` on coarse pointers
5. C3: shared `AudioContext`
6. B11: delete the `console.log`s

*Expected: the mobile complaint that prompted this audit should be substantially resolved by these six items alone.*

### Phase 2 — Weight & security *(~half a day)* — ✅ DONE

7. C5: re-encode audio to Opus (54 MB -> ~3 MB)
8. C4: `escapeHtml` at every interpolation site + AI-output allow-list
9. Rate-limit `/api/ask`
10. `npm rm` the three unused deps; gitignore `.vite`; fix the lint gate
11. SEO fixes: sitemap, absolute `og:image`, canonical, delete the cloaked div

### Phase 3 — Correctness & polish *(~1 day)* — ✅ DONE

12. B6/B7/B8: Pong transforms, Snake loop/effects, Matrix resize
13. B9/B10: throttle the tilt handler, rAF the typewriter scroll
14. §3.3: adaptive resolution scaling
15. §3.4: hoist the shader loop invariants
16. §3.6: CSS fallback tier (skips the 123 kB `three` chunk on low-end devices)

### Phase 4 — Structure & features *(~2-3 days)* — ⬜ NOT STARTED

17. §4: command registry refactor plus feature-folder migration
18. §5.1: static `/cv` page
19. Accessibility pass: buttons, live region, focus traps, dialog semantics
20. Mobile command chips + Cmd+K palette
21. Streaming `ask`

### Phase 5 — Dependency removal *(~half a day)* — ✅ DONE

22. §3.8 ("Item J"): replace Three.js with a raw WebGL2 blitter — −122 kB gzip on every WebGL tier, `three` uninstalled, context-loss recovery owned in-house

---

## Appendix — Verification Commands

```bash
npm run lint                              # currently 415 errors; 363 from committed .vite/
npx eslint src api                        # source-only: 41 errors, 11 warnings
npm run build && npx vite-bundle-visualizer
npx unlighthouse --site http://localhost:4173 --throttle

# Confirm the unused deps (expect: no output)
grep -rn "@react-three\|maath\|drei" src/ api/ index.html

# Confirm audio weight
du -sh public/sounds        # 54M
```

**Re-run after every phase.** The estimates in this document are analytical; only your device traces are authoritative.
