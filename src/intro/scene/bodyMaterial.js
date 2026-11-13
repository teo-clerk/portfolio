/**
 * One shader for every planet and moon in the map, lit only by the Sun (so
 * the blue earthshine that fills the workstation does not tint Jupiter).
 *
 * Surfaces are procedural, from 3D noise over the unit sphere: no textures to
 * download or license, no seams. The Moon is the one textured body. Every
 * instance shares a single compiled program; `uBody` picks the surface.
 */
import { Color, ShaderMaterial, Vector3 } from 'three';

import { LIGHTING_GLSL, NOISE_GLSL } from './util';

export const BODY = Object.freeze({
  mercury: 0,
  venus: 1,
  mars: 2,
  jupiter: 3,
  saturn: 4,
  uranus: 5,
  neptune: 6,
  moon: 7,
});

const fragmentShader = /* glsl */ `
  uniform int uBody;
  uniform vec3 uPalette[3];
  uniform sampler2D uMap;
  uniform vec3 uSunPosition;
  uniform float uTime;
  uniform float uFade;
  varying vec3 vNormalW;
  varying vec3 vPositionW;
  varying vec3 vLocal;
  varying vec2 vUv;
  ${NOISE_GLSL}
  ${LIGHTING_GLSL}

  vec3 mercury(vec3 p) {
    float base = fbm(p * 5.0);
    float maria = smoothstep(0.42, 0.62, fbm(p * 2.2 + 4.0));
    float craters = smoothstep(0.68, 0.76, noise3(p * 15.0 + 3.0));
    vec3 colour = mix(uPalette[0], uPalette[1], base);
    colour = mix(colour, uPalette[2], maria * 0.5);
    colour *= 0.9 + 0.2 * noise3(p * 30.0);
    return mix(colour, uPalette[1] * 1.15, craters * 0.45);
  }

  vec3 venus(vec3 p) {
    vec3 q = vec3(p.x * 1.6, p.y * 5.5, p.z * 1.6);
    float swirl = fbm(q + fbm(p * 3.0 + uTime * 0.01) * 1.4);
    return mix(mix(uPalette[2], uPalette[1], smoothstep(0.3, 0.6, swirl)), uPalette[0], smoothstep(0.55, 0.8, swirl));
  }

  vec3 mars(vec3 p) {
    float base = fbm(p * 3.2 + 2.0);
    float dark = smoothstep(0.47, 0.63, fbm(p * 2.1 + 9.0));
    vec3 colour = mix(uPalette[1], uPalette[0], base);
    colour = mix(colour, uPalette[2], dark * 0.65);
    float cap = smoothstep(0.84, 0.9, abs(p.y) + 0.04 * noise3(p * 12.0));
    return mix(colour, vec3(0.92, 0.9, 0.88), cap);
  }

  // Zones and belts of uneven width, wavy edges, fine streaks inside them.
  vec3 banded(vec3 p, float frequency, float softness, float drift) {
    float turbulence = fbm(p * vec3(2.5, 9.0, 2.5) + vec3(uTime * drift, 0.0, 0.0));
    float y = p.y + (turbulence - 0.5) * 0.07;
    float bands = 0.5 + 0.3 * sin(y * frequency) + 0.2 * sin(y * frequency * 2.37 + 1.3);
    float streaks = sin(y * frequency * 5.1 + turbulence * 4.0) * 0.06;
    float t = clamp(bands + streaks, 0.0, 1.0);
    vec3 colour = mix(uPalette[1], uPalette[0], smoothstep(0.5 - softness, 0.5 + softness, t));
    colour = mix(colour, uPalette[2], smoothstep(0.32, 0.0, t) * 0.55);
    return colour * (0.92 + 0.16 * fbm(p * 6.0 + 2.0));
  }

  vec3 jupiter(vec3 p) {
    vec3 colour = banded(p, 17.0, 0.28, 0.02);
    // The Great Red Spot, 22 degrees south.
    vec3 spotCentre = normalize(vec3(0.62, -0.37, 0.69));
    vec3 d = p - spotCentre;
    float spot = smoothstep(0.17, 0.08, length(vec3(d.x, d.y * 1.9, d.z)));
    return mix(colour, vec3(0.78, 0.36, 0.22), spot * 0.85);
  }

  vec3 iceGiant(vec3 p, float spots) {
    float bands = sin(p.y * 9.0 + fbm(p * vec3(2.0, 8.0, 2.0)) * 1.6) * 0.5 + 0.5;
    vec3 colour = mix(uPalette[0], uPalette[1], bands * 0.55);
    vec3 d = p - normalize(vec3(-0.5, -0.3, 0.8));
    float darkSpot = spots * smoothstep(0.16, 0.09, length(vec3(d.x, d.y * 1.7, d.z)));
    float streaks = spots * smoothstep(0.72, 0.86, fbm(p * vec3(3.0, 18.0, 3.0) + 5.0));
    return mix(mix(colour, uPalette[1] * 0.55, darkSpot), uPalette[2], streaks * 0.6);
  }

  void main() {
    vec3 p = normalize(vLocal);
    vec3 albedo;
    float gas = 0.0;
    if (uBody == ${BODY.moon}) {
      albedo = texture2D(uMap, vUv).rgb;
    } else if (uBody == ${BODY.mercury}) {
      albedo = mercury(p);
    } else if (uBody == ${BODY.venus}) {
      albedo = venus(p);
      gas = 0.6;
    } else if (uBody == ${BODY.mars}) {
      albedo = mars(p);
    } else if (uBody == ${BODY.jupiter}) {
      albedo = jupiter(p);
      gas = 1.0;
    } else if (uBody == ${BODY.saturn}) {
      albedo = banded(p, 12.0, 0.42, 0.012);
      gas = 1.0;
    } else if (uBody == ${BODY.uranus}) {
      albedo = iceGiant(p, 0.0);
      gas = 0.8;
    } else {
      albedo = iceGiant(p, 1.0);
      gas = 0.8;
    }

    vec3 normal = normalize(vNormalW);
    vec3 toSun = normalize(uSunPosition - vPositionW);
    vec3 toCamera = normalize(cameraPosition - vPositionW);
    float facing = max(dot(normal, toCamera), 0.0);
    // Thick atmospheres darken towards the limb.
    float limb = mix(1.0, pow(facing, 0.38), gas);
    vec3 colour = albedo * sunlight(normal, toSun) * limb * 1.05 + albedo * 0.012;
    // A thin bright rim on the lit side for bodies with an atmosphere.
    colour += albedo * pow(1.0 - facing, 4.0) * gas * 0.35 * smoothstep(-0.1, 0.4, dot(normal, toSun));

    gl_FragColor = vec4(colour * uFade, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const vertexShader = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPositionW;
  varying vec3 vLocal;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vLocal = position;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPositionW = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/**
 * @param {{
 *   body: number,
 *   palette: readonly string[],
 *   sunPosition: Vector3,
 *   detail: number,
 *   map?: import('three').Texture | null,
 * }} options `sunPosition` is shared by reference, so moving the Sun moves the light.
 */
export const createBodyMaterial = ({ body, palette, sunPosition, detail, map = null }) =>
  new ShaderMaterial({
    defines: { FBM_OCTAVES: detail },
    uniforms: {
      uBody: { value: body },
      uPalette: { value: palette.map((hex) => new Color(hex)) },
      uMap: { value: map },
      uSunPosition: { value: sunPosition ?? new Vector3() },
      uTime: { value: 0 },
      uFade: { value: 1 },
    },
    vertexShader,
    fragmentShader,
  });
