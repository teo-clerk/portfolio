import { useRef, useEffect } from 'react';

/**
 * Keeps a ref in sync with the latest value, updated in an effect rather than
 * during render.
 *
 * Writing `ref.current = value` in the render body is a side effect during
 * render: it breaks under StrictMode double-rendering and under concurrent
 * features where a render can be thrown away. Consumers here are all
 * post-commit callers (intervals, rAF loops, event handlers), so a one-commit
 * sync delay is not observable.
 */
export const useLatestRef = (value) => {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
};
