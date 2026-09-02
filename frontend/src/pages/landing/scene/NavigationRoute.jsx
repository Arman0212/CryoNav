/* NavigationRoute — the corridors, drawn into the world.

   Both curves come from the real router: the primary is a window of the
   `balanced` corridor, the alternative is the actual `min_ice` corridor
   returned by POST /route. The re-route in this story is the engine's own
   answer, not something drawn to look convincing.

   Rendered as tube geometry lying just above the sea so it reads as a
   projected navigation path rather than a line floating over the page.
   The primary shifts safe -> danger as risk climbs; the alternative draws
   itself in by revealing along its length. */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, TubeGeometry, AdditiveBlending, Matrix4, Vector3 } from 'three';
import { useMission } from '../experience/MissionController';

const SAFE = new Color('#0b7fa8');
const DANGER = new Color('#d1490b');
const ALT = new Color('#0e9f6e');

/** Particles running along a curve, showing direction of travel. */
function FlowMarkers({ curve, count = 26, color, speed = 0.05, opacityRef }) {
  const mesh = useRef(null);
  // Scratch objects reused every frame — no per-frame allocation
  const scratch = useMemo(() => ({ m: new Matrix4(), v: new Vector3() }), []);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.elapsedTime;
    const op = opacityRef ? opacityRef() : 1;
    mesh.current.visible = op > 0.02;
    mesh.current.material.opacity = 0.75 * op;
    if (op <= 0.02) return;   // skip the work entirely when hidden

    for (let i = 0; i < count; i += 1) {
      const u = (i / count + t * speed) % 1;
      curve.getPointAt(u, scratch.v);
      scratch.m.identity().setPosition(scratch.v.x, 1.6, scratch.v.z);
      mesh.current.setMatrixAt(i, scratch.m);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1.5, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.75} depthWrite={false} blending={AdditiveBlending} />
    </instancedMesh>
  );
}

/* Waypoint nodes for the safe route, revealed one after another as the
   router "solves" — the visual counterpart to the calculation beat. */
function RouteNodes({ curve, count = 9 }) {
  const { state } = useMission();
  const group = useRef(null);
  const points = useMemo(
    () => Array.from({ length: count }, (_, i) => curve.getPointAt(i / (count - 1))),
    [curve, count]
  );

  useFrame(() => {
    const s = state.current;
    if (!group.current || !s) return;
    const reveal = s.altReveal;
    group.current.visible = reveal > 0.01;
    group.current.children.forEach((node, i) => {
      // Each node has its own slice of the reveal window
      const own = Math.max(0, Math.min(1, (reveal - (i / count) * 0.85) * 6));
      node.scale.setScalar(own * 3.2);
      node.children[1].material.opacity = own * 0.35;
    });
  });

  return (
    <group ref={group}>
      {points.map((p, i) => (
        <group key={i} position={[p.x, 2.2, p.z]}>
          <mesh>
            <sphereGeometry args={[1, 12, 12]} />
            <meshBasicMaterial color="#0e9f6e" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.6, 2.1, 20]} />
            <meshBasicMaterial color="#0e9f6e" transparent opacity={0.35} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function NavigationRoute({ quality = 'high' }) {
  const { mission, state } = useMission();
  const primaryMat = useRef(null);
  const altMat = useRef(null);
  const altMesh = useRef(null);

  const seg = quality === 'low' ? 90 : 220;

  const primaryGeo = useMemo(
    () => new TubeGeometry(mission.routeCurve, seg, 1.5, 8, false),
    [mission, seg]
  );
  const altGeo = useMemo(
    () => new TubeGeometry(mission.altCurve, seg, 1.9, 8, false),
    [mission, seg]
  );

  const scratch = useMemo(() => new Color(), []);

  useFrame(() => {
    const s = state.current;
    if (!s) return;

    // Primary corridor: safe -> danger as the envelope closes in
    if (primaryMat.current) {
      scratch.copy(SAFE).lerp(DANGER, s.routeDanger);
      primaryMat.current.color.copy(scratch);
      primaryMat.current.opacity = 0.95 - s.altReveal * 0.55;
    }

    // Alternative corridor reveals along its length
    if (altMesh.current && altMat.current) {
      altMesh.current.visible = s.altReveal > 0.01;
      altMat.current.opacity = s.altReveal;
      altGeo.setDrawRange(0, Math.floor(altGeo.index.count * s.altReveal));
    }
  });

  return (
    <group position={[0, 1.2, 0]}>
      <mesh geometry={primaryGeo}>
        <meshBasicMaterial ref={primaryMat} color={SAFE} transparent opacity={0.95} depthWrite={false} />
      </mesh>

      <mesh ref={altMesh} geometry={altGeo} visible={false}>
        <meshBasicMaterial ref={altMat} color={ALT} transparent opacity={0} depthWrite={false} />
      </mesh>

      <FlowMarkers
        curve={mission.routeCurve}
        color="#8ed3ea"
        opacityRef={() => 1 - (state.current?.altReveal ?? 0)}
      />
      <FlowMarkers
        curve={mission.altCurve}
        color="#7fe3bd"
        speed={0.07}
        opacityRef={() => state.current?.altReveal ?? 0}
      />

      <RouteNodes curve={mission.altCurve} count={quality === 'low' ? 6 : 9} />
    </group>
  );
}
