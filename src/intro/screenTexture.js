/**
 * The picture on the orbiting workstation's CRT.
 *
 * Two states:
 *  - standby: a login banner and a blinking prompt. This is what the still
 *    poster shows, so the live scene can cross-fade over it without a jump.
 *  - boot: the boot log types itself out. Started when the visitor docks, so it
 *    plays during the fly-in.
 *
 * Drawn on a plain 2D canvas that the scene uploads as a texture. `tick()`
 * reports whether anything changed, so the texture is re-uploaded a few times
 * a second at most rather than every frame.
 */

const WIDTH = 640;
const HEIGHT = 480;
const LEFT = 34;
const TOP = 62;

const BOOT_FONT_SIZE = 15;
const BOOT_LINE_HEIGHT = 27;
/** Nine lines at this pace finish just before the fly-in does. */
const BOOT_LINE_INTERVAL_MS = 150;
const CURSOR_INTERVAL_MS = 520;

const BACKGROUND = '#03110a';
const PHOSPHOR = '#4df08a';
const PHOSPHOR_DIM = '#2a9a58';
const FONT_FAMILY = '"Fira Code", ui-monospace, Menlo, Consolas, monospace';

const STANDBY_TITLE = 'TeoOS v20.26';
const STANDBY_SUBTITLE = 'H-Farm Edition · low Earth orbit';
const STANDBY_STATUS = 'All systems nominal. Ready to dock.';
const STANDBY_PROMPT = 'visitor@teoclerici:~$';

/**
 * @param {readonly string[]} bootLines Boot log, one entry per line.
 * @returns {{
 *   canvas: HTMLCanvasElement,
 *   tick: (nowMs: number) => boolean,
 *   startBoot: (nowMs: number) => void,
 *   invalidate: () => void,
 * }}
 *   `invalidate()` makes the next `tick()` redraw even if nothing changed:
 *   canvas text does not re-render by itself when a web font arrives.
 */
export const createScreenTexture = (bootLines) => {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  let bootStartedAt = null;
  let shownLines = 0;
  let cursorOn = true;
  let drawn = false;

  const text = (value, x, y, { size, color, bold = false }) => {
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT_FAMILY}`;
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  };

  const drawStandby = () => {
    text(STANDBY_TITLE, LEFT, TOP + 32, { size: 62, color: PHOSPHOR, bold: true });
    text(STANDBY_SUBTITLE, LEFT, TOP + 78, { size: 23, color: PHOSPHOR_DIM });
    text(STANDBY_STATUS, LEFT, TOP + 200, { size: 23, color: PHOSPHOR_DIM });
    text(`${STANDBY_PROMPT}${cursorOn ? ' █' : ''}`, LEFT, TOP + 262, { size: 31, color: PHOSPHOR, bold: true });
  };

  const drawBoot = () => {
    for (let i = 0; i < shownLines; i += 1) {
      const isNewest = i === shownLines - 1;
      text(bootLines[i], LEFT, TOP + i * BOOT_LINE_HEIGHT, {
        size: BOOT_FONT_SIZE,
        color: isNewest ? PHOSPHOR : PHOSPHOR_DIM,
      });
    }
  };

  const draw = () => {
    ctx.shadowBlur = 0;
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Soft glow in the middle of the tube, darker toward the corners.
    const glow = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 40, WIDTH / 2, HEIGHT / 2, WIDTH * 0.62);
    glow.addColorStop(0, 'rgba(60, 220, 130, 0.16)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(77, 240, 138, 0.75)';
    ctx.shadowBlur = 7;
    if (bootStartedAt === null) drawStandby();
    else drawBoot();

    // Scanlines.
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    for (let y = 0; y < HEIGHT; y += 3) ctx.fillRect(0, y, WIDTH, 1);
    drawn = true;
  };

  const tick = (nowMs) => {
    if (bootStartedAt === null) {
      const nextCursor = Math.floor(nowMs / CURSOR_INTERVAL_MS) % 2 === 0;
      if (drawn && nextCursor === cursorOn) return false;
      cursorOn = nextCursor;
    } else {
      const elapsed = Math.max(0, nowMs - bootStartedAt);
      const nextLines = Math.min(bootLines.length, Math.floor(elapsed / BOOT_LINE_INTERVAL_MS) + 1);
      if (drawn && nextLines === shownLines) return false;
      shownLines = nextLines;
    }
    draw();
    return true;
  };

  const startBoot = (nowMs) => {
    bootStartedAt = nowMs;
    shownLines = 0;
    drawn = false;
  };

  const invalidate = () => {
    drawn = false;
  };

  tick(0);

  return { canvas, tick, startBoot, invalidate };
};
