import React, { useEffect, useRef } from 'react';
import { useTerminal } from '../hooks/useTerminal';
import { useTypewriter } from '../hooks/useTypewriter';
import { PongGame } from './PongGame';
import BootSequence from './BootSequence';
import MatrixRain from './MatrixRain';


// Component to render a single line of output
const OutputLine = React.memo(({ content, isAnimated, onAnimationComplete }) => {
  const { containerRef, isTyping, skip } = useTypewriter(content, onAnimationComplete);

  if (!isAnimated) {
    return <div className="output-line" dangerouslySetInnerHTML={{ __html: content }} />;
  }

  return (
    <div 
      ref={containerRef} 
      className="output-line" 
      onClick={skip}
    />
  );
}, (prevProps, nextProps) => {
  // If the line is static (not animated anymore), never re-render it.
  // This saves massive CPU overhead when typing new commands.
  if (!prevProps.isAnimated && !nextProps.isAnimated) return true;
  return prevProps.content === nextProps.content && prevProps.isAnimated === nextProps.isAnimated;
});

const Terminal = () => {
  const {
    history,
    inputVal,
    setInputVal,
    isTyping,
    setIsTyping,
    inputRef,
    terminalBodyRef,
    handleKeyDown,
    runCommand,
    showGame,
    setShowGame,
    showMatrix,
    setShowMatrix,
    showBoot,
    setShowBoot,
  } = useTerminal();

  const turbulenceRef = useRef(null);

  // Liquid animation
  useEffect(() => {
    let frames = 0;
    let animationId;
    
    const animate = () => {
      // Pause SVG filter calculations when heavy overlays are visible
      if (!showGame && !showMatrix) {
          if (frames % 3 === 0) {
            const val = 0.005 + Math.sin(frames * 0.002) * 0.002;
            if (turbulenceRef.current) {
              turbulenceRef.current.setAttribute('baseFrequency', `0.005 ${val}`);
            }
          }
          frames++;
      }
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [showGame, showMatrix]);

  // Tilt effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (window.innerWidth <= 768) {
        const wrapper = document.getElementById('terminal-wrapper');
        if (wrapper) wrapper.style.transform = 'none';
        return;
      }
      const x = e.clientX;
      const y = e.clientY;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const maxRot = 5;
      const rotX = ((y - centerY) / centerY) * -maxRot;
      const rotY = ((x - centerX) / centerX) * maxRot;
      
      const wrapper = document.getElementById('terminal-wrapper');
      if (wrapper) {
        wrapper.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleWrapperClick = (e) => {
    if (e.target.classList.contains('command-highlight')) {
      const cmd = e.target.getAttribute('data-cmd');
      if (cmd) runCommand(cmd);
      return;
    }
    if (e.target.tagName === 'A') return;
    if (inputRef.current && !isTyping) {
      inputRef.current.focus();
    }
  };

  const handleBootComplete = () => {
    sessionStorage.setItem('booted', 'true');
    setShowBoot(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <>
      {/* Boot sequence — only plays once per session */}
      {showBoot && <BootSequence onComplete={handleBootComplete} />}

      {/* Matrix rain overlay */}
      {showMatrix && (
        <MatrixRain onExit={() => {
          setShowMatrix(false);
          setTimeout(() => inputRef.current?.focus(), 50);
        }} />
      )}

      <div className="scanlines"></div>
      
      <svg className="svg-filters">
        <defs>
          <filter id="liquid-distortion">
            <feTurbulence 
              ref={turbulenceRef}
              type="fractalNoise" 
              baseFrequency="0.005 0.005" 
              numOctaves="1" 
              result="noise" 
              seed="1"
            />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div className="terminal-wrapper" id="terminal-wrapper" onClick={handleWrapperClick}>
        <div className="terminal-glass"></div>
        
        <div className="terminal-content">
          <div className="terminal-header">
            <div className="traffic-lights">
              <div className="light red"></div>
              <div className="light yellow"></div>
              <div className="light green"></div>
            </div>
            <div className="terminal-title">visitor@teoclerici: ~</div>
          </div>
          
          <div className="terminal-body" id="terminal-body" ref={terminalBodyRef}>
            {history.map((item, index) => (
              <OutputLine 
                key={item.id} 
                content={item.content} 
                isAnimated={item.isAnimated}
                onAnimationComplete={() => {
                  if (index === history.length - 1) {
                    setIsTyping(false);
                    setTimeout(() => inputRef.current?.focus(), 10);
                  }
                }}
              />
            ))}
            
            {showGame && (
              <PongGame onExit={() => {
                setShowGame(false);
                setTimeout(() => inputRef.current?.focus(), 10);
              }} />
            )}
            
            <div className="input-line">
              <span className="prompt">visitor@teoclerici:~$</span>
              <input 
                ref={inputRef}
                type="text" 
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping || showGame}
                autoComplete="off" 
                spellCheck="false" 
                autoFocus={!showBoot}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Terminal;
