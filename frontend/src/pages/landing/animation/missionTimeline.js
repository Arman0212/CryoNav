/* ═══════════════════════════════════════════════════════════════
   Mission Timeline & Keyframe Definitions
   Antarctic SVG Continuous Story Environment
   ═══════════════════════════════════════════════════════════════ */

/**
 * 0.00 – 0.15: Mission Start (Ship enters, calm navigation)
 * 0.15 – 0.30: Environmental Observation (Data sensors highlight sea-ice & wind)
 * 0.30 – 0.45: Iceberg Detected (Detection reticle, target ring)
 * 0.45 – 0.60: Trajectory Prediction (Iceberg drift path draws, risk increases)
 * 0.60 – 0.72: Risk Assessment (Original route turns red, ANRI spikes)
 * 0.72 – 0.82: AI Rerouting (Safe cyan route draws, waypoints appear)
 * 0.82 – 0.92: Vessel Turns (Ship rotates & moves away from iceberg)
 * 0.92 – 0.97: Safe Navigation (Risk drops, vessel clear of hazard)
 * 0.97 – 1.00: Final Call to Action (Wide Antarctic scene + Enter CryoNav)
 */

export const STORY_STAGES = [
  {
    range: [0.0, 0.14],
    id: 'start',
    headline: 'ANTARCTIC INTELLIGENCE.',
    subheadline: 'AI-POWERED MARITIME DECISION SUPPORT SYSTEM',
  },
  {
    range: [0.15, 0.28],
    id: 'observation',
    headline: 'THE ENVIRONMENT IS NEVER STATIC.',
    subheadline: 'REAL-TIME SATELLITE & OCEANOGRAPHIC DATA FUSION',
  },
  {
    range: [0.29, 0.42],
    id: 'detection',
    headline: 'ICEBERG DETECTED.',
    subheadline: 'POLARIS RADAR & IMAGE SEGMENTATION IDENTIFIES HAZARD B-22',
  },
  {
    range: [0.43, 0.57],
    id: 'trajectory',
    headline: 'THE ICE IS MOVING.',
    subheadline: 'THE ROUTE MUST MOVE WITH IT — RK4 DRIFT PREDICTION',
  },
  {
    range: [0.58, 0.70],
    id: 'risk',
    headline: 'THE ORIGINAL ROUTE IS NO LONGER OPTIMAL.',
    subheadline: 'ANRI RISK ENGINE DETECTS PREDICTED INTERSECTION',
  },
  {
    range: [0.71, 0.80],
    id: 'rerouting',
    headline: 'CRYONAV IS CALCULATING.',
    subheadline: 'SAFE + FUEL-EFFICIENT ALTERNATIVE ROUTE GENERATED',
  },
  {
    range: [0.81, 0.90],
    id: 'turn',
    headline: 'PREDICT. ASSESS. REROUTE. NAVIGATE.',
    subheadline: 'RESEARCH VESSEL EXECUTING STARBOARD MANEUVER',
  },
  {
    range: [0.91, 0.96],
    id: 'safe',
    headline: 'SAFE NAVIGATION.',
    subheadline: 'SMARTER DECISIONS IN EXTREME POLAR ENVIRONMENTS',
  },
  {
    range: [0.97, 1.0],
    id: 'final',
    headline: 'THE ICE MOVES. SO SHOULD THE ROUTE.',
    subheadline: 'CRYONAV ANTARCTIC DECISION SUPPORT PLATFORM',
    isFinal: true,
  },
];

/* ── Interpolation Helper Functions ── */

