import { useEffect, useRef } from 'react';
import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  PlaneGeometry,
  Mesh,
  ShaderMaterial,
  Vector3,
  Vector2,
  Clock
} from 'three';

const vertexShader = `
precision highp float;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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
    int idx2 = min(idx + 1, lineGradientCount - 1);
    vec3 c1 = lineGradient[idx];
    vec3 c2 = lineGradient[idx2];
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

function hexToVec3(hex) {
  let value = String(hex).replace('#', '').trim();
  let r = 1;
  let g = 1;
  let b = 1;

  if (value.length === 3) {
    r = parseInt(value[0] + value[0], 16);
    g = parseInt(value[1] + value[1], 16);
    b = parseInt(value[2] + value[2], 16);
  } else if (value.length === 6) {
    r = parseInt(value.slice(0, 2), 16);
    g = parseInt(value.slice(2, 4), 16);
    b = parseInt(value.slice(4, 6), 16);
  }

  return new Vector3(r / 255, g / 255, b / 255);
}

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
  const rendererRef = useRef(null);

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

  const targetMouseRef = useRef(new Vector2(-1000, -1000));
  const currentMouseRef = useRef(new Vector2(-1000, -1000));
  const targetInfluenceRef = useRef(0);
  const currentInfluenceRef = useRef(0);
  const targetParallaxRef = useRef(new Vector2(0, 0));
  const currentParallaxRef = useRef(new Vector2(0, 0));
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
  // uniforms by Effect 2 below — the context is never rebuilt.
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    camera.position.z = 1;

    const coarse = isCoarsePointer();

    const renderer = new WebGLRenderer({
      // A fullscreen quad has no geometric edges, so MSAA resolves nothing
      // while still costing GPU memory and bandwidth on every frame.
      antialias: false,
      alpha: true,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance'
    });
    rendererRef.current = renderer;

    // This shader is fragment-bound, so cost scales linearly with pixel count.
    // A phone at DPR 3 does ~5.7x the fragment work of DPR 1.25 for a soft
    // gradient field nobody can tell apart.
    const basePixelRatio = Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.75);
    renderer.setPixelRatio(basePixelRatio);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(renderer.domElement);

    const live = liveRef.current;

    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new Vector3(1, 1, 1) },
      animationSpeed: { value: animationSpeed },

      enableTop: { value: enabledWaves.includes('top') },
      enableMiddle: { value: enabledWaves.includes('middle') },
      enableBottom: { value: enabledWaves.includes('bottom') },

      topLineCount: { value: topLineCount },
      middleLineCount: { value: middleLineCount },
      bottomLineCount: { value: bottomLineCount },

      topLineDistance: { value: topLineDistance },
      middleLineDistance: { value: middleLineDistance },
      bottomLineDistance: { value: bottomLineDistance },

      topWavePosition: {
        value: new Vector3(topWavePosition.x, topWavePosition.y, topWavePosition.rotate)
      },
      middleWavePosition: {
        value: new Vector3(middleWavePosition.x, middleWavePosition.y, middleWavePosition.rotate)
      },
      bottomWavePosition: {
        value: new Vector3(bottomWavePosition.x, bottomWavePosition.y, bottomWavePosition.rotate)
      },

      iMouse: { value: new Vector2(-1000, -1000) },
      interactive: { value: live.interactive },
      bendRadius: { value: bendRadius },
      bendStrength: { value: bendStrength },
      bendInfluence: { value: 0 },

      parallax: { value: live.parallax },
      parallaxStrength: { value: live.parallaxStrength },
      parallaxOffset: { value: new Vector2(0, 0) },

      lineGradient: {
        value: Array.from({ length: MAX_GRADIENT_STOPS }, () => new Vector3(1, 1, 1))
      },
      lineGradientCount: { value: 0 }
    };
    uniformsRef.current = uniforms;

    if (linesGradient && linesGradient.length > 0) {
      const stops = linesGradient.slice(0, MAX_GRADIENT_STOPS);
      uniforms.lineGradientCount.value = stops.length;
      stops.forEach((hex, i) => {
        const color = hexToVec3(hex);
        uniforms.lineGradient.value[i].set(color.x, color.y, color.z);
      });
    }

    const material = new ShaderMaterial({ uniforms, vertexShader, fragmentShader });
    const geometry = new PlaneGeometry(2, 2);
    const mesh = new Mesh(geometry, material);
    scene.add(mesh);

    const clock = new Clock();

    // ── Sizing ──────────────────────────────────────────────────
    let currentScale = 1;

    const setSize = () => {
      const el = containerRef.current;
      if (!el) return;
      const width = el.clientWidth || 1;
      const height = el.clientHeight || 1;

      renderer.setSize(width, height, false);
      uniforms.iResolution.value.set(
        renderer.domElement.width,
        renderer.domElement.height,
        1
      );
      rectRef.current = renderer.domElement.getBoundingClientRect();
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
      const dpr = renderer.getPixelRatio();

      targetMouseRef.current.set(x * dpr, (rect.height - y) * dpr);
      targetInfluenceRef.current = 1.0;

      if (l.parallax) {
        const offsetX = (x - rect.width / 2) / rect.width;
        const offsetY = -(y - rect.height / 2) / rect.height;
        targetParallaxRef.current.set(
          offsetX * l.parallaxStrength,
          offsetY * l.parallaxStrength
        );
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
    io?.observe(renderer.domElement);

    const onVisibilityChange = () => { isVisible = !document.hidden; };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // ── Context loss ────────────────────────────────────────────
    let raf = 0;
    let contextLost = false;

    const onContextLost = (e) => {
      // Without preventDefault the context can never be restored.
      e.preventDefault();
      contextLost = true;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onContextRestored = () => {
      contextLost = false;
      setSize();
      if (!raf) raf = requestAnimationFrame(renderLoop);
    };

    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    // ── Render loop ─────────────────────────────────────────────
    const reduced = prefersReducedMotion();
    const FRAME_MS = coarse ? 33.3 : 0; // cap coarse pointers to ~30fps
    let lastFrame = 0;
    let acc = 0;
    let frames = 0;
    let drewStaticFrame = false;

    const MIN_SCALE = 0.6;

    const renderLoop = (t = 0) => {
      raf = requestAnimationFrame(renderLoop);
      if (contextLost) return;

      const l = liveRef.current;

      if (!isVisible || l.paused) return;

      // Reduced motion: paint one static frame, then idle.
      if (reduced) {
        if (drewStaticFrame) return;
        uniforms.iTime.value = 0;
        renderer.render(scene, camera);
        drewStaticFrame = true;
        return;
      }

      if (FRAME_MS && t - lastFrame < FRAME_MS) return;
      const dt = lastFrame ? t - lastFrame : 16;
      lastFrame = t;

      uniforms.iTime.value = clock.getElapsedTime();

      if (l.interactive) {
        currentMouseRef.current.lerp(targetMouseRef.current, l.mouseDamping);
        uniforms.iMouse.value.copy(currentMouseRef.current);

        currentInfluenceRef.current +=
          (targetInfluenceRef.current - currentInfluenceRef.current) * l.mouseDamping;
        uniforms.bendInfluence.value = currentInfluenceRef.current;
      }

      if (l.parallax) {
        currentParallaxRef.current.lerp(targetParallaxRef.current, l.mouseDamping);
        uniforms.parallaxOffset.value.copy(currentParallaxRef.current);
      }

      renderer.render(scene, camera);

      // Adaptive resolution: the output is a soft gradient field, so dropping
      // to 0.6x and letting the browser upscale is near-invisible but is the
      // single most effective lever on a fragment-bound shader.
      acc += dt;
      frames++;
      if (frames >= 60) {
        const avg = acc / frames;
        if (avg > 20 && currentScale > MIN_SCALE) {
          currentScale = Math.max(MIN_SCALE, currentScale - 0.1);
          renderer.setPixelRatio(basePixelRatio * currentScale);
          setSize();
        } else if (avg < 13 && currentScale < 1) {
          currentScale = Math.min(1, currentScale + 0.05);
          renderer.setPixelRatio(basePixelRatio * currentScale);
          setSize();
        }
        acc = 0;
        frames = 0;
      }
    };

    raf = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

      geometry.dispose();
      material.dispose();
      renderer.dispose();
      // dispose() frees GL resources but leaves the context itself alive until
      // GC. Browsers hard-cap ~16 live contexts, so it has to go explicitly.
      renderer.forceContextLoss();
      renderer.domElement.remove();

      uniformsRef.current = null;
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ────────────────────────────────────────────────────────────────
  // Effect 2: push prop changes into the live uniforms. No teardown.
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const u = uniformsRef.current;
    if (!u) return;

    u.animationSpeed.value = animationSpeed;

    u.enableTop.value = enabledWaves.includes('top');
    u.enableMiddle.value = enabledWaves.includes('middle');
    u.enableBottom.value = enabledWaves.includes('bottom');

    u.topLineCount.value = topLineCount;
    u.middleLineCount.value = middleLineCount;
    u.bottomLineCount.value = bottomLineCount;

    u.topLineDistance.value = topLineDistance;
    u.middleLineDistance.value = middleLineDistance;
    u.bottomLineDistance.value = bottomLineDistance;

    u.topWavePosition.value.set(topWavePosition.x, topWavePosition.y, topWavePosition.rotate);
    u.middleWavePosition.value.set(middleWavePosition.x, middleWavePosition.y, middleWavePosition.rotate);
    u.bottomWavePosition.value.set(bottomWavePosition.x, bottomWavePosition.y, bottomWavePosition.rotate);

    u.interactive.value = interactive;
    u.bendRadius.value = bendRadius;
    u.bendStrength.value = bendStrength;

    u.parallax.value = parallax;
    u.parallaxStrength.value = parallaxStrength;
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

  // Gradient changes are rarer and touch an array of uniforms.
  useEffect(() => {
    const u = uniformsRef.current;
    if (!u) return;
    if (!linesGradient || linesGradient.length === 0) {
      u.lineGradientCount.value = 0;
      return;
    }
    const stops = linesGradient.slice(0, MAX_GRADIENT_STOPS);
    u.lineGradientCount.value = stops.length;
    stops.forEach((hex, i) => {
      const color = hexToVec3(hex);
      u.lineGradient.value[i].set(color.x, color.y, color.z);
    });
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
