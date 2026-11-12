/**
 * Pure decisions for the orbit landing ("front door"). No DOM access, so they
 * are unit-tested under Node.
 */

/**
 * sessionStorage flag: this tab has already flown into the terminal. The key
 * keeps the name the old boot animation used, so a session that was open
 * across the deploy is not shown the landing again.
 */
export const DOCKED_SESSION_KEY = 'booted';

/**
 * Viewports narrower than this (width / height) get the portrait composition:
 * workstation on top, text underneath. intro.css and the poster's <source>
 * media queries use the same 23/20 ratio; keep the three in step.
 */
export const PORTRAIT_MAX_ASPECT = 23 / 20;

/** Length of the live scene's fly-in, and of the poster's zoom that stands in for it. */
export const SCENE_DOCK_MS = 1700;
export const POSTER_DOCK_MS = 750;

/**
 * Should the landing be shown, or should the visitor go straight to the
 * terminal?
 *
 * - A `?cmd=` deep link asks for a specific command: the landing would only be
 *   in the way.
 * - A session that already docked stays in the terminal across reloads; typing
 *   `exit` there clears the flag and returns to orbit.
 *
 * Campaign parameters (`utm_source`, `ref`) deliberately do NOT skip it: a
 * recruiter arriving from the CV is exactly who the landing's plain buttons
 * are for.
 *
 * @param {{ search?: string, docked?: boolean }} [input]
 * @returns {boolean}
 */
export const shouldShowIntro = ({ search = '', docked = false } = {}) => {
  if (docked) return false;
  try {
    return !new URLSearchParams(search).has('cmd');
  } catch {
    return true;
  }
};

/**
 * How the landing's backdrop is rendered for a device tier (see
 * utils/deviceTier.js):
 *
 *   'scene'  — live Three.js scene, cross-faded in over the poster
 *   'poster' — the still image only; no WebGL, and the three chunk is never
 *              requested (phones, tablets, modest laptops)
 *   'static' — the still image with no animation at all, and an instant cut
 *              to the terminal (reduced motion, Save-Data, very low-end
 *              hardware)
 *
 * @param {'none' | 'low' | 'high'} tier
 * @returns {'scene' | 'poster' | 'static'}
 */
export const getIntroMode = (tier) => {
  if (tier === 'high') return 'scene';
  if (tier === 'low') return 'poster';
  return 'static';
};

/** Longest side the zoomed poster may reach, as a multiple of the viewport. */
const MAX_POSTER_ZOOM = 9;

/**
 * The CSS transform that makes the monitor's screen fill the viewport, for the
 * poster's "fly-in" on devices without the live scene.
 *
 * The poster is drawn with `object-fit: cover`, so the screen's position on
 * the page depends on how the image is cropped for this viewport. `anchor` is
 * the image's `object-position` as fractions (0.5 / 0.5 is centred; the
 * portrait poster uses 0.5 / 0 so its top edge is never cropped).
 *
 * @param {{
 *   viewport: { width: number, height: number },
 *   image: { width: number, height: number },
 *   screen: { x: number, y: number, width: number, height: number },
 *   anchor?: { x: number, y: number },
 * }} input `screen` is the monitor glass as fractions of the image.
 * @returns {{ translateX: number, translateY: number, scale: number }}
 *   Apply as `translate(Xpx, Ypx) scale(S)` with `transform-origin: center`.
 */
export const computePosterZoom = ({ viewport, image, screen, anchor = { x: 0.5, y: 0.5 } }) => {
  const identity = { translateX: 0, translateY: 0, scale: 1 };
  const sizes = [viewport?.width, viewport?.height, image?.width, image?.height, screen?.width, screen?.height];
  if (!sizes.every((value) => Number.isFinite(value) && value > 0)) return identity;

  const cover = Math.max(viewport.width / image.width, viewport.height / image.height);
  const shownWidth = image.width * cover;
  const shownHeight = image.height * cover;

  // Where the image's top-left corner sits, then the screen centre measured
  // from the centre of the viewport.
  const left = (viewport.width - shownWidth) * anchor.x;
  const top = (viewport.height - shownHeight) * anchor.y;
  const offsetX = left + screen.x * shownWidth - viewport.width / 2;
  const offsetY = top + screen.y * shownHeight - viewport.height / 2;

  const fill = Math.max(viewport.width / (screen.width * shownWidth), viewport.height / (screen.height * shownHeight));
  const scale = Math.min(MAX_POSTER_ZOOM, Math.max(1, fill));

  // Scaling about the centre moves the screen to offset * scale; shift it back.
  return { translateX: -offsetX * scale, translateY: -offsetY * scale, scale };
};
