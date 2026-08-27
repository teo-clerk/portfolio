import { useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Raw WebGL2 fullscreen blitter (WebGL1 fallback). No framework.
//
// This used to be Three.js (Scene + OrthographicCamera + PlaneGeometry +
// ShaderMaterial) — 123 kB gzipped to draw one triangle. Everything below is
// the ~150 lines of GL plumbing that replaced it. Invariants:
//   • ONE oversized clip-space triangle, not a quad: no diagonal seam, 3 verts.
//   • Shader source is GLSL ES 1.00 (no `#version 300 es`), so the same string
//     compiles on a WebGL2 context and on a WebGL1 fallback.
//   • Uniform locations are cached once per pipeline build, never looked up
//     per frame.
//   • After `webglcontextrestored` every GL object is invalid — the pipeline
//     MUST be rebuilt with createPipeline(), not reused.
//   • Teardown ends with WEBGL_lose_context.loseContext(): browsers cap ~16
//     live contexts and a dropped canvas keeps its context alive until GC.
// ─────────────────────────────────────────────────────────────────────────────

const vertexShader = `
attribute vec2 position;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// NOTE ON LOOPS: bounds are the compile-time constant MAX_LINES with an early
// `break`, not the uniform line counts. GLSL ES 1.00 (WebGL1) requires constant
// loop bounds; using a uniform compiles on WebGL2 but fails on WebGL1-only
// devices, and a failed compile here is a silent blank canvas.
const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3  iResolution;
uniform float animationSpeed;

uniform bool enableTop;
uniform bool enableMiddle;
uniform bool enableBottom;

uniform int topLineCount;
uniform int middleLineCount;
uniform int bottomLineCount;

uniform float topLineDistance;
uniform float middleLineDistance;
uniform float bottomLineDistance;

uniform vec3 topWavePosition;
uniform vec3 middleWavePosition;
uniform vec3 bottomWavePosition;

uniform vec2 iMouse;
uniform bool interactive;
uniform float bendRadius;
uniform float bendStrength;
uniform float bendInfluence;

uniform bool parallax;
uniform float parallaxStrength;
uniform vec2 parallaxOffset;

uniform vec3 lineGradient[8];
uniform int lineGradientCount;

const int MAX_LINES = 12;
const int MAX_GRADIENT_STOPS = 8;

const vec3 BLACK = vec3(0.0);
const vec3 PINK  = vec3(233.0, 71.0, 245.0) / 255.0;
const vec3 BLUE  = vec3(47.0,  75.0, 162.0) / 255.0;

mat2 rotate(float r) {
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}

vec3 background_color(vec2 uv) {
  vec3 col = vec3(0.0);
  float y = sin(uv.x - 0.2) * 0.3 - 0.1;
  float m = uv.y - y;
  col += mix(BLUE, BLACK, smoothstep(0.0, 1.0, abs(m)));
  col += mix(PINK, BLACK, smoothstep(0.0, 1.0, abs(m - 0.8)));
  return col * 0.5;
}

vec3 getLineColor(float t, vec3 baseColor) {
  if (lineGradientCount <= 0) {
    return baseColor;
  }
  vec3 gradientColor;
  if (lineGradientCount == 1) {
    gradientColor = lineGradient[0];
  } else {
    float clampedT = clamp(t, 0.0, 0.9999);
    float scaled = clampedT * float(lineGradientCount - 1);
    int idx = int(floor(scaled));
    float f = fract(scaled);
    // Float min: integer min()/max() only exist in GLSL ES 3.00, and this
    // source must stay valid ES 1.00 so one string serves WebGL2 and WebGL1.
    int idx2 = int(min(float(idx + 1), float(lineGradientCount - 1)));
    // ES 1.00 only allows uniform arrays to be indexed by constants or loop
    // counters, so select the two stops with a constant-bound loop instead
    // of lineGradient[idx].
    vec3 c1 = lineGradient[0];
    vec3 c2 = lineGradient[0];
    for (int k = 0; k < MAX_GRADIENT_STOPS; ++k) {
      if (k == idx)  c1 = lineGradient[k];
      if (k == idx2) c2 = lineGradient[k];
    }
    gradientColor = mix(c1, c2, f);
  }
  return gradientColor * 0.5;
}

float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv, bool shouldBend) {
  float time = iTime * animationSpeed;
  float x_offset   = offset;
  float x_movement = time * 0.1;
  float amp        = sin(offset + time * 0.2) * 0.3;
  float y          = sin(uv.x + x_offset + x_movement) * amp;

  if (shouldBend) {
    vec2 d = screenUv - mouseUv;
    float influence = exp(-dot(d, d) * bendRadius); // radial falloff around cursor
    float bendOffset = (mouseUv.y - screenUv.y) * influence * bendStrength * bendInfluence;
    y += bendOffset;
  }

  float m = uv.y - y;
  return 0.03 / max(abs(m) + 0.01, 1e-3) + 0.01;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 baseUv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  baseUv.y *= -1.0;

  if (parallax) {
    baseUv += parallaxOffset;
  }

  vec3 col = vec3(0.0);
  vec3 b = lineGradientCount > 0 ? vec3(0.0) : background_color(baseUv);

  vec2 mouseUv = vec2(0.0);
  if (interactive) {
    mouseUv = (2.0 * iMouse - iResolution.xy) / iResolution.y;
    mouseUv.y *= -1.0;
  }

  // PERF: log(length(baseUv) + 1.0) is identical for every line of every wave.
  // It used to be recomputed inside all three loops (one log + one length per
  // iteration). Hoisting it, and the per-wave rotation matrix below, removes
  // roughly a third of the per-iteration ALU cost with no visual change.
  float logLen = log(length(baseUv) + 1.0);

  if (enableBottom) {
    vec2 ruvBottom = baseUv * rotate(bottomWavePosition.z * logLen);
    float denom = max(float(bottomLineCount - 1), 1.0);
    for (int i = 0; i < MAX_LINES; ++i) {
      if (i >= bottomLineCount) break;
      float fi = float(i);
      vec3 lineCol = getLineColor(fi / denom, b);
      col += lineCol * wave(
        ruvBottom + vec2(bottomLineDistance * fi + bottomWavePosition.x, bottomWavePosition.y),
        1.5 + 0.2 * fi,
        baseUv,
        mouseUv,
        interactive
      ) * 0.2;
    }
  }

  if (enableMiddle) {
    vec2 ruvMiddle = baseUv * rotate(middleWavePosition.z * logLen);
    float denom = max(float(middleLineCount - 1), 1.0);
    for (int i = 0; i < MAX_LINES; ++i) {
      if (i >= middleLineCount) break;
      float fi = float(i);
      vec3 lineCol = getLineColor(fi / denom, b);
      col += lineCol * wave(
        ruvMiddle + vec2(middleLineDistance * fi + middleWavePosition.x, middleWavePosition.y),
        2.0 + 0.15 * fi,
        baseUv,
        mouseUv,
        interactive
      ) * 1.2;
    }
  }

  if (enableTop) {
    vec2 ruvTop = baseUv * rotate(topWavePosition.z * logLen);
    ruvTop.x *= -1.0;
    float denom = max(float(topLineCount - 1), 1.0);
    for (int i = 0; i < MAX_LINES; ++i) {
      if (i >= topLineCount) break;
      float fi = float(i);
      vec3 lineCol = getLineColor(fi / denom, b);
      col += lineCol * wave(
        ruvTop + vec2(topLineDistance * fi + topWavePosition.x, topWavePosition.y),
        1.0 + 0.2 * fi,
        baseUv,
        mouseUv,
        interactive
      ) * 0.4;
    }
  }

  float alpha = length(col);
  fragColor = vec4(col, alpha);
}

void main() {
  vec4 color = vec4(0.0);
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}
`;

const MAX_GRADIENT_STOPS = 8;
const MAX_LINES = 12;

// Every uniform in the fragment shader. Locations are resolved once per
// pipeline build into a { name: WebGLUniformLocation } map.
const UNIFORM_NAMES = Object.freeze([
  'iTime', 'iResolution', 'animationSpeed',
  'enableTop', 'enableMiddle', 'enableBottom',
  'topLineCount', 'middleLineCount', 'bottomLineCount',
  'topLineDistance', 'middleLineDistance', 'bottomLineDistance',
  'topWavePosition', 'middleWavePosition', 'bottomWavePosition',
  'iMouse', 'interactive', 'bendRadius', 'bendStrength', 'bendInfluence',
  'parallax', 'parallaxStrength', 'parallaxOffset',
  'lineGradient', 'lineGradientCount'
]);

// A fullscreen triangle has no geometric edges, so MSAA resolves nothing while
// still costing GPU memory and bandwidth on every frame. No depth/stencil
// either: one draw, nothing to test against.
const CONTEXT_ATTRIBUTES = Object.freeze({
  antialias: false,
  alpha: true,
  depth: false,
  stencil: false,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: false
});

// One oversized triangle covering clip space: (-1,-1) (3,-1) (-1,3).
const FULLSCREEN_TRIANGLE = new Float32Array([-1, -1, 3, -1, -1, 3]);

// Frozen module-scope defaults. These MUST NOT be inline default-parameter
// object literals: a default object is re-created on every call, so its
// identity changes on every render and any effect depending on it re-runs —
// which for this component meant tearing down and rebuilding the WebGL context.
const DEFAULT_TOP    = Object.freeze({ x: 10.0, y: 0.5, rotate: -0.4 });
const DEFAULT_MIDDLE = Object.freeze({ x: 5.0, y: 0.0, rotate: 0.2 });
const DEFAULT_BOTTOM = Object.freeze({ x: 2.0, y: -0.7, rotate: -1 });

const isCoarsePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** @returns {[number, number, number]} normalised RGB */
function hexToRgb(hex) {
  const value = String(hex).replace('#', '').trim();
  if (value.length === 3) {
    return [
      parseInt(value[0] + value[0], 16) / 255,
      parseInt(value[1] + value[1], 16) / 255,
      parseInt(value[2] + value[2], 16) / 255
    ];
  }
  if (value.length === 6) {
    return [
      parseInt(value.slice(0, 2), 16) / 255,
      parseInt(value.slice(2, 4), 16) / 255,
      parseInt(value.slice(4, 6), 16) / 255
    ];
  }
  return [1, 1, 1];
}

/** Write up to MAX_GRADIENT_STOPS hex colours into the packed vec3 array. */
function writeGradient(state, linesGradient) {
  if (!linesGradient || linesGradient.length === 0) {
    state.lineGradientCount = 0;
    return;
  }
  const stops = linesGradient.slice(0, MAX_GRADIENT_STOPS);
  state.lineGradientCount = stops.length;
  stops.forEach((hex, i) => {
    const [r, g, b] = hexToRgb(hex);
    state.lineGradient[i * 3] = r;
    state.lineGradient[i * 3 + 1] = g;
    state.lineGradient[i * 3 + 2] = b;
  });
}

// ── GL plumbing ──────────────────────────────────────────────────────────────

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // A failed compile would otherwise be a silent blank canvas.
    console.error('[FloatingLines] shader compile failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Build program + VBO + cached uniform locations. Called at mount and again
 * after `webglcontextrestored`, because context loss invalidates every object.
 * Returns null when the shaders will not compile/link on this device.
 */
function createPipeline(gl) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexShader);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[FloatingLines] program link failed:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_TRIANGLE, gl.STATIC_DRAW);

  gl.useProgram(program);
  const positionLoc = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  const u = {};
  for (const name of UNIFORM_NAMES) u[name] = gl.getUniformLocation(program, name);

  // Match Three's defaults for an opaque ShaderMaterial: no blending, no
  // depth test; the canvas' own alpha channel does the page compositing.
  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);

  return { program, vs, fs, buffer, u };
}

