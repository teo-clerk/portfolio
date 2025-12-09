import React from 'react';
import FloatingLines from './components/FloatingLines';
import Terminal from './components/Terminal';

function App() {
  return (
    <div className="app-container">
      {/* Layer 1: Background is handled via CSS on body/app-container */}
      
      {/* Layer 2: Floating 3D Lines */}
      <FloatingLines />
      
      {/* Layer 3: Terminal */}
      <Terminal />
    </div>
  );
}

export default App;
