import { useCallback, useEffect, useRef, useState } from 'react';

import { useLatestRef } from '../hooks/useLatestRef';

/** Once the page has painted, wait at most this long for an idle moment. */
const IDLE_TIMEOUT_MS = 1200;
/** If the browser never reports a paint, start anyway after this long. */
const PAINT_WAIT_MS = 3000;
/** Never hold the scene back longer than this waiting for the web font. */
const FONT_WAIT_MS = 900;

/**
 * Runs `callback` once the browser has reported its first contentful paint
 * and the main thread is idle, so the 3D chunk never competes with the
 * landing's own first paint. (Two animation frames are not enough: the frame
 * callback runs well before a slow first frame reaches the screen.)
 *
 * @returns {() => void} Cancels the pending callback.
 */
const afterFirstPaint = (callback) => {
  let observer = null;
  let isScheduled = false;
  let idle = 0;
  let timer = 0;

  const schedule = () => {
    if (isScheduled) return;
    isScheduled = true;
    observer?.disconnect();
    window.clearTimeout(timer);
    if (typeof window.requestIdleCallback === 'function') {
      idle = window.requestIdleCallback(callback, { timeout: IDLE_TIMEOUT_MS });
    } else {
      timer = window.setTimeout(callback, 200);
    }
  };

  timer = window.setTimeout(schedule, PAINT_WAIT_MS);
  try {
    observer = new PerformanceObserver((list) => {
      if (list.getEntriesByName('first-contentful-paint').length > 0) schedule();
    });
    // `buffered` also delivers a paint that happened before this ran, which is
    // the case every time the landing is shown again after `exit`.
    observer.observe({ type: 'paint', buffered: true });
  } catch {
    // No paint timing in this browser: the timer above starts the scene.
  }

  return () => {
    isScheduled = true;
    observer?.disconnect();
    window.clearTimeout(timer);
    if (idle) window.cancelIdleCallback(idle);
  };
};

/** The monitor's text is drawn on a canvas, which does not re-render when a font arrives. */
const monitorFontReady = () => {
  const timeout = new Promise((resolve) => window.setTimeout(resolve, FONT_WAIT_MS));
  // The monitor uses both weights; each needs its own load() call.
  const load = (font) => document.fonts?.load?.(font)?.catch(() => undefined) ?? Promise.resolve();
  return Promise.race([Promise.all([load('15px "Fira Code"'), load('bold 15px "Fira Code"')]), timeout]);
};

/**
 * Owns the live Three.js scene behind the landing.
 *
 * The scene module (and `three` with it) is fetched with a dynamic import after
 * the first paint, and only when `isEnabled` is true, so phones and reduced-
 * motion visitors never download it. If the chunk or WebGL fails, `isLive`
 * stays false and the landing keeps showing the poster.
 *
 * Same contract as FloatingLines: the context is created once per mount in an
 * effect with stable dependencies, and released on unmount.
 *
 * @param {{
 *   canvasRef: { current: HTMLCanvasElement | null },
 *   isEnabled: boolean,
 *   onActivate: () => void,
 * }} options `onActivate` fires when the visitor clicks the workstation.
 * @returns {{ isLive: boolean, dock: () => Promise<void> | null, cancel: () => void }}
 *   `dock()` starts the fly-in and resolves when it ends; null when the scene
 *   is not running. `cancel()` gives the scene up for good (the visitor docked
 *   on the poster before it was ready), so no context is created just to be
 *   torn down a moment later.
 */
export const useOrbitScene = ({ canvasRef, isEnabled, onActivate }) => {
  const [isLive, setIsLive] = useState(false);
  const sceneRef = useRef(null);
  const isAbandonedRef = useRef(false);
  const onActivateRef = useLatestRef(onActivate);

  useEffect(() => {
    if (!isEnabled) return undefined;

    let cancelled = false;

    const start = async () => {
      try {
        const [{ createOrbitScene }] = await Promise.all([import('./orbitScene'), monitorFontReady()]);
        const canvas = canvasRef.current;
        if (cancelled || isAbandonedRef.current || !canvas) return;

        sceneRef.current = createOrbitScene(canvas, {
          onReady: () => {
            if (!cancelled && !isAbandonedRef.current) setIsLive(true);
          },
          onActivate: () => onActivateRef.current?.(),
        });
      } catch (error) {
        // No WebGL, a blocked chunk, a lost network: the poster is the landing.
        console.warn('Orbit scene unavailable, keeping the still image.', error);
      }
    };

    const cancelStart = afterFirstPaint(start);

    return () => {
      cancelled = true;
      cancelStart();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [isEnabled, canvasRef, onActivateRef]);

  const dock = useCallback(() => sceneRef.current?.dock() ?? null, []);

  const cancel = useCallback(() => {
    isAbandonedRef.current = true;
    sceneRef.current?.dispose();
    sceneRef.current = null;
  }, []);

  return { isLive, dock, cancel };
};
