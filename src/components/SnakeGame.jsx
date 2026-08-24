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
      style={{
        width: 52, height: 52, fontSize: '1.3rem',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid var(--accent-color)',
        borderRadius: 8,
        color: 'var(--accent-color)',
        fontFamily: 'inherit',
        cursor: 'pointer',
        touchAction: 'manipulation',
      }}
    >
      {glyph}
    </button>
  );

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Snake game"
      style={{
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
      }}
    >
      <button
        type="button"
        onClick={onExit}
        aria-label="Close Snake"
        style={{
          position: 'absolute', top: 12, right: 16,
          cursor: 'pointer', color: 'var(--accent-color)',
          fontSize: '1.1rem', fontWeight: 'bold',
          background: 'none', border: 'none', fontFamily: 'inherit',
        }}
      >
        [X] CLOSE
      </button>

      <div style={{ marginBottom: 12, color: 'var(--accent-color)', fontSize: '1.4rem', textShadow: '0 0 10px var(--accent-color)' }}>
        SNAKE.EXE
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: BOARD_PX, marginBottom: 8, color: '#fff', fontSize: '0.9rem' }}>
        <div>SCORE: {score}</div>
        <div>HIGH: {highScore}</div>
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          width: BOARD_PX,
          height: BOARD_PX,
          maxWidth: '90vw',
          maxHeight: '90vw',
          border: '2px solid var(--accent-color)',
          boxShadow: '0 0 20px var(--accent-color)',
          position: 'relative',
          backgroundColor: '#000',
          touchAction: 'none',
        }}
      >
        {!hasStarted && !gameOver && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center', padding: 20, fontSize: '0.9rem' }}>
            Arrow keys or swipe<br />to start
          </div>
        )}

        {gameOver && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ff5f56', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10 }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: 10 }}>GAME OVER</div>
            <button
              type="button"
              onClick={resetGame}
              style={{ color: '#fff', background: 'none', border: '1px solid #fff', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Restart (ENTER)
            </button>
          </div>
        )}

        {/* Food */}
        {food && (
          <div style={{
            position: 'absolute',
            width: CELL, height: CELL,
            transform: `translate3d(${food[0] * CELL}px, ${food[1] * CELL}px, 0)`,
            backgroundColor: '#ff5f56',
            borderRadius: '50%',
            boxShadow: '0 0 10px #ff5f56',
          }} />
        )}

        {/* Snake */}
        {snake.map((segment, i) => (
          <div
            key={`${segment[0]}-${segment[1]}-${i}`}
            style={{
              position: 'absolute',
              width: CELL, height: CELL,
              transform: `translate3d(${segment[0] * CELL}px, ${segment[1] * CELL}px, 0)`,
              backgroundColor: i === 0 ? '#fff' : 'var(--accent-color)',
              border: '1px solid #000',
              boxShadow: i === 0 ? '0 0 10px #fff' : 'none',
            }}
          />
        ))}
      </div>

      {/* On-screen D-pad for touch devices */}
      <div className="snake-dpad" style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 6, justifyItems: 'center' }}>
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

      <div style={{ marginTop: 12, color: '#888', fontSize: '0.85rem', textAlign: 'center' }}>
        Arrow keys, swipe or D-pad • ESC to exit
      </div>
    </div>
  );
};

export default SnakeGame;
