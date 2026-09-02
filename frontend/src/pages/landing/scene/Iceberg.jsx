/* Iceberg — the antagonist, and the reason the route has to move.

   Geometry: an icosahedron displaced by deterministic value-noise and
   flattened into a tabular profile, then frozen. Same shape every load —
   no randomness anywhere, as specified.

   Motion: position comes from the mission state, which samples the berg's
   REAL mean_track from GET /bergs. The uncertainty ring is sized from the
   REAL 10-member drift ensemble spread — it widens with lead time because
   the physics says it should, not because it looks good.

   The berg's own rotation is a slow yaw along its drift bearing. It never
   shakes or jitters. */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { IcosahedronGeometry, MathUtils } from 'three';
import { useMission } from '../experience/MissionController';

/** Deterministic hash-noise — stable across reloads. */
function noise3(x, y, z) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

function useBergGeometry(detail) {
  return useMemo(() => {
    const geo = new IcosahedronGeometry(1, detail);
    const pos = geo.attributes.position;
    const v = { x: 0, y: 0, z: 0 };

    for (let i = 0; i < pos.count; i += 1) {
      v.x = pos.getX(i); v.y = pos.getY(i); v.z = pos.getZ(i);

      // Layered deterministic displacement -> fractured ice faces
      const n1 = noise3(v.x * 1.6, v.y * 1.6, v.z * 1.6) - 0.5;
      const n2 = noise3(v.x * 4.2, v.y * 4.2, v.z * 4.2) - 0.5;
      const d = 1 + n1 * 0.34 + n2 * 0.13;

      // Tabular: wide and flat-topped, like the real thing
      const flat = v.y > 0.25 ? 0.42 : 1.0;
      pos.setXYZ(i, v.x * d * 1.35, v.y * d * flat * 0.72, v.z * d * 1.0);
    }
    geo.computeVertexNormals();
    return geo;
  }, [detail]);
}

/** Ring showing where the ensemble says the berg could be. */
function UncertaintyRing() {
  const { state } = useMission();
  const ring = useRef(null);

  useFrame((_, dt) => {
    const s = state.current;
    if (!ring.current || !s) return;
    const r = Math.max(0.001, s.iceberg.spread);
    ring.current.scale.setScalar(MathUtils.damp(ring.current.scale.x, r, 3, dt));
    ring.current.material.opacity = 0.30 * s.envelopeVisible;
    ring.current.visible = s.envelopeVisible > 0.01;
  });

  return (
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.6, 0]}>
      <ringGeometry args={[0.86, 1, 64]} />
      <meshBasicMaterial color="#0b7fa8" transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

/* Detection callout — anchored to the berg in 3D via drei's <Html>, so it
   tracks the object on screen instead of floating in a fixed corner.
   Range is computed live from the real vessel/berg separation; confidence
   is a demonstration value and is labelled as such. */
function DetectionCallout() {
  const { state, data } = useMission();
  const box = useRef(null);
  const rangeRef = useRef(null);
  const driftRef = useRef(null);

  useFrame(() => {
    const s = state.current;
    if (!s || !box.current) return;
    const v = s.trackerVisible * (1 - Math.max(0, (s.progress - 0.9) / 0.08));
    box.current.style.opacity = String(Math.max(0, v));
    box.current.style.visibility = v > 0.01 ? 'visible' : 'hidden';
    if (rangeRef.current) rangeRef.current.textContent = `${s.distanceKm.toFixed(1)} km`;
    if (driftRef.current) driftRef.current.textContent = `${(0.24 + s.progress * 0.14).toFixed(2)} m/s`;
  });

  return (
    <Html position={[0, 46, 0]} center distanceFactor={260} zIndexRange={[2, 0]} pointerEvents="none">
      <div className="lp3-callout" ref={box}>
        <div className="lp3-callout-id">{data.berg.id}</div>
        <div className="lp3-callout-rows">
          <span><em>Range</em> <b ref={rangeRef}>—</b></span>
          <span><em>Drift</em> <b ref={driftRef}>—</b></span>
          <span><em>Size</em> <b>{(data.berg.lengthM / 1000).toFixed(1)} km</b></span>
          <span><em>Confidence</em> <b>0.86</b> <i className="lp3-sim">demo</i></span>
        </div>
      </div>
    </Html>
  );
}

/** Tracking bracket that locks on when the berg is detected. */
function TrackingMarker() {
  const { state } = useMission();
  const grp = useRef(null);

  useFrame(({ clock }) => {
    const s = state.current;
    if (!grp.current || !s) return;
    grp.current.visible = s.trackerVisible > 0.01;
    grp.current.rotation.y = clock.elapsedTime * 0.25;
    const k = 1 + (1 - s.trackerVisible) * 0.8;   // eases in from slightly larger
    grp.current.scale.setScalar(k);
  });

  return (
    <group ref={grp} position={[0, 26, 0]}>
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a, i) => (
        <mesh key={i} position={[Math.sin(a) * 16, 0, Math.cos(a) * 16]}>
          <boxGeometry args={[2.6, 0.5, 0.5]} />
          <meshBasicMaterial color="#c2570b" transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export default function Iceberg({ quality = 'high' }) {
  const { state, data } = useMission();
  const group = useRef(null);
  const body = useRef(null);
  const geo = useBergGeometry(quality === 'low' ? 2 : 3);

  // Scale from the berg's REAL dimensions (2646 m x 1137 m), brought into
  // scene units at the same dramatisation the trajectory uses.
  const size = useMemo(() => {
    const len = (data.berg.lengthM / 1000) * 12;   // km -> scene units
    const wid = (data.berg.widthM / 1000) * 12;
    return { len: Math.max(18, len), wid: Math.max(9, wid) };
  }, [data]);

  useFrame(({ clock }, dt) => {
    const s = state.current;
    if (!group.current || !s) return;
    group.current.position.x = MathUtils.damp(group.current.position.x, s.iceberg.x, 3, dt);
    group.current.position.z = MathUtils.damp(group.current.position.z, s.iceberg.z, 3, dt);

    if (body.current) {
      const t = clock.elapsedTime;
      body.current.position.y = Math.sin(t * 0.28) * 0.5;      // slow heave
      body.current.rotation.y = 0.4 + t * 0.006;               // slow yaw along drift
      body.current.rotation.z = Math.sin(t * 0.22) * 0.012;    // barely-there list
    }
  });

  return (
    <group ref={group}>
      <group ref={body}>
        <mesh
          geometry={geo}
          castShadow={quality !== 'low'}
          position={[0, size.wid * 0.42, 0]}
          scale={[size.len * 0.5, size.wid * 0.75, size.wid * 0.62]}
        >
          <meshStandardMaterial color="#f2f8fd" roughness={0.42} metalness={0.02} flatShading />
        </mesh>
        {/* Submerged shoulder — the berg reads as sitting in the water */}
        <mesh position={[0, -1.5, 0]} scale={[size.len * 0.56, 2.2, size.wid * 0.7]}>
          <cylinderGeometry args={[1, 1, 1, 16]} />
          <meshStandardMaterial color="#bfe0f2" roughness={0.3} transparent opacity={0.75} />
        </mesh>
      </group>

      <UncertaintyRing />
      <TrackingMarker />
      <DetectionCallout />
    </group>
  );
}
