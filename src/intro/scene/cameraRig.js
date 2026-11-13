/**
 * Camera poses and the flights between them.
 *
 * A pose is "look at `target` from `distance` away along `direction`, with
 * `up` as up", plus `shift`: where on screen the target should sit (NDC; the
 * map moves a planet aside to make room for its panel).
 *
 * Flights interpolate distance in log space. Going from the workstation (8
 * units away) to the whole solar system (thousands) is a zoom of several
 * hundred times; linear interpolation would spend almost the whole flight in
 * the last few frames. The target moves in step with the distance, so the
 * subject stays in frame while it shrinks, and a flight between two close-ups
 * hops out and back in instead of skimming across.
 */
import { MathUtils, Quaternion, Vector2, Vector3 } from 'three';

import { clamp01, easeInOutCubic } from './util';

/** @typedef {{ target: Vector3, direction: Vector3, distance: number, up: Vector3, shift: Vector2 }} Pose */

/** @returns {Pose} */
export const createPose = () => ({
  target: new Vector3(),
  direction: new Vector3(0, 0, 1),
  distance: 10,
  up: new Vector3(0, 1, 0),
  shift: new Vector2(),
});

export const copyPose = (out, from) => {
  out.target.copy(from.target);
  out.direction.copy(from.direction);
  out.distance = from.distance;
  out.up.copy(from.up);
  out.shift.copy(from.shift);
  return out;
};

/** The pose a camera is actually in, looking at `target`. */
export const poseFromCamera = (out, camera, target) => {
  out.target.copy(target);
  out.direction.copy(camera.position).sub(target);
  out.distance = Math.max(out.direction.length(), 1e-4);
  out.direction.divideScalar(out.distance);
  out.up.copy(camera.up);
  out.shift.set(0, 0);
  return out;
};

const turn = new Quaternion();
const partial = new Quaternion();
const rotate = (out, from, to, k) => {
  turn.setFromUnitVectors(from, to);
  partial.identity().slerp(turn, k);
  return out.copy(from).applyQuaternion(partial).normalize();
};

/**
 * @param {Pose} out
 * @param {Pose} from
 * @param {Pose} to
 * @param {number} k Linear progress, 0..1 (eased here).
 */
export const interpolatePose = (out, from, to, k) => {
  const e = easeInOutCubic(clamp01(k));
  const logFrom = Math.log(from.distance);
  const logTo = Math.log(to.distance);
  const span = from.target.distanceTo(to.target);

  // Between two close-ups far apart, rise to where both are in view.
  const hop = Math.max(0, Math.log((span * 0.7) / Math.max(from.distance, to.distance)));
  const logDistance = MathUtils.lerp(logFrom, logTo, e) + hop * Math.sin(Math.PI * e);
  out.distance = Math.exp(logDistance);

  // Zooming out or in: move the target in proportion to the distance covered,
  // so it stays on the subject while the subject is large in frame.
  const zoom = Math.abs(logTo - logFrom);
  const weight =
    hop < 0.2 && zoom > 0.7
      ? clamp01((out.distance - from.distance) / (to.distance - from.distance))
      : e;
  out.target.lerpVectors(from.target, to.target, weight);

  rotate(out.direction, from.direction, to.direction, e);
  rotate(out.up, from.up, to.up, e);
  out.shift.lerpVectors(from.shift, to.shift, e);
  return out;
};

const right = new Vector3();
const upVector = new Vector3();
const offset = new Vector3();
const lookTarget = new Vector3();

/**
 * Puts the camera in `pose`, and fits the near and far planes to the scale of
 * the shot (centimetres from the monitor at home, thousands of units in the
 * map).
 */
export const applyPose = (camera, pose) => {
  const halfHeight = Math.tan(MathUtils.degToRad(camera.fov / 2)) * pose.distance;
  camera.up.copy(pose.up);
  camera.position.copy(pose.target).addScaledVector(pose.direction, pose.distance);

  // Slide camera and target together so the target lands at `shift` on screen.
  right.crossVectors(pose.up, pose.direction).normalize();
  upVector.crossVectors(pose.direction, right).normalize();
  offset
    .copy(right)
    .multiplyScalar(-pose.shift.x * halfHeight * camera.aspect)
    .addScaledVector(upVector, -pose.shift.y * halfHeight);
  camera.position.add(offset);
  lookTarget.copy(pose.target).add(offset);
  camera.lookAt(lookTarget);

  camera.near = MathUtils.clamp(pose.distance * 0.006, 0.05, 4);
  camera.far = MathUtils.clamp(pose.distance * 6 + 1800, 1000, 16000);
  camera.updateProjectionMatrix();
};

/**
 * @param {{ from: Pose, to: () => Pose, durationMs: number, now: number }} options
 *   `to` is read every frame, so a flight can end on a moving planet.
 */
export const createFlight = ({ from, to, durationMs, now }) => ({
  from: copyPose(createPose(), from),
  to,
  durationMs,
  startedAt: now,
});

/** @returns {boolean} Whether the flight has arrived. */
export const stepFlight = (flight, now, out) => {
  const k = clamp01((now - flight.startedAt) / flight.durationMs);
  interpolatePose(out, flight.from, flight.to(), k);
  return k >= 1;
};
