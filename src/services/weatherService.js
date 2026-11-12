/**
 * One-line weather report for the `weather` command, from wttr.in.
 *
 * wttr.in sends `Access-Control-Allow-Origin: *`, so the browser can call it
 * directly. The request used to fall back to a public CORS proxy
 * (api.allorigins.win) on any failure, which handed the query to a second
 * third party for no benefit; that fallback is gone.
 */

/**
 * Give up after this long. Without a limit a stalled connection left the
 * terminal in its "typing" state for good, with the input locked.
 */
export const WEATHER_TIMEOUT_MS = 8000;

const MAX_CITY_LENGTH = 60;

/**
 * @param {string} city Free-text place name typed by the visitor.
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number }} [options] Test seams.
 * @returns {Promise<string>} e.g. `Venice: ☀️ +18°C`.
 * @throws {Error} On an empty city, HTTP error, unknown location, or timeout.
 */
export const fetchWeather = async (city, { fetchImpl = fetch, timeoutMs = WEATHER_TIMEOUT_MS } = {}) => {
  const query = String(city ?? '').trim().slice(0, MAX_CITY_LENGTH);
  if (!query) throw new Error('No city given');

  // AbortController + timer rather than AbortSignal.timeout(), which is missing
  // from Safari < 16 and would throw before the request was even made.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Encoded so the city cannot change the path or add query parameters.
    const response = await fetchImpl(`https://wttr.in/${encodeURIComponent(query)}?format=3`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`wttr.in responded with ${response.status}`);

    const report = (await response.text()).trim();
    if (!report || report.includes('Unknown location')) throw new Error('Unknown location');
    return report;
  } finally {
    clearTimeout(timer);
  }
};
