/**
 * The orbit scene: a retro workstation floating above the Earth, with a small
 * radar satellite passing behind it. Docking flies the camera into the monitor.
 *
 * Framework-free on purpose. The React side (useOrbitScene.js) only owns the
 * canvas element; everything else lives here, in the lazily loaded chunk that
 * is the only place `three` may be imported. Phones and modest hardware never
 * request this file (see introState.getIntroMode).
 *
 * Lifecycle rules, the same ones FloatingLines.jsx follows:
 *  - one WebGL context, created once, released with forceContextLoss() on
 *    dispose (browsers cap live contexts at about 16);
 *  - no rendering while the tab is hidden;
 *  - the device pixel ratio is clamped;
 *  - every geometry, material and texture is disposed.
 *
 * All models are built from primitives: no model files, no licences to track.
 * The Earth texture is NASA's Blue Marble (public domain).
 */
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  FrontSide,
  Group,
  InstancedMesh,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  Quaternion,
  Raycaster,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

import { BOOT_LINES } from '../data/bootLines';
import earthTextureUrl from './assets/earth.webp';
import { PORTRAIT_MAX_ASPECT, SCENE_DOCK_MS } from './introState';
import { createScreenTexture } from './screenTexture';

// ── Tunables ────────────────────────────────────────────────────────────────
const MAX_PIXEL_RATIO = 2;
const FIELD_OF_VIEW = 38;
const TAN_HALF_FOV = Math.tan(MathUtils.degToRad(FIELD_OF_VIEW / 2));

const SCREEN_REFRESH_MS = 110;

const SCREEN_WIDTH = 1.72;
const SCREEN_HEIGHT = 1.29;
/** Centre of the CRT glass in the workstation's own coordinates. */
const SCREEN_CENTER = new Vector3(0, 0.42, 0.915);

const EARTH_RADIUS = 26;
/** Far enough away that a wide arc of the globe is in frame, not a blurry close-up. */
const EARTH_CENTER = new Vector3(6.4, -38.3, -49.5);
const ATMOSPHERE_SCALE = 1.06;
/** The Mediterranean: the part of the globe turned toward the camera. */
const EARTH_FOCUS = { latitude: 38, longitude: 15 };
/** Where EARTH_FOCUS points, and which way north runs from it (away from the camera). */
const EARTH_FOCUS_DIRECTION = new Vector3(-0.06, 0.9, 0.44).normalize();
const EARTH_NORTH_HINT = new Vector3(-0.2, 0, -1);

/** Where the satellite sits at t = 0. It is hidden in portrait: no room beside the workstation. */
const SATELLITE_HOME = [-4.4, 3.0, -8];

/** Landscape camera distance, and the aspect ratio below which it starts pulling back. */
const LANDSCAPE_DISTANCE = 8.2;
const LANDSCAPE_FULL_ASPECT = 1.6;
/** Portrait: half-width that must stay in frame, and how far below the workstation the camera aims. */
const PORTRAIT_FIT = 2.55;
const PORTRAIT_LOOK_DOWN = 0.18;

const STAR_COUNT = 2600;
const BRIGHT_STAR_COUNT = 140;
const STAR_SEED = 20261112;

const SPACE_COLOR = 0x04060c;

// ── Small helpers ───────────────────────────────────────────────────────────
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

/** Unit vector for a latitude/longitude on a three.js SphereGeometry with an equirectangular map. */
const sphereDirection = ({ latitude, longitude }) => {
  const phi = MathUtils.degToRad(longitude + 180);
  const theta = MathUtils.degToRad(90 - latitude);
  return new Vector3(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
};

/**
 * Small seeded generator (mulberry32). The star field must be the same on
 * every load, because the poster is a render of this scene and the live scene
 * cross-fades over it.
 */
const seededRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Rotation that turns the globe so `focus` (a latitude/longitude) faces
 * `direction`, with geographic north running along `northHint` from there.
 */
const globeOrientation = (focus, direction, northHint) => {
  const frame = (outward, north) => {
    const up = north.clone().addScaledVector(outward, -north.dot(outward)).normalize();
    const east = new Vector3().crossVectors(up, outward);
    return new Matrix4().makeBasis(east, up, outward);
  };
  const local = frame(sphereDirection(focus), new Vector3(0, 1, 0));
  const world = frame(direction, northHint);
  return new Quaternion().setFromRotationMatrix(world.multiply(local.invert()));
};

const standard = (color, options = {}) =>
  new MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05, ...options });

