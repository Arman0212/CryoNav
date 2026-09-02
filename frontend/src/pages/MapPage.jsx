/* ═══════════════════════════════════════════════════════════════
   Map Page — Real Leaflet map wired to live backend data.

   Wired layers: Stations (static, from constants), Icebergs (GET
   /bergs), Routes (last POST /route result from useRouteStore).
   NOT wired (no backing data yet): Sea Ice raster (would need a
   canvas overlay reprojecting the curvilinear SIC grid — nontrivial,
   left for future work), Weather, Ocean Currents, Risk Zones,
   Vessels, Bathymetry — none of these have a backend route. Those
   checkboxes are shown disabled rather than silently doing nothing.
   ═══════════════════════════════════════════════════════════════ */

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Tooltip } from 'react-leaflet';
import { Layers } from 'lucide-react';
import useAppStore from '@stores/useAppStore';
import useMapStore from '@stores/useMapStore';
import useRouteStore from '@stores/useRouteStore';
import { useIcebergs } from '@hooks/useIcebergs';
import { MAP_DEFAULTS, RESEARCH_STATIONS, MAP_LAYERS } from '@utils/constants';
import { formatDistance, formatDuration } from '@utils/formatters';

const LIVE_LAYER_IDS = new Set(['icebergs', 'routes', 'stations']);

const ROUTE_COLORS = {
  great_circle: '#8b5cf6',
  min_ice: '#10b981',
  min_time: '#f97316',
  balanced: '#4a9eff',
  persistence_route: '#ef4444',
};

export default function MapPage() {
  const selectedDate = useAppStore((s) => s.selectedDate);
  const { layers, toggleLayer } = useMapStore();
  const routeResult = useRouteStore((s) => s.routes);

  const { data: bergs } = useIcebergs(selectedDate, 7);

  const routePaths = useMemo(() => {
    if (!routeResult?.routes) return [];
    return Object.entries(routeResult.routes)
      .filter(([, r]) => r.success && r.path_latlon?.length)
      .map(([key, r]) => ({ key, name: r.profile_name, path: r.path_latlon, color: ROUTE_COLORS[key] || '#4a9eff' }));
  }, [routeResult]);

  return (
    <div className="map-page" style={{ height: 'calc(100vh - var(--topbar-height) - var(--statusbar-height))', position: 'relative' }}>
      <MapContainer
        center={MAP_DEFAULTS.center}
        zoom={MAP_DEFAULTS.zoom}
        minZoom={MAP_DEFAULTS.minZoom}
        maxZoom={MAP_DEFAULTS.maxZoom}
        style={{ width: '100%', height: '100%', background: 'var(--color-bg-primary)' }}
      >
        <TileLayer url={MAP_DEFAULTS.tileUrl} attribution={MAP_DEFAULTS.tileAttribution} />

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
        <h3><Layers size={12} /> Layers</h3>
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
              <span style={{ color: ROUTE_COLORS[r.key] || '#4a9eff' }}>{r.profile}</span>
              <span className="text-mono">{formatDistance(r.distance_nm)} · {formatDuration(r.time_h)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
