import { describe, it, expect, vi } from 'vitest';
import { fetchWeather } from '../src/services/weatherService.js';

const okResponse = (text) => ({ ok: true, status: 200, text: async () => text });

/** The parts of wttr.in's `?format=j1` reply that the report is built from. */
const wttrJson = ({ temp = '18', desc = 'Sunny', area = 'Venice', country = 'Italy' } = {}) =>
  JSON.stringify({
    current_condition: [{ temp_C: temp, weatherDesc: [{ value: desc }] }],
    nearest_area: [{ areaName: [{ value: area }], country: [{ value: country }] }],
  });

describe('fetchWeather', () => {
  it('URL-encodes the city so it cannot alter the request path or query', async () => {
    const fetchImpl = vi.fn(async () => okResponse(wttrJson()));

    await fetchWeather('new york/../x?format=3&m', { fetchImpl });

    const [url] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://wttr.in/new%20york%2F..%2Fx%3Fformat%3D3%26m?format=j1');
  });

  it('builds a one-line report naming the place it actually resolved to', async () => {
    const fetchImpl = async () => okResponse(wttrJson({ temp: '26', desc: 'Overcast ', area: 'Venice', country: 'United States of America' }));
    await expect(fetchWeather('venice', { fetchImpl })).resolves.toBe('Venice, United States of America: Overcast, 26°C');
  });

  it('copes with missing optional fields and sub-zero temperatures', async () => {
    const body = JSON.stringify({ current_condition: [{ temp_C: '-4' }] });
    await expect(fetchWeather('oslo', { fetchImpl: async () => okResponse(body) })).resolves.toBe('Weather: -4°C');
  });

  // wttr.in answers a browser's one-line request with a full web page. That
  // page used to be printed in the terminal as the "forecast".
  it('rejects an HTML page instead of printing it', async () => {
    const html = '<!DOCTYPE html>\n<html lang="en"><head><title>wttr.in — Weather Report</title></head></html>';
    await expect(fetchWeather('venice', { fetchImpl: async () => okResponse(html) })).rejects.toThrow();
  });

  it('rejects JSON without current conditions, and an empty body', async () => {
    await expect(fetchWeather('x', { fetchImpl: async () => okResponse('{}') })).rejects.toThrow();
    await expect(fetchWeather('x', { fetchImpl: async () => okResponse('{"current_condition":[{"temp_C":"n/a"}]}') })).rejects.toThrow();
    await expect(fetchWeather('x', { fetchImpl: async () => okResponse('  ') })).rejects.toThrow();
  });

  it('never returns more than a short line, whatever the upstream sends', async () => {
    const fetchImpl = async () => okResponse(wttrJson({ desc: 'x'.repeat(5000), area: 'y'.repeat(5000), country: { nested: true } }));
    const report = await fetchWeather('venice', { fetchImpl });
    expect(report.length).toBeLessThan(140);
  });

  it('rejects an HTTP error (wttr.in answers 500 for an unknown place)', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500, text: async () => 'location not found' }));
    await expect(fetchWeather('zzzz', { fetchImpl })).rejects.toThrow();
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
