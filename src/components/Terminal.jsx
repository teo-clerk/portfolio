import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useTerminal } from '../hooks/useTerminal';
import { useTypewriter } from '../hooks/useTypewriter';
import { useTiltEffect } from '../hooks/useTiltEffect';
import { PongGame } from './PongGame';
import SnakeGame from './SnakeGame';
import BootSequence from './BootSequence';
import MatrixRain from './MatrixRain';
import CommandPalette from './CommandPalette';
import CommandChips from './CommandChips';

// Component to render a single line of output
const OutputLine = React.memo(({ content, isAnimated, onAnimationComplete }) => {
  const { containerRef, skip } = useTypewriter(content, onAnimationComplete);

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
OutputLine.displayName = 'OutputLine';

const Terminal = ({ onOverlayChange }) => {
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
    showDoom,
    setShowDoom,
    showSnake,
    setShowSnake,
    showBoot,
    setShowBoot,
  } = useTerminal();

  const turbulenceRef = useRef(null);
  const wrapperRef = useRef(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const overlayActive = showGame || showMatrix || showDoom || showSnake;

  // Report overlay state upward so the WebGL background can stop rendering
  // while it is fully occluded.
  useEffect(() => {
    onOverlayChange?.(overlayActive);
  }, [overlayActive, onOverlayChange]);

  // Liquid distortion animation.
  //
  // SVG filters are CPU-rasterized in most browsers, and this one is stacked on
  // top of a backdrop-filter over the whole panel. Safari was already opted out;
  // coarse pointers and reduced-motion users now are too — index.css drops the
  // filter entirely for them so there is nothing to animate.
  useEffect(() => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isSafari || coarse || reduced) {
      if (turbulenceRef.current) {
        turbulenceRef.current.setAttribute('baseFrequency', '0.005 0.005');
      }
      return;
    }

    let frames = 0;
    let animationId;

    const animate = () => {
      // Pause SVG filter calculations when heavy overlays are visible
      if (!overlayActive) {
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
  }, [overlayActive]);

  useTiltEffect(wrapperRef);

  // Cmd/Ctrl+K opens the palette from anywhere, including while the terminal
  // input is disabled mid-animation.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const closePalette = useCallback(() => {
    setPaletteOpen(false);
    setTimeout(() => inputRef.current?.focus(), 10);
  }, [inputRef]);

  // Upgrade generated `.command-highlight` spans into real keyboard-operable
  // controls. They are produced as raw HTML strings in dozens of places, so
  // this is done once here by observation rather than at every call site.
  useEffect(() => {
    const body = terminalBodyRef.current;
    if (!body) return;

    const markup = (el) => {
      if (!el.classList?.contains('command-highlight')) return;
      if (el.hasAttribute('data-a11y')) return;
      el.setAttribute('data-a11y', '1');
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      const cmd = el.getAttribute('data-cmd');
      if (cmd) el.setAttribute('aria-label', `Run command: ${cmd}`);
    };

    // The added node may itself be a chip (the typewriter appends each element
    // before filling it), so match the node as well as its descendants.
    const upgrade = (root) => {
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      markup(root);
      root.querySelectorAll?.('.command-highlight:not([data-a11y])').forEach(markup);
    };

    upgrade(body);
    const mo = new MutationObserver((records) => {
      records.forEach((r) => r.addedNodes.forEach(upgrade));
    });
    mo.observe(body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [terminalBodyRef]);

  const activateTarget = useCallback((target) => {
    if (!target?.classList?.contains('command-highlight')) return false;
    const cmd = target.getAttribute('data-cmd');
    if (cmd) runCommand(cmd);
    return true;
  }, [runCommand]);

  const handleWrapperClick = (e) => {
    if (activateTarget(e.target)) return;
    if (e.target.tagName === 'A') return;
    if (inputRef.current && !isTyping) {
      inputRef.current.focus();
    }
  };

  const handleWrapperKeyDown = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (!e.target?.classList?.contains('command-highlight')) return;
    e.preventDefault();
    activateTarget(e.target);
  };

  const handleBootComplete = useCallback(() => {
    try {
      sessionStorage.setItem('booted', 'true');
    } catch {
      /* storage blocked (private mode / embedded webview) — non-fatal */
    }
    setShowBoot(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [setShowBoot, inputRef]);

  // Stable identity: MatrixRain's effect depends on this, and an inline arrow
  // would tear down and restart the whole rain on every Terminal render.
  const handleMatrixExit = useCallback(() => {
    setShowMatrix(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [setShowMatrix, inputRef]);

  const handleGameExit = useCallback(() => {
    setShowGame(false);
    setTimeout(() => inputRef.current?.focus(), 10);
  }, [setShowGame, inputRef]);

  const handleSnakeExit = useCallback(() => {
    setShowSnake(false);
    setTimeout(() => inputRef.current?.focus(), 10);
  }, [setShowSnake, inputRef]);

  const handleDoomExit = useCallback(() => {
    setShowDoom(false);
    setTimeout(() => inputRef.current?.focus(), 10);
  }, [setShowDoom, inputRef]);

  return (
    <>
      {/* Boot sequence — only plays once per session */}
      {showBoot && <BootSequence onComplete={handleBootComplete} />}

      {/* Matrix rain overlay */}
      {showMatrix && <MatrixRain onExit={handleMatrixExit} />}

      {paletteOpen && <CommandPalette onClose={closePalette} onRun={runCommand} />}

      <div className="scanlines"></div>

      <svg className="svg-filters" aria-hidden="true">
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

      <div
        className="terminal-wrapper"
        id="terminal-wrapper"
        ref={wrapperRef}
        onClick={handleWrapperClick}
        onKeyDown={handleWrapperKeyDown}
      >
        <div className="terminal-glass"></div>

        <div className="terminal-content">
          <div className="terminal-header">
            <div className="traffic-lights">
              <div className="light red"></div>
              <div className="light yellow"></div>
              <div className="light green"></div>
            </div>
            <div className="terminal-title">visitor@teoclericijurado: ~</div>
          </div>

          <div
            className="terminal-body"
            id="terminal-body"
            ref={terminalBodyRef}
            role="log"
            aria-live="polite"
            aria-atomic="false"
            aria-label="Terminal output"
          >
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

            {showGame && <PongGame onExit={handleGameExit} />}

            {showDoom && (
              <div
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="DOOM"
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 9999,
                  backgroundColor: '#000',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  borderRadius: '12px'
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDoomExit();
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '15px 25px',
                    backgroundColor: '#B22222',
                    borderBottom: '2px solid #fff',
                    border: 'none',
                    width: '100%',
                    cursor: 'pointer',
                    alignItems: 'center',
                    font: 'inherit'
                  }}
                >
                  <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    DOOM.EXE (Click this bar to close)
                  </span>
                  <span
                    style={{
                      background: '#fff', color: '#B22222', fontFamily: 'var(--font-mono)',
                      fontSize: '1.2rem', fontWeight: 'bold', padding: '8px 16px', borderRadius: '6px'
                    }}
                  >
                    X CLOSE
                  </span>
                </button>
                <iframe
                  src="https://silentspacemarine.com/"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="DOOM"
                />
              </div>
            )}

            {showSnake && <SnakeGame onExit={handleSnakeExit} />}

            {/* Touch-only quick commands: Tab-completion is desktop-only */}
            <CommandChips onRun={runCommand} disabled={isTyping || showGame} />

            <div className="input-line">
              <span className="prompt">visitor@teoclericijurado:~$</span>
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping || showGame}
                placeholder={!inputVal && !isTyping ? "type 'help' — or press \u2318K" : ""}
                aria-label="Terminal command input"
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
