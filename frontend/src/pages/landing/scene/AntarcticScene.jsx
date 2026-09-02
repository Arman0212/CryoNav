/* AntarcticScene — the pinned WebGL world.

   One <Canvas>, fixed to the viewport, alive for the whole page. Content
   scrolls over it; the world underneath keeps running. Bright polar
   daylight: a high sun, strong hemisphere fill off the ice, and pale fog
   that swallows the horizon so the sea never ends in a hard edge. */

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Ocean from './Ocean';
import Vessel from './Vessel';
import Iceberg from './Iceberg';
import NavigationRoute from './NavigationRoute';
import SceneEnvironment from './Environment';
import Atmosphere from './Atmosphere';
import CameraController from '../experience/CameraController';

export default function AntarcticScene({ quality = 'high' }) {
  const shadows = quality === 'high';

  return (
    <Canvas
      className="lp3-canvas"
      shadows={shadows}
      dpr={[1, quality === 'low' ? 1.25 : 1.75]}
      gl={{ antialias: quality !== 'low', powerPreference: 'high-performance', alpha: false }}
      camera={{ position: [150, 96, 210], fov: 46, near: 1, far: 4000 }}
      onCreated={({ gl }) => gl.setClearColor('#e9f2fa', 1)}
    >
      {/* Cold daylight: high sun + strong bounce off the ice */}
      <hemisphereLight args={['#ffffff', '#c3dcef', 1.15]} />
      <directionalLight
        position={[260, 340, 180]}
        intensity={2.1}
        color="#fff6ea"
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-260}
        shadow-camera-right={260}
        shadow-camera-top={260}
        shadow-camera-bottom={-260}
        shadow-camera-far={900}
      />
      <ambientLight intensity={0.35} color="#dbe9f5" />

      {/* Pale polar haze — the horizon dissolves rather than ending */}
      <fog attach="fog" args={['#e4eef8', 620, 2100]} />

      <Suspense fallback={null}>
        <Ocean quality={quality} />
        <Atmosphere quality={quality} />
        <SceneEnvironment quality={quality} />
        <NavigationRoute quality={quality} />
        <Iceberg quality={quality} />
        <Vessel quality={quality} />
      </Suspense>

      <CameraController />
    </Canvas>
  );
}
