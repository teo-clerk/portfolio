/**
 * Device capability tiers for the animated background.
 *
 *   'none' — no WebGL at all. Renders a compositor-only CSS gradient instead,
 *            which also means the WebGL `FloatingLines` chunk is never
 *            downloaded and no GL context is created — precisely on the
 *            devices with the least bandwidth and GPU headroom.
 *   'low'  — WebGL with a single wave, clamped DPR and a 30fps cap.
 *   'high' — full three-wave shader with cursor interaction and parallax.
 */

const mq = (query) =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false;

export const getDeviceTier = () => {
  if (typeof window === 'undefined') return 'none';

  // Honour the user's stated preference before any hardware heuristic.
  if (mq('(prefers-reduced-motion: reduce)')) return 'none';

  // Save-Data is an explicit "don't spend my bandwidth" signal.
  if (navigator.connection?.saveData) return 'none';

  const memory = navigator.deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (memory <= 2 || cores <= 2) return 'none';

  const coarse = mq('(pointer: coarse)');
  const small = window.innerWidth <= 768;
  if (coarse || small || cores <= 4) return 'low';

  return 'high';
};

export const isTouchLike = () => mq('(pointer: coarse)');
