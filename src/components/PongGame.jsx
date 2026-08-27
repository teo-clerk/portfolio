import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 10;
const BALL_SIZE = 10;
const LOGICAL_WIDTH = 800;
const LOGICAL_HEIGHT = 500;
const INITIAL_SPEED = 1.5;
const WIN_SCORE = 5;

export const PongGame = ({ onExit }) => {
    // Low-frequency state stays in React; per-frame coordinates live in refs.
    const [score, setScore] = useState({ player: 0, ai: 0, isGameOver: false });

    const pos = useRef({
        playerX: LOGICAL_WIDTH / 2 - PADDLE_WIDTH / 2,
        aiX: LOGICAL_WIDTH / 2 - PADDLE_WIDTH / 2,
        ballX: LOGICAL_WIDTH / 2 - BALL_SIZE / 2,
        ballY: LOGICAL_HEIGHT / 2 - BALL_SIZE / 2,
        ballDX: INITIAL_SPEED,
        ballDY: INITIAL_SPEED,
        speedMultiplier: 1.0,
    });

    // The render loop owns this mirror: it reads it each frame and writes it
    // whenever a goal is scored, so it never has to be torn down and rebuilt
    // when score state changes.
    const scoreRef = useRef(score);

    const requestRef = useRef(0);
    const areaRef = useRef(null);
    const wrapperRef = useRef(null);
    const rectRef = useRef({ width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT });

    // Escape is already handled by the arrow-key listener below, so the trap is
    // mounted without its own `onEscape` to avoid exiting twice.
    useFocusTrap(wrapperRef);

    const playerRef = useRef(null);
    const aiRef = useRef(null);
    const ballRef = useRef(null);

    // Cache the bounding rect. Reading it inside the touch handler forced a
    // synchronous layout on every single touchmove event.
    useEffect(() => {
        const measure = () => {
            const el = areaRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            rectRef.current = { width: r.width, height: r.height, left: r.left, top: r.top };
        };
        measure();
        window.addEventListener('resize', measure);
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
        if (ro && areaRef.current) ro.observe(areaRef.current);
        return () => {
            window.removeEventListener('resize', measure);
            ro?.disconnect();
        };
    }, []);

    // Paint positions with transforms only. `left`/`top` are layout-triggering
    // properties: writing them 60x/sec forced layout + paint every frame, which
    // is exactly what the direct-DOM approach was trying to avoid.
    const paint = useCallback(() => {
        const { width, height } = rectRef.current;
        const p = pos.current;
        const sx = width / LOGICAL_WIDTH;
        const sy = height / LOGICAL_HEIGHT;

        if (playerRef.current) {
            playerRef.current.style.transform = `translate3d(${p.playerX * sx}px, 0, 0)`;
        }
        if (aiRef.current) {
            aiRef.current.style.transform = `translate3d(${p.aiX * sx}px, 0, 0)`;
        }
        if (ballRef.current) {
            ballRef.current.style.transform = `translate3d(${p.ballX * sx}px, ${p.ballY * sy}px, 0)`;
        }
    }, []);

    useEffect(() => {
        const updateGame = () => {
            requestRef.current = requestAnimationFrame(updateGame);

            if (scoreRef.current.isGameOver) return;

            const p = pos.current;

            p.ballX += p.ballDX * p.speedMultiplier;
            p.ballY += p.ballDY * p.speedMultiplier;

            // Side walls
            if (p.ballX <= 0 || p.ballX >= LOGICAL_WIDTH - BALL_SIZE) {
                p.ballDX = -p.ballDX;
                p.ballX = Math.max(0, Math.min(LOGICAL_WIDTH - BALL_SIZE, p.ballX));
            }

            // AI tracking
            const aiSpeed = INITIAL_SPEED * p.speedMultiplier;
            const aiCenter = p.aiX + PADDLE_WIDTH / 2;
            if (aiCenter < p.ballX - 10) p.aiX += aiSpeed;
            else if (aiCenter > p.ballX + 10) p.aiX -= aiSpeed;
            p.aiX = Math.max(0, Math.min(LOGICAL_WIDTH - PADDLE_WIDTH, p.aiX));

            let scored = false;
            const next = { ...scoreRef.current };

            // Top edge (AI goal)
            if (p.ballY <= PADDLE_HEIGHT) {
                if (p.ballX + BALL_SIZE >= p.aiX && p.ballX <= p.aiX + PADDLE_WIDTH) {
                    p.ballDY = -p.ballDY;
                    p.ballY = PADDLE_HEIGHT;
                    p.speedMultiplier += 0.1;
                } else if (p.ballY < 0) {
                    next.player += 1;
                    scored = true;
                    p.ballDY = INITIAL_SPEED;
                }
            }

            // Bottom edge (player goal)
            if (p.ballY + BALL_SIZE >= LOGICAL_HEIGHT - PADDLE_HEIGHT) {
                if (p.ballX + BALL_SIZE >= p.playerX && p.ballX <= p.playerX + PADDLE_WIDTH) {
                    p.ballDY = -p.ballDY;
                    p.ballY = LOGICAL_HEIGHT - PADDLE_HEIGHT - BALL_SIZE;
                    p.speedMultiplier += 0.1;
                } else if (p.ballY > LOGICAL_HEIGHT) {
                    next.ai += 1;
                    scored = true;
                    p.ballDY = -INITIAL_SPEED;
                }
            }

            if (scored) {
                p.ballX = LOGICAL_WIDTH / 2 - BALL_SIZE / 2;
                p.ballY = LOGICAL_HEIGHT / 2 - BALL_SIZE / 2;
                p.ballDX = Math.random() > 0.5 ? INITIAL_SPEED : -INITIAL_SPEED;
                p.speedMultiplier = 1 + ((next.player + next.ai) * 0.15);
                if (next.player >= WIN_SCORE || next.ai >= WIN_SCORE) next.isGameOver = true;
                scoreRef.current = next;
                setScore(next);
            }

            paint();
        };

        requestRef.current = requestAnimationFrame(updateGame);
        return () => cancelAnimationFrame(requestRef.current);
    }, [paint]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const step = 60;
            if (e.key === 'ArrowLeft') {
                pos.current.playerX = Math.max(0, pos.current.playerX - step);
                paint();
            } else if (e.key === 'ArrowRight') {
                pos.current.playerX = Math.min(
                    LOGICAL_WIDTH - PADDLE_WIDTH,
                    pos.current.playerX + step
                );
                paint();
            } else if (e.key === 'q' || e.key === 'Q' || e.key === 'Escape') {
                onExit();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onExit, paint]);

    // NOTE: no preventDefault here — React attaches touchmove passively at the
    // root, so calling it was a no-op that only produced a console warning.
    // `touch-action: none` on the game area is what actually suppresses scroll.
    const handleTouchMove = (e) => {
        const touch = e.touches?.[0];
        if (!touch) return;
        const rect = rectRef.current;
        if (!rect.width) return;

        const touchX = touch.clientX - (rect.left ?? 0);
        const logicalX = (touchX / rect.width) * LOGICAL_WIDTH;
        pos.current.playerX = Math.max(
            0,
            Math.min(LOGICAL_WIDTH - PADDLE_WIDTH, logicalX - PADDLE_WIDTH / 2)
        );
        paint();
    };

    return (
        <div
            ref={wrapperRef}
            style={styles.wrapper}
            role="dialog"
            aria-modal="true"
            aria-label="Pong game"
            tabIndex={-1}
        >
            <div style={styles.header}>
                <span>AI: {score.ai}</span>
                <span>PONG</span>
                <span>YOU: {score.player}</span>
            </div>

            <div
                id="pong-container"
                ref={areaRef}
                style={styles.gameArea}
                onTouchMove={handleTouchMove}
            >
                <div ref={aiRef} style={styles.aiPaddle} />

                <div ref={ballRef} style={styles.ballEl} />

                <div ref={playerRef} style={styles.playerPaddle} />

                {score.isGameOver && (
                    <div style={styles.overlay}>
                        <h2 style={styles.overlayTitle}>
                            {score.player >= WIN_SCORE ? 'YOU WIN!' : 'GAME OVER'}
                        </h2>
                        <button
                            type="button"
                            onClick={onExit}
                            style={styles.exitButton}
                        >
                            [ Exit (Q) ]
                        </button>
                    </div>
                )}
            </div>
            <div style={styles.hint}>
                Desktop: [Left/Right Arrows] | Mobile: [Drag Area] | Exit: [Q]
            </div>
        </div>
    );
};

