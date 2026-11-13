/**
 * The retro workstation, built from primitives: monitor with a live CRT
 * texture, system unit, and a keyboard whose keys press themselves while the
 * boot log types during the fly-in.
 */
import { BoxGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, PointLight, SphereGeometry, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

import { seededRandom, standard } from './util';

export const SCREEN_WIDTH = 1.72;
export const SCREEN_HEIGHT = 1.29;
/** Centre of the CRT glass in the workstation's own coordinates. */
export const SCREEN_CENTER = Object.freeze(new Vector3(0, 0.42, 0.915));

const KEY_COLUMNS = 14;
const KEY_ROWS = 5;
const KEY_TRAVEL = 0.034;
/** A new chord of keys goes down this often while the boot log types. */
const KEY_STEP_MS = 70;
const KEYS_PER_STEP = 3;

/**
 * @param {import('three').Texture} screenMap The CRT picture.
 * @returns {{ workstation: Group, screenMaterial: MeshBasicMaterial, pressKeys: (elapsedMs: number | null) => void }}
 *   `pressKeys(ms)` animates typing `ms` after the boot started; null releases every key.
 */
export const buildWorkstation = (screenMap) => {
  const workstation = new Group();

  const casing = standard(0xd9d1bf, { roughness: 0.6 });
  const casingShade = standard(0xbfb7a4, { roughness: 0.7 });
  const dark = standard(0x17181c, { roughness: 0.45 });
  const keycap = standard(0xefe9da, { roughness: 0.55 });

  // Monitor.
  const monitor = new Mesh(new RoundedBoxGeometry(2.3, 1.9, 1.8, 4, 0.14), casing);
  monitor.position.set(0, 0.35, 0);
  const bezel = new Mesh(new RoundedBoxGeometry(1.98, 1.55, 0.12, 3, 0.05), dark);
  bezel.position.set(0, 0.42, 0.85);
  const screenMaterial = new MeshBasicMaterial({ map: screenMap, toneMapped: false });
  const screen = new Mesh(new PlaneGeometry(SCREEN_WIDTH, SCREEN_HEIGHT), screenMaterial);
  screen.position.copy(SCREEN_CENTER);
  const vent = new Mesh(new BoxGeometry(1.5, 0.05, 1.1), casingShade);
  vent.position.set(0, 1.305, -0.15);

  // System unit under the monitor.
  const unit = new Mesh(new RoundedBoxGeometry(2.7, 0.55, 2.05, 3, 0.08), casing);
  unit.position.set(0, -0.92, 0.02);
  const driveSlot = new Mesh(new BoxGeometry(0.95, 0.07, 0.03), dark);
  driveSlot.position.set(0.55, -0.88, 1.05);
  const powerLed = new Mesh(new SphereGeometry(0.035, 12, 8), new MeshBasicMaterial({ color: 0x4df08a, toneMapped: false }));
  powerLed.position.set(-1.05, -0.88, 1.05);

  // Keyboard, tilted toward the viewer, with instanced keycaps.
  const keyboard = new Group();
  keyboard.position.set(0, -1.34, 1.72);
  keyboard.rotation.x = 0.16;
  keyboard.add(new Mesh(new RoundedBoxGeometry(2.55, 0.16, 0.9, 3, 0.05), casingShade));

  const keyCount = KEY_COLUMNS * KEY_ROWS;
  const keys = new InstancedMesh(new BoxGeometry(0.135, 0.06, 0.125), keycap, keyCount);
  const slot = new Object3D();
  const placeKey = (index, pressed) => {
    const row = Math.floor(index / KEY_COLUMNS);
    const column = index % KEY_COLUMNS;
    slot.position.set(
      (column - (KEY_COLUMNS - 1) / 2) * 0.168,
      0.105 - (pressed ? KEY_TRAVEL : 0),
      (row - (KEY_ROWS - 1) / 2) * 0.155
    );
    slot.updateMatrix();
    keys.setMatrixAt(index, slot.matrix);
  };
  for (let index = 0; index < keyCount; index += 1) placeKey(index, false);
  keys.instanceMatrix.needsUpdate = true;
  keyboard.add(keys);

  // The screen lights the keyboard a little.
  const screenLight = new PointLight(0x4df08a, 2.2, 5, 2);
  screenLight.position.set(0, 0.2, 1.9);

  workstation.add(monitor, bezel, screen, vent, unit, driveSlot, powerLed, keyboard, screenLight);

  let pressed = [];
  let lastStep = -1;
  const pressKeys = (elapsedMs) => {
    const step = elapsedMs === null ? -1 : Math.floor(elapsedMs / KEY_STEP_MS);
    if (step === lastStep) return;
    lastStep = step;
    for (const index of pressed) placeKey(index, false);
    pressed = [];
    if (step >= 0) {
      // Seeded per step, so the same chord plays on every visit.
      const random = seededRandom(1000 + step);
      for (let i = 0; i < KEYS_PER_STEP; i += 1) pressed.push(Math.floor(random() * keyCount));
      for (const index of pressed) placeKey(index, true);
    }
    keys.instanceMatrix.needsUpdate = true;
  };

  return { workstation, screenMaterial, pressKeys };
};
