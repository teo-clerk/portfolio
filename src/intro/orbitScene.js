/**
 * The orbit scene: a retro workstation above the Earth, a radar satellite, the
 * Moon, and, one long zoom away, the solar system. Docking flies the camera
 * into the monitor; the map flies out to the planets.
 *
 * This module owns the renderer, the frame loop, input and the public API.
 * The pieces live in ./scene/. It is the single entry point to `three`: only
 * this file and ./scene/* import it, and useOrbitScene.js reaches this file
 * through a dynamic import after first paint (tests/introState.test.js).
 *
 * Lifecycle rules, the same ones FloatingLines.jsx follows:
 *  - one WebGL context, created once, released with forceContextLoss() on
 *    dispose (browsers cap live contexts at about 16);
 *  - no rendering while the tab is hidden;
 *  - the device pixel ratio is clamped (per quality rung);
 *  - every geometry, material, texture and render target is disposed.
 *
 * Determinism: at t = 0 the scene draws exactly the still poster
 * (scripts/render-poster.mjs renders it from here). Nothing moves at t = 0,
 * random values are seeded, and the planets only move while the map is open.
 */
import {
  ACESFilmicToneMapping,
  AmbientLight,
  CanvasTexture,
  DirectionalLight,
  Group,
  MathUtils,
  PerspectiveCamera,
  PointLight,
  Quaternion,
  Raycaster,
  SRGBColorSpace,
  Scene,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';

import { BOOT_LINES } from '../data/bootLines';
import earthLargeUrl from './assets/earth.webp';
import earthSmallUrl from './assets/earth-2k.webp';
import nightLargeUrl from './assets/earth-night.webp';
import nightSmallUrl from './assets/earth-night-1k.webp';
import moonUrl from './assets/moon.webp';
import { MAP_DOCK_MS, PORTRAIT_MAX_ASPECT, SCENE_DOCK_MS } from './introState';
import { QUALITY_SETTINGS, assessFrames, isAssessmentComplete, nextQuality } from './scenePolicy';
import { createScreenTexture } from './screenTexture';
import { MAP_YEAR_SECONDS, findStop, stopExtent } from './stops';
import { applyPose, copyPose, createFlight, createPose, stepFlight } from './scene/cameraRig';
import { buildEarth } from './scene/earth';
import { EARTH_CENTER, ECLIPTIC_NORMAL, SUN_POSITION } from './scene/layout';
import { buildSatellite } from './scene/satellite';
import { buildSky } from './scene/sky';
import { buildSolarSystem } from './scene/solarSystem';
import { clamp01, smoothstep } from './scene/util';
import { buildWorkstation, SCREEN_CENTER, SCREEN_HEIGHT, SCREEN_WIDTH } from './scene/workstation';

// ── Tunables ────────────────────────────────────────────────────────────────
const FIELD_OF_VIEW = 38;
const TAN_HALF_FOV = Math.tan(MathUtils.degToRad(FIELD_OF_VIEW / 2));
const SPACE_COLOR = 0x04060c;
const SCREEN_REFRESH_MS = 110;

/** Landscape camera distance, and the aspect ratio below which it starts pulling back. */
const LANDSCAPE_DISTANCE = 8.2;
const LANDSCAPE_FULL_ASPECT = 1.6;
/** Portrait: half-width that must stay in frame, and how far below the workstation the camera aims. */
const PORTRAIT_FIT = 2.55;
const PORTRAIT_LOOK_DOWN = 0.18;

/**
 * The map looks down on the ecliptic from this elevation and fits this radius
 * (past Neptune). Portrait screens look more steeply down, so the orbits use
 * the height, and fit out to Saturn; the strip reaches the rest.
 */
const MAP_ELEVATION = MathUtils.degToRad(36);
const MAP_ELEVATION_PORTRAIT = MathUtils.degToRad(62);
const MAP_FIT_RADIUS = 1700;
const MAP_FIT_RADIUS_PORTRAIT = 1250;
const MAP_MAX_DISTANCE = 9000;
/** A stop frames its planet at this fraction of the screen. */
const STOP_FILL_LANDSCAPE = 0.42;
const STOP_FILL_PORTRAIT = 0.62;
/** The Sun is framed smaller: up close it is a wall of light. */
const SUN_FILL_SCALE = 0.62;
/** How far a ringed planet's view is tipped toward its pole, so the rings never sit edge-on. */
const RING_VIEW_TILT = 0.8;
/** Where the planet sits on screen while its panel is open (NDC). */
const STOP_SHIFT_LANDSCAPE = new Vector2(-0.4, 0.02);
const STOP_SHIFT_PORTRAIT = new Vector2(0, 0.42);

const HOME_TO_MAP_MS = 2600;
const MAP_TO_HOME_MS = 2200;
const STOP_MS = 1700;

/** Drag-to-look limits at home (radians); the view springs back on release. */
const HOME_YAW_LIMIT = 0.55;
const HOME_PITCH_LIMIT = 0.28;
const MAP_PITCH_LIMIT = 0.5;
const DRAG_SPEED = 0.005;
const DRAG_THRESHOLD_PX = 6;

const SUN_INTENSITY = 2.9;

const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);

