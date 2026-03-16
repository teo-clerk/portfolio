import React, { useState, useEffect, lazy, Suspense } from 'react';
import Terminal from './components/Terminal';
import CustomCursor from './components/CustomCursor';
import { SpeedInsights } from "@vercel/speed-insights/react";

import { Analytics } from "@vercel/analytics/react";

// Heavy components — loaded lazily so they never block FCP/LCP
const FloatingLines = lazy(() => import('./components/FloatingLines'));

// Detect low-power/mobile conditions
const isLowPower = () => {
  if (typeof window === 'undefined') return false;
  const mobile = window.innerWidth <= 768;
  // Coarse pointer = touch device (usually less GPU headroom)
  const touch = window.matchMedia('(pointer: coarse)').matches;
  // navigator.hardwareConcurrency is a rough CPU signal
  const weakCPU = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4;
  return mobile || touch || weakCPU;
};

function App() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [lowPower] = useState(() => isLowPower());

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Tune FloatingLines based on device capability
  const lineCount = lowPower ? 3 : 7;
  const lineDistance = lowPower ? 8 : 6;

  return (
    <div className="app-container">
      {/* Custom cursor — hidden automatically on touch devices */}
      <CustomCursor />

      {/* Floating 3D Lines — lazy loaded (Three.js ~600KB) so it never blocks FCP */}
      <Suspense fallback={null}>
        <FloatingLines
          enabledWaves={lowPower ? ['middle'] : ['top', 'middle', 'bottom']}
          lineCount={lineCount}
          lineDistance={lineDistance}
          bendRadius={lowPower ? 3.0 : 5.0}
          bendStrength={-0.5}
          interactive={!isMobile}
          parallax={!isMobile && !lowPower}
          mixBlendMode={isMobile ? 'normal' : 'screen'}
        />
      </Suspense>

      {/* Terminal */}
      <Terminal />

      {/* Vercel Speed Insights */}
      <SpeedInsights />
      <Analytics />
    </div>
  );
}

export default App;
