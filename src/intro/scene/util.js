/**
 * Small helpers shared by the scene modules.
 */
import { MathUtils, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three';

export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
export const clamp01 = (t) => Math.min(1, Math.max(0, t));
export const smoothstep = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

/**
 * Small seeded generator (mulberry32). Anything random in the scene must come
 * from here: the poster is a render of the scene at t = 0, and the live scene
 * cross-fades over it, so every load has to produce the same frame.
 */
export const seededRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Unit vector for a latitude/longitude on a three.js SphereGeometry with an equirectangular map. */
export const sphereDirection = ({ latitude, longitude }) => {
  const phi = MathUtils.degToRad(longitude + 180);
  const theta = MathUtils.degToRad(90 - latitude);
  return new Vector3(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
};

/**
 * Rotation that turns a globe so `focus` (a latitude/longitude) faces
 * `direction`, with geographic north running along `northHint` from there.
 */
export const globeOrientation = (focus, direction, northHint) => {
  const frame = (outward, north) => {
    const up = north.clone().addScaledVector(outward, -north.dot(outward)).normalize();
    const east = new Vector3().crossVectors(up, outward);
    return new Matrix4().makeBasis(east, up, outward);
  };
  const local = frame(sphereDirection(focus), new Vector3(0, 1, 0));
  const world = frame(direction, northHint);
  return new Quaternion().setFromRotationMatrix(world.multiply(local.invert()));
};

export const standard = (color, options = {}) =>
  new MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05, ...options });

/**
 * GLSL value noise and fractal noise over 3D positions, used for clouds, the
 * planets' surfaces, the Sun and the Milky Way. Sampling a 3D field at points
 * on a sphere has no seams and no pole pinching, unlike a 2D texture.
 *
 * `fbm` sums FBM_OCTAVES octaves; materials set it with a define (fewer on
 * phones).
 */
export const NOISE_GLSL = /* glsl */ `
  #ifndef FBM_OCTAVES
  #define FBM_OCTAVES 5
  #endif
  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }
  float noise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash13(i), hash13(i + vec3(1.0, 0.0, 0.0)), f.x),
          mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
      mix(mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), f.x),
          mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < FBM_OCTAVES; i++) {
      value += amplitude * noise3(p);
      p = p * 2.03 + vec3(17.1, 9.2, 4.7);
      amplitude *= 0.5;
    }
    return value;
  }
`;

/** Lambert term with a slightly softened terminator, shared by the planet shaders. */
export const LIGHTING_GLSL = /* glsl */ `
  float sunlight(vec3 normal, vec3 toSun) {
    float ndl = dot(normal, toSun);
    return smoothstep(-0.08, 0.35, ndl) * max(ndl + 0.08, 0.0) / 1.08;
  }
`;
