import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import Terminal from './components/Terminal';
import CssFallback from './components/CssFallback';
import Landing from './intro/Landing';
import { DOCKED_SESSION_KEY, getIntroMode, shouldShowIntro } from './intro/introState';
import { resolveDeepLink } from './commands/deepLink';
import { getDeviceTier } from './utils/deviceTier';
import { readStorage, removeStorage, writeStorage } from './utils/storage';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";

// Heavy / non-critical components — loaded lazily so they never block FCP/LCP.
// On the 'none' tier FloatingLines (raw WebGL2, ~5 kB gzip) is never imported
// at all, so no WebGL context is ever created.
const FloatingLines = lazy(() => import('./components/FloatingLines'));
const CustomCursor = lazy(() => import('./components/CustomCursor'));

// Module-scope constants. These are passed as props into FloatingLines, whose
// uniform-sync effect depends on them — an inline array literal here would get
// a fresh identity on every render and re-run that effect continuously.
const WAVES_FULL = Object.freeze(['top', 'middle', 'bottom']);
const WAVES_LOW = Object.freeze(['middle']);

// Durations of the veil that covers the switch between orbit and terminal.
// Keep in step with `.dock-veil--in` / `.dock-veil--out` in intro/intro.css.
const VEIL_IN_MS = 300;
const VEIL_OUT_MS = 450;

/** While the landing is up, wait this long before fetching the terminal's hero photo. */
const HERO_PREWARM_MS = 2500;

/**
 * Where a visit starts: in orbit (the landing) or docked (the terminal), and
 * which command the terminal runs on arrival.
 */
const readInitialSession = () => {
  let search = '';
  try {
    search = window.location.search;
  } catch {
    /* location unavailable — treat as a plain visit */
  }

  const docked = readStorage('sessionStorage', DOCKED_SESSION_KEY) === 'true';
  if (shouldShowIntro({ search, docked })) return { view: 'orbit', command: null };

  // A `?cmd=` link is written by a third party; resolveDeepLink is the
  // allow-list that decides whether it may run.
  return { view: 'terminal', command: resolveDeepLink(new URLSearchParams(search).get('cmd')) };
};

function App() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [tier] = useState(() => getDeviceTier());
  const [overlayActive, setOverlayActive] = useState(false);
  const [session, setSession] = useState(readInitialSession);
  /** @type {[null | 'in' | 'out', Function]} */
  const [veil, setVeil] = useState(null);
  const veilTimer = useRef(0);

  const introMode = getIntroMode(tier);
  const isAnimated = introMode !== 'static';
  const isDocked = session.view === 'terminal';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => () => window.clearTimeout(veilTimer.current), []);

  // The terminal's hero photo is a CSS background gated on this attribute (see
  // index.css). Docked: needed now. In orbit: fetch it once the landing has
  // settled, so it is already there when the visitor flies in — except on the
  // static tier (Save-Data, low-end), which waits until it is actually needed.
  useEffect(() => {
    const showHero = () => document.documentElement.setAttribute('data-hero', '');
    if (isDocked) {
      showHero();
      return undefined;
    }
    if (!isAnimated) return undefined;
    const timer = window.setTimeout(showHero, HERO_PREWARM_MS);
    return () => window.clearTimeout(timer);
  }, [isDocked, isAnimated]);

  // Stable identity so Terminal's effect doesn't re-run on every render.
  const handleOverlayChange = useCallback((active) => setOverlayActive(active), []);

  /** The landing's fly-in has finished: show the terminal. */
  const handleDock = useCallback((command) => {
    writeStorage('sessionStorage', DOCKED_SESSION_KEY, 'true');
    setSession({ view: 'terminal', command });
    window.clearTimeout(veilTimer.current);
    if (!isAnimated) return;

    setVeil('out');
    veilTimer.current = window.setTimeout(() => setVeil(null), VEIL_OUT_MS);
  }, [isAnimated]);

  /** `exit` in the terminal: back to orbit. */
  const handleUndock = useCallback(() => {
    removeStorage('sessionStorage', DOCKED_SESSION_KEY);
    const showOrbit = () => {
      setOverlayActive(false);
      setSession({ view: 'orbit', command: null });
    };
    window.clearTimeout(veilTimer.current);

    // Never mount the landing inside the event that asked for it. `exit` runs
    // from an Enter keydown; the landing focuses its primary button and
    // listens for Enter, so mounting it synchronously let that same key press
    // activate the button and dock straight back in. Even with animations off
    // the switch therefore waits for a new task.
    if (!isAnimated) {
      veilTimer.current = window.setTimeout(showOrbit, 0);
      return;
    }

    setVeil('in');
    veilTimer.current = window.setTimeout(() => {
      showOrbit();
      setVeil('out');
      veilTimer.current = window.setTimeout(() => setVeil(null), VEIL_OUT_MS);
    }, VEIL_IN_MS);
  }, [isAnimated]);

  const lowPower = tier === 'low';

  return (
    <div className="app-container">
      {/* Custom cursor — lazy loaded, non-critical, hidden on touch devices */}
      <Suspense fallback={null}>
        <CustomCursor />
      </Suspense>

      {isDocked ? (
        <>
          {/* Background: real shader on capable devices, CSS gradient otherwise.
              Mounted only while docked, so the orbit scene and this shader
              never hold a WebGL context at the same time. */}
          {tier === 'none' ? (
            <CssFallback />
          ) : (
            <Suspense fallback={null}>
              <FloatingLines
                enabledWaves={lowPower ? WAVES_LOW : WAVES_FULL}
                lineCount={lowPower ? 3 : 7}
                lineDistance={lowPower ? 8 : 6}
                bendRadius={lowPower ? 3.0 : 5.0}
                bendStrength={-0.5}
                interactive={!isMobile}
                parallax={!isMobile && !lowPower}
                mixBlendMode={isMobile ? 'normal' : 'screen'}
                // Stop rendering an occluded fullscreen shader while a
                // full-screen overlay (matrix, doom, pong, snake) is open.
                paused={overlayActive}
              />
            </Suspense>
          )}

          <Terminal
            onOverlayChange={handleOverlayChange}
            initialCommand={session.command}
            onUndock={handleUndock}
          />

          {/* Floating Download CV Button */}
          <a
            href="/CV.pdf"
            download="Teo_Clerici_CV.pdf"
            className="download-cv-btn"
            aria-label="Download Teo Clerici's CV"
            title="Download CV (PDF)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span className="download-cv-label">Download CV</span>
          </a>
        </>
      ) : (
        <Landing mode={introMode} onDock={handleDock} />
      )}

      {veil && <div className={`dock-veil dock-veil--${veil}`} aria-hidden="true" />}

      {/* Vercel Speed Insights */}
      <SpeedInsights />
      <Analytics />
    </div>
  );
}

export default App;
