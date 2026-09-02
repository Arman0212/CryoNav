/* ═══════════════════════════════════════════════════════════════
   CryoNav Color Scales
   Sea-ice concentration, risk, temperature, depth color ramps
   ═══════════════════════════════════════════════════════════════ */

/**
 * Interpolates between two hex colors.
 * @param {string} color1 - Start hex color
 * @param {string} color2 - End hex color
 * @param {number} t - Interpolation factor 0..1
 * @returns {string} Interpolated hex color
 */
function lerpColor(color1, color2, t) {
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);
  const r = Math.round(((c1 >> 16) & 0xff) * (1 - t) + ((c2 >> 16) & 0xff) * t);
  const g = Math.round(((c1 >> 8) & 0xff) * (1 - t) + ((c2 >> 8) & 0xff) * t);
  const b = Math.round((c1 & 0xff) * (1 - t) + (c2 & 0xff) * t);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/* ── Sea Ice Concentration Ramp (0–100%) ────────────────────── */
const SIC_STOPS = [
  { value: 0,   color: '#001a33' },   // Open water (deep dark blue)
  { value: 15,  color: '#003d70' },
  { value: 30,  color: '#0066cc' },
  { value: 50,  color: '#3399ff' },
  { value: 70,  color: '#66bbff' },
  { value: 85,  color: '#aaddff' },
  { value: 100, color: '#eef6ff' },   // Full ice
];

/**
 * Get color for sea-ice concentration value.
 * @param {number} sic - Sea ice concentration 0–100
 * @param {number} [opacity=0.7] - Alpha value
 * @returns {string} RGBA color string
 */
export function getSicColor(sic, opacity = 0.7) {
  if (sic <= 0) return `rgba(0, 26, 51, ${opacity})`;
  if (sic >= 100) return `rgba(238, 246, 255, ${opacity})`;

  let lower = SIC_STOPS[0];
  let upper = SIC_STOPS[SIC_STOPS.length - 1];

  for (let i = 0; i < SIC_STOPS.length - 1; i++) {
    if (sic >= SIC_STOPS[i].value && sic <= SIC_STOPS[i + 1].value) {
      lower = SIC_STOPS[i];
      upper = SIC_STOPS[i + 1];
      break;
    }
  }

  const t = (sic - lower.value) / (upper.value - lower.value);
  const hex = lerpColor(lower.color, upper.color, t);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/* ── Risk Color Ramp (ANRI 0–100) ───────────────────────────── */
const RISK_STOPS = [
  { value: 0,   color: '#10b981' },   // Low — green
  { value: 25,  color: '#34d399' },
  { value: 50,  color: '#f59e0b' },   // Moderate — amber
  { value: 75,  color: '#f97316' },   // High — orange
  { value: 100, color: '#ef4444' },   // Critical — red
];

/**
 * Get color for risk value (ANRI).
 * @param {number} risk - Risk value 0–100
 * @returns {string} Hex color
 */
export function getRiskColor(risk) {
  if (risk <= 0) return RISK_STOPS[0].color;
  if (risk >= 100) return RISK_STOPS[RISK_STOPS.length - 1].color;

  for (let i = 0; i < RISK_STOPS.length - 1; i++) {
    if (risk >= RISK_STOPS[i].value && risk <= RISK_STOPS[i + 1].value) {
      const t = (risk - RISK_STOPS[i].value) / (RISK_STOPS[i + 1].value - RISK_STOPS[i].value);
      return lerpColor(RISK_STOPS[i].color, RISK_STOPS[i + 1].color, t);
    }
  }
  return RISK_STOPS[RISK_STOPS.length - 1].color;
}

/**
 * Get risk level label and color.
 * @param {number} risk - ANRI value 0–100
 * @returns {{ label: string, color: string }}
 */
export function getRiskLevel(risk) {
  if (risk <= 25) return { label: 'Low', color: '#10b981' };
  if (risk <= 50) return { label: 'Moderate', color: '#f59e0b' };
  if (risk <= 75) return { label: 'High', color: '#f97316' };
  return { label: 'Critical', color: '#ef4444' };
}

/* ── Temperature Color Ramp ─────────────────────────────────── */
const TEMP_STOPS = [
  { value: -50, color: '#1a0533' },   // Extreme cold — deep purple
  { value: -30, color: '#2e1065' },
  { value: -20, color: '#1d4ed8' },
  { value: -10, color: '#3b82f6' },
  { value: 0,   color: '#06b6d4' },
  { value: 10,  color: '#f59e0b' },
  { value: 20,  color: '#ef4444' },
];

/**
 * Get color for temperature value (°C).
 * @param {number} temp - Temperature in Celsius
 * @returns {string} Hex color
 */
export function getTemperatureColor(temp) {
  if (temp <= TEMP_STOPS[0].value) return TEMP_STOPS[0].color;
  if (temp >= TEMP_STOPS[TEMP_STOPS.length - 1].value) return TEMP_STOPS[TEMP_STOPS.length - 1].color;

  for (let i = 0; i < TEMP_STOPS.length - 1; i++) {
    if (temp >= TEMP_STOPS[i].value && temp <= TEMP_STOPS[i + 1].value) {
      const t = (temp - TEMP_STOPS[i].value) / (TEMP_STOPS[i + 1].value - TEMP_STOPS[i].value);
      return lerpColor(TEMP_STOPS[i].color, TEMP_STOPS[i + 1].color, t);
    }
  }
  return TEMP_STOPS[TEMP_STOPS.length - 1].color;
}

/* ── Ocean Depth Color Ramp ─────────────────────────────────── */
const DEPTH_STOPS = [
  { value: 0,    color: '#b4d4e7' },    // Shallow
  { value: 200,  color: '#6baed6' },
  { value: 1000, color: '#3182bd' },
  { value: 3000, color: '#08519c' },
  { value: 5000, color: '#042f6b' },    // Deep
];

/**
 * Get color for ocean depth value (meters).
 * @param {number} depth - Depth in meters (positive downward)
 * @returns {string} Hex color
 */
export function getDepthColor(depth) {
  if (depth <= 0) return DEPTH_STOPS[0].color;
  if (depth >= DEPTH_STOPS[DEPTH_STOPS.length - 1].value) return DEPTH_STOPS[DEPTH_STOPS.length - 1].color;

  for (let i = 0; i < DEPTH_STOPS.length - 1; i++) {
    if (depth >= DEPTH_STOPS[i].value && depth <= DEPTH_STOPS[i + 1].value) {
      const t = (depth - DEPTH_STOPS[i].value) / (DEPTH_STOPS[i + 1].value - DEPTH_STOPS[i].value);
      return lerpColor(DEPTH_STOPS[i].color, DEPTH_STOPS[i + 1].color, t);
    }
  }
  return DEPTH_STOPS[DEPTH_STOPS.length - 1].color;
}

/* ── Wind Speed Color Ramp (m/s) ────────────────────────────── */
/**
 * Get color for wind speed (m/s).
 * @param {number} speed - Wind speed in m/s
 * @returns {string} Hex color
 */
export function getWindColor(speed) {
  if (speed < 5) return '#10b981';    // Calm
  if (speed < 10) return '#34d399';   // Light
  if (speed < 15) return '#f59e0b';   // Moderate
  if (speed < 25) return '#f97316';   // Strong
  if (speed < 35) return '#ef4444';   // Gale
  return '#991b1b';                   // Storm
}