// Every sprite dimension is a fixed ratio of the logical playfield, so the
// percentages below are constants. They used to be recomputed and spread into
// a fresh style object on every render; hoisting them means React sees the same
// object identity each time and the arithmetic runs once at module load.
const PADDLE_W_PCT = `${(PADDLE_WIDTH / LOGICAL_WIDTH) * 100}%`;
const PADDLE_H_PCT = `${(PADDLE_HEIGHT / LOGICAL_HEIGHT) * 100}%`;
const BALL_W_PCT = `${(BALL_SIZE / LOGICAL_WIDTH) * 100}%`;
const BALL_H_PCT = `${(BALL_SIZE / LOGICAL_HEIGHT) * 100}%`;
const PLAYER_TOP_PCT = `${((LOGICAL_HEIGHT - PADDLE_HEIGHT) / LOGICAL_HEIGHT) * 100}%`;

// Shared by both paddles and the ball. Positions are painted via `transform` in
// `paint()`; `top`/`left` only anchor the element's origin.
const sprite = {
    position: 'absolute',
    backgroundColor: '#27c93f',
    boxShadow: '0 0 5px #27c93f',
    willChange: 'transform',
};

const styles = {
    aiPaddle: {
        ...sprite,
        top: 0,
        left: 0,
        width: PADDLE_W_PCT,
        height: PADDLE_H_PCT,
    },
    playerPaddle: {
        ...sprite,
        top: PLAYER_TOP_PCT,
        left: 0,
        width: PADDLE_W_PCT,
        height: PADDLE_H_PCT,
    },
    ballEl: {
        ...sprite,
        top: 0,
        left: 0,
        width: BALL_W_PCT,
        height: BALL_H_PCT,
    },
    overlayTitle: {
        color: '#27c93f',
        textShadow: '0 0 5px #27c93f',
    },
    exitButton: {
        marginTop: '1rem',
        cursor: 'pointer',
        background: 'none',
        border: '1px solid #27c93f',
        borderRadius: 6,
        padding: '6px 14px',
        color: '#27c93f',
        fontFamily: 'inherit',
    },
    hint: {
        fontSize: '0.8rem',
        color: '#888',
        marginTop: '0.5rem',
        textAlign: 'center',
    },
    wrapper: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: '1rem 0',
        fontFamily: "'Courier New', Courier, monospace",
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        // Was a fixed 800px, which overflowed the terminal horizontally on any phone.
        width: '100%',
        maxWidth: `${LOGICAL_WIDTH}px`,
        marginBottom: '0.5rem',
        color: '#27c93f',
        fontWeight: 'bold',
        textShadow: '0 0 5px #27c93f',
    },
    gameArea: {
        position: 'relative',
        width: '100%',
        maxWidth: '800px',
        aspectRatio: '8/5',
        border: '1px solid #27c93f',
        backgroundColor: 'rgba(0, 20, 0, 0.4)',
        overflow: 'hidden',
        touchAction: 'none',
        boxShadow: '0 0 10px rgba(0, 255, 0, 0.2) inset'
    },
    overlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    }
};
