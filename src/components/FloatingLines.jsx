import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

const Lines = () => {
  const mesh = useRef();

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (mesh.current) {
        mesh.current.rotation.x = Math.sin(time / 4);
        mesh.current.rotation.y = Math.sin(time / 2);
    }
  });

  return (
    <mesh ref={mesh} position={[0, 0, 0]}>
      <sphereGeometry args={[2, 32, 32]} />
      <meshStandardMaterial color="#8A2BE2" wireframe />
    </mesh>
  );
};

const FloatingLines = () => {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, opacity: 0.3, pointerEvents: 'none' }}>
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Lines />
      </Canvas>
    </div>
  );
};

export default FloatingLines;