function destroyPipeline(gl, p) {
  if (!p) return;
  gl.deleteBuffer(p.buffer);
  gl.deleteShader(p.vs);
  gl.deleteShader(p.fs);
  gl.deleteProgram(p.program);
}

/** Push the whole uniform state and draw one frame. */
function drawFrame(gl, canvas, u, s) {
  gl.uniform1f(u.iTime, s.iTime);
  gl.uniform3f(u.iResolution, s.iResolution[0], s.iResolution[1], 1);
  gl.uniform1f(u.animationSpeed, s.animationSpeed);

  gl.uniform1i(u.enableTop, s.enableTop ? 1 : 0);
  gl.uniform1i(u.enableMiddle, s.enableMiddle ? 1 : 0);
  gl.uniform1i(u.enableBottom, s.enableBottom ? 1 : 0);

  gl.uniform1i(u.topLineCount, s.topLineCount);
  gl.uniform1i(u.middleLineCount, s.middleLineCount);
  gl.uniform1i(u.bottomLineCount, s.bottomLineCount);

  gl.uniform1f(u.topLineDistance, s.topLineDistance);
  gl.uniform1f(u.middleLineDistance, s.middleLineDistance);
  gl.uniform1f(u.bottomLineDistance, s.bottomLineDistance);

  gl.uniform3fv(u.topWavePosition, s.topWavePosition);
  gl.uniform3fv(u.middleWavePosition, s.middleWavePosition);
  gl.uniform3fv(u.bottomWavePosition, s.bottomWavePosition);

  gl.uniform2f(u.iMouse, s.iMouse[0], s.iMouse[1]);
  gl.uniform1i(u.interactive, s.interactive ? 1 : 0);
  gl.uniform1f(u.bendRadius, s.bendRadius);
  gl.uniform1f(u.bendStrength, s.bendStrength);
  gl.uniform1f(u.bendInfluence, s.bendInfluence);

  gl.uniform1i(u.parallax, s.parallax ? 1 : 0);
  gl.uniform1f(u.parallaxStrength, s.parallaxStrength);
  gl.uniform2f(u.parallaxOffset, s.parallaxOffset[0], s.parallaxOffset[1]);

  gl.uniform3fv(u.lineGradient, s.lineGradient);
  gl.uniform1i(u.lineGradientCount, s.lineGradientCount);

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function FloatingLines({
  linesGradient,
  enabledWaves = ['top', 'middle', 'bottom'],
  lineCount = 6,
  lineDistance = 5,
  topWavePosition = DEFAULT_TOP,
  middleWavePosition = DEFAULT_MIDDLE,
  bottomWavePosition = DEFAULT_BOTTOM,
  animationSpeed = 1,
  interactive = true,
  bendRadius = 5.0,
  bendStrength = -0.5,
  mouseDamping = 0.05,
  parallax = true,
  parallaxStrength = 0.2,
  mixBlendMode = 'screen',
  paused = false
}) {
  const containerRef = useRef(null);
  const uniformsRef = useRef(null);

  // Live prop mirror, read by the render loop and the pointer handlers so that
  // neither has to be re-created when a prop changes.
  const liveRef = useRef({
    interactive,
    parallax,
    mouseDamping,
    parallaxStrength,
    paused
  });

  useEffect(() => {
    liveRef.current = {
      interactive,
      parallax,
      mouseDamping,
      parallaxStrength,
      paused
    };
  }, [interactive, parallax, mouseDamping, parallaxStrength, paused]);

  const targetMouseRef = useRef([-1000, -1000]);
  const currentMouseRef = useRef([-1000, -1000]);
  const targetInfluenceRef = useRef(0);
  const currentInfluenceRef = useRef(0);
  const targetParallaxRef = useRef([0, 0]);
  const currentParallaxRef = useRef([0, 0]);
  const rectRef = useRef(null);

  const clampLines = (n) => Math.max(0, Math.min(MAX_LINES, n));

  const getLineCount = (waveType) => {
    if (!enabledWaves.includes(waveType)) return 0;
    if (typeof lineCount === 'number') return clampLines(lineCount);
    const index = enabledWaves.indexOf(waveType);
    return clampLines(lineCount[index] ?? 6);
  };

  const getLineDistance = (waveType) => {
    if (!enabledWaves.includes(waveType)) return 0.01;
    const raw =
      typeof lineDistance === 'number'
        ? lineDistance
        : lineDistance[enabledWaves.indexOf(waveType)] ?? 5;
    return raw * 0.01;
  };

  const topLineCount = getLineCount('top');
  const middleLineCount = getLineCount('middle');
  const bottomLineCount = getLineCount('bottom');

  const topLineDistance = getLineDistance('top');
  const middleLineDistance = getLineDistance('middle');
  const bottomLineDistance = getLineDistance('bottom');

  // ────────────────────────────────────────────────────────────────
  // Effect 1: create the WebGL context exactly ONCE.
  // Deps are intentionally empty. Prop changes are pushed into the live
  // uniform state by Effect 2 below — the context is never rebuilt.
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const coarse = isCoarsePointer();

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.setAttribute('aria-hidden', 'true');

    const gl =
      canvas.getContext('webgl2', CONTEXT_ATTRIBUTES) ??
      canvas.getContext('webgl', CONTEXT_ATTRIBUTES);
    if (!gl) return; // no WebGL at all: the CSS backdrop behind us still shows

    container.appendChild(canvas);

    let pipeline = createPipeline(gl);
    if (!pipeline) {
      canvas.remove();
      return;
    }

    // This shader is fragment-bound, so cost scales linearly with pixel count.
    // A phone at DPR 3 does ~5.7x the fragment work of DPR 1.25 for a soft
    // gradient field nobody can tell apart.
    const basePixelRatio = Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.75);
    let currentScale = 1;
    let pixelRatio = basePixelRatio;

    const live = liveRef.current;

    const state = {
      iTime: 0,
      iResolution: [1, 1, 1],
      animationSpeed,

      enableTop: enabledWaves.includes('top'),
      enableMiddle: enabledWaves.includes('middle'),
      enableBottom: enabledWaves.includes('bottom'),

      topLineCount,
      middleLineCount,
      bottomLineCount,

      topLineDistance,
      middleLineDistance,
      bottomLineDistance,

      topWavePosition: [topWavePosition.x, topWavePosition.y, topWavePosition.rotate],
      middleWavePosition: [middleWavePosition.x, middleWavePosition.y, middleWavePosition.rotate],
      bottomWavePosition: [bottomWavePosition.x, bottomWavePosition.y, bottomWavePosition.rotate],

      iMouse: [-1000, -1000],
      interactive: live.interactive,
      bendRadius,
      bendStrength,
      bendInfluence: 0,

      parallax: live.parallax,
      parallaxStrength: live.parallaxStrength,
      parallaxOffset: [0, 0],

      lineGradient: new Float32Array(MAX_GRADIENT_STOPS * 3).fill(1),
      lineGradientCount: 0
    };
    writeGradient(state, linesGradient);
    uniformsRef.current = state;

    // ── Sizing ──────────────────────────────────────────────────
    const setSize = () => {
      const el = containerRef.current;
      if (!el) return;
      const width = el.clientWidth || 1;
      const height = el.clientHeight || 1;

      pixelRatio = basePixelRatio * currentScale;
      canvas.width = Math.max(1, Math.floor(width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(height * pixelRatio));
      state.iResolution[0] = canvas.width;
      state.iResolution[1] = canvas.height;
      rectRef.current = canvas.getBoundingClientRect();
    };

    setSize();

    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(setSize) : null;
    ro?.observe(container);

    // ── Pointer ─────────────────────────────────────────────────
    // Bound unconditionally and gated on the live prop inside, so toggling
    // `interactive` never needs to rebind (or rebuild the context).
    const handlePointerMove = (event) => {
      const l = liveRef.current;
      if (!l.interactive) return;

      const rect = rectRef.current;
      if (!rect) return;

      const x = event.clientX;
      const y = event.clientY;

      targetMouseRef.current[0] = x * pixelRatio;
      targetMouseRef.current[1] = (rect.height - y) * pixelRatio;
      targetInfluenceRef.current = 1.0;

      if (l.parallax) {
        const offsetX = (x - rect.width / 2) / rect.width;
        const offsetY = -(y - rect.height / 2) / rect.height;
        targetParallaxRef.current[0] = offsetX * l.parallaxStrength;
        targetParallaxRef.current[1] = offsetY * l.parallaxStrength;
      }
    };

    const handlePointerLeave = () => {
      targetInfluenceRef.current = 0.0;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', handlePointerLeave);

    // ── Visibility / occlusion gating ────────────────────────────
    let isVisible = true;
    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(([entry]) => { isVisible = entry.isIntersecting; },
            { threshold: 0 })
        : null;
    io?.observe(canvas);

    const onVisibilityChange = () => { isVisible = !document.hidden; };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // ── Render loop state ───────────────────────────────────────
    // Wall-clock based, so time keeps advancing while paused/hidden and the
    // animation resumes where it *would* have been instead of jumping.
    const t0 = performance.now();
    const reduced = prefersReducedMotion();
    const FRAME_MS = coarse ? 33.3 : 0; // cap coarse pointers to ~30fps
    const MIN_SCALE = 0.6;
    let raf = 0;
    let contextLost = false;
    let lastFrame = 0;
    let acc = 0;
    let frames = 0;
    let drewStaticFrame = false;

    const renderLoop = (t = 0) => {
      raf = requestAnimationFrame(renderLoop);
      if (contextLost || !pipeline) return;

      const l = liveRef.current;

      if (!isVisible || l.paused) return;

      // Reduced motion: paint one static frame, then idle.
      if (reduced) {
        if (drewStaticFrame) return;
        state.iTime = 0;
        drawFrame(gl, canvas, pipeline.u, state);
        drewStaticFrame = true;
        return;
      }

      if (FRAME_MS && t - lastFrame < FRAME_MS) return;
      const dt = lastFrame ? t - lastFrame : 16;
      lastFrame = t;

      state.iTime = (performance.now() - t0) / 1000;

      if (l.interactive) {
        const cur = currentMouseRef.current;
        const tgt = targetMouseRef.current;
        cur[0] += (tgt[0] - cur[0]) * l.mouseDamping;
        cur[1] += (tgt[1] - cur[1]) * l.mouseDamping;
        state.iMouse[0] = cur[0];
        state.iMouse[1] = cur[1];

        currentInfluenceRef.current +=
          (targetInfluenceRef.current - currentInfluenceRef.current) * l.mouseDamping;
        state.bendInfluence = currentInfluenceRef.current;
      }

      if (l.parallax) {
        const cur = currentParallaxRef.current;
        const tgt = targetParallaxRef.current;
        cur[0] += (tgt[0] - cur[0]) * l.mouseDamping;
        cur[1] += (tgt[1] - cur[1]) * l.mouseDamping;
        state.parallaxOffset[0] = cur[0];
        state.parallaxOffset[1] = cur[1];
      }

      drawFrame(gl, canvas, pipeline.u, state);

      // Adaptive resolution: the output is a soft gradient field, so dropping
      // to 0.6x and letting the browser upscale is near-invisible but is the
      // single most effective lever on a fragment-bound shader.
      acc += dt;
      frames++;
      if (frames >= 60) {
        const avg = acc / frames;
        if (avg > 20 && currentScale > MIN_SCALE) {
          currentScale = Math.max(MIN_SCALE, currentScale - 0.1);
          setSize();
        } else if (avg < 13 && currentScale < 1) {
          currentScale = Math.min(1, currentScale + 0.05);
          setSize();
        }
        acc = 0;
        frames = 0;
      }
    };

    // ── Context loss ────────────────────────────────────────────
    const onContextLost = (e) => {
      // Without preventDefault the context can never be restored.
      e.preventDefault();
      contextLost = true;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onContextRestored = () => {
      // Every GL object died with the old context; rebuild from scratch.
      pipeline = createPipeline(gl);
      contextLost = false;
      drewStaticFrame = false;
      setSize();
      if (!raf) raf = requestAnimationFrame(renderLoop);
    };

    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    raf = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);

      if (!contextLost) destroyPipeline(gl, pipeline);
      // Deleting objects frees GPU memory but leaves the context itself alive
      // until GC. Browsers hard-cap ~16 live contexts, so it has to go explicitly.
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();

      uniformsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ────────────────────────────────────────────────────────────────
  // Effect 2: push prop changes into the live uniform state. No teardown.
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = uniformsRef.current;
    if (!s) return;

    s.animationSpeed = animationSpeed;

    s.enableTop = enabledWaves.includes('top');
    s.enableMiddle = enabledWaves.includes('middle');
    s.enableBottom = enabledWaves.includes('bottom');

    s.topLineCount = topLineCount;
    s.middleLineCount = middleLineCount;
    s.bottomLineCount = bottomLineCount;

    s.topLineDistance = topLineDistance;
    s.middleLineDistance = middleLineDistance;
    s.bottomLineDistance = bottomLineDistance;

    s.topWavePosition = [topWavePosition.x, topWavePosition.y, topWavePosition.rotate];
    s.middleWavePosition = [middleWavePosition.x, middleWavePosition.y, middleWavePosition.rotate];
    s.bottomWavePosition = [bottomWavePosition.x, bottomWavePosition.y, bottomWavePosition.rotate];

    s.interactive = interactive;
    s.bendRadius = bendRadius;
    s.bendStrength = bendStrength;

    s.parallax = parallax;
    s.parallaxStrength = parallaxStrength;
  }, [
    animationSpeed,
    enabledWaves,
    topLineCount,
    middleLineCount,
    bottomLineCount,
    topLineDistance,
    middleLineDistance,
    bottomLineDistance,
    topWavePosition,
    middleWavePosition,
    bottomWavePosition,
    interactive,
    bendRadius,
    bendStrength,
    parallax,
    parallaxStrength
  ]);

  // Gradient changes are rarer and touch a packed array of uniforms.
  useEffect(() => {
    const s = uniformsRef.current;
    if (!s) return;
    writeGradient(s, linesGradient);
  }, [linesGradient]);

  return (
    <div
      ref={containerRef}
      className="floating-lines-container"
      aria-hidden="true"
      style={{ mixBlendMode }}
    />
  );
}
