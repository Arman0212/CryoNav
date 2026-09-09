/* ═══════════════════════════════════════════════════════════════
   useMissionState — Real CryoNav Backend Data Integration
   Extracts authentic telemetry from createMission(demoTrajectory)
   ═══════════════════════════════════════════════════════════════ */

import { useMemo } from 'react';
import demoTrajectory from '../data/demoTrajectory';
import { createMission } from '../data/missionData';

export function useMissionState(progress = 0) {
  const mission = useMemo(() => createMission(demoTrajectory), []);
  const state = useMemo(() => mission.derive(progress), [mission, progress]);

  return { state, data: demoTrajectory, mission };
}
