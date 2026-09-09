/* ═══════════════════════════════════════════════════════════════
   SicCanvasLayer — sea-ice concentration raster on the Leaflet map.

   Ported from the canvas layer in the repo's `web/app.js`, which is the
   better map implementation on main. Rather than porting the imperative
   L.Layer.extend() class wholesale, this hooks the same rendering into
   react-leaflet's lifecycle: one canvas in the overlay pane, redrawn on
   move/zoom/resize and whenever the field changes.

   Why splats rather than one rect per cell: the grid is curvilinear in
   lat/lon, so axis-aligned rectangles leave seams and moiré at low zoom.
   Overlapping circles blend into a continuous pack-ice texture — the same
   trick and the same colour ramp as the original, kept so both frontends
   render identical ice.

   Performance: draws only cells inside the current viewport, strides the
   grid at low zoom, and skips land via the mask from GET /grid.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * Sea-ice colour ramp — matches web/app.js exactly so the React map and the
 * bundled map agree on what a given concentration looks like.
 * Returns null below 5% so open ocean stays transparent.
 */
export function sicColor(value) {
  if (value <= 0.05) return null;
  if (value < 0.3) {
    const t = (value - 0.05) / 0.25;
    return `rgba(${Math.round(90 + t * 80)}, ${Math.round(195 + t * 40)}, ${Math.round(235 + t * 20)}, ${0.40 + t * 0.25})`;
  }
  if (value < 0.7) {
    const t = (value - 0.3) / 0.4;
    return `rgba(${Math.round(170 + t * 65)}, ${Math.round(235 + t * 15)}, 255, ${0.65 + t * 0.20})`;
  }
  const t = (value - 0.7) / 0.3;
  return `rgba(${Math.round(235 + t * 20)}, ${Math.round(250 + t * 5)}, 255, ${0.85 + t * 0.12})`;
}

/** Forecast-minus-observed difference ramp: red under-predicts, blue over. */
export function diffColor(value) {
  if (Math.abs(value) < 0.05) return null;
  const intensity = Math.min(Math.abs(value) * 2.5, 1) * 0.7;
  return value > 0 ? `rgba(0, 168, 255, ${intensity})` : `rgba(255, 68, 85, ${intensity})`;
}

/**
 * @param {Object} props
 * @param {number[][]} props.sic - 2D concentration field (0..1)
 * @param {Object} props.grid - GET /grid payload: { lat, lon, land_mask, shape }
 * @param {Function} [props.colorFn=sicColor] - value -> css colour or null
 * @param {number} [props.opacity=1]
 */
export default function SicCanvasLayer({ sic, grid, colorFn = sicColor, opacity = 1 }) {
  const map = useMap();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!map) return undefined;

    const canvas = L.DomUtil.create('canvas', 'sic-canvas-layer');
    canvas.style.position = 'absolute';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '150';
    canvasRef.current = canvas;
    map.getPanes().overlayPane.appendChild(canvas);

    let frame = null;

    const draw = () => {
      frame = null;
      if (!sic || !grid?.lat || !grid?.lon) return;

      const size = map.getSize();
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, topLeft);
      canvas.width = size.x;
      canvas.height = size.y;
      canvas.style.opacity = String(opacity);

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, size.x, size.y);

      const shape = grid.shape || [sic.length, sic[0]?.length ?? 0];
      const bounds = map.getBounds();
      const zoom = map.getZoom();

      /* Stride the grid when zoomed out. At z<=2 the whole 264x220 field is
         only a few hundred pixels wide, so drawing every cell burns time on
         sub-pixel work nobody can see. */
      const step = zoom >= 6 ? 1 : zoom >= 4 ? 2 : 3;
      const size0 = Math.max(2, Math.round(Math.pow(1.7, zoom - 1)) * 2.4);

      const south = bounds.getSouth() - 1;
      const north = bounds.getNorth() + 1;
      const west = bounds.getWest() - 2;
      const east = bounds.getEast() + 2;

      /* Batch by colour: switching fillStyle is the expensive part, so
         quantise to 24 buckets and fill each bucket's cells in one pass.
         Squares rather than arcs — fillRect is markedly cheaper than
         beginPath/arc/fill per cell, and at these sizes they still tile
         into a continuous field. */
      const buckets = new Map();
      for (let y = 0; y < shape[0]; y += step) {
        const latRow = grid.lat[y];
        const lonRow = grid.lon[y];
        const sicRow = sic[y];
        const maskRow = grid.land_mask?.[y];
        if (!latRow || !lonRow || !sicRow) continue;

        for (let x = 0; x < shape[1]; x += step) {
          if (maskRow && maskRow[x] > 0.5) continue;      // land / ice shelf
          const val = sicRow[x];
          if (val === undefined || val === null) continue;

          const cellLat = latRow[x];
          const cellLon = lonRow[x];
          if (cellLat < south || cellLat > north || cellLon < west || cellLon > east) continue;

          const q = Math.round(val * 24) / 24;
          const color = colorFn(q);
          if (!color) continue;

          const pt = map.latLngToContainerPoint([cellLat, cellLon]);
          let list = buckets.get(color);
          if (!list) { list = []; buckets.set(color, list); }
          list.push(pt.x, pt.y);
        }
      }

      const half = size0 / 2;
      buckets.forEach((coords, color) => {
        ctx.fillStyle = color;
        for (let i = 0; i < coords.length; i += 2) {
          ctx.fillRect(coords[i] - half, coords[i + 1] - half, size0, size0);
        }
      });
    };

    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(draw);
    };

    /* Redraw only once the map comes to rest.

       Listening to 'move'/'zoom' meant a full field redraw on every frame
       of a pan — tens of thousands of fills per frame, which is what made
       the map feel stuck. Leaflet already translates the overlay pane
       during a drag, so the canvas travels with the map for free and only
       needs repainting when the view settles. */
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
      canvasRef.current = null;
    };
  }, [map, sic, grid, colorFn, opacity]);

  return null;
}
