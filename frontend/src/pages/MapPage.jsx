/* ═══════════════════════════════════════════════════════════════
   Map Page — Real Leaflet map wired to live backend data.

   Two projections:
     • Mercator (EPSG:3857) — the keyless Esri/OSM basemaps. Familiar,
       but it cannot draw the pole and badly distorts the CryoNav
       domain (everything south of ~60°S).
     • Polar (EPSG:3031) — NASA GIBS tiles in Antarctic Polar
       Stereographic, the projection the science data actually uses.
       See utils/antarcticCrs.js for the tile grid.

   MapContainer cannot change its `crs` after mount, so switching
   projection remounts it via `key`.

   Wired layers: Stations (static, from constants), Icebergs (GET
   /bergs), Routes (last POST /route result from useRouteStore).
   Sea Ice is available as a real observational overlay in polar mode
   (GIBS AMSR2); the model's own SIC field still has no backend route.
   Weather, Ocean Currents, Risk Zones, Vessels and Bathymetry have no
   backing data — those checkboxes are shown disabled rather than
   silently doing nothing.
   ═══════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, Polyline, Tooltip } from 'react-leaflet';
import { Layers, Globe } from 'lucide-react';
import useAppStore from '@stores/useAppStore';
import useMapStore from '@stores/useMapStore';
import useRouteStore from '@stores/useRouteStore';
import { useIcebergs } from '@hooks/useIcebergs';
import { useGrid } from '@hooks/useGrid';
import { useObserved } from '@hooks/useObserved';
import { useForecast } from '@hooks/useForecast';
import { useLiveBergs } from '@hooks/useProvenance';
import { useOcean, useWeather } from '@hooks/useOcean';
import { useConfig } from '@hooks/useConfig';
import SicCanvasLayer, { sicColor, diffColor } from '@components/map/SicCanvasLayer';
import IcebergLayer from '@components/map/IcebergLayer';
import BathymetryLayer from '@components/map/BathymetryLayer';
import LiveIcebergLayer from '@components/map/LiveIcebergLayer';
import MapControls from '@components/map/MapControls';
import PlaceMarkers from '@components/map/PlaceMarkers';
import VectorFieldLayer from '@components/map/VectorFieldLayer';
import MapLegend from '@components/map/MapLegend';
import CoordinateChips from '@components/map/CoordinateChips';
import '@styles/map-layers.css';
import {
  MAP_DEFAULTS, RESEARCH_STATIONS, DEPARTURE_PORTS, MAP_LAYERS, BASEMAPS,
  POLAR_BASEMAPS, POLAR_OVERLAYS, GIBS_ATTRIBUTION,
  DOMAIN_BOUNDS, ANTARCTIC_CIRCLE_RADIUS_M,
  gibsTileUrl, clampGibsDate,
} from '@utils/constants';
import { EPSG3031, GIBS_TILE_SIZE, GIBS_MAX_ZOOM } from '@utils/antarcticCrs';
import { formatDistance, formatDuration } from '@utils/formatters';

/* Layers with a real backend data source behind them. Sea ice joined this
   set once GET /grid arrived — the grid geometry it needs used to be
   buried in each /forecast response. */
const LIVE_LAYER_IDS = new Set([
  'icebergs', 'trajectories', 'routes', 'stations',
  'seaIce', 'seaIceForecast', 'bathymetry',
  'oceanCurrents', 'weather',
]);

const ROUTE_COLORS = {
  great_circle: '#6d3fd4',
  min_ice: '#0f7a53',
  min_time: '#c2570b',
  balanced: '#1668c9',
  persistence_route: '#c62828',
};

/* Per-projection map view.

   Polar sits on the pole. Zoom is fractional (proj4leaflet interpolates
   between the GIBS resolutions). The framing target is the whole
   continent including the Antarctic Peninsula, which reaches ~3050 km
   from the pole — z1 crops it badly and z0.5 still clips it, while z0
   leaves wide empty margins beside the 8389 km grid. z0.25 gives
   ±3015 km of vertical reach against a 8611 km horizontal span, so the
   domain fills the frame with only a sliver of grid edge showing. */
const VIEWS = {
  mercator: { center: MAP_DEFAULTS.center, zoom: MAP_DEFAULTS.zoom, minZoom: MAP_DEFAULTS.minZoom, zoomSnap: 1 },
  polar: { center: [-90, 0], zoom: 0.25, minZoom: 0, zoomSnap: 0.25 },
};

/** A GIBS raster, sized to whatever depth its TileMatrixSet actually has. */
function GibsLayer({ spec, date, ...rest }) {
  return (
    <TileLayer
      url={gibsTileUrl(spec, date)}
      attribution={GIBS_ATTRIBUTION}
      tileSize={GIBS_TILE_SIZE}
      minZoom={0}
      maxZoom={GIBS_MAX_ZOOM['250m']}
      maxNativeZoom={GIBS_MAX_ZOOM[spec.tms]}
      noWrap
      {...rest}
    />
  );
}

