/**
 * The stops of the solar-system map: one body per stop, each holding one or
 * more CV sections. Pure data, shared by the 3D scene (sizes, orbits, colours)
 * and the map UI (names, sections, commands). No DOM, no `three`.
 *
 * Scene units are compressed: the order of the planets, their relative sizes
 * within each group, their axial tilts and their orbital periods are real; the
 * sizes and distances are not (the map says "not to scale"). Earth sits at
 * EARTH_ORBIT_RADIUS from the Sun, which is how far scene/layout.js places the
 * Sun from the globe the workstation floats above.
 *
 * Section keys must exist in `cvData` and be link-safe terminal commands
 * (tests/solarMap.test.js checks both); the first section's command is what
 * "Open in terminal" runs.
 */

export const EARTH_ORBIT_RADIUS = 400;

/** One Earth orbit takes this long while the map is open; other periods follow the real ratios. */
export const MAP_YEAR_SECONDS = 100;

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   kind: 'star' | 'rocky' | 'cloudy' | 'gas' | 'ice' | 'earth',
 *   radius: number,
 *   orbitRadius: number,
 *   periodYears: number,
 *   phaseDeg: number,
 *   tiltDeg: number,
 *   dayHours: number,
 *   color: string,
 *   palette: readonly string[],
 *   rings?: { inner: number, outer: number },
 *   tagline: string,
 *   sections: readonly { key: string, title: string }[],
 * }} Stop
 *   `phaseDeg` is where the body starts on its orbit, measured from Earth's
 *   position around the Sun. `dayHours` is negative for retrograde rotation.
 *   `palette` feeds the procedural surface shader.
 */

const section = (key, title) => Object.freeze({ key, title });

/** @type {readonly Stop[]} */
export const STOPS = Object.freeze(
  [
    {
      id: 'sun',
      name: 'Sun',
      kind: 'star',
      radius: 70,
      orbitRadius: 0,
      periodYears: 0,
      phaseDeg: 0,
      tiltDeg: 7.25,
      dayHours: 609.1,
      color: '#ffb547',
      palette: ['#fff1c4', '#ffb547', '#e2531d'],
      tagline: 'Who I am',
      sections: [section('about', 'Profile')],
    },
    {
      id: 'mercury',
      name: 'Mercury',
      kind: 'rocky',
      radius: 9,
      orbitRadius: 170,
      periodYears: 0.2408,
      phaseDeg: -128,
      tiltDeg: 0.03,
      dayHours: 1407.6,
      color: '#b3aca3',
      palette: ['#8d877f', '#b9b2a8', '#5d5852'],
      tagline: 'Get in touch',
      sections: [section('contact', 'Contact')],
    },
    {
      id: 'venus',
      name: 'Venus',
      kind: 'cloudy',
      radius: 20,
      orbitRadius: 280,
      periodYears: 0.6152,
      phaseDeg: -96,
      tiltDeg: 177.4,
      dayHours: -5832.5,
      color: '#e9c77f',
      palette: ['#f3dca4', '#d9b06a', '#b98d4c'],
      tagline: 'What I work with',
      sections: [section('skills', 'Skills'), section('languages', 'Languages')],
    },
    {
      id: 'earth',
      name: 'Earth',
      kind: 'earth',
      radius: 26,
      orbitRadius: EARTH_ORBIT_RADIUS,
      periodYears: 1,
      phaseDeg: 0,
      tiltDeg: 23.44,
      dayHours: 23.93,
      color: '#5b9cf0',
      palette: ['#1d4f8f', '#3f7f4a', '#f2f5fa'],
      tagline: 'Flood maps from radar',
      sections: [section('floodfusion', 'FloodFusion')],
    },
    {
      id: 'mars',
      name: 'Mars',
      kind: 'rocky',
      radius: 14,
      orbitRadius: 520,
      periodYears: 1.8808,
      phaseDeg: 62,
      tiltDeg: 25.19,
      dayHours: 24.62,
      color: '#e0703f',
      palette: ['#c1562b', '#e38a52', '#6e2d17'],
      tagline: 'Things I have built',
      sections: [section('projects', 'Projects')],
    },
    {
      id: 'jupiter',
      name: 'Jupiter',
      kind: 'gas',
      radius: 78,
      orbitRadius: 800,
      periodYears: 11.862,
      phaseDeg: -152,
      tiltDeg: 3.13,
      dayHours: 9.93,
      color: '#dcb990',
      palette: ['#efe2c8', '#c08a5a', '#8c5a3a'],
      tagline: 'Where I have worked',
      sections: [section('experience', 'Experience')],
    },
    {
      id: 'saturn',
      name: 'Saturn',
      kind: 'gas',
      radius: 62,
      orbitRadius: 1080,
      periodYears: 29.457,
      phaseDeg: 104,
      tiltDeg: 26.73,
      dayHours: 10.66,
      color: '#e6d3a0',
      palette: ['#f1e3bb', '#d2b47c', '#a8895a'],
      rings: { inner: 1.25, outer: 2.3 },
      tagline: 'What I have studied',
      sections: [section('education', 'Education'), section('certifications', 'Certifications'), section('awards', 'Awards')],
    },
    {
      id: 'uranus',
      name: 'Uranus',
      kind: 'ice',
      radius: 36,
      orbitRadius: 1340,
      periodYears: 84.02,
      phaseDeg: -40,
      tiltDeg: 97.77,
      dayHours: -17.24,
      color: '#a6e0e6',
      palette: ['#c8f0f2', '#8fd0db', '#6fb3c4'],
      tagline: 'What I have written',
      sections: [section('publications', 'Publications')],
    },
    {
      id: 'neptune',
      name: 'Neptune',
      kind: 'ice',
      radius: 34,
      orbitRadius: 1560,
      periodYears: 164.8,
      phaseDeg: 168,
      tiltDeg: 28.32,
      dayHours: 16.11,
      color: '#5c7cf0',
      palette: ['#3d5fd6', '#2a3f9e', '#9fb6ff'],
      tagline: 'Away from the keyboard',
      sections: [section('interests', 'Interests')],
    },
  ].map((stop) => Object.freeze({ ...stop, palette: Object.freeze(stop.palette), sections: Object.freeze(stop.sections) }))
);

/** The command "Open in terminal" runs for a stop. */
export const stopCommand = (stop) => stop.sections[0].key;

/** @returns {Stop | undefined} */
export const findStop = (id) => STOPS.find((stop) => stop.id === id);

/** The stop before or after `id`, wrapping around (Neptune → Sun). */
export const neighbourStop = (id, step) => {
  const index = STOPS.findIndex((stop) => stop.id === id);
  const from = index === -1 ? (step > 0 ? -1 : 0) : index;
  return STOPS[(from + step + STOPS.length) % STOPS.length];
};

/** Radius that encloses the body and its rings, for framing the camera. */
export const stopExtent = (stop) => stop.radius * (stop.rings ? stop.rings.outer : 1);
