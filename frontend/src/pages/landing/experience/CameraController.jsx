/* CameraController — a cinematic rig, not a scroll-locked camera.

   The mission state supplies a target offset from the vessel and how much
   the aim should favour the iceberg. Both are then DAMPED toward, so the
   camera glides through the story instead of snapping frame-to-frame with
   the scroll wheel. The offset also swings with the vessel's heading, so
   the camera stays behind-and-to-the-side through the turn. */

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, MathUtils } from 'three';
import { useMission } from './MissionController';

export default function CameraController() {
  const { state } = useMission();
  const { camera } = useThree();

  const target = useRef(new Vector3());
  const look = useRef(new Vector3());
  const scratch = useRef(new Vector3());

  useFrame((_, dt) => {
    const s = state.current;
    if (!s) return;

    const [ox, oy, oz] = s.camera.offset;

    // Rotate the offset with the vessel heading so the camera follows
    // the turn rather than being left behind by it.
    const h = s.vessel.heading;
    const rx = ox * Math.cos(h) - oz * Math.sin(h);
    const rz = ox * Math.sin(h) + oz * Math.cos(h);

    target.current.set(s.vessel.x + rx, oy, s.vessel.z + rz);

    // Aim: blend between the vessel and the berg by the phase's bias
    scratch.current.set(
      MathUtils.lerp(s.vessel.x, s.iceberg.x, s.camera.bergBias),
      6,
      MathUtils.lerp(s.vessel.z, s.iceberg.z, s.camera.bergBias)
    );

    // Damped follow — frame-rate independent
    camera.position.x = MathUtils.damp(camera.position.x, target.current.x, 1.8, dt);
    camera.position.y = MathUtils.damp(camera.position.y, target.current.y, 1.8, dt);
    camera.position.z = MathUtils.damp(camera.position.z, target.current.z, 1.8, dt);

    look.current.x = MathUtils.damp(look.current.x, scratch.current.x, 2.4, dt);
    look.current.y = MathUtils.damp(look.current.y, scratch.current.y, 2.4, dt);
    look.current.z = MathUtils.damp(look.current.z, scratch.current.z, 2.4, dt);
    camera.lookAt(look.current);

    if (Math.abs(camera.fov - s.camera.fov) > 0.01) {
      camera.fov = MathUtils.damp(camera.fov, s.camera.fov, 2, dt);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
