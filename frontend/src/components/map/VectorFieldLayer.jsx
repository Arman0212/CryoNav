/* ═══════════════════════════════════════════════════════════════
   VectorFieldLayer — ocean current / wind arrows on the map.

   Canvas rather than SVG markers: a thousand arrows as DOM nodes would
   stall panning the same way the bathymetry markers did. Repaints only
   when the map comes to rest.

   Arrow length scales with speed relative to the field's own maximum, so
   the same component reads sensibly for 0.1 m/s currents and 18 m/s winds
   without per-field tuning.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export default function VectorFieldLayer({ vectors, color = '#6d28d9', maxSpeed, scale = 22 }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !vectors?.length) return undefined;

    const canvas = L.DomUtil.create('canvas', 'vector-canvas-layer');
    canvas.style.position = 'absolute';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '160';
    map.getPanes().overlayPane.appendChild(canvas);

    // Normalise against the field's own maximum so arrows stay readable
    const vMax = maxSpeed || vectors.reduce((m, v) => Math.max(m, v.speed), 0) || 1;

    let frame = null;

    const draw = () => {
      frame = null;
      const size = map.getSize();
      L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
      canvas.width = size.x;
      canvas.height = size.y;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, size.x, size.y);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = 0.85;

      const b = map.getBounds();
      const pad = 2;
      ctx.beginPath();

      for (const v of vectors) {
        if (v.lat < b.getSouth() - pad || v.lat > b.getNorth() + pad) continue;
        if (v.lon < b.getWest() - pad || v.lon > b.getEast() + pad) continue;

        const p = map.latLngToContainerPoint([v.lat, v.lon]);
        const mag = (v.speed / vMax) * scale;
        if (mag < 1) continue;

        // Screen y grows downward, so northward flow (+v) points up
        const ang = Math.atan2(-v.v, v.u);
        const ex = p.x + Math.cos(ang) * mag;
        const ey = p.y + Math.sin(ang) * mag;

        ctx.moveTo(p.x, p.y);
        ctx.lineTo(ex, ey);

        // Arrowhead
        const head = Math.min(4.5, mag * 0.45);
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - Math.cos(ang - 0.4) * head, ey - Math.sin(ang - 0.4) * head);
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - Math.cos(ang + 0.4) * head, ey - Math.sin(ang + 0.4) * head);
      }
      ctx.stroke();
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
  }, [map, vectors, color, maxSpeed, scale]);

  return null;
}
