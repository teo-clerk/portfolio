import React, { useState, useEffect } from 'react';
import FloatingLines from './components/FloatingLines';
import Terminal from './components/Terminal';
import CustomCursor from './components/CustomCursor';

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

      {/* Floating 3D Lines — reduced on low-power */}
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

      {/* Terminal */}
      <Terminal />
    </div>
  );
}

export default App;
