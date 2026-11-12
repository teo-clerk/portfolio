/**
 * One-line weather report for the `weather` command, from wttr.in.
 *
 * wttr.in sends `Access-Control-Allow-Origin: *`, so the browser can call it
 * directly. The request used to fall back to a public CORS proxy
 * (api.allorigins.win) on any failure, which handed the query to a second
 * third party for no benefit; that fallback is gone.
 *
 * The JSON format (`?format=j1`) is used, not the one-line `?format=3`:
 * wttr.in picks its output by User-Agent and answers a browser's `format=3`
 * request with a whole HTML page, which the terminal then printed as text.
 * JSON is the same for every client.
 */

/**
 * Give up after this long. Without a limit a stalled connection left the
 * terminal in its "typing" state for good, with the input locked.
 */
export const WEATHER_TIMEOUT_MS = 8000;

const MAX_CITY_LENGTH = 60;
const MAX_FIELD_LENGTH = 60;

/** A short printable string from untrusted JSON, or '' if it is not one. */
const field = (value) => (typeof value === 'string' ? value.trim().slice(0, MAX_FIELD_LENGTH) : '');

/**
 * Builds the one-line report from wttr.in's JSON. The response is external
 * data: every field is checked, and the caller still escapes the result.
 *
 * @param {string} body Raw response text.
 * @returns {string} e.g. `Venice, Italy: Sunny, 18°C`.
 * @throws {Error} If the body is not the expected JSON.
 */
const formatReport = (body) => {
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error('wttr.in did not return JSON');
  }

  const current = data?.current_condition?.[0];
  const temperature = Number.parseInt(current?.temp_C, 10);
  if (!Number.isFinite(temperature)) throw new Error('wttr.in returned no current conditions');

  const area = data?.nearest_area?.[0];
  const place = [field(area?.areaName?.[0]?.value), field(area?.country?.[0]?.value)].filter(Boolean).join(', ');
  const description = field(current?.weatherDesc?.[0]?.value);

  return `${place || 'Weather'}: ${description ? `${description}, ` : ''}${temperature}°C`;
};

/**
 * @param {string} city Free-text place name typed by the visitor.
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number }} [options] Test seams.
 * @returns {Promise<string>} e.g. `Venice, Italy: Sunny, 18°C`.
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
    const response = await fetchImpl(`https://wttr.in/${encodeURIComponent(query)}?format=j1`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`wttr.in responded with ${response.status}`);

    return formatReport(await response.text());
  } finally {
    clearTimeout(timer);
  }
};
