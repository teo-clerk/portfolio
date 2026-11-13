/**
 * Where everything sits in the one world the landing flies through.
 *
 * The workstation floats at the origin above the Earth. The Sun is placed
 * EARTH_ORBIT_RADIUS away from the Earth's centre along the direction the
 * home shot's sunlight comes from (behind the camera), and the ecliptic plane
 * is the plane through the Sun and the Earth that is closest to horizontal.
 * Zooming out from the workstation is therefore one continuous camera move
 * into the solar system.
 */
import { Matrix4, Quaternion, Vector3 } from 'three';

import { EARTH_ORBIT_RADIUS } from '../stops';

export const EARTH_RADIUS = 26;
/** Far enough away that a wide arc of the globe is in frame, not a blurry close-up. */
export const EARTH_CENTER = Object.freeze(new Vector3(6.4, -38.3, -49.5));

/** Direction from the Earth towards the Sun (the home shot's key light). */
export const SUN_DIRECTION = Object.freeze(new Vector3(-7, 5, 6).normalize());
export const SUN_POSITION = Object.freeze(EARTH_CENTER.clone().addScaledVector(SUN_DIRECTION, EARTH_ORBIT_RADIUS));

/** Normal of the ecliptic: world up, made perpendicular to the Sun–Earth line. */
export const ECLIPTIC_NORMAL = Object.freeze(
  new Vector3(0, 1, 0).addScaledVector(SUN_DIRECTION, -SUN_DIRECTION.y).normalize()
);

/**
 * Orientation of the solar system's own frame: local +X points from the Sun
 * to the Earth at t = 0, local +Y is the ecliptic normal. Orbits are circles
 * in the local XZ plane, travelled anticlockwise seen from +Y.
 */
export const ECLIPTIC_QUATERNION = Object.freeze(
  (() => {
    const x = SUN_DIRECTION.clone().negate();
    const y = ECLIPTIC_NORMAL.clone();
    const z = new Vector3().crossVectors(x, y);
    return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
  })()
);

/** Where the satellite sits at t = 0. It is hidden in portrait: no room beside the workstation. */
export const SATELLITE_HOME = Object.freeze(new Vector3(-4.4, 3.0, -8));

/**
 * The Moon, in the home shot's upper right sky (worked out from the landscape
 * camera so it clears the monitor and the text column).
 */
export const MOON_POSITION = Object.freeze(new Vector3(35, 22, -125));
export const MOON_RADIUS = 4.2;