/** Direction the map looks from: above the ecliptic, on the side the home camera faces from. */
const mapDirection = (elevation) => {
  const home = new Vector3(0.9, 0.85, LANDSCAPE_DISTANCE).normalize();
  const level = home.addScaledVector(ECLIPTIC_NORMAL, -home.dot(ECLIPTIC_NORMAL)).normalize();
  return level.multiplyScalar(Math.cos(elevation)).addScaledVector(ECLIPTIC_NORMAL, Math.sin(elevation)).normalize();
};
const MAP_DIRECTION = mapDirection(MAP_ELEVATION);
const MAP_DIRECTION_PORTRAIT = mapDirection(MAP_ELEVATION_PORTRAIT);

const loadTexture = (loader, url, { onLoad, onSettle }) =>
  loader.load(
    url,
    (texture) => {
      texture.colorSpace = SRGBColorSpace;
      onLoad(texture);
      onSettle();
    },
    undefined,
    // A missing texture leaves a plainer globe; the scene is still usable.
    onSettle
  );

// ── Public API ──────────────────────────────────────────────────────────────
/**
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   quality?: 'high' | 'lite' | 'minimal',
 *   bootLines?: readonly string[],
 *   onReady?: () => void,
 *   onActivate?: (target: 'workstation' | 'satellite') => void,
 *   onStopSelect?: (id: string) => void,
 *   onGiveUp?: () => void,
 * }} options
 *   `onReady` fires after the first frame with every texture (and the glow
 *   pass, where used) in place: that frame matches the poster.
 *   `onGiveUp` fires if the device cannot keep up even on the lowest rung.
 * @returns {{
 *   dock: () => Promise<void>,
 *   getDockMs: () => number,
 *   enterMap: () => Promise<void>,
 *   exitMap: () => Promise<void>,
 *   focusStop: (id: string | null) => Promise<void>,
 *   setLabelListener: (listener: ((labels: object[]) => void) | null) => void,
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

const buildOrbitScene = (
  renderer,
  canvas,
  { quality: initialQuality = 'high', bootLines = BOOT_LINES, onReady, onActivate, onStopSelect, onGiveUp }
) => {
  let quality = QUALITY_SETTINGS[initialQuality] ? initialQuality : 'high';
  let settings = QUALITY_SETTINGS[quality];

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.maxPixelRatio));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(SPACE_COLOR, 1);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 0.05, 1000);

  // ── Light: the Sun is a real point in the world (no falloff), so every
  // planet gets the right phase; blue earthshine fills the workstation.
  const sunLight = new PointLight(0xfff4e2, SUN_INTENSITY, 0, 0);
  sunLight.position.copy(SUN_POSITION);
  scene.add(sunLight, new AmbientLight(0xaab8d8, 0.3));

  const sky = buildSky(renderer, { detail: settings.detail });
  scene.add(sky.group);

  // ── The home rig: everything that travels with the Earth around the Sun.
  // The pivot sits at the Sun and turns about the ecliptic normal; the rig
  // undoes its offset, so at t = 0 the rig's coordinates are world coordinates.
  const homePivot = new Group();
  homePivot.position.copy(SUN_POSITION);
  const homeRig = new Group();
  homeRig.position.copy(SUN_POSITION).negate();
  homePivot.add(homeRig);
  scene.add(homePivot);

  const earthshine = new DirectionalLight(0x86b4ff, 0.55);
  earthshine.position.set(3, -6, 2);
  homeRig.add(earthshine, earthshine.target);

  const sunWorld = SUN_POSITION.clone();
  const earth = buildEarth({ sunPosition: sunWorld, detail: settings.detail });
  const earthSurface = earth.earth.children[0];
  earthSurface.userData.stopId = 'earth';
  const satellite = buildSatellite();

  const screenTexture = createScreenTexture(bootLines);
  const screenMap = new CanvasTexture(screenTexture.canvas);
  screenMap.colorSpace = SRGBColorSpace;
  const { workstation, screenMaterial, pressKeys } = buildWorkstation(screenMap);

  homeRig.add(earth.earth, earth.moon, satellite.satellite, satellite.beam, satellite.footprint, workstation);

  const earthWorld = new Vector3();
  const getEarthPosition = (out) => homeRig.localToWorld(out.copy(EARTH_CENTER));
  const solar = buildSolarSystem({ detail: settings.detail, getEarthPosition });
  scene.add(solar.group);

  // ── State ────────────────────────────────────────────────────────────────
  /** @type {'home' | 'map' | 'stop' | 'docked'} */
  let view = 'home';
  let selectedId = null;
  let flight = null;
  let disposed = false;
  let frozen = false;
  let readyReported = false;
  let pendingAssets = 3 + (settings.bloom ? 1 : 0);
  let frame = 0;
  let aspect = 1;
  let isPortrait = false;
  let bloom = null;
  let labelListener = null;
  let labelsShown = false;

  let startedAt = performance.now();
  let lastNow = startedAt;
  let lastRenderAt = 0;
  let lastScreenRefresh = -Infinity;
  let systemTime = 0;
  let mapFade = 0;

  let dockStartedAt = 0;
  let dockDurationMs = SCENE_DOCK_MS;
  let assessing = null;

  const pose = createPose();
  const display = createPose();
  const homeLocalPosition = new Vector3();
  const homeLocalTarget = new Vector3();
  const rigQuaternion = new Quaternion();
  const dockFromRotation = new Quaternion();
  const dockFromOffset = new Vector3();
  const restRotation = new Quaternion();
  const scratch = new Vector3();
  const scratch2 = new Vector3();

  const pointer = new Vector2();
  const parallax = new Vector2();
  const drag = { yaw: 0, pitch: 0, active: false, moved: false, startX: 0, startY: 0, lastX: 0, lastY: 0, id: null };
  const raycaster = new Raycaster();
  const textures = [];

  // ── Poses ────────────────────────────────────────────────────────────────
  /** Home shot for the current aspect ratio, in the rig's (moving) frame. */
  const homePose = (out) => {
    if (isPortrait) {
      const distance = Math.max(10.5, PORTRAIT_FIT / (TAN_HALF_FOV * aspect));
      homeLocalPosition.set(0.4, -0.3, distance);
      homeLocalTarget.set(0, -0.3 - distance * PORTRAIT_LOOK_DOWN, 0);
    } else {
      const distance = Math.max(LANDSCAPE_DISTANCE, (LANDSCAPE_DISTANCE * LANDSCAPE_FULL_ASPECT) / aspect);
      homeLocalPosition.set(-1.4, 0.5, distance);
      homeLocalTarget.set(-2.3, -0.35, 0);
    }
    homeRig.localToWorld(out.target.copy(homeLocalTarget));
    homeRig.localToWorld(scratch.copy(homeLocalPosition));
    out.direction.copy(scratch).sub(out.target);
    out.distance = out.direction.length();
    out.direction.divideScalar(out.distance);
    out.up.copy(Y_AXIS).applyQuaternion(rigQuaternion);
    out.shift.set(0, 0);
    return out;
  };

  const mapPose = (out) => {
    const radius = isPortrait ? MAP_FIT_RADIUS_PORTRAIT : MAP_FIT_RADIUS;
    const elevation = isPortrait ? MAP_ELEVATION_PORTRAIT : MAP_ELEVATION;
    const horizontal = radius / (TAN_HALF_FOV * aspect);
    const vertical = (radius * Math.sin(elevation)) / TAN_HALF_FOV;
    out.target.copy(SUN_POSITION);
    out.direction.copy(isPortrait ? MAP_DIRECTION_PORTRAIT : MAP_DIRECTION);
    out.distance = Math.min(MAP_MAX_DISTANCE, Math.max(horizontal, vertical) * 1.12);
    out.up.copy(ECLIPTIC_NORMAL);
    out.shift.set(0, isPortrait ? 0.12 : 0.04);
    return out;
  };

  const stopPose = (out, id) => {
    const stop = findStop(id);
    solar.positionOf(id, out.target);
    if (id === 'sun') {
      out.direction.copy(MAP_DIRECTION);
    } else {
      // Three-quarters lit: between the Sun and the planet, above the ecliptic.
      const sunward = scratch.copy(SUN_POSITION).sub(out.target).normalize();
      const along = scratch2.crossVectors(ECLIPTIC_NORMAL, sunward).normalize();
      out.direction.copy(sunward).multiplyScalar(0.62).addScaledVector(along, 0.58).addScaledVector(ECLIPTIC_NORMAL, 0.42).normalize();
      if (stop.rings) {
        const axis = solar.axisOf(id, scratch);
        out.direction.addScaledVector(axis, RING_VIEW_TILT * (Math.sign(out.direction.dot(axis)) || 1)).normalize();
      }
    }
    const extent = stopExtent(stop);
    const fill = id === 'sun' ? SUN_FILL_SCALE : 1;
    out.distance = isPortrait
      ? extent / (STOP_FILL_PORTRAIT * fill * TAN_HALF_FOV * aspect)
      : extent / (STOP_FILL_LANDSCAPE * fill * TAN_HALF_FOV);
    out.up.copy(ECLIPTIC_NORMAL);
    out.shift.copy(isPortrait ? STOP_SHIFT_PORTRAIT : STOP_SHIFT_LANDSCAPE);
    return out;
  };

  /** Where the camera must be for the CRT glass to fill the viewport exactly. */
  const dockPose = (out) => {
    const fitHeight = SCREEN_HEIGHT / 2 / TAN_HALF_FOV;
    const fitWidth = SCREEN_WIDTH / 2 / (TAN_HALF_FOV * aspect);
    homeRig.localToWorld(out.target.copy(SCREEN_CENTER));
    out.direction.copy(Z_AXIS).applyQuaternion(rigQuaternion);
    out.distance = Math.min(fitHeight, fitWidth) * 0.96;
    out.up.copy(Y_AXIS).applyQuaternion(rigQuaternion);
    out.shift.set(0, 0);
    return out;
  };

  const restingPose = (out) => {
    if (view === 'map') return mapPose(out);
    if (view === 'stop') return stopPose(out, selectedId);
    if (view === 'docked') return dockPose(out);
    return homePose(out);
  };

  /** Drag offsets (and, at home, pointer parallax and a slow drift) on top of a resting pose. */
  const withViewMotion = (out, from, seconds) => {
    copyPose(out, from);
    let yaw = drag.yaw;
    let pitch = drag.pitch;
    if (view === 'home' && !frozen) {
      yaw += parallax.x * 0.055 + Math.sin(seconds * 0.17) * 0.01;
      pitch += parallax.y * 0.035 + Math.sin(seconds * 0.13) * 0.006;
    }
    if (yaw !== 0 || pitch !== 0) {
      const right = scratch.crossVectors(out.up, out.direction).normalize();
      out.direction.applyAxisAngle(out.up, -yaw).applyAxisAngle(right, pitch).normalize();
    }
    return out;
  };

  // ── Flights ──────────────────────────────────────────────────────────────
  /** Fly from wherever the camera is now; `arrive` is the view once there. */
  const flyTo = (arrive, durationMs, { onStart } = {}) =>
    new Promise((resolve) => {
      if (disposed) {
        resolve();
        return;
      }
      flight?.resolve();
      const now = performance.now();
      const fromFade = mapFade;
      const toFade = arrive === 'map' || arrive === 'stop' ? 1 : 0;
      const target = createPose();
      flight = {
        ...createFlight({
          from: display,
          now,
          durationMs,
          to: () => {
            if (arrive === 'map') return mapPose(target);
            if (arrive === 'stop') return stopPose(target, selectedId);
            if (arrive === 'docked') return dockPose(target);
            return homePose(target);
          },
        }),
        arrive,
        fromFade,
        toFade,
        resolve,
      };
      drag.yaw = 0;
      drag.pitch = 0;
      onStart?.(now);
    });

  const finishFlight = () => {
    const done = flight;
    flight = null;
    view = done.arrive;
    if (view === 'home') parallax.set(0, 0);
    done.resolve();
  };

  // ── Resize ───────────────────────────────────────────────────────────────
  const resize = () => {
    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || canvas.parentElement?.clientHeight || window.innerHeight;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    bloom?.setSize(width, height);
    aspect = width / height;
    isPortrait = aspect < PORTRAIT_MAX_ASPECT;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  };

  // ── Animation ────────────────────────────────────────────────────────────
  const poseWorkstation = (seconds) => {
    workstation.rotation.set(
      0.05 + Math.sin(seconds * 0.31) * 0.03,
      -0.38 + Math.sin(seconds * 0.25) * 0.06,
      Math.sin(seconds * 0.2) * 0.02
    );
    workstation.position.set(0, Math.sin(seconds * 0.5) * 0.08, 0);
  };

  const isMapBound = () => (flight ? flight.toFade === 1 : view === 'map' || view === 'stop');

  const update = (now) => {
    const dt = Math.min(0.1, Math.max(0, (now - lastNow) / 1000));
    lastNow = now;
    const seconds = frozen ? 0 : (now - startedAt) / 1000;

    // Planets (and the Earth with everything near it) move only in the map.
    if (!frozen && isMapBound()) systemTime += dt;
    homePivot.quaternion.setFromAxisAngle(ECLIPTIC_NORMAL, (2 * Math.PI * systemTime) / MAP_YEAR_SECONDS);
    rigQuaternion.copy(homePivot.quaternion);
    homePivot.updateMatrixWorld(true);
    getEarthPosition(earthWorld);

    if (frozen || now - lastScreenRefresh >= SCREEN_REFRESH_MS) {
      lastScreenRefresh = now;
      if (screenTexture.tick(frozen ? 0 : now)) screenMap.needsUpdate = true;
    }
    earth.update(seconds);
    satellite.update(seconds);
    solar.update(systemTime, mapFade, selectedId);

    // Workstation: idle float, straightening during the fly-in, square once docked.
    const docking = flight?.arrive === 'docked';
    if (docking || view === 'docked') {
      const k = docking ? clamp01((now - dockStartedAt) / dockDurationMs) : 1;
      const eased = k * k * (3 - 2 * k);
      workstation.quaternion.slerpQuaternions(dockFromRotation, restRotation, eased);
      workstation.position.copy(dockFromOffset).multiplyScalar(1 - eased);
      pressKeys(docking ? now - dockStartedAt : null);
    } else {
      poseWorkstation(seconds);
      pressKeys(null);
    }

    // Camera.
    if (!frozen && !drag.active && view === 'home') {
      parallax.x += (pointer.x - parallax.x) * 0.04;
      parallax.y += (pointer.y - parallax.y) * 0.04;
      // Spring back after a drag.
      const spring = Math.exp(-dt * 5);
      drag.yaw *= spring;
      drag.pitch *= spring;
    }

    if (flight) {
      const k = clamp01((now - flight.startedAt) / flight.durationMs);
      const rising = flight.toFade > flight.fromFade;
      const blend = rising ? smoothstep(0.05, 0.5, k) : smoothstep(0.5, 0.95, k);
      mapFade = MathUtils.lerp(flight.fromFade, flight.toFade, blend);
      if (stepFlight(flight, now, pose)) finishFlight();
      copyPose(display, pose);
    } else {
      mapFade = view === 'map' || view === 'stop' ? 1 : 0;
      withViewMotion(display, restingPose(pose), seconds);
    }
    applyPose(camera, display);
    sky.follow(camera);

    satellite.setVisible(!isPortrait && mapFade < 0.5);
  };

  // ── Labels for the map's HTML overlay ────────────────────────────────────
  const labels = [];
  const reportLabels = () => {
    if (!labelListener) return;
    const show = view === 'map' && !flight;
    if (!show && !labelsShown) return;
    labelsShown = show;
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    labels.length = 0;
    for (const id of ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
      solar.positionOf(id, scratch);
      const distance = scratch.distanceTo(camera.position);
      scratch.project(camera);
      const radius = (stopExtent(findStop(id)) / (distance * TAN_HALF_FOV)) * (height / 2);
      labels.push({
        id,
        x: ((scratch.x + 1) / 2) * width,
        y: ((1 - scratch.y) / 2) * height,
        radius,
        visible: show && scratch.z < 1 && Math.abs(scratch.x) < 1.1 && Math.abs(scratch.y) < 1.1,
      });
    }
    labelListener(labels);
  };

  // ── Rendering ────────────────────────────────────────────────────────────
  const draw = () => {
    const useBloom = bloom && settings.bloom && !isPortrait;
    // The composer tone-maps the screen too; lift it so it reads the same.
    screenMaterial.color.setScalar(useBloom ? 1.35 : 1);
    if (useBloom) bloom.render();
    else renderer.render(scene, camera);
  };

  const render = (now) => {
    const isFirstVisible = !readyReported && pendingAssets === 0;
    // The visitor first sees the scene on this frame, so its clock starts now
    // and this frame is drawn at t = 0, the moment the poster shows.
    if (isFirstVisible) startedAt = now;
    update(now);
    draw();
    reportLabels();
    lastRenderAt = now;

    if (isFirstVisible) {
      readyReported = true;
      onReady?.();
      if (!frozen) assessing = { startedAt: now, last: now, intervals: [] };
    }
  };

  /**
   * Step down a rung. Pixel ratio, glow and frame cap change now; the Earth
   * map and the noise octaves stay those of the rung the scene started on.
   */
  const setQuality = (next) => {
    quality = next;
    settings = QUALITY_SETTINGS[quality];
    if (!settings.bloom && bloom) {
      bloom.dispose();
      bloom = null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.maxPixelRatio));
    resize();
  };

  /** After going live (and after each step down): is this device keeping up? */
  const assess = (now) => {
    if (!assessing) return;
    if (view !== 'home' || flight) {
      // The visitor is already flying around: judge only the quiet landing.
      assessing = null;
      return;
    }
    assessing.intervals.push(now - assessing.last);
    assessing.last = now;
    if (!isAssessmentComplete(assessing.intervals, now - assessing.startedAt)) return;

    const verdict = assessFrames(assessing.intervals, quality);
    assessing = null;
    if (verdict === 'down') {
      setQuality(nextQuality(quality));
      assessing = { startedAt: now, last: now, intervals: [] };
    } else if (verdict === 'give-up') {
      onGiveUp?.();
    }
  };

  const loop = (now) => {
    if (disposed) return;
    frame = requestAnimationFrame(loop);
    const capped = settings.fpsCap > 0 && !flight && !assessing && readyReported;
    if (capped && now - lastRenderAt < 1000 / settings.fpsCap - 2) return;
    render(now);
    assess(now);
  };

  const start = () => {
    if (disposed || frozen || frame || document.hidden) return;
    lastNow = performance.now();
    // A check cut short by a hidden tab starts over on return; the time away
    // says nothing about the device.
    if (assessing) assessing = { startedAt: lastNow, last: lastNow, intervals: [] };
    frame = requestAnimationFrame(loop);
  };

  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };

  // ── Input ────────────────────────────────────────────────────────────────
  const handleVisibility = () => (document.hidden ? stop() : start());

  const toPointer = (event, out = new Vector2()) => {
    const rect = canvas.getBoundingClientRect();
    return out.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1));
  };

  /** What is under the pointer: a home-shot object, or a stop id in the map. */
  const pick = (event) => {
    raycaster.setFromCamera(toPointer(event), camera);
    if (view === 'home' && !flight) {
      if (satellite.satellite.visible && raycaster.intersectObject(satellite.hitTarget, false).length > 0) return 'satellite';
      if (raycaster.intersectObject(workstation, true).length > 0) return 'workstation';
      return null;
    }
    if ((view === 'map' || view === 'stop') && !flight) {
      const hit = raycaster.intersectObjects([...solar.hitTargets, earthSurface], false)[0];
      return hit ? `stop:${hit.object.userData.stopId}` : null;
    }
    return null;
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0 || drag.id !== null) return;
    drag.id = event.pointerId;
    drag.active = true;
    drag.moved = false;
    drag.startX = drag.lastX = event.clientX;
    drag.startY = drag.lastY = event.clientY;
    // Capture now, not once the drag starts: a press released outside the
    // window would otherwise never end, and every later press be ignored.
    canvas.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    toPointer(event, pointer);
    if (drag.active && event.pointerId === drag.id) {
      if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > DRAG_THRESHOLD_PX) {
        drag.moved = true;
        canvas.style.cursor = 'grabbing';
      }
      if (drag.moved && !flight && view !== 'docked') {
        const home = view === 'home';
        drag.yaw += (event.clientX - drag.lastX) * DRAG_SPEED;
        drag.pitch += (event.clientY - drag.lastY) * DRAG_SPEED;
        if (home) drag.yaw = MathUtils.clamp(drag.yaw, -HOME_YAW_LIMIT, HOME_YAW_LIMIT);
        drag.pitch = MathUtils.clamp(drag.pitch, -(home ? HOME_PITCH_LIMIT : MAP_PITCH_LIMIT), home ? HOME_PITCH_LIMIT : MAP_PITCH_LIMIT);
      }
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      return;
    }
    if (event.pointerType === 'mouse') canvas.style.cursor = pick(event) ? 'pointer' : '';
  };

  const endDrag = (event) => {
    if (event.pointerId !== drag.id) return false;
    const wasClick = drag.active && !drag.moved;
    drag.active = false;
    drag.id = null;
    canvas.releasePointerCapture?.(event.pointerId);
    canvas.style.cursor = '';
    return wasClick;
  };

  const handlePointerUp = (event) => {
    if (!endDrag(event)) return;
    const target = pick(event);
    if (target === 'satellite' || target === 'workstation') onActivate?.(target);
    else if (target?.startsWith('stop:')) onStopSelect?.(target.slice(5));
  };

  const handlePointerCancel = (event) => endDrag(event);

  // After a lost WebGL context three rebuilds its own state, but render
  // targets come back empty: paint the Milky Way again.
  const handleContextRestored = () => sky.rebake();

  // The monitor's text is drawn on a canvas, which keeps whatever font was
  // available when it was drawn. Redraw it when a web font finishes loading.
  const handleFontsLoaded = () => screenTexture.invalidate();

  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement ?? canvas);
  document.fonts?.addEventListener?.('loadingdone', handleFontsLoaded);
  document.addEventListener('visibilitychange', handleVisibility);
  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerCancel);
  canvas.addEventListener('lostpointercapture', handlePointerCancel);
  canvas.addEventListener('webglcontextrestored', handleContextRestored);

  // ── Assets ───────────────────────────────────────────────────────────────
  const settle = () => {
    pendingAssets -= 1;
  };
  const loader = new TextureLoader();
  const keep = (texture) => {
    if (disposed) {
      texture.dispose();
      return false;
    }
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    textures.push(texture);
    return true;
  };
  const large = settings.earthMap === 'large';
  loadTexture(loader, large ? earthLargeUrl : earthSmallUrl, {
    onSettle: settle,
    onLoad: (texture) => {
      if (!keep(texture)) return;
      earth.surfaceMaterial.uniforms.uDay.value = texture;
      earth.surfaceMaterial.uniforms.uHasDay.value = 1;
    },
  });
  loadTexture(loader, large ? nightLargeUrl : nightSmallUrl, {
    onSettle: settle,
    onLoad: (texture) => {
      if (!keep(texture)) return;
      earth.surfaceMaterial.uniforms.uNight.value = texture;
      earth.surfaceMaterial.uniforms.uHasNight.value = 1;
    },
  });
  loadTexture(loader, moonUrl, {
    onSettle: settle,
    onLoad: (texture) => {
      if (keep(texture)) earth.moon.material.uniforms.uMap.value = texture;
    },
  });
  if (settings.bloom) {
    import('./scene/postfx.js')
      .then(({ createBloom }) => {
        // Disposed, or already stepped down to a rung without glow.
        if (disposed || !settings.bloom) return;
        bloom = createBloom(renderer, scene, camera);
        resize();
      })
      // No glow is fine: the scene renders directly.
      .catch(() => undefined)
      .finally(settle);
  }

  resize();
  start();

  // ── API ──────────────────────────────────────────────────────────────────
  const dock = () => {
    if (disposed || view === 'docked' || flight?.arrive === 'docked') return Promise.resolve();
    dockDurationMs = view === 'home' && !flight ? SCENE_DOCK_MS : MAP_DOCK_MS;
    selectedId = null;
    return flyTo('docked', dockDurationMs, {
      onStart: (now) => {
        dockStartedAt = now;
        dockFromRotation.copy(workstation.quaternion);
        dockFromOffset.copy(workstation.position);
        screenTexture.startBoot(now);
        canvas.style.cursor = '';
      },
    });
  };

  const enterMap = () => {
    if (view === 'docked' || flight?.arrive === 'docked') return Promise.resolve();
    selectedId = null;
    return flyTo('map', HOME_TO_MAP_MS);
  };

  const exitMap = () => {
    if (view === 'docked' || flight?.arrive === 'docked') return Promise.resolve();
    selectedId = null;
    return flyTo('home', MAP_TO_HOME_MS);
  };

  const focusStop = (id) => {
    if (view === 'docked' || flight?.arrive === 'docked') return Promise.resolve();
    if (id === null || !findStop(id)) {
      selectedId = null;
      return flyTo('map', STOP_MS);
    }
    selectedId = id;
    return flyTo('stop', STOP_MS);
  };

  const setLabelListener = (listener) => {
    labelListener = listener;
    labelsShown = false;
  };

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
    // Never leave a caller waiting on a flight that can no longer finish.
    flight?.resolve();
    flight = null;
    canvas.removeEventListener('pointerdown', handlePointerDown);
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('pointerup', handlePointerUp);
    canvas.removeEventListener('pointercancel', handlePointerCancel);
    canvas.removeEventListener('lostpointercapture', handlePointerCancel);
    canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    canvas.style.cursor = '';
    labelListener = null;

    scene.traverse((object) => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        material?.map?.dispose();
        material?.dispose();
      }
    });
    // Textures bound as shader uniforms are not `material.map`.
    for (const texture of textures) texture.dispose();
    sky.dispose();
    bloom?.dispose();
    renderer.dispose();
    // A detached canvas keeps its context alive until garbage collection.
    renderer.forceContextLoss();
  };


  return {
    dock,
    getDockMs: () => dockDurationMs,
    enterMap,
    exitMap,
    focusStop,
    setLabelListener,
    freeze,
    getScreenRect,
    dispose,
  };
};
