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
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Tooltip } from 'react-leaflet';
import { Layers, Globe } from 'lucide-react';
import useAppStore from '@stores/useAppStore';
import useMapStore from '@stores/useMapStore';
import useRouteStore from '@stores/useRouteStore';
import { useIcebergs } from '@hooks/useIcebergs';
import {
  MAP_DEFAULTS, RESEARCH_STATIONS, MAP_LAYERS, BASEMAPS,
  POLAR_BASEMAPS, POLAR_OVERLAYS, GIBS_ATTRIBUTION,
  gibsTileUrl, clampGibsDate,
} from '@utils/constants';
import { EPSG3031, GIBS_TILE_SIZE, GIBS_MAX_ZOOM } from '@utils/antarcticCrs';
import { formatDistance, formatDuration } from '@utils/formatters';

const LIVE_LAYER_IDS = new Set(['icebergs', 'routes', 'stations']);

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

  const { data: bergs } = useIcebergs(selectedDate, 7);

  const [projection, setProjection] = useState('polar');
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
    <div className="map-page" style={{ height: 'calc(100vh - var(--topbar-height) - var(--statusbar-height))', position: 'relative' }}>
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
          />
        )}

        {layers.stations && RESEARCH_STATIONS.map((s) => (
          <CircleMarker key={s.id} center={[s.lat, s.lon]} radius={6} pathOptions={{ color: MAP_LAYERS.STATIONS.color, fillOpacity: 0.8 }}>
            <Tooltip>{s.name} ({s.country})</Tooltip>
          </CircleMarker>
        ))}

        {layers.icebergs && bergs?.map((berg) => {
          const track = berg.mean_track || [];
          const [, lat, lon] = track[0] || [];
          if (lat === undefined) return null;
          const radius = Math.max(4, Math.min(14, Math.sqrt(berg.length_m * berg.width_m) / 100));
          return (
            <CircleMarker key={berg.berg_id} center={[lat, lon]} radius={radius} pathOptions={{ color: MAP_LAYERS.ICEBERGS.color, fillOpacity: 0.6 }}>
              <Popup>
                <strong>{berg.berg_id}</strong><br />
                {Math.round(berg.length_m)}m × {Math.round(berg.width_m)}m<br />
                {berg.ensemble?.length ?? 0} ensemble members
              </Popup>
            </CircleMarker>
          );
        })}

        {layers.routes && routePaths.map(({ key, name, path, color }) => (
          <Polyline key={key} positions={path} pathOptions={{ color, weight: 3 }}>
            <Tooltip sticky>{name}</Tooltip>
          </Polyline>
        ))}
      </MapContainer>

      {/* Map Layer Control — glassmorphic overlay */}
      <div className="map-layer-control">
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
      </div>

      {/* Route summary panel, only when a route has been computed */}
      {routePaths.length > 0 && (
        <div className="map-layer-control" style={{ top: 'auto', bottom: 'var(--space-4)', right: 'var(--space-4)', left: 'auto' }}>
          <h3>Routes</h3>
          {routeResult.comparison?.table?.filter((r) => r.success).map((r) => (
            <div key={r.key} style={{ fontSize: 'var(--font-size-xs)', display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', padding: '2px 0' }}>
              <span style={{ color: ROUTE_COLORS[r.key] || '#1668c9' }}>{r.profile}</span>
              <span className="text-mono">{formatDistance(r.distance_nm)} · {formatDuration(r.time_h)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