// ── Scene pieces ────────────────────────────────────────────────────────────
const buildStars = () => {
  const random = seededRandom(STAR_SEED);
  const layer = (count, size, opacity) => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const tint = new Color();
    for (let i = 0; i < count; i += 1) {
      // Uniform on a sphere shell far outside everything else.
      const u = random() * 2 - 1;
      const angle = random() * Math.PI * 2;
      const ring = Math.sqrt(1 - u * u);
      const radius = 320 + random() * 60;
      positions.set([ring * Math.cos(angle) * radius, u * radius, ring * Math.sin(angle) * radius], i * 3);
      tint.setHSL(0.55 + random() * 0.12, 0.35, 0.62 + random() * 0.38);
      colors.set([tint.r, tint.g, tint.b], i * 3);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    const material = new PointsMaterial({
      size,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    return new Points(geometry, material);
  };

  const stars = new Group();
  stars.add(layer(STAR_COUNT, 1.1, 0.8), layer(BRIGHT_STAR_COUNT, 2.1, 1));
  return stars;
};

const atmosphereMaterial = ({ side, vertexShaderRim }) =>
  new ShaderMaterial({
    side,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uColor: { value: new Color(0x6fb2ff) } },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float facing = dot(normalize(vNormal), normalize(vViewDir));
        ${vertexShaderRim}
        gl_FragColor = vec4(uColor * strength, strength);
      }
    `,
  });

const buildEarth = () => {
  const earth = new Group();
  earth.position.copy(EARTH_CENTER);

  const surfaceMaterial = standard(0x1d4f8f, { roughness: 0.95, metalness: 0 });
  const surface = new Mesh(new SphereGeometry(EARTH_RADIUS, 96, 64), surfaceMaterial);
  surface.quaternion.copy(globeOrientation(EARTH_FOCUS, EARTH_FOCUS_DIRECTION, EARTH_NORTH_HINT));

  // Haze hugging the limb, drawn on the front faces just above the surface.
  const haze = new Mesh(
    new SphereGeometry(EARTH_RADIUS * 1.004, 96, 64),
    atmosphereMaterial({
      side: FrontSide,
      vertexShaderRim: 'float strength = pow(1.0 - clamp(facing, 0.0, 1.0), 3.0) * 0.7;',
    })
  );

  // Glow outside the limb, drawn on the back faces of a larger shell. `facing`
  // runs from -LIMB at the planet's edge to 0 at the shell's own edge, so the
  // glow is brightest against the surface and fades to nothing outward.
  const limb = Math.sqrt(1 - 1 / ATMOSPHERE_SCALE ** 2).toFixed(4);
  const glow = new Mesh(
    new SphereGeometry(EARTH_RADIUS * ATMOSPHERE_SCALE, 96, 64),
    atmosphereMaterial({
      side: BackSide,
      vertexShaderRim: `float strength = pow(clamp(-facing / ${limb}, 0.0, 1.0), 2.6) * 0.8;`,
    })
  );

  earth.add(surface, haze, glow);
  return { earth, surface, surfaceMaterial };
};

const buildWorkstation = (screenMap) => {
  const workstation = new Group();

  const casing = standard(0xd9d1bf, { roughness: 0.6 });
  const casingShade = standard(0xbfb7a4, { roughness: 0.7 });
  const dark = standard(0x17181c, { roughness: 0.45 });
  const keycap = standard(0xefe9da, { roughness: 0.55 });

  // Monitor.
  const monitor = new Mesh(new RoundedBoxGeometry(2.3, 1.9, 1.8, 4, 0.14), casing);
  monitor.position.set(0, 0.35, 0);
  const bezel = new Mesh(new RoundedBoxGeometry(1.98, 1.55, 0.12, 3, 0.05), dark);
  bezel.position.set(0, 0.42, 0.85);
  const screen = new Mesh(
    new PlaneGeometry(SCREEN_WIDTH, SCREEN_HEIGHT),
    new MeshBasicMaterial({ map: screenMap, toneMapped: false })
  );
  screen.position.copy(SCREEN_CENTER);
  const vent = new Mesh(new BoxGeometry(1.5, 0.05, 1.1), casingShade);
  vent.position.set(0, 1.305, -0.15);

  // System unit under the monitor.
  const unit = new Mesh(new RoundedBoxGeometry(2.7, 0.55, 2.05, 3, 0.08), casing);
  unit.position.set(0, -0.92, 0.02);
  const driveSlot = new Mesh(new BoxGeometry(0.95, 0.07, 0.03), dark);
  driveSlot.position.set(0.55, -0.88, 1.05);
  const powerLed = new Mesh(
    new SphereGeometry(0.035, 12, 8),
    new MeshBasicMaterial({ color: 0x4df08a, toneMapped: false })
  );
  powerLed.position.set(-1.05, -0.88, 1.05);

  // Keyboard, tilted toward the viewer, with instanced keycaps.
  const keyboard = new Group();
  keyboard.position.set(0, -1.34, 1.72);
  keyboard.rotation.x = 0.16;
  keyboard.add(new Mesh(new RoundedBoxGeometry(2.55, 0.16, 0.9, 3, 0.05), casingShade));

  const columns = 14;
  const rows = 5;
  const keys = new InstancedMesh(new BoxGeometry(0.135, 0.06, 0.125), keycap, columns * rows);
  const slot = new Object3D();
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      slot.position.set((column - (columns - 1) / 2) * 0.168, 0.105, (row - (rows - 1) / 2) * 0.155);
      slot.updateMatrix();
      keys.setMatrixAt(row * columns + column, slot.matrix);
    }
  }
  keys.instanceMatrix.needsUpdate = true;
  keyboard.add(keys);

  // The screen lights the keyboard a little.
  const screenLight = new PointLight(0x4df08a, 2.2, 5, 2);
  screenLight.position.set(0, 0.2, 1.9);

  workstation.add(monitor, bezel, screen, vent, unit, driveSlot, powerLed, keyboard, screenLight);
  return workstation;
};

/** A Sentinel-1-like silhouette: bus, two solar wings, one long radar antenna. */
const buildSatellite = () => {
  const satellite = new Group();
  const foil = standard(0xc9a04a, { roughness: 0.35, metalness: 0.75 });
  const solar = standard(0x2b4fa6, { roughness: 0.35, metalness: 0.35 });
  const antenna = standard(0xd7dbe0, { roughness: 0.5, metalness: 0.3 });

  satellite.add(new Mesh(new BoxGeometry(0.7, 0.75, 1.1), foil));
  for (const side of [-1, 1]) {
    const wing = new Mesh(new BoxGeometry(2.6, 0.04, 0.85), solar);
    wing.position.set(side * 1.75, 0.1, 0);
    satellite.add(wing);
  }
  const radar = new Mesh(new BoxGeometry(0.5, 0.05, 3.6), antenna);
  radar.position.set(0, -0.42, 0);
  satellite.add(radar);

  satellite.scale.setScalar(0.5);
  return satellite;
};

// ── Public API ──────────────────────────────────────────────────────────────
/**
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   bootLines?: readonly string[],
 *   earthUrl?: string,
 *   onReady?: () => void,
 *   onActivate?: () => void,
 * }} options
 *   `onReady` fires after the first frame that includes the Earth texture.
 *   `onActivate` fires when the visitor clicks the workstation.
 * @returns {{
 *   dock: () => Promise<void>,
 *   freeze: () => void,
 *   getScreenRect: () => { x: number, y: number, width: number, height: number },
 *   dispose: () => void,
 * }}
 * @throws If a WebGL context cannot be created.
 */
export const createOrbitScene = (canvas, options = {}) => {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  try {
    return buildOrbitScene(renderer, canvas, options);
  } catch (error) {
    // The context exists by now; without this a failed build would leak it.
    renderer.dispose();
    renderer.forceContextLoss();
    throw error;
  }
};

const buildOrbitScene = (renderer, canvas, { bootLines = BOOT_LINES, earthUrl = earthTextureUrl, onReady, onActivate }) => {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(SPACE_COLOR, 1);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 0.05, 900);

  // Light: a hard sun, almost no fill (space), and blue earthshine from below.
  const sun = new DirectionalLight(0xfff4e2, 2.9);
  sun.position.set(-7, 5, 6);
  const earthshine = new DirectionalLight(0x86b4ff, 0.55);
  earthshine.position.set(3, -6, 2);
  scene.add(sun, earthshine, new AmbientLight(0xaab8d8, 0.3));

  const stars = buildStars();
  const { earth, surface, surfaceMaterial } = buildEarth();
  const satellite = buildSatellite();

  const screenTexture = createScreenTexture(bootLines);
  const screenMap = new CanvasTexture(screenTexture.canvas);
  screenMap.colorSpace = SRGBColorSpace;
  const workstation = buildWorkstation(screenMap);

  scene.add(stars, earth, satellite, workstation);

  // ── State ────────────────────────────────────────────────────────────────
  /** @type {'idle' | 'docking' | 'docked'} */
  let mode = 'idle';
  let disposed = false;
  let frozen = false;
  let readyReported = false;
  let textureSettled = false;
  let frame = 0;
  let aspect = 1;

  let startedAt = performance.now();
  let lastScreenRefresh = -Infinity;
  let dockStartedAt = 0;
  let resolveDock = null;

  const homePosition = new Vector3();
  const homeTarget = new Vector3();
  const position = new Vector3();
  const target = new Vector3();

  const dockFromPosition = new Vector3();
  const dockFromTarget = new Vector3();
  const dockToPosition = new Vector3();
  const dockFromRotation = new Quaternion();
  const dockFromOffset = new Vector3();
  const restRotation = new Quaternion();

  const pointer = new Vector2();
  const parallax = new Vector2();
  const raycaster = new Raycaster();
  const scratch = new Vector3();

  /**
   * Camera pose for the current aspect ratio.
   *  - landscape: workstation right of centre, leaving the left for the text;
   *    narrower windows pull back so it still fits.
   *  - portrait: workstation in the top third, the text sits underneath.
   */
  const computeHome = () => {
    const portrait = aspect < PORTRAIT_MAX_ASPECT;
    if (portrait) {
      const distance = Math.max(10.5, PORTRAIT_FIT / (TAN_HALF_FOV * aspect));
      homePosition.set(0.4, -0.3, distance);
      homeTarget.set(0, -0.3 - distance * PORTRAIT_LOOK_DOWN, 0);
    } else {
      const distance = Math.max(LANDSCAPE_DISTANCE, (LANDSCAPE_DISTANCE * LANDSCAPE_FULL_ASPECT) / aspect);
      homePosition.set(-1.4, 0.5, distance);
      homeTarget.set(-2.3, -0.35, 0);
    }
    satellite.visible = !portrait;
  };

  /** Where the camera must be for the CRT glass to fill the viewport exactly. */
  const computeDockPosition = () => {
    const fitHeight = SCREEN_HEIGHT / 2 / TAN_HALF_FOV;
    const fitWidth = SCREEN_WIDTH / 2 / (TAN_HALF_FOV * aspect);
    dockToPosition.copy(SCREEN_CENTER);
    dockToPosition.z += Math.min(fitHeight, fitWidth) * 0.96;
  };

  const resize = () => {
    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || canvas.parentElement?.clientHeight || window.innerHeight;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    aspect = width / height;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    computeHome();
    if (mode === 'docking' || mode === 'docked') computeDockPosition();
  };

  const poseWorkstation = (seconds) => {
    workstation.rotation.set(
      0.05 + Math.sin(seconds * 0.31) * 0.03,
      -0.38 + Math.sin(seconds * 0.25) * 0.06,
      Math.sin(seconds * 0.2) * 0.02
    );
    workstation.position.set(0, Math.sin(seconds * 0.5) * 0.08, 0);
  };

  const poseSatellite = (seconds) => {
    const phase = seconds * 0.04;
    const [x, y, z] = SATELLITE_HOME;
    satellite.position.set(x + Math.sin(phase) * 3, y + Math.sin(phase * 1.3) * 0.4, z - (1 - Math.cos(phase)) * 2);
    satellite.rotation.set(0.5, 0.5 + seconds * 0.05, 0.3);
  };

  const update = (now) => {
    const elapsed = frozen ? 0 : now - startedAt;
    const seconds = elapsed / 1000;

    if (frozen || now - lastScreenRefresh >= SCREEN_REFRESH_MS) {
      lastScreenRefresh = now;
      if (screenTexture.tick(frozen ? 0 : now)) screenMap.needsUpdate = true;
    }

    poseSatellite(seconds);
    if (!frozen) surface.rotateY(0.00012);

    if (mode === 'docking' || mode === 'docked') {
      const k = mode === 'docked' ? 1 : easeInOutCubic(clamp01((now - dockStartedAt) / SCENE_DOCK_MS));
      // Straighten the workstation while flying in, so the screen ends square-on.
      workstation.quaternion.slerpQuaternions(dockFromRotation, restRotation, k);
      workstation.position.copy(dockFromOffset).multiplyScalar(1 - k);
      position.lerpVectors(dockFromPosition, dockToPosition, k);
      target.lerpVectors(dockFromTarget, SCREEN_CENTER, k);

      if (mode === 'docking' && k >= 1) {
        mode = 'docked';
        resolveDock?.();
        resolveDock = null;
      }
    } else {
      // Every motion below is zero at t = 0, so the first live frame is the
      // poster's frame and the cross-fade between them is seamless.
      poseWorkstation(seconds);
      position.copy(homePosition);
      target.copy(homeTarget);

      if (!frozen) {
        // Ease toward the pointer; a slow drift keeps the frame alive without it.
        parallax.x += (pointer.x - parallax.x) * 0.04;
        parallax.y += (pointer.y - parallax.y) * 0.04;
        position.x += parallax.x * 0.45 + Math.sin(seconds * 0.17) * 0.08;
        position.y += parallax.y * 0.28 + Math.sin(seconds * 0.13) * 0.05;
      }
    }

    camera.position.copy(position);
    camera.lookAt(target);
  };

  const render = (now) => {
    update(now);
    renderer.render(scene, camera);

    if (!readyReported && textureSettled) {
      readyReported = true;
      // The visitor first sees the scene now, so its clock starts now.
      startedAt = now;
      onReady?.();
    }
  };

  const loop = (now) => {
    if (disposed) return;
    render(now);
    frame = requestAnimationFrame(loop);
  };

  const start = () => {
    if (disposed || frozen || frame || document.hidden) return;
    frame = requestAnimationFrame(loop);
  };

  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };

  // ── Events ───────────────────────────────────────────────────────────────
  const handleVisibility = () => (document.hidden ? stop() : start());

  const toPointer = (event) => {
    const rect = canvas.getBoundingClientRect();
    return new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    );
  };

  const isOverWorkstation = (event) => {
    raycaster.setFromCamera(toPointer(event), camera);
    return raycaster.intersectObject(workstation, true).length > 0;
  };

  const handlePointerMove = (event) => {
    pointer.copy(toPointer(event));
    if (mode === 'idle') canvas.style.cursor = isOverWorkstation(event) ? 'pointer' : '';
  };

  const handleClick = (event) => {
    if (mode === 'idle' && isOverWorkstation(event)) onActivate?.();
  };

  // The monitor's text is drawn on a canvas, which keeps whatever font was
  // available when it was drawn. Redraw it when a web font finishes loading.
  const handleFontsLoaded = () => screenTexture.invalidate();

  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement ?? canvas);
  document.fonts?.addEventListener?.('loadingdone', handleFontsLoaded);
  document.addEventListener('visibilitychange', handleVisibility);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('click', handleClick);

  // ── Earth texture ────────────────────────────────────────────────────────
  const settleTexture = () => {
    textureSettled = true;
  };
  new TextureLoader().load(
    earthUrl,
    (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      surfaceMaterial.map = texture;
      surfaceMaterial.color.set(0xffffff);
      surfaceMaterial.needsUpdate = true;
      settleTexture();
    },
    undefined,
    // A missing texture leaves a plain blue globe; the scene is still usable.
    settleTexture
  );

  resize();
  start();

  // ── API ──────────────────────────────────────────────────────────────────
  const dock = () =>
    new Promise((resolve) => {
      if (disposed || mode === 'docking' || mode === 'docked') {
        resolve();
        return;
      }
      dockFromPosition.copy(camera.position);
      dockFromTarget.copy(target);
      dockFromRotation.copy(workstation.quaternion);
      dockFromOffset.copy(workstation.position);
      computeDockPosition();
      dockStartedAt = performance.now();
      screenTexture.startBoot(dockStartedAt);
      resolveDock = resolve;
      canvas.style.cursor = '';
      mode = 'docking';
    });

  /** Hold the t = 0 pose and render it once. Used by scripts/render-poster.mjs. */
  const freeze = () => {
    frozen = true;
    stop();
    resize();
    render(performance.now());
  };

  /** Bounding box of the CRT glass as fractions of the canvas (origin top-left). */
  const getScreenRect = () => {
    workstation.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const xs = [];
    const ys = [];
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      scratch
        .set(SCREEN_CENTER.x + (sx * SCREEN_WIDTH) / 2, SCREEN_CENTER.y + (sy * SCREEN_HEIGHT) / 2, SCREEN_CENTER.z)
        .applyMatrix4(workstation.matrixWorld)
        .project(camera);
      xs.push((scratch.x + 1) / 2);
      ys.push((1 - scratch.y) / 2);
    }
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const width = Math.max(...xs) - left;
    const height = Math.max(...ys) - top;
    return { x: left + width / 2, y: top + height / 2, width, height };
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    observer.disconnect();
    document.fonts?.removeEventListener?.('loadingdone', handleFontsLoaded);
    document.removeEventListener('visibilitychange', handleVisibility);
    // Never leave a caller waiting on a fly-in that can no longer finish.
    resolveDock?.();
    resolveDock = null;
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('click', handleClick);
    canvas.style.cursor = '';

    scene.traverse((object) => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        material?.map?.dispose();
        material?.dispose();
      }
    });
    renderer.dispose();
    // A detached canvas keeps its context alive until garbage collection.
    renderer.forceContextLoss();
  };

  return { dock, freeze, getScreenRect, dispose };
};
