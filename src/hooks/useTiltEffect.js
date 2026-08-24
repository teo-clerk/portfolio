import { useEffect, useRef } from 'react';

const MAX_ROT = 5;

/**
 * Parallax tilt on the terminal shell, driven by pointer position.
 *
 * Two things matter here for performance:
 *
 *  1. The listener is never bound at all on coarse pointers. The old version
 *     bound it unconditionally and early-returned inside the handler, so
 *     touch devices still paid for every event dispatch.
 *
 *  2. Writes are coalesced to one per animation frame. `mousemove` fires at
 *     pointer rate (up to 1000 Hz on high-polling mice), and the element being
 *     transformed carries both `backdrop-filter` and an SVG `filter`, making it
 *     about the most expensive thing on the page to invalidate repeatedly.
 */
export const useTiltEffect = (targetRef, { enabled = true } = {}) => {
  const latest = useRef({ x: 0, y: 0 });
  const rafId = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const apply = () => {
      rafId.current = 0;
      const el = targetRef.current;
      if (!el) return;

      const { x, y } = latest.current;
      const rotX = ((y - window.innerHeight / 2) / (window.innerHeight / 2)) * -MAX_ROT;
      const rotY = ((x - window.innerWidth / 2) / (window.innerWidth / 2)) * MAX_ROT;
      el.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    };

    const onMove = (e) => {
      latest.current = { x: e.clientX, y: e.clientY };
      if (rafId.current) return;
      rafId.current = requestAnimationFrame(apply);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = 0;
    };
  }, [targetRef, enabled]);
};
