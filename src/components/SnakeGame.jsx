import React, { useState, useEffect, useRef, useCallback } from 'react';
import { playTone } from '../utils/sfx';
import { readNumber, writeStorage } from '../utils/storage';

const GRID_SIZE = 20;
const BOARD_PX = 300;
const CELL = BOARD_PX / GRID_SIZE;
const INITIAL_SNAKE = [[10, 10]];
const INITIAL_DIRECTION = [0, -1]; // moving up
const SPEED = 120; // ms per tick
const SWIPE_THRESHOLD = 24; // px before a drag counts as a direction change

// Re-queried on every Tab rather than cached: the restart button only exists
// while `gameOver` is true, and the D-pad is `display: none` on pointer-fine
// devices (see index.css), so the focusable set changes during a session.
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const sameCell = (a, b) => a[0] === b[0] && a[1] === b[1];

/**
 * Pick a free cell. The previous implementation looped `while (true)` on random
 * guesses, which hard-freezes the tab once the snake fills the board.
 */
const spawnFood = (snake) => {
  const occupied = new Set(snake.map(([x, y]) => `${x},${y}`));
  const free = [];
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      if (!occupied.has(`${x},${y}`)) free.push([x, y]);
    }
  }
  if (free.length === 0) return null; // board full — a win, not a hang
  return free[Math.floor(Math.random() * free.length)];
};

/**
 * Pure transition. Returns the next snake plus an *event describing* what
 * happened — it never plays sound or sets state itself. State updaters must be
 * pure: React 18 StrictMode invokes them twice in development, which previously
 * meant every death fired its sound and its `setGameOver` twice.
 */
const step = (snake, direction, food) => {
  const [hx, hy] = snake[0];
  const [dx, dy] = direction;
  const head = [hx + dx, hy + dy];

  const hitWall =
    head[0] < 0 || head[0] >= GRID_SIZE || head[1] < 0 || head[1] >= GRID_SIZE;
  const hitSelf = snake.some((seg) => sameCell(seg, head));

  if (hitWall || hitSelf) return { snake, event: 'die' };

  const grown = [head, ...snake];
  if (food && sameCell(head, food)) {
    return { snake: grown, event: 'eat' };
  }
  grown.pop();
  return { snake: grown, event: null };
};

