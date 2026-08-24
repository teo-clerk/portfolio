/**
 * Storage helpers that never throw.
 *
 * `localStorage` / `sessionStorage` access raises a SecurityError when storage
 * is blocked (embedded webviews, hardened privacy settings, some private
 * modes). An unguarded read during render would take the whole app down.
 */

export const readStorage = (storage, key, fallback = null) => {
  try {
    const raw = window[storage]?.getItem(key);
    return raw ?? fallback;
  } catch {
    return fallback;
  }
};

export const writeStorage = (storage, key, value) => {
  try {
    window[storage]?.setItem(key, String(value));
    return true;
  } catch {
    return false;
  }
};

export const readNumber = (storage, key, fallback = 0) => {
  const parsed = parseInt(readStorage(storage, key, ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};
