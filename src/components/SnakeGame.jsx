import React, { useState, useEffect, useRef, useCallback } from 'react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [[10, 10]];
const INITIAL_DIRECTION = [0, -1]; // moving up
const SPEED = 120; // ms per tick

export const SnakeGame = ({ onExit }) => {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState([15, 5]);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [highScore, setHighScore] = useState(
    parseInt(localStorage.getItem('snakeHighScore')) || 0
  );

  const directionRef = useRef(direction);
  directionRef.current = direction;

  // Sound effects
  const playSound = (type) => {
    try {
      let f1 = 400;
      let d = 0.1;
      let typeOsc = "square";
      if (type === 'eat') { f1 = 600; d = 0.1; }
      else if (type === 'die') { f1 = 150; d = 0.5; typeOsc = "sawtooth"; }
      
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = typeOsc;
      osc.frequency.setValueAtTime(f1, audioCtx.currentTime);
      if (type === 'die') {
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + d);
      } else if (type === 'eat') {
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + d);
      }
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + d);
    } catch(e) {}
  };

  const spawnFood = (currentSnake) => {
    let newFood;
    while (true) {
      newFood = [
        Math.floor(Math.random() * GRID_SIZE),
        Math.floor(Math.random() * GRID_SIZE)
      ];
      // eslint-disable-next-line no-loop-func
      if (!currentSnake.some(segment => segment[0] === newFood[0] && segment[1] === newFood[1])) {
        break;
      }
    }
    return newFood;
  };

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    setGameOver(false);
    setFood(spawnFood(INITIAL_SNAKE));
    setHasStarted(false);
  };

  const handleKeyDown = useCallback((e) => {
    if (gameOver && e.key === 'Enter') {
      resetGame();
      return;
    }
    if (e.key === 'Escape') {
      onExit();
      return;
    }

    if (!hasStarted && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      setHasStarted(true);
    }

    const [dx, dy] = directionRef.current;
    switch (e.key) {
      case 'ArrowUp':
        if (dy !== 1) setDirection([0, -1]);
        e.preventDefault();
        break;
      case 'ArrowDown':
        if (dy !== -1) setDirection([0, 1]);
        e.preventDefault();
        break;
      case 'ArrowLeft':
        if (dx !== 1) setDirection([-1, 0]);
        e.preventDefault();
        break;
      case 'ArrowRight':
        if (dx !== -1) setDirection([1, 0]);
        e.preventDefault();
        break;
      default:
        break;
    }
  }, [hasStarted, gameOver, onExit]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (gameOver || !hasStarted) return;

    const moveSnake = () => {
      setSnake(prev => {
        const head = prev[0];
        const [dx, dy] = directionRef.current;
        const newHead = [head[0] + dx, head[1] + dy];

        // Wall collision
        if (
          newHead[0] < 0 || newHead[0] >= GRID_SIZE ||
          newHead[1] < 0 || newHead[1] >= GRID_SIZE
        ) {
          playSound('die');
          setGameOver(true);
          return prev;
        }

        // Self collision
        if (prev.some(seg => seg[0] === newHead[0] && seg[1] === newHead[1])) {
          playSound('die');
          setGameOver(true);
          return prev;
        }

        const newSnake = [newHead, ...prev];

        // Eat food
        if (newHead[0] === food[0] && newHead[1] === food[1]) {
          playSound('eat');
          const newScore = score + 10;
          setScore(newScore);
          if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem('snakeHighScore', newScore);
          }
          setFood(spawnFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const intervalId = setInterval(moveSnake, SPEED);
    return () => clearInterval(intervalId);
  }, [hasStarted, gameOver, food, score, highScore]);

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
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
        fontFamily: 'var(--font-mono)'
      }}
    >
      <div style={{ position: 'absolute', top: 20, right: 20, cursor: 'pointer', color: 'var(--accent-color)', fontSize: '1.2rem', fontWeight: 'bold' }} onClick={onExit}>
        [X] CLOSE
      </div>
      
      <div style={{ marginBottom: 20, color: 'var(--accent-color)', fontSize: '1.5rem', textShadow: '0 0 10px var(--accent-color)' }}>
        SNAKE.EXE
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '300px', marginBottom: 10, color: '#fff' }}>
        <div>SCORE: {score}</div>
        <div>HIGH SCORE: {highScore}</div>
      </div>

      <div 
        style={{
          width: 300,
          height: 300,
          border: '2px solid var(--accent-color)',
          boxShadow: '0 0 20px var(--accent-color)',
          position: 'relative',
          backgroundColor: '#000'
        }}
      >
        {!hasStarted && !gameOver && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center', padding: 20 }}>
            Press arrow keys<br/>to start
          </div>
        )}
        
        {gameOver && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ff5f56', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10 }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: 10 }}>GAME OVER</div>
            <div style={{ color: '#fff' }}>Press ENTER to restart</div>
          </div>
        )}

        {/* Render food */}
        <div style={{
          position: 'absolute',
          width: 300 / GRID_SIZE,
          height: 300 / GRID_SIZE,
          left: (food[0] * 300) / GRID_SIZE,
          top: (food[1] * 300) / GRID_SIZE,
          backgroundColor: '#ff5f56',
          borderRadius: '50%',
          boxShadow: '0 0 10px #ff5f56'
        }} />

        {/* Render snake */}
        {snake.map((segment, i) => (
          <div 
            key={i}
            style={{
              position: 'absolute',
              width: 300 / GRID_SIZE,
              height: 300 / GRID_SIZE,
              left: (segment[0] * 300) / GRID_SIZE,
              top: (segment[1] * 300) / GRID_SIZE,
              backgroundColor: i === 0 ? '#fff' : 'var(--accent-color)',
              border: '1px solid #000',
              boxShadow: i === 0 ? '0 0 10px #fff' : 'none'
            }} 
          />
        ))}
      </div>
      
      <div style={{ marginTop: 20, color: '#888', fontSize: '0.9rem' }}>
        Controls: Arrow Keys to move • ESC to exit
      </div>
    </div>
  );
};

export default SnakeGame;
