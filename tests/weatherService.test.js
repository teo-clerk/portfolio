import { describe, it, expect, vi } from 'vitest';
import { fetchWeather } from '../src/services/weatherService.js';

const okResponse = (text) => ({ ok: true, status: 200, text: async () => text });

describe('fetchWeather', () => {
  it('URL-encodes the city so it cannot alter the request path or query', async () => {
    const fetchImpl = vi.fn(async () => okResponse('Venice: ☀️ +18°C'));

    await fetchWeather('new york/../x?format=j1&m', { fetchImpl });

    const [url] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://wttr.in/new%20york%2F..%2Fx%3Fformat%3Dj1%26m?format=3');
  });

  it('returns the trimmed one-line report', async () => {
    const fetchImpl = vi.fn(async () => okResponse('Venice: ☀️ +18°C\n'));
    await expect(fetchWeather('venice', { fetchImpl })).resolves.toBe('Venice: ☀️ +18°C');
  });

  it('rejects an HTTP error', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 503, text: async () => '' }));
    await expect(fetchWeather('venice', { fetchImpl })).rejects.toThrow();
  });

  it('rejects an unknown location and an empty body', async () => {
    await expect(
      fetchWeather('zzzz', { fetchImpl: async () => okResponse('Unknown location; please try ~0,0') })
    ).rejects.toThrow();
    await expect(fetchWeather('zzzz', { fetchImpl: async () => okResponse('  ') })).rejects.toThrow();
  });

  it('rejects an empty city without making a request', async () => {
    const fetchImpl = vi.fn();
    await expect(fetchWeather('   ', { fetchImpl })).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('aborts a request that never answers, so the terminal is not left locked', async () => {
    const fetchImpl = (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')));
      });

    const started = Date.now();
    await expect(fetchWeather('venice', { fetchImpl, timeoutMs: 30 })).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(2000);
  });
});
