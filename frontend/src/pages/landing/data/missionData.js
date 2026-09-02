/* ═══════════════════════════════════════════════════════════════
   missionData — the single source of truth for the experience.

       scrollProgress (0→1)
             ↓
       missionTime (T+0 → T+48h)
             ↓
       missionState { vessel, iceberg, risk, route, camera, HUD }
             ↓
       the entire 3D scene, HUD and typography

   Nothing animates on its own timeline. Every moving part reads from one
   derived state object, so the ship, berg, routes, risk figure and camera
   can never disagree with each other.
   ═══════════════════════════════════════════════════════════════ */

import { CatmullRomCurve3, Vector3 } from 'three';

export const MISSION_DURATION_H = 48;

/* ── Mission phases ────────────────────────────────────────────── */
export const PHASE = {
  START: 0,
  OBSERVE: 1,
  DETECTED: 2,
  TRAJECTORY: 3,
  RISK: 4,
  REROUTING: 5,
  TURN: 6,
  SAFE: 7,
  FINAL: 8,
};

export const PHASES = [
  {
    at: 0.00, id: 'start', num: '01', label: 'Mission Start',
    lines: ['Antarctic', 'Intelligence.'],
    sub: 'AI-powered maritime decision support',
  },
  {
    at: 0.15, id: 'observe', num: '02', label: 'Environmental Observation',
    lines: ['The environment', 'is never static.'],
    sub: 'Sea ice, wind, current and visibility, read continuously',
  },
  {
    at: 0.30, id: 'detected', num: '03', label: 'Iceberg Detected',
    lines: ['Iceberg', 'detected.'],
    sub: 'A drifting mass identified ahead of the corridor',
  },
  {
    at: 0.45, id: 'trajectory', num: '04', label: 'Trajectory Prediction',
    lines: ['The ice', 'is moving.'],
    sub: 'The route must move with it',
  },
  {
    at: 0.60, id: 'risk', num: '05', label: 'Risk Assessment',
    lines: ['The original route', 'is no longer optimal.'],
    sub: 'Drift uncertainty intersects the planned corridor',
  },
  {
    at: 0.72, id: 'rerouting', num: '06', label: 'AI Rerouting',
    lines: ['CryoNav', 'is calculating.'],
    sub: 'Safe route found',
  },
  {
    at: 0.82, id: 'turn', num: '07', label: 'Vessel Turns',
    lines: ['Predict. Assess.', 'Reroute. Proceed.'],
    sub: 'The vessel takes the new heading',
  },
  {
    at: 0.92, id: 'safe', num: '08', label: 'Safe Navigation',
    lines: ['Safe navigation.', 'Smarter decisions.'],
    sub: 'Clear of the drift envelope, risk falling',
  },
  {
    at: 0.985, id: 'final', num: '09', label: 'CryoNav',
    lines: ['The ice moves.', 'So should the route.'],
    sub: 'AI-powered Antarctic navigation intelligence',
    isFinal: true,
  },
];

/* ── Risk track (ANRI 0–100) — simulated, labelled as such ─────── */
const RISK_KEYS = [
  [0.00, 22], [0.30, 30], [0.45, 46], [0.60, 74],
  [0.72, 79], [0.86, 44], [1.00, 26],
];

/* ── Demo environmental series (labelled DEMO in the HUD) ──────── */
const WIND_KEYS = [[0, 11], [0.3, 15], [0.6, 23], [0.8, 19], [1, 13]];
const VIS_KEYS = [[0, 14], [0.3, 11], [0.6, 6], [0.82, 9], [1, 15]];

/* ── Camera choreography: offsets from the vessel + aim bias ───── */
const CAMERA_KEYS = [
  { at: 0.00, offset: [168, 104, 228], bergBias: 0.10, fov: 48 },  // wide establishing
  { at: 0.15, offset: [116, 62, 164], bergBias: 0.16, fov: 44 },  // slow push in
  { at: 0.30, offset: [86, 46, 126], bergBias: 0.46, fov: 40 },  // shift to the berg
  { at: 0.45, offset: [74, 40, 108], bergBias: 0.60, fov: 38 },  // emphasise drift
  { at: 0.60, offset: [64, 34, 96], bergBias: 0.55, fov: 37 },  // ship / berg / route
  { at: 0.72, offset: [82, 52, 118], bergBias: 0.34, fov: 40 },  // route calculation
  { at: 0.82, offset: [62, 30, 88], bergBias: 0.18, fov: 38 },  // follow the turn
  { at: 0.92, offset: [92, 40, 128], bergBias: 0.10, fov: 42 },  // alongside
  { at: 1.00, offset: [210, 150, 280], bergBias: 0.06, fov: 52 },  // pull back wide
];

/* ── Maths helpers ─────────────────────────────────────────────── */
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;

export function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function sampleKeys(keys, p) {
  if (p <= keys[0][0]) return keys[0][1];
  if (p >= keys[keys.length - 1][0]) return keys[keys.length - 1][1];
  for (let i = 0; i < keys.length - 1; i += 1) {
    const [a, va] = keys[i];
    const [b, vb] = keys[i + 1];
    if (p >= a && p <= b) return lerp(va, vb, smoothstep(a, b, p));
  }
  return keys[keys.length - 1][1];
}

