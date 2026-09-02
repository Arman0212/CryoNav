/* ═══════════════════════════════════════════════════════════════
   CryoNav Constants
   ═══════════════════════════════════════════════════════════════ */

/**
 * Base URL for the CryoNav API.
 * The real backend (Arman0212/CryoNav, src/api/main.py) mounts every route
 * at the root — e.g. GET /forecast, POST /route — with no /api or version
 * prefix, and it sends allow_origins=["*"], so we hit it directly rather
 * than through the Vite dev-server proxy.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * WebSocket URL.
 * NOTE: the real backend currently exposes no WebSocket route at all —
 * this is aspirational wiring for a future live-update channel. Until the
 * backend adds one, websocketService will just retry and fail silently.
 */
export const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`;

/* ── Map Defaults ───────────────────────────────────────────── */
export const MAP_DEFAULTS = {
  center: [-75, 0],          // South Pole region
  zoom: 3,
  minZoom: 2,
  maxZoom: 12,
  maxBounds: [[-90, -180], [-50, 180]],
  basemap: 'esri_ocean',
};

/* ── Basemaps ───────────────────────────────────────────────────
   CARTO's basemaps.cartocdn.com tiles now require an API key and
   render a "API KEY REQUIRED" watermark without one, so the default
   moved to Esri's ArcGIS Online services, which are keyless.

   All of these are Web Mercator (EPSG:3857), which badly distorts
   Antarctica and cannot show the pole itself. For a true polar view
   see the EPSG:3031 notes in MapPage.jsx.
   ─────────────────────────────────────────────────────────────── */
export const BASEMAPS = {
  esri_dark: {
    label: 'Esri Dark Gray',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a> | CryoNav',
    maxZoom: 12,
  },
  esri_ocean: {
    label: 'Esri Ocean',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, GEBCO, NOAA | CryoNav',
    maxZoom: 10,
  },
  esri_imagery: {
    label: 'Esri Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics | CryoNav',
    maxZoom: 12,
  },
  osm: {
    label: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | CryoNav',
    maxZoom: 12,
  },
};

/* ── NASA GIBS — polar-stereographic (EPSG:3031) tiles ──────────
   Keyless WMTS. Unlike the Mercator basemaps above these are drawn in
   the projection the data actually lives in, so Antarctica keeps its
   shape and the pole is reachable.

   `temporal` layers take a date in the URL and only cover a finite
   window — requesting a date outside it returns 404, so callers must
   clamp with clampGibsDate() below. `end: null` means "through today".
   ─────────────────────────────────────────────────────────────── */
export const GIBS_ENDPOINT = 'https://gibs.earthdata.nasa.gov/wmts/epsg3031/best';

export const POLAR_BASEMAPS = {
  blue_marble: {
    label: 'Blue Marble + Bathymetry',
    layer: 'BlueMarble_ShadedRelief_Bathymetry',
    tms: '500m',
    ext: 'jpeg',
    temporal: false,
  },
  modis_terra: {
    label: 'MODIS Terra True Color',
    layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    tms: '250m',
    ext: 'jpg',
    temporal: true,
    available: { start: '2000-02-24', end: null },
  },
  modis_aqua: {
    label: 'MODIS Aqua True Color',
    layer: 'MODIS_Aqua_CorrectedReflectance_TrueColor',
    tms: '250m',
    ext: 'jpg',
    temporal: true,
    available: { start: '2002-07-03', end: null },
  },
};

/* Overlays drawn on top of the polar basemap. */
export const POLAR_OVERLAYS = {
  seaIce: {
    label: 'Sea Ice Concentration (AMSR2)',
    layer: 'AMSRU2_Sea_Ice_Concentration_12km',
    tms: '1km',
    ext: 'png',
    temporal: true,
    opacity: 0.7,
    // AMSR2 stops well short of "today"; the app's date defaults to today.
    available: { start: '2012-07-02', end: '2025-09-01' },
  },
  coastlines: {
    label: 'Coastlines',
    layer: 'Coastlines',
    tms: '250m',
    ext: 'png',
    temporal: false,
    opacity: 0.9,
  },
  graticule: {
    label: 'Graticule',
    layer: 'Graticule',
    tms: '250m',
    ext: 'png',
    temporal: false,
    opacity: 0.5,
  },
};

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Clamp an ISO date into a GIBS layer's availability window.
 * Returns the date to request plus whether it had to be moved, so the
 * UI can say it is showing something other than the selected date.
 */
export function clampGibsDate(date, available) {
  if (!available) return { date, clamped: false };
  const end = available.end || today();
  if (date < available.start) return { date: available.start, clamped: true };
  if (date > end) return { date: end, clamped: true };
  return { date, clamped: false };
}

/** Build a Leaflet URL template for a GIBS layer at a given date. */
export function gibsTileUrl(spec, date) {
  const time = spec.temporal ? `${clampGibsDate(date, spec.available).date}/` : '';
  return `${GIBS_ENDPOINT}/${spec.layer}/default/${time}${spec.tms}/{z}/{y}/{x}.${spec.ext}`;
}

export const GIBS_ATTRIBUTION =
  'Imagery &copy; <a href="https://worldview.earthdata.nasa.gov/">NASA EOSDIS GIBS</a> | CryoNav';

/* ── Antarctic Research Stations ────────────────────────────── */
export const RESEARCH_STATIONS = [
  { id: 'maitri', name: 'Maitri', lat: -70.7667, lon: 11.7333, country: 'India' },
  { id: 'bharati', name: 'Bharati', lat: -69.4067, lon: 76.1944, country: 'India' },
  { id: 'mcmurdo', name: 'McMurdo', lat: -77.8460, lon: 166.6682, country: 'USA' },
  { id: 'casey', name: 'Casey', lat: -66.2823, lon: 110.5278, country: 'Australia' },
  { id: 'davis', name: 'Davis', lat: -68.5765, lon: 77.9674, country: 'Australia' },
  { id: 'rothera', name: 'Rothera', lat: -67.5700, lon: -68.1300, country: 'UK' },
  { id: 'neumayer', name: 'Neumayer III', lat: -70.6750, lon: -8.2740, country: 'Germany' },
  { id: 'syowa', name: 'Syowa', lat: -69.0067, lon: 39.5900, country: 'Japan' },
  { id: 'zhongshan', name: 'Zhongshan', lat: -69.3733, lon: 76.3667, country: 'China' },
  { id: 'scott_base', name: 'Scott Base', lat: -77.8509, lon: 166.7660, country: 'New Zealand' },
];

/* ── Map Layers ─────────────────────────────────────────────── */
export const MAP_LAYERS = {
  SEA_ICE: { id: 'seaIce', label: 'Sea Ice (Observed)', color: '#1668c9', defaultOn: true },
  SEA_ICE_FORECAST: { id: 'seaIceForecast', label: 'Sea Ice (Forecast)', color: '#c2570b', defaultOn: false },
  ICEBERGS: { id: 'icebergs', label: 'Icebergs', color: '#0b7fa8', defaultOn: true },
  TRAJECTORIES: { id: 'trajectories', label: 'Iceberg Trajectories', color: '#c2410c', defaultOn: true },
  ROUTES: { id: 'routes', label: 'Routes', color: '#1d4ed8', defaultOn: true },
  RISK_ZONES: { id: 'riskZones', label: 'Risk Zones', color: '#c62828', defaultOn: false },
  WEATHER: { id: 'weather', label: 'Weather', color: '#b45309', defaultOn: false },
  OCEAN_CURRENTS: { id: 'oceanCurrents', label: 'Ocean Currents', color: '#0f7a6a', defaultOn: false },
  VESSELS: { id: 'vessels', label: 'Vessels', color: '#6d3fd4', defaultOn: true },
  // was #e8edf5 — a near-white swatch is invisible on the light ground
  STATIONS: { id: 'stations', label: 'Research Stations', color: '#334c66', defaultOn: true },
  BATHYMETRY: { id: 'bathymetry', label: 'Bathymetry', color: '#1e3a5f', defaultOn: false },
};

/* ── Route Types ────────────────────────────────────────────── */
export const ROUTE_TYPES = {
  SHORTEST: { id: 'shortest', label: 'Shortest', color: '#4a9eff' },
  SAFEST: { id: 'safest', label: 'Safest', color: '#10b981' },
  FUEL_EFFICIENT: { id: 'fuel', label: 'Fuel-Efficient', color: '#f59e0b' },
  BALANCED: { id: 'balanced', label: 'AI-Balanced', color: '#8b5cf6' },
};

/* ── Risk Levels ────────────────────────────────────────────── */
export const RISK_LEVELS = {
  LOW: { min: 0, max: 25, label: 'Low', color: '#10b981' },
  MODERATE: { min: 26, max: 50, label: 'Moderate', color: '#f59e0b' },
  HIGH: { min: 51, max: 75, label: 'High', color: '#f97316' },
  CRITICAL: { min: 76, max: 100, label: 'Critical', color: '#ef4444' },
};

/* ── Alert Severities ───────────────────────────────────────── */
export const ALERT_SEVERITIES = {
  INFO: { id: 'info', label: 'Info', color: '#3b82f6' },
  WARNING: { id: 'warning', label: 'Warning', color: '#f59e0b' },
  CRITICAL: { id: 'critical', label: 'Critical', color: '#ef4444' },
};

/* ── WebSocket Channels ─────────────────────────────────────── */
export const WS_CHANNELS = {
  VESSEL_POSITION: 'vessel.position',
  ICEBERGS_UPDATE: 'icebergs.update',
  ICEBERGS_TRAJECTORY: 'icebergs.trajectory',
  RISK_CHANGE: 'risk.change',
  ROUTE_REROUTE: 'route.reroute',
  ALERTS_NEW: 'alerts.new',
  SIMULATION_TICK: 'simulation.tick',
};

/* ── Vessel Types (POLARIS) ─────────────────────────────────── */
export const VESSEL_TYPES = {
  PC1: { id: 'PC1', label: 'PC1 — Icebreaker', polarClass: 1 },
  PC5: { id: 'PC5', label: 'PC5 — Moderate Ice', polarClass: 5 },
  PC7: { id: 'PC7', label: 'PC7 — Thin First-Year Ice', polarClass: 7 },
  IA: { id: 'IA', label: 'IA — Ice Class', polarClass: null },
  OPEN_WATER: { id: 'OPEN_WATER', label: 'Open Water Vessel', polarClass: null },
};

/* ── Simulation Time Steps ──────────────────────────────────── */
export const SIMULATION_STEPS = [
  { label: 'T-48H', hours: -48 },
  { label: 'T-24H', hours: -24 },
  { label: 'T-12H', hours: -12 },
  { label: 'T-6H', hours: -6 },
  { label: 'NOW', hours: 0 },
  { label: 'T+6H', hours: 6 },
  { label: 'T+12H', hours: 12 },
  { label: 'T+24H', hours: 24 },
  { label: 'T+48H', hours: 48 },
];

/* ── Data Sources ───────────────────────────────────────────── */
export const DATA_SOURCES = {
  NSIDC: { id: 'nsidc', name: 'NSIDC-0051', type: 'Sea Ice', org: 'NSIDC' },
  ERA5: { id: 'era5', name: 'ERA5', type: 'Atmospheric', org: 'ECMWF' },
  CMEMS: { id: 'cmems', name: 'CMEMS', type: 'Ocean', org: 'Copernicus' },
  BYU_NIC: { id: 'byu_nic', name: 'BYU/NIC', type: 'Icebergs', org: 'BYU / NIC' },
};
