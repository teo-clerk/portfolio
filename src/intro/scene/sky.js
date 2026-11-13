/**
 * The sky: a Milky Way band and a seeded star field, both centred on the
 * camera so they stay at infinity wherever it flies.
 *
 * The Milky Way is noise-heavy, so it is painted once into a small
 * equirectangular texture when the scene starts and then drawn as a plain
 * textured dome: one cheap draw per frame instead of fractal noise over every
 * pixel of the screen.
 */
import {
  BackSide,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  HalfFloatType,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  WebGLRenderTarget,
} from 'three';

import { NOISE_GLSL, seededRandom } from './util';

const STAR_SEED = 20261112;
const STAR_COUNT = 2600;
const BRIGHT_STAR_COUNT = 140;
const BAND_STAR_COUNT = 2400;

/** Sky radius at a far plane of 1000; the group is scaled with the far plane. */
const SKY_RADIUS = 360;
const REFERENCE_FAR = 1000;

/** The band crosses the home shot from upper left to lower right. */
const BAND_NORMAL = new Vector3(-0.46, -0.86, 0.22).normalize();
/** Brightest stretch of the band (towards the galactic centre). */
const BAND_CENTRE = new Vector3(0.62, -0.28, -0.73).normalize();

const BAKE_WIDTH = 1024;
const BAKE_HEIGHT = 512;

const bakeMaterial = (detail) =>
  new ShaderMaterial({
    defines: { FBM_OCTAVES: detail },
    uniforms: {
      uBandNormal: { value: BAND_NORMAL },
      uCentre: { value: BAND_CENTRE },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uBandNormal;
      uniform vec3 uCentre;
      varying vec2 vUv;
      ${NOISE_GLSL}
      void main() {
        // The inverse of three's SphereGeometry UV mapping, so the dome shows
        // each direction's colour.
        float phi = vUv.x * 6.28318531;
        float theta = (1.0 - vUv.y) * 3.14159265;
        vec3 d = vec3(-cos(phi) * sin(theta), cos(theta), sin(phi) * sin(theta));

        float b = dot(d, uBandNormal);
        float band = exp(-b * b * 20.0);
        float core = exp(-b * b * 85.0);
        float bulge = exp(-pow(distance(d, uCentre), 2.0) * 3.2);

        float clouds = fbm(d * 4.0);
        float fine = fbm(d * 13.0 + 7.0);
        float dust = smoothstep(0.47, 0.64, fbm(d * 8.5 + 3.0));

        vec3 cool = vec3(0.30, 0.37, 0.64);
        vec3 warm = vec3(0.92, 0.74, 0.56);
        vec3 colour = mix(cool, warm, clamp(core * 0.5 + bulge * 0.7, 0.0, 1.0));
        float light = band * (0.35 + 0.8 * clouds) + core * 0.6 * fine + bulge * band * 0.6;
        light *= 1.0 - 0.8 * dust * (core + bulge * 0.6);

        // A faint violet wash away from the band, so the sky is not flat black.
        vec3 wash = vec3(0.06, 0.04, 0.11) * smoothstep(0.35, 0.8, fbm(d * 2.2 + 11.0));
        gl_FragColor = vec4(colour * light * 0.062 + wash * 0.35, 1.0);
      }
    `,
    depthTest: false,
    depthWrite: false,
  });

const createBakeTarget = () =>
  new WebGLRenderTarget(BAKE_WIDTH, BAKE_HEIGHT, {
    type: HalfFloatType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
  });

/** Paint the band into `target`. Done once, and again after a lost context. */
const bakeMilkyWay = (renderer, detail, target) => {
  const quad = new Mesh(new PlaneGeometry(2, 2), bakeMaterial(detail));
  const scene = new Scene();
  scene.add(quad);

  const previous = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  renderer.render(scene, new OrthographicCamera(-1, 1, 1, -1, 0, 1));
  renderer.setRenderTarget(previous);

  quad.geometry.dispose();
  quad.material.dispose();
};

const starLayer = (random, count, { size, opacity, inBand = false }) => {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const tint = new Color();
  const direction = new Vector3();
  for (let i = 0; i < count; i += 1) {
    // Uniform on a sphere; the band layer keeps a point with a probability
    // that falls off with its distance from the band.
    for (;;) {
      const u = random() * 2 - 1;
      const angle = random() * Math.PI * 2;
      const ring = Math.sqrt(1 - u * u);
      direction.set(ring * Math.cos(angle), u, ring * Math.sin(angle));
      if (!inBand) break;
      const b = direction.dot(BAND_NORMAL);
      if (random() < Math.exp(-b * b * 40)) break;
    }
    const radius = SKY_RADIUS * (0.9 + random() * 0.16);
    positions.set([direction.x * radius, direction.y * radius, direction.z * radius], i * 3);
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
  const points = new Points(geometry, material);
  points.renderOrder = -9;
  points.frustumCulled = false;
  return points;
};

/**
 * @param {import('three').WebGLRenderer} renderer Paints the band (once, and on `rebake`).
 * @param {{ detail: number }} options Noise octaves for the bake.
 * @returns {{
 *   group: Group,
 *   follow: (camera: import('three').PerspectiveCamera) => void,
 *   rebake: () => void,
 *   dispose: () => void,
 * }}
 */
export const buildSky = (renderer, { detail }) => {
  const group = new Group();
  const target = createBakeTarget();
  bakeMilkyWay(renderer, detail, target);

  const dome = new Mesh(
    new SphereGeometry(SKY_RADIUS * 1.15, 48, 24),
    new MeshBasicMaterial({ map: target.texture, side: BackSide, depthTest: false, depthWrite: false, fog: false })
  );
  dome.renderOrder = -10;
  dome.frustumCulled = false;

  const random = seededRandom(STAR_SEED);
  group.add(
    dome,
    starLayer(random, STAR_COUNT, { size: 1.1, opacity: 0.8 }),
    starLayer(random, BRIGHT_STAR_COUNT, { size: 2.1, opacity: 1 }),
    starLayer(random, BAND_STAR_COUNT, { size: 0.9, opacity: 0.55, inBand: true })
  );

  /** Keep the sky centred on the camera and inside its far plane. */
  const follow = (camera) => {
    group.position.copy(camera.position);
    group.scale.setScalar(camera.far / REFERENCE_FAR);
  };

  /** After a restored WebGL context the target is empty again. */
  const rebake = () => bakeMilkyWay(renderer, detail, target);

  // The dome's texture is disposed with the scene; the target owns its framebuffer.
  const dispose = () => target.dispose();

  return { group, follow, rebake, dispose };
};
