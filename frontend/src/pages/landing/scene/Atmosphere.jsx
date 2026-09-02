/* Atmosphere — high cloud and polar haze.

   Soft billboarded cloud banks drifting slowly across the sky, plus a
   pale horizon band that ties the fog colour into the sea. Cheap: a
   handful of transparent planes with a radial-gradient texture generated
   once on a small canvas, so there is no texture file to download. */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, DoubleSide } from 'three';

/** Deterministic pseudo-random, so the sky is identical on every load. */
function rnd(seed) {
  const s = Math.sin(seed * 91.7 + 41.3) * 43758.5453;
  return s - Math.floor(s);
}

/** Soft round puff, drawn once into a small canvas. */
function useCloudTexture() {
  return useMemo(() => {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }, []);
}

export default function Atmosphere({ quality = 'high' }) {
  const tex = useCloudTexture();
  const group = useRef(null);
  const COUNT = quality === 'low' ? 10 : 22;

  const clouds = useMemo(
    () => Array.from({ length: COUNT }, (_, i) => {
      const a = rnd(i) * Math.PI * 2;
      const r = 520 + rnd(i + 5) * 900;
      return {
        pos: [Math.sin(a) * r, 190 + rnd(i + 9) * 180, Math.cos(a) * r],
        scale: 220 + rnd(i + 13) * 380,
        drift: 0.5 + rnd(i + 17) * 1.4,
        opacity: 0.30 + rnd(i + 21) * 0.36,
      };
    }),
    [COUNT]
  );

  useFrame((_, dt) => {
    if (!group.current) return;
    // Slow, continuous drift — the sky is never quite still
    group.current.children.forEach((c, i) => {
      c.position.x += clouds[i].drift * dt * 1.6;
      if (c.position.x > 1500) c.position.x = -1500;
    });
  });

  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <mesh key={i} position={c.pos} scale={[c.scale, c.scale * 0.42, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={tex}
            transparent
            opacity={c.opacity}
            depthWrite={false}
            side={DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
