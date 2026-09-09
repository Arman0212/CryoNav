/* ═══════════════════════════════════════════════════════════════
   PlaceMarkers — research stations and departure ports, with names
   permanently on the map.

   The previous version only showed names on hover, which meant the map
   read as a field of anonymous dots. These are divIcon labels, matching
   the bundled web/ client: flag + name for stations, anchor + name for
   ports, in two colours so the two kinds never get confused.

   Only places the router actually knows can be set as an endpoint — the
   API takes named keys, so the buttons appear only where `routable` says
   the backend will accept them.
   ═══════════════════════════════════════════════════════════════ */

import React, { useMemo } from 'react';
import { Marker, Popup, LayerGroup } from 'react-leaflet';
import L from 'leaflet';

/** Label pill anchored to the left of the point, like main's map. */
function labelIcon(text, kind) {
  return L.divIcon({
    className: `place-marker place-${kind}`,
    html: `<span class="place-label">${text}</span>`,
    iconSize: null,
    iconAnchor: [46, 12],
  });
}

function PlacePopup({ place, kind, routable, onOrigin, onDestination }) {
  return (
    <Popup>
      <div className="map-popup">
        <strong className={`mp-title ${kind === 'port' ? 'is-port' : ''}`}>
          {kind === 'port' ? place.icon : place.flag} {place.name}
        </strong>
        <div className="mp-source">
          {kind === 'port' ? `Port · ${place.country}` : place.operator}
        </div>
        <div className="mp-rows">
          {Math.abs(place.lat).toFixed(2)}°S, {Math.abs(place.lon).toFixed(2)}°
          {place.lon < 0 ? 'W' : 'E'}
        </div>
        {routable ? (
          <div className="mp-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onOrigin(place)}>
              Depart from here
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onDestination(place)}>
              Set destination
            </button>
          </div>
        ) : (
          <div className="mp-source" style={{ marginTop: 6 }}>
            Not a routable endpoint in this build
          </div>
        )}
      </div>
    </Popup>
  );
}

export default function PlaceMarkers({ stations, ports, config, onOrigin, onDestination }) {
  /* The backend only routes between the origins/stations it declares in
     config, so check each place against the live config rather than
     assuming every pin on the map is selectable. */
  const routableIds = useMemo(() => {
    const ids = new Set();
    Object.keys(config?.stations || {}).forEach((k) => ids.add(k));
    Object.keys(config?.origins || {}).forEach((k) => ids.add(k));
    return ids;
  }, [config]);

  return (
    <LayerGroup>
      {(stations || []).map((s) => (
        <Marker
          key={`st-${s.id}`}
          position={[s.lat, s.lon]}
          icon={labelIcon(`${s.flag} ${s.name}`, 'station')}
        >
          <PlacePopup
            place={s} kind="station" routable={routableIds.has(s.id)}
            onOrigin={onOrigin} onDestination={onDestination}
          />
        </Marker>
      ))}

      {(ports || []).map((p) => (
        <Marker
          key={`pt-${p.id}`}
          position={[p.lat, p.lon]}
          icon={labelIcon(`${p.icon} ${p.name}`, 'port')}
        >
          <PlacePopup
            place={p} kind="port" routable={routableIds.has(p.id)}
            onOrigin={onOrigin} onDestination={onDestination}
          />
        </Marker>
      ))}
    </LayerGroup>
  );
}