function sampleCamera(p) {
  if (p <= CAMERA_KEYS[0].at) return CAMERA_KEYS[0];
  const last = CAMERA_KEYS[CAMERA_KEYS.length - 1];
  if (p >= last.at) return last;
  for (let i = 0; i < CAMERA_KEYS.length - 1; i += 1) {
    const a = CAMERA_KEYS[i];
    const b = CAMERA_KEYS[i + 1];
    if (p >= a.at && p <= b.at) {
      const t = smoothstep(a.at, b.at, p);
      return {
        offset: [
          lerp(a.offset[0], b.offset[0], t),
          lerp(a.offset[1], b.offset[1], t),
          lerp(a.offset[2], b.offset[2], t),
        ],
        bergBias: lerp(a.bergBias, b.bergBias, t),
        fov: lerp(a.fov, b.fov, t),
      };
    }
  }
  return last;
}

export function phaseIndexAt(p) {
  let idx = 0;
  for (let i = 0; i < PHASES.length; i += 1) if (p >= PHASES[i].at) idx = i;
  return idx;
}

const ROUTE_STATUS = ['Nominal', 'Monitoring', 'Monitoring', 'Tracking', 'At risk', 'Recalculating', 'Rerouting', 'Safe', 'Safe'];

/* ═══════════════════════════════════════════════════════════════
   createMission — builds the curves once, returns a pure `derive`
   that is allocation-free enough to run every frame.
   ═══════════════════════════════════════════════════════════════ */
export function createMission(data) {
  const toCurve = (pts) =>
    new CatmullRomCurve3(pts.map(([x, z]) => new Vector3(x, 0, z)), false, 'catmullrom', 0.4);

  const routeCurve = toCurve(data.route);
  const altCurve = toCurve(data.altRoute);
  const bergCurve = toCurve(data.berg.track.map((k) => k.pos));

  const spread = data.berg.spread;
  const S = data.sceneScale || 1;
  const anchor = data.anchor;

  // Scratch vectors — reused, never reallocated
  const _a = new Vector3();
  const _b = new Vector3();
  const _tan = new Vector3();

  /** Uncertainty radius at mission hour `h`, from the real ensemble. */
  function spreadAt(h) {
    const f = Math.max(0, Math.min(spread.length - 1, h / 24));
    const i = Math.min(spread.length - 2, Math.floor(f));
    return lerp(spread[i], spread[i + 1], f - i);
  }

  /** Scene units back to real geographic coordinates (inverse projection). */
  function toLatLon(x, z) {
    const lon = anchor.lon + x / (S * 111.32 * Math.cos((anchor.lat * Math.PI) / 180));
    const lat = anchor.lat - z / (S * 110.57);
    return { lat, lon };
  }

  function derive(progress) {
    const p = clamp01(progress);
    const missionTime = p * MISSION_DURATION_H;
    const phaseIndex = phaseIndexAt(p);

    /* ── Vessel: follows the corridor, then blends across to the
          alternative once the re-route is issued (phase 07). ── */
    const u = clamp01(p * 0.94 + 0.03);
    const reroute = smoothstep(0.80, 0.93, p);

    routeCurve.getPointAt(u, _a);
    altCurve.getPointAt(u, _b);
    const vx = lerp(_a.x, _b.x, reroute);
    const vz = lerp(_a.z, _b.z, reroute);

    (reroute > 0.5 ? altCurve : routeCurve).getTangentAt(u, _tan);
    const heading = Math.atan2(_tan.x, _tan.z);

    /* ── Iceberg: real drift track sampled by mission time ── */
    bergCurve.getPointAt(clamp01(missionTime / MISSION_DURATION_H) * 0.34, _a);
    const ix = _a.x;
    const iz = _a.z;

    /* ── Derived readouts ── */
    const sepScene = Math.hypot(vx - ix, vz - iz);
    const distanceKm = sepScene / S;
    const pos = toLatLon(vx, vz);

    return {
      progress: p,
      missionTime,
      phaseIndex,

      vessel: { x: vx, z: vz, heading, reroute },
      iceberg: { x: ix, z: iz, spread: spreadAt(missionTime) },

      risk: sampleKeys(RISK_KEYS, p),
      seaIce: lerp(data.seaIce, data.seaIce + 0.16, smoothstep(0.1, 0.85, p)),
      wind: sampleKeys(WIND_KEYS, p),
      visibility: sampleKeys(VIS_KEYS, p),
      distanceKm,
      lat: pos.lat,
      lon: pos.lon,
      routeStatus: ROUTE_STATUS[phaseIndex],

      // Visibility gates, all smoothly interpolated
      trackerVisible: smoothstep(0.27, 0.34, p),
      envelopeVisible: smoothstep(0.42, 0.50, p),
      routeVisible: smoothstep(0.10, 0.20, p),
      routeDanger: smoothstep(0.56, 0.68, p),
      altReveal: smoothstep(0.70, 0.82, p),
      alertVisible: smoothstep(0.60, 0.65, p) * (1 - smoothstep(0.80, 0.86, p)),
      calcVisible: smoothstep(0.70, 0.74, p) * (1 - smoothstep(0.79, 0.83, p)),

      camera: sampleCamera(p),
    };
  }

  return { derive, routeCurve, altCurve, bergCurve, data, toLatLon };
}

export default createMission;
