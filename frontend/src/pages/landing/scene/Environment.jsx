/* Environment — the world the mission happens inside.

   Mountains / ice shelf on the horizon, scattered sea-ice floes whose
   density tracks the sea-ice readout, and drifting snow. Everything here
   is instanced or deterministic; nothing allocates per frame.

   Depth comes from real separation in Z, not from fake parallax layers:
   the shelf sits ~1200 units out, floes populate the mid-field, snow
   drifts through the near field. */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Matrix4, Vector3, Euler, Quaternion } from 'three';
import { useMission } from '../experience/MissionController';

/** Deterministic pseudo-random — same world on every load. */
function rnd(seed) {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/* ── Distant ice shelf / mountains ─────────────────────────────── */
function IceShelf() {
  const peaks = useMemo(() => {
    const out = [];
    for (let i = 0; i < 34; i += 1) {
      const a = (i / 34) * Math.PI * 2;
      const r = 1150 + rnd(i) * 260;
      out.push({
        pos: [Math.sin(a) * r, 0, Math.cos(a) * r],
        w: 140 + rnd(i + 40) * 260,
        h: 42 + rnd(i + 80) * 96,
        d: 90 + rnd(i + 120) * 120,
        rot: rnd(i + 160) * Math.PI,
      });
    }
    return out;
  }, []);

  return (
    <group>
      {peaks.map((p, i) => (
        <mesh key={i} position={p.pos} rotation={[0, p.rot, 0]}>
          <boxGeometry args={[p.w, p.h, p.d]} />
          <meshStandardMaterial color="#eaf2f9" roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* ── Sea-ice floes — count driven by the sea-ice readout ───────── */
function SeaIceField({ quality = 'high' }) {
  const { state } = useMission();
  const mesh = useRef(null);
  const COUNT = quality === 'low' ? 90 : 260;

  const floes = useMemo(
    () => Array.from({ length: COUNT }, (_, i) => {
      const a = rnd(i) * Math.PI * 2;
      const r = 120 + rnd(i + 7) * 900;
      return {
        x: Math.sin(a) * r,
        z: Math.cos(a) * r,
        s: 6 + rnd(i + 21) * 26,
        rot: rnd(i + 33) * Math.PI,
        threshold: rnd(i + 55),      // which floes appear as ice grows
      };
    }),
    [COUNT]
  );

  const scratch = useMemo(
    () => ({ m: new Matrix4(), p: new Vector3(), q: new Quaternion(), e: new Euler(), s: new Vector3() }),
    []
  );

  useFrame(({ clock }) => {
    const st = state.current;
    if (!mesh.current || !st) return;
    const t = clock.elapsedTime;

    // Sea-ice concentration decides how many floes are present
    const conc = Math.min(1, Math.max(0, (st.seaIce - 0.1) / 0.4));

    for (let i = 0; i < COUNT; i += 1) {
      const f = floes[i];
      const on = f.threshold < conc ? 1 : 0.0001;
      scratch.p.set(f.x, 0.5 + Math.sin(t * 0.5 + i) * 0.35, f.z);
      scratch.e.set(0, f.rot + t * 0.01, 0);
      scratch.q.setFromEuler(scratch.e);
      scratch.s.set(f.s * on, 1.2 * on, f.s * 0.7 * on);
      scratch.m.compose(scratch.p, scratch.q, scratch.s);
      mesh.current.setMatrixAt(i, scratch.m);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} castShadow={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#f4fafe" roughness={0.75} flatShading />
    </instancedMesh>
  );
}

/* ── Drifting snow ─────────────────────────────────────────────── */
function Snow({ quality = 'high' }) {
  const points = useRef(null);
  const COUNT = quality === 'low' ? 220 : 700;

  const positions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i += 1) {
      arr[i * 3] = (rnd(i) - 0.5) * 1400;
      arr[i * 3 + 1] = rnd(i + 11) * 300;
      arr[i * 3 + 2] = (rnd(i + 23) - 0.5) * 1400;
    }
    return arr;
  }, [COUNT]);

  useFrame((_, dt) => {
    if (!points.current) return;
    const arr = points.current.geometry.attributes.position.array;
    for (let i = 0; i < COUNT; i += 1) {
      arr[i * 3 + 1] -= dt * (6 + (i % 5));
      arr[i * 3] += dt * 3;
      if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 300;
      if (arr[i * 3] > 700) arr[i * 3] = -700;
    }
    points.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={COUNT} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={2.4} color="#ffffff" transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
}

export default function SceneEnvironment({ quality = 'high' }) {
  return (
    <group>
      <IceShelf />
      <SeaIceField quality={quality} />
      {quality !== 'low' && <Snow quality={quality} />}
    </group>
  );
}
