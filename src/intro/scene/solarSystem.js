/**
 * The Sun, the planets (except the Earth, which belongs to the home rig),
 * Saturn's rings and the orbit lines.
 *
 * Built in the ecliptic frame (scene/layout.js): the group sits at the Sun
 * with local +Y along the ecliptic normal, so an orbit is a circle in the
 * local XZ plane. Positions follow `systemTime`, which only advances while the
 * map is open, so the home shot at t = 0 is always the same.
 *
 * Everything here fades out as the camera comes home: from the workstation
 * the planets would be distracting discs in the sky.
 */
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  Quaternion,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';

import { MAP_YEAR_SECONDS, STOPS } from '../stops';
import { BODY, createBodyMaterial } from './bodyMaterial';
import { ECLIPTIC_QUATERNION, SUN_POSITION } from './layout';
import { NOISE_GLSL } from './util';

const ORBIT_SEGMENTS = 256;
const ORBIT_COLOR = 0x89aee0;
const ORBIT_OPACITY = 0.26;
const ORBIT_SELECTED_OPACITY = 0.75;

/** Radians per second a body with a 24-hour day turns while the map is open. */
const SPIN_PER_EARTH_DAY = 0.25;


/** Angle along the orbit at `systemTime`, anticlockwise from the Sun–Earth line at t = 0. */
export const orbitAngle = (stop, systemTime) =>
  stop.periodYears > 0 ? (stop.phaseDeg * Math.PI) / 180 + (2 * Math.PI * systemTime) / (stop.periodYears * MAP_YEAR_SECONDS) : 0;

