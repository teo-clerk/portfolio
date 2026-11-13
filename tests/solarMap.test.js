import { describe, it, expect } from 'vitest';

import { resolveDeepLink } from '../src/commands/deepLink.js';
import { cvData } from '../src/data/cvData.js';
import {
  ASSESS_MAX_MS,
  ASSESS_WINDOW_MS,
  QUALITY_LADDER,
  QUALITY_SETTINGS,
  assessFrames,
  getIntroMode,
  getSceneQuality,
  isAssessmentComplete,
  nextQuality,
} from '../src/intro/scenePolicy.js';
import { EARTH_ORBIT_RADIUS, STOPS, findStop, neighbourStop, stopCommand, stopExtent } from '../src/intro/stops.js';
import { toSemantic, wrapList } from '../src/utils/sectionHtml.js';

describe('getIntroMode', () => {
  it('runs the live scene on desktops and capable phones', () => {
    expect(getIntroMode('high')).toBe('scene');
    expect(getIntroMode('low')).toBe('scene');
  });

  it('uses the still image once the scene has given up in this tab', () => {
    expect(getIntroMode('high', { hasFailed: true })).toBe('poster');
    expect(getIntroMode('low', { hasFailed: true })).toBe('poster');
  });

  it('uses the static landing for reduced motion, Save-Data and slow connections', () => {
    expect(getIntroMode('none')).toBe('static');
    expect(getIntroMode('none', { hasFailed: true })).toBe('static');
    expect(getIntroMode(undefined)).toBe('static');
  });
});

describe('scene quality', () => {
  it('starts desktops on the top rung and everything else on the lighter one', () => {
    expect(getSceneQuality('high')).toBe('high');
    expect(getSceneQuality('low')).toBe('lite');
  });

  it('keeps the glow pass off every rung a phone can be on', () => {
    expect(QUALITY_SETTINGS.lite.bloom).toBe(false);
    expect(QUALITY_SETTINGS.minimal.bloom).toBe(false);
    expect(QUALITY_SETTINGS.lite.earthMap).toBe('small');
  });

  it('only ever steps down, and stops at the bottom', () => {
    expect(QUALITY_LADDER).toEqual(['high', 'lite', 'minimal']);
    expect(nextQuality('high')).toBe('lite');
    expect(nextQuality('lite')).toBe('minimal');
    expect(nextQuality('minimal')).toBe(null);
    expect(nextQuality('unknown')).toBe(null);
  });
});

describe('assessFrames', () => {
  const frames = (ms, count = 60) => Array.from({ length: count }, () => ms);

  it('keeps a rung the device renders smoothly', () => {
    expect(assessFrames(frames(16.7), 'high')).toBe('keep');
    expect(assessFrames(frames(33), 'lite')).toBe('keep');
  });

  it('steps down when the median frame is too slow', () => {
    expect(assessFrames(frames(40), 'high')).toBe('down');
    expect(assessFrames(frames(50), 'lite')).toBe('down');
  });

  // A 30 Hz display or an OS power saver throttles requestAnimationFrame;
  // that is not the scene being too heavy.
  it('keeps every rung on a device locked to 30 Hz', () => {
    for (const quality of QUALITY_LADDER) expect(assessFrames(frames(33.4), quality)).toBe('keep');
  });

  it('gives up when even the lowest rung is too slow', () => {
    expect(assessFrames(frames(80), 'minimal')).toBe('give-up');
  });

  it('judges by the median, so a few stalls on a fast device do not count', () => {
    expect(assessFrames([...frames(16.7, 40), 900, 1500, 2400], 'high')).toBe('keep');
  });

  it('says nothing when nothing was drawn', () => {
    expect(assessFrames([], 'high')).toBe('keep');
    expect(assessFrames([0, NaN], 'minimal')).toBe('keep');
  });

  // A device at 5-6 fps yields only a handful of frames; it is exactly the
  // one that has to fall back, and its long frames are the evidence.
  it('judges a very slow device from the few frames it manages, long ones included', () => {
    expect(assessFrames(frames(170, 8), 'lite')).toBe('down');
    expect(assessFrames(frames(170, 8), 'minimal')).toBe('give-up');
    expect(assessFrames([1200, 1400, 1100], 'minimal')).toBe('give-up');
  });
});

describe('isAssessmentComplete', () => {
  const frames = (ms, count) => Array.from({ length: count }, () => ms);

  it('samples a fast device for the short window only', () => {
    expect(ASSESS_WINDOW_MS).toBeGreaterThanOrEqual(1000);
    expect(ASSESS_WINDOW_MS).toBeLessThanOrEqual(2000);
    expect(isAssessmentComplete(frames(16.7, 60), ASSESS_WINDOW_MS - 1)).toBe(false);
    expect(isAssessmentComplete(frames(16.7, 90), ASSESS_WINDOW_MS)).toBe(true);
  });

  // The old rule ended the check after 1.5 s whatever it had, and called too
  // few frames "keep": a janky phone could slip through for good.
  it('keeps sampling a slow device until it has enough frames', () => {
    expect(isAssessmentComplete(frames(400, 3), ASSESS_WINDOW_MS)).toBe(false);
    expect(isAssessmentComplete(frames(400, 6), 2400)).toBe(true);
  });

  it('stops at the hard limit, however few frames there are', () => {
    expect(isAssessmentComplete(frames(2000, 2), ASSESS_MAX_MS)).toBe(true);
    expect(ASSESS_MAX_MS).toBeLessThanOrEqual(8000);
  });
});

