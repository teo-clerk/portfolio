/**
 * The Earth below the workstation, and the Moon in the sky beyond it.
 *
 * The surface is one shader: NASA Blue Marble by day, NASA Black Marble city
 * lights by night, procedural clouds drifting over both, sun glint on open
 * water and a warmer light along the terminator. Two shells add the
 * atmosphere: haze on the limb and a glow beyond it, both fading on the night
 * side.
 */
import { AdditiveBlending, BackSide, Color, FrontSide, Group, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three';

import { createBodyMaterial, BODY } from './bodyMaterial';
import { EARTH_CENTER, EARTH_RADIUS, MOON_POSITION, MOON_RADIUS } from './layout';
import { globeOrientation, LIGHTING_GLSL, NOISE_GLSL } from './util';

/** The Mediterranean: the part of the globe turned toward the camera. */
const EARTH_FOCUS = { latitude: 38, longitude: 15 };
/** Where EARTH_FOCUS points, and which way north runs from it (away from the camera). */
const EARTH_FOCUS_DIRECTION = new Vector3(-0.06, 0.9, 0.44).normalize();
const EARTH_NORTH_HINT = new Vector3(-0.2, 0, -1);

const ATMOSPHERE_SCALE = 1.06;

/** Radians per second: the globe turns slowly under the workstation; the clouds a little faster. */
const EARTH_SPIN = 0.0072;
const CLOUD_DRIFT = 0.0035;

const surfaceVertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPositionW;
  varying vec3 vLocal;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vLocal = normalize(position);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPositionW = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const surfaceFragment = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform float uHasDay;
  uniform float uHasNight;
  uniform vec3 uSunPosition;
  uniform float uTime;
  varying vec3 vNormalW;
  varying vec3 vPositionW;
  varying vec3 vLocal;
  varying vec2 vUv;
  ${NOISE_GLSL}
  ${LIGHTING_GLSL}

  float cloudCover(vec3 p) {
    float angle = uTime * ${CLOUD_DRIFT.toFixed(5)};
    float s = sin(angle);
    float c = cos(angle);
    p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
    float latitude = abs(p.y);
    // Domain-warped noise: swirls rather than blobs. The same on every quality
    // rung (only the octave count changes), so the clouds match the posters.
    vec3 q = p * 2.3;
    vec3 warp = vec3(fbm(q), fbm(q + vec3(5.2, 1.3, 2.8)), fbm(q + vec3(1.7, 9.2, 3.1)));
    float field = fbm(p * 4.4 + warp * 1.9);
    // Clearer skies over the subtropics, more cloud along the storm tracks.
    float subtropics = smoothstep(0.22, 0.4, latitude) * (1.0 - smoothstep(0.42, 0.6, latitude));
    float belt = 1.0 - 0.14 * subtropics + 0.12 * smoothstep(0.6, 0.85, latitude);
    return smoothstep(0.5, 0.75, field * belt) * 0.94;
  }

  void main() {
    vec3 normal = normalize(vNormalW);
    vec3 toSun = normalize(uSunPosition - vPositionW);
    vec3 toCamera = normalize(cameraPosition - vPositionW);
    float ndl = dot(normal, toSun);

    vec3 day = mix(vec3(0.02, 0.07, 0.2), texture2D(uDay, vUv).rgb, uHasDay);
    float clouds = cloudCover(vLocal);
    float water = smoothstep(0.012, 0.05, day.b - max(day.r, day.g * 0.9));

    // Sunlight reddens near the terminator.
    float dusk = smoothstep(-0.12, 0.04, ndl) * (1.0 - smoothstep(0.04, 0.32, ndl));
    vec3 sun = mix(vec3(1.0, 0.96, 0.89), vec3(1.0, 0.48, 0.22), dusk * 0.8);
    float light = sunlight(normal, toSun);

    vec3 ground = day * light * sun * 0.95;
    vec3 halfway = normalize(toSun + toCamera);
    float glint = pow(max(dot(normal, halfway), 0.0), 60.0) * water * step(0.0, ndl);
    ground += sun * glint * 0.6;

    vec3 cloudColour = vec3(0.93) * light * sun * 1.05 + vec3(0.01);
    vec3 colour = mix(ground, cloudColour, clouds);

    float night = 1.0 - smoothstep(-0.2, 0.05, ndl);
    float cities = texture2D(uNight, vUv).r * uHasNight;
    colour += vec3(1.0, 0.7, 0.4) * pow(cities, 1.25) * 1.6 * night * (1.0 - 0.85 * clouds);

    // Scattered blue light on the day-side limb.
    float rim = pow(1.0 - max(dot(normal, toCamera), 0.0), 3.0);
    colour += vec3(0.22, 0.45, 1.0) * rim * 0.32 * smoothstep(-0.2, 0.4, ndl);

    gl_FragColor = vec4(colour, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const atmosphereMaterial = ({ side, strength, sunPosition }) =>
  new ShaderMaterial({
    side,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uColor: { value: new Color(0x6fb2ff) },
      uDusk: { value: new Color(0xff8a4a) },
      uSunPosition: { value: sunPosition },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalW;
      varying vec3 vPositionW;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vPositionW = world.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uDusk;
      uniform vec3 uSunPosition;
      varying vec3 vNormalW;
      varying vec3 vPositionW;
      void main() {
        vec3 normal = normalize(vNormalW);
        float facing = dot(normal, normalize(cameraPosition - vPositionW));
        float sunSide = dot(normal, normalize(uSunPosition - vPositionW));
        ${strength}
        float day = 0.12 + 0.88 * smoothstep(-0.3, 0.45, sunSide);
        float dusk = smoothstep(-0.25, 0.0, sunSide) * (1.0 - smoothstep(0.0, 0.3, sunSide));
        vec3 colour = mix(uColor, uDusk, dusk * 0.55) * strength * day;
        gl_FragColor = vec4(colour, strength * day);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

/**
 * @param {{ sunPosition: Vector3, detail: number }} options
 *   `sunPosition` (world) is shared by reference.
 * @returns {{
 *   earth: Group,
 *   surfaceMaterial: ShaderMaterial,
 *   moon: Mesh,
 *   update: (seconds: number) => void,
 * }}
 */
export const buildEarth = ({ sunPosition, detail }) => {
  const earth = new Group();
  earth.position.copy(EARTH_CENTER);

  const surfaceMaterial = new ShaderMaterial({
    defines: { FBM_OCTAVES: detail },
    uniforms: {
      uDay: { value: null },
      uNight: { value: null },
      uHasDay: { value: 0 },
      uHasNight: { value: 0 },
      uSunPosition: { value: sunPosition },
      uTime: { value: 0 },
    },
    vertexShader: surfaceVertex,
    fragmentShader: surfaceFragment,
  });
  const surface = new Mesh(new SphereGeometry(EARTH_RADIUS, 128, 80), surfaceMaterial);
  const restOrientation = globeOrientation(EARTH_FOCUS, EARTH_FOCUS_DIRECTION, EARTH_NORTH_HINT);
  surface.quaternion.copy(restOrientation);

  const haze = new Mesh(
    new SphereGeometry(EARTH_RADIUS * 1.004, 96, 64),
    atmosphereMaterial({
      side: FrontSide,
      sunPosition,
      strength: 'float strength = pow(1.0 - clamp(facing, 0.0, 1.0), 3.0) * 0.55;',
    })
  );

  // Glow outside the limb, on the back faces of a larger shell. `facing` runs
  // from -LIMB at the planet's edge to 0 at the shell's own edge, so the glow
  // is brightest against the surface and fades to nothing outward.
  const limb = Math.sqrt(1 - 1 / ATMOSPHERE_SCALE ** 2).toFixed(4);
  const glow = new Mesh(
    new SphereGeometry(EARTH_RADIUS * ATMOSPHERE_SCALE, 96, 64),
    atmosphereMaterial({
      side: BackSide,
      sunPosition,
      strength: `float strength = pow(clamp(-facing / ${limb}, 0.0, 1.0), 2.6) * 0.6;`,
    })
  );
  earth.add(surface, haze, glow);

  const moon = new Mesh(
    new SphereGeometry(MOON_RADIUS, 48, 32),
    createBodyMaterial({ body: BODY.moon, palette: ['#9a9a9a', '#bcbcbc', '#6d6d6d'], sunPosition, detail: 2 })
  );
  moon.position.copy(MOON_POSITION);
  // Turn the familiar near side (centre of the map) toward the Earth.
  moon.lookAt(EARTH_CENTER);
  moon.rotateY(-Math.PI / 2);

  const spin = new Vector3(0, 1, 0);
  const update = (seconds) => {
    surface.quaternion.copy(restOrientation);
    surface.rotateOnAxis(spin, seconds * EARTH_SPIN);
    surfaceMaterial.uniforms.uTime.value = seconds;
  };

  return { earth, surfaceMaterial, moon, update };
};
