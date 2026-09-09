/* BathymetryLayer — real GEBCO / IBCSO v2 soundings from GET /grid.

   Sampled every 8th cell rather than drawn per-cell: the point is to read
   shelf against deep basin at a glance, and 30k circle markers would cost
   far more than that reading is worth. Depth bands follow web/app.js so
   both clients shade the ocean floor the same way. */

import React, { useMemo } from 'react';
import { CircleMarker, Tooltip, LayerGroup } from 'react-leaflet';

const STEP = 8;

function depthColor(depth) {
  if (depth < -4000) return '#0b2545';   // abyssal
  if (depth < -2500) return '#134074';   // deep basin
  return '#1d4e89';                       // shelf / slope
}

export default function BathymetryLayer({ grid }) {
  const soundings = useMemo(() => {
    if (!grid?.bathy || !grid?.lat || !grid?.lon) return [];
    const [rows, cols] = grid.shape;
    const out = [];
    for (let r = 0; r < rows; r += STEP) {
      for (let c = 0; c < cols; c += STEP) {
        const depth = grid.bathy[r]?.[c];
        const lat = grid.lat[r]?.[c];
        const lon = grid.lon[r]?.[c];
        // Ocean only, and only south of 55°S where the domain is meaningful
        if (depth === undefined || depth === null || depth >= 0) continue;
        if (lat === undefined || lat >= -55) continue;
        out.push({ lat, lon, depth, color: depthColor(depth) });
      }
    }
    return out;
  }, [grid]);

  return (
    <LayerGroup>
      {soundings.map((s, i) => (
        <CircleMarker
          key={i}
          center={[s.lat, s.lon]}
          radius={3}
          pathOptions={{ fillColor: s.color, fillOpacity: 0.6, color: 'transparent', weight: 0 }}
        >
          <Tooltip direction="top" className="map-tooltip">
            GEBCO depth {Math.round(s.depth)} m
          </Tooltip>
        </CircleMarker>
      ))}
    </LayerGroup>
  );
}
