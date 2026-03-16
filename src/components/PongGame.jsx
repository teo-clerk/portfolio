import React, { useState, useEffect, useRef } from 'react';

const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 10;
const BALL_SIZE = 10;
const LOGICAL_WIDTH = 800;
const LOGICAL_HEIGHT = 500;
const INITIAL_SPEED = 1.5;

export const PongGame = ({ onExit }) => {
    // Keep low-frequency variables (like score) in React State so the UI updates
    const [score, setScore] = useState({ player: 0, ai: 0, isGameOver: false });
    
    // Convert high-frequency X/Y coordinates to refs so they don't trigger React renders
    const pos = useRef({
        playerX: LOGICAL_WIDTH / 2 - PADDLE_WIDTH / 2,
        aiX: LOGICAL_WIDTH / 2 - PADDLE_WIDTH / 2,
        ballX: LOGICAL_WIDTH / 2 - BALL_SIZE / 2,
        ballY: LOGICAL_HEIGHT / 2 - BALL_SIZE / 2,
        ballDX: INITIAL_SPEED,
        ballDY: INITIAL_SPEED,
        speedMultiplier: 1.0,
    });

    const requestRef = useRef();
    
    // Direct DOM refs to bypass React's render pipeline for 60fps movement
    const playerRef = useRef(null);
    const aiRef = useRef(null);
    const ballRef = useRef(null);

    const updateGame = () => {
        if (score.isGameOver) return;
        const p = pos.current;

        // Move ball
        p.ballX += p.ballDX * p.speedMultiplier;
        p.ballY += p.ballDY * p.speedMultiplier;

        // Bounce off side walls
        if (p.ballX <= 0 || p.ballX >= LOGICAL_WIDTH - BALL_SIZE) {
            p.ballDX = -p.ballDX;
            p.ballX = Math.max(0, Math.min(LOGICAL_WIDTH - BALL_SIZE, p.ballX));
        }

        // AI Logic
        const aiSpeed = INITIAL_SPEED * p.speedMultiplier;
        const aiCenter = p.aiX + PADDLE_WIDTH / 2;
        if (aiCenter < p.ballX - 10) p.aiX += aiSpeed;
        else if (aiCenter > p.ballX + 10) p.aiX -= aiSpeed;
        p.aiX = Math.max(0, Math.min(LOGICAL_WIDTH - PADDLE_WIDTH, p.aiX));

        let scored = false;
        let newScore = { ...score };

        // Top edge (AI goal)
        if (p.ballY <= PADDLE_HEIGHT) {
            if (p.ballX + BALL_SIZE >= p.aiX && p.ballX <= p.aiX + PADDLE_WIDTH) {
                p.ballDY = -p.ballDY;
                p.ballY = PADDLE_HEIGHT;
                p.speedMultiplier += 0.1;
            } else if (p.ballY < 0) {
                newScore.player += 1;
                scored = true;
                p.ballDY = INITIAL_SPEED;
            }
        }

        // Bottom edge (Player goal)
        if (p.ballY + BALL_SIZE >= LOGICAL_HEIGHT - PADDLE_HEIGHT) {
            if (p.ballX + BALL_SIZE >= p.playerX && p.ballX <= p.playerX + PADDLE_WIDTH) {
                p.ballDY = -p.ballDY;
                p.ballY = LOGICAL_HEIGHT - PADDLE_HEIGHT - BALL_SIZE;
                p.speedMultiplier += 0.1;
            } else if (p.ballY > LOGICAL_HEIGHT) {
                newScore.ai += 1;
                scored = true;
                p.ballDY = -INITIAL_SPEED;
            }
        }

        if (scored) {
            p.ballX = LOGICAL_WIDTH / 2 - BALL_SIZE / 2;
            p.ballY = LOGICAL_HEIGHT / 2 - BALL_SIZE / 2;
            p.ballDX = Math.random() > 0.5 ? INITIAL_SPEED : -INITIAL_SPEED;
            p.speedMultiplier = 1 + ((newScore.player + newScore.ai) * 0.15);
            
            if (newScore.player >= 5 || newScore.ai >= 5) {
                newScore.isGameOver = true;
            }
            // Only trigger a React re-render when the score actually changes
            setScore(newScore);
        }

        // Directly apply CSS transforms to the DOM elements instead of re-rendering
        if (playerRef.current) playerRef.current.style.left = `${(p.playerX / LOGICAL_WIDTH) * 100}%`;
        if (aiRef.current) aiRef.current.style.left = `${(p.aiX / LOGICAL_WIDTH) * 100}%`;
        if (ballRef.current) {
            ballRef.current.style.left = `${(p.ballX / LOGICAL_WIDTH) * 100}%`;
            ballRef.current.style.top = `${(p.ballY / LOGICAL_HEIGHT) * 100}%`;
        }

        if (!newScore.isGameOver) {
            requestRef.current = requestAnimationFrame(updateGame);
        }
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(updateGame);
        return () => cancelAnimationFrame(requestRef.current);
    }, [score]); // Need score dependency so the closure has the latest score when checking Game Over

    const handleKeyDown = (e) => {
        const step = 60;
        if (e.key === 'ArrowLeft') {
            pos.current.playerX = Math.max(0, pos.current.playerX - step);
            if (playerRef.current) playerRef.current.style.left = `${(pos.current.playerX / LOGICAL_WIDTH) * 100}%`;
        } else if (e.key === 'ArrowRight') {
            pos.current.playerX = Math.min(LOGICAL_WIDTH - PADDLE_WIDTH, pos.current.playerX + step);
            if (playerRef.current) playerRef.current.style.left = `${(pos.current.playerX / LOGICAL_WIDTH) * 100}%`;
        } else if(e.key === 'q' || e.key === 'Escape'){
            onExit();
        }
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleTouchMove = (e) => {
        e.preventDefault(); 
        if (e.touches && e.touches.length > 0) {
            const touch = e.touches[0];
            const gameContainer = document.getElementById('pong-container');
            if (gameContainer) {
                const rect = gameContainer.getBoundingClientRect();
                const touchX = touch.clientX - rect.left;
                const logicalX = (touchX / rect.width) * LOGICAL_WIDTH;
                
                let newX = logicalX - (PADDLE_WIDTH / 2);
                pos.current.playerX = Math.max(0, Math.min(LOGICAL_WIDTH - PADDLE_WIDTH, newX));
                
                if (playerRef.current) playerRef.current.style.left = `${(pos.current.playerX / LOGICAL_WIDTH) * 100}%`;
            }
        }
    };

    return (
        <div style={styles.wrapper}>
            <div style={styles.header}>
                <span>AI: {score.ai}</span>
                <span>PONG</span>
                <span>YOU: {score.player}</span>
            </div>
            
            <div 
                id="pong-container"
                style={styles.gameArea} 
                onTouchMove={handleTouchMove}
            >
                {/* AI Paddle */}
                <div ref={aiRef} style={{
                    ...styles.paddle,
                    top: 0,
                    left: '50%', // Initial center
                    width: `${(PADDLE_WIDTH / LOGICAL_WIDTH) * 100}%`,
                    height: `${(PADDLE_HEIGHT / LOGICAL_HEIGHT) * 100}%`
                }} />
                
                {/* Ball */}
                <div ref={ballRef} style={{
                    ...styles.ball,
                    top: '50%',
                    left: '50%',
                    width: `${(BALL_SIZE / LOGICAL_WIDTH) * 100}%`,
                    height: `${(BALL_SIZE / LOGICAL_HEIGHT) * 100}%`
                }} />
                
                {/* Player Paddle */}
                <div ref={playerRef} style={{
                    ...styles.paddle,
                    bottom: 0,
                    left: '50%',
                    width: `${(PADDLE_WIDTH / LOGICAL_WIDTH) * 100}%`,
                    height: `${(PADDLE_HEIGHT / LOGICAL_HEIGHT) * 100}%`
                }} />

                {score.isGameOver && (
                    <div style={styles.overlay}>
                        <h2 style={{ color: '#27c93f', textShadow: '0 0 5px #27c93f' }}>
                            {score.player >= 5 ? 'YOU WIN!' : 'GAME OVER'}
                        </h2>
                        <span className="command-highlight" style={{ cursor: 'pointer', marginTop: '1rem' }} onClick={onExit}>[ Exit (Q) ]</span>
                    </div>
                )}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem', textAlign: 'center' }}>
                Desktop: [Left/Right Arrows] | Mobile: [Drag Area] | Exit: [Q]
            </div>
        </div>
    );
};

const styles = {
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
        width: `${LOGICAL_WIDTH}px`,
        marginBottom: '0.5rem',
        color: '#27c93f',
        fontWeight: 'bold',
        textShadow: '0 0 5px #27c93f',
    },
    gameArea: {
        position: 'relative',
        width: '100%',
        maxWidth: '800px', // Limits max size on big displays
        aspectRatio: '8/5', // Scales proportionally across screen sizes
        border: '1px solid #27c93f',
        backgroundColor: 'rgba(0, 20, 0, 0.4)',
        overflow: 'hidden',
        touchAction: 'none', // Prevent browser handling of gestures
        boxShadow: '0 0 10px rgba(0, 255, 0, 0.2) inset'
    },
    paddle: {
        position: 'absolute',
        backgroundColor: '#27c93f',
        boxShadow: '0 0 5px #27c93f',
    },
    ball: {
        position: 'absolute',
        backgroundColor: '#27c93f',
        boxShadow: '0 0 5px #27c93f',
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
