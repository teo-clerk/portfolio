import React from 'react';
import FloatingLines from './components/FloatingLines';
import Terminal from './components/Terminal';

function App() {
  return (
    <div className="app-container">
      {/* Layer 1: Background is handled via CSS on body/app-container */}
      
      {/* Layer 2: Floating 3D Lines */}
      {/* Layer 2: Floating 3D Lines */}
      <FloatingLines 
        enabledWaves={['top', 'middle', 'bottom']}
        lineCount={[10, 15, 20]}
        lineDistance={[8, 6, 4]}
        bendRadius={5.0}
        bendStrength={-0.5}
        interactive={true}
        parallax={true}
      />
      
      {/* Layer 3: Terminal */}
      <Terminal />
    </div>
  );
}

export default App;
