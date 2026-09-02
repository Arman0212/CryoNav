/* Vessel — the protagonist, and a real object in the world.

   No GLTF ships ship with this repo, so the hull is assembled from
   primitives inside one <group>. That group is the seam: dropping in a
   real model later means replacing the children and nothing else — the
   motion, wake and mission wiring all hang off the group transform.

   Position and heading come from the mission state every frame (via ref,
   never React). Bob, pitch and roll run off the clock instead of scroll,
   so the ship still breathes when the reader stops moving. */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Color } from 'three';
import { useMission } from '../experience/MissionController';

const HULL = '#12263c';
const DECK = '#e8eef4';
const TRIM = '#c9531f';

function Wake() {
  const ref = useRef(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.material.opacity = 0.26 + Math.sin(t * 1.6) * 0.05;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.35, 26]}>
      <planeGeometry args={[13, 62]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.28} depthWrite={false} />
    </mesh>
  );
}

export default function Vessel({ quality = 'high' }) {
  const { state } = useMission();
  const group = useRef(null);
  const rock = useRef(null);

  const hullColor = useMemo(() => new Color(HULL), []);

  useFrame(({ clock }, dt) => {
    const s = state.current;
    if (!group.current || !s) return;
    const t = clock.elapsedTime;

    // Drive position/heading straight from mission state — damped so
    // scroll jitter never turns into a twitching ship.
    group.current.position.x = MathUtils.damp(group.current.position.x, s.vessel.x, 4, dt);
    group.current.position.z = MathUtils.damp(group.current.position.z, s.vessel.z, 4, dt);
    group.current.rotation.y = MathUtils.damp(
      group.current.rotation.y, s.vessel.heading, 2.6, dt
    );

    // Sea state — independent of scroll, so the world stays alive
    if (rock.current) {
      rock.current.position.y = 1.6 + Math.sin(t * 0.9) * 0.55;
      rock.current.rotation.x = Math.sin(t * 0.75) * 0.030;   // pitch
      rock.current.rotation.z = Math.sin(t * 0.55 + 1.2) * 0.045; // roll
    }
  });

  return (
    <group ref={group}>
      <group ref={rock}>
        {/* ── Hull ── */}
        <mesh castShadow={quality !== 'low'} position={[0, 0, 0]}>
          <boxGeometry args={[9, 4.4, 34]} />
          <meshStandardMaterial color={hullColor} roughness={0.55} metalness={0.15} />
        </mesh>
        {/* Bow wedge */}
        <mesh castShadow={quality !== 'low'} position={[0, 0, -19.5]} rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[6.4, 4.4, 6.4]} />
          <meshStandardMaterial color={hullColor} roughness={0.55} metalness={0.15} />
        </mesh>
        {/* Waterline stripe */}
        <mesh position={[0, -1.6, 0]}>
          <boxGeometry args={[9.2, 1.0, 34.2]} />
          <meshStandardMaterial color={TRIM} roughness={0.7} />
        </mesh>

        {/* ── Superstructure ── */}
        <mesh castShadow={quality !== 'low'} position={[0, 4.4, 4]}>
          <boxGeometry args={[7.6, 4.6, 12]} />
          <meshStandardMaterial color={DECK} roughness={0.7} />
        </mesh>
        <mesh castShadow={quality !== 'low'} position={[0, 8.2, 5.5]}>
          <boxGeometry args={[6.4, 3.2, 7.5]} />
          <meshStandardMaterial color={DECK} roughness={0.7} />
        </mesh>
        {/* Bridge glazing */}
        <mesh position={[0, 8.4, 1.9]}>
          <boxGeometry args={[6.0, 1.5, 0.4]} />
          <meshStandardMaterial color="#2a4a68" roughness={0.25} metalness={0.35} />
        </mesh>
        {/* Funnel */}
        <mesh castShadow={quality !== 'low'} position={[0, 11.4, 8.5]}>
          <boxGeometry args={[3.0, 4.0, 3.4]} />
          <meshStandardMaterial color="#1c3550" roughness={0.6} />
        </mesh>
        {/* Mast */}
        <mesh position={[0, 13.0, 2.5]}>
          <cylinderGeometry args={[0.28, 0.28, 7, 6]} />
          <meshStandardMaterial color={DECK} roughness={0.6} />
        </mesh>
        {/* Foredeck crane */}
        <mesh position={[0, 3.6, -12]}>
          <boxGeometry args={[1.2, 3.4, 1.2]} />
          <meshStandardMaterial color={TRIM} roughness={0.7} />
        </mesh>
      </group>

      <Wake />
    </group>
  );
}