/** Linear interpolation between a and b */
export function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/** Cubic easing for camera moves */
export function cubicEase(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Returns normalized 0..1 factor within a specific scroll range [start, end]
 */
export function rangeFactor(progress, start, end) {
  if (progress <= start) return 0;
  if (progress >= end) return 1;
  return (progress - start) / (end - start);
}

/* ── Keyframe Trajectory Data ── */

/**
 * Ship Route Waypoints (SVG ViewBox 0 0 1400 900)
 */
export function getShipState(p) {
  // Phase 1 (0 to 0.75): Original path towards intersection point (180, 580) -> (580, 390)
  // Phase 2 (0.75 to 1.0): Rerouted path turning right to (700, 480) -> (960, 520) -> (1260, 440)
  
  let x, y, angle;

  if (p < 0.72) {
    // Moving along original approach
    const t = p / 0.72;
    x = lerp(160, 580, t);
    y = lerp(580, 390, t);
    angle = -24; // Heading up-right
  } else if (p < 0.84) {
    // Executing the turn (0.72 to 0.84)
    const t = (p - 0.72) / (0.84 - 0.72);
    const easedT = cubicEase(t);
    x = lerp(580, 720, easedT);
    y = lerp(390, 470, easedT);
    // Smooth turn from -24 deg up to +22 deg down-right
    angle = lerp(-24, 22, easedT);
  } else {
    // Following safe route away from iceberg (0.84 to 1.0)
    const t = (p - 0.84) / (1.0 - 0.84);
    x = lerp(720, 1260, t);
    y = lerp(470, 410, t);
    angle = lerp(22, -10, t);
  }

  return { x, y, angle };
}

/**
 * Iceberg Trajectory Data (SVG ViewBox 0 0 1400 900)
 */
export function getIcebergState(p) {
  // Iceberg drifts slowly down-left from (960, 160) to (540, 440)
  const x = lerp(960, 540, p);
  const y = lerp(160, 440, p);
  const rotation = lerp(0, 12, p);
  return { x, y, rotation };
}

/**
 * Camera Simulation Transforms (ViewBox center offsets & zoom)
 */
export function getCameraState(p) {
  let cx, cy, scale;

  if (p < 0.15) {
    // Intro wide view
    const t = rangeFactor(p, 0.0, 0.15);
    cx = lerp(0, 120, t);
    cy = lerp(0, -40, t);
    scale = lerp(1.0, 1.2, t);
  } else if (p < 0.35) {
    // Focus on iceberg & vessel
    const t = rangeFactor(p, 0.15, 0.35);
    cx = lerp(120, -140, t);
    cy = lerp(-40, 50, t);
    scale = lerp(1.2, 1.35, t);
  } else if (p < 0.60) {
    // Focus on trajectory & danger intersection
    const t = rangeFactor(p, 0.35, 0.60);
    cx = lerp(-140, 20, t);
    cy = lerp(50, 10, t);
    scale = lerp(1.35, 1.45, t);
  } else if (p < 0.82) {
    // Reroute calculation & ship maneuver
    const t = rangeFactor(p, 0.60, 0.82);
    cx = lerp(20, -90, t);
    cy = lerp(10, -50, t);
    scale = lerp(1.45, 1.3, t);
  } else if (p < 0.95) {
    // Pulling back as vessel navigates safely away
    const t = rangeFactor(p, 0.82, 0.95);
    cx = lerp(-90, 0, t);
    cy = lerp(-50, 0, t);
    scale = lerp(1.3, 1.05, t);
  } else {
    // Wide final scene
    cx = 0;
    cy = 0;
    scale = 1.0;
  }

  return { cx, cy, scale };
}

/**
 * Telemetry HUD Values derived from progress
 */
export function getTelemetryData(p) {
  const isDetected = p >= 0.28;
  const isRerouting = p >= 0.58 && p < 0.82;
  const isSafe = p >= 0.82;

  let anri = Math.round(lerp(18, 28, Math.min(p / 0.3, 1)));
  if (p >= 0.3 && p < 0.65) {
    anri = Math.round(lerp(28, 84, (p - 0.3) / 0.35));
  } else if (p >= 0.65 && p < 0.85) {
    anri = Math.round(lerp(84, 22, (p - 0.65) / 0.2));
  } else if (p >= 0.85) {
    anri = Math.round(lerp(22, 14, (p - 0.85) / 0.15));
  }

  const riskStatus = anri > 70 ? 'CRITICAL' : anri > 45 ? 'HIGH' : anri > 25 ? 'MODERATE' : 'LOW';
  const routeStatus = isSafe ? 'SAFE' : isRerouting ? 'REROUTING' : 'OPTIMAL';

  return {
    anri,
    riskStatus,
    routeStatus,
    isDetected,
    isRerouting,
    isSafe,
    sic: '64%',
    wind: '18 KTS SW',
    current: '1.2 KTS NE',
  };
}
