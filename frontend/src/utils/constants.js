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
/* Framing matches the bundled web/ client, which opens on the Indian-Ocean
   sector of the domain over Esri satellite imagery rather than on the pole.
   That view reads immediately as "Antarctic coast" where a polar projection
   centred on 90°S mostly shows empty ice. */
export const MAP_DEFAULTS = {
  center: [-65, 50],
  zoom: 3,
  minZoom: 2,
  maxZoom: 8,
  maxBounds: [[-90, -180], [-40, 180]],
  basemap: 'esri_imagery',
};

/* The domain the model actually covers: 20°W–120°E, 50°S–78°S.
   Drawn as a dashed boundary so it's clear where data stops. */
export const DOMAIN_BOUNDS = [
  [-50, -20], [-50, 120], [-78, 120], [-78, -20], [-50, -20],
];

/** Antarctic Circle, drawn as a reference ring from the pole. */
export const ANTARCTIC_CIRCLE_RADIUS_M = 2600000;

/* ── Basemaps ───────────────────────────────────────────────────
   CARTO's basemaps.cartocdn.com tiles now require an API key and
   render a "API KEY REQUIRED" watermark without one, so the default
   moved to Esri's ArcGIS Online services, which are keyless.

   All of these are Web Mercator (EPSG:3857), which badly distorts
   Antarctica and cannot show the pole itself. For a true polar view
   see the EPSG:3031 notes in MapPage.jsx.
   ─────────────────────────────────────────────────────────────── */
export const BASEMAPS = {
  esri_imagery: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics, USDA, USGS, AeroGRID, IGN',
    maxZoom: 17,
    opacity: 0.95,
  },
  esri_ocean: {
    label: 'Ocean',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri, GEBCO, NOAA, National Geographic, DeLorme, HERE',
    maxZoom: 13,
    opacity: 0.92,
  },
  esri_dark: {
    label: 'Dark Gray',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16,
    opacity: 0.85,
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

/* ── Antarctic Research Stations ──────────────────────────────
   The same roster the bundled web/ client carries, so both maps show
   the same outposts. `flag` and `operator` drive the permanent map
   label and its popup. */
export const RESEARCH_STATIONS = [
  { id: 'bharati', name: 'Bharati', operator: 'India (NCPOR)', country: 'India', flag: '🇮🇳', lat: -69.40, lon: 76.20 },
  { id: 'maitri', name: 'Maitri', operator: 'India (NCPOR)', country: 'India', flag: '🇮🇳', lat: -70.00, lon: 11.50 },
  { id: 'mcmurdo', name: 'McMurdo', operator: 'USA (USAP)', country: 'USA', flag: '🇺🇸', lat: -77.85, lon: 166.67 },
  { id: 'zucchelli', name: 'Zucchelli', operator: 'Italy (PNRA)', country: 'Italy', flag: '🇮🇹', lat: -74.69, lon: 164.12 },
  { id: 'davis', name: 'Davis', operator: 'Australia (AAD)', country: 'Australia', flag: '🇦🇺', lat: -68.58, lon: 77.97 },
  { id: 'casey', name: 'Casey', operator: 'Australia (AAD)', country: 'Australia', flag: '🇦🇺', lat: -66.28, lon: 110.53 },
  { id: 'mawson', name: 'Mawson', operator: 'Australia (AAD)', country: 'Australia', flag: '🇦🇺', lat: -67.60, lon: 62.87 },
  { id: 'mirny', name: 'Mirny', operator: 'Russia (AARI)', country: 'Russia', flag: '🇷🇺', lat: -66.55, lon: 93.02 },
  { id: 'zhongshan', name: 'Zhongshan', operator: 'China (PRIC)', country: 'China', flag: '🇨🇳', lat: -69.37, lon: 76.38 },
  { id: 'neumayer', name: 'Neumayer III', operator: 'Germany (AWI)', country: 'Germany', flag: '🇩🇪', lat: -70.67, lon: -8.27 },
  { id: 'troll', name: 'Troll', operator: 'Norway (NPI)', country: 'Norway', flag: '🇳🇴', lat: -72.01, lon: 2.53 },
  { id: 'syowa', name: 'Syowa', operator: 'Japan (NIPR)', country: 'Japan', flag: '🇯🇵', lat: -69.00, lon: 39.58 },
  { id: 'rothera', name: 'Rothera', operator: 'UK (BAS)', country: 'UK', flag: '🇬🇧', lat: -67.57, lon: -68.13 },
  { id: 'palmer', name: 'Palmer', operator: 'USA (USAP)', country: 'USA', flag: '🇺🇸', lat: -64.77, lon: -64.05 },
  { id: 'halley', name: 'Halley VI', operator: 'UK (BAS)', country: 'UK', flag: '🇬🇧', lat: -75.58, lon: -26.20 },
  { id: 'esperanza', name: 'Esperanza', operator: 'Argentina (IAA)', country: 'Argentina', flag: '🇦🇷', lat: -63.40, lon: -56.98 },
];

/* ── Departure ports / staging waypoints ──────────────────────
   Where a resupply voyage actually starts from. Distinct from the
   stations above, and drawn in a different colour on the map. */
export const DEPARTURE_PORTS = [
  { id: 'cape_town', name: 'Cape Town', country: 'South Africa', icon: '⚓', lat: -33.92, lon: 18.42 },
  { id: 'hobart', name: 'Hobart', country: 'Australia', icon: '⚓', lat: -42.88, lon: 147.33 },
  { id: 'christchurch', name: 'Christchurch', country: 'New Zealand', icon: '⚓', lat: -43.60, lon: 172.72 },
  { id: 'ushuaia', name: 'Ushuaia', country: 'Argentina', icon: '⚓', lat: -54.80, lon: -68.30 },
  { id: 'punta_arenas', name: 'Punta Arenas', country: 'Chile', icon: '⚓', lat: -53.16, lon: -70.91 },
  { id: 'fremantle', name: 'Fremantle', country: 'Australia', icon: '⚓', lat: -32.05, lon: 115.74 },
  { id: 'mid_ocean_waypoint', name: 'Mid-Ocean WP', country: '55°S 76°E', icon: '📍', lat: -55.00, lon: 76.00 },
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