const sunMaterial = (detail) =>
  new ShaderMaterial({
    defines: { FBM_OCTAVES: detail },
    uniforms: { uTime: { value: 0 }, uFade: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vLocal;
      varying vec3 vNormalW;
      varying vec3 vPositionW;
      void main() {
        vLocal = normalize(position);
        vec4 world = modelMatrix * vec4(position, 1.0);
        vPositionW = world.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uFade;
      varying vec3 vLocal;
      varying vec3 vNormalW;
      varying vec3 vPositionW;
      ${NOISE_GLSL}
      void main() {
        float granules = fbm(vLocal * 10.0 + vec3(0.0, uTime * 0.04, uTime * 0.03));
        float spots = smoothstep(0.7, 0.8, fbm(vLocal * 3.2 + 4.0));
        float mu = max(dot(normalize(vNormalW), normalize(cameraPosition - vPositionW)), 0.0);
        float limb = pow(mu, 0.42);
        vec3 colour = mix(vec3(1.0, 0.42, 0.1), vec3(1.0, 0.9, 0.62), smoothstep(0.3, 0.7, granules)) * limb * (1.0 - spots * 0.55);
        gl_FragColor = vec4(colour * 1.9 * uFade, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

/** Soft additive glow around the Sun, painted on a small canvas. */
const coronaTexture = () => {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 230, 170, 0.9)');
  gradient.addColorStop(0.3, 'rgba(255, 190, 110, 0.4)');
  gradient.addColorStop(0.6, 'rgba(255, 140, 60, 0.1)');
  gradient.addColorStop(1, 'rgba(255, 120, 40, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

const ringMaterial = ({ inner, outer, planetRadius, sunPosition }) =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      uInner: { value: inner },
      uOuter: { value: outer },
      uPlanetRadius: { value: planetRadius },
      uPlanetCenter: { value: new Vector3() },
      uSunPosition: { value: sunPosition },
      uFade: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vRing;
      varying vec3 vPositionW;
      void main() {
        vRing = position;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vPositionW = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uInner;
      uniform float uOuter;
      uniform float uPlanetRadius;
      uniform vec3 uPlanetCenter;
      uniform vec3 uSunPosition;
      uniform float uFade;
      varying vec3 vRing;
      varying vec3 vPositionW;
      void main() {
        float r = (length(vRing.xy) - uInner) / (uOuter - uInner);
        float bands = 0.55 + 0.22 * sin(r * 92.0) + 0.14 * sin(r * 231.0 + 1.3) + 0.09 * sin(r * 41.0);
        float cassini = smoothstep(0.55, 0.57, r) * (1.0 - smoothstep(0.61, 0.63, r));
        float alpha = bands * (1.0 - cassini * 0.92);
        alpha *= smoothstep(0.0, 0.04, r) * (1.0 - smoothstep(0.95, 1.0, r));
        alpha *= mix(0.4, 1.0, smoothstep(0.08, 0.4, r));
        vec3 colour = mix(vec3(0.6, 0.53, 0.43), vec3(0.96, 0.89, 0.74), smoothstep(0.2, 0.75, r));

        // The planet's shadow across the rings.
        vec3 toSun = normalize(uSunPosition - vPositionW);
        vec3 oc = vPositionW - uPlanetCenter;
        float b = dot(oc, toSun);
        float h = b * b - (dot(oc, oc) - uPlanetRadius * uPlanetRadius);
        float shadow = (h > 0.0 && -b - sqrt(h) > 0.0) ? 0.12 : 1.0;

        gl_FragColor = vec4(colour * shadow * 0.85 * uFade, alpha * uFade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

const orbitLine = (radius) => {
  const points = [];
  for (let i = 0; i < ORBIT_SEGMENTS; i += 1) {
    const angle = (i / ORBIT_SEGMENTS) * Math.PI * 2;
    points.push(Math.cos(angle) * radius, 0, -Math.sin(angle) * radius);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
  const material = new LineBasicMaterial({ color: ORBIT_COLOR, transparent: true, opacity: ORBIT_OPACITY, depthWrite: false });
  return new LineLoop(geometry, material);
};

/**
 * @param {{ detail: number, getEarthPosition: (out: Vector3) => Vector3 }} options
 *   `getEarthPosition` reports where the home rig's Earth is (world).
 * @returns {{
 *   group: Group,
 *   update: (systemTime: number, fade: number, selectedId: string | null) => void,
 *   positionOf: (id: string, out: Vector3) => Vector3,
 *   axisOf: (id: string, out: Vector3) => Vector3,
 *   hitTargets: Mesh[],
 * }}
 */
export const buildSolarSystem = ({ detail, getEarthPosition }) => {
  const group = new Group();
  group.position.copy(SUN_POSITION);
  group.quaternion.copy(ECLIPTIC_QUATERNION);

  // Shared by reference with every body material: the light is where the Sun is.
  const sunPosition = SUN_POSITION.clone();

  const sun = new Mesh(new SphereGeometry(STOPS[0].radius, 96, 64), sunMaterial(detail));
  sun.userData.stopId = 'sun';
  const corona = new Sprite(
    new SpriteMaterial({ map: coronaTexture(), blending: AdditiveBlending, depthWrite: false, transparent: true })
  );
  corona.scale.setScalar(STOPS[0].radius * 4.4);
  group.add(sun, corona);

  const bodies = [];
  const orbits = new Map();
  const hitTargets = [sun];

  for (const stop of STOPS) {
    if (stop.orbitRadius === 0) continue;
    const orbit = orbitLine(stop.orbitRadius);
    orbits.set(stop.id, { line: orbit, highlight: new Color(stop.color) });
    group.add(orbit);
    if (stop.kind === 'earth') continue;

    // carrier: moves along the orbit; tilt: holds the axial tilt; mesh: spins.
    const carrier = new Group();
    const tilt = new Group();
    tilt.rotation.z = (stop.tiltDeg * Math.PI) / 180;
    const material = createBodyMaterial({ body: BODY[stop.id], palette: stop.palette, sunPosition, detail });
    const mesh = new Mesh(new SphereGeometry(stop.radius, 64, 48), material);
    mesh.userData.stopId = stop.id;
    tilt.add(mesh);

    let rings = null;
    if (stop.rings) {
      rings = new Mesh(
        new RingGeometry(stop.radius * stop.rings.inner, stop.radius * stop.rings.outer, 160, 1),
        ringMaterial({
          inner: stop.radius * stop.rings.inner,
          outer: stop.radius * stop.rings.outer,
          planetRadius: stop.radius,
          sunPosition,
        })
      );
      rings.rotation.x = -Math.PI / 2;
      tilt.add(rings);
    }

    carrier.add(tilt);
    group.add(carrier);
    hitTargets.push(mesh);
    bodies.push({
      stop,
      carrier,
      tilt,
      mesh,
      rings,
      material,
      spin: Math.min(0.6, Math.max(0.004, (SPIN_PER_EARTH_DAY * 24) / Math.abs(stop.dayHours))),
    });
  }

  const orbitColor = new Color(ORBIT_COLOR);

  const update = (systemTime, fade, selectedId) => {
    const visible = fade > 0.001;
    group.visible = visible;
    if (!visible) return;

    sun.material.uniforms.uTime.value = systemTime;
    sun.material.uniforms.uFade.value = fade;
    corona.material.opacity = fade;

    for (const body of bodies) {
      const angle = orbitAngle(body.stop, systemTime);
      body.carrier.position.set(Math.cos(angle) * body.stop.orbitRadius, 0, -Math.sin(angle) * body.stop.orbitRadius);
      body.mesh.rotation.y = systemTime * body.spin;
      body.material.uniforms.uTime.value = systemTime;
      body.material.uniforms.uFade.value = fade;
      if (body.rings) {
        body.rings.material.uniforms.uFade.value = fade;
        body.mesh.getWorldPosition(body.rings.material.uniforms.uPlanetCenter.value);
      }
    }

    for (const [id, { line, highlight }] of orbits) {
      const selected = id === selectedId;
      line.material.opacity = (selected ? ORBIT_SELECTED_OPACITY : ORBIT_OPACITY) * fade;
      line.material.color.copy(selected ? highlight : orbitColor);
    }
  };

  /** Spin axis (world) of a planet, for framing its rings. */
  const axisQuaternion = new Quaternion();
  const axisOf = (id, out) => {
    const body = bodies.find((entry) => entry.stop.id === id);
    out.set(0, 1, 0);
    if (body) out.applyQuaternion(body.tilt.getWorldQuaternion(axisQuaternion));
    return out;
  };

  const positionOf = (id, out) => {
    if (id === 'sun') return out.copy(SUN_POSITION);
    if (id === 'earth') return getEarthPosition(out);
    const body = bodies.find((entry) => entry.stop.id === id);
    if (!body) return out.copy(SUN_POSITION);
    return body.mesh.getWorldPosition(out);
  };

  return { group, update, positionOf, axisOf, hitTargets };
};
