import React, { useEffect, useRef } from 'react';
import { useTerminal } from '../hooks/useTerminal';
import { useTypewriter } from '../hooks/useTypewriter';

// Component to render a single line of output
const OutputLine = ({ content, isAnimated, onAnimationComplete }) => {
  const { containerRef, isTyping, skip } = useTypewriter(content, onAnimationComplete);

  // If not animated, just render HTML directly
  if (!isAnimated) {
    return <div className="output-line" dangerouslySetInnerHTML={{ __html: content }} />;
  }

  // If animated, use the hook ref
  return (
    <div 
      ref={containerRef} 
      className="output-line" 
      onClick={skip}
    />
  );
};

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
    runCommand
  } = useTerminal();

  const turbulenceRef = useRef(null);

  // Liquid animation
  useEffect(() => {
    let frames = 0;
    let animationId;
    
    const animate = () => {
      frames += 0.002;
      const val = 0.005 + Math.sin(frames) * 0.002;
      if (turbulenceRef.current) {
        turbulenceRef.current.setAttribute('baseFrequency', `0.005 ${val}`);
      }
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Tilt effect
  useEffect(() => {
    const handleMouseMove = (e) => {
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
    // If clicking a command link
    if (e.target.classList.contains('command-highlight')) {
      const cmd = e.target.getAttribute('data-cmd');
      if (cmd) runCommand(cmd);
      return;
    }
    
    // If clicking a normal link
    if (e.target.tagName === 'A') return;

    // Otherwise focus input
    if (inputRef.current && !isTyping) {
      inputRef.current.focus();
    }
  };

  return (
    <>
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
                  // Only set isTyping to false if this is the last item
                  if (index === history.length - 1) {
                    setIsTyping(false);
                    // Focus input after typing done
                    setTimeout(() => inputRef.current?.focus(), 10);
                  }
                }}
              />
            ))}
            
            <div className="input-line">
              <span className="prompt">visitor@teoclerici:~$</span>
              <input 
                ref={inputRef}
                type="text" 
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping}
                autoComplete="off" 
                spellCheck="false" 
                autoFocus
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Terminal;
