import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import Terminal from './components/Terminal';
import CssFallback from './components/CssFallback';
import { getDeviceTier } from './utils/deviceTier';
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

function App() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [tier] = useState(() => getDeviceTier());
  const [overlayActive, setOverlayActive] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Stable identity so Terminal's effect doesn't re-run on every render.
  const handleOverlayChange = useCallback((active) => setOverlayActive(active), []);

  const lowPower = tier === 'low';

  return (
    <div className="app-container">
      {/* Custom cursor — lazy loaded, non-critical, hidden on touch devices */}
      <Suspense fallback={null}>
        <CustomCursor />
      </Suspense>

      {/* Background: real shader on capable devices, CSS gradient otherwise */}
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

      {/* Terminal */}
      <Terminal onOverlayChange={handleOverlayChange} />

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

      {/* Vercel Speed Insights */}
      <SpeedInsights />
      <Analytics />
    </div>
  );
}

export default App;