export const SnakeGame = ({ onExit }) => {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState(() => spawnFood(INITIAL_SNAKE));
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [highScore, setHighScore] = useState(() =>
    readNumber('localStorage', 'snakeHighScore', 0)
  );

  // Direction is never rendered, so it lives only in a ref, written from event
  // handlers. Keeping it in state would mean writing the mirror during render.
  const directionRef = useRef(INITIAL_DIRECTION);

  // Authoritative game state lives in refs and is mirrored into React state
  // purely for rendering. The tick therefore reads and writes plain values in a
  // timer callback rather than doing work inside a state updater (updaters must
  // be pure — StrictMode runs them twice) or in an effect.
  const snakeRef = useRef(INITIAL_SNAKE);
  const foodRef = useRef(food);

  const containerRef = useRef(null);
  const closeButtonRef = useRef(null);

  const changeDirection = useCallback((next) => {
    const [dx, dy] = directionRef.current;
    // Reject reversals into the neck.
    if (next[0] === -dx && next[1] === -dy) return;
    if (next[0] === dx && next[1] === dy) return;
    directionRef.current = next;
    setHasStarted(true);
  }, []);

  const resetGame = useCallback(() => {
    const freshFood = spawnFood(INITIAL_SNAKE);
    snakeRef.current = INITIAL_SNAKE;
    foodRef.current = freshFood;
    directionRef.current = INITIAL_DIRECTION;
    setSnake(INITIAL_SNAKE);
    setFood(freshFood);
    setScore(0);
    setGameOver(false);
    setHasStarted(false);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onExit();
      return;
    }
    if (gameOver) {
      if (e.key === 'Enter') resetGame();
      return;
    }

    const map = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    const next = map[e.key];
    if (!next) return;
    e.preventDefault();
    changeDirection(next);
  }, [gameOver, onExit, resetGame, changeDirection]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Focus management ────────────────────────────────────────────
  // The overlay is a modal dialog, so focus must move into it on mount, cycle
  // only among its own controls, and return to whatever opened it on unmount.
  // Escape is *not* handled here — `handleKeyDown` above already calls
  // `onExit()` on Escape, and a second listener would fire it twice.
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus();

    const trapTab = (e) => {
      // Only Tab is intercepted; the arrow keys the game needs pass straight
      // through to `handleKeyDown`.
      if (e.key !== 'Tab') return;
      const root = containerRef.current;
      if (!root) return;

      // `offsetParent === null` filters out the hidden D-pad on desktop.
      const focusable = Array.from(
        root.querySelectorAll(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null);

      e.preventDefault();
      if (focusable.length === 0) return;

      const index = focusable.indexOf(document.activeElement);
      const last = focusable.length - 1;
      const next = e.shiftKey
        ? (index <= 0 ? last : index - 1)
        : (index === -1 || index === last ? 0 : index + 1);
      focusable[next].focus();
    };

    window.addEventListener('keydown', trapTab);
    return () => {
      window.removeEventListener('keydown', trapTab);
      previouslyFocused?.focus?.();
    };
  }, []);

  // ── Game loop ───────────────────────────────────────────────────
  // Deps are only true lifecycle values. Including `food`/`score` here meant
  // the interval was destroyed and recreated on every pellet, resetting the
  // tick phase and giving the snake a partial free frame on each eat.
  useEffect(() => {
    if (gameOver || !hasStarted) return;

    const id = setInterval(() => {
      const result = step(snakeRef.current, directionRef.current, foodRef.current);

      if (result.event === 'die') {
        playTone('die');
        setGameOver(true);
        return;
      }

      snakeRef.current = result.snake;
      setSnake(result.snake);

      if (result.event === 'eat') {
        playTone('eat');
        const nextFood = spawnFood(result.snake);
        foodRef.current = nextFood;
        setFood(nextFood);
        setScore((prev) => {
          const next = prev + 10;
          setHighScore((hs) => {
            if (next <= hs) return hs;
            writeStorage('localStorage', 'snakeHighScore', next);
            return next;
          });
          return next;
        });
      }
    }, SPEED);

    return () => clearInterval(id);
  }, [hasStarted, gameOver]);

  // ── Touch controls ──────────────────────────────────────────────
  // Snake was previously keyboard-only, which made it unplayable on exactly
  // the devices most likely to encounter it.
  const touchStart = useRef(null);

  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchMove = (e) => {
    if (!touchStart.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;

    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      changeDirection(dx > 0 ? [1, 0] : [-1, 0]);
    } else {
      changeDirection(dy > 0 ? [0, 1] : [0, -1]);
    }
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = () => { touchStart.current = null; };

  const dpadButton = (label, vector, glyph) => (
    <button
      type="button"
      aria-label={label}
      onClick={() => changeDirection(vector)}
      style={styles.dpadButton}
    >
      {glyph}
    </button>
  );

  return (
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Snake game"
      style={styles.wrapper}
    >
      <button
        type="button"
        ref={closeButtonRef}
        onClick={onExit}
        aria-label="Close Snake"
        style={styles.closeButton}
      >
        [X] CLOSE
      </button>

      <div style={styles.title}>
        SNAKE.EXE
      </div>

      <div style={styles.scoreBar}>
        <div>SCORE: {score}</div>
        <div>HIGH: {highScore}</div>
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={styles.board}
      >
        {!hasStarted && !gameOver && (
          <div style={styles.startOverlay}>
            Arrow keys or swipe<br />to start
          </div>
        )}

        {gameOver && (
          <div style={styles.gameOverOverlay}>
            <div style={styles.gameOverTitle}>GAME OVER</div>
            <button
              type="button"
              onClick={resetGame}
              style={styles.restartButton}
            >
              Restart (ENTER)
            </button>
          </div>
        )}

        {/* Food */}
        {food && (
          <div style={{
            ...styles.food,
            transform: `translate3d(${food[0] * CELL}px, ${food[1] * CELL}px, 0)`,
          }} />
        )}

        {/* Snake */}
        {snake.map((segment, i) => (
          <div
            key={`${segment[0]}-${segment[1]}-${i}`}
            style={{
              ...(i === 0 ? SNAKE_HEAD : SNAKE_BODY),
              transform: `translate3d(${segment[0] * CELL}px, ${segment[1] * CELL}px, 0)`,
            }}
          />
        ))}
      </div>

      {/* On-screen D-pad for touch devices */}
      <div className="snake-dpad" style={styles.dpadGrid}>
        <span />
        {dpadButton('Move up', [0, -1], '↑')}
        <span />
        {dpadButton('Move left', [-1, 0], '←')}
        <span />
        {dpadButton('Move right', [1, 0], '→')}
        <span />
        {dpadButton('Move down', [0, 1], '↓')}
        <span />
      </div>

      <div style={styles.hint}>
        Arrow keys, swipe or D-pad • ESC to exit
      </div>
    </div>
  );
};

