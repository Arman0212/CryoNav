/* BathymetryLayer — real GEBCO / IBCSO v2 soundings from GET /grid.

   Drawn straight to a canvas rather than as ~900 CircleMarker components.
   Each marker was an SVG node React had to reconcile and Leaflet had to
   reposition on every pan, which made the map crawl. This paints the same
   soundings in one pass and repaints only when the view comes to rest.

   Depth bands follow web/app.js so both clients shade the sea floor the
   same way. */

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const STEP = 8;

function depthColor(depth) {
  if (depth < -4000) return '#0b2545';   // abyssal plain
  if (depth < -2500) return '#134074';   // deep basin
  return '#1d4e89';                       // shelf / slope
}

export default function BathymetryLayer({ grid }) {
  const map = useMap();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!map || !grid?.bathy) return undefined;

    const canvas = L.DomUtil.create('canvas', 'bathy-canvas-layer');
    canvas.style.position = 'absolute';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '140';          // below the SIC field
    canvasRef.current = canvas;
    map.getPanes().overlayPane.appendChild(canvas);

    let frame = null;

    const draw = () => {
      frame = null;
      const size = map.getSize();
      L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
      canvas.width = size.x;
      canvas.height = size.y;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, size.x, size.y);
      ctx.globalAlpha = 0.6;

      const [rows, cols] = grid.shape;
      const b = map.getBounds();
      const south = b.getSouth() - 1;
      const north = b.getNorth() + 1;
      const west = b.getWest() - 2;
      const east = b.getEast() + 2;

      // Group by depth band so fillStyle changes three times, not 900
      const buckets = new Map();
      for (let r = 0; r < rows; r += STEP) {
        for (let c = 0; c < cols; c += STEP) {
          const depth = grid.bathy[r]?.[c];
          const lat = grid.lat[r]?.[c];
          const lon = grid.lon[r]?.[c];
          if (depth === undefined || depth === null || depth >= 0) continue;
          if (lat === undefined || lat >= -55) continue;
          if (lat < south || lat > north || lon < west || lon > east) continue;

          const color = depthColor(depth);
          const pt = map.latLngToContainerPoint([lat, lon]);
          let list = buckets.get(color);
          if (!list) { list = []; buckets.set(color, list); }
          list.push(pt.x, pt.y);
        }
      }

      buckets.forEach((coords, color) => {
        ctx.fillStyle = color;
        for (let i = 0; i < coords.length; i += 2) {
          ctx.beginPath();
          ctx.arc(coords[i], coords[i + 1], 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
    };

    const schedule = () => { if (frame === null) frame = requestAnimationFrame(draw); };
    const onZoomStart = () => { canvas.style.visibility = 'hidden'; };
    const onZoomEnd = () => { canvas.style.visibility = 'visible'; schedule(); };

    schedule();
    map.on('moveend', schedule);
    map.on('viewreset resize', schedule);
    map.on('zoomstart', onZoomStart);
    map.on('zoomend', onZoomEnd);

    return () => {
      map.off('moveend', schedule);
      map.off('viewreset resize', schedule);
      map.off('zoomstart', onZoomStart);
      map.off('zoomend', onZoomEnd);
      if (frame !== null) cancelAnimationFrame(frame);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, [map, grid]);

  return null;
}
