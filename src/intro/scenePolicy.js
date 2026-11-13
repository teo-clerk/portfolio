/**
 * Pure decisions about how much 3D a device gets. No DOM, no `three`, so they
 * are unit-tested under Node.
 *
 *  - getIntroMode: live scene, still image only, or no animation at all.
 *  - getSceneQuality: where on the quality ladder the live scene starts.
 *  - isAssessmentComplete / assessFrames: after the scene goes live, whether
 *    the device is keeping up, should step down a rung, or should give up and
 *    show the still image.
 */

/** sessionStorage flag: the live scene could not keep up in this tab, so use the still image. */
export const SCENE_FALLBACK_KEY = 'orbit-fallback';

/**
 * @param {'none' | 'low' | 'high'} tier From utils/deviceTier.js.
 * @param {{ hasFailed?: boolean }} [options] `hasFailed`: the scene already gave
 *   up once in this session.
 * @returns {'scene' | 'poster' | 'static'}
 *   'scene'  — live Three.js over the still image (desktops and capable phones)
 *   'poster' — the still image with a CSS zoom into the monitor; no WebGL
 *   'static' — the still image, no animation, instant cut (reduced motion,
 *              Save-Data, slow connections, very low-end hardware)
 */
export const getIntroMode = (tier, { hasFailed = false } = {}) => {
  if (tier !== 'high' && tier !== 'low') return 'static';
  return hasFailed ? 'poster' : 'scene';
};

/**
 * Quality rungs, best first. The scene starts on the rung getSceneQuality
 * picks and only ever moves down.
 */
export const QUALITY_LADDER = Object.freeze(['high', 'lite', 'minimal']);

/**
 * What each rung turns on.
 *  - maxPixelRatio: clamp on devicePixelRatio
 *  - bloom: glow pass (its own lazily loaded chunk)
 *  - fpsCap: frames per second at rest (0 = display rate); flights always run
 *    at the display rate
 *  - earthMap: 'large' (4096 px) or 'small' (2048 px) day texture
 *  - detail: shader noise octaves for clouds and planets
 *
 * Stepping down changes the first three at once. `earthMap` and `detail` are
 * fixed when the scene is built, so they follow the rung it started on.
 */
export const QUALITY_SETTINGS = Object.freeze({
  high: Object.freeze({ maxPixelRatio: 2, bloom: true, fpsCap: 0, earthMap: 'large', detail: 5 }),
  lite: Object.freeze({ maxPixelRatio: 1.5, bloom: false, fpsCap: 30, earthMap: 'small', detail: 4 }),
  minimal: Object.freeze({ maxPixelRatio: 1, bloom: false, fpsCap: 30, earthMap: 'small', detail: 3 }),
});

/** @returns {'high' | 'lite'} Phones and modest hardware start on the lighter rung. */
export const getSceneQuality = (tier) => (tier === 'high' ? 'high' : 'lite');

/** @returns {string | null} The next rung down, or null at the bottom. */
export const nextQuality = (quality) => {
  const index = QUALITY_LADDER.indexOf(quality);
  return index === -1 || index === QUALITY_LADDER.length - 1 ? null : QUALITY_LADDER[index + 1];
};

/** How long each check samples frames for, after the scene goes live or steps down. */
export const ASSESS_WINDOW_MS = 1500;

/**
 * A check lasts at least ASSESS_WINDOW_MS and until it has MIN_SAMPLES frame
 * intervals, but never longer than ASSESS_MAX_MS: a device too slow to draw
 * that many frames in that time is judged on the few it drew. A hidden tab is
 * not part of any check: the scene stops its loop and starts the check over.
 */
export const ASSESS_MAX_MS = 6000;
const MIN_SAMPLES = 6;

/** Usable intervals. Long ones count: on a slow device a long frame is the evidence. */
const validSamples = (intervals) => intervals.filter((value) => Number.isFinite(value) && value > 0);

/**
 * @param {readonly number[]} intervals Milliseconds between consecutive frames so far.
 * @param {number} elapsedMs Time since the check started.
 */
export const isAssessmentComplete = (intervals, elapsedMs) =>
  elapsedMs >= ASSESS_MAX_MS || (elapsedMs >= ASSESS_WINDOW_MS && validSamples(intervals).length >= MIN_SAMPLES);

/**
 * Median frame interval above which a rung is too heavy for the device. The
 * check renders every frame regardless of the cap, so on a 60 Hz display a
 * healthy device reports about 16.7 ms. Every limit sits above 33.3 ms, so a
 * machine whose display or power saver runs at 30 Hz keeps its rung.
 */
export const MAX_MEDIAN_FRAME_MS = Object.freeze({ high: 36, lite: 42, minimal: 55 });

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/**
 * @param {readonly number[]} intervals Milliseconds between consecutive frames.
 * @param {'high' | 'lite' | 'minimal'} quality The rung they were rendered on.
 * @returns {'keep' | 'down' | 'give-up'}
 */
export const assessFrames = (intervals, quality) => {
  const samples = validSamples(intervals);
  if (samples.length === 0) return 'keep';
  const limit = MAX_MEDIAN_FRAME_MS[quality] ?? MAX_MEDIAN_FRAME_MS.minimal;
  if (median(samples) <= limit) return 'keep';
  return nextQuality(quality) ? 'down' : 'give-up';
};