describe('solar-system stops', () => {
  it('has the Sun and the eight planets, in order, with unique ids', () => {
    expect(STOPS.map((stop) => stop.id)).toEqual([
      'sun',
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
    ]);
  });

  // A stop's sections are what its panel shows and what "Open in terminal" runs.
  it.each(STOPS.map((stop) => [stop.id, stop]))('%s holds real, link-safe CV sections', (_id, stop) => {
    expect(stop.sections.length).toBeGreaterThan(0);
    for (const { key, title } of stop.sections) {
      expect(typeof cvData[key], key).toBe('string');
      expect(cvData[key].length, key).toBeGreaterThan(40);
      expect(resolveDeepLink(key), key).toBe(key);
      expect(title.length).toBeGreaterThan(0);
    }
    expect(resolveDeepLink(stopCommand(stop))).toBe(stopCommand(stop));
  });

  it('covers every section on the static /cv page, plus contact', () => {
    const covered = new Set(STOPS.flatMap((stop) => stop.sections.map((section) => section.key)));
    for (const key of ['about', 'education', 'experience', 'projects', 'floodfusion', 'skills', 'publications', 'certifications', 'awards', 'languages', 'interests', 'contact']) {
      expect(covered.has(key), key).toBe(true);
    }
  });

  it('orders orbits and periods outward, like the real system', () => {
    const planets = STOPS.slice(1);
    for (let i = 1; i < planets.length; i += 1) {
      expect(planets[i].orbitRadius).toBeGreaterThan(planets[i - 1].orbitRadius);
      expect(planets[i].periodYears).toBeGreaterThan(planets[i - 1].periodYears);
    }
    expect(findStop('earth').orbitRadius).toBe(EARTH_ORBIT_RADIUS);
    expect(findStop('earth').periodYears).toBe(1);
  });

  it('never lets a body (or its rings) overlap the Sun or a neighbouring orbit', () => {
    const [sun, ...planets] = STOPS;
    expect(sun.radius * 1.5).toBeLessThan(planets[0].orbitRadius - stopExtent(planets[0]));
    for (let i = 1; i < planets.length; i += 1) {
      const gap = planets[i].orbitRadius - planets[i - 1].orbitRadius;
      expect(stopExtent(planets[i]) + stopExtent(planets[i - 1]), planets[i].id).toBeLessThan(gap);
    }
  });

  it('keeps the real orientation quirks: Venus and Uranus', () => {
    expect(findStop('venus').tiltDeg).toBeGreaterThan(90);
    expect(findStop('uranus').tiltDeg).toBeGreaterThan(90);
    expect(findStop('saturn').rings).toBeTruthy();
  });

  it('steps between stops and wraps around', () => {
    expect(neighbourStop('sun', 1).id).toBe('mercury');
    expect(neighbourStop('sun', -1).id).toBe('neptune');
    expect(neighbourStop('neptune', 1).id).toBe('sun');
    expect(neighbourStop(null, 1).id).toBe('sun');
    expect(neighbourStop(null, -1).id).toBe('neptune');
  });
});

describe('sectionHtml', () => {
  const sample =
    '\n<span class="section-title">PROJECTS</span>\n' +
    '<span class="list-item"><strong>FloodFusion</strong>&nbsp;— see <span class="command-highlight" data-cmd="floodfusion">floodfusion</span></span>\n' +
    '<span class="list-item">Second</span>\n';

  it('drops the title and turns list items into <li>', () => {
    const html = toSemantic(sample);
    expect(html).not.toContain('PROJECTS');
    expect(html).not.toContain('<span');
    expect(html.match(/<li>/g)).toHaveLength(2);
    expect(html).toContain('<strong>FloodFusion</strong> — see floodfusion</li>');
  });

  it('lets the caller decide what a terminal command becomes, without closing the list item early', () => {
    const html = toSemantic(sample, { command: (cmd, label) => `<button data-cmd="${cmd}">${label}</button>` });
    expect(html).toContain('<button data-cmd="floodfusion">floodfusion</button></li>');
    expect(html.match(/<\/li>/g)).toHaveLength(2);
  });

  it('wraps list items in a list, and plain lines in paragraphs', () => {
    expect(wrapList('<li>a</li>')).toBe('<ul><li>a</li></ul>');
    expect(wrapList('one\ntwo')).toBe('<p>one</p>\n<p>two</p>');
  });

  it('produces non-empty panel content for every stop section', () => {
    for (const stop of STOPS) {
      for (const { key } of stop.sections) {
        const html = wrapList(toSemantic(cvData[key]));
        expect(html.replace(/<[^>]+>/g, '').trim().length, key).toBeGreaterThan(20);
        expect(html, key).not.toMatch(/<span class="(section-title|list-item)"/);
      }
    }
  });
});
