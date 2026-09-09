/* LiveIcebergLayer — the US National Ice Center weekly feed (GET /bergs/live).

   Distinct from the drift layer: these are *observed* berg positions from
   the NIC bulletin, not model propagation. Drawn in a different colour and
   shape for exactly that reason — the map should never blur the line
   between what was measured and what was predicted. */

import React from 'react';
import { Marker, Popup, LayerGroup } from 'react-leaflet';
import L from 'leaflet';

const liveIcon = L.divIcon({
  className: 'live-berg-marker',
  html: '<span class="live-berg-glyph"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

/** The NIC feed uses human-readable column names, so read defensively. */
function field(berg, ...names) {
  for (const n of names) {
    if (berg[n] !== undefined && berg[n] !== null && berg[n] !== '') return berg[n];
  }
  return null;
}

export default function LiveIcebergLayer({ data }) {
  const bergs = data?.icebergs || [];

  return (
    <LayerGroup>
      {bergs.map((b, i) => {
        const lat = parseFloat(field(b, 'Latitude', 'lat'));
        const lon = parseFloat(field(b, 'Longitude', 'lon'));
        if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

        const name = field(b, 'Iceberg', 'berg_id') ?? `#${i}`;
        const len = field(b, 'Length (NM)', 'length_nm');
        const wid = field(b, 'Width (NM)', 'width_nm');
        const area = field(b, 'Area (sqKM)', 'area_km2');
        const updated = field(b, 'Last Update', 'observed_on');

        return (
          <Marker key={`${name}-${i}`} position={[lat, lon]} icon={liveIcon}>
            <Popup>
              <div className="map-popup">
                <strong className="mp-title">Iceberg {name}</strong>
                <div className="mp-source">US National Ice Center · observed</div>
                <div className="mp-rows">
                  {len && wid && <div>{len} × {wid} NM</div>}
                  {area && <div>Area {area} km²</div>}
                  <div>
                    {Math.abs(lat).toFixed(2)}°S, {Math.abs(lon).toFixed(2)}°{lon < 0 ? 'W' : 'E'}
                  </div>
                  {updated && <div>Updated {updated}</div>}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </LayerGroup>
  );
}
