import React, { useState, useEffect } from 'react';
import FloatingLines from './components/FloatingLines';
import Terminal from './components/Terminal';

function App() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="app-container">
      {/* Layer 1: Background is handled via CSS on body/app-container */}
      
      {/* Layer 2: Floating 3D Lines */}
      <FloatingLines 
        enabledWaves={['top', 'middle', 'bottom']}
        lineCount={7}
        lineDistance={6}
        bendRadius={5.0}
        bendStrength={-0.5}
        interactive={!isMobile}
        parallax={true}
        mixBlendMode={isMobile ? 'normal' : 'screen'}
      />
      
      {/* Layer 3: Terminal */}
      <Terminal />
    </div>
  );
}

export default App;