// The component re-renders on every 120ms tick (the snake's position is React
// state), so anything left as an inline literal below is reallocated several
// times a second *plus* once per snake segment. Everything static is hoisted so
// React sees a stable object identity instead.

// Only `transform` varies per cell, so the rest of the sprite — including the
// head-vs-body colour switch — is precomputed into two frozen variants.
const segmentBase = {
  position: 'absolute',
  width: CELL,
  height: CELL,
  border: '1px solid #000',
};

const SNAKE_HEAD = {
  ...segmentBase,
  backgroundColor: '#fff',
  boxShadow: '0 0 10px #fff',
};

const SNAKE_BODY = {
  ...segmentBase,
  backgroundColor: 'var(--accent-color)',
  boxShadow: 'none',
};

const styles = {
  wrapper: {
    position: 'absolute',
    inset: '0',
    zIndex: 9999,
    backgroundColor: 'var(--terminal-bg)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-mono)',
    overflowY: 'auto',
    padding: '12px',
  },
  closeButton: {
    position: 'absolute', top: 12, right: 16,
    cursor: 'pointer', color: 'var(--accent-color)',
    fontSize: '1.1rem', fontWeight: 'bold',
    background: 'none', border: 'none', fontFamily: 'inherit',
  },
  title: {
    marginBottom: 12,
    color: 'var(--accent-color)',
    fontSize: '1.4rem',
    textShadow: '0 0 10px var(--accent-color)',
  },
  scoreBar: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: BOARD_PX,
    marginBottom: 8,
    color: '#fff',
    fontSize: '0.9rem',
  },
  board: {
    width: BOARD_PX,
    height: BOARD_PX,
    maxWidth: '90vw',
    maxHeight: '90vw',
    border: '2px solid var(--accent-color)',
    boxShadow: '0 0 20px var(--accent-color)',
    position: 'relative',
    backgroundColor: '#000',
    touchAction: 'none',
  },
  startOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    textAlign: 'center',
    padding: 20,
    fontSize: '0.9rem',
  },
  gameOverOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ff5f56',
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 10,
  },
  gameOverTitle: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  restartButton: {
    color: '#fff',
    background: 'none',
    border: '1px solid #fff',
    borderRadius: 6,
    padding: '6px 14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  food: {
    position: 'absolute',
    width: CELL,
    height: CELL,
    backgroundColor: '#ff5f56',
    borderRadius: '50%',
    boxShadow: '0 0 10px #ff5f56',
  },
  dpadGrid: {
    marginTop: 14,
    display: 'grid',
    gridTemplateColumns: 'repeat(3, auto)',
    gap: 6,
    justifyItems: 'center',
  },
  dpadButton: {
    width: 52, height: 52, fontSize: '1.3rem',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid var(--accent-color)',
    borderRadius: 8,
    color: 'var(--accent-color)',
    fontFamily: 'inherit',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  hint: {
    marginTop: 12,
    color: '#888',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
};

export default SnakeGame;