export default function MapPage() {
  const selectedDate = useAppStore((s) => s.selectedDate);
  const { layers, toggleLayer } = useMapStore();
  const routeResult = useRouteStore((s) => s.routes);
  const setOrigin = useRouteStore((s) => s.setOrigin);
  const setDestination = useRouteStore((s) => s.setDestination);
  const [showLiveBergs, setShowLiveBergs] = useState(false);

  /* ── Scrub state ── */
  const [leadDay, setLeadDay] = useState(7);
  const [bergHorizon, setBergHorizon] = useState(7);
  const [sicMode, setSicMode] = useState('observed');
  const [playing, setPlaying] = useState(false);

  const { data: bergs } = useIcebergs(selectedDate, bergHorizon);

  /* Grid geometry is fetched once and reused by every raster layer.
     Fields are only requested when something actually needs them, so
     toggling layers doesn't pull megabytes nobody is looking at. */
  const { data: grid } = useGrid();
  const sicOn = layers.seaIce || layers.seaIceForecast;

  const wantForecast = sicOn && (sicMode === 'forecast' || sicMode === 'difference');
  const forecast = useForecast(wantForecast ? selectedDate : null, leadDay);

  /* Observed is needed either on its own, or at the forecast's VALID date
     so the difference compares like with like rather than the field the
     forecast was initialised from. */
  const validDate = forecast.data?.stats?.valid_date;
  const observedDate = sicMode === 'difference' ? validDate : selectedDate;
  const observed = useObserved(sicOn && observedDate ? observedDate : null);

  /* forecast − observed, both at the valid date. Positive = the model has
     more ice than reality; negative = less. */
  const diffField = useMemo(() => {
    if (sicMode !== 'difference') return null;
    const f = forecast.data?.sic;
    const o = observed.data?.sic;
    if (!f || !o) return null;
    return f.map((row, y) => row.map((v, x) => v - (o[y]?.[x] ?? 0)));
  }, [sicMode, forecast.data, observed.data]);

  /* Real CMEMS currents and ERA5 wind, fetched only when their layer is on. */
  const ocean = useOcean(layers.oceanCurrents ? selectedDate : null, 6);
  const weather = useWeather(layers.weather ? selectedDate : null, 6);

  const liveBergs = useLiveBergs();
  const { data: config } = useConfig();

  /* Opens in Mercator on satellite imagery, matching the bundled web/
     client. Polar stereographic stays one click away for looking at the
     data in its native projection. */
  const [projection, setProjection] = useState('mercator');
  const [basemapId, setBasemapId] = useState(MAP_DEFAULTS.basemap);
  const [polarBasemapId, setPolarBasemapId] = useState('blue_marble');
  const [polarOverlays, setPolarOverlays] = useState({ seaIce: true, coastlines: true, graticule: false });

  const isPolar = projection === 'polar';
  const basemap = BASEMAPS[basemapId] || BASEMAPS[MAP_DEFAULTS.basemap];
  const polarBasemap = POLAR_BASEMAPS[polarBasemapId] || POLAR_BASEMAPS.blue_marble;
  const view = VIEWS[projection];

  /* Sea ice is only a real layer in polar mode, where GIBS supplies it. */
  const seaIceDate = clampGibsDate(selectedDate, POLAR_OVERLAYS.seaIce.available);

  const routePaths = useMemo(() => {
    if (!routeResult?.routes) return [];
    return Object.entries(routeResult.routes)
      .filter(([, r]) => r.success && r.path_latlon?.length)
      .map(([key, r]) => ({ key, name: r.profile_name, path: r.path_latlon, color: ROUTE_COLORS[key] || '#1668c9' }));
  }, [routeResult]);

  return (
    <div className="map-workspace">
      {/* Controls — fixed column, like the bundled client's left panel.
          Nothing here floats over the map, so nothing can collide. */}
      <aside className="map-panel map-panel-left">
      <div className="map-panel-section">
        <h3><Globe size={12} /> Projection</h3>
        <select
          value={projection}
          onChange={(e) => setProjection(e.target.value)}
          style={{ width: '100%', marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-xs)' }}
        >
          <option value="polar">Polar Stereographic (EPSG:3031)</option>
          <option value="mercator">Web Mercator (EPSG:3857)</option>
        </select>

        <h3><Layers size={12} /> Basemap</h3>
        {isPolar ? (
          <select
            value={polarBasemapId}
            onChange={(e) => setPolarBasemapId(e.target.value)}
            style={{ width: '100%', marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-xs)' }}
          >
            {Object.entries(POLAR_BASEMAPS).map(([id, b]) => (
              <option key={id} value={id}>{b.label}</option>
            ))}
          </select>
        ) : (
          <select
            value={basemapId}
            onChange={(e) => setBasemapId(e.target.value)}
            style={{ width: '100%', marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-xs)' }}
          >
            {Object.entries(BASEMAPS).map(([id, b]) => (
              <option key={id} value={id}>{b.label}</option>
            ))}
          </select>
        )}

        {isPolar && (
          <>
            <h3><Layers size={12} /> NASA GIBS Overlays</h3>
            {Object.entries(POLAR_OVERLAYS).map(([id, o]) => (
              <label key={id} className={`map-layer-item ${polarOverlays[id] ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={Boolean(polarOverlays[id])}
                  onChange={() => setPolarOverlays((p) => ({ ...p, [id]: !p[id] }))}
                />
                <span>{o.label}</span>
              </label>
            ))}
            {polarOverlays.seaIce && seaIceDate.clamped && (
              <p style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', margin: 'var(--space-2) 0 0' }}>
                Sea ice shown for {seaIceDate.date} — AMSR2 does not cover {selectedDate}.
              </p>
            )}
          </>
        )}

        <h3 style={{ marginTop: 'var(--space-3)' }}><Layers size={12} /> Data Layers</h3>
        {Object.values(MAP_LAYERS).map((layer) => {
          const live = LIVE_LAYER_IDS.has(layer.id);
          return (
            <label key={layer.id} className={`map-layer-item ${layers[layer.id] ? 'active' : ''}`} style={{ opacity: live ? 1 : 0.45 }} title={live ? undefined : 'No backend data source for this layer yet'}>
              <input
                type="checkbox"
                checked={Boolean(layers[layer.id])}
                disabled={!live}
                onChange={() => toggleLayer(layer.id)}
                style={{ accentColor: layer.color }}
              />
              <span className="map-layer-color" style={{ background: layer.color }} />
              <span>{layer.label}{!live && ' (no backend)'}</span>
            </label>
          );
        })}

        {/* Observed berg feed, kept separate from the modelled bergs so the
            distinction between measurement and prediction stays visible. */}
        <label className={`map-layer-item ${showLiveBergs ? 'active' : ''}`} title="US National Ice Center weekly bulletin">
          <input
            type="checkbox"
            checked={showLiveBergs}
            onChange={() => setShowLiveBergs((v) => !v)}
            style={{ accentColor: '#c2410c' }}
          />
          <span className="map-layer-color" style={{ background: '#c2410c' }} />
          <span>Icebergs (NIC observed)</span>
        </label>
        {showLiveBergs && liveBergs.isError && (
          <p style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', margin: 'var(--space-2) 0 0' }}>
            Live NIC feed unavailable.
          </p>
        )}
      </div>


      <MapControls
        leadDay={leadDay} setLeadDay={setLeadDay}
        bergHorizon={bergHorizon} setBergHorizon={setBergHorizon}
        sicMode={sicMode} setSicMode={setSicMode}
        playing={playing} setPlaying={setPlaying}
        validDate={validDate}
        forecastSource={forecast.data?.source}
      />

      </aside>

      <div className="map-canvas-wrap">
      <MapContainer
        key={projection}
        /* Must name EPSG3857 explicitly: Leaflet's setOptions copies an
           explicit `undefined` over its own default, leaving the map with
           no CRS at all and throwing inside project(). */
        crs={isPolar ? EPSG3031 : L.CRS.EPSG3857}
        center={view.center}
        zoom={view.zoom}
        minZoom={view.minZoom}
        zoomSnap={view.zoomSnap}
        maxZoom={isPolar ? GIBS_MAX_ZOOM['250m'] : (basemap.maxZoom ?? MAP_DEFAULTS.maxZoom)}
        /* Stop the world repeating sideways forever. Leaflet tiles wrap by
           default, which in Mercator gave endless copies of Antarctica and
           made pan feel bottomless. maxBounds pins the view to the southern
           ocean; the viscosity makes the edge push back rather than snap. */
        maxBounds={isPolar ? undefined : MAP_DEFAULTS.maxBounds}
        maxBoundsViscosity={isPolar ? 0 : 0.25}
        worldCopyJump={false}
        style={{ width: '100%', height: '100%', background: 'var(--color-bg-primary)' }}
      >
        {isPolar ? (
          <>
            <GibsLayer key={polarBasemapId} spec={polarBasemap} date={selectedDate} />
            {polarOverlays.seaIce && (
              <GibsLayer spec={POLAR_OVERLAYS.seaIce} date={selectedDate} opacity={POLAR_OVERLAYS.seaIce.opacity} />
            )}
            {polarOverlays.coastlines && (
              <GibsLayer spec={POLAR_OVERLAYS.coastlines} date={selectedDate} opacity={POLAR_OVERLAYS.coastlines.opacity} />
            )}
            {polarOverlays.graticule && (
              <GibsLayer spec={POLAR_OVERLAYS.graticule} date={selectedDate} opacity={POLAR_OVERLAYS.graticule.opacity} />
            )}
          </>
        ) : (
          <TileLayer
            key={basemapId}
            url={basemap.url}
            attribution={basemap.attribution}
            maxZoom={basemap.maxZoom ?? MAP_DEFAULTS.maxZoom}
            opacity={basemap.opacity ?? 1}
            noWrap   /* one Earth, not an infinite strip of them */
          />
        )}

        <CoordinateChips projection={projection} gridShape={grid?.shape} />

        {/* Reference geometry: the Antarctic Circle, and the box the model
            actually covers so it's obvious where the data stops. */}
        <Circle
          center={[-90, 0]}
          radius={ANTARCTIC_CIRCLE_RADIUS_M}
          pathOptions={{
            color: 'rgba(11, 127, 168, 0.30)', weight: 1, dashArray: '8 4',
            fillColor: 'rgba(11, 127, 168, 0.04)', fillOpacity: 1,
          }}
          interactive={false}
        />
        <Polyline
          positions={DOMAIN_BOUNDS}
          pathOptions={{ color: 'rgba(11, 127, 168, 0.45)', weight: 1, dashArray: '4 4' }}
          interactive={false}
        >
          <Tooltip sticky>CryoNav domain · 20°W–120°E, 50°S–78°S</Tooltip>
        </Polyline>

        {/* Bathymetry sits under everything else — it's context, not data
            you read values off. */}
        {layers.bathymetry && grid?.bathy && <BathymetryLayer grid={grid} />}

        {/* Model SIC field: observed, forecast, or the difference between
            them. Difference is the honest view — it shows where the model
            is wrong rather than only what it predicted. */}
        {sicOn && grid && sicMode === 'difference' && diffField && (
          <SicCanvasLayer sic={diffField} grid={grid} colorFn={diffColor} />
        )}
        {sicOn && grid && sicMode === 'forecast' && forecast.data?.sic && (
          <SicCanvasLayer sic={forecast.data.sic} grid={grid} colorFn={sicColor} />
        )}
        {sicOn && grid && sicMode === 'observed' && observed.data?.sic && (
          <SicCanvasLayer sic={observed.data.sic} grid={grid} colorFn={sicColor} />
        )}

        {/* Stations and ports, with their names permanently on the map. */}
        {layers.stations && (
          <PlaceMarkers
            stations={RESEARCH_STATIONS}
            ports={DEPARTURE_PORTS}
            config={config}
            onOrigin={(p) => setOrigin({ id: p.id, name: p.name, lat: p.lat, lon: p.lon })}
            onDestination={(p) => setDestination({ id: p.id, name: p.name, lat: p.lat, lon: p.lon })}
          />
        )}

        {/* Modelled bergs: day-0 positions, and — when trajectories are on —
            drift tracks, projected endpoints and the ensemble envelope. */}
        {layers.icebergs && bergs?.length > 0 && (
          <IcebergLayer bergs={bergs} horizon={bergHorizon} showTracks={Boolean(layers.trajectories)} />
        )}

        {/* Real CMEMS surface currents and ERA5 wind, as vector fields. */}
        {layers.oceanCurrents && ocean.data?.vectors && (
          <VectorFieldLayer vectors={ocean.data.vectors} color="#6d28d9" scale={26} />
        )}
        {layers.weather && weather.data?.vectors && (
          <VectorFieldLayer vectors={weather.data.vectors} color="#b45309" scale={20} />
        )}

        {/* Observed NIC positions, deliberately distinct from the modelled ones. */}
        {showLiveBergs && liveBergs.data && <LiveIcebergLayer data={liveBergs.data} />}

        {layers.routes && routePaths.map(({ key, name, path, color }) => (
          <Polyline key={key} positions={path} pathOptions={{ color, weight: 3 }}>
            <Tooltip sticky>{name}</Tooltip>
          </Polyline>
        ))}
      </MapContainer>
      </div>

      {/* Results — route metrics and legend, in their own column. */}
      <aside className="map-panel map-panel-right">
        {routePaths.length > 0 && (
        <div className="map-rail-panel">
          <h3>Routes</h3>
          {routeResult.comparison?.table?.filter((r) => r.success).map((r) => (
            <div key={r.key} style={{ fontSize: 'var(--font-size-xs)', display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', padding: '2px 0' }}>
              <span style={{ color: ROUTE_COLORS[r.key] || '#1668c9' }}>{r.profile}</span>
              <span className="text-mono">{formatDistance(r.distance_nm)} · {formatDuration(r.time_h)}</span>
            </div>
          ))}
        </div>
        )}
        <MapLegend />
      </aside>
    </div>
  );
}