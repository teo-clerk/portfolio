/**
 * A Sentinel-1-like radar satellite drifting behind the workstation. It looks
 * sideways at the Earth, like a real synthetic-aperture radar: a faint beam
 * runs from its antenna to a footprint that sweeps across the globe as it
 * moves. It is clickable (FloodFusion is built on Sentinel-1 data).
 *
 * Everything here lives in the home rig's coordinates, where the Earth's
 * centre is EARTH_CENTER.
 */
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';

import { EARTH_CENTER, EARTH_RADIUS, SATELLITE_HOME } from './layout';
import { standard } from './util';

const SATELLITE_SCALE = 0.5;
/** Off-nadir look angle of the radar, to the right of the ground track. */
const LOOK_ANGLE = (28 * Math.PI) / 180;
const FOOTPRINT_LENGTH = 5;
const FOOTPRINT_WIDTH = 1.6;

const beamMaterial = () =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float along;
      varying float vAlong;
      void main() {
        vAlong = along;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      varying float vAlong;
      void main() {
        // Pulses travelling from the antenna to the ground.
        float pulse = smoothstep(0.8, 1.0, fract(vAlong * 7.0 - uTime * 1.3));
        float fade = smoothstep(0.0, 0.04, vAlong) * (1.0 - 0.6 * vAlong);
        float alpha = (0.085 + 0.16 * pulse) * fade * uOpacity;
        gl_FragColor = vec4(vec3(0.35, 1.0, 0.72) * alpha, alpha);
        #include <colorspace_fragment>
      }
    `,
  });

const footprintMaterial = () =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vPoint;
      void main() {
        vPoint = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vPoint;
      void main() {
        float r = length(vPoint);
        float edge = 1.0 - smoothstep(0.75, 1.0, r);
        float rings = 0.5 + 0.5 * sin(r * 18.0 - uTime * 2.2);
        float alpha = edge * (0.18 + 0.22 * rings) * uOpacity;
        gl_FragColor = vec4(vec3(0.4, 1.0, 0.75) * alpha, alpha);
        #include <colorspace_fragment>
      }
    `,
  });

/**
 * @returns {{
 *   satellite: Group,
 *   beam: Mesh,
 *   footprint: Mesh,
 *   hitTarget: Mesh,
 *   update: (seconds: number) => void,
 *   setVisible: (visible: boolean) => void,
 * }}
 */
export const buildSatellite = () => {
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

  // An invisible, generous click target: the satellite itself is a few pixels wide.
  const hitTarget = new Mesh(new SphereGeometry(2.6, 12, 8), new MeshBasicMaterial({ visible: false }));
  satellite.add(hitTarget);
  satellite.scale.setScalar(SATELLITE_SCALE);

  // Beam: a thin pyramid from the antenna to the four corners of the footprint.
  const beamGeometry = new BufferGeometry();
  const beamPositions = new BufferAttribute(new Float32Array(5 * 3), 3);
  beamGeometry.setAttribute('position', beamPositions);
  beamGeometry.setAttribute('along', new BufferAttribute(new Float32Array([0, 1, 1, 1, 1]), 1));
  beamGeometry.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1]);
  const beam = new Mesh(beamGeometry, beamMaterial());
  beam.frustumCulled = false;

  const footprint = new Mesh(new CircleGeometry(1, 48), footprintMaterial());
  footprint.scale.set(FOOTPRINT_LENGTH / 2, FOOTPRINT_WIDTH / 2, 1);

  const previous = new Vector3();
  const track = new Vector3();
  const nadir = new Vector3();
  const side = new Vector3();
  const look = new Vector3();
  const hit = new Vector3();
  const apex = new Vector3();
  const corner = new Vector3();
  const normal = new Vector3();
  const orient = new Quaternion();
  const zAxis = new Vector3(0, 0, 1);

  const placeAt = (seconds, out) => {
    const phase = seconds * 0.04;
    out.set(
      SATELLITE_HOME.x + Math.sin(phase) * 3,
      SATELLITE_HOME.y + Math.sin(phase * 1.3) * 0.4,
      SATELLITE_HOME.z - (1 - Math.cos(phase)) * 2
    );
  };

  /** Where a ray from `origin` along `direction` first meets the globe (or its closest point). */
  const intersectEarth = (origin, direction, out) => {
    const oc = previous.copy(origin).sub(EARTH_CENTER);
    const b = oc.dot(direction);
    const h = b * b - (oc.lengthSq() - EARTH_RADIUS * EARTH_RADIUS);
    const t = h > 0 ? -b - Math.sqrt(h) : -b;
    return out.copy(origin).addScaledVector(direction, t);
  };

  const update = (seconds) => {
    placeAt(seconds, satellite.position);
    satellite.rotation.set(0.5, 0.5 + seconds * 0.05, 0.3);

    // Ground track direction from the motion a moment ahead.
    placeAt(seconds + 1, track);
    track.sub(satellite.position);
    if (track.lengthSq() < 1e-8) track.set(1, 0, 0);
    nadir.copy(EARTH_CENTER).sub(satellite.position).normalize();
    track.addScaledVector(nadir, -track.dot(nadir)).normalize();
    side.crossVectors(nadir, track).normalize();
    look.copy(nadir).multiplyScalar(Math.cos(LOOK_ANGLE)).addScaledVector(side, Math.sin(LOOK_ANGLE)).normalize();

    // Copy the origin first: intersectEarth reuses `previous` as scratch.
    apex.copy(satellite.position).addScaledVector(nadir, 0.2);
    intersectEarth(apex.clone(), look, hit);
    normal.copy(hit).sub(EARTH_CENTER).normalize();

    beamPositions.setXYZ(0, apex.x, apex.y, apex.z);
    const corners = [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ];
    corners.forEach(([u, v], index) => {
      corner
        .copy(hit)
        .addScaledVector(track, (u * FOOTPRINT_LENGTH) / 2)
        .addScaledVector(side, (v * FOOTPRINT_WIDTH) / 2);
      beamPositions.setXYZ(index + 1, corner.x, corner.y, corner.z);
    });
    beamPositions.needsUpdate = true;

    footprint.position.copy(hit).addScaledVector(normal, 0.08);
    orient.setFromUnitVectors(zAxis, normal);
    footprint.quaternion.copy(orient);
    // Align the footprint's long axis with the ground track.
    const localTrack = track.clone().applyQuaternion(orient.clone().invert());
    footprint.rotateZ(Math.atan2(localTrack.y, localTrack.x));

    beam.material.uniforms.uTime.value = seconds;
    footprint.material.uniforms.uTime.value = seconds;
  };

  const setVisible = (visible) => {
    satellite.visible = visible;
    beam.visible = visible;
    footprint.visible = visible;
  };

  return { satellite, beam, footprint, hitTarget, update, setVisible };
};
